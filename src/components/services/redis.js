// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// services/redis.js
// #############################################################################################################

import { getCachedConfigJson, redactUri } from "../controllers/i42Common.js";
import { createClient } from "redis"; // https://www.npmjs.com/package/redis

const { selfHosted } = getCachedConfigJson();
const { redis } = selfHosted;

// Check if we're running in Docker or on the host
const isDocker = process.env.DOCKER_ENV === "true";
const redisUri = isDocker ? redis.uri : redis.uri.replace("redis_db", "localhost");

const redisOpts = {
	url: redisUri,
	// Fail fast instead of queueing commands forever while disconnected; the helpers
	// below catch and degrade gracefully. Reconnects still happen in the background.
	disableOfflineQueue: true,
};
const READY_TIMEOUT_MS = 5000;

// https://www.npmjs.com/package/redis
console.log(`[redis] Connecting to Redis via ${redactUri(redisOpts.url)}`); // never log the password
const redisClient = createClient(redisOpts);

// Resolves on the first successful connection. With the default reconnect strategy this
// never rejects while Redis is down, so never await it unbounded; use waitReady().
const connectPromise = redisClient.connect().catch((e) => {
	console.error(`[redis]**ERR @ connect: ${e}`);
});

// Throws (fast) if Redis isn't connected, so callers' try/catch can degrade gracefully.
// Only the very first connect gets a short grace period (boot race).
const waitReady = async () => {
	if (redisClient.isReady) {
		return;
	}

	let timer;
	const timeout = new Promise((resolve) => {
		timer = setTimeout(resolve, READY_TIMEOUT_MS);
	});
	await Promise.race([connectPromise, timeout]);
	clearTimeout(timer);

	if (!redisClient.isReady) {
		throw new Error("Redis not ready");
	}
};

// // Function to handle the fallback connection attempt
// const connectWithFallback = () => {
// 	redisConnectAttemptNum++;
// 	const fallbackUrl = 'redis://localhost:6379'; // Globally-default redis port (although we use 6380, default in config.yml)
// 	console.log(`[redis] Attempting fallback connection: ${fallbackUrl}`);
// 	const fallbackOpts = {
// 		url: fallbackUrl,
// 	};
// 	const fallbackClient = createClient(fallbackOpts);

// 	fallbackClient.on('error', (fallbackError) => {
// 		console.error('[redis] Fallback connection error:', fallbackError);
// 		throw new Error(fallbackError);
// 	});

// 	// Deprecated: use redisClient.connected
// 	fallbackClient.on('ready', () => {
// 		console.log('[redis] fallbackClient is ready');
// 	});

// 	return fallbackClient;
// };

redisClient.on("error", (error) => {
	console.error(`[redis] Connection error: ${error}`);

	// Don't throw - let the app continue with degraded functionality. node-redis keeps
	// reconnecting; meanwhile the helpers below fail fast (see waitReady) and return falsy.
});

redisClient.on("ready", () => {
	console.log("[redisRedis] Client is ready");
});

// ..........................................................................................
// Removes kvp by key
// -> Returns isSuccess
const delRedisObj = async (_key) => {
	try {
		await waitReady();

		console.log(`[redis] @ delRedisObj // key==${_key}`);
		return await redisClient.del(_key);
	} catch (e) {
		console.error(`[redis]**ERR @ delRedisObj: ${e}`);
		return false;
	}
};

// ..........................................................................................
const setRedisObj = async (_key, _stringifiedVal, _expiryInSeconds = -1) => {
	try {
		await waitReady();

		if (!_key) {
			throw "!key";
		}
		if (_stringifiedVal === null) {
			throw "val==" + _stringifiedVal;
		}

		// node-redis only accepts strings/Buffers (async-redis used to coerce), so stringify the rest
		const val =
			typeof _stringifiedVal === "string" || Buffer.isBuffer(_stringifiedVal)
				? _stringifiedVal
				: JSON.stringify(_stringifiedVal);

		// Set value + TTL atomically (no orphaned keys without an expiry)
		const setOpts = _expiryInSeconds > 0 ? { EX: _expiryInSeconds } : undefined;
		await redisClient.set(_key, val, setOpts);

		return true;
	} catch (e) {
		console.error(`[redis]**ERR @ setRedisObj: ${e}`);
	}
};

// ..........................................................................................
// Vals are strings only -- don't forget to JSON.parse(), if necessary
const getRedisObj = async (_key, _parseJson = true) => {
	try {
		await waitReady();

		const redisStr = await redisClient.get(_key); // Demo
		return _parseJson ? JSON.parse(redisStr) : redisStr;
	} catch (e) {
		console.error(`[redis]**ERR @ getRedisObj: ${e}`);
	}
};

// ..........................................................................................
// Great for one-time use cases, like nonces.
const getDeleteRedisObj = async (_key, _parseJson = true) => {
	try {
		await waitReady();

		// Atomic GETDEL (Redis 6.2+): a value can only be redeemed once, even under concurrent requests
		const redisStr = await redisClient.getDel(_key);
		if (redisStr === null) {
			return undefined;
		}
		return _parseJson ? JSON.parse(redisStr) : redisStr;
	} catch (e) {
		console.warn(`[redis]*WARN @ getDeleteRedisObj: ${e}`);

		// throw new Error(e);
		return undefined;
	}
};

// ######################################################################################
export { delRedisObj, setRedisObj, getRedisObj, getDeleteRedisObj };
