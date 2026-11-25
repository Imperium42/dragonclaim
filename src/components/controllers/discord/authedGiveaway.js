// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// authedGiveaway.js
// #############################################################################################################

// const moment = require('moment');
import { getMyGuildMemberById } from "./guildInfo.js";
import { addRoleToMember, getMsgMgrByChannelIdAndMsgId } from "./discordClient.js";
import steamCheckIsTrusted from "../steam/steamCheckIsTrusted.js";
import { escapeHtml, getCachedConfigJson, getHtmlContentType } from "../i42Common.js";
import { giveawayOAuthStateKey } from "../../services/redisKeys.js";
import { delRedisObj, getRedisObj } from "../../services/redis.js";
import {
	addToDiscordBlacklist as addToDiscordBlacklist1,
	checkUserAlreadyClaimedKey,
	claimGiveawayKey,
	getNextGiveawayKey,
} from "../../services/dbAtlas.js";
import { exchangeCodeForToken } from "../../services/discordOAuth2.js";
import discordOAuthSrc from "../../models/DiscordOAuthSrc.js";
import { EmbedBuilder } from "discord.js";
import { endGiveawayAsync } from "./cmds/endGiveawayCmd.js";

const { hexColors, locale } = getCachedConfigJson();

const { displayGiveawayDM } = locale;
const { dm500Errs, dmAuthSuccess, dmAuthExpired } = displayGiveawayDM;
// Trusted (operator-configured) messages that may intentionally contain HTML
const KNOWN_LOCALE_MSGS = new Set(Object.values(dm500Errs ?? {}));
// const { dmPlayerKeyStrObj } = dmAuthSuccess;
const discordSettings = getCachedConfigJson().platforms.discord;

// ...........................................................................................
const failedAuth = (_res, _errMsg) => {
	handleRouterErr(_res, _errMsg);
};

// ...........................................................................................
// User should already have a valid, linked Steam ID, by now
// -> returns isSuccess
const authedFromDiscordRedirect = async (
	_res,
	_code,
	_state,
	_discordClientSecret,
	_discordOAuth2Helper,
) => {
	// console.log(`${LogPrefix} authedFromDiscordRedirect`);
	return await handleAuthedGiveawayAsync(
		_res,
		_code,
		_state,
		_discordClientSecret,
		_discordOAuth2Helper,
	);
};

// ...........................................................................................
// Ends the session with err. Can pass errMsg || errObj.
// errCode === 1 | No keys left
const handleRouterErr = (_res, _err, _errCode = 0) => {
	const isCustomErr = _err && typeof _err === "string";
	const errMsg =
		"[authedGiveaway]**ERR @ handleAuthedGiveawayAsync (caught): " +
		`err==${_err} // str?==${isCustomErr}`;
	console.log(errMsg);
	// console.trace();

	const isServerErr = _err === "access_denied";
	let extInfo = dm500Errs.dmErrTryAgain; // Fallback

	if (isServerErr) {
		extInfo = dm500Errs.dmErrServer;
	} else if (isCustomErr) {
		switch (_errCode) {
			case 1:
				// No keys left
				extInfo = dm500Errs.dmErrAllKeysClaimedStr;
				break;

			default:
				// Our own locale strings may contain intended HTML; anything else (e.g. Discord's
				// `?error=` query param, or a thrown message) is untrusted and gets escaped (XSS).
				extInfo = KNOWN_LOCALE_MSGS.has(_err) ? _err : escapeHtml(_err);
				break;
		}
	}

	const htmlStr = dm500Errs.dmErrSomethingWentWrong + extInfo + dm500Errs.dmErrQuestions;

	_res.set(getHtmlContentType()).status(500).end(htmlStr);
};

