// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// dbAtlas.js
// TODO: Create a generalized db interface
// #############################################################################################################

// https://cloud.mongodb.com
import { MongoClient, ServerApiVersion } from "mongodb";
import moment from "moment";
import { waitSecs } from "../controllers/chronos.js";
import { checkHasModRoleFromDiscordId, guildId } from "../controllers/discord/guildInfo.js";
import { getCachedConfigJson, JsonStringify, toHostReachableUri } from "../controllers/i42Common.js";
// import DragonclaimUser from '../models/DragonclaimUser.js';

// Secrets >>
const { selfHosted } = getCachedConfigJson();

const mongodbKeys = selfHosted.mongodb;
const { dbName } = mongodbKeys;
// On the host (no DOCKER_ENV), the Compose `mongodb` hostname is rewritten to localhost
const uri = toHostReachableUri(mongodbKeys.uri);

// Mongo DB >>
const connectOpts = {
	serverApi: ServerApiVersion.v1, // '1'
	tls: uri.startsWith("mongodb+srv://") || uri.startsWith("https://"), // Enable TLS for Atlas and HTTPS URLs
};

let mainDb, mClient, isGuildSetup;

// ##############################################################################################################
// Funcs

// ..........................................................................................
// Start here
const initConnect = async () => {
	mClient = new MongoClient(uri, connectOpts);

	try {
		await dbConnect();
	} catch (e) {
		// Fatal: every collection getter would otherwise spin in waitDbInitd forever while
		// /health still reports 200. Exit so the orchestrator (Coolify/Docker) restarts us.
		// (Matches the pre-v5 driver behavior, where the callback throw crashed the process.)
		console.error("[dbAtlas]**ERR @ initConnect (fatal; exiting) // e==", e);
		process.exit(1);
	}
};

// ..........................................................................................
// Connects to 'tol' db
const dbConnect = async () => {
	console.log("[dbAtlas] @ dbConnect");

	try {
		await mClient.connect();
	} catch (e) {
		throw (
			"[dbAtlas]**ERR @ dbConnect().connect => " +
			`Did you whitelist your IP on Atlas (see README)? err==${e}`
		);
	}

	// Init connect - grab tol collection
	mainDb = mClient.db(dbName);

	if (!mainDb) {
		return throwDbErr(`!i42db // col==${mainDb}`);
	}

	const giveawayCol = getGiveawaysCol();

	if (!giveawayCol) {
		return throwDbErr(`!i42db.giveaway (collection) // col==${mainDb}`);
	}

	onMongoConnected(); // Don't await (matches prior callback behavior)

	// ----------------
	// Don't close connection! https://stackoverflow.com/questions/39073971/mongodb-open-and-close-connection-advise-for-good-practice#:~:text=1%20Answer&text=It%20is%20best%20practice%20to,happen%20automatically%20for%20each%20query.
	// _client.close();
};

// ..........................................................................................
const onMongoConnected = async () => {
	console.log("[dbAtlas] @ onMongoConnected");
	await checkIsGuildSetup(); // Sets isGuildSetup

	if (isGuildSetup) {
		return;
	}

	// Prep new guild
	const isSuccess = await insertNewGuild(guildId, getCachedConfigJson());
	if (isSuccess) {
		// // TODO: Trigger a Discord hook
		// const discord = require('./discord/discordMain');
	}
};

// ..........................................................................................
const getDB = () => mainDb;

// ..........................................................................................
/**
 * Be sure to await this!
 * @returns {Promise<*>}
 */
const getGuildsCol = async () => {
	await waitDbInitd();
	return mainDb.collection("guilds");

	// ################################
	// _id: {guildId},
	// config: {config.yml},
	// configUpdateInfo: {
	// 	utcTime: new Date().getTime(),
	// 	uploadedByDiscordId: _updaterDiscordId,
	// },
	// ################################
};

