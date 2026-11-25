// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// components/controllers/discord/discordPortalAuthed.ts
//
// - After we auth via a Discord OAuth2 URI, we get redirected back here.
// - We'll save the info in redis - temporarily - and then redirect to the portal.
// - Since this contains sensitive info, we can't just redirect with GET ?params.
// - Instead, we'll simply return a nonce with the redirect. Portal will POST (instead of GET) to /authed.
// - The redis info will be stored as a nonce as the key, with the value being the Discord OAuth2 info.
//
// - Doc | https://discord.com/developers/docs/topics/oauth2

import { getDeleteRedisObj, setRedisObj } from "../../services/redis.js";
import { exchangeCodeForToken, PORTAL_STATE_COOKIE } from "../../services/discordOAuth2.js";
import { portalNonceKey, portalOAuthStateKey } from "../../services/redisKeys.js";
import discordOAuthSrc from "../../models/DiscordOAuthSrc.js";
import { getCachedConfigJson, generateUuid } from "../i42Common.js";
import { checkHasModRoleFromDiscordId } from "./guildInfo.js";
import { getDiscordUserFromToken, getDiscordUserGuildsFromToken } from "./discordClient.js";
import DragonclaimUser from "../../models/DragonclaimUser.js";
import { upsertNewDragonclaimUser } from "../../services/dbAtlas.js";
import { Guild } from "discord.js";
import DiscordMinimalGuild from "../../models/DiscordMinimalGuild.js";
import DiscordTokenResult from "../../models/DiscordTokenResult.js";
import DiscordUser from "../../models/DiscordUser.js";
import AxiosErr from "../../models/AxiosErr.js";
import AuthRedisStateObj from "../../models/AuthRedisStateObj.js";
import type { AxiosError } from "axios";

const { selfHosted, portal } = getCachedConfigJson();
const authedRedirectUri = selfHosted ? selfHosted.authedRedirectUri : portal.authedRedirectUri;