// ...........................................................................................
// => returns isSuccess
const handleAuthedGiveawayAsync = async (
	_res,
	_code,
	_state,
	_discordClientSecret,
	_discordOAuth2Helper,
) => {
	// console.log("[authedGiveaway] @ handleAuthedGiveawayAsync");
	try {
		// Match state against DiscordID:
		// <state, {discordId, eventId, embedMsgId, channelId, dmMsgId, dmChannelId}:str>
		const parseJson = true;
		const stateKey = giveawayOAuthStateKey(_state); // undefined if not a UUID
		const stateObj = stateKey ? await getRedisObj(stateKey, parseJson) : undefined;

		if (!stateObj) {
			throw dm500Errs.dmErr1PossiblyExpiredLinkNoState;
		}

		// --------------------
		// Found stateObj!
		const {
			discordId,
			eventId, // "{discordId}-{eventName}"
		} = stateObj;

		const { embedMsgId, channelId, dmMsgId, dmChannelId } = stateObj;

		const dmMsgMgr = await getMsgMgrByChannelIdAndMsgId(dmChannelId, dmMsgId);

		if (!dmMsgMgr) {
			// Manually handle this err - the bot must've reset and lost DM embed link.
			// throw ('!dmMsgMgr');
			console.error(
				"[authedGiveaway]**ERR @ handleAuthedGiveawayAsync " + "(parent): !dmMsgMgr",
			);

			const errCode = 2;
			handleRouterErr(_res, "!dmMsgMgr", errCode);
			return false;
		}

		// --------------------
		// Get DM obj to edit embed later

		// --------------------
		// Validate
		if (!discordId) {
			const isSuccess = false;
			await editDmEmbed(dmMsgMgr, isSuccess);
			throw dm500Errs.dmErr2PossiblyExpiredLinkWithState;
		}

		// Get access token to make 'connection' API call
		// return res.end(code);
		let accessObj;
		try {
			accessObj = await getGiveawayAccessObj(
				_code,
				_discordClientSecret,
				_discordOAuth2Helper,
			);
		} catch (e) {
			console.log(
				"[authedGiveaway]**ERR @ handleAuthedGiveawayAsync" + "=> getGiveawayAccessObj",
			);

			await editDmEmbed(dmMsgMgr);
			throw new Error(String(e), { cause: e });
		}

		// return res.json(accessToken);

		// ############################################################
		// {
		//     "access_token": "AsDf",
		//     "expires_in": 604800,
		//     "refresh_token": "ZxCv",
		//     "scope": "connections",
		//     "token_type": "Bearer"
		// }
		// ############################################################

		// Get Steam connection obj
		let connectionsArr;
		try {
			connectionsArr = await _discordOAuth2Helper.getUserConnections(accessObj.access_token);
		} catch (e) {
			console.log("[authedGiveaway]**ERR @ handleAuthedGiveawayAsync => getUserConnections");
			await editDmEmbed(dmMsgMgr);
			throw e;
		}

		// ############################################################
		// {
		//     "type": "steam",
		//     "id": "76561190000000001",
		//     "name": "ExampleUser",
		//     "visibility": 1,
		//     "friend_sync": true,
		//     "show_activity": true,
		//     "verified": false
		//   },
		// ############################################################

		// Find Steam obj within connections arr
		const steamObj = getSteamConnectionObj(connectionsArr);
		throwIfInvalidSteamObj(steamObj);
		// return res.json(steamObj); // TEST

		// --------------------------------
		const _steamId = steamObj.id;

		// // TODO: WIP
		// Check for alts via GS with Steam+Discord IDs.
		// try {
		// 	await checkAltsThrowIfFound(discordId, _steamId, _state, dmMsgMgr);
		// }
		// catch (e) {
		// 	console.log('[authedGiveaway]**ERR @ handleAuthedGiveawayAsync => checkAltsThrowIfFound');
		// 	throw (e);
		// }

		// --------------------------------
		// Does the user have a sketchy Steam flag?
		try {
			await checkSteamSketchyThrowIfFound(discordId, _steamId, _state, dmMsgMgr);
		} catch (e) {
			console.log(
				"[authedGiveaway]**ERR @ handleAuthedGiveawayAsync => checkSteamSketchyThrowIfFound",
			);
			throw e;
		}

		// ------------------------
		// Did the user already claim this key? We checked at init DM, but it's been a while.
		// Just a last second sanity check!
		const alreadyClaimed = await checkUserAlreadyClaimedKey(
			eventId, // "{discordId}-{eventName}"
			discordId,
		);

		if (alreadyClaimed) {
			return null;
		}

		// --------------------------------
		// Success! Update DB and toss user this key.
		// return res.json(steamPlayerObj);
		let steamKey;
		try {
			steamKey = await getSteamKeyFromDB(eventId, discordId, embedMsgId, channelId, dmMsgMgr); // Already validated
		} catch (e) {
			console.log(
				`[authedGiveaway]**ERR @ handleAuthedGiveawayAsync => getSteamKeyFromDB: ${e}`,
			);

			if (e.message.includes(dm500Errs.dmErrAllKeysClaimedStr)) {
				// Manually throw with code
				const errCode = 1; // !steam keys left
				handleRouterErr(_res, dm500Errs.dmErrAllKeysClaimedStr, errCode);
				return false; // !isSuccess
			}

			throw e;
		}

		// --------------------------------
		try {
			const successfullyClaimed = await claimKeyUpdateDb(
				_res,
				discordId,
				_steamId,
				eventId, // "{discordId}-{eventName}"
				steamKey,
			);

			if (!successfullyClaimed) {
				throw dm500Errs.dmErrUnsuccessfulClaim;
			}

			// // Update the giveaway embed with new key count
			// const dbCol = await getGiveawaysCol();
			// const giveawayObj = await dbCol.findOne({ '_id': eventId });
			// if (giveawayObj) {
			// 	const numKeysStart = giveawayObj.initKeyCount || 0;
			// 	const numClaimers = (giveawayObj.claimersArr && giveawayObj.claimersArr.length) || 0;
			// 	const numKeysRemain = numKeysStart - numClaimers;
			// 	const numKeysRemainStr = `${numKeysRemain}/${numKeysStart} keys remain`;

			// 	const embedMsgMgr = await getMsgMgrByChannelIdAndMsgId(channelId, embedMsgId);
			// 	if (embedMsgMgr) {
			// 		const embed = embedMsgMgr.embeds[0];
			// 		embed.description = embed.description.replace(/\d+\/\d+ keys remain/, numKeysRemainStr);
			// 		await embedMsgMgr.edit({ embeds: [embed] });
			// 	}
			// }
		} catch (e) {
			const isSuccess = false;
			await editDmEmbed(dmMsgMgr, isSuccess);
			throw e;
		}

		// --------------------------------
		// Success!
		try {
			// Flush redis state BEFORE we hand the key
			await tryDelRedisKeyAsync(_state); // => Wait so it can't be BOT spammed to create epoch time exploit

			const isSuccess = true;
			await editDmEmbed(dmMsgMgr, isSuccess, steamKey);
			// await dmPlayerKey(_res, discordId, steamKey); // Now in the above contentWrapper ^
		} catch (e) {
			console.log("[authedGiveaway]**ERR @ handleAuthedGiveawayAsync => dmPlayerKey");
			throw e;
		}

		// --------------------------------
		// Post-end events
		try {
			addVerifiedRole(discordId); // Dont await // Add "Verified!" role async
		} catch (e) {
			console.log("[authedGiveaway]**ERR @ handleAuthedGiveawayAsync => addVerifiedRole");
			throw e;
		}

		routeSuccess(_res, steamKey);
		return true; // isSuccess
	} catch (err) {
		console.error(`[authedGiveaway]**ERR @ handleAuthedGiveawayAsync (parent): ${err}`);
		handleRouterErr(_res, err);
	}
};