// ..........................................................................................
// awaits db init
const getGiveawaysCol = async () => {
	await waitDbInitd();
	return mainDb.collection("giveaways");

	// #############################################################################
	// const dataObj =
	// {
	//     '_id' : "{discordId}-{eventName}"
	//     'isLive' : true,
	//     'dates' :
	//     {
	//         'eventDurationInt' : eventDurationInt, // eg, moment's 15
	//         'eventDurationTypeChar' : eventDurationTypeChar, // eg, moment's 'd' for day
	//         'startDateFriendly' : nowMoment.format("dddd, MMMM Do YYYY, h:mm:ss a"),
	//         'endDateFriendly' : endMoment.format("dddd, MMMM Do YYYY, h:mm:ss a"),
	//         'startDateObj' : nowMoment.toDate(),
	//         'endDateObj' : endMoment.toDate(),
	//     },
	//     'liveInChannelId : channelId,
	//     'embedMsgId' : embedMsgId,
	//     'reqsObj' :
	//     {
	//         'discord' : true,
	//         'steam' : true,
	//         'email' : false
	//     },
	//     'initKeyCount' : keysArr.length,
	//     'keysArr' : keysArr,
	//     'endReason' : endReason,
	//     'claimersArr' :
	//     [
	//         // {
	//         //     'discordId' : msg.author.id,
	//         //     'steamId' : arg1,
	//         //     'claimedDateObj' : new Date(),
	//         //     'claimedKey' : claimedKey,
	//         //     'email' : arg2, // Optional
	//         // }
	//     ]
	// };
	// #############################################################################
};

// ..........................................................................................
/**
 * See {DragonclaimUser} for schema.
 * @returns {Promise<*>}
 */
const getUsersCol = async () => {
	await waitDbInitd();
	return mainDb.collection("users");
};

// ..........................................................................................
const getDiscordBlacklistsCol = async () => {
	await waitDbInitd();
	return mainDb.collection("discordBlacklists");

	// ################################
	// _id : {discordId},
	// steamId : {steamId}
	// ################################
};

// ..........................................................................................
// => returns isGuildSetup and sets isGuildSetup
const checkIsGuildSetup = async () => {
	const guildsCol = await getGuildsCol();

	const query = { _id: guildId };
	const opts = getProjOptsIdOnly();

	const res = await guildsCol.findOne(query, opts);
	isGuildSetup = !!res;
	console.log(`[dbAtlas] @ checkisGuildSetup // isGuildSetup==${isGuildSetup}`);

	return isGuildSetup;
};

// ..........................................................................................
/**
 * @param _guildId From guildInfo
 * @param _configJson Generally parsed data/config.yml
 * @param _updaterDiscordId Leave null to assume 'system' update -> eg, 1st auto-init.
 * @returns {Promise<boolean>} isSuccess
 */
const insertNewGuild = async (_guildId, _configJson, _updaterDiscordId = "system") => {
	const guildsCol = await getGuildsCol();

	const insertObj = {
		_id: _guildId,
		config: _configJson,
		configUpdateInfo: {
			utcTime: new Date().getTime(),
			uploadedByDiscordId: _updaterDiscordId,
		},
	};

	const insertRes = await guildsCol.insertOne(insertObj);
	return !!insertRes; // isSuccess
};

// ..........................................................................................
/**
 *
 * @param _dragonclaimUser {DragonclaimUser}  Insert obj for db `users` collection.
 * @returns {Promise<boolean>} isSuccess
 */
const upsertNewDragonclaimUser = async (_dragonclaimUser) => {
	console.log("[dbAtlas] @ upsertNewDragonclaimUser");
	const guildsCol = await getUsersCol();

	const id = { "discordUser.id": _dragonclaimUser.discordUser.id };
	const upsertObj = { $set: _dragonclaimUser };
	const opts = { upsert: true };

	let insertRes;
	try {
		insertRes = await guildsCol.updateOne(id, upsertObj, opts);
	} catch (e) {
		console.error(`[dbAtlas]**ERR @ upsertNewDragonclaimUser: ${e}`);
		return false; // !isSuccess
	}

	return !!insertRes; // isSuccess
};

