// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// httpUpdateConfigJsonFromYml.ts
import AxiosErr from "../../../models/AxiosErr.js";
import {
	getCachedConfigJson,
	getPathToConfigYml,
	refreshCachedConfigJson,
} from "../../i42Common.js";
import ParentApiConfig from "../../../models/ApiConfig/ParentApiConfig.js";
import fs from "fs";
import yaml from "yaml";
import {
	PORTAL_KEY_HEADER,
	getPortalKeyProblem,
	isAuthorizedPortalRequest,
	isPortalConfigApiEnabled,
} from "../../../services/portalAuth.js";

const isPlainObject = (_val: unknown): _val is Record<string, unknown> =>
	typeof _val === "object" && _val !== null && !Array.isArray(_val);

// -> Returns why the body isn't an acceptable config, or undefined if it is
const getConfigBodyProblem = (_body: unknown): string | undefined => {
	if (!isPlainObject(_body)) {
		return "Body must be a JSON object (the full config)";
	}

	// Only sections the template knows about (no arbitrary keys written to disk)
	const allowedKeys = new Set(Object.keys(getCachedConfigJson(true) ?? {}));
	const unknownKeys = Object.keys(_body).filter((k) => !allowedKeys.has(k));
	if (unknownKeys.length) {
		return `Unknown top-level config keys: ${unknownKeys.join(", ")}`;
	}

	if (!isPlainObject(_body.selfHosted)) {
		return "Missing selfHosted section";
	}

	// The new config must keep a usable key, or the API would lock itself out / reopen
	const keyProblem = getPortalKeyProblem(_body.selfHosted.portalSecretKey as string | undefined);
	return keyProblem ? `New config rejected: ${keyProblem}` : undefined;
};

// Expected: header `x-portal-secret-key` + body = the full new config (ParentApiConfig)
export default async function httpUpdateConfigJsonFromYml(_req, _res): Promise<void> {
	if (!isPortalConfigApiEnabled()) {
		await _res.status(503).json({ error: "Portal config API is disabled on this server" });
		return;
	}

	if (!isAuthorizedPortalRequest(_req)) {
		const json: AxiosErr = {
			error: "Unauthorized",
			errDescr: `Invalid ${PORTAL_KEY_HEADER} header`,
			errCode: 401,
		};

		await _res.status(401).json(json);
		return;
	}

	const bodyProblem = getConfigBodyProblem(_req.body);
	if (bodyProblem) {
		await _res.status(400).json({ error: "Bad Request", errDescr: bodyProblem, errCode: 400 });
		return;
	}

	// Authed + valid >> Save to local yml (TODO: later, write to a DB instead)
	const parentApiConfig = _req.body as ParentApiConfig;
	const yamlData = yaml.stringify(parentApiConfig);

	const filePathToConfigYml = getPathToConfigYml();
	fs.writeFileSync(filePathToConfigYml, yamlData, { encoding: "utf8", mode: 0o600 });
	refreshCachedConfigJson(); // Tell Common to update yml cache

	console.log(`[portal] Config written to ${filePathToConfigYml}`);
	_res.sendStatus(200);
}
