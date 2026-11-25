// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// dmReplyCmd.js
// #############################################################################################################
import { getChannelById } from "../guildInfo.js";
import { getCachedConfigJson } from "../../i42Common.js";
import { EmbedBuilder as MessageEmbed } from "discord.js";

const { selfHosted } = getCachedConfigJson();
const { logBotReplies } = selfHosted;

const { modLogsChannelId } = getCachedConfigJson().platforms.discord;

let LogsChannel;

// ...........................................................................................
// Handles the command async
// -> returns undefined
const cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	// if (!_botCmd.checkAuthed()) {
	// 	return; // Fail msg within
	// }

	await prepReplyToDm(_botCmd);
};

// ...........................................................................................
const prepReplyToDm = async (_botCmd) => {
	// console.log('[dmReply] @ replyToDmAsync // content==' + content);
	const isLive = true;
	if (!isLive) {
		// logIfInitd(`[BETA] channelId==${msg.channel.id}`, msg);
		return;
	}

	// -----------------
	if (logBotReplies) {
		await logIfInitd(_botCmd.content, _botCmd.msg);
	} // Async => Don't wait

	await replyToDM(_botCmd.content, _botCmd.msg); // Async =>
};

// ...........................................................................................
const replyToDM = async (_content, _msg) => {
	console.log(`[dmReply] @ replyToDM // content==${_content}`);
	const contentLower = _content.toLowerCase();

	console.log(`[dmReply] @ replyToDM: contentLower==${contentLower}`);
	switch (contentLower.trim()) {
		case "thx":
		case "thanks":
		case "thank you":
		case "🙂":
		case "👍":
			_msg.reply("🙂");
			break;
	}
};

// ...........................................................................................
const getSetAuthorOpts = (_name, _url, _iconURL, _proxyIconURL) => {
	return {
		name: _name,
		url: _url,
		iconURL: _iconURL,
		proxyIconURL: _proxyIconURL,
	};
};

// ...........................................................................................
const generateLogEmbed = (_content, _msg) => {
	const { author } = _msg;
	// const discordId = author.id;
	const name = `${author.username}#${author.discriminator}`;
	const avatarURL = author.avatarURL(); // TODO: In the new AuthorOpts, is this iconURL || proxyIconURL?
	const url = null;
	const proxyIconURL = null;
	const setAuthorOpts = getSetAuthorOpts(name, url, proxyIconURL, avatarURL);

	// ---------
	// const footerOpts = {
	// 	'text': null,
	// 	'iconURL': null,
	// };

	return new MessageEmbed()
		.setColor("#0099ff")
		.setAuthor(setAuthorOpts)
		.setDescription(`️️"${_content}"`) // 3️⃣
		.setTimestamp();
	// .setFooter(footerOpts);
};

// ...........................................................................................
const logIfInitd = async (_content, _msg) => {
	// Log, but only if init
	try {
		// Validate initd
		if (!LogsChannel) {
			LogsChannel = getChannelById(modLogsChannelId);
		}

		if (LogsChannel) {
			const embed = generateLogEmbed(_content, _msg);
			console.log(`[dmReply] embed==${embed}`);

			const contentWrapper = { content: "", embeds: [embed] };
			LogsChannel.send(contentWrapper);
		}
	} catch {
		// Likely !init yet
	}
};

// ===========================================================================================================
export default cmdAction;
