<script>
	import { createEventDispatcher } from 'svelte';
	import { filteredLogs } from '$lib/stores/logStore.js';
	import VirtualTable from './VirtualTable.svelte';
	
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
		// Extract meaningful title from entry
		if (entry.test_steps?.length > 0) {
			return entry.test_steps[0].description || 'Test Step';
		}
		
		if (entry.description) {
			// Truncate long descriptions
			const desc = entry.description.replace(/<[^>]*>/g, '').trim();
			return desc.length > 100 ? desc.substring(0, 100) + '...' : desc;
		}
		
		return 'Log Entry';
	}

	function getActionSummary(entry) {
		if (!entry.actions) return '';
		
		return entry.actions.map(action => action.action).join(', ');
	}

	function getStepCount(entry) {
		if (entry.test_steps) {
			return `${entry.test_steps.length} steps`;
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
			key: 'session',
			header: 'Session',
			width: '120px',
			accessor: (item) => item.session_id ? item.session_id.substring(0, 8) + '...' : ''
		},
		{
			key: 'steps',
			header: 'Steps/Actions',
			width: '100px',
			accessor: (item) => getStepCount(item)
		},
		{
			key: 'actions',
			header: 'Actions',
			width: '200px',
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
							</div>
							{#if entry.session_id}
								<div class="log-session">
									Session: {entry.session_id.substring(0, 8)}...
								</div>
							{/if}
						</div>
						
						<div class="log-description">
							{getEntryTitle(entry)}
						</div>
						
						<div class="log-meta">
							{#if getStepCount(entry)}
								<span class="log-badge">{getStepCount(entry)}</span>
							{/if}
							{#if getActionSummary(entry)}
								<span class="log-actions-summary">{getActionSummary(entry)}</span>
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

	.log-session {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-theme-1);
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

	.log-actions-summary {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #666;
		background: var(--color-bg-1);
		padding: 2px 6px;
		border-radius: 3px;
	}
</style>