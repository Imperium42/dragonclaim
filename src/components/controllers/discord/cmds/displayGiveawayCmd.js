// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// displayGiveawayCmd.js
//
// Have BOT show the giveaway, with a click2enter emoji.
// https://stackoverflow.com/questions/49842712/discord-js-message-after-receiving-emoji-reaction
// #############################################################################################################

import { EmbedBuilder } from "discord.js";
import { getCachedConfigJson, generateUuid, JsonStringify } from "../../i42Common.js";
import { giveawayOAuthStateKey } from "../../../services/redisKeys.js";
import {
	// delRedisObj,
	getRedisObj,
	setRedisObj,
} from "../../../services/redis.js";
import {
	checkMomentIsInFuture,
	getFriendlyMomentFormatTaiwanStr,
	getFriendlyMomentFormatUTCStr,
	waitMins,
	waitSecs,
} from "../../chronos.js";
import { getGuildMemberFromReaction, validateExists } from "../discordUtils.js";
import { checkHasModRoleFromMember, checkHasModRoleFromMsg, getChannelById } from "../guildInfo.js";
import moment from "moment";
import {
	checkIsUserDiscordBlacklisted,
	checkUserAlreadyClaimedKey,
	getEventId,
	getGiveawaysCol,
} from "../../../services/dbAtlas.js";
import { genGiveawayOAuth2Url } from "../../../services/discordOAuth2.js";
import { endGiveawayAsync } from "./endGiveawayCmd.js";

const { prefs, platforms, hexColors, selfHosted, locale } = getCachedConfigJson();

const { logReactions } = selfHosted;

const { blueHexStr } = hexColors;

const { skipBlacklistIfMod, displayGiveaway: displayGiveawayPrefs, verification } = prefs;

const { allowDupeEmbeds, allowInitGiveawayToShowEvenNoKeys } = displayGiveawayPrefs;

const { allowMultiKeyClaimsAsWhitelistedMod } = verification;

const discordSettings = platforms.discord;
const { emotes } = discordSettings;
const {
	accessDeniedEmote,
	kbEmote,
	aliasEmote,
	outgoingDataEmote,
	keyEmote,
	failEmote,
	successEmote, // numberEmoteArr,
} = emotes;

const {
	displayGiveawayEmbed: displayGiveawayEmbedLocale,
	giveawayGeneralErrDMStr,
	giveawayConcluded,
	displayGiveawayDM,
} = locale;

const { dmAuthFooterStr, dmAuthFooterImgUrl } = displayGiveawayDM;

const {
	displayGiveawayEmbedRulesArr,
	displayGiveawayEmbedFooter,
	// displayGiveawayEmbedAuthor,
	// displayGiveawayEmbedInstructionsArr,
} = displayGiveawayEmbedLocale;

// ###########################################################################

let nowMoment = new moment.utc();
let endMoment = new moment.utc();

// ...........................................................................................
// Handles the command async
// -> returns undefined
const cmdAction = async (_botCmd) => {
	if (!_botCmd.msg) throw new Error("[displayGiveawayCmd]**ERR @ cmdAction: !_msg");

	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) return; // Fail msg within

	await prepDisplayGiveaway(_botCmd);
};

// ...........................................................................................
// => returns undefined
const prepDisplayGiveaway = async (_botCmd) => {
	const isAuthed = checkHasModRoleFromMsg(_botCmd.msg);
	if (!isAuthed) {
		_botCmd.msg.reply(` ${accessDeniedEmote} Unauthorized attempt logged.`);
		return; // msg reply handled within
	}

	// ----------------
	// Get args
	const arg1EventName = _botCmd.contentArr.shift();
	const arg2ChannelOrId = _botCmd.contentArr.shift(); // "<#channelid>" || "id"
	// const theRest = contentArr.join(' '); // TODO?

	// -----------------------
	// Get channelId info
	let channelId;
	const isArg2Str = arg2ChannelOrId && typeof arg2ChannelOrId === "string";
	if (isArg2Str) {
		channelId = arg2ChannelOrId.replace("<#", "").replace(">", "");

		if (arg2ChannelOrId.toLowerCase() === "here") {
			channelId = _botCmd.msg.channel.id;
		}
	}

	const channelParsed = `<#${channelId}>`;

	// -----------------------
	// Validate
	const isValid = validateExists(2, arg1EventName, arg2ChannelOrId) && channelId;

	// >> Initial validation >>
	if (!isValid) {
		// Command building : 3
		const missingArgs = "`.displayGiveaway` `<uniqueEventName>` `<#channel|id|here>`";
		const descrStr = `${kbEmote} Authorized mods may display a 'react-to-enter' giveaway already setup by \`.setupGiveaway\``;
		const aliasesSuffixStr = `${aliasEmote} Aliases: \`.dg\` / \`.dGiveaway\``;

		return _botCmd.msg.reply(
			` ${accessDeniedEmote} Missing args:\n\n${missingArgs}\n\n${descrStr}\n${aliasesSuffixStr}`,
		);
	}

	const prepGiveawayMsg =
		` [%NUM_KEYS_REMAIN%] Preparing giveaway \`${arg1EventName}\` ` +
		`in ${channelParsed} ${outgoingDataEmote}`;

	// ----------------
	await displayGiveawayAsync(arg1EventName, channelId, prepGiveawayMsg, _botCmd);
};

