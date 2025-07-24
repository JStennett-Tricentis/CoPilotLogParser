import { writable, derived } from 'svelte/store';
import { WorkstepParser } from '$lib/utils/workstepParser.js';

export const rawLogs = writable(null);
export const screenshots = writable({});
export const filters = writable({
	sessionId: '',
	stepName: '',
	screenName: '',
	timeRange: { start: '', end: '' },
	searchText: ''
});

export const parsedLogs = derived(rawLogs, ($rawLogs) => {
	if (!$rawLogs) return [];
	
	let entries = [];
	
	// Parse different log formats
	if (Array.isArray($rawLogs)) {
		entries = $rawLogs;
	} else if (typeof $rawLogs === 'object' && !Array.isArray($rawLogs)) {
		// Handle full logs format (timestamp keys)
		entries = Object.entries($rawLogs).map(([timestamp, entry]) => ({
			timestamp,
			...entry,
			id: timestamp
		}));
	}
	
	// Apply screenshot grouping to reduce number of entries
	if (entries.length > 0) {
		entries = WorkstepParser.groupScreenshotEntries(entries);
	}
	
	return entries;
});

export const filteredLogs = derived(
	[parsedLogs, filters],
	([$parsedLogs, $filters]) => {
		if (!$parsedLogs.length) return [];
		
		return $parsedLogs.filter(entry => {
			// Session ID filter
			if ($filters.sessionId && !entry.session_id?.includes($filters.sessionId)) {
				return false;
			}
			
			// Step name filter
			if ($filters.stepName) {
				const hasStep = entry.test_steps?.some(step => 
					step.step_name?.toLowerCase().includes($filters.stepName.toLowerCase())
				) || entry.worksteps?.includes($filters.stepName);
				if (!hasStep) return false;
			}
			
			// Screen name filter
			if ($filters.screenName) {
				const hasScreen = entry.test_steps?.some(step => 
					step.screen_name?.toLowerCase().includes($filters.screenName.toLowerCase())
				);
				if (!hasScreen) return false;
			}
			
			// Search text filter
			if ($filters.searchText) {
				const searchLower = $filters.searchText.toLowerCase();
				const entryText = JSON.stringify(entry).toLowerCase();
				if (!entryText.includes(searchLower)) return false;
			}
			
			return true;
		});
	}
);

export const logStore = {
	setLogs: (logs, screenshotMap = {}) => {
		rawLogs.set(logs);
		screenshots.set(screenshotMap);
	},
	applyFilters: (newFilters) => filters.update(current => ({ ...current, ...newFilters })),
	clearLogs: () => {
		rawLogs.set(null);
		screenshots.set({});
	},
	clearFilters: () => filters.set({
		sessionId: '',
		stepName: '',
		screenName: '',
		timeRange: { start: '', end: '' },
		searchText: ''
	})
};