export class ExportUtils {
	static exportToCSV(data, filename = 'log-export.csv') {
		if (!data || !Array.isArray(data) || data.length === 0) {
			throw new Error('No data to export');
		}

		// Extract all unique keys from the data
		const allKeys = new Set();
		data.forEach(item => {
			Object.keys(this.flattenObject(item)).forEach(key => allKeys.add(key));
		});

		const headers = Array.from(allKeys);
		const csvContent = this.generateCSVContent(data, headers);
		this.downloadFile(csvContent, filename, 'text/csv');
	}

	static exportToJSON(data, filename = 'log-export.json') {
		if (!data) {
			throw new Error('No data to export');
		}

		const jsonContent = JSON.stringify(data, null, 2);
		this.downloadFile(jsonContent, filename, 'application/json');
	}

	static exportToExcel(data, filename = 'log-export.xlsx') {
		// Simple Excel export using CSV format with .xlsx extension
		// For full Excel support, would need a library like SheetJS
		this.exportToCSV(data, filename.replace('.xlsx', '.csv'));
		console.warn('Excel export converted to CSV format. For full Excel support, integrate SheetJS library.');
	}

	static flattenObject(obj, prefix = '') {
		const flattened = {};
		
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const value = obj[key];
				const newKey = prefix ? `${prefix}.${key}` : key;
				
				if (value === null || value === undefined) {
					flattened[newKey] = '';
				} else if (typeof value === 'object' && !Array.isArray(value)) {
					// Recursively flatten nested objects
					Object.assign(flattened, this.flattenObject(value, newKey));
				} else if (Array.isArray(value)) {
					// Convert arrays to JSON strings
					flattened[newKey] = JSON.stringify(value);
				} else {
					flattened[newKey] = String(value);
				}
			}
		}
		
		return flattened;
	}

	static generateCSVContent(data, headers) {
		const escapeCsvValue = (value) => {
			if (value === null || value === undefined) return '';
			const stringValue = String(value);
			if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
				return `"${stringValue.replace(/"/g, '""')}"`;
			}
			return stringValue;
		};

		// Create header row
		let csvContent = headers.map(escapeCsvValue).join(',') + '\n';

		// Create data rows
		data.forEach(item => {
			const flatItem = this.flattenObject(item);
			const row = headers.map(header => escapeCsvValue(flatItem[header] || '')).join(',');
			csvContent += row + '\n';
		});

		return csvContent;
	}

	static downloadFile(content, filename, mimeType) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		
		// Clean up the URL object
		setTimeout(() => URL.revokeObjectURL(url), 100);
	}

	static generateSummaryReport(data) {
		if (!data || !Array.isArray(data)) {
			return 'No data available for summary';
		}

		const report = {
			totalEntries: data.length,
			dateRange: this.getDateRange(data),
			actionSummary: this.getActionSummary(data),
			stepSummary: this.getStepSummary(data),
			generatedAt: new Date().toISOString()
		};

		return report;
	}

	static getDateRange(data) {
		const timestamps = data
			.map(item => this.parseTimestamp(item.timestamp || item.id))
			.filter(ts => ts !== null)
			.sort();

		if (timestamps.length === 0) {
			return { start: null, end: null };
		}

		return {
			start: timestamps[0].toISOString(),
			end: timestamps[timestamps.length - 1].toISOString(),
			duration: timestamps[timestamps.length - 1] - timestamps[0] + 'ms'
		};
	}


	static getActionSummary(data) {
		const actionCounts = {};
		data.forEach(item => {
			if (item.actions && Array.isArray(item.actions)) {
				item.actions.forEach(action => {
					const actionType = action.action || 'unknown';
					actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
				});
			}
		});
		return actionCounts;
	}

	static getStepSummary(data) {
		const stepCounts = {};
		data.forEach(item => {
			if (item.test_steps && Array.isArray(item.test_steps)) {
				item.test_steps.forEach(step => {
					const stepName = step.step_name || 'unknown';
					stepCounts[stepName] = (stepCounts[stepName] || 0) + 1;
				});
			}
		});
		return stepCounts;
	}

	static parseTimestamp(timestamp) {
		if (!timestamp) return null;
		
		// Handle format: 20250723205312
		if (typeof timestamp === 'string' && timestamp.length === 14) {
			const year = timestamp.substring(0, 4);
			const month = timestamp.substring(4, 6);
			const day = timestamp.substring(6, 8);
			const hour = timestamp.substring(8, 10);
			const minute = timestamp.substring(10, 12);
			const second = timestamp.substring(12, 14);
			
			return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
		}
		
		// Try to parse as regular date
		const parsed = new Date(timestamp);
		return isNaN(parsed.getTime()) ? null : parsed;
	}
}