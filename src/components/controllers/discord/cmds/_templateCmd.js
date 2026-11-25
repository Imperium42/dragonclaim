// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// _templateCmd.js
// cmd: `someCmd` - Description
// #############################################################################################################
import { validateExists } from "../discordUtils.js";
import { getCachedConfigJson } from "../../i42Common.js";
// import { checkHasModRoleFromMsg, checkIsModBotSpamChannelId, getChannelById } from '../guildInfo.js';

const { emotes } = getCachedConfigJson().platforms.discord;
const {
	kbEmote,
	accessDeniedEmote,
	successEmote,
	// aliasEmote,
	// outgoingDataEmote,
	// keyEmote,
	// failEmote,
	// numberEmoteArr,
} = emotes;

// ...........................................................................................
// Handles the command async
//
// => returns undefined
exports.cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) return; // Fail msg within

	await prepDoSomething(_botCmd);
};

// ...........................................................................................
// * See BotCmd.js for props
//
// => returns undefined
const prepDoSomething = async (_botCmd) => {
	// Get args
	const arg1 = _botCmd.contentArr.shift();
	const arg2TheRest = _botCmd.contentArr.join(" "); // The rest

	// Normalize
	// const channelIdStr = normalizeChannelToIdStr(arg1); // number str

	// Validate args
	const isValid = validateExists(arg1, arg2TheRest);
	if (!isValid) {
		sendMissingArgsReply(_botCmd);
		return;
	}

	// // Valid Discord channel?
	// const discordChannel = getChannelById(channelIdStr, _botCmd.msg); // Sends msg on fail
	// if (!discordChannel) {
	// 	return;
	// }

	// ----------------
	// Ready!
	const doneMsgMgr = await doSomething(arg1, arg2TheRest);

	// If !err, reply with success msg
	if (doneMsgMgr) {
		_botCmd.msg.reply(` ${successEmote} Did something!`);
	}
};

// ...........................................................................................
// Sends a msg reply with missing args
//
// => returns msgMgr
const sendMissingArgsReply = async (_botCmd) => {
	const missingArgs = `\`${_botCmd.cmdLower}\` \`{arg1}\` \`{arg2}\``;
	const descrStr = `${kbEmote} Authorized mods may do something.`;
	// const aliasesSuffixStr = `${aliasEmote} Aliases: None`;

	return await _botCmd.msg.reply(
		` ${accessDeniedEmote} Missing args:\n\n${missingArgs}\n\n${descrStr}`,
	);
};

// ...........................................................................................
// Send message to a channel from bot
//
// => returns msgMgr response
const doSomething = async () => {
	try {
		return false;
		// eslint-disable-next-line no-unreachable -- template placeholder; real body goes in the try
	} catch (e) {
		console.log(`[_templateCmd] @ doSomething: ${e}`);
	}
};
