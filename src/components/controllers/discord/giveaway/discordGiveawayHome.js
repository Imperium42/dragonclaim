// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discord/giveaway/discordGiveawayHome.js

export default (_res, _baseVer) => {
	const resJson = {
		status: "ONLINE",
		route: `/discord/${_baseVer}/giveaway/`,
	};

	_res.json(resJson);
};
