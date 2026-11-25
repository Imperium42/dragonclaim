// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// steamTodo.js

// ############################################################################################
// Steam API Backpack
// items.GetPlayerItems(steamAppId, optionalSteamId).done(result =>
// {
//     console.log(result);
// });

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Inventory
// inventory.GetAppItems(steamAppId, optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// User methods
// user.GetPlayerBans(optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// user.GetFriendList(optionalRelationship = 'all', optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// user.GetUserGroupList(optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// //// e.g. vanityUrl = "pr00fgames";
// user.ResolveVanityUrl(vanityUrl).done((result) =>
// {
//     console.log(result);
// });

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// // UserStats methods
// //// e.g. appId = 17740;
// //// e.g. statsName = ['global.map.emp_isle'];
// let statsName = [''];
// userStats.GetGlobalStatsForGame(steamAppId, statsName).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// // OBSOLETE: New privacy policies can return 0 games.
// // => Returns true if being shared
// const checkOwnsSteamGame = async (_steamId) => {
// 	try {
// 		console.log('[steam] @ checkOwnsSteamGame');
//
// 		const uri = `${STEAM_BASE_URI}/ISteamUser/GetPublisherAppOwnership/v3/?key=${steamApiKey}&steamid=${_steamId}`;
// 		const appOwnershipObj = await GET(uri);
//
// 		// #############################################
// 		// "appownership":
// 		// {
// 		// 	"apps":
// 		// 	[
// 		// 	  {
// 		// 		"appid": 595280,
// 		// 		"ownsapp": true,
// 		// 		"permanent": true,
// 		// 		"timestamp": "2017-03-23T14:00:11Z",
// 		// 		"ownersteamid": "76561190000000001",
// 		// 		"sitelicense": false
// 		// 	  }
// 		// 	]
// 		// }
// 		// #############################################
//
// 		// console.log('[steam] @ checkOwnsSteamGame // steamAppId==' + steamAppId);
//
// 		// Validate
// 		if (!appOwnershipObj) {
// 			throw ('!appOwnershipObj');
// 		}
// 		if (!appOwnershipObj.appownership) {
// 			throw ('!appOwnershipObj.appownership');
// 		}
// 		if (!appOwnershipObj.appownership.apps) {
// 			throw ('!appOwnershipObj.appownership.apps');
// 		}
// 		if (appOwnershipObj.appownership.apps.length < 1) {
// 			throw ('appOwnershipObj.apps.length < 1');
// 		}
//
// 		// Find our appid in arr
// 		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
// 		const appsArr = appOwnershipObj.appownership.apps;
// 		const throneGameObj = appsArr.find(({ appid }) => {
// 			// console.log(`[steam] @ checkOwnsSteamGame // g==${i42Common.JsonStringify(g)}`);
// 			// console.log(`[steam] @ checkOwnsSteamGame // g.appid (${appid}) == steamAppId (${steamAppId})? ${appid == steamAppId}`);
// 			return appid == steamAppId; // Only use 2x == since type doesn't matter
// 		});
//
// 		// console.log(`[steam] @ checkOwnsSteamGame // throneGameObj==${throneGameObj}`);
//
// 		if (!throneGameObj) {
// 			console.error('[steam]**ERR @ checkOwnsSteamGame: !throneGameObj (should never == null) // ' +
// 				`appsArr==${appsArr} // typeof appsArr==${typeof appsArr} // [0]==${appsArr[0]}`);
// 			return null; // Should never be null
// 		}
//
// 		// Found it!
// 		const ownsApp = throneGameObj.ownsapp || throneGameObj.ownersteamid !== '0';
// 		// console.log(`[steam] @ checkOwnsSteamGame // Found it! Owned? ${ownsApp}`);
// 		return ownsApp;
// 	}
// 	catch (e) {
// 		throw (`[steam]**ERR @ checkOwnsSteamGame: ${e}`);
// 	}
// };

// // ...........................................................................................
// userStats.GetSchemaForGame(steamAppId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// userStats.GetPlayerAchievements(steamAppId, optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// userStats.GetGlobalAchievementPercentagesForApp(steamAppId).done((result) =>
// {
//     console.log(result);
// });

// ...........................................................................................
// player.GetOwnedGames(
// 	optionalSteamId,
// 	optionalIncludeAppInfo = true,
// 	optionalIncludePlayedFreeGames = false,
// 	optionalAppIdsFilter = []
//   )
// .done(function(result){
// console.log(result);

// // ...........................................................................................
// // [DEPRECATED: NO LONGER PUBLIC]
// // Level 0 == new account/spammer. Level 1 is when they purchase $5
// const getUserLevel = async (_steamId) => {
// 	const pSummary = await player.GetSteamLevel(_steamId);
// 	console.log(`[Steam] @ getUserLevel (${_steamId}): ${pSummary}`);
//
// 	// #################################################################################################
// 	// PlayerSummary
// 	// {
// 	// 	avatar:
// 	// 	{
// 	//         small: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/pic.jpg',
// 	//         medium: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/pic.jpg',
// 	//         large: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/pic.jpg'
// 	//     },
// 	//     steamID: '76561198146931523',
// 	//     url: 'http://steamcommunity.com/id/ExampleUser/',
// 	//     created: 1406393110,
// 	//     lastLogOff: 1517725233,
// 	//     nickname: 'Dim',
// 	//     primaryGroupID: '103582791457347196',
// 	//     personaState: 1,
// 	//     personaStateFlags: 0,
// 	//     commentPermission: 1,
// 	//     visibilityState: 3
// 	// }
// 	// #################################################################################################
//
// 	return pSummary;
// };

// // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// // News Methods
// news.GetNewsForApp(
//     steamAppId,
//     optionalCount = 5,
//     optionalMaxLength = null)
// .done((result) =>
// {
//         console.log(result);
// });

// // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// // App Methods
// app.appDetails(steamAppId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// app.GetAppList().done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// let addressOrIp = "";
// app.GetServersAtAddress(addressOrIp).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// let ver = "v0.8.0";
// app.UpToDateCheck(steamAppId, version).done((result) =>
// {
//     console.log(result);
// });

// // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// // Player Methods
// player.GetSteamLevel(optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// player.GetPlayerLevelDetails(optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// player.GetBadges(optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// let optionalBadgeId = "";
// player.GetCommunityBadgeProgress(optionalBadgeId, optionalSteamId).done((result) =>
// {
//     console.log(result);
// });

// // ...........................................................................................
// player.GetOwnedGames(
//     optionalSteamId,
//     optionalIncludeAppInfo = true,
//     optionalIncludePlayedFreeGames = false,
//     optionalAppIdsFilter = []
// ).done(function(result)
// {
//     console.log(result);
// });
