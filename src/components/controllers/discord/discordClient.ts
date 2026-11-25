// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discordClient.ts
// 2022: https://discordjs.guide/additional-info/changes-in-v14.html#before-you-start
// #############################################################################################################
import {
	Client,
	GatewayIntentBits,
	IntentsBitField,
	Snowflake,
	TextChannel,
	GuildMember,
	Message,
	User,
	Guild,
} from "discord.js";
import { GET } from "../../services/http.js";
import DiscordTokenResult from "../../models/DiscordTokenResult.js";
import DiscordUser from "../../models/DiscordUser.js"; // init @ bottom

const baseDiscordUri = "https://discord.com/api";
let client: Client;

// Type definitions

// ###############################################################################################

// ........................................................................................
const initClient = (): void => {
	const intentsArr: GatewayIntentBits[] = [
		GatewayIntentBits.DirectMessageReactions,
		// GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
		// GatewayIntentBits.GuildBans,
		// GatewayIntentBits.GuildEmojisAndStickers,
		// GatewayIntentBits.GuildIntegrations,
		// GatewayIntentBits.GuildInvites,
		// GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		// GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		// GatewayIntentBits.GuildPresences,
		// GatewayIntentBits.GuildScheduledEvents,
		// GatewayIntentBits.GuildVoiceStates,
		// GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		// GatewayIntentBits.MessageContent, // Privileged
	];

	const discordClientOpts = {
		intents: intentsArr,
	};

	client = new Client(discordClientOpts); // Login and set watchers @ discordMain
};

// ........................................................................................
// Lists the intents to console, directly from the client, to ensure flags were registered.
const listIntents = (): void => {
	// Get a list of intents string from client.
	const intentsObjParent = new IntentsBitField(client.options.intents);

	// Map intentStr csv list from serialized intents, only if element is true.
	const intentsSerializedObj = intentsObjParent.serialize();
	const intentsArr = Object.keys(intentsSerializedObj)
		.map((key) => (intentsSerializedObj[key] && isNaN(Number(key)) ? key : undefined))
		.filter(Boolean);

	console.log(`[discordClient] Registered intents==[ ${intentsArr} ]`);
};

// ........................................................................................
// NOTE: This is NOT a guild member, but a general user.
const getUserById = async (_discordId: Snowflake): Promise<User | undefined> => {
	console.log("[discordClient] @ getUserById (NOT member)");

	return client.users.cache.get(_discordId);
};

// ........................................................................................
// No need to wait - returns true instantly. Ensure member; not user.
// => returns role add res
const addRoleToMember = async (_memberObj: GuildMember, _roleId: Snowflake): Promise<boolean> => {
	try {
		console.log(`[discordClient] @ addRoleToMember: ${_memberObj}`);

		// Ensure member, not user
		if (!_memberObj) {
			throw new Error("!memberObj");
		}
		if (!_memberObj.roles) {
			throw new Error(
				"!memberObj.roles: This may be a USER " + "obj rather than a GUILD MEMBER obj",
			);
		}

		const res = await _memberObj.roles.add(_roleId);
		const isSuccess = !!res;

		return isSuccess;
	} catch (e: unknown) {
		console.log(
			`[discordClient]**ERR @ addRoleToMember: ${e instanceof Error ? e.message : String(e)}`,
		);
		throw new Error(String(e), { cause: e });
	}
};

// ........................................................................................
const getChannelMgrByChannelId = async (
	_channelId: Snowflake,
): Promise<TextChannel | undefined> => {
	console.log("[discordClient] @ getChannelMgrByChannelId");

	return client.channels.cache.get(_channelId) as TextChannel | undefined;
};

