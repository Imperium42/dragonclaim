// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// pingCmd.js
// cmd: `someCmd` - Description
// #############################################################################################################

import { getCachedConfigJson } from "../../i42Common.js";

getCachedConfigJson();
// ...........................................................................................
// Handles the command async
// => returns undefined
const cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) {
		return; // Fail msg within
	}

	await sendPong(_botCmd);
};

// ...........................................................................................
const sendPong = async (_botCmd) => {
	// ----------------
	// Ready!
	const pongStr = getPingMsg(_botCmd.msg);

	// If !err, reply with success msg
	if (pongStr) {
		_botCmd.msg.reply(` ${pongStr}`);
	}
};

// ...........................................................................................
// Send message to a channel from bot
// -> returns pongStr
const getPingMsg = (_msg) => {
	const ping = Date.now() - _msg.createdTimestamp;
	return `Pong (${ping}ms)`; // pongStr
};

// // ...........................................................................................
// // Sends a msg reply with missing args
// //
// // => returns msgMgr
// const sendMissingArgsReply = async (_botCmd) => {
// 	const missingArgs = `\`${_botCmd.cmdLower}\``;
// 	const descrStr = `${kbEmote} Authorized mods may do something.`;
// 	// const aliasesSuffixStr = `${aliasEmote} Aliases: None`;
//
// 	return await _botCmd.msg.reply(` ${accessDeniedEmote} Missing args:\n\n${missingArgs}\n\n${descrStr}`);
// };

export default cmdAction;