// ...........................................................................................
// After this func, we perpetually listen for reactions until contest ends
// * prepGiveawayMsg has pending %NUM_KEYS_REMAIN% to replace.
//
// => returns undefined
const displayGiveawayAsync = async (_eventName, _channelId, _prepGiveawayStr, _botCmd) => {
	// Find DB entry and setup data
	const dbCol = await getGiveawaysCol();
	const setupObj = await getGiveawaySetupObj(dbCol, _eventName, _botCmd.guildId);

	// ##########################################################################################
	// {
	// 	"_id": "faff",
	// 	"isLive": false,
	// 	"dates": {
	// 	"eventDurationInt": 4,
	// 		"eventDurationTypeChar": "d",
	// 		"startDateFriendly": null,
	// 		"endDateFriendly": null,
	// 		"startDateObj": null,
	// 		"endDateObj": null
	// },
	// 	"liveInChannelId": null,
	// 	"embedMsgId": null,
	// 	"reqsObj": {
	// 	"discord": true,
	// 		"steam": true,
	// 		"email": false
	// },
	// 	"initKeyCount": 3,
	// 	"keysArr": ["AAA-BBB-CCC", "CCC-DDD-EEE", "FFF-GGG-HHH"],
	// 	"endReason": null,
	// 	"claimersArr": []
	// }
	// ##########################################################################################

	// Validate
	if (!setupObj) {
		return _botCmd.msg.reply(` ${failEmote} Giveaway \`${_eventName}\` not found/expired.`);
	}

	const { dates } = setupObj;
	if (!dates) {
		return _botCmd.msg.reply(
			` ${failEmote} !setupObj.dates // setupObj==${JsonStringify(setupObj)}`,
		);
	}

	// NOTABLE:
	// ###################################
	// numToGiveaway
	// initKeyCount
	// isLive
	// reqsObj
	// keysArr
	// liveInChannelId
	// dates.eventDurationInt
	// dates.eventDurationTypeChar
	// ###################################

	// Get # of keys and reply with setup msg
	const numKeysStart = setupObj.initKeyCount || 0;
	const numClaimers = (setupObj.claimersArr && setupObj.claimersArr.length) || 0;
	const numKeysRemain = numKeysStart - numClaimers;

	// (!) There are enough keys, right?
	if (numKeysRemain === 0 && !allowInitGiveawayToShowEvenNoKeys) {
		return _botCmd.msg.reply(
			` ${failEmote} ${_botCmd.envPrefix} No keys remain for event \`${_eventName}\`.`,
		);
	}

	// We have at least 1 key
	const numKeysRemainStr = `Starting with ${numKeysRemain}/${numKeysStart} keys remaining`;

	_prepGiveawayStr = _prepGiveawayStr.replace("%NUM_KEYS_REMAIN%", numKeysRemainStr);
	_botCmd.msg.reply(_prepGiveawayStr);

	// --------------------
	// Moment : Now
	nowMoment = new moment.utc();

	// Moment : End
	endMoment = new moment.utc();
	const formatChar = dates.eventDurationTypeChar;

	endMoment.add(dates.eventDurationInt, formatChar);
	// const timeLeftDur = new moment.duration(dates.eventDurationInt, formatChar); // eg, (15, 'm') for 15 days

	// ---------------
	// Validate
	if (!setupObj) {
		return _botCmd.msg.reply(` ${failEmote} ${_eventName} giveaway not found`);
	}
	if (setupObj.isLive && !allowDupeEmbeds) {
		return _botCmd.msg.reply(
			` ${failEmote} \`${_eventName}\` giveaway already live in <#${setupObj.liveInChannelId}>\n` +
				`(Try \`.endgiveaway ${_eventName} <reason>\`)`,
		);
	}

	// ---------------
	// Show DM embed
	const embed = await genGiveawayEmbed();
	const channel = getChannelById(_channelId);

	// Valid channel?
	if (!channel) {
		return _botCmd.msg.reply(` ${failEmote} Invalid channel (${_channelId})`);
	}

	let embedMsgMgr;

	try {
		const contentWrapper = { content: "", embeds: [embed] };
		embedMsgMgr = await channel.send(contentWrapper);
		await embedMsgMgr.react(keyEmote); // KEY_EMOJI_ID // https://discord.js.org/#/docs/main/stable/class/MessageReaction
	} catch (e) {
		console.log(`[displayGiveawayCmd] @ displayGiveawayAsync (reaction): e==${e}`);
		return;
	}

	// ---------------
	// Update db async, listen for reactions
	if (logReactions) {
		console.log(
			"[displayGiveawayCmd] @ displayGiveawayAsync (DEBUG_LOG_REACTIONS): " +
				`msgMgr.id==${_botCmd.msg.id}`,
		);
	}

	await Promise.all([
		updateContestDbAsync(
			dbCol,
			_eventName,
			nowMoment,
			endMoment,
			_channelId,
			embedMsgMgr.id,
			_botCmd.guildId,
		),

		awaitReactionsAsync(embedMsgMgr, _eventName, endMoment),
	]);

	// dddd, MMMM Do YYYY, h:mm:ss a
	const endDateFriendlyUTC = getFriendlyMomentFormatUTCStr(endMoment);
	const endDateFriendlyTaiwan = getFriendlyMomentFormatTaiwanStr(endMoment);
	const momentSm = `${setupObj.dates.eventDurationInt}${dates.eventDurationTypeChar}`;

	const numKeysClaimed = setupObj.claimersArr && setupObj.claimersArr.length;
	const keysAvail = `${keyEmote} ${numKeysClaimed}/${setupObj.initKeyCount}`;

	_botCmd.msg.reply(
		` ${successEmote} Displaying live now for \`${momentSm}\`:` +
			`${keysAvail}\n` +
			`\n* Ending ${endDateFriendlyUTC}\n* Ending ${endDateFriendlyTaiwan}\n* ` +
			`Ending __${endMoment.fromNow()}__ from now`,
	);
};

