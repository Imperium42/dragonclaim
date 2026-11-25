// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// steamGetNumCurPlayers.js
import { getNumberOfCurrentPlayers } from "./steamGetUserStatsForGame.js";
import { getCachedConfigJson } from "../i42Common.js";

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
const steamSecrets = getCachedConfigJson().steam;
const steamAppId = steamSecrets.appId;

// ...........................................................................................
// e.g. appId = 620;
export default async () => {
	const numPlayers = await getNumberOfCurrentPlayers(steamAppId);
	const isValidRes = numPlayers && !isNaN(numPlayers) && numPlayers > 0;

	// console.log(`[Steam] @ getNumCurrentPlayersThrone: ${numPlayers} // isValidRes==${isValidRes}
	// 	numPlayers==${numPlayers} // isNan==${isNaN(numPlayers)} // numPlayers==${numPlayers}`);

	return isValidRes ? numPlayers : -1;
};
