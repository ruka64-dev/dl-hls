import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import consola from 'consola';
import { AsyncPool } from './utils/asyncPool.js';

async function downloadTsFiles(m3u8Url, outputPath) {
	await fs.ensureDir(outputPath);
	try {
		const asyncPool = new AsyncPool({
			limit: 5,
		});
		const response = await axios.get(m3u8Url);
		const playlistContent = response.data;

		const tsUrls = playlistContent
			.split('\n')
			.filter((line) => line.trim() && line.endsWith('.ts'))
			.map((line) => line.trim());

		const base = path.parse(m3u8Url).dir + '/';

		asyncPool.addPromise(async () => {
			consola.info(`Downloading ${path.parse(m3u8Url).base}...`);

			const writer = fs.createWriteStream(path.join(outputPath, path.parse(m3u8Url).base));

			const stream = await axios({
				method: 'get',
				url: m3u8Url,
				responseType: 'stream',
			});

			stream.data.pipe(writer);

			await new Promise((resolve, reject) => {
				writer.on('finish', () => {
					consola.info(`Download ${path.parse(m3u8Url).base}`);
					writer.close();
					resolve();
				});
				writer.on('error', reject);
			});
		});

		for (let i = 0; i < tsUrls.length; i++) {
			const url = base + tsUrls[i];
			const fileName = path.basename(url);
			const filePath = path.join(outputPath, fileName);

			const curr = i + 1;

			asyncPool.addPromise(async () => {
				consola.info(`Downloading ${curr}/${tsUrls.length}: ${fileName}...`);

				const writer = fs.createWriteStream(filePath);

				const stream = await axios({
					method: 'get',
					url,
					responseType: 'stream',
				});

				stream.data.pipe(writer);

				await new Promise((resolve, reject) => {
					writer.on('finish', () => {
						consola.success(`Downloaded ${fileName}`);
						writer.close();
						resolve();
					});
					writer.on('error', reject);
				});
			});
		}
		await asyncPool.run();

		consola.success(`Successfully downloaded ${tsUrls.length + 1} files!`);
	} catch (e) {
		consola.error(e);
		throw e;
	}
}

// 使用例
async function main() {
	const m3u8Url = await consola.prompt('Input m3u8 file url');
	const outputPath = `./files/${path.parse(m3u8Url).name}`;

	try {
		await downloadTsFiles(m3u8Url, outputPath);
	} catch (e) {
		consola.error(e);
	}
}

main();
