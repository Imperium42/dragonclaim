// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// services/portalAuth.ts
// Guards the portal's config API (GET/POST /discord/v1/portal/config), which can read and
// overwrite the whole config (bot token, client secret, DB URIs). Fails closed.
import { createHash, timingSafeEqual } from "crypto";
import { getCachedConfigJson } from "../controllers/i42Common.js";

// Sent by the portal. A header (not a query param) keeps the key out of URLs and proxy logs.
const PORTAL_KEY_HEADER = "x-portal-secret-key";
const MIN_KEY_LENGTH = 32;
const PLACEHOLDER_KEYS = new Set(["", "YOUR_PORTAL_SECRET_KEY"]);

// Read fresh each time so a rotated key (via POST /config) applies without a restart
const getConfiguredKey = (): string | undefined => {
	const key = getCachedConfigJson()?.selfHosted?.portalSecretKey;
	return typeof key === "string" ? key : undefined;
};

// -> Returns why the configured key is unusable, or undefined if it's fine
const getPortalKeyProblem = (_key: string | undefined = getConfiguredKey()): string | undefined => {
	if (!_key || PLACEHOLDER_KEYS.has(_key.trim())) {
		return "selfHosted.portalSecretKey is unset or still the template placeholder";
	}
	if (_key.length < MIN_KEY_LENGTH) {
		return `selfHosted.portalSecretKey must be at least ${MIN_KEY_LENGTH} characters`;
	}
	return undefined;
};

const isPortalConfigApiEnabled = (): boolean => !getPortalKeyProblem();

// Constant-time comparison (hashing first equalizes lengths, so length isn't leaked either)
const safeEqual = (_a: string, _b: string): boolean =>
	timingSafeEqual(
		createHash("sha256").update(_a).digest(),
		createHash("sha256").update(_b).digest(),
	);

// -> true only if the API is enabled AND the request carries the exact configured key
const isAuthorizedPortalRequest = (_req): boolean => {
	const configuredKey = getConfiguredKey();
	if (getPortalKeyProblem(configuredKey)) {
		return false; // Fail closed: never authorize against an unset/placeholder/weak key
	}

	const provided = _req.get?.(PORTAL_KEY_HEADER);
	return (
		typeof provided === "string" &&
		provided.length > 0 &&
		safeEqual(provided, configuredKey as string)
	);
};

// Logs once at boot so a misconfigured deployment is obvious
const warnIfPortalKeyUnusable = (): void => {
	const problem = getPortalKeyProblem();
	if (problem) {
		console.warn(
			`[portalAuth]*WARN: Portal config API DISABLED: ${problem}. ` +
				"Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
		);
	}
};

export {
	PORTAL_KEY_HEADER,
	getPortalKeyProblem,
	isAuthorizedPortalRequest,
	isPortalConfigApiEnabled,
	warnIfPortalKeyUnusable,
};
