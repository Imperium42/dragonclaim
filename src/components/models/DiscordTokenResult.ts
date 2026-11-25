// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// DiscordTokenResult.ts
// https://discord.com/developers/docs/topics/oauth2
interface DiscordTokenResult {
	/**
	 * @description The access token used for making requests to the Discord API on behalf of the user.
	 */
	access_token: string;

	/**
	 * @description The type of the access token, typically "Bearer".
	 */
	token_type: string;

	/**
	 * @description The number of seconds until the access token expires.
	 */
	expires_in: number;

	/**
	 * @description The refresh token used for refreshing the access token when it expires.
	 */
	refresh_token: string;

	/**
	 * @description The scope(s) for which the access token was granted.
	 */
	scope: string;
}

export default DiscordTokenResult;
