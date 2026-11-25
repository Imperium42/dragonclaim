// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ###############################################################################
// test/app.test.js
// Runs against the compiled output in dist/ (`bun run test` builds first), since
// src/ mixes .ts files that Node can't import via their emitted .js specifiers.
// https://www.chaijs.com/api/bdd/
// ###############################################################################

import { describe, it } from "mocha";
import { config as chaiConfig, expect } from "chai";
import { Client, GatewayIntentBits, IntentsBitField } from "discord.js";
import { client } from "../dist/components/controllers/discord/discordClient.js";

chaiConfig.includeStack = true; // turn on stack trace

// ###############################################################################
describe("Testing the Discord Client", () => {
	it("should create a client without logging in", () => {
		expect(client).to.be.instanceOf(Client);
		expect(client.isReady()).to.equal(false);
	});

	it("should register the gateway intents the bot relies on", () => {
		const intents = new IntentsBitField(client.options.intents);

		expect(intents.has(GatewayIntentBits.Guilds)).to.equal(true);
		expect(intents.has(GatewayIntentBits.GuildMessages)).to.equal(true);
		expect(intents.has(GatewayIntentBits.MessageContent)).to.equal(true);
		expect(intents.has(GatewayIntentBits.DirectMessages)).to.equal(true);
	});
});
