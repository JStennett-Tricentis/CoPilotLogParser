<script>
	import { createEventDispatcher } from 'svelte';
	import { filteredLogs, screenshots } from '$lib/stores/logStore.js';
	import VirtualTable from './VirtualTable.svelte';
	import { WorkstepParser } from '$lib/utils/workstepParser.js';
	
	const dispatch = createEventDispatcher();
	
	let viewMode = 'list'; // 'list' or 'table'
	
	function selectEntry(entry) {
		dispatch('entryselect', entry);
	}

	function formatTimestamp(timestamp) {
		if (!timestamp) return '';
		
		// Handle different timestamp formats
		if (typeof timestamp === 'string' && timestamp.length === 14) {
			// Format: 20250723205312
			const year = timestamp.substring(0, 4);
			const month = timestamp.substring(4, 6);
			const day = timestamp.substring(6, 8);
			const hour = timestamp.substring(8, 10);
			const minute = timestamp.substring(10, 12);
			const second = timestamp.substring(12, 14);
			
			return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
		}
		
		return timestamp;
	}

	function getEntryTitle(entry) {
		// Try to get step information from worksteps
		const parsedEntry = WorkstepParser.createReadableSummary(entry);
		
		if (parsedEntry.stepInfo) {
			return `Step ${parsedEntry.stepInfo.stepNumber}: ${parsedEntry.stepInfo.stepName}`;
		}
		
		// Extract meaningful action description from current action
		if (parsedEntry.currentAction && parsedEntry.currentAction.description) {
			const actionDesc = parsedEntry.currentAction.description;
			if (actionDesc && actionDesc !== 'Taking screenshot of current screen') {
				return actionDesc.length > 80 ? actionDesc.substring(0, 80) + '...' : actionDesc;
			}
		}
		
		// Try to extract screen name and action from observations
		if (entry.observations && entry.observations.length > 0) {
			const obs = entry.observations[0];
			if (obs.description && obs.description.length < 100) {
				return obs.description;
			}
		}
		
		// Try to get action type and context
		if (entry.actions && entry.actions.length > 0) {
			const action = entry.actions[0];
			const actionType = action.action;
			
			// Get window context for better naming
			let context = '';
			if (entry.observations && entry.observations[0] && entry.observations[0].window_selector) {
				context = entry.observations[0].window_selector.replace(/\s*-\s*Google Chrome\*?$/, '');
			}
			
			switch (actionType) {
				case 'screenshot':
					return context ? `Screenshot: ${context}` : 'Taking Screenshot';
				case 'search':
					if (action.args && action.args.query) {
						return `Search: "${action.args.query}"`;
					}
					return 'Search Action';
				case 'click':
					return context ? `Click on ${context}` : 'Click Action';
				case 'type':
					return context ? `Type on ${context}` : 'Type Action';
				default:
					return context ? `${actionType} on ${context}` : `${actionType} Action`;
			}
		}
		
		// Fallback to cleaned description
		if (entry.description) {
			let desc = entry.description.replace(/<[^>]*>/g, '').trim();
			// Remove common verbose patterns
			desc = desc.replace(/^Before any action.*?mandatory\.\*\*/s, '').trim();
			desc = desc.replace(/^Prompt format:.*$/m, '').trim();
			
			if (desc.length > 0 && desc.length < 100) {
				return desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
			}
		}
		
		return 'Log Entry';
	}

	function getActionSummary(entry) {
		const parsedEntry = WorkstepParser.createReadableSummary(entry);
		
		// Show visionscript commands if available
		if (parsedEntry.visionCommands && parsedEntry.visionCommands.length > 0) {
			return parsedEntry.visionCommands.map(cmd => cmd.description).join(' → ');
		}
		
		if (!entry.actions) return '';
		
		return entry.actions.map(action => action.action).join(', ');
	}

	function getStepCount(entry) {
		const parsedEntry = WorkstepParser.createReadableSummary(entry);
		
		// Show screen name if available
		if (parsedEntry.stepInfo && parsedEntry.stepInfo.screenName) {
			return `📱 ${parsedEntry.stepInfo.screenName}`;
		}
		
		if (parsedEntry.workstepsData && parsedEntry.workstepsData.test_steps) {
			return `${parsedEntry.workstepsData.test_steps.length} total steps`;
		}
		
		if (entry.actions) {
			return `${entry.actions.length} actions`;
		}
		return '';
	}

	// Table columns configuration
	const tableColumns = [
		{
			key: 'timestamp',
			header: 'Timestamp',
			width: '180px',
			accessor: (item) => formatTimestamp(item.timestamp || item.id)
		},
		{
			key: 'title',
			header: 'Description',
			width: '40%',
			accessor: (item) => getEntryTitle(item)
		},
		{
			key: 'screen',
			header: 'Screen/Context',
			width: '150px',
			accessor: (item) => getStepCount(item)
		},
		{
			key: 'actions',
			header: 'Automation Commands',
			width: '300px',
			accessor: (item) => getActionSummary(item)
		}
	];

	function handleTableRowClick(event) {
		selectEntry(event.detail.item);
	}
