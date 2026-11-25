// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ###########################################################
// routes/discord/v1/index.ts
// ###########################################################
import { Router } from "express";
import giveawayRouter from "./giveaway/index.js";
import portalRouter from "./portal/index.js";
import "../../../controllers/i42Common.js";
import discordHome from "../../../controllers/discord/discordHome.js";
import discordGuildHome from "../../../controllers/discord/guild/discordGuildHome.js";
import getDiscordGuildCount from "../../../controllers/discord/guild/discordGuildGetCount.js";
import getDiscordGuildOnlineCount from "../../../controllers/discord/guild/discordGuildGetOnlineCount.js";

console.log("[routes:discord/v1] Initializing...");
const router = Router();

// ...........................................................................................
router.get("/", (_req, _res) => {
	console.log("[discordRoute] @ /discord/test");
	discordHome(_res, "v1");
});

// .............................................................................
// GET: Guild general info
router.get("/v1/guild", (_req, _res) => {
	console.log("[discordRoute] @ /discord/guild/");
	discordGuildHome(_res, "v1");
});

// .............................................................................
// GET: count/guild
router.get("/v1/guild/count", (_req, _res) => {
	console.log("[discordRoute] @ /discord/guild/count");
	getDiscordGuildCount(_res);
});

// .............................................................................
// GET: Guild online count
router.get("/v1/guild/online", (_req, _res) => {
	console.log("[discordRoute] @ /discord/guild/online");
	getDiscordGuildOnlineCount(_res);
});

router.use("/v1/giveaway", giveawayRouter);
router.use("/v1/portal", portalRouter);

// ...........................................................................................
// export router;
export default router;