// ...........................................................................................
const updateContestDbAsync = async (
	_dbCol,
	_eventName,
	_nowMoment,
	_endMoment,
	_liveInChannelId,
	_embedMsgId,
	_guildId,
) => {
	const eventId = getEventId(_guildId, _eventName); // "{discordId}-{eventName}"
	const query = { _id: eventId };
	const updateObj = {
		isLive: true,
		"dates.startDateFriendly": getFriendlyMomentFormatUTCStr(_nowMoment),
		"dates.endDateFriendly": getFriendlyMomentFormatUTCStr(_endMoment),
		"dates.startDateObj": _nowMoment.toDate(),
		"dates.endDateObj": _endMoment.toDate(),
		liveInChannelId: _liveInChannelId,
		embedMsgId: _embedMsgId,
	};

	return await _dbCol.updateOne(query, { $set: updateObj });
};

// ...........................................................................................
const getGiveawaySetupObj = async (_dbCol, _eventName, _guildId) => {
	const eventId = getEventId(_guildId, _eventName); // "{discordId}-{eventName}"
	const query = { _id: eventId };
	const opts = {
		projection: {
			eventName: 1,
			guildId: 1,
			numToGiveaway: 1,
			isLive: 1,
			initKeyCount: 1,
			reqsObj: 1,
			keysArr: 1,
			liveInChannelId: 1,
			"dates.eventDurationInt": 1,
			"dates.eventDurationTypeChar": 1,
		},
	};

	return await _dbCol.findOne(query, opts);

	// #############################################################################
	// const dataObj =
	// {
	//     '_id' : eventId, // "{discordId}-{eventName}"
	//     'isLive': true,
	//     'numToGiveaway': arg2NumToGiveawayInt,
	//     'dates':
	//     {
	//         'eventDurationInt': eventDurationInt, // eg, moment's 15
	//         'eventDurationTypeChar': eventDurationTypeChar, // eg, moment's 'd' for day
	//         'startDateFriendly': nowMoment.format("dddd, MMMM Do YYYY, h:mm:ss a"),
	//         'endDateFriendly': endMoment.format("dddd, MMMM Do YYYY, h:mm:ss a"),
	//         'startDateObj': nowMoment.toDate(),
	//         'endDateObj': endMoment.toDate(),
	//     },
	//     'liveInChannelId : channelId,
	//     'embedMsgId': embedMsgId,
	//     'reqsObj':
	//     {
	//         'discord': true,
	//         'steam': true,
	//         'email': false
	//     },
	//     'initKeyCount': keysArr.length,
	//     'keysArr': keysArr,
	//     'claimersArr':
	//     [
	//         // {
	//         //     'discordId': msg.author.id,
	//         //     'steamId': arg1,
	//         //     'claimedDateObj': new Date(),
	//         //     'claimedKey': claimedKey,
	//         //     'email': arg2, // Optional
	//         // }
	//     ]
	// };
	// #############################################################################
};

