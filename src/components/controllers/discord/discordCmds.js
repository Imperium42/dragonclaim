// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// discordCmds.js
// #############################################################################################################

import "../i42Common.js";
import { ChannelType } from "discord.js";
import BotCmdTs from "../../models/BotCmd.js"; // .ts
import announceCmd from "./cmds/announceCmd.js";
import displayGiveawayCmd from "./cmds/displayGiveawayCmd.js";
import dmReplyCmd from "./cmds/dmReplyCmd.js";
import endGiveawayCmd from "./cmds/endGiveawayCmd.js";
import giveawayCmd from "./cmds/giveawayCmd.js";
import { cmdAction as helpCmd } from "./cmds/helpCmd.js";
import pingCmd from "./cmds/pingCmd.js";
import setupGiveawayCmd from "./cmds/setupGiveawayCmd.js";
import testCmd from "./cmds/testCmd.js";

const cmdList = {
	announce: announceCmd,
	displayGiveaway: displayGiveawayCmd,
	dmReply: dmReplyCmd,
	endGiveaway: endGiveawayCmd,
	giveawayCmds: giveawayCmd,
	help: helpCmd,
	ping: pingCmd,
	setupGiveaway: setupGiveawayCmd,
	test: testCmd,
};

// ...........................................................................................
const init = (_stage) => {
	// console.log(`[DiscordCmds] @ init: _stage==${stage}`);
};

// ...........................................................................................
// => returns undefined
const commandHandler = async (_msg, _prefix) => {
	// console.log("[DiscordCmds] @ commandHandler");

	if (!_msg) {
		throw new Error("[discordCmds]**ERR @ commandHandler: !_msg");
	}

	const { content } = _msg;
	const contentArr = content.split(/\s+/g);
	const cmd = contentArr.shift(); // Technically arg0
	const cmdLower = cmd.toLowerCase();

	// ---------------------------------
	const isDM = _msg.channel.type === ChannelType.DM;
	if (isDM) {
		return cmdList.dmReply(_msg, content, contentArr);
	}

	// ---------------------------------
	// Exit if the messages does not start with the prefix or invalid
	const isTxtChannel = _msg.channel.type === ChannelType.GuildText;
	const msgStartsWithPrefix = _msg.content.startsWith(_prefix);

	if (!msgStartsWithPrefix || !isTxtChannel) {
		return;
	}

	// ---------------------------------
	await handleCmd(cmdLower, _msg, content, contentArr, _prefix);
};

// .......................................................................................
// => returns undefined
const handleCmd = async (_cmdLower, _msg, _content, _contentArr, _prefix) => {
	// console.log("[DiscordCmds] @ handleCmd")
	if (!_msg) {
		throw new Error("[discordCmds]**ERR @ commandHandler: !_msg");
	}

	const botCmd = new BotCmdTs(_msg, _cmdLower, _contentArr, _prefix);

	switch (_cmdLower) {
		// ---------------
		case `${_prefix}announce`:
			await cmdList.announce(botCmd);
			break;

		// ---------------
		case `${_prefix}test`:
			await cmdList.test(botCmd);
			break;

		// ---------------
		case `${_prefix}displaygiveaway`:
		case `${_prefix}dg`:
			await cmdList.displayGiveaway(botCmd);
			break;

		// ---------------
		case `${_prefix}giveaway`:
		case `${_prefix}giveawaycmd`:
		case `${_prefix}giveawaycmds`:
			await cmdList.giveawayCmds(botCmd);
			break;

		// ---------------
		case `${_prefix}help`:
			await cmdList.help(botCmd, cmdList);
			break;

		// ---------------
		case `${_prefix}ping`: {
			await cmdList.ping(botCmd);
			break;
		}

		// ---------------
		case `${_prefix}setupgiveaway`:
		case `${_prefix}sg`: {
			await cmdList.setupGiveaway(botCmd);
			break;
		}

		// ---------------
		case `${_prefix}endgiveaway`:
		case `${_prefix}eg`: {
			await cmdList.endGiveaway(botCmd);
			break;
		}

		// ------------------------------------------
		// (END)
		default: {
			// Unhandled cmd - np!
		}
	} // End switch
};

// ........................................................................................
export { init, commandHandler, cmdList };
