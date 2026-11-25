// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// DiscordTokenRequest.ts

/*
 * Access Token Response | https://discord.com/developers/docs/topics/oauth2
 */
interface DiscordTokenRequest {
	/**
	 * @description The authorization code received from the OAuth2 flow.
	 * @optional
	 */
	code?: string;

	/**
	 * @description The scope(s) of the requested token.
	 */
	scope: string[] | string;

	/**
	 * @description The client ID of the Discord application.
	 * @optional
	 */
	clientId?: string;

	/**
	 * @description The type of grant being requested: authorization_code or refresh_token.
	 */
	grantType: "authorization_code" | "refresh_token";

	/**
	 * @description The redirect URI used in the OAuth2 flow.
	 * @optional
	 */
	redirectUri?: string;

	/**
	 * @description The refresh token used to request a new access token.
	 * @optional
	 */
	refreshToken?: string;

	/**
	 * @description The client secret of the Discord application.
	 * @optional
	 */
	clientSecret?: string;
}

export default DiscordTokenRequest;