// ...........................................................................................
// _embedMsgMgr, eventName, endMoment
const onReaction = async (_messageReaction, _user, _embedMsgMgr, _eventName) => {
	if (logReactions) {
		console.log("[displayGiveawayCmd] @ awaitReactionsAsync.onReaction (DEBUG_LOG_REACTIONS)");
	}
	const botEmbedMsg = _messageReaction.message;

	const reactorDiscordId = _user.id;
	const reactorMember = await getGuildMemberFromReaction(_messageReaction, reactorDiscordId);
	const reactorMemberGuildId = reactorMember.guild.id;

	const isGiveawayEmbed = botEmbedMsg.id === _embedMsgMgr.id;
	const isKeyEmoji = _messageReaction.emoji.name === keyEmote;
	const isReactorSelfBot = reactorDiscordId === botEmbedMsg.author.id;

	// ---------------
	// Is the user in the right place?
	if (!isGiveawayEmbed) {
		if (logReactions) {
			console.log(`[displayGiveawayCmd] @ awaitReactionsAsync.onReaction (DEBUG_LOG_REACTIONS): 
				isGiveawayEmbed==${isGiveawayEmbed}`);
		}
		return;
	}

	if (!isKeyEmoji) {
		if (logReactions) {
			console.log(
				"[displayGiveawayCmd] @ awaitReactionsAsync.onReaction (DEBUG_LOG_REACTIONS): " +
					`isKeyEmoji==${isKeyEmoji} // keyEmote==${keyEmote} // ` +
					`emoji.name==${_messageReaction.emoji.name}`,
			);
		}
		return;
	}

	if (isReactorSelfBot) {
		if (logReactions) {
			console.log(
				"[displayGiveawayCmd] @ awaitReactionsAsync.onReaction (DEBUG_LOG_REACTIONS): " +
					`isClientBot(ignore)==${isReactorSelfBot}`,
			);
		}
		return;
	}

	// ---------------
	// Allow only 1 chance // key=="{discordId}-react-{msgId}"
	const reactRedisKey = `${reactorDiscordId}-react-${_messageReaction.message.id}`;
	const hasPrevReacted = await getRedisObj(reactRedisKey); // { :bool }
	if (hasPrevReacted) {
		if (logReactions) {
			console.log(
				"[displayGiveawayCmd] @ awaitReactionsAsync.onReaction (DEBUG_LOG_REACTIONS): " +
					"CANCEL==hasPrevReacted",
			);
		}
		return;
	}

	// ---------------
	// Is this giveaway still live?
	// console.log(`[displayGiveawayCmd] @ awaitReactionsAsync.onReaction (DEBUG_LOG_REACTIONS): _embedMsgMgr.content==${_embedMsgMgr.embeds[0].title}`);
	const embedTitle = _embedMsgMgr.embeds[0].title;
	const giveawayConcludedTitleStrLower =
		giveawayConcluded.giveawayConcludedTitleStr.toLowerCase();

	const isGiveawayOver = embedTitle.toLowerCase().includes(giveawayConcludedTitleStrLower); // eg: "giveaway concluded"

	if (isGiveawayOver) {
		// Remove this listener
		console.log(
			"[displayGiveawayCmd]*WARN @ awaitReactionsAsync.onReaction: isGiveawayOver // Removing reaction listener.",
		);
		await heartbeatCheckEndGiveaway(_eventName, _embedMsgMgr, endMoment, reactionListener);
		// return _embedMsgMgr.client.removeListener('messageReactionAdd', onReactionListener);
		return;
	}

	// ---------------
	// Is this user blacklisted?
	const isUserBlacklisted = await checkIsUserDiscordBlacklisted(reactorDiscordId);
	const isModSkipBlacklist =
		isUserBlacklisted && skipBlacklistIfMod && (await checkHasModRoleFromMember(reactorMember));

	if (isModSkipBlacklist) {
		console.log(
			"[displayGiveawayCmd]*WARN @ awaitReactionsAsync.onReaction isModSkipBlacklist",
		);
	} else if (isUserBlacklisted) {
		console.log(
			"[displayGiveawayCmd]*WARN @ awaitReactionsAsync.onReaction: " +
				`Found blacklisted user, d==${reactorDiscordId}`,
		);
		const contentWrapper = {
			content: giveawayGeneralErrDMStr,
			embeds: [],
		};
		_user.send(contentWrapper);
		return;
	}

	// ---------------
	// Did this user already claim a key? Ignore them.
	const eventId = getEventId(reactorMemberGuildId, _eventName); // "{discordId}-{eventName}"
	const alreadyClaimedKey = await checkUserAlreadyClaimedKey(
		eventId, // "{discordId}-{eventName}"
		reactorDiscordId,
	);

	console.log(
		`[displayGiveawayCmd] @ awaitReactionsAsync.onReaction: alreadyClaimedKey==${alreadyClaimedKey}`,
	);
	if (alreadyClaimedKey) {
		if (!allowMultiKeyClaimsAsWhitelistedMod) {
			return;
		}

		// Whitelisted mod >>
		const reactorIsAuthedMod = checkHasModRoleFromMember(reactorMember);
		if (!reactorIsAuthedMod) {
			return;
		}

		if (reactorIsAuthedMod) {
			console.warn(
				"[displayGiveawayCmd] @ awaitReactionsAsync.onReaction: " +
					`${reactorDiscordId} has already claimed a key, but is a mod && `,
			);
		}
	}

	// ---------------
	// Prevent 5m spam lockout by remembering reaction click
	console.log(
		"[displayGiveawayCmd] @ awaitReactionsAsync.onReaction: Setting anti-spam redis obj...",
	);
	const stringifiedVal = true.toString();
	const lockoutExpiryInSecs = 60 * 60; // 1hr
	await setRedisObj(reactRedisKey, stringifiedVal, lockoutExpiryInSecs); // { :bool }

	// console.log('[displayGiveawayCmd] @ awaitReactionsAsync.onReaction: Wait allow react again...');
	// waitAllowReactAgain(reactRedisKey).then();

	// ---------------
	// DM oAuth2 link
	console.log("[displayGiveawayCmd] @ awaitReactionsAsync.onReaction: Setting state...");
	const state = generateUuid(); // Security to verify @ callback. Could optionally CSV +arbitrary data.
	const uri = genGiveawayOAuth2Url(state);

	// console.log('[displayGiveawayCmd] @ awaitReactionsAsync.onReaction: About to DM user...');
	const dmEmbed = await genAuthLinkEmbed(uri);
	let dmMsg;

	try {
		const contentWrapper = { content: "", embeds: [dmEmbed] };
		dmMsg = await _user.send(contentWrapper);
	} catch (e) {
		console.log("[displayGiveawayCmd]**ERR @ onReaction: " + e);
		return;
	}

	// ---------------
	// Update redis
	const flatRedisObj = JSON.stringify({
		discordId: reactorDiscordId,
		eventId: eventId, // "{guildId}-{eventName}"
		embedMsgId: _embedMsgMgr.id,
		channelId: _embedMsgMgr.channel.id,
		dmMsgId: dmMsg.id,
		dmChannelId: dmMsg.channel.id,
	});

	const authExpiryInSecs = 60 * 5; // 5mins
	await setRedisObj(giveawayOAuthStateKey(state), flatRedisObj, authExpiryInSecs); // <state, {discordId, eventId}:str>
};

