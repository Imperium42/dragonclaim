// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// LocaleApiConfig.ts
export interface GeneralIconUrlsApiConfig {
	companyIcon256Url: string;
	steamIcon512Url: string;
	keyIcon128Url: string;
}

export interface GiveawayConcludedApiConfig {
	giveawayConcludedTitleStr: string;
	giveawayConcludedDescrStr: string;
	giveawayConcludedEmbedColorHexStr: string;
	giveawayConcludedComeBackSoonImgUrl: string;
	eventNotFoundErrStr: string;
}

export interface Dm500ErrsApiConfig {
	dmErrServer: string;
	dmErrTryAgain: string;
	dmErrSomethingWentWrong: string;
	dmErrQuestions: string;
	dmErrInternalSteamBlacklistMsg: string;
	dmErrInternalAllKeysClaimedReasonStr: string;
	dmErrAllKeysClaimedStr: string;
	dmErrAlreadyOwnStr: string;
	dmErrSteamNotLinked: string;
	dmErrUnsuccessfulClaim: string;
	dmErr1PossiblyExpiredLinkNoState: string;
	dmErr2PossiblyExpiredLinkWithState: string;
}

export interface DmPlayerKeyStrObjApiConfig {
	dmActivateThisKeyOnSteamStr: string;
	dmAllVerifiedStr: string;
}

export interface DmAuthSuccessApiConfig {
	dmSuccessContentHeresYourKey: string;
	dmSuccessHtmlStr: string;
	dmAuthSuccessTitleStr: string;
	dmAuthSuccessDescrStr: string;
	dmAuthSuccessDesktopPrimaryHeaderStr: string;
	dmAuthSuccessMobileOptionalHeaderStr: string;
	dmAuthSuccessDesktopPrimaryStr: string;
	dmAuthSuccessMobileOptionalStr: string;
	dmAuthSuccessThumbImgUrl: string;
	dmAuthSuccessFooterStr: string;
	dmPlayerKeyStrObj: DmPlayerKeyStrObjApiConfig;
}

export interface DmAuthExpiredApiConfig {
	dmAuthExpiredTitleStr: string;
	dmAuthExpiredDescrStr: string;
	dmAuthExpiredColor: string;
	dmAuthExpiredThumbImgUrl: string;
}

export interface DisplayGiveawayDMApiConfig {
	dmAuthTitleStr: string;
	dmAuthDescrStr: string;
	dmAuthThumbImgUrl: string;
	dmAuthFooterStr: string;
	dmAuthFooterImgUrl: string;
	dm500Errs: Dm500ErrsApiConfig;
	dmAuthSuccess: DmAuthSuccessApiConfig;
	dmAuthExpired: DmAuthExpiredApiConfig;
}

export interface DisplayGiveawayEmbedAuthorApiConfig {
	name: string;
	imgIconUrl: string;
	clickUrl: string;
}

export interface DisplayGiveawayEmbedFooterApiConfig {
	footerStr: string;
	footerImgIconUrl: string;
}

export interface DisplayGiveawayEmbedApiConfig {
	displayGiveawayEmbedTitle: string;
	displayGiveawayEmbedAuthor: DisplayGiveawayEmbedAuthorApiConfig;
	displayGiveawayEmbedThumbnailUrl: string;
	displayGiveawayEmbedDescr: string;
	displayGiveawayEmbedRulesArr: string[];
	displayGiveawayEmbedInstructionsArr: string[];
	displayGiveawayEmbedFooter: DisplayGiveawayEmbedFooterApiConfig;
}

export default interface LocaleApiConfig {
	modBotSpamChannelNotWhitelistedStr: string;
	generalIconUrls: GeneralIconUrlsApiConfig;
	giveawayConcluded: GiveawayConcludedApiConfig;
	giveawayGeneralErrHtmlStr: string;
	giveawayGeneralErrDMStr: string;
	displayGiveawayDM: DisplayGiveawayDMApiConfig;
	displayGiveawayEmbed: DisplayGiveawayEmbedApiConfig;
	unauthorized: string;
	cmds: undefined;
}
