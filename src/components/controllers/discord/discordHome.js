// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// discordHome.js

export default (_res, _verStr = "v1") => {
	const resJson = {
		status: "ONLINE",
		route: `/discord/${_verStr}/`,
	};

	_res.json(resJson);
};
