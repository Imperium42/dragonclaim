// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// setupGiveawayCmd.js
// #############################################################################################################

import moment from "moment";
import { createWriteStream, promises as fsPromises } from "fs";
import axios from "axios";
import { checkHasModRoleFromMsg } from "../guildInfo.js";
import { checkHasAttachment, validateExists } from "../discordUtils.js";
import { getEventId, getGiveawaysCol } from "../../../services/dbAtlas.js";
import {
	getCachedConfigJson,
	getLineBreakMatch,
	JsonStringify,
	getRootDataPath,
} from "../../i42Common.js";
import path from "path";

const { prefs, selfHosted } = getCachedConfigJson();
const { showJsonInReply } = selfHosted;
const { cmdPrefix } = prefs;

const discordConfig = getCachedConfigJson().platforms.discord;
const { emotes } = discordConfig;
const { accessDeniedEmote, successEmote, failEmote } = emotes;

const cmdAction = async (_botCmd) => {
	if (!_botCmd.checkAuthed()) return;

	_botCmd.printExtraLogs();
	await setupGiveaway(_botCmd);
};

const setupGiveaway = async (_botCmd) => {
	if (!checkHasModRoleFromMsg(_botCmd.msg)) {
		_botCmd.msg.reply(` ${emotes.accessDeniedEmote} Not whitelisted for this module.`);
		return;
	}

	const [eventName, duration] = _botCmd.contentArr;

	if (!validateExists(2, eventName, duration) || !checkHasAttachment(_botCmd.msg)) {
		_botCmd.msg.reply(missingArgsMessage());
		return;
	}

	const [durationValue, durationType] = parseDuration(duration);

	if (!Number.isInteger(durationValue) || !durationType) {
		_botCmd.msg.reply(missingArgsMessage());
		return;
	}

	await prepGiveawayDataAsync(_botCmd.msg, eventName, durationValue, durationType);
};

const missingArgsMessage = () => {
	const missingArgs = `\`${cmdPrefix}setupgiveaway\``;

	const descrStr = ":book: Create a *Steam Key* giveaway to those that DM their SteamID.";
	const aliasesSuffixStr =
		":martial_arts_uniform: Aliases: " +
		`\`${cmdPrefix}sg\` / ` +
		`\`${cmdPrefix}setupGiveaway\``;

	const tips =
		":bulb: *Expires in* can be a single *moment*, such as `8h`, `3d`, or `1m` (minimum)";

	return ` ${accessDeniedEmote} Missing args:\n${missingArgs}\n\n${descrStr}\n${aliasesSuffixStr}\n${tips}`;
};

const parseDuration = (durationStr) => {
	const match = durationStr.match(/(\d+)([a-zA-Z]+)/);
	return match ? [parseInt(match[1]), match[2]] : [null, null];
};

const prepGiveawayDataAsync = async (msg, eventName, eventDurationInt, eventDurationTypeChar) => {
	const nowMoment = new moment.utc();
	const keysArr = (await downloadAndProcessFile(msg, eventName, nowMoment))?.filter((key) => key); // Ensure no empty lines

	const numKeys = keysArr.length;
	const duration = moment.duration(eventDurationInt, eventDurationTypeChar);

	msg.reply(
		` Setting up giveaway of **${numKeys}** keys (ending __~${duration.humanize()}__ from now)...`,
	);
	const giveawayInitObj = generateGiveawayInitObj(
		keysArr,
		eventName,
		eventDurationInt,
		eventDurationTypeChar,
		msg.guild.id,
	);
	const isSuccess = await addNewGiveawayToDBAsync(msg, giveawayInitObj);

	// Reply
	if (isSuccess) {
		msg.reply(
			` ${successEmote} Added giveaway \`${giveawayInitObj.eventName}\`\n` +
				"⏳ When ready:\n```yaml\n" +
				`.displayGiveaway ${eventName} #{channel}\n` +
				"or\n" +
				`.displayGiveaway ${eventName} here\n` +
				"```",
		);
	}
};

const getPathToKeyOutputFile = (eventName, nowMoment) => {
	// https://momentjs.com/docs/#/displaying/to/
	// "someName-steamKeys-2014-09-08T08:02:17-05:00.txt" >> File systems sometimes don't play well with ':' char
	let formattedDate = nowMoment.toISOString();
	formattedDate = formattedDate.replace(":", "_");

	const fileName = `${eventName}-steamKeys-${formattedDate}.txt`;
	console.log(`[setupGiveawayCmd] downloadGetKeysArr: Normalized fileName==${fileName}`);

	const finalDir = "";

	const dataPath = getRootDataPath;
	const pathToNewFileName = path.join(dataPath(), "downloads", finalDir, fileName);
	return pathToNewFileName;
};

const downloadAndProcessFile = async (msg, eventName, nowMoment) => {
	const attachment = msg.attachments.first();

	// TODO: Add config opt to physically save the txt file to disk
	const filePath = getPathToKeyOutputFile(eventName, nowMoment);

	// Create directory if it doesn't exist
	try {
		const dirPath = path.dirname(filePath);
		await fsPromises.mkdir(dirPath, { recursive: true });
	} catch (err) {
		console.error(`[setupGiveawayCmd] Failed to create directory: ${err.message}`);
		throw new Error(`Failed to create directory for keys: ${err.message}`, { cause: err });
	}

	const writer = createWriteStream(filePath);

	const response = await axios({
		url: attachment.url,
		method: "GET",
		responseType: "stream",
	});

	await new Promise((resolve, reject) => {
		response.data.pipe(writer);
		writer.on("finish", resolve);
		writer.on("error", reject);
	});

	const keysByLineBreakStr = await fsPromises.readFile(filePath, "utf8");
	return onFinishedDownloadingSteamTxtGetKeysArr(keysByLineBreakStr, eventName);
};

const onFinishedDownloadingSteamTxtGetKeysArr = (keysByLineBreakStr) => {
	return keysByLineBreakStr.split(getLineBreakMatch());
};

const generateGiveawayInitObj = (
	_keysArr,
	_arg1EventName,
	_eventDurationInt,
	_eventDurationTypeChar,
	_guildId,
) => {
	const eventId = getEventId(_guildId, _arg1EventName);
	const dataObj = {
		_id: eventId,
		guildId: _guildId,
		eventName: _arg1EventName,
		isLive: false,
		dates: {
			eventDurationInt: _eventDurationInt,
			eventDurationTypeChar: _eventDurationTypeChar,
			startDateFriendly: null,
			endDateFriendly: null,
			startDateObj: null,
			endDateObj: null,
		},
		liveInChannelId: null,
		embedMsgId: null,
		reqsObj: {
			discord: true,
			steam: true,
			email: false,
		},
		initKeyCount: _keysArr.length,
		keysArr: _keysArr,
		endReason: null,
		claimersArr: [],
	};

	return dataObj;
};

const addNewGiveawayToDBAsync = async (msg, giveawayInitObj) => {
	if (showJsonInReply) {
		const stringifiedInitObj = JsonStringify(giveawayInitObj);
		msg.reply(
			"[setupGiveawayCmd] @ addNewGiveawayToDBAsync (DEV_ENV): " +
				`stringifiedInitObj==\n${stringifiedInitObj}`,
		);
	}

	try {
		const giveawayCol = await getGiveawaysCol();
		await giveawayCol.insertOne(giveawayInitObj);
		return true;
	} catch (err) {
		console.error(`[Discord]**ERR @ setupGiveaway-catch: ${err}`);
		msg.reply(` ${failEmote} Failed:\n\`\`\`js\n${err}\n\`\`\``);
		return false;
	}
};

export default cmdAction;