// ..........................................................................................
// i42db may not be assigned yet - so we await
// => returns true
const waitDbInitd = async () => {
	while (!mainDb) {
		console.log("[dbAtlas] @ waitDbInitd // waiting 0.5s");
		await waitSecs(0.5);
	}

	return true;
};

// // ..........................................................................................
// // Searches by { _id } with only _id proj just to see if something exists
// const checkExists = async (id, col, query) =>
// {
//     try
//     {
//         return await col.findOne(query, proj);
//     }
//     catch(e)
//     {
//         console.error(`[dbAtlas]**ERR @ get: ${e}`);
//         return e;
//     }
// }

// ..........................................................................................
const getProjOptsIdOnly = () => {
	return {
		projection: { _id: 1 },
	};
};

// ..........................................................................................
const checkIsUserDiscordBlacklisted = async (_discordId) => {
	// console.log("[dbAtlas] @ checkIsUserDiscordBlacklisted: discordId==" + discordId);

	if (!_discordId) {
		console.error("[dbAtlas]**ERR @ checkIsUserDiscordBlacklisted: !discordId");
		return;
	}

	// ------------------------
	const col = await getDiscordBlacklistsCol();

	// Find existing entry
	const discordQuery = { _id: _discordId };
	const opts = getProjOptsIdOnly();
	const existingRes = await col.findOne(discordQuery, opts);

	// console.log("[dbAtlas] @ checkIsUserDiscordBlacklisted: res==" + i42Common.JsonStringify(existingRes) +
	//     " // query==" + i42Common.JsonStringify(discordQuery));

	return existingRes && existingRes._id !== null;
};

// ..........................................................................................
// { discordId, [steamId], [email] }
// _id is discordId
const addToDiscordBlacklist = async (_discordId, _steamId, _email, _reason) => {
	if (!_discordId) {
		console.error("[dbAtlas]**ERR @ addToDiscordBlacklist: !discordId");
		return;
	}

	// ------------------------
	// Already blacklisted?
	const existingRes = await checkIsUserDiscordBlacklisted(_discordId);
	if (existingRes) {
		return;
	} // Already blacklisted

	// --------------
	// Insert new >>
	const insertObj = {
		_id: _discordId,
		reason: _reason,
	};

	if (_steamId) {
		insertObj.steamId = _steamId;
	}
	if (_email) {
		insertObj.email = _email;
	}

	const col = await getDiscordBlacklistsCol();
	const insertRes = await col.insertOne(insertObj);
	// console.log(`[dbAtlas] @ addToDiscordBlacklist: d==${discordId} // s==${steamId}`);

	return insertRes;
};

// ..........................................................................................
// Returns live obj, if found (1st).
// Looks for either test or live, depending on what's running.
// Returns everything EXCEPT { keysArr, claimsArr }
const getFirstGiveawayLive = async () => {
	try {
		console.log("[dbAtlas] @ getFirstGiveawayLive");

		// ------------------------
		const col = await getGiveawaysCol();

		// Find 1st 'isLive' entry
		const isLiveQuery = { isLive: true };

		console.log("[dbAtlas] @ getFirstGiveawayLive (2)");

		// Example projection options
		// ##########################################################################################
		// {
		// 	"_id": "faff",
		// 	"isLive": false,
		// 	"dates": {
		// 	"eventDurationInt": 4,
		// 		"eventDurationTypeChar": "d",
		// 		"startDateFriendly": null,
		// 		"endDateFriendly": null,
		// 		"startDateObj": null,
		// 		"endDateObj": null
		// },
		// 	"liveInChannelId": null,
		// 	"embedMsgId": null,
		// 	"reqsObj": {
		// 	"discord": true,
		// 		"steam": true,
		// 		"email": false
		// },
		// 	"initKeyCount": 3,
		// 	"keysArr": ["AAA-BBB-CCC", "CCC-DDD-EEE", "FFF-GGG-HHH"],
		// 	"endReason": null,
		// 	"claimersArr": []
		// }
		// ##########################################################################################

		const opts = {
			projection: {
				// Exclusion projection: 0 || null
				keysArr: 0,
				claimersArr: 0,
			},
		};

		const isLiveResObj = await col.findOne(isLiveQuery, opts);

		// ------------------------
		const isLive = (isLiveResObj && isLiveResObj._id !== null) || false;
		console.log("[dbAtlas] @ getFirstGiveawayLive // isLive==" + isLive);

		if (isLive) {
			return isLiveResObj;
		} else {
			return null;
		}
	} catch (e) {
		console.error(`[dbAtlas]**ERR @ getFirstGiveawayLive: ${e.message}`);
		throw e;
	}
};

