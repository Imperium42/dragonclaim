// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ParentApiConfig.ts

import LocaleApiConfig from "./LocaleApiConfig.js";
import SelfHostedApiConfig from "./SelfHostedApiConfig.js";
import PortalApiConfig from "./PortalApiConfig.js";
import PrefsApiConfig from "./PrefsApiConfig.js";
import HexColorsApiConfig from "./HexColorsApiConfig.js";
import SteamApiConfig from "./SteamApiConfig.js";
import PlatformsApiConfig from "./PlatformsApiConfig.js";
import AdminApiConfig from "./AdminApiConfig.js";

export default interface ParentApiConfig {
	selfHosted?: SelfHostedApiConfig;
	admin: AdminApiConfig;
	portal: PortalApiConfig;
	prefs: PrefsApiConfig;
	hexColors: HexColorsApiConfig;
	adminEmails: string[];
	steam: SteamApiConfig;
	platforms: PlatformsApiConfig;
	locale: LocaleApiConfig;
}
