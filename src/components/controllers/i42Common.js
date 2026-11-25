// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// #############################################################################################################
// i42Common.js
// #############################################################################################################
import moment from "moment";
import { randomUUID } from "crypto";
import {
	parse as ymlParse,
	// stringify as ymlStringify,
} from "yaml";
import path from "path";
import fs from "fs";
import url from "url";

// https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const getProjSrcOrDistRoot = () => path.join(__dirname, "..", ".."); // @ "/src" || "/dist"
const getProjRoot = () => path.join(getProjSrcOrDistRoot(), ".."); // @ "/"
const getRootDataPath = () => path.join(getProjRoot(), "data"); // @ "/src/data"

// Determine config file based on environment
const getPathToConfigYml = () => {
	// Check if startup script set a specific config file
	if (process.env.DRAGONCLAIM_CONFIG_FILE) {
		return process.env.DRAGONCLAIM_CONFIG_FILE;
	}
	// Otherwise use convention: production uses config.prod.yml
	const configFileName = process.env.NODE_ENV === "production" ? "config.prod.yml" : "config.yml";
	return path.join(getRootDataPath(), configFileName);
};

const getPathToConfigTemplateYml = () => path.join(getRootDataPath(), "config.template.yml");
// const { privKeyPemPath, fullChainPemPath } = tls;

let cachedConfigJson; // This will be updated, don't export this! Get from func
let cachedConfigJsonTemplate;

// ...........................................................................................
// Sets and returns `cachedConfigJson` from yml read. **File read intensive; use sparingly**
// This parses config.yml
const refreshCachedConfigJson = () => {
	// Read yml
	const ymlData = fs.readFileSync(getPathToConfigYml(), "utf8");
	const jsonData = ymlParse(ymlData);

	cachedConfigJson = jsonData; // Update cache from live yml we just read
	return cachedConfigJson;
};

// ...........................................................................................
// Sets `cachedConfigJson` for new config templates
const refreshCachedConfigTemplateJson = () => {
	// Read yml
	const ymlData = fs.readFileSync(getPathToConfigTemplateYml(), "utf8");
	const jsonData = ymlParse(ymlData);

	cachedConfigJsonTemplate = jsonData; // Update cache from live yml we just read
	return cachedConfigJsonTemplate;
};

const getCachedConfigJson = (useTemplate = false) => {
	return useTemplate ? cachedConfigJsonTemplate : cachedConfigJson;
};

const getCachedConfigJsonStr = (_prettify) => {
	const json = refreshCachedConfigJson();
	return _prettify ? JSON.stringify(json, null, 2) : JSON.stringify(json);
};

// ...........................................................................................
// Misc Functions
// Lazy JSON.Stringify() for pretty logs and debugging
const JsonStringify = (obj, pretty) => {
	if (!pretty) {
		return JSON.stringify(obj);
	} // js obj >> json
	else {
		return JSON.stringify(obj, null, 2);
	} // Better for logs+humans
};

// ...........................................................................................
// Trims ALL whitespace from str
const superTrim = (str) => {
	return str.replace(/\s+/g, "");
};

// ...........................................................................................
// Checks for empty object
const checkForEmptyObj = (obj) => {
	const isEmptyObj = Object.keys(obj).length === 0 && obj.constructor === Object;
	console.log("[Common] isEmptyObj == " + isEmptyObj);
	return isEmptyObj;
};

// ...........................................................................................
// Simple date for logs
const getDateTime = () => {
	return new Date()
		.toISOString()
		.replace(/T/, " ") // replace T with a space
		.replace(/\..+/, ""); // delete the dot and everything after
};

// ...........................................................................................
// Get IP from req header
const getIP = (req) => {
	const ipInfo =
		req.headers["x-real-ip"] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress ||
		req.headers["x-cluster-client-ip"] ||
		req.headers["x-forwarded-for"];

	console.log(ipInfo);
	return ipInfo;
};

// ...............................................
// by space
// https://stackoverflow.com/questions/4878756/how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
const makeEveryWordUppercase = (str) => {
	return str
		.toLowerCase()
		.split(" ")
		.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
		.join(" ");
};

// ...............................................
// https://flaviocopes.com/how-to-uppercase-first-letter-javascript/
const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// ...............................................
// Returns moment obj (GMT+8)
// "Sunday, February 14th 2010 @ 3:25:50 pm"
// https://momentjs.com/docs/#/displaying/
const getFriendlyTaiwanTime = () => {
	return moment().format("dddd, MMMM Do @ h:mm:ss a (+8)");
};