// ...........................................................................................
const routeSuccess = (_res, _steamKey) => {
	const htmlStr = dmAuthSuccess.dmSuccessHtmlStr.replace("{steamKey}", _steamKey);
	_res.set(getHtmlContentType()).status(200).end(htmlStr);
};

// ...........................................................................................
// If success, include steamKey
// If isSuccess & steamKey, we'll add the steam key to content.
const editDmEmbed = async (dmMsgMgr, isSuccess = false, steamKey = null) => {
	// console.log("[authedGiveaway] @ editDmEmbed // _discordId==" + _discordId);
	try {
		if (!dmMsgMgr) {
			throw "!dmMsgMgr";
		}

		const embed = dmMsgMgr.embeds[0];
		const editedEmbed = !isSuccess
			? getEditedEmbedAsExpired(embed)
			: await getEditedEmbedAsSuccess(embed, steamKey);

		// Show new embed edits in DM orig post
		const contentWrapper = {
			embeds: [editedEmbed],
		};

		if (isSuccess && steamKey) {
			// Add Steam key
			const content =
				dmAuthSuccess.dmSuccessContentHeresYourKey + "\n```yaml\n" + steamKey + "\n```";
			contentWrapper.content = content;
		}

		// Show new embed edits in channel orig post
		const res = await dmMsgMgr.edit(contentWrapper);
		return res;
	} catch (err) {
		console.error(`[authedGiveaway]**ERR @ editDmEmbed: ${err}`);
	}
};

