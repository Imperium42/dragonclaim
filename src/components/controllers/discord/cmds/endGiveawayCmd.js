// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// endGiveawayCmd.js
// #############################################################################################################

import { checkHasModRoleFromMsg } from "../guildInfo.js";
import { validateExists } from "../discordUtils.js";
import { getMsgMgrByChannelIdAndMsgId } from "../discordClient.js";
import { closeGiveawayDB, getEventId, getGiveawaysCol } from "../../../services/dbAtlas.js";
import { getCachedConfigJson, JsonStringify } from "../../i42Common.js";
import { EmbedBuilder } from "discord.js";

const { locale, platforms } = getCachedConfigJson();
const discordKeys = platforms.discord;
const { emotes } = discordKeys;
const { accessDeniedEmote, successEmote } = emotes;
const { giveawayConcluded } = locale;

// ...........................................................................................
// Handles the command async
// -> returns undefined
const cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) return; // Fail msg within

	await prepEndGiveawayCmd(_botCmd);
};

// ...........................................................................................
// ONLY called from .cmd
const prepEndGiveawayCmd = async (_botCmd) => {
	const isAuthedMod = checkHasModRoleFromMsg(_botCmd.msg);
	if (!isAuthedMod) {
		// msg reply handled within
		_botCmd.msg.reply(` ${accessDeniedEmote} Authed mods only! Unauthorized attempt logged.`);
		return;
	}

	// ----------------
	// Get args
	// const prefix = discordUtils.getMsgPrefix();
	const arg1EventName = _botCmd.contentArr.shift();
	const theRestReason = _botCmd.contentArr.join(" "); // TODO?

	const isValid = validateExists(2, arg1EventName, theRestReason);

	// ----------------
	// Command building : 3
	const missingArgs = "`.endGiveaway` `<uniqueEventName>` `<reason with spaces>`";
	const descrStr =
		":book: Authed mods can end a giveaway already displayed by `.displayGiveaway`";
	const aliasesSuffixStr = ":martial_arts_uniform: Aliases: `.eg`";

	// >> Initial validation >>
	if (!isValid) {
		_botCmd.msg.reply(
			` ${accessDeniedEmote} Missing args:\n\n${missingArgs}\n\n${descrStr}\n${aliasesSuffixStr}`,
		);
		return;
	}

	_botCmd.msg.reply(` Ending giveaway \`${arg1EventName}\` :arrow_right:`);

	// ----------------
	await endGiveawayViaCmdAsync(arg1EventName, theRestReason, _botCmd.msg); // => Returns reply msg
};

// ...........................................................................................
const tryUpdateExpiredEmbed = async (_channelId, _embedMsgId) => {
	try {
		console.log("[endGiveawayCmd] @ tryUpdateEmbed");

		// Validate
		if (!_channelId) {
			throw "!channelId";
		}
		if (!_embedMsgId) {
			throw "!embedMsgId";
		}

		// Find embed
		const msgMgr = await getMsgMgrByChannelIdAndMsgId(_channelId, _embedMsgId);

		if (!msgMgr) {
			throw `!msgMgr // embedMsgId==${_embedMsgId} // channelId==${_channelId}`;
		}

		const editedEmbed = await generateEndGiveawayEmbed();

		// Show new embed edits in channel orig post
		const contentWrapper = {
			// 'content': content,
			embeds: [editedEmbed],
		};
		await msgMgr.edit(contentWrapper);
	} catch (err) {
		console.error(
			"[endGiveawayCmd]**ERR @ tryUpdateEmbed: Probably deleted, np // err==" + err,
		);
	}
};