export default async (_req, _res) => {
	console.log("[discordPortalAuthed] @ default");

	const {
		code,
		state,
		error, // eslint-disable-next-line camelcase
		error_description,
	} = _req.query;

	// Validate
	if (error) {
		const json: AxiosErr = {
			error: String(error), // eslint-disable-next-line camelcase
			errDescr: error_description,
			errCode: 400,
		};

		await _res.status(400).json(json);
		return;
	}
	if (!state) {
		const json: AxiosErr = {
			error: "No state",
			errCode: 400,
		};

		await _res.status(400).json(json);
		return;
	} else if (!code) {
		const json: AxiosErr = {
			error: "No code",
			errCode: 400,
		};

		await _res.status(400).json(json);
		return;
	}

	// Validate state (login CSRF): it must match this browser's cookie (set at /auth), exist in
	// Redis under the portal namespace, and come from the portal flow. GETDEL makes it single-use.
	const stateCookie = _req.cookies?.[PORTAL_STATE_COOKIE];
	_res.clearCookie(PORTAL_STATE_COOKIE, { path: "/discord/v1/portal" });

	const stateKey = portalOAuthStateKey(state);
	const isCookieMatch = typeof stateCookie === "string" && stateCookie === state;
	const stateObj =
		isCookieMatch && stateKey
			? ((await getDeleteRedisObj(stateKey)) as AuthRedisStateObj | undefined)
			: undefined;

	if (stateObj?.src !== "genPortalOAuth2Url") {
		const json: AxiosErr = {
			error: "Invalid or expired state. Please start the login again.",
			errCode: 401,
		};

		await _res.status(401).json(json);
		return;
	}

	// ----------------
	// POST code to Discord to get Bearer token info:
	// { access_token, token_type, expires_in, refresh_token, scope }
	console.log("[discordPortalAuthed] Valid Discord `code`. Exchanging for token...");
	let accessTokenRes: DiscordTokenResult;
	try {
		accessTokenRes = await exchangeCodeForToken(code, discordOAuthSrc.Portal);
		if (!accessTokenRes) throw new Error("Failed to get access token");
	} catch (err: unknown) {
		// Never log the raw error: axios errors carry the request body (OAuth client secret)
		console.error(
			`[discordPortalAuthed]**ERR: ${err instanceof Error ? err.message : String(err)} // status==${(err as AxiosError)?.response?.status}`,
		);
		const e = err as AxiosError;
		const resJson: AxiosErr = {
			error: "Failed to get access token",
			errHttpDescr: e.message,
			errCode: e.code,
		};

		await _res.status(500).json(resJson);
		return;
	}

	// ----------------
	// Get DiscordId directly from Discord (discord.js !supports this)
	let discordUser: DiscordUser;
	try {
		discordUser = await getDiscordUserFromToken(accessTokenRes);
		if (!discordUser) {
			throw new Error("Failed to fetch discordId with access_token");
		}
	} catch (err: unknown) {
		// Never log the raw error: axios errors carry the request body (OAuth client secret)
		console.error(
			`[discordPortalAuthed]**ERR: ${err instanceof Error ? err.message : String(err)} // status==${(err as AxiosError)?.response?.status}`,
		);
		const e = err as AxiosError;
		const resJson: AxiosErr = {
			error: "Failed to fetch discordId with access_token",
			errHttpDescr: e.message,
			errCode: e.code,
		};

		await _res.status(500).json(resJson);
		return;
	}

	const discordId = discordUser.id;

	// ----------------
	// Verify authedModRoleId
	let hasModRole;
	try {
		hasModRole = await checkHasModRoleFromDiscordId(discordId);
	} catch (err: unknown) {
		// Never log the raw error: axios errors carry the request body (OAuth client secret)
		console.error(
			`[discordPortalAuthed]**ERR: ${err instanceof Error ? err.message : String(err)} // status==${(err as AxiosError)?.response?.status}`,
		);
		const e = err as AxiosError;
		const json: AxiosErr = {
			error: "Failed to check if user has mod role",
			errHttpDescr: e.message,
			errCode: e.code,
		};

		await _res.status(500).json(json);
		return;
	}

	if (!hasModRole) {
		const json: AxiosErr = {
			error: "User does not have a mod role",
			errCode: 500,
		};

		return await _res.status(500).json(json);
	}

	// ----------------
	// try/catch await await getGuildsByDiscordId(discordId)
	let guildsArr: Guild[];
	try {
		guildsArr = await getDiscordUserGuildsFromToken(accessTokenRes);
	} catch (err: unknown) {
		// Never log the raw error: axios errors carry the request body (OAuth client secret)
		console.error(
			`[discordPortalAuthed]**ERR: ${err instanceof Error ? err.message : String(err)} // status==${(err as AxiosError)?.response?.status}`,
		);
		const e = err as AxiosError;
		const json: AxiosErr = {
			error: "Failed to get guilds by discordId",
			errHttpDescr: e.message,
			errCode: e.code,
		};

		await _res.status(500).json(json);
		return;
	}

	// Simplifyy the guildsArr for db
	const minimalGuildsArr: DiscordMinimalGuild[] = guildsArr.map((guild: Guild) => {
		return {
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
		};
	});

	// ----------------
	// Upsert token info to Atlas DB.
	const dragonclaimUser: DragonclaimUser = {
		src: discordOAuthSrc.Portal,
		discordUser: discordUser,
		guildsArr: minimalGuildsArr,
	};

	try {
		const insertRes: boolean = await upsertNewDragonclaimUser(dragonclaimUser);
		if (!insertRes) {
			throw new Error("Failed to insert new DragonclaimUser");
		}
	} catch (err: unknown) {
		// Never log the raw error: axios errors carry the request body (OAuth client secret)
		console.error(
			`[discordPortalAuthed]**ERR: ${err instanceof Error ? err.message : String(err)} // status==${(err as AxiosError)?.response?.status}`,
		);
		const e = err as AxiosError;
		const json: AxiosErr = {
			error: "Failed to insert new DragonclaimUser",
			errHttpDescr: e.message,
			errCode: e.code,
		};

		await _res.status(500).json(json);
		return;
	}

	// ----------------
	// Generate a nonce
	const discordNonce: string = generateUuid();

	// Save user data and nonce to Redis
	const expiryInSecs: number = 60 * 5; // 5mins: the portal redeems it right after the redirect
	const stringifiedDragonclaimUser: string = JSON.stringify(dragonclaimUser);
	const isNonceSaved = await setRedisObj(
		portalNonceKey(discordNonce),
		stringifiedDragonclaimUser,
		expiryInSecs,
	);
	if (!isNonceSaved) {
		await _res
			.status(503)
			.json({ error: "Login is temporarily unavailable. Please try again shortly." });
		return;
	}

	// ----------------
	// Redirect user back to portal
	_res.redirect(`${authedRedirectUri}?discordNonce=${discordNonce}`);
	// _res.json(dragonclaimUser); // TEST: Just return the json
};
