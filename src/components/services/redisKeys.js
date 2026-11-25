// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// services/redisKeys.js
// Redis key builders for values that come from (or round-trip through) untrusted input.
// Each purpose gets its own namespace, and ids must be UUIDs, so a caller can't point a
// lookup at an unrelated key (e.g. a reaction lockout) by passing an arbitrary string.
import { isUuid } from "../controllers/i42Common.js";

const PREFIX = {
	portalOAuthState: "oauth:portal:state:",
	giveawayOAuthState: "oauth:giveaway:state:",
	portalNonce: "portal:nonce:",
};

// -> Returns the namespaced key, or undefined if `_id` isn't a UUID (treat as invalid input)
const buildKey = (_prefix, _id) => (isUuid(_id) ? `${_prefix}${_id.toLowerCase()}` : undefined);

const portalOAuthStateKey = (_state) => buildKey(PREFIX.portalOAuthState, _state);
const giveawayOAuthStateKey = (_state) => buildKey(PREFIX.giveawayOAuthState, _state);
const portalNonceKey = (_nonce) => buildKey(PREFIX.portalNonce, _nonce);

export { portalOAuthStateKey, giveawayOAuthStateKey, portalNonceKey };
