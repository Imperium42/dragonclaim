// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// https://discordjs.guide/creating-your-bot/slash-commands.html#before-you-continue
// https://discord.js.org/#/docs/builders/main/class/SlashCommandBuilder
import { SlashCommandBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
	async execute(interaction) {
		await interaction.reply("Pong!");
	},
};
