// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ################################################################
// BotCmdTs.js (ts)
// ################################################################

import { checkHasModRoleFromMsg } from "../controllers/discord/guildInfo.js";
import { getCachedConfigJson } from "../controllers/i42Common.js";
import { Message } from "discord.js";

const { selfHosted } = getCachedConfigJson();
const { extraLogs } = selfHosted;

// ...........................................................................
export default class BotCmdTs {
	public msg?: Message;
	public guildId?: string;
	public prefix: string;
	public cmdLower: string;
	public cmdLowerNoPrefix: string;
	public envPrefix: string;
	public contentArr: Array<string>;
	public extraLogs: boolean;

	constructor(_msg: Message, _cmdLower: string, _contentArr: Array<string>, _prefix: string) {
		// The Discord message obj.
		this.msg = _msg;
		this.guildId = _msg?.guild?.id;
		this.prefix = _prefix;
		this.cmdLower = _cmdLower; // Command without prefix, eg: `ping`
		this.cmdLowerNoPrefix = _cmdLower; // Same as cmdLower since prefix is already removed
		this.envPrefix = ""; // Empty string
		this.contentArr = _contentArr; // The command[] split by spaces; minus the sliced command
		this.extraLogs = extraLogs || false; // Does botSettings.json prefs ask for +logs?
	}

	// Prints the cmd, if botSettings.prefs.extraLogs
	protected printExtraLogs(): void {
		if (this.extraLogs) {
			console.log(`[BotCmd] Handling cmd '${this.cmdLower}'`);
		}
	}

	// eg: someCmd2 (x==2) may be useful for different stages
	// so multiple instances don't spam commands.
	protected cmdEndsWithX(_num: number, _cmdLower: string): boolean {
		const lastCmdChar = _cmdLower[_cmdLower.length - 1];
		return Number(lastCmdChar) === _num;
	}

	// Authed?
	protected checkAuthed(): boolean {
		const showMsgOnFail = true;
		return checkHasModRoleFromMsg(this.msg, showMsgOnFail);
	}
}
