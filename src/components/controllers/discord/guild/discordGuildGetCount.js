// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discord/guild/discordGuildGetCount.js
import { getMyGuild } from "../guildInfo.js";

export default (_res) => {
	const count = getMyGuild().memberCount;
	// console.log('Guild Member Count: ' + count);

	const json = { nmemberCount: count };
	_res.json(json);
};
