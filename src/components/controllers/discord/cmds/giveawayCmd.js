// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// giveawayCmd.js
// * Replies with a list of giveaway commands.
// #############################################################################################################
import { getCachedConfigJson } from "../../i42Common.js";
import { EmbedBuilder } from "discord.js";

const { hexColors, locale } = getCachedConfigJson();
const { blueHexStr } = hexColors;

getCachedConfigJson();

const { generalIconUrls } = locale;
const { keyIcon128Url } = generalIconUrls;

// ...........................................................................................
// Handles the command async
// -> returns undefined
const cmdAction = async (_botCmd) => {
	// Init
	_botCmd.printExtraLogs();

	if (!_botCmd.checkAuthed()) return; // Fail msg within

	await prepShowGiveawayCmdsEmbed(_botCmd);
};

// ...........................................................................................
const prepShowGiveawayCmdsEmbed = (_botCmd) => {
	const giveawayCmdsArr = [
		`${_botCmd.prefix}setupgiveaway`,
		`${_botCmd.prefix}displaygiveaway`,
		`${_botCmd.prefix}endgiveaway`,
	];

	const giveawayCmdsSplit = giveawayCmdsArr.join("\n");
	return showGiveawayCmdsEmbed(_botCmd, giveawayCmdsSplit);
};

// ...........................................................................................
const showGiveawayCmdsEmbed = async (_botCmd, _giveawayCmdsSplit) => {
	const embed = new EmbedBuilder()
		.setTitle("**Giveaway Commands**")
		.setDescription(_giveawayCmdsSplit)
		.setColor(blueHexStr)
		.setThumbnail(keyIcon128Url);
	// .setTimestamp()
	// .setFooter('.giveaway')
	// Embeds must be wrapped
	const contentWrapper = { content: "", embeds: [embed] };
	return await _botCmd.msg.reply(contentWrapper);
};

export default cmdAction;
