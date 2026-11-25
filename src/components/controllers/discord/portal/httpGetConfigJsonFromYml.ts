// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// httpGetConfigJsonFromYml.ts
import AxiosErr from "../../../models/AxiosErr.js";
import { getCachedConfigJson } from "../../i42Common.js";
import ParentApiConfig from "../../../models/ApiConfig/ParentApiConfig.js";
import {
	PORTAL_KEY_HEADER,
	isAuthorizedPortalRequest,
	isPortalConfigApiEnabled,
} from "../../../services/portalAuth.js";

// No key header => the public default template (placeholders only, no secrets).
// With a key header => the live config, only if the key matches (see services/portalAuth.ts).
export default async function httpGetConfigJsonFromYml(
	_req,
	_res,
): Promise<ParentApiConfig | undefined> {
	if (!_req.get(PORTAL_KEY_HEADER)) {
		const newDefaultTemplate = true;
		_res.json(getCachedConfigJson(newDefaultTemplate));
		return undefined;
	}

	if (!isPortalConfigApiEnabled()) {
		await _res.status(503).json({ error: "Portal config API is disabled on this server" });
		return undefined;
	}

	if (!isAuthorizedPortalRequest(_req)) {
		const json: AxiosErr = {
			error: "Unauthorized",
			errDescr: `Invalid ${PORTAL_KEY_HEADER} header`,
			errCode: 401,
		};

		await _res.status(401).json(json);
		return undefined;
	}

	// Authed >>
	const newConfig = false;
	const cachedConfigJson = getCachedConfigJson(newConfig);
	_res.json(cachedConfigJson);
	return cachedConfigJson;
}
