// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// steamGetUserStatsForGame.js
// Steam Web API (ISteamUserStats): https://partner.steamgames.com/doc/webapi/ISteamUserStats
import { GET } from "../../services/http.js";
import { getCachedConfigJson } from "../i42Common.js";

const steamSecrets = getCachedConfigJson().steam;
const steamApiKey = steamSecrets.devApiKey || steamSecrets.webApiKey; // Prioritize dev key, if available
const STEAM_USER_STATS_URI = "https://api.steampowered.com/ISteamUserStats";

// ...........................................................................................
// -> Returns Steam's `playerstats` obj ({ steamID, gameName, achievements, stats })
export default async (_steamAppId, _steamId) => {
	const res = await GET(`${STEAM_USER_STATS_URI}/GetUserStatsForGame/v2/`, {
		key: steamApiKey,
		appid: _steamAppId,
		steamid: _steamId,
	});

	const pStats = res?.data?.playerstats;
	console.log(`[Steam] @ getUserStatsForGame: ${JSON.stringify(pStats)}`);

	return pStats;
};

// ...........................................................................................
// -> Returns the current player count (number), or undefined on a failed result
export const getNumberOfCurrentPlayers = async (_steamAppId) => {
	const res = await GET(`${STEAM_USER_STATS_URI}/GetNumberOfCurrentPlayers/v1/`, {
		appid: _steamAppId,
	});

	const { result, player_count: playerCount } = res?.data?.response ?? {};
	return result === 1 ? playerCount : undefined;
};