let ActiveEmbedMsgMgr, ActiveEventName; // Assign these before the listener

// ...........................................................................................
// https://discord.js.org/#/docs/discord.js/main/class/Client?scrollTo=e-messageReactionAdd
const reactionListener = async (_messageReaction, _user) => {
	await onReaction(_messageReaction, _user, ActiveEmbedMsgMgr, ActiveEventName);
};

// ...........................................................................................
// https://discordjs.guide/popular-topics/collectors.html#message-collectors
// https://discordjs.guide/additional-info/collections.html#extra-utilities
// https://discord.js.org/#/docs/discord.js/main/class/MessageManager
const awaitReactionsAsync = async (_embedMsgMgr, _eventName, _endMoment) => {
	console.log(`[displayGiveawayCmd] @ awaitReactionsAsync // msgId==${_embedMsgMgr.id}`);

	// Setup Reaction Listener async callback =>
	ActiveEmbedMsgMgr = _embedMsgMgr;
	ActiveEventName = _eventName;
	_embedMsgMgr.client.on("messageReactionAdd", reactionListener);

	// Listen for heartbeats ~once/min
	console.log("[displayGiveawayCmd] @ awaitReactionsAsync: Listening for reactions!");
	await heartbeatCheckEndGiveaway(_eventName, _embedMsgMgr, _endMoment); // async =>
};

