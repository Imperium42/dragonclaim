// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ApiConfig.ts

export interface DisplayGiveawayApiConfig {
	allowDupeEmbeds: boolean;
	allowInitGiveawayToShowEvenNoKeys: boolean;
}

export interface VerificationApiConfig {
	trustIfSteamOffline: boolean;
	allowMultiKeyClaimsAsWhitelistedMod: boolean;
}

export default interface PrefsApiConfig {
	resumeLiveGiveawaysOnReady: boolean;
	skipBlacklistIfMod: boolean;
	cmdPrefix: string;
	displayGiveaway: DisplayGiveawayApiConfig;
	verification: VerificationApiConfig;
}
