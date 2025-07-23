import { logStore } from '$lib/stores/logStore.js';

export class FileProcessor {
	constructor() {
		this.worker = null;
	}

	async processFile(file) {
		const fileSize = file.size;
		const fileSizeMB = fileSize / (1024 * 1024);

		console.log(`Processing file: ${file.name} (${this.formatFileSize(fileSize)})`);

		if (fileSizeMB < 5) {
			return this.processSmallFile(file);
		} else if (fileSizeMB < 50) {
			return this.processLargeFile(file);
		} else {
			throw new Error('File too large. Files over 50MB require server-side processing.');
		}
	}

	async processSmallFile(file) {
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			logStore.setLogs(data);
			return { success: true, entries: this.countEntries(data) };
		} catch (error) {
			throw new Error(`Failed to parse JSON: ${error.message}`);
		}
	}

	async processLargeFile(file) {
		return new Promise((resolve, reject) => {
			// Create worker
			this.worker = new Worker(
				new URL('../workers/jsonParser.js', import.meta.url),
				{ type: 'module' }
			);

			let entries = [];
			let totalEntries = 0;

			this.worker.onmessage = (event) => {
				const { type, data, entry, error, totalEntries: total } = event.data;
				
				switch (type) {
					case 'ENTRY':
						entries.push(entry);
						// Update store periodically to show progress
						if (entries.length % 100 === 0) {
							logStore.setLogs([...entries]);
						}
						break;
						
					case 'PROGRESS':
						console.log(`Processed ${data.processed} entries...`);
						break;
						
					case 'COMPLETE':
						totalEntries = total;
						logStore.setLogs(entries);
						this.cleanup();
						resolve({ 
							success: true, 
							entries: totalEntries,
							method: 'streaming'
						});
						break;
						
					case 'ERROR':
						this.cleanup();
						reject(new Error(error));
						break;
				}
			};

			this.worker.onerror = (error) => {
				this.cleanup();
				reject(new Error(`Worker error: ${error.message}`));
			};

			// Start processing
			this.worker.postMessage({
				type: 'PARSE_FILE',
				data: { file }
			});
		});
	}

	cleanup() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
	}

	countEntries(data) {
		if (Array.isArray(data)) {
			return data.length;
		} else if (typeof data === 'object' && data !== null) {
			return Object.keys(data).length;
		}
		return 0;
	}

	formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}