// ...........................................................................................
// https://discordjs.guide/popular-topics/embeds.html#resending-a-received-embed
const getEditedEmbedAsSuccess = async (_embed, _steamKey) => {
	// console.log('[authedGiveaway] @ editDmEmbed');

	const footerOpts = {
		text: dmAuthSuccess.dmAuthSuccessFooterStr,
		iconURL: null,
	};

	// +Optional fields, if declared?
	const fieldsArr = getSuccessEditEmbedFields(_steamKey);

	// ----------
	const newEmbed = new EmbedBuilder(_embed)
		.setTitle(dmAuthSuccess.dmAuthSuccessTitleStr)
		.setURL(null) // Clear
		.setDescription(dmAuthSuccess.dmAuthSuccessDescrStr)
		.setColor(hexColors.seaGreenHexStr) // Sea green
		.addFields(...fieldsArr)
		.setThumbnail(dmAuthSuccess.dmAuthSuccessThumbImgUrl)
		.setTimestamp()
		.setFooter(footerOpts);

	return newEmbed;
};

// ...........................................................................................
// -> returns fields[]
const getSuccessEditEmbedFields = (_steamKey) => {
	const fieldsArr = [];

	const dmAuthSuccessDesktopPrimaryStrParsed =
		dmAuthSuccess.dmAuthSuccessDesktopPrimaryStr?.replace("{steamKey}", _steamKey);

	if (
		!dmAuthSuccess.dmAuthSuccessDesktopPrimaryHeaderStr ||
		!dmAuthSuccessDesktopPrimaryStrParsed
	) {
		return fieldsArr;
	}

	fieldsArr.push({
		name: dmAuthSuccess.dmAuthSuccessDesktopPrimaryHeaderStr,
		value: dmAuthSuccessDesktopPrimaryStrParsed,
	});

	// Only include 2nd mobile field if Desktop + filled and different from Desktop.
	const includeMobileField =
		dmAuthSuccess.dmAuthSuccessMobileOptionalHeaderStr &&
		dmAuthSuccess.dmAuthSuccessMobileOptionalStr &&
		dmAuthSuccess.dmAuthSuccessMobileOptionalStr !== dmAuthSuccessDesktopPrimaryStrParsed;

	if (includeMobileField) {
		const dmAuthSuccessMobileOptionalStrParsed =
			dmAuthSuccess.dmAuthSuccessMobileOptionalStr.replace("{steamKey}", _steamKey);

		fieldsArr.push({
			name: dmAuthSuccess.dmAuthSuccessMobileOptionalHeaderStr,
			value: dmAuthSuccessMobileOptionalStrParsed,
		});
	}

	return fieldsArr;
};

// ...........................................................................................
// https://discordjs.guide/popular-topics/embeds.html#resending-a-received-embed
const getEditedEmbedAsExpired = (_oldEmbed) => {
	// console.log('[authedGiveaway] @ editDmEmbed');

	const editedEmbed = new EmbedBuilder(_oldEmbed)
		.setTitle(dmAuthExpired.dmAuthExpiredTitleStr)
		.setURL(null) // Clear
		.setDescription(dmAuthExpired.dmAuthExpiredDescrStr)
		.setColor(dmAuthExpired.dmAuthExpiredColor)
		.setFields([]) // Clear
		.setThumbnail(dmAuthExpired.dmAuthExpiredThumbImgUrl)
		.setTimestamp()
		.setFooter(null); // Clear
	return editedEmbed;
};

