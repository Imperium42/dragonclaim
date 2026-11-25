// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ###########################################################
// discordMain.js
// ###########################################################

// const discordUtils = require('./discordUtils');
import { Events } from "discord.js";
import { commandHandler } from "./discordCmds.js";
import checkResumeGiveawayIfLive from "./resumeGiveaway.js";
import "./guildInfo.js";
import { client } from "./discordClient.js";
import { getCachedConfigJson } from "../i42Common.js";
import slashCmdPing from "./cmds/slashPing.js";

let rdy = false;

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
const discordConfig = getCachedConfigJson().platforms.discord;
const configGuildId = discordConfig.guildId;

const { selfHosted, prefs } = getCachedConfigJson();
const discordBotConfig = selfHosted.discordBot;
const { richPresenceStatus } = discordBotConfig;

const { resumeLiveGiveawaysOnReady, cmdPrefix } = prefs;

// ####################################################################################################
// Funcs
// ####################################################################################################

// ...........................................................................................
// => returns undefined
const login = async () => {
	try {
		await client.isReady();
		await client.login(discordBotConfig.token);
	} catch (e) {
		console.error(`[discordMain]**ERR @ login: ${e}`);
	}
};

// ...........................................................................................
// https://discord.js.org/#/docs/discord.js/main/typedef/Events
const initEventWatchers = () => {
	onReady();
	onError();
	onDisconnect();
	onMessageCreate();
	onInteractionCreate();
	console.log("[discordMain] Initd Event Watchers");
};

// ...........................................................................................
// Example | https://github.com/stuyy/djs-v14-tutorial/blob/master/src/index.js
// Doc | https://discordjs.guide/slash-commands/response-methods.html#ephemeral-responses
const onInteractionCreate = () => {
	client.on(Events.InteractionCreate, async (interaction) => {
		console.log("[discordMain] @ onIntercationCreate.onInteractionCreate");

		if (!interaction.isChatInputCommand()) return;

		if (interaction.commandName === "ping") {
			await slashCmdPing.execute(interaction);
		}
	});

	// client.on(Events.InteractionCreate, async interaction => {
	// 	console.log('[discordMain] @ onInteractionCreate');
	//
	// 	if (interaction.isChatInputCommand()) {
	// 		// console.log('[discordMain @ onInteractionCreate] Chat Command');
	// 		if (interaction.commandName === 'dragontest') {
	// 			const actionRowComponent = new ActionRowBuilder().setComponents(
	// 				new SelectMenuBuilder().setCustomId('food_options').setOptions([
	// 					{ label: 'Cake', value: 'cake' },
	// 					{ label: 'Pizza', value: 'pizza' },
	// 					{ label: 'Sushi', value: 'sushi' },
	// 				]),
	// 			);
	//
	// 			const actionRowDrinkMenu = new ActionRowBuilder().setComponents(
	// 				new SelectMenuBuilder().setCustomId('drink_options').setOptions([
	// 					{ label: 'Orange Juice', value: 'orange_juice' },
	// 					{ label: 'Coca-Cola', value: 'coca_cola' },
	// 				]),
	// 			);
	//
	// 			interaction.reply({
	// 				components: [actionRowComponent.toJSON(), actionRowDrinkMenu.toJSON()],
	// 			});
	// 		}
	// 		// else if (interaction.commandName === 'register') {
	// 		// 	const modal = new ModalBuilder()
	// 		// 		.setTitle('Register User Form')
	// 		// 		.setCustomId('registerUserModal')
	// 		// 		.setComponents(
	// 		// 			new ActionRowBuilder().setComponents(
	// 		// 				new TextInputBuilder()
	// 		// 					.setLabel('username')
	// 		// 					.setCustomId('username')
	// 		// 					.setStyle(TextInputStyle.Short)
	// 		// 			),
	// 		// 			new ActionRowBuilder().setComponents(
	// 		// 				new TextInputBuilder()
	// 		// 					.setLabel('email')
	// 		// 					.setCustomId('email')
	// 		// 					.setStyle(TextInputStyle.Short)
	// 		// 			),
	// 		// 			new ActionRowBuilder().setComponents(
	// 		// 				new TextInputBuilder()
	// 		// 					.setLabel('comment')
	// 		// 					.setCustomId('comment')
	// 		// 					.setStyle(TextInputStyle.Paragraph)
	// 		// 			)
	// 		// 		);
	// 		//
	// 		// 	interaction.showModal(modal);
	// 		// }
	// 	}
	// 	else if (interaction.isSelectMenu()) {
	// 		console.log('Select Menu');
	// 		if (interaction.customId === 'food_options') {
	// 			console.log(interaction.component);
	// 		}
	// 		else if (interaction.customId === 'drink_options') {
	// 			// TODO?
	// 		}
	// 	}
	// 	else if (interaction.type === InteractionType.ModalSubmit) {
	// 		console.log('Modal Submitted...');
	// 		if (interaction.customId === 'registerUserModal') {
	// 			console.log(interaction.fields.getTextInputValue('username'));
	// 			interaction.reply({
	// 				content: 'You successfully submitted your details!',
	// 			});
	// 		}
	// 	}
	// });
};

