// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// components/controllers/discord/discordPortalAuthReq.ts

import {
	genPortalOAuth2Url,
	OAuthStateUnavailableError,
	PORTAL_STATE_COOKIE,
	PORTAL_STATE_TTL_SECS,
} from "../../services/discordOAuth2.js";

const RETRY_AFTER_SECS = 30;

export default async (_req, _res) => {
	let uri: string;
	let state: string;
	try {
		({ uri, state } = await genPortalOAuth2Url());
	} catch (e) {
		if (!(e instanceof OAuthStateUnavailableError)) {
			throw e; // Express 5 forwards to the error handler
		}

		console.error(`[discordPortalAuthReq]**ERR: ${e.message} // answering 503`);
		_res.set("Retry-After", String(RETRY_AFTER_SECS));
		_res.status(503).json({
			error: "Login is temporarily unavailable. Please try again shortly.",
		});
		return;
	}

	// Bind the state to this browser (checked at /authed). SameSite=Lax still sends it on the
	// top-level redirect back from Discord.
	_res.cookie(PORTAL_STATE_COOKIE, state, {
		httpOnly: true,
		sameSite: "lax",
		secure: _req.secure,
		maxAge: PORTAL_STATE_TTL_SECS * 1000,
		path: "/discord/v1/portal",
	});

	console.log(`[discordPortalAuthReq] Redirecting to uri==${uri.split("?")[0]}`);
	_res.redirect(uri);
};
