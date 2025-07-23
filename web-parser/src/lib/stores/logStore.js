import { writable, derived } from 'svelte/store';

export const rawLogs = writable(null);
export const filters = writable({
	sessionId: '',
	stepName: '',
	screenName: '',
	timeRange: { start: '', end: '' },
	searchText: ''
});

export const parsedLogs = derived(rawLogs, ($rawLogs) => {
	if (!$rawLogs) return [];
	
	// Parse different log formats
	if (Array.isArray($rawLogs)) {
		return $rawLogs;
	}
	
	// Handle full logs format (timestamp keys)
	if (typeof $rawLogs === 'object' && !Array.isArray($rawLogs)) {
		return Object.entries($rawLogs).map(([timestamp, entry]) => ({
			timestamp,
			...entry,
			id: timestamp
		}));
	}
	
	return [];
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
	setLogs: (logs) => rawLogs.set(logs),
	applyFilters: (newFilters) => filters.update(current => ({ ...current, ...newFilters })),
	clearLogs: () => rawLogs.set(null),
	clearFilters: () => filters.set({
		sessionId: '',
		stepName: '',
		screenName: '',
		timeRange: { start: '', end: '' },
		searchText: ''
	})
};