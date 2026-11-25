// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ...........................................................................................
// routes/steam/v1/index.ts
import { Router } from "express";
import "../../../controllers/i42Common.js";
import steamTest from "../../../controllers/steam/steamHome.js";

console.log("[routes:steam/v1] Initializing...");
const router = Router();

// ...........................................................................................
router.get("/test", (_req, _res) => {
	console.log("[steam] @ /test");
	steamTest(_res);
});

// ...........................................................................................
// export router;
export default router;
