// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// PlatformsApiConfig.ts

export interface EmotesApiConfig {
	accessDeniedEmote: string;
	failEmote: string;
	aliasEmote: string;
	kbEmote: string;
	keyEmote: string;
	outOfKeysEmote: string;
	gameCtrlEmote: string;
	lockEmote: string;
	incomingDataEmote: string;
	outgoingDataEmote: string;
	rightArrowEmote: string;
	successEmote: string;
	thinkingEmote: string;
	warnEmote: string;
	numberEmoteArr: string[];
	waitEmote: string;
}

export interface DiscordApiConfig {
	guildId: string;
	modChatChannelId: string;
	modBotSpamChannelIds: string[];
	modLogsChannelId: string;
	authedModRoleId: string;
	verifiedEndUserRoleId: string;
	emotes: EmotesApiConfig;
}

export default interface PlatformsApiConfig {
	discord: DiscordApiConfig;
}