// ...........................................................................................
// https://discordjs.guide/popular-topics/embeds.html#resending-a-received-embed
// -> returns new Embed
const generateEndGiveawayEmbed = () => {
	try {
		// console.log('[endGiveawayCmd] @ generateEndGiveawayEmbed');
		// (!) discord.js bug: You cannot clear fields/footer from an old one

		const title = `**${giveawayConcluded.giveawayConcludedTitleStr}:**`;

		const newEmbed = new EmbedBuilder()
			.setColor(giveawayConcluded.giveawayConcludedEmbedColorHexStr) // Default: Indigo
			.setTitle(title)
			.setDescription(giveawayConcluded.giveawayConcludedDescrStr)
			.setThumbnail(giveawayConcluded.giveawayConcludedComeBackSoonImgUrl)
			.setTimestamp();
		// .setFields([]) // bug: clear !works
		// .setFooter(null) // bug: clear !works
		return newEmbed;
	} catch (e) {
		console.error(`[endGiveawayCmd]**ERR @ editEmbedToEnding: ${e}`);
	}
};

// ...........................................................................................
const endGiveawayViaCmdAsync = async (_cmdEventName, _reason, _guildMsg) => {
	console.log("[endGiveawayCmd] @ endGiveawayViaCmdAsync");

	// Get eventId from guildId + eventName
	const guildId = _guildMsg?.guild?.id;
	const eventId = getEventId(guildId, _cmdEventName); // "{discordId}-{eventName}"

	return await endGiveawayAsync(eventId, _reason, _cmdEventName, _guildMsg);
};

// ...........................................................................................
// => Returns reply guild msg. NOT meant for DMs.
// * On null msg, we'll find by eventId from a guild .cmd
// * _eventName is only used for errs from a guild .cmd
const endGiveawayAsync = async (_eventId, _reason, _eventName = null, _guildMsg = null) => {
	try {
		console.log("[endGiveawayCmd] @ endGiveawayAsync");
		const isCalledFromGuildCmd = !_guildMsg; // If called outside cmd
		// const parsedChannelId = `<#${channelId}>`;

		// ----------------------
		// Get obj so we know what to update and how to find the embed msg
		const giveawayObj = await getGiveawayObjFromDB(_eventId);

		if (!giveawayObj) {
			if (!isCalledFromGuildCmd) {
				const notFoundMsg = giveawayConcluded.eventNotFoundErrStr.replace(
					"{eventName}",
					_eventName,
				);

				_guildMsg.reply(` ${notFoundMsg}`);
			}

			return;
		}

		const { isLive, liveInChannelId, embedMsgId } = giveawayObj;

		// Validate
		if (isLive === null) {
			throw new Error("isLive===null");
		}
		if (!liveInChannelId) {
			throw new Error("!liveInChannelId");
		}
		if (!embedMsgId) {
			throw new Error("!embedMsgId");
		}

		// ----------------------
		// !live, then update db
		if (isLive) {
			await closeGiveawayDB(
				_eventId, // "{discordId}-{eventName}"
				_reason,
			);
		}

		// ----------------------
		// Edit embed, but only if it exists - don't wait
		tryUpdateExpiredEmbed(liveInChannelId, embedMsgId);

		// ----------------------
		if (!isCalledFromGuildCmd) {
			const suffix = isLive
				? ""
				: "\n(However, it wasn't live - was probably already ended before)";
			return await _guildMsg.reply(
				` ${successEmote} Ended giveaway in <#${liveInChannelId}>${suffix}`,
			);
		}
	} catch (e) {
		console.error(`[endGiveawayCmd]**ERR @ endGiveawayAsync: ${e}`);
	}
};

// ...........................................................................................
// _eventId = "{discordId}-{eventName}"
const getGiveawayObjFromDB = async (_eventId) => {
	try {
		console.log("[endGiveawayCmd] @ getGiveawayObjFromDB");

		const col = await getGiveawaysCol();
		const query = { _id: _eventId }; // "{discordId}-{eventName}"
		const opts = {
			projection: {
				isLive: 1,
				liveInChannelId: 1,
				embedMsgId: 1,
			},
		};

		const giveawayObj = await col.findOne(query, opts);
		console.log(
			`[endGiveawayCmd] @ getGiveawayObjFromDB // giveawayObj==${JsonStringify(giveawayObj)}`,
		);
		return giveawayObj;
	} catch (e) {
		console.error(`[endGiveawayCmd]**ERR @ getGiveawayObjFromDB: ${e}`);
	}
};

export default cmdAction;
export { tryUpdateExpiredEmbed, endGiveawayAsync };
