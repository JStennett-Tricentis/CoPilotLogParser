import { logStore } from '$lib/stores/logStore.js';
import JSZip from 'jszip';

export class FileProcessor {
	constructor() {
		this.worker = null;
	}

	async processFile(file) {
		const fileSize = file.size;
		const fileSizeMB = fileSize / (1024 * 1024);

		console.log(`Processing file: ${file.name} (${this.formatFileSize(fileSize)})`);

		// Check if it's a ZIP file
		if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
			return this.processZipFile(file);
		}

		if (fileSizeMB < 5) {
			return this.processSmallFile(file);
		} else if (fileSizeMB < 50) {
			return this.processLargeFile(file);
		} else {
			throw new Error('File too large. Files over 50MB require server-side processing.');
		}
	}

	async processZipFile(file) {
		try {
			console.log('Processing ZIP file...');
			const zip = new JSZip();
			const zipData = await zip.loadAsync(file);
			
			// Look for agent logs JSON files
			const logFiles = Object.keys(zipData.files).filter(name => 
				name.includes('agent_logs.json') || name.includes('filtered_agent_logs.json')
			);
			
			if (logFiles.length === 0) {
				throw new Error('No agent log files found in ZIP');
			}
			
			// Use the first found log file (prefer agent_logs.json over filtered)
			const logFileName = logFiles.find(name => name.includes('agent_logs.json')) || logFiles[0];
			const logFile = zipData.files[logFileName];
			
			console.log(`Found log file: ${logFileName}`);
			
			// Extract and parse the JSON
			const jsonText = await logFile.async('text');
			const data = JSON.parse(jsonText);
			
			// Extract screenshots and create a map
			const screenshots = {};
			const screenshotFiles = Object.keys(zipData.files).filter(name => 
				name.includes('screenshots/') && (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))
			);
			
			console.log(`Found ${screenshotFiles.length} screenshot files`);
			
			// Process screenshots
			for (const screenshotPath of screenshotFiles) {
				const file = zipData.files[screenshotPath];
				const fileName = screenshotPath.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
				
				// Convert to blob URL for display
				const blob = await file.async('blob');
				const url = URL.createObjectURL(blob);
				screenshots[fileName] = url;
			}
			
			// Store both logs and screenshots
			logStore.setLogs(data, screenshots);
			
			return { 
				success: true, 
				entries: this.countEntries(data),
				screenshots: Object.keys(screenshots).length,
				method: 'zip'
			};
		} catch (error) {
			throw new Error(`Failed to process ZIP file: ${error.message}`);
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

	// Process file for comparison view without using global store
	async processFileForCompare(file) {
		const fileSize = file.size;
		const fileSizeMB = fileSize / (1024 * 1024);

		console.log(`Processing file for comparison: ${file.name} (${this.formatFileSize(fileSize)})`);

		// Check if it's a ZIP file
		if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
			return this.processZipFileForCompare(file);
		}

		// For JSON files, just parse and return
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			
			// Import workstep parser
			const { WorkstepParser } = await import('./workstepParser.js');
			
			// Process and return the parsed data
			const entries = Array.isArray(data) ? data : Object.values(data);
			return WorkstepParser.groupScreenshotEntries(entries);
		} catch (error) {
			throw new Error(`Failed to parse JSON: ${error.message}`);
		}
	}

	async processZipFileForCompare(file) {
		try {
			console.log('Processing ZIP file for comparison...');
			const zip = new JSZip();
			const zipData = await zip.loadAsync(file);
			
			// Look for agent logs JSON files
			const logFiles = Object.keys(zipData.files).filter(name => 
				name.includes('agent_logs.json') || name.includes('filtered_agent_logs.json')
			);
			
			if (logFiles.length === 0) {
				throw new Error('No agent log files found in ZIP');
			}
			
			// Use the first found log file (prefer agent_logs.json over filtered)
			const logFileName = logFiles.find(name => name.includes('agent_logs.json')) || logFiles[0];
			const logFile = zipData.files[logFileName];
			
			console.log(`Found log file: ${logFileName}`);
			
			// Extract and parse the JSON
			const jsonText = await logFile.async('text');
			const data = JSON.parse(jsonText);
			
			// Extract screenshots and create a map
			const screenshots = {};
			const screenshotFiles = Object.keys(zipData.files).filter(name => 
				name.includes('screenshots/') && (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))
			);
			
			// Process screenshots
			for (const screenshotPath of screenshotFiles) {
				const file = zipData.files[screenshotPath];
				const fileName = screenshotPath.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
				
				// Convert to blob URL for display
				const blob = await file.async('blob');
				const url = URL.createObjectURL(blob);
				screenshots[fileName] = url;
			}
			
			// Import workstep parser
			const { WorkstepParser } = await import('./workstepParser.js');
			
			// Process entries and attach screenshot URLs
			const entries = Array.isArray(data) ? data : Object.values(data);
			const processedEntries = WorkstepParser.groupScreenshotEntries(entries);
			
			// Attach screenshot URLs to entries
			processedEntries.forEach(entry => {
				if (entry.screenshot_id && screenshots[entry.screenshot_id]) {
					entry.screenshotUrl = screenshots[entry.screenshot_id];
				}
				// For combined entries, use the original screenshot ID
				if (entry.originalScreenshotId && screenshots[entry.originalScreenshotId]) {
					entry.screenshotUrl = screenshots[entry.originalScreenshotId];
				}
			});
			
			return processedEntries;
		} catch (error) {
			throw new Error(`Failed to process ZIP file: ${error.message}`);
		}
	}
}