// ...........................................................................................
// => returns isSuccess
const addVerifiedRole = async (_discordId) => {
	// console.log("[authedGiveaway] @ addVerifiedRole // _discordId==" + _discordId);

	const verifiedRoleId = discordSettings.verifiedEndUserRoleId; // "Verified!"

	// const roleObj = await guildInfo.getRoleObj(verifiedRoleId);
	// console.log(`[authedGiveaway] addVerifiedRole // roleObj==${roleObj}`);

	// const userObj = await discordClient.getUserById(_discordId);
	const memberObj = await getMyGuildMemberById(_discordId);
	// console.log(`[authedGiveaway] addVerifiedRole // memberObj==${memberObj}`);

	// if (!roleObj)
	// {
	//     console.error("[authedGiveaway]**ERR @ addVerifiedRole: !roleObj");
	//     console.trace();
	//     // throw("!roleObj");
	// }

	if (!memberObj) {
		console.error("[authedGiveaway]**ERR @ addVerifiedRole: !memberObj");
		console.trace();
		// throw("!memberObj");
	}

	// Add role now
	await addRoleToMember(memberObj, verifiedRoleId);
	return true;
};

// [DEPRECATED: Now bundled with the success embed edit]
// // ...........................................................................................
// // Returns dmMsg
// const dmPlayerKey = async (res, _discordId, _steamKey) => {
// 	console.log(`[authedGiveaway] @ dmPlayerKey: discordId==${_discordId} // steamKey==${_steamKey}`);
//
// 	const contentWrapper = { 'content': dmPlayerKeyStrObj.dmActivateThisKeyOnSteamStr, 'embeds': [] };
// 	const dmMsg = await dmMemberViaId(_discordId, contentWrapper);
//
// 	res.set(getHtmlContentType()).end(dmPlayerKeyStrObj.dmAllVerifiedStr);
// 	return dmMsg;
// };

// // ...........................................................................................
// // Returns true if !alts (but would throw, anyway, if alt found)
// // TODO: WIP
// const checkAltsThrowIfFound = async (_discordId, _steamId, _state, _dmMsgMgr) => {
// 	// // TODO: Check if mod, and if we should skip this check
// 	// const isWhitelistedMod = checkHasModRoleFromRoleArr(_discordId);
//
// 	// TODO: Check db contains the discordId || steamId for this giveaway; throw if found.
//
// 	return true;
// };

// ...........................................................................................
// -> returns isTrusted (but will throw, anyway, if not).
const checkSteamSketchyThrowIfFound = async (_discordId, _steamId, _state, _dmMsgMgr) => {
	console.log("[authedGiveaway] @ checkSteamSketchyThrowIfFound");

	const isTrusted = await steamCheckIsTrusted(_steamId);
	// console.log('[authedGiveaway] @ checkSteamSketchyThrowIfFound // isTrusted==' + isTrusted);

	// Return if trusted, else throw
	if (isTrusted) {
		return true;
	}

	// ---------
	// Sketchy AF >>
	await Promise.all([
		tryDelRedisKeyAsync(_state),
		addToDiscordBlacklist(_discordId, _steamId, dm500Errs.dmErrInternalSteamBlacklistMsg),
		editDmEmbed(_dmMsgMgr),
	]);

	throw dm500Errs.dmErrSomethingWentWrong;
};

// ...........................................................................................
// Use this once the user actually gets a key OR gets blacklisted
const tryDelRedisKeyAsync = async (_state) => {
	// -----------------
	// All good: Flush redis entry since we have the obj we need
	try {
		return await delRedisObj(giveawayOAuthStateKey(_state));
	} catch (e) {
		console.log("[authedGiveaway]**ERR @ flushRedisKey");
		throw e;
	}
};

// // ...........................................................................................
// // (!) DEPRECATED: Privacy rules can return 0 games if private profile.
// const throwIfAlreadyOwnsGame = async (_discordId, _steamId, _isXbladeDiscordId, _state, _dmMsgMgr) => {
// 	const alreadyOwnsGame = await checkOwnsSteamGame(_steamId);
//
// 	if (alreadyOwnsGame) {
// 		const awkwardErrStr = dm500Errs.dmErrAlreadyOwnStr;
//
// 		await Promise.all([
// 			tryDelRedisKeyAsync(_state),
// 			editDmEmbed(_dmMsgMgr),
// 		]);
//
// 		throw (awkwardErrStr);
// 	}
//
// 	return alreadyOwnsGame;
// };

// ...........................................................................................
// Has !Steam account link with Discord.
const throwIfInvalidSteamObj = (_steamObj) => {
	if (!_steamObj) {
		throw dm500Errs.dmErrSteamNotLinked;
	}
};