// ...............................................
// Returns moment obj (UTC)
// "Sunday, February 14th 2010 @ 3:25:50 pm"
// https://momentjs.com/docs/#/displaying/
const getFriendlyUTCTime = () => {
	return moment().utc().format("dddd, MMMM Do @ h:mm:ss a (UTC)");
};

// ...............................................
// https://www.freecodecamp.org/news/the-ultimate-guide-to-web-scraping-with-node-js-daa2027dcd3/
// Rejects on network errors and non-2xx responses (matches the old request-promise behavior)
const scrapeSite = async (_url) => {
	try {
		const res = await fetch(_url);
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} ${res.statusText} @ ${_url}`);
		}
		return await res.text();
	} catch (err) {
		console.log(err);
		throw err;
	}
};

// ...........................................................................................
const truncateStr = (str, n) => {
	if (typeof n === "undefined" || str.length < n) {
		return str;
	} else {
		const subStr = str.substring(0, n - 3);
		return `${subStr}...`;
	}
};

// ........................................................................................
// Returns true if str contains substr
// Uses indexOf to check for substr exists
const checkIsString = (maybeStr) => {
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof
	const _type = typeof maybeStr;
	const isStr = _type === "string";

	return isStr;
};

// ........................................................................................
// https://stackoverflow.com/questions/784539/how-do-i-replace-all-line-breaks-in-a-string-with-br-elements
const getLineBreakMatch = () => {
	return /\r\n|\r|\n/g;
};

// ........................................................................................
// Cryptographically secure UUIDv4. Used for OAuth `state` and portal nonces, so it must
// be unguessable (Math.random() output is predictable from prior samples).
const generateUuid = () => randomUUID();

// ........................................................................................
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Validates untrusted input before it's used to build a Redis key
const isUuid = (_str) => typeof _str === "string" && UUID_RE.test(_str);

// ........................................................................................
// Escape untrusted text before concatenating it into HTML
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (_str) => String(_str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

// ........................................................................................
// Deep copy of a config with secret-looking values masked (for debug dumps). Never mutates.
const SECRET_KEY_RE = /secret|token|pass(word)?|apikey|api_key|webapikey|devapikey|^key$/i;
const redactConfig = (_val, _key = "") => {
	if (Array.isArray(_val)) {
		return _val.map((v) => redactConfig(v));
	}
	if (_val && typeof _val === "object") {
		return Object.fromEntries(Object.entries(_val).map(([k, v]) => [k, redactConfig(v, k)]));
	}
	if (typeof _val === "string" && SECRET_KEY_RE.test(_key)) {
		return "***";
	}
	return typeof _val === "string" && /:\/\//.test(_val) ? redactUri(_val) : _val;
};

// "redis://user:pass@host:6379" => "redis://***@host:6379" (safe to log)
const redactUri = (_uri) => String(_uri).replace(/\/\/[^/\s]*@/, "//***@"); // greedy: up to the last @ before the host

// ........................................................................................
const getHtmlContentType = () => {
	return { "content-type": "text/html; charset=utf-8" };
};

// ........................................................................................
// Great for printing unknown objs that may throw circular err
// https://stackoverflow.com/questions/11616630/how-can-i-print-a-circular-structure-in-a-json-like-format
const safeStringify = (obj, indent = 2) => {
	try {
		return JSON.stringify(obj, null, indent);
	} catch (err) {
		return `Error stringifying object: ${err.message}`;
	}
};

// ###############################################################################################
// main >>
refreshCachedConfigJson(); // Can be updated
refreshCachedConfigTemplateJson(); // Can't be updated

// ###############################################################################################
export {
	refreshCachedConfigJson,
	refreshCachedConfigTemplateJson,
	getCachedConfigJson,
	getCachedConfigJsonStr,
	JsonStringify,
	superTrim,
	checkForEmptyObj,
	getDateTime,
	getIP,
	makeEveryWordUppercase,
	capitalizeFirstLetter,
	getFriendlyTaiwanTime,
	getFriendlyUTCTime,
	scrapeSite,
	truncateStr,
	checkIsString,
	getLineBreakMatch,
	generateUuid,
	isUuid,
	escapeHtml,
	redactUri,
	redactConfig,
	getHtmlContentType,
	safeStringify,
	getPathToConfigYml,
	getRootDataPath,
};
