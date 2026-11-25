// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// home.js

import "./i42Common.js";

export default (_res) => {
	const jsonObj = {
		title: "dragonclaim-api",
		ver: "0.8",
		stage: "-prod",
	};

	_res.render("index", jsonObj);
};
