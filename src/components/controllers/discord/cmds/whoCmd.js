// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// whoCmd.js
// Get authed info about yourself
// #############################################################################################################

import { checkHasModRoleFromMsg } from "../guildInfo.js";
import { getCachedConfigJson } from "../../i42Common.js";

getCachedConfigJson();

// ...........................................................................................
// Handles the command async
//
// => returns undefined
const _cmdAction = async (_botCmd) => {
	if (!_botCmd.msg) throw new Error("[whoCmd]**ERR @ cmdAction: !_msg");

	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) {
		return; // Fail msg within
	}

	_botCmd.msg.reply(_botCmd.msg.author.username);
};

// ...........................................................................................
const _prepWhoAmI = async (_botCmd) => {
	console.log("[whoCmd] @ prepWhoAmI");

	const whoStr = getWhoAmIStr(_botCmd);
	_botCmd.msg.reply(` ${whoStr}`);
};

// ...........................................................................................
// => returns undefined
const getWhoAmIStr = (_botCmd) => {
	console.log("[whoCmd] @ whoAmI");

	const isAuthedMod = checkHasModRoleFromMsg(_botCmd.msg);
	const discordId = _botCmd.msg.author.id;

	let powers = "";
	if (isAuthedMod) {
		powers += "+Mod";
	}

	const summaryMsg = `DiscordId==\`${discordId}\`\n` + `Powers==\`${powers}\``;

	return summaryMsg;
};
