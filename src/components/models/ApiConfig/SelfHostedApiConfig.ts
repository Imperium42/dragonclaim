// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// SelfHostedApiConfig.ts

export interface TimersApiConfig {
	pollingCooldownSecs: number;
	pollingMs: number;
}

export interface ServerApiConfig {
	ip: string;
	port: string;
}

export interface LocalServers {
	dev: ServerApiConfig;
	live: ServerApiConfig;
}

export interface MongoDBApiConfig {
	dbName: string;
	uri: string;
}

export interface RedisApiConfig {
	uri: string;
}

export interface DiscordBotApiConfig {
	clientId: string;
	clientSecret: string;
	token: string;
	richPresenceStatus: string;
	giveawayRedirectUri: string;
	portalRedirectUri: string;
	tls?: {
		privKeyPemPath: string;
		fullChainPemPath: string;
	};
}

export interface TlsApiConfig {
	privKeyPemPath: string;
	fullChainPemPath: string;
}

export default interface SelfHostedApiConfig {
	portalCorsWhitelist: string[];
	isSelfHosted: boolean;
	portalSecretKey: string;
	authedRedirectUri: string;
	logBotReplies: boolean;
	showJsonInReply: boolean;
	extraLogs: boolean;
	printThisJsonOnInit: boolean;
	printThisYamlOnInit: boolean;
	logReactions: boolean;
	timers: TimersApiConfig;
	localServers: LocalServers;
	mongodb: MongoDBApiConfig;
	redis: RedisApiConfig;
	discordBot: DiscordBotApiConfig;
	tls: TlsApiConfig;
}
