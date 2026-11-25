// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// steamHome.js

export default (_res, _verStr = "v1") => {
	const resJson = {
		status: "ONLINE",
		route: `/steam/${_verStr}/`,
	};

	_res.json(resJson);
};
