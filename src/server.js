// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// server.js
import {
	getCachedConfigJson,
	redactConfig,
	JsonStringify,
} from "./components/controllers/i42Common.js";
import fs from "fs";
import { stringify as yamlStringify } from "yaml";
import https from "https"; // https module to create a ssl enabled server
import http from "http";
import app from "./components/controllers/api.js"; // The main app after server is made

const { selfHosted } = getCachedConfigJson();
const { printThisJsonOnInit, printThisYamlOnInit, localServers, tls } = selfHosted;
const { privKeyPemPath, fullChainPemPath } = tls;
const { port } = localServers;
const normalizedPort = normalizePort(port);
app.set("port", normalizedPort);

/**
 * Create HTTPS server.
 */
const options = {};

const isTls =
	!!privKeyPemPath &&
	!!fullChainPemPath &&
	fs.existsSync(privKeyPemPath) &&
	fs.existsSync(fullChainPemPath);

console.log(`[server] isTls(https)==${isTls}`);

if (isTls) {
	options.key = fs.readFileSync(privKeyPemPath);
	options.cert = fs.readFileSync(fullChainPemPath);
}

let server; // initd @ createServer

// #############################################################################################################
/**
 * Listen on provided port, on all network interfaces.
 */
const createHttpsServer = () => {
	const selectedProtocol = isTls ? https : http;
	server = selectedProtocol
		.createServer(options, app)
		.listen(normalizedPort)
		.on("error", onError)
		.on("listening", onListening);
};

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(_val) {
	const _port = parseInt(_val, 10);

	if (isNaN(_port)) {
		// named pipe
		return _val;
	}

	if (_port >= 0) {
		// port number
		return _port;
	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(_error) {
	if (_error.syscall !== "listen") {
		throw _error;
	}

	const bind =
		typeof normalizedPort === "string" ? `Pipe ${normalizedPort}` : `Port ${normalizedPort}`;

	// handle specific listen errors with friendly messages
	switch (_error.code) {
		case "EACCES":
			console.error(`${bind} requires elevated privileges`);
			process.exit(1);
			break;

		case "EADDRINUSE":
			console.error(`${bind} is already in use`);
			process.exit(1);
			break;

		default:
			throw _error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
	const addr = server.address();
	// const bind = typeof addr === 'string'
	// 	? `pipe ${addr}`
	// 	: `port ${addr.port}`;

	const httpPrefix = isTls ? "https://" : "http://";
	console.log(`[server] Listening on ${httpPrefix}localhost:${addr.port}`);
}

const configSanityCheck = () => {
	try {
		// Optional logs
		if (printThisJsonOnInit) {
			console.log(
				"[server] @ printLogs: printThisJsonOnInit (secrets redacted)==" +
					`\n---\n${JsonStringify(redactConfig(getCachedConfigJson()))}\n---\n`,
			);
		}

		if (printThisYamlOnInit) {
			const prettify = true;
			console.log(
				"[server] @ printLogs: printThisYamlOnInit (secrets redacted)==" +
					`\n---\n${yamlStringify(redactConfig(getCachedConfigJson()), { indent: prettify ? 2 : 0 })}\n---\n`,
			);
		}
	} catch (e) {
		throw new Error(
			"[server]**ERR @ configSanityCheck " +
				`(server won't start until data/config.yml is fixed): err==${e}`,
			{ cause: e },
		);
	}
};

const catchUnhandledPromiseRejections = () => {
	process.on("unhandledRejection", (reason, promise) => {
		console.log("Unhandled Rejection at:", promise, "reason:", reason);
		// Application specific logging, throwing an error, or other logic here
	});
};

// #############################################################################################################
catchUnhandledPromiseRejections();
configSanityCheck(); // Fatal err, if settings is corrupt.
createHttpsServer();
