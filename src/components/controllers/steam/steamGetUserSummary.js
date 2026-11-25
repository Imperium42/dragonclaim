// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// steamGetUserSummary.js
// Steam Web API (ISteamUser/GetPlayerSummaries): https://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerSummaries_.28v0002.29
import { GET } from "../../services/http.js";
import { getCachedConfigJson } from "../i42Common.js";

const steamSecrets = getCachedConfigJson().steam;
const steamApiKey = steamSecrets.devApiKey || steamSecrets.webApiKey; // Prioritize dev key, if available

// ...........................................................................................
// WARNING: `timecreated` (and others) are only present for public profiles!
export default async (_steamId) => {
	const res = await GET("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/", {
		key: steamApiKey,
		steamids: _steamId,
	});

	const pSummary = res?.data?.response?.players?.[0];
	console.log(`[Steam] @ getUserSummary (${_steamId}): ${JSON.stringify(pSummary)}`);

	// #################################################################################################
	// Raw Steam player obj (snake/lowercase keys, unlike the old `steamapi` lib's camelCase wrapper)
	// {
	// 	steamid: '76561198146931523',
	// 	personaname: 'Dim',
	// 	profileurl: 'https://steamcommunity.com/id/ExampleUser/',
	// 	avatar / avatarmedium / avatarfull: 'https://avatars.steamstatic.com/....jpg',
	// 	personastate: 1,
	// 	communityvisibilitystate: 3,
	// 	commentpermission: 1,
	// 	lastlogoff: 1517725233,
	// 	timecreated: 1406393110,
	// 	primaryclanid: '103582791457347196',
	// 	personastateflags: 0
	// }
	// #################################################################################################

	return pSummary;
};
