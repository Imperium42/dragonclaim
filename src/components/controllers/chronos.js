// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #########################################################################################
// chronos.js
// - Time manipulation with Date objects and Moment.js
// #########################################################################################

import moment from "moment";

const LogPrefix = "[chronos]";

// ...........................................................................................
const sleep = async (_ms) => {
	return new Promise((_resolve) => setTimeout(_resolve, _ms));
};

// ...........................................................................................
// await this; returns true
const waitSecs = async (_numSecs) => {
	// https://stackoverflow.com/questions/49627508/discord-js-wait-before-send-message
	await sleep(1000 * _numSecs);
	return true;
};

// ...........................................................................................
// await this; returns true
const waitMins = async (_numMins) => {
	// https://stackoverflow.com/questions/49627508/discord-js-wait-before-send-message
	await sleep(1000 * 60 * _numMins);
	return true;
};

// ...........................................................................................
// Returns true if moment < now (has not yet come to pass)
const checkMomentIsBeforeNow = (_moment) => {
	const nowMoment = new moment.utc();

	// https://momentjs.com/docs/#/query/is-before/
	const isBeforeNow = nowMoment.isBefore(_moment);
	console.log(`${LogPrefix} @ checkMomentIsBeforeNow: isBeforeNow==${isBeforeNow}`);

	return isBeforeNow;
};

// ...........................................................................................
// Returns true if _moment arg is in the FUTURE (not yet passed).
const checkMomentIsInFuture = (_moment) => {
	const nowMoment = new moment.utc();

	// https://momentjs.com/docs/#/query/is-before/
	const isAfterNow = _moment.isAfter(nowMoment);
	// console.log(`${LogPrefix} @ checkMomentIsAfterNow: _moment.isAfter(nowMoment)==${isAfterNow}`);

	return isAfterNow;
};

// ...........................................................................................
// "Tuesday; June 23rd, 2020 @ 3:19pm (GMT+8)"
const getFriendlyMomentFormatTaiwanStr = (_moment) => {
	// console.log(`${LogPrefix} @ getFriendlyMomentFormatTaiwanStr // moment==${_moment}`);

	const formatStr = _moment.utcOffset(8).format("dddd[;] MMMM Do[,] YYYY @ h:mma [(GMT+8)]");

	// console.log(`${LogPrefix} @ getFriendlyMomentFormatTaiwanStr // formatStr==${formatStr}`);
	return formatStr;
};

// ...........................................................................................
// "Tuesday; June 23rd, 2020 @ 7:19am (UTC)"
const getFriendlyMomentFormatUTCStr = (_moment) => {
	// console.log(`${LogPrefix} @ getFriendlyMomentFormatStr // moment==${_moment}`);

	const formatStr = _moment.format("dddd[;] MMMM Do[,] YYYY @ h:mma [(UTC)]");

	// console.log(`${LogPrefix} @ getFriendlyMomentFormatStr // formatStr==${formatStr}`);
	return formatStr;
};

// ...........................................................................................
// export router;
export {
	checkMomentIsBeforeNow,
	waitSecs,
	waitMins,
	checkMomentIsInFuture,
	getFriendlyMomentFormatUTCStr,
	getFriendlyMomentFormatTaiwanStr,
};
