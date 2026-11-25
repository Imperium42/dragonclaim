// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// helpCmd.js
// cmd: `help` - List commands
// #############################################################################################################

import { getCachedConfigJson } from "../../i42Common.js";

getCachedConfigJson();
// ...........................................................................................
// Handles the command async
// -> returns undefined
const cmdAction = async (_botCmd, _cmdList) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) return; // Fail msg within

	await prepDisplayGiveawayCmds(_botCmd, _cmdList);
};

// ...........................................................................................
const prepDisplayGiveawayCmds = async (_botCmd, _cmdList) => {
	const cmdsStr = getCommands(_botCmd.prefix, _cmdList);

	// If !err, reply with success msg
	await _botCmd.msg.reply(
		` Type any *${_botCmd.prefix}command* to learn more:\n\`\`\`v\n${cmdsStr}\`\`\``,
	);
};

// ...........................................................................................
// Get a list of commands from cmdList, adding prefix.
const getCommands = (_prefix, _cmdList) => {
	// Get all the cmdList key names, adding prefix to them.
	const cmdListKeys = Object.keys(_cmdList);
	const cmdListKeysWithPrefix = cmdListKeys.map((_cmd) => {
		// `{.}{someCmd}`
		const cmdStr = `${_prefix}${_cmd}`;
		return cmdStr;
	});

	// Join with newlines
	return cmdListKeysWithPrefix.join("\n");
};

// ...........................................................................................
export { cmdAction };
