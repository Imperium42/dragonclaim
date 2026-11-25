// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// say.js
// cmd: `announce` - Make the bot speak to a channel
// #############################################################################################################

import { getChannelById } from "../guildInfo.js";
import { normalizeChannelToIdStr, validateExists } from "../discordUtils.js";
import { getCachedConfigJson } from "../../i42Common.js";

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
// => returns null
const cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) {
		return; // Fail msg within
	}

	await prepAnnounceMsg(_botCmd);
};

// ...........................................................................................
// => returns undefined
const prepAnnounceMsg = async (_botCmd) => {
	// Get args
	const arg1Channel = _botCmd.contentArr.shift();
	const arg2AnnounceMsg = _botCmd.contentArr.join(" "); // The rest

	// Normalize
	const channelIdStr = normalizeChannelToIdStr(arg1Channel); // number str

	// Validate args
	const isValid = validateExists(arg1Channel, arg2AnnounceMsg, channelIdStr);
	if (!isValid) {
		sendMissingArgsReply(_botCmd.msg);
		return;
	}

	// Valid Discord channel?
	const discordChannel = getChannelById(channelIdStr, _botCmd.msg); // Sends msg on fail
	if (!discordChannel) {
		return;
	}

	// ----------------
	// Ready!
	const doneMsgMgr = await announceMsg(discordChannel, arg2AnnounceMsg);

	// If !err, reply with success msg
	if (doneMsgMgr) {
		_botCmd.msg.reply(` ${successEmote} Announced to ${discordChannel}`);
	}
};

// ...........................................................................................
// Send message to a channel from bot
// => returns msgMgr response
const announceMsg = async (_discordChannel, _announceMsg) => {
	try {
		const contentWrapper = { content: _announceMsg, embeds: [] };
		return await _discordChannel.send(contentWrapper);
	} catch (e) {
		console.log(`[announceCmd] @ announceMsg: ${e}`);
	}
};

// ...........................................................................................
// => returns msgMgr
const sendMissingArgsReply = async (_msg) => {
	const missingArgs = "`.announce` `{channel}` `{msg}`";
	const descrStr = `${kbEmote} Authorized mods may announce a message (from this bot) to a specific channel.`;
	// const aliasesSuffixStr = `${aliasEmote} Aliases: None`;

	return await _msg.reply(` ${accessDeniedEmote} Missing args:\n\n${missingArgs}\n\n${descrStr}`);
};

export default cmdAction;