// ...........................................................................................
// Assumed all checks have been made by here, by now. Eg: Trusted, dupe checks...
const getSteamKeyFromDB = async (_eventId, _discordId, _dmEmbedMsgId, _dmChannelId, _dmMsgMgr) => {
	console.log("[authedGiveaway] @ getSteamKeyFromDB");
	const steamKey = await getNextGiveawayKey(_eventId, _discordId, _dmEmbedMsgId, _dmChannelId);

	// Throws ^ if out of keys; returns null if already claimed. May as well check empty, too.
	if (!steamKey) {
		// If we didn't throw for running out of keys, and got !key, it means we already own the game.
		await editDmEmbed(_dmMsgMgr);
		throw new Error(dm500Errs.dmErrAlreadyOwnStr);
	} else if (steamKey === "NO_KEYS") {
		// We ran out of keys - end the giveaway. We'll edit both DM and public embed to reflect.
		const reason = dm500Errs.dmErrInternalAllKeysClaimedReasonStr;
		const eventName = null;
		await Promise.all([endGiveawayAsync(_eventId, reason, eventName), editDmEmbed(_dmMsgMgr)]);

		throw new Error(dm500Errs.dmErrAllKeysClaimedStr);
	}

	// ...WE GOT THE KEY!
	return steamKey;
};

// ...........................................................................................
// _eventId = "{discordId}-{eventName}"
const claimKeyUpdateDb = async (
	_res,
	_discordId,
	_steamId,
	_eventId, // "{discordId}-{eventName}"
	_steamKey,
) => {
	try {
		console.log("[authedGiveaway] @ claimGiveawayKey");

		// Validated within, else err throw
		await claimGiveawayKey(
			_eventId, // "{discordId}-{eventName}"
			_discordId,
			_steamId,
			_steamKey,
		);

		// console.log("[authedGiveaway] @ claimGiveawayKey // TODO // updateDbRes==" + updateDbRes);

		// Double check
		if (!_steamId) {
			handleRouterErr(_res);
		}

		// Success!
		return true;
	} catch (e) {
		console.error(`[authedGiveaway]**ERR @ CGK: ${e}`);
		handleRouterErr(_res, e); // escapes untrusted text; never echo raw errors
	}
};

// ...........................................................................................
const addToDiscordBlacklist = async (discordId, steamId, reason) => {
	return addToDiscordBlacklist1(discordId, steamId, null, reason);
};

// ...........................................................................................
const getSteamConnectionObj = (_connectionsArr) => {
	// console.log(`[authedGiveaway] @ getSteamConnectionObj: _connectionsArr.length==${_connectionsArr.length} // ` +
	//     `[0]==${_connectionsArr[0]}`);

	const steamCon = _connectionsArr.find((s) => s.type === "steam");

	console.log("[authedGiveaway] @ getSteamConnectionObj: steamCon==" + steamCon);
	return steamCon;
};

// ...........................................................................................
const getGiveawayAccessObj = async (code, _discordClientSecret, _discordOAuth2Helper) => {
	console.log(`[authedGiveaway] @ getGiveawayAccessObj`);
	// console.log("[authedGiveaway] @ getGiveawayAccessToken // code==" + code);

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// // Native POST (Axios)
	// const paramsObj =
	// {
	//     "client_id" : discordBot.clientId,
	//     "client_secret" : discordClientSecret,
	//     "grant_type" : "authorization_code",
	//     "code" : code,
	//     "redirect_uri" : discordUtils.GIVEAWAY_URI_RAW_BETA,
	//     "scope": "connections"
	// };

	// const headers = { 'Content-type' : 'application/x-server.js-form-urlencoded' };

	// const endpoint = 'https://discord.com/api/v6';
	// // const inlineParamsStr = httpMod.parseToGetParamsShallow(paramsObj);
	// // let uri = `${endpoint}/oauth2/token${inlineParamsStr}`;
	// const uri = `${endpoint}/oauth2/v6/token`;
	// const res = await httpMod.jsonPOST(uri, paramsObj, headers);

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Wrapper
	console.log(`[authedGiveaway] @ getGiveawayAccessObj`);
	const accessTokenRes = await exchangeCodeForToken(code, discordOAuthSrc.Giveaway);

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// console.log("[discord] getGiveawayAccessToken // res==" + accessObjRes);
	return accessTokenRes;
};

// ===================================================================================
export { failedAuth, authedFromDiscordRedirect };
