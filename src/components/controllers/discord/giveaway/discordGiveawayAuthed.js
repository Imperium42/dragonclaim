// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discord/giveaway/discordGiveawayAuthed.js
import { getCachedConfigJson } from "../../i42Common.js";
import DiscordOAuth2Lib from "discord-oauth2";
import { authedFromDiscordRedirect, failedAuth } from "../authedGiveaway.js";

const { selfHosted } = getCachedConfigJson();
const discordBotConfig = selfHosted.discordBot;
const { clientSecret } = discordBotConfig;

const discordOAuth2Helper = new DiscordOAuth2Lib();

// .............................................................................
// => returns isSuccess
export default async (_req, _res) => {
	// Get params + validate + log
	const params = _req.query;
	const {
		code,
		state,
		error,

		error_description: errDescr,
	} = params;

	if (error) {
		console.error(`[discord/giveaway-route]**ERR @ /giveaway/authed (${error}): ${errDescr}`);
		return prepFailedAuthAsync(state, _res, error);
	}

	const isSuccess = await authedFromDiscordRedirect(
		_res,
		code,
		state,
		clientSecret,
		discordOAuth2Helper,
	);

	// _res.status(200); // Handle res within
	return isSuccess;
};

// .............................................................................
async function prepFailedAuthAsync(_state, _res, _err) {
	// // Match state against DiscordID:
	// // <state, {discordId, eventId, embedMsgId, channelId, dmMsgId, dmChannelId}:str>
	// const parseJson = true;
	// const stateObj = await redis.getRedisObj(_state, parseJson);

	const stateObj = null; // Deprecated?
	return failedAuth(_res, _err, stateObj);
}
