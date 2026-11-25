// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ################################################################################
// api.js
// ################################################################################

import favicon from "serve-favicon";
import { join } from "path";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import "./i42Common.js";
import * as url from "url"; // __dirname workaround
import discordMain from "./discord/discordMain.js";
import indexBaseRouter from "../routes/index.js";
import discordBaseRouter from "../routes/discord/v1/index.js";
import steamBaseRouter from "../routes/steam/v1/index.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url)); // https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/
const app = express();

// Behind a reverse proxy (Coolify/Traefik), set TRUST_PROXY to the hop count (usually 1) so
// rate limiting sees real client IPs. Leave unset when exposed directly: trusting
// X-Forwarded-For without a proxy would let clients spoof their IP and dodge the limits.
const trustProxy = Number.parseInt(process.env.TRUST_PROXY ?? "", 10);
if (Number.isInteger(trustProxy) && trustProxy > 0) {
	app.set("trust proxy", trustProxy);
}

// Rate limits for the unauthenticated auth/portal surface (in-memory, per instance)
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 60,
	standardHeaders: "draft-8",
	legacyHeaders: false,
});
const configLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: "draft-8",
	legacyHeaders: false,
});

const pathToRoot = join(__dirname, "../", "../");

// ####################################################################################
const configApi = () => {
	const pathToPublicDir = join(__dirname, "../", "../", "public/");

	// Security headers. CSP allows https: images (views hotlink logos); no scripts are served.
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: { "img-src": ["'self'", "data:", "https:"] },
			},
		}),
	);

	// Favicon
	const favIconPath = pathToPublicDir + join("images", "favicon-256.png");
	app.use(favicon(favIconPath));

	// Set template engine (NOTE: jade is now called 'pug')
	app.set("view engine", "pug");

	const viewsPath = pathToRoot + join("components", "views");
	app.set("views", viewsPath);

	// uncomment after placing your favicon in /public
	// bot.use(favicon(join(__dirname, 'public', 'favicon.ico')));
	// bot.use(logger('dev')); // too bloaty

	app.use(
		express.urlencoded({
			extended: true,
		}),
	);
	app.use(express.json());

	// https://flaviocopes.com/express-post-query-variables/
	// bot.use(express.json());
	// bot.use(express.urlencoded());
	app.use(cookieParser());
	app.use(express.static(pathToPublicDir));
	console.log(`[api] @ initBot: Starting...`);

	// // cors
	// // https://www.geeksforgeeks.org/how-to-allow-cors-in-express/
	// // https://www.npmjs.com/package/cors
	// const whitelist = [
	// 	'localhost',
	// 	'https://api.imperium42.com',
	// 	// TODO: Discord OAuth2. Need cors research. Wildcards?
	// ];
	//
	// const corsOptions = {
	// 	origin: whitelist,
	// 	optionsSuccessStatus: 200,
	// };
	//
	// app.use(cors(corsOptions));

	// CORS is configured per router (see routes/discord/v1/portal), never globally: a
	// wildcard Access-Control-Allow-Origin would let any website drive this API.
};

// https://stackoverflow.com/questions/69831466/express-using-multi-nested-routers
// https://usecsv.com/community/semantic-versioning
const setBaseRoutes = () => {
	console.log("[api] @ setBaseRoutes: Initializing...");

	const baseUrl = "";
	app.use(baseUrl, indexBaseRouter);
	app.use(`${baseUrl}/discord/v1/portal/config`, configLimiter);
	app.use(`${baseUrl}/discord/v1/portal`, authLimiter);
	app.use(`${baseUrl}/discord/v1/giveaway`, authLimiter);
	app.use(`${baseUrl}/discord`, discordBaseRouter);
	app.use(`${baseUrl}/steam`, steamBaseRouter);
};

const set404Routes = () => {
	app.use((req, res, _next) => {
		res.status(404);

		// respond with html page
		if (req.accepts("html")) {
			res.render("404", { url: req.url });
			return;
		}

		// respond with json
		if (req.accepts("json")) {
			res.send({ error: "Not found" });
			return;
		}

		// default to plain-text. send()
		res.type("txt").send("Not found");
	});

	// catch 404 and forward to error handler
	app.use((req, res, next) => {
		const err = new Error("Not Found");
		err.status = 404;
		next(err);
	});
};

const handleDisplayErrFallback = (_res, _e) => {
	console.error(
		"[API]**ERR @ setErrHandlers (prod): Did you change the views path, " +
			`or missing tsc copy files @ package.json 'build' cmd?? // e==${_e}`,
	);

	_res.status(500).json({ error: "Couldnt find err views. @Dev, see api.js" });
};

const setErrHandlers = () => {
	// Stack traces only outside production (they leak file paths/internals to the public)
	const isProd = process.env.NODE_ENV === "production";
	app.use((err, req, res, _next) => {
		const status = err.status || 500;
		res.status(status);

		if (isProd) {
			console.error(`[api]**ERR @ ${req.method} ${req.path}: ${err.stack || err}`);
		}

		try {
			res.render("error", {
				message: isProd && status >= 500 ? "Internal Server Error" : err.message,
				error: isProd ? { status } : err,
			});
		} catch (e) {
			handleDisplayErrFallback(res, e);
		}
	});
};

const initApps = () => {
	console.log("[api] @ initApps: Initializing...");
	discordMain(); // Don't await!
};

// ####################################################################################
configApi();
setBaseRoutes();
initApps();
set404Routes();
setErrHandlers();
console.log(`[i42bot] Init ready - prepping routes...`);

// ####################################################################################
export default app; // module.exports: {
//  bot: express()
// }
