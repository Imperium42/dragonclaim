// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
/**
 * check-docker.mjs
 * This script checks if Docker Desktop is running. It is designed to be run before the application starts.
 * If Docker Desktop is not running, it prints a message instructing the user how to start Docker Desktop and stops the application from starting.
 */

import { exec } from 'child_process';

try {
	exec('docker ps', (error, _stdout, _stderr) => {
		if (!error) {
			return;
		}

		console.error('Docker is not running: Start Docker-Desktop >> retry.');
		console.error('- Windows || MacOS: Search from apps list (no easy cli cmd).');
		console.error('- Linux: `sudo systemctl start docker`.');
		process.exit(1);
	});
}
catch {
	console.error('An error occurred while checking Docker status.');
	process.exit(1);
}