// ..........................................................................................
// _eventId == "{guildId}-{eventName}"
// -> returns alreadyClaimed
const checkUserAlreadyClaimedKey = async (_eventId, _discordId) => {
	console.log(`[dbAtlas] @ checkUserAlreadyClaimedKey // eventId==${_eventId}`);

	if (!_discordId) {
		console.error("[dbAtlas]**ERR @ checkUserAlreadyClaimedKey: !discordId");
		return;
	}

	// ------------------------
	const col = await getGiveawaysCol();

	// Find existing entry
	const discordQuery = {
		_id: _eventId, // "{discordId}-{eventName}"
		"claimersArr.discordId": _discordId,
	};
	const opts = getProjOptsIdOnly();
	const existingRes = await col.findOne(discordQuery, opts);

	// console.log("[dbAtlas] @ checkUserAlreadyClaimedKey: res==" + i42Common.JsonStringify(existingRes) +
	//     " // query==" + i42Common.JsonStringify(discordQuery));

	const alreadyClaimed = (existingRes && existingRes._id !== null) || false;
	const isAuthedMod = await checkHasModRoleFromDiscordId(_discordId);

	console.log("[dbAtlas] @ checkUserAlreadyClaimedKey // alreadyClaimed==" + alreadyClaimed);
	if (isAuthedMod) {
		// Pretend we didn't claim it to test multiple times
		return false;
	} else {
		return alreadyClaimed;
	}
};

// ..........................................................................................
// Checks to ensure discordId does not yet have a key >> then grabs next key.
// => returns steamKey:string
// => (!) returns "NO_KEYS" if out of keys, returns null if the user already claimed
const getNextGiveawayKey = async (_eventId, _discordId, _embedMsgId, _channelId) => {
	console.log("[dbAtlas] @ getGiveawayKey");

	if (!_eventId || !_discordId) {
		return console.error("[dbAtlas]**ERR @ getNextGiveawayKey: !eventId || !discordId");
	}

	// ------------------------
	const col = await getGiveawaysCol();
	let steamKey = await getNextGiveawaySteamKey(_eventId, col);

	// Ensure this is an actual key.
	if (!steamKey) {
		// exports.updateCloseGiveaway(col, embedMsgId, channelId, eventId);
		// throw('Gah, all available keys have been claimed!');
		steamKey = "NO_KEYS";
		return steamKey; // Soft fail
	}

	// ------------------------
	// Pull (remove) that same key ASAP *before* delivering
	// https://docs.mongodb.com/manual/reference/operator/update/pull/
	const isSuccess = await removeGiveawaySteamKey(_eventId, col, steamKey);

	if (!isSuccess) {
		throw "[dbAtlas]**ERR @ getNextGiveawayKey removeGiveawaySteamKey !isSuccess";
	}

	// Success!
	return steamKey;
};

// ...........................................................................................
// -> returns "{guildId}-{eventName}"
const getEventId = (_guildId, _eventName) => `${_guildId}-${_eventName}`;

// ...........................................................................................
// -> returns { guildId, eventName }
const splitEventId = (_eventId) => {
	return {
		guildId: _eventId.split("-")[0],
		eventName: _eventId.split("-")[1],
	};
};

