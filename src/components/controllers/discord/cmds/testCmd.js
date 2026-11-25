// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// testCmd.js
// #############################################################################################################
import { getCachedConfigJson } from "../../i42Common.js";

getCachedConfigJson();
// ...........................................................................................
// Handles the command async
// => returns undefined
const cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) return; // Fail msg within

	await prepTest(_botCmd);
};

// ...........................................................................................
const prepTest = async (_botCmd) => _botCmd.msg.reply(" TODO");

export default cmdAction;
