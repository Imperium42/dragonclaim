// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ###########################################################
// routes/v1/discord/portal/index.js
// ###########################################################
import { Router } from "express";
import cors from "cors";
import { getCachedConfigJson } from "../../../../controllers/i42Common.js";
import discordPortalAuthReq from "../../../../controllers/discord/discordPortalAuthReq.js";
import discordPortalAuthed from "../../../../controllers/discord/discordPortalAuthed.js";
import httpGetConfigJsonFromYml from "../../../../controllers/discord/portal/httpGetConfigJsonFromYml.js";
import getDragonclaimUser from "../../../../controllers/discord/portal/getDragonclaimUser.js";
import ParentApiConfig from "../../../../models/ApiConfig/ParentApiConfig.js";
import httpUpdateConfigJsonFromYml from "../../../../controllers/discord/portal/httpUpdateConfigJsonFromYml.js";
import { PORTAL_KEY_HEADER, warnIfPortalKeyUnusable } from "../../../../services/portalAuth.js";

const { portal, selfHosted }: ParentApiConfig = getCachedConfigJson() as ParentApiConfig;

console.log("[routes:discord/v1/portal] Initializing...");
const router = Router();

// CORS for the portal frontend: only whitelisted origins. Lives under `portal:` in the config
// (older configs had it under `selfHosted:`). Empty/missing => no cross-origin access at all.
const corsWhitelist: string[] =
	portal?.portalCorsWhitelist ?? selfHosted?.portalCorsWhitelist ?? [];
const portalCors = {
	origin: corsWhitelist.length ? corsWhitelist : false,
	allowedHeaders: ["Content-Type", PORTAL_KEY_HEADER],
	optionsSuccessStatus: 204,
};
if (!corsWhitelist.length) {
	console.warn(
		"[routes:discord/v1/portal]*WARN: portal.portalCorsWhitelist is empty; cross-origin portal calls are blocked",
	);
}

router.use(cors(portalCors)); // Applies to every portal route, incl. preflight (OPTIONS)
warnIfPortalKeyUnusable();

// .............................................................................
router.get("/", (_req, _res) => {
	const resJson: object = { isOnline: true };
	_res.json(resJson);
});

// .............................................................................
// localhost only
router.get("/auth", async (_req, _res) => {
	await discordPortalAuthReq(_req, _res); // => Calls back to /authed
});

// .............................................................................
// Calls back from Discord. TODO: Discord CORS.
// After a successful GET /authed => you should then POST /authed with nonce
router.get("/authed", async (_req, _res) => {
	await discordPortalAuthed(_req, _res);
});

// .............................................................................
// Called after successful GET /authed from portal with nonce
router.post("/authed", async (_req, _res) => {
	await getDragonclaimUser(_req, _res);
});

// .............................................................................
// From portal only
// Header `x-portal-secret-key`: if absent, returns the default template; if present it must match
router.get("/config", async (_req, _res) => {
	return httpGetConfigJsonFromYml(_req, _res);
});

// .............................................................................
// From portal only
// Header `x-portal-secret-key` (current key) + body: the full new config (ParentApiConfig)
router.post("/config", async (_req, _res) => {
	return httpUpdateConfigJsonFromYml(_req, _res);
});

// .............................................................................
// Called after successful /authed from portal
router.get("/user", async (_req, _res) => {
	await getDragonclaimUser(_req, _res);
});

export default router;
