// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
import fs from 'fs-extra';

// data/ is NOT copied: it's read from the project root at runtime, and copying it would
// duplicate local secrets (data/dc-prod-secrets) into dist/.
const copyTasks = [
	{ src: 'src/public/css', dest: 'dist/public/css' },
	{ src: 'src/public/images', dest: 'dist/public/images' },
	{ src: 'src/components/views', dest: 'dist/components/views' },
];

async function performCopy() {
	console.log('Starting multi-threaded copy...');
	console.log('-------------------------------');

	const startTime = Date.now();

	console.time('Copy time');

	await Promise.all(
		copyTasks.map(async (task) => {
			try {
				await fs.ensureDir(task.dest);
				await fs.copy(task.src, task.dest, { overwrite: true });
				console.log(`Copied ${task.src} to ${task.dest}`);
			}
			catch (error) {
				console.error(`Error copying ${task.src} to ${task.dest}:`, error);
			}
		}),
	);

	console.timeEnd('Copy time');

	const durationInSeconds = (Date.now() - startTime) / 1000;
	console.log(`Copy operation completed in ${durationInSeconds.toFixed(2)} seconds.`);

	console.log('-------------------------------');
	console.log('Multi-threaded copy completed.');
}

performCopy();
