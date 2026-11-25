// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// components/services/discordOAuth2.ts
// https://discord.com/developers/docs/topics/oauth2
// discord-oauth2 | https://www.npmjs.com/package/discord-oauth2
import { getCachedConfigJson, generateUuid } from "../controllers/i42Common.js";
import { setRedisObj } from "./redis.js";
import { portalOAuthStateKey } from "./redisKeys.js";
import DiscordOAuth2Lib from "discord-oauth2";
import DiscordTokenRequest from "../models/DiscordTokenRequest.js";
import DiscordTokenResult from "../models/DiscordTokenResult.js";
import DiscordOAuthSrc from "../models/DiscordOAuthSrc.js";

const discordOAuth2Helper = new DiscordOAuth2Lib();
const { selfHosted } = getCachedConfigJson();

const {
	discordBot: discordBotConfig,
	// redis,
} = selfHosted;

const { giveawayRedirectUri, portalRedirectUri, clientSecret } = discordBotConfig;

const baseUri = "https://discord.com/oauth2";

// .............................................................................
const genEncodedOAuth2RequestUrl = (_redirUri: string, _scope: string, _state: string): string => {
	const rawUri: string =
		`${baseUri}/authorize` +
		`?client_id=${discordBotConfig.clientId}` +
		`&redirect_uri=${_redirUri}` +
		"&response_type=code" +
		`&scope=${_scope}` +
		`&state=${_state}`;

	const encoded: string = encodeURI(rawUri);
	return encoded;
};

// .............................................................................
/**
 * For GET.
 * @param _state UUID (Security) to verify @ callback. Could optionally CSV +arbitrary data.
 * @returns something like: https://discord.com/oauth2/authorize?client_id=771627575562862624&redirect_uri=http://localhost:5554/discord/v1/portal/authed&response_type=code&scope=connections&state=cf43ed3d-e513-4edf-b383-46ed8e75782
 */
// Login-CSRF guard: /auth stores the OAuth `state` in this cookie; /authed requires the
// query `state` to match it, proving the callback belongs to the browser that started the login.
const PORTAL_STATE_COOKIE = "dc_portal_oauth_state";
const PORTAL_STATE_TTL_SECS = 60 * 5;

// Thrown when the OAuth state can't be persisted (Redis down): callers should answer 503
class OAuthStateUnavailableError extends Error {
	constructor() {
		super("OAuth state store (Redis) unavailable");
		this.name = "OAuthStateUnavailableError";
	}
}

const genPortalOAuth2Url = async (_state = ""): Promise<{ uri: string; state: string }> => {
	if (!_state) {
		_state = generateUuid(); // Basic state - no nested args.
	}

	const scope = "identify guilds"; // Separate by space
	const encodedUri: string = genEncodedOAuth2RequestUrl(portalRedirectUri, scope, _state);

	// ---------------
	// Update redis - we'll later make sure the state exists then delete it.
	const flatRedisObj = JSON.stringify({
		src: "genPortalOAuth2Url",
	});

	const stateExpiryInSecs = PORTAL_STATE_TTL_SECS; // unauthenticated route, so it must expire
	const isStateSaved = await setRedisObj(
		portalOAuthStateKey(_state),
		flatRedisObj,
		stateExpiryInSecs,
	); // <state, {src}:str>
	if (!isStateSaved) {
		// Without a stored state the Discord callback would be rejected, so don't send the user off
		throw new OAuthStateUnavailableError();
	}

	// ---------------
	// Encode + log + return
	// console.log(`[discordOAuth2] uri (encoded)==${rawUri}`);
	return { uri: encodedUri, state: _state };
};

// .............................................................................
/**
 * @param _state UUID (Security) to verify @ callback. Could optionally CSV +arbitrary data.
 * @returns something like: https://discord.com/oauth2/authorize?client_id=771627575562862624&redirect_uri=http://localhost:5554/discord/giveaway/authed&response_type=code&scope=connections&state=cf43ed3d-e513-4edf-b383-46ed8e757820
 */
const genGiveawayOAuth2Url = (_state = ""): string => {
	console.log(`[discordOAuth2] genGiveawayOAuth2Url`);

	if (!_state) throw new Error("!state");

	const scope = "connections"; // Separate by space
	const encodedUri: string = genEncodedOAuth2RequestUrl(giveawayRedirectUri, scope, _state);

	return encodedUri;
};

// .............................................................................
// for POST.

const genGetTokenRequestParamsObj = (code: string, src: DiscordOAuthSrc): DiscordTokenRequest => {
	let redirUri;

	if (src === DiscordOAuthSrc.Giveaway) {
		redirUri = discordBotConfig.giveawayRedirectUri;
	} else if (src === DiscordOAuthSrc.Portal) {
		redirUri = discordBotConfig.portalRedirectUri;
	} else {
		throw new Error(`[discordOAuth2]**ERR @ genGetTokenParamsObj: Unexpected src==${src}`);
	}

	const paramsObj: DiscordTokenRequest = {
		clientId: discordBotConfig.clientId,
		clientSecret: clientSecret,
		scope: "connections",
		redirectUri: redirUri,
		grantType: "authorization_code",
		code: code,
	};

	return paramsObj;
};

// .............................................................................
const exchangeCodeForToken = async (
	code: string,
	src: DiscordOAuthSrc,
): Promise<DiscordTokenResult> => {
	const paramsObj: DiscordTokenRequest = genGetTokenRequestParamsObj(code, src);
	const tokenObj: DiscordTokenResult = await discordOAuth2Helper.tokenRequest(paramsObj);

	return tokenObj;
};

export {
	genGiveawayOAuth2Url,
	genPortalOAuth2Url,
	PORTAL_STATE_COOKIE,
	PORTAL_STATE_TTL_SECS,
	OAuthStateUnavailableError,
	// genGetTokenParamsObj,
	exchangeCodeForToken,
};
