// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// resumeGiveaway.js
// #############################################################################################################

import moment from "moment";
import { awaitReactionsAsync } from "./cmds/displayGiveawayCmd.js";
import { endGiveawayAsync } from "./cmds/endGiveawayCmd.js";
import { getMsgMgrByChannelIdAndMsgId } from "./discordClient.js";
import { getFirstGiveawayLive } from "../../services/dbAtlas.js";
import { JsonStringify } from "../i42Common.js";
import { checkMomentIsBeforeNow } from "../chronos.js";

const LogPrefix = "[resumeGiveaway]";

// ...........................................................................................
// => returns undefined
const checkResumeGiveawayIfLive = (res, errMsg) => checkResumeGiveawayAsync(res, errMsg);

// ...........................................................................................
// => returns undefined
const checkResumeGiveawayAsync = async () => {
	console.log(`${LogPrefix} @ checkResumeGiveawayAsync`);

	// Only returns with obj if live giveaway found
	const liveObj = await getFirstGiveawayLive(); // { keysArr, claimsArr }
	console.log(`${LogPrefix} @ checkResumeGiveawayAsync: liveObj==${liveObj}`);

	if (!liveObj) {
		return;
	} // No live giveaway

	// --------------------
	const isStillLive = checkDateEnded(liveObj);

	if (!isStillLive) {
		// Close giveaway ($set !isLive)
		const eventId = liveObj._id;
		const { eventName } = liveObj;
		const reason = "Expired (Resume Attempt)";

		return endGiveawayAsync(eventId, reason, eventName);
	}

	// No need to check for !keys since events will auto-close on final claim.

	// --------------------
	await resumeWatchEmbedReactions(liveObj);
};

// ...........................................................................................
const checkDateEnded = (_liveObj) => {
	const { endDateObj } = _liveObj.dates;
	const endMoment = new moment.utc(endDateObj);
	const isStillLive = checkMomentIsBeforeNow(endMoment);

	return isStillLive;
};

// ...........................................................................................
const resumeWatchEmbedReactions = async (_liveObj) => {
	try {
		console.log(`${LogPrefix} @ resumeWatchEmbedReactions`);

		const channelId = _liveObj.liveInChannelId;
		const msgId = _liveObj.embedMsgId;

		// Validate
		if (!channelId) {
			throw `!channelId // _liveObj==${JsonStringify(_liveObj)}`;
		}
		if (!msgId) {
			throw `!msgId // _liveObj==${_liveObj}`;
		}

		console.log(`${LogPrefix} @ resumeWatchEmbedReactions // msgId==${msgId}`);

		// ----------------
		const msgMgr = await getMsgMgrByChannelIdAndMsgId(channelId, msgId);

		if (!msgMgr) {
			throw "!msgMgr (Couldn't find embed msg)";
		}

		// msgMgr.edit('msgId==' + msgId); // TEST

		const eventName = _liveObj._id;
		// console.log(`${LogPrefix} @ resumeWatchEmbedReactions // _liveObj.dates.endDateObj==${_liveObj.dates.endDateObj}`);
		const endMoment = new moment.utc(_liveObj.dates.endDateObj);
		await awaitReactionsAsync(msgMgr, eventName, endMoment);
	} catch (err) {
		console.log(`${LogPrefix}**ERR @ resumeWatchEmbedReactions: ${err}`);
	}
};

export default checkResumeGiveawayIfLive;
