// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ######################################################
// guildInfo.ts
//
// For user info unrelated to guild (eg: Auth tokens),
// get from DiscordMain
// ######################################################
import { Collection, Guild, GuildMember, Message, Role, Snowflake, TextChannel } from "discord.js";
import { client } from "./discordClient.js";
import { getCachedConfigJson } from "../i42Common.js";
import "../../services/http.js";

const config = getCachedConfigJson();
const discordKeys = config.platforms.discord;
const { guildId, modBotSpamChannelIds, authedModRoleId } = discordKeys;

const emoteKeys = discordKeys.emotes;
const {
	accessDeniedEmote,
	failEmote, // kbEmote,
	// aliasEmote,
	// outgoingDataEmote,
	// keyEmote,
	// numberEmoteArr,
} = emoteKeys;

const localeObj = config.locale;
const { modBotSpamChannelNotWhitelistedStr } = localeObj;

// ...........................................................................................
// If _msg is included, we'll reply invalid channel msg
// -> Returns the Discord channel on success
const getChannelById = (_channelId: string, _msg: Message): TextChannel => {
	const channel = getMyGuild().channels.cache.get(_channelId) as TextChannel;

	if (!channel && _msg) {
		_msg.reply(` ${failEmote} Invalid channel (\`${_channelId}\`)`);
	}

	return channel;
};

// ...........................................................................................
const getMyGuild = (): Guild => client.guilds.cache.get(guildId) as Guild;

// ...........................................................................................
// Checks vs botSettings for modBotSpamChannelIds[0].
// -> returns mainModBotSpamChannelSnowflake
const getMyMainModBotSpamChannel = (): TextChannel =>
	getMyGuild().channels.cache.get(modBotSpamChannelIds[0]) as TextChannel;

// ...........................................................................................
// ...........................................................................................
// Checks vs botSettings if channel exists in modBotSpamChannelIds
// If _msg is included, we'll reply with modBotSpamChannelNotWhitelistedStr
// -> returns isModBotSpamChannelId
const checkIsModBotSpamChannelId = (_msg: Message): boolean => {
	const modBotSpamChannel = getMyGuild().channels.cache.get(
		modBotSpamChannelIds[0],
	) as TextChannel;
	const isModBotSpamChannel = !!modBotSpamChannel;

	if (!isModBotSpamChannel && _msg) {
		_msg.reply(` ${failEmote} ${modBotSpamChannelNotWhitelistedStr}`);
	}

	return isModBotSpamChannel;
};

// ...........................................................................................
// -> returns: Collection<Snowflake, Role>
const getRolesFromMsg = (_msg: Message): Collection<Snowflake, Role> | undefined => {
	if (!_msg) {
		throw new Error("[guildInfo]**ERR @ getRolesFromMsg: !_msg");
	}

	// To call a role, use "<@&{roleId}>"
	return _msg.member?.roles?.cache;
};

// ...........................................................................................
// -> returns: Collection<Snowflake, Role>
const getRolesFromMember = (_member: GuildMember): Collection<Snowflake, Role> => {
	// To call a role, use "<@&{roleId}>"
	return _member.roles.cache;
};

// ...........................................................................................
// Checks vs botSettings authedRoleId
// Elements look like [ "<@&123>" ]
const checkHasModRoleFromRoleArr = (_roleArr: string[]): boolean =>
	_roleArr.includes(authedModRoleId);

// ...........................................................................................
// Checks vs config authedRoleId. TODO: Exception for bot role/id?
const checkHasModRoleFromMsg = (_msg: Message | undefined, _sendMsgOnFail: boolean): boolean => {
	if (!_msg) {
		throw new Error("[guildInfo]**ERR @ checkHasModRoleFromMsg: !_msg");
	}

	const rolesCol = getRolesFromMsg(_msg);
	const hasRole = rolesCol?.some((role) => role.id === authedModRoleId) ?? false;

	if (!hasRole && _sendMsgOnFail) {
		_msg.reply(` ${accessDeniedEmote} Unauthorized attempt logged.`);
	}

	return hasRole;
};

// ...........................................................................................
// => returns guildMember
const getMyGuildMemberById = async (_discordId: string): Promise<GuildMember> => {
	const tempMembers = getMyGuild().members;
	let member = tempMembers.cache.get(_discordId);

	if (!member) {
		member = await tempMembers.fetch(_discordId);
	}

	return member;
};

// ...........................................................................................
// Checks vs botSettings authedRoleId
const checkHasModRoleFromDiscordId = async (_discordId: string): Promise<boolean> => {
	const member = await getMyGuildMemberById(_discordId);
	const memberRoles = member.roles.cache;
	const hasRole = memberRoles.some((role) => role.id === authedModRoleId);

	return hasRole;
};

// ...........................................................................................
// Checks vs botSettings authedRoleId
// -> returns hasRole
const checkHasModRoleFromMember = (_member: GuildMember): boolean => {
	const rolesCol = getRolesFromMember(_member);
	return rolesCol.some((role) => role.id === authedModRoleId);
};

// // ........................................................................................
// // Sends a DM to a guild member.
// // Must look like this: https://i.imgur.com/vOFmhSw.png
// //
// // => Returns dmMsg
// const dmMemberViaId = async (
// 	_discordId: string,
// 	_contentWrapper: MessagePayload | EmbedBuilder): Promise<any> => {
// 	console.log('[discordClient] @ dmMemberViaId');
//
// 	// const user = await getUserById(_discordId);
// 	const member = await getMyGuildMemberById(_discordId);
// 	const memberDM = await member.createDM();
//
// 	if (!memberDM) {
// 		throw ('User not found within the guild: Try again or a tell a dev!');
// 	}
//
// 	// _contentWrapper = { embeds, content }
// 	return await memberDM.send(_contentWrapper);
// };

// ...........................................................................................
export {
	authedModRoleId,
	guildId,
	modBotSpamChannelIds,
	checkIsModBotSpamChannelId,
	checkHasModRoleFromMsg,
	checkHasModRoleFromRoleArr,
	getMyMainModBotSpamChannel,
	getChannelById,
	checkHasModRoleFromMember,
	checkHasModRoleFromDiscordId,
	getMyGuildMemberById,
	getMyGuild,
	// dmMemberViaId,
};
