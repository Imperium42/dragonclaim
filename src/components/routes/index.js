// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// index.ts
// ##################################################################
import { Router } from "express";
import "../controllers/i42Common.js";
import home from "../controllers/home.js";

console.log("[routes:/] Initializing...");
const router = Router();

// .............................................................................
router.get("/", (_req, _res) => {
	console.log("[index.ts] @ root /");
	home(_res);
});

// .............................................................................
// Health check endpoint for Docker/Coolify
router.get("/health", (_req, res) => {
	res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// .............................................................................
export default router;
