// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// DragonclaimUser.ts
// - Unlike DragonclaimConfig, this is the `users` Atlas db collection
//   as the result of a Discord OAuth2 auth.

import DiscordUser from "./DiscordUser.js";
import DiscordOAuthSrc from "./DiscordOAuthSrc.js";
import DiscordMinimalGuild from "./DiscordMinimalGuild.js";

/**
 * Parent obj of the `users` Atlas db collection.
 */
export default interface DragonclaimUser {
	_id?: unknown;
	discordUser: DiscordUser;
	src: DiscordOAuthSrc;
	guildsArr: DiscordMinimalGuild[];
}