</script>

<div class="log-viewer">
	{#if $filteredLogs.length === 0}
		<div class="empty-state">
			<p>No log entries found</p>
			<small>Upload a JSON log file or adjust filters</small>
		</div>
	{:else}
		<div class="log-controls">
			<div class="log-stats">
				<small>{$filteredLogs.length} entries</small>
			</div>
			<div class="view-controls">
				<button 
					class="btn {viewMode === 'list' ? '' : 'btn-secondary'}"
					on:click={() => viewMode = 'list'}
				>
					List
				</button>
				<button 
					class="btn {viewMode === 'table' ? '' : 'btn-secondary'}"
					on:click={() => viewMode = 'table'}
				>
					Table
				</button>
			</div>
		</div>
		
		{#if viewMode === 'list'}
			<div class="log-list">
				{#each $filteredLogs as entry (entry.id || entry.timestamp)}
					<div 
						class="log-entry"
						on:click={() => selectEntry(entry)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && selectEntry(entry)}
					>
						<div class="log-header">
							<div class="log-timestamp">
								{formatTimestamp(entry.timestamp || entry.id)}
								{#if $screenshots && (
									$screenshots[entry.timestamp || entry.id] || 
									(entry.isCombinedEntry && entry.originalScreenshotId && $screenshots[entry.originalScreenshotId])
								)}
									<span class="screenshot-indicator" title="Screenshot available">📸</span>
								{/if}
								{#if entry.isCombinedEntry}
									<span class="combined-indicator" title="Combined screenshot + analysis entry">🔗</span>
								{/if}
							</div>
						</div>
						
						<div class="log-description">
							{getEntryTitle(entry)}
						</div>
						
						<div class="log-meta">
							{#if getStepCount(entry)}
								<span class="log-screen-badge">{getStepCount(entry)}</span>
							{/if}
							{#if getActionSummary(entry)}
								<span class="log-commands-summary">{getActionSummary(entry)}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<VirtualTable 
				data={$filteredLogs}
				columns={tableColumns}
				height={500}
				on:rowclick={handleTableRowClick}
			/>
		{/if}
	{/if}
</div>

<style>
	.log-viewer {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #666;
		text-align: center;
	}

	.log-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 8px;
	}

	.log-stats {
		color: #666;
	}

	.view-controls {
		display: flex;
		gap: 4px;
	}

	.view-controls .btn {
		padding: 4px 12px;
		font-size: 12px;
	}

	.log-list {
		flex: 1;
		overflow-y: auto;
	}

	.log-entry {
		background: white;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		margin-bottom: 8px;
		padding: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.log-entry:hover {
		border-color: var(--color-theme-1);
		box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.log-timestamp {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #666;
		background: var(--color-bg-1);
		padding: 2px 6px;
		border-radius: 3px;
	}


	.log-description {
		font-weight: 500;
		line-height: 1.4;
		margin-bottom: 8px;
	}

	.log-meta {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}

	.log-badge {
		background: var(--color-theme-1);
		color: white;
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 3px;
	}

	.log-screen-badge {
		background: var(--color-info);
		color: white;
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 3px;
	}

	.log-commands-summary {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #666;
		background: var(--color-bg-1);
		padding: 2px 6px;
		border-radius: 3px;
		max-width: 400px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.screenshot-indicator {
		margin-left: 6px;
		font-size: 12px;
		opacity: 0.7;
		cursor: help;
	}
	
	.combined-indicator {
		margin-left: 6px;
		font-size: 12px;
		opacity: 0.7;
		cursor: help;
		color: var(--color-success, #28a745);
	}
</style>