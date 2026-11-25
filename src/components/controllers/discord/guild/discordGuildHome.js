// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discord/guild/discordGuildHome.js

export default (_res, _baseVer) => {
	const resJson = {
		status: "ONLINE",
		route: `/discord/${_baseVer}/guild/`,
	};

	_res.json(resJson);
};
