// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// getConfigFromOAuth2.ts
// - If we performed a Discord OAuth2, we stored everything in Redis with the nonce as ID.
import DragonclaimUser from "../../../models/DragonclaimUser.js";
import { getDeleteRedisObj } from "../../../services/redis.js";
import { portalNonceKey } from "../../../services/redisKeys.js";
import AxiosErr from "../../../models/AxiosErr.js";

// Redeems a one-time portal nonce (atomic GETDEL). Only well-formed nonces in the portal
// namespace are looked up, so arbitrary Redis keys can't be read or deleted through here.
async function redeemPortalNonce(_req, _res): Promise<DragonclaimUser | undefined> {
	const { discordNonce } = _req.query;
	const nonceKey = portalNonceKey(discordNonce);
	if (!nonceKey) {
		const json: AxiosErr = {
			error: "Missing or malformed discordNonce",
			errCode: 400,
		};

		await _res.status(400).json(json);
		return undefined;
	}

	const dragonclaimUser = await getDeleteRedisObj(nonceKey);
	if (!dragonclaimUser) {
		const json: AxiosErr = {
			error: "Invalid, expired, or already-consumed discordNonce",
			errCode: 401,
		};

		await _res.status(401).json(json);
		return undefined;
	}

	_res.json(dragonclaimUser);
	return dragonclaimUser;
}

export default async function getDragonclaimUser(_req, _res): Promise<DragonclaimUser | undefined> {
	return redeemPortalNonce(_req, _res);
}

export async function getHttpConfigFromOAuth2(_req, _res): Promise<DragonclaimUser | undefined> {
	return redeemPortalNonce(_req, _res);
}