// ...........................................................................................
const onReady = () => {
	client.once("ready", () => {
		console.info("------------------------");
		console.info("[discordMain] @ onReady");

		setBotPresence();
		registerSlashCmds();

		if (resumeLiveGiveawaysOnReady) {
			checkResumeGiveawayIfLive();
		}

		rdy = true;
	});
};

// ...........................................................................................
const onError = () => {
	client.on("error", (err) => console.error(err));
};

// ...........................................................................................
const onDisconnect = () => {
	rdy = false;
	client.once("disconnect", async (_event) => {
		console.info("[discordMain] @ onDisconnect");
		rdy = false;

		if (_event.code === 1000) {
			console.warn(`[discordMain] Disconnected (gracefully)! event.code: ${_event.code}`);
			// Restart if disconnect code is 1000 (gracefully exited) because it won't reconnect automatically
			client.destroy();
			await client.login(discordBotConfig.token);
		} else {
			console.error(`[discordMain] Disconnected with WS error code ${_event.code}, Logged!`);

			// Stop on other critical errors
			// process.exit(0);
		}
	});
};

// ...........................................................................................
const onMessageCreate = () => {
	client.on("messageCreate", (_msg) => {
		// console.info('[discordMain] @ onMessageCreate');

		// Exit if author is a bot
		if (_msg.author.bot) {
			return;
		}

		commandHandler(_msg, cmdPrefix);
	});
};

// ...........................................................................................
const setBotPresence = () => {
	try {
		// Basic presence >>
		client.user.setActivity(richPresenceStatus);

		// TODO: Rich presence >>
		// const presence = {
		// 	activities: [{
		// 		name: 'Dragonclaim.com',
		// 		url: 'https://www.imperium42.com',
		// 		type: ActivityType.Watching,
		// 	}],
		// 	status: 'Test Status',
		// };
		// client.user.setPresence(presence);

		rdy = true;
		console.log(`[discordMain] @ setBotPresence: '${richPresenceStatus}'`);

		// ---------------------------------------------
		// Rich presence >>
		// client.user.setPresence({
		//     game: {
		//         name: 'discord.gg/tol',
		//         type: 0, // this is 'playing'
		//         application_id: '425605891715366912',
		//         details: 'Recordkeeping',
		//         state: 'Some state',
		//         timestamps: {
		//             start: 1506643200 // Sep 29, 2017 (launch date)
		//             // end: 253370764800000 // a random timestamp far off in the future
		//         },
		//         party: {
		//             size: [3, 50000] // format is [currentNum, maxNum], shows up as '3 of 9'
		//         },
		//         assets: {
		//             large_image: 'avatarguidelg', // asset ID of the big image
		//             large_text: 'Throne of Lies - Official BOT', // text will appear when hovering over the image
		//             small_image: 'tutoriallg', // asset ID of the small image in the bottom right corner of the big one
		//             small_text: 'Gathering Data!' // text will appear when hovering over the image
		//         }
		//     }
		// });
		// ---------------------------------------------
	} catch (e) {
		console.error(`[discordMain]**ERR @ setBotPresence: ${e}`);
	}
};

// ...........................................................................................
const registerSlashCmds = async () => {
	console.log("[discordMain] @ registerSlashCmds");

	const guild = client.guilds.cache.get(configGuildId);
	if (!guild) {
		console.error("[discordMain] registerSlashCmds: Guild not found!");
		return;
	}

	try {
		const command = await guild.commands.create(slashCmdPing.data);
		console.log(`[discordMain] Command '${command.name}' registered`);
	} catch (error) {
		console.error("[discordMain] Error registering command:", error);
	}
};

// ...........................................................................................
const checkBotOnline = (_res, _forceFail) => {
	if (!rdy || _forceFail) {
		console.error(
			"[discordMain]**ERR @ checkBotOnline: Discord is disabled/offline! Aborting.",
		);
		const err = "Discord is disabled/offline! Aborting.";
		returnFail(_res, err);
	} else {
		return true;
	} // Online/ready!
};

// .............................................................................
const deleteMsg = async (_msg, _roomName, _msgId, _res) => {
	if (!_msg.deletable) {
		return;
	}

	// console.log('[discordMain]**Attempting to delete message...');
	const threeSecs = 1000 * 3;
	const opts = {
		timeout: threeSecs,
		// "reason" : "Some reason"
	};

	try {
		await _msg.delete(opts);
		// console.log('[discordMain]**Message deleted');
		delete _msgId[_roomName];
	} catch {
		console.error("[discordMain]**ERR @ deleteMsg: Failed to delete msg");
	}
};

// ...........................................................................................
// ...........................................................................................
// Default returns err code 500
const returnFail = (_res, _error, _code) => {
	// console.log('[discord-route] @ returnFail');

	if (!_code) {
		_code = 500;
	}

	// Validate
	if (!_error) {
		_error = { err: "Unknown Error" };
	} else {
		_error = { err: _error };
	}

	// -----------------------
	_res.status(_code).send(_error);
};

// ####################################################################################################
// Main
// ####################################################################################################
const init = async () => {
	initEventWatchers();
	await login();
};

// ####################################################################################################
// Exports
// ####################################################################################################

export default init;
export { client, deleteMsg, checkBotOnline, returnFail };
