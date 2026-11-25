// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// steamCheckIsTrusted

// ...........................................................................................
// Returns true if trusted, via sandbox microtxn user check.
// USER MUST BE LOGGED IN! Returns trusted for benefit of doubt if not logged in
import { GET } from "../../services/http.js";
import { getCachedConfigJson, safeStringify } from "../i42Common.js";

const steamSecrets = getCachedConfigJson().steam;
const steamApiKeyIsDevNotWeb = !!steamSecrets.devApiKey;
const steamApiKey = steamSecrets.devApiKey || steamSecrets.webApiKey; // Prioritize dev key, if available
const steamAppId = steamSecrets.appId;
const STEAM_BASE_URI = "https://partner.steam-api.com";

export default async (_steamId, _trustIfLoggedOut = true) => {
	// Ensure our API key is a dev key
	if (!steamApiKeyIsDevNotWeb) {
		console.warn(
			"[steamCheckIsTrusted]*WARN: WebAPIKey does not have access to priveleged calls to specific apps - " +
				"you are probably using a web api key (not the same) // returning trusted",
		);
		return true; // trusted by benefit of the doubt, since we can't test it
	}

	if (!steamAppId) {
		console.warn(
			"[steamCheckIsTrusted]*WARN: !steamAppId selected for an app-specific call // returning trusted",
		);
		return true; // trusted by benefit of the doubt, since we can't test it
	}

	// Call Steam
	const uri =
		`${STEAM_BASE_URI}/ISteamMicroTxnSandbox/GetUserInfo/v2/?key=${steamApiKey}` +
		`&steamid=${_steamId}&appid=${steamAppId}`;

	const userInfoObj = (await GET(uri))?.data; // Steam JSON body lives on the axios response .data

	// #############################################
	// {
	// 	"response":
	// 	{
	// 		"result": "OK",
	// 		"params":
	// 		{
	// 			"state": "SC",
	// 			"country": "US",
	// 			"currency": "USD",
	// 			"status": "Trusted"
	// 		}
	// 	}
	// }
	// #############################################
	// {
	// 	"response":
	// 	{
	// 		"result": "Failure",
	// 		"error":
	// 		{
	// 			"errorcode": 7,
	// 			"errordesc": "Not logged in"
	// 		}
	// 	}
	// }
	// #############################################
	// console.log('[steam] @ checkIsTrusted: uri==' + uri);
	console.log(`[steam] @ checkIsTrusted: userInfoObj==${safeStringify(userInfoObj)}`);

	if (!userInfoObj) {
		console.error("[steam]**ERR @ checkIsTrusted: !userInfoObj");
		return false;
	} else if (!userInfoObj.response) {
		console.error("[steam]**ERR @ checkIsTrusted: !userInfoObj.response");
		return false;
	} else if (userInfoObj.response?.error || !userInfoObj.response.params) {
		// Has err >>
		const err = userInfoObj.response.error;
		return handleTrustedErr(err, _trustIfLoggedOut);
	}

	// ------------------------
	// Should be good!
	const statusStr = userInfoObj.response.params.status;
	console.log(`[steam] @ checkIsTrusted: statusStr==${statusStr}`);

	const isTrusted = statusStr.toLowerCase() === "trusted";
	return isTrusted;
};

// ...........................................................................................
// -> returns isTrusted
const handleTrustedErr = (_err, _trustIfLoggedOut) => {
	try {
		const errCode = _err && _err.errorcode;
		const errMsg = _err && _err.errordesc;

		// Logs and decide if fatal err
		console.warn(
			"[steam]*WARN @ checkIsTrusted: !userInfoObjresponse.params: " +
				`err==(${errCode}) ${errMsg}`,
		);

		switch (errCode) {
			case 7:
				if (_trustIfLoggedOut) {
					// The user is not logged into Steam; we trustIfLoggedOut.
					console.warn(
						"[steam]*WARN @ checkIsTrusted: Benefit of the doubt" +
							"trusted (err 7, not logged in)",
					);
					return true; // trusted
				}
				return false; // !isTrusted

			case 3:
				// WebAPIKey does not have access to app - need a dev key
				console.error(
					"[steam] You are using a WebAPIkey instead of devKey " +
						"(required for trust check)",
				);
				return true; // isTrusted

			default:
				return false;
		}
	} catch {
		// throw(`[steam] @ steamRoute: ${e}`);
		return true; // isTrusted - Assume trusted, since bug.
	}
};