// ........................................................................................
// Returns msgMgr{}
const getMsgMgrByChannelIdAndMsgId = async (
	_channelId: Snowflake,
	_msgId: Snowflake,
): Promise<Message> => {
	try {
		console.log(
			"[discordClient] @ getMsgMgrByChannelIdAndMsgId: " +
				`_channelId==${_channelId} // _discordId==${_msgId}`,
		);

		// Validate
		if (!_channelId) {
			throw "!channelId";
		}
		if (!_msgId) {
			throw "!msgId";
		}

		const channelMgr = await getChannelMgrByChannelId(_channelId);
		if (!channelMgr) {
			throw `!channelMgr for channelId '${_channelId}'`;
		}

		const msgMgr = await channelMgr.messages.fetch(_msgId);
		return msgMgr;
	} catch (e: unknown) {
		console.log(`[discordClient]*WARN @ getMsgMgrByChannelIdAndMsgId: ${e}`);
		throw new Error(String(e), { cause: e });
	}
};

// // ........................................................................................
// // -> returns new EmbedBuilder, optionally using the old one as a template.
// const getNewMsgEmbed = (_oldEmbedToEdit: EmbedBuilder): EmbedBuilder => _oldEmbedToEdit === undefined
// 	? new EmbedBuilder()
// 	: EmbedBuilder.from(_oldEmbedToEdit);

// ...........................................................................................
/**
 * @param oAuth2Token {DiscordTokenResult} { access_token, expires_in, refresh_token, scope, token_type }
 * @returns {Promise<DiscordUser>} { id, username, discriminator, avatar, bot, system, mfa_enabled, locale, verified, email, flags, premium_type, public_flags }
 */
const getDiscordUserFromToken = async (oAuth2Token: DiscordTokenResult): Promise<DiscordUser> => {
	// Fetch from https://discord.com/api/users/@me
	const uri = `${baseDiscordUri}/users/@me`;
	const headers = {
		authorization: `${oAuth2Token.token_type} ${oAuth2Token.access_token}`,
	};
	const params = undefined;

	const res = await GET(uri, params, headers);
	if (!res.data || !res.data.id) {
		throw new Error("[guildInfo]**ERR @ getDiscordUserFromToken: !res.data.id");
	}

	return res.data;
};

// ...........................................................................................
/**
 * @param oAuth2Token {DiscordTokenResult} { access_token, expires_in, refresh_token, scope, token_type }
 * @returns {Promise<Array<Guild>>}
 */
const getDiscordUserGuildsFromToken = async (
	oAuth2Token: DiscordTokenResult,
): Promise<Array<Guild>> => {
	// Fetch from https://discord.com/api/users/@me/guilds
	const uri = `${baseDiscordUri}/users/@me/guilds`;
	const headers = {
		authorization: `${oAuth2Token.token_type} ${oAuth2Token.access_token}`,
	};
	const params = undefined;

	const res = await GET(uri, params, headers);
	if (!res.data || !Array.isArray(res.data)) {
		throw new Error(
			"[guildInfo]**ERR @ getDiscordUserGuildsFromToken: !res.data or not an array",
		);
	}

	return res.data;
};

// ...........................................................................................
// Get array of guilds by discordId from discord.js v14 - only shows guilds shared with bot.
// For ALL guilds, we must use the OAuth2 token and call getDiscordUserGuildsFromToken() instead.
const getBotAndUserMutualGuildsByDiscordId = async (discordId: Snowflake): Promise<Guild[]> => {
	console.log("[discordClient] @ getGuildsByDiscordId");

	const userGuilds: Guild[] = [];
	client.guilds.cache.each((guild) => {
		if (guild.members.cache.has(discordId)) {
			userGuilds.push(guild);
		}
	});

	return userGuilds;
};

// ###############################################################################################
initClient();
listIntents(); // TEST

// ###############################################################################################
export {
	client,
	addRoleToMember,
	getUserById,
	getMsgMgrByChannelIdAndMsgId,
	getChannelMgrByChannelId,
	getDiscordUserFromToken,
	getDiscordUserGuildsFromToken,
	getBotAndUserMutualGuildsByDiscordId,
};
