// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ########################################################################################################
// discordUtils.js
// ########################################################################################################
import moment from "moment";
import { getCachedConfigJson } from "../i42Common.js";

const { selfHosted } = getCachedConfigJson();

const { timers } = selfHosted;

const {
	pollingCooldownSecs, // default == 10 (dev); recommended 30 for production
	pollingMs, // default == 5m (dev); recommended 300000 for production
} = timers;

const cdTimer = 1000;

// Cooldown
const StatusCooldownSecs = moment.duration(cdTimer, "seconds");

// ==================================================================================================
// Funcs >>

// ...........................................................................................
// -> returns the year using Universal Coordinated Time (UTC)
const getYearFromMsg = (_msg) => {
	return _msg.createdAt.getUTCFullYear();
};

// ...........................................................................................
const truncateQuoteStr = (_str, _n) => {
	return typeof _n === "undefined" || _str.length < _n
		? _str
		: _str.substring(0, _n - 6) + "...\n```";
};

// ...........................................................................................
// Received x args from user input - validate exists
// TODO: Move to common utils
//
// -> returns isSuccess
const validateExists = (...args) => {
	for (const arg of args) {
		if (typeof arg === "undefined" || arg === null) {
			return false;
		} // !isSuccess
	}

	return true; // isSuccess
};

// ...........................................................................................
const testSendMsg = async (_channel, _msgStr) => {
	// TODO
	return true;
};

// ...........................................................................................
const checkHasAttachment = (msg) => {
	return (msg.attachments && msg.attachments.first()) || false;
};

// ...........................................................................................
// Normalizes channel id || <#id>.
// -> Returns `<#{channelId}>`
const normalizeChannelToLink = (_channelIdOrStr) => {
	const channelId = normalizeChannelToIdStr(_channelIdOrStr);
	return `<#${channelId}>`;
};

// ...........................................................................................
// Normalizes channel id || <#id>.
// -> Returns number str
const normalizeChannelToIdStr = (_channelIdOrStr) => {
	const isStr = _channelIdOrStr && typeof _channelIdOrStr === "string";
	if (isStr) {
		_channelIdOrStr = _channelIdOrStr.replace("<#", "").replace(">", "");

		// TODO: `here` alias?
		// if (arg2ChannelOrId.toLowerCase() === 'here')
		//     channelId = _msg.channel.id;
	}

	return _channelIdOrStr;
};

// ...........................................................................................
// Takes user + id => fetches from guild.
// -> returns member
const getGuildMemberFromReaction = async (_msgReaction, _discordId) =>
	await _msgReaction.message.guild.members.fetch(_discordId);

// ==================================================================================================
export {
	getYearFromMsg,
	truncateQuoteStr,
	cdTimer,
	StatusCooldownSecs,
	pollingCooldownSecs,
	pollingMs,
	validateExists,
	testSendMsg,
	checkHasAttachment,
	normalizeChannelToLink,
	normalizeChannelToIdStr,
	getGuildMemberFromReaction,
};
