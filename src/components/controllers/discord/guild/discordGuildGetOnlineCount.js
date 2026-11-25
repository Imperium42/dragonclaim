// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discord/guild/discordGuildGetOnlineCount.js
import { getMyGuild } from "../guildInfo.js";

export default (_res) => {
	// console.log('[discord-route] Online and ready for '/guild/status'!');

	const g = getMyGuild();
	console.log(`[discord] @ /guild/online: g==${g}`);

	const onlineMembers = g.members.cache.filter((m) => m.presence.status === "online").size;

	// returnSuccess(res);
	const DiscordOnlineCount = { onlineCount: onlineMembers };
	_res.json(DiscordOnlineCount);

	// console.log('[discord-route] Done. onlineMembers==' + onlineMembers);
};
