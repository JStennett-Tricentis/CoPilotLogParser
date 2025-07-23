// Web Worker for parsing large JSON files
import StreamingJsonParser from '@streamparser/json-whatwg';

self.onmessage = async function(event) {
	const { type, data } = event.data;
	
	if (type === 'PARSE_FILE') {
		try {
			await parseFile(data.file);
		} catch (error) {
			self.postMessage({
				type: 'ERROR',
				error: error.message
			});
		}
	}
};

async function parseFile(file) {
	const stream = file.stream();
	const parser = new StreamingJsonParser();
	
	let parsedData = null;
	let entryCount = 0;
	
	// Send progress updates
	const progressInterval = setInterval(() => {
		self.postMessage({
			type: 'PROGRESS',
			processed: entryCount
		});
	}, 500);
	
	parser.onValue = (value, key, parent) => {
		// Handle different JSON structures
		if (parent === undefined) {
			// Root object
			parsedData = value;
		} else if (key && typeof key === 'string') {
			// Timestamp-keyed entries (full logs format)
			entryCount++;
			
			// Send individual entries for streaming
			self.postMessage({
				type: 'ENTRY',
				entry: {
					timestamp: key,
					...value,
					id: key
				}
			});
		}
	};
	
	parser.onError = (error) => {
		clearInterval(progressInterval);
		self.postMessage({
			type: 'ERROR',
			error: error.message
		});
	};
	
	try {
		const reader = stream.getReader();
		
		while (true) {
			const { done, value } = await reader.read();
			
			if (done) break;
			
			// Convert Uint8Array to string
			const text = new TextDecoder().decode(value);
			parser.write(text);
		}
		
		parser.end();
		
		clearInterval(progressInterval);
		
		self.postMessage({
			type: 'COMPLETE',
			totalEntries: entryCount,
			data: parsedData
		});
		
	} catch (error) {
		clearInterval(progressInterval);
		self.postMessage({
			type: 'ERROR',
			error: error.message
		});
	}
}