// ..........................................................................................
// const eventId = getEventId(reactorMemberGuildId, _eventName);
// Returns isSuccess
const closeGiveawayDB = async (_eventId, _reason) => {
	try {
		console.log(`[dbAtlas] @ closeGiveawayDB // eventId==${_eventId}`);

		const col = await getGiveawaysCol();
		const query = { _id: _eventId };

		const endMoment = new moment.utc();
		const updateObj = {
			isLive: false,
			"dates.endDateFriendly": endMoment.format("dddd, MMMM Do YYYY, h:mm:ss a"),
			"dates.endDateObj": endMoment.toDate(),
			endReason: _reason,
		};

		console.log(`[dbAtlas] @ closeGiveawayDB // updateObj==${JsonStringify(updateObj)}`);
		const resObj = await col.updateOne(query, {
			$set: updateObj,
		});

		return checkDbResNoErr(resObj);
	} catch (e) {
		console.error(`[dbAtlas]**ERR @ closeGiveawayDB: ${e}`);
	}
};

// ..........................................................................................
// $pull from db -- returns isSuccess:bool
const removeGiveawaySteamKey = async (_eventId, _col, _key) => {
	console.log(`[dbAtlas] @ removeGiveawaySteamKey // key=='${_key}'`);

	// ------------------------
	const query = { _id: _eventId };
	const pullObj = { keysArr: _key };

	const resObj = await _col.updateOne(query, { $pull: pullObj });

	const isSuccess = checkDbResNoErr(resObj);
	// console.log("[dbAtlas] @ removeGiveawaySteamKey // isSuccess==" + isSuccess);
	return isSuccess;
};

// ..........................................................................................
const checkDbResNoErr = (_dbResObj) => {
	const isSuccess = _dbResObj?.acknowledged && _dbResObj.modifiedCount > 0;

	console.log(`[dbAtlas] @ checkDbResNoErr // success==${isSuccess}`);
	return isSuccess;
};

// ..........................................................................................
// Returns key str
const getNextGiveawaySteamKey = async (_eventId, _col) => {
	// $slice -1 (pull from top) the next key
	const query = { _id: _eventId };
	const findOpts = {
		projection: {
			_id: 1,
			keysArr: {
				$slice: -1, // Grab 1st arr element
			},
		},
	};

	const keyRes = await _col.findOne(query, findOpts);
	// console.log('[dbAtlas] @ getNextGiveawayKey: keyRes==' + i42Common.JsonStringify(keyRes));

	return keyRes?.keysArr?.[0] || "";
};

// ..........................................................................................
const claimGiveawayKey = async (
	_eventId, // "{discordId}-{eventName}"
	_discordId,
	_steamId,
	_steamKey,
) => {
	try {
		// console.log("[dbAtlas] @ claimGiveawayKey");
		if (!_eventId || !_discordId || !_steamId || !_steamKey) {
			console.log(
				"[dbAtlas]**ERR @ claimGiveawayKey: " +
					"!eventId || !discordId || !steamId || !steamKey",
			);
			return;
		}

		// ------------------------
		const query = { _id: _eventId }; // "{discordId}-{eventName}"
		const pushObj = {
			discordId: _discordId,
			steamId: _steamId,
			claimedDateObj: new Date(),
			claimedKey: _steamKey, // 'email' : arg2, // Optional
		};

		const col = await getGiveawaysCol();
		const resObj = await col.updateOne(query, {
			$push: {
				claimersArr: pushObj,
			},
		});

		return checkDbResNoErr(resObj);
	} catch (e) {
		console.error(`[dbAtlas]**ERR @ claimGiveawayKey: ${e}`);
	}
};

// ..........................................................................................
const throwDbErr = (_err) => {
	if (_err) {
		console.error(`[dbAtlas]**ERR @ Connect: ${_err}`);
	}
};

// ######################################################################################
// Main
initConnect();

// ######################################################################################
export {
	getEventId,
	splitEventId,
	claimGiveawayKey,
	getDB,
	getDiscordBlacklistsCol,
	getGiveawaysCol,
	checkIsUserDiscordBlacklisted,
	addToDiscordBlacklist,
	getFirstGiveawayLive,
	checkUserAlreadyClaimedKey,
	getNextGiveawayKey,
	closeGiveawayDB,
	upsertNewDragonclaimUser,
};
