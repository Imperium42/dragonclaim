// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ###########################################################
// routes/v1/discord/giveaway/index.ts
// ###########################################################
import { Router } from "express";
import "../../../../controllers/i42Common.js";
import discordGiveawayHome from "../../../../controllers/discord/giveaway/discordGiveawayHome.js";
import discordGiveawayAuthed from "../../../../controllers/discord/giveaway/discordGiveawayAuthed.js";

console.log("[routes:discord/v1/giveaway] Initializing...");
const router = Router();

// .............................................................................
router.get("/", (_req, _res) => {
	console.log("[discordRoute/v1/giveaway] @ /");
	discordGiveawayHome(_res);
});

// .............................................................................
// GET : Returns { rolesArr : [] }
// https://stackoverflow.com/questions/20089582/how-to-get-a-url-parameter-in-express
// https://stackoverflow.com/questions/17007997/how-to-access-the-get-parameters-after-in-express
router.get("/authed", async (_req, _res) => {
	console.log("[discordRoute/v1/giveaway] @ /authed");
	await discordGiveawayAuthed(_req, _res);
});

// ...........................................................................................
export default router;