// .............................................................................
const heartbeatCheckEndGiveaway = async (_eventId, _embedMsgMgr, _endMoment) => {
	console.log(`[displayGiveawayCmd] @ heartbeatCheckEndGiveaway: _endMoment==${_endMoment}`);

	const isStringifiedVal = false;
	await setRedisObj("endGiveaway", isStringifiedVal); // async =>

	// Delay heartbeat by 2 seconds so equal checks don't get misinterpreted
	await waitSecs(2);

	// If the end moment comes BEFORE now, we end the event.
	while (checkMomentIsInFuture(_endMoment)) {
		// Another loop // TODO: Edit embed for countdown =>
		// console.log('[displayGiveawayCmd] @ heartbeatCheckEndGiveaway.checkMomentIsAfterNow // Waiting 1m');
		await waitMins("1");
	}

	// ------------
	// Ended
	console.log(
		"[displayGiveawayCmd]*WARN @ heartbeatCheckEndGiveaway: " +
			"Giveaway Ended by Time // Removing reaction listener.",
	);
	await endGiveawayNow(_embedMsgMgr, _eventId, "Time Expired");
};

// .............................................................................
const endGiveawayNow = async (_embedMsgMgr, _eventId, _reason = "Out of Keys") => {
	console.log("[displayGiveawayCmd] @ endGiveawayNow");

	// Remove listener
	_embedMsgMgr.client.removeListener("messageReactionAdd", reactionListener);

	// Edit embed to expire
	return await endGiveawayAsync(_eventId, _reason);
};

// ...........................................................................................
const genAuthLinkEmbed = async (_uri) => {
	console.log(`[displayGiveawayCmd] @ genAuthLinkEmbed // uri==${_uri}`);

	const footerOpts = {
		text: dmAuthFooterStr,
		iconURL: dmAuthFooterImgUrl,
	};

	return new EmbedBuilder()
		.setColor(blueHexStr)
		.setTitle(displayGiveawayDM.dmAuthTitleStr)
		.setURL(_uri)
		.setDescription(displayGiveawayDM.dmAuthDescrStr)
		.setThumbnail(displayGiveawayDM.dmAuthThumbImgUrl)
		.setTimestamp()
		.setFooter(footerOpts);
};

// ...........................................................................................
const genGiveawayEmbed = async () => {
	const footerOpts = {
		text: displayGiveawayEmbedFooter.footerStr,
		iconURL: displayGiveawayEmbedFooter.footerImgIconUrl,
	};

	const embed = new EmbedBuilder()
		.setColor(blueHexStr)
		.setTitle(displayGiveawayEmbedLocale.displayGiveawayEmbedTitle) // .setTitle('Steam Key Giveaway! __RULES:__')
		.setThumbnail(displayGiveawayEmbedLocale.displayGiveawayEmbedThumbnailUrl) // .setThumbnail(discordUtils.GOLD_ICO_256_IMG_URL)
		.setFooter(footerOpts);

	// -------------------------
	// Dynamically set description from settings locale
	let descr = "```c\n";
	for (let i = 0; i < displayGiveawayEmbedRulesArr.length; i++) {
		descr += `${displayGiveawayEmbedRulesArr[i]}\n`;
	}
	descr += "\n```";
	embed.setDescription(descr);

	return embed;
};

// =====================================================================
export default cmdAction;
export { awaitReactionsAsync };
