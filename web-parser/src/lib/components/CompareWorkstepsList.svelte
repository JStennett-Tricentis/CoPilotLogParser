<script>
	import { createEventDispatcher } from 'svelte';
	import { WorkstepParser } from '$lib/utils/workstepParser.js';
	
	export let data = [];
	export let diffs = [];
	export let side = 'left'; // 'left' or 'right'
	export let selectedIndex = -1;
	
	const dispatch = createEventDispatcher();
	
	function getDiffForEntry(index) {
		return diffs.find(diff => diff.index === index);
	}
	
	function getDiffClass(index) {
		const diff = getDiffForEntry(index);
		if (!diff) return '';
		
		switch (diff.type) {
			case 'added':
				return diff.side === side ? 'diff-added' : '';
			case 'removed':
				return diff.side === side ? 'diff-removed' : '';
			case 'modified':
				return 'diff-modified';
			default:
				return '';
		}
	}
	
	function getFieldDiffClass(index, field) {
		const diff = getDiffForEntry(index);
		if (!diff || diff.type !== 'modified') return '';
		
		const fieldDiff = diff.differences?.find(d => d.field === field);
		return fieldDiff ? 'field-diff' : '';
	}
	
	function handleEntrySelect(index) {
		dispatch('entryselect', index);
	}
	
	function formatTimestamp(timestamp) {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		return date.toLocaleTimeString();
	}
	
	function truncateText(text, maxLength = 100) {
		if (!text || text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}
</script>

<div class="compare-worksteps-list">
	{#each data as entry, index}
		{@const parsedEntry = WorkstepParser.createReadableSummary(entry)}
		{@const diffClass = getDiffClass(index)}
		
		<div 
			class="workstep-entry {diffClass} {selectedIndex === index ? 'selected' : ''}"
			on:click={() => handleEntrySelect(index)}
			role="button"
			tabindex="0"
		>
			<div class="entry-header">
				<div class="entry-info">
					<div class="entry-meta">
						<span class="timestamp">{formatTimestamp(entry.timestamp)}</span>
						{#if entry.isCombinedEntry}
							<span class="combined-indicator" title="Combined screenshot entry">🔗</span>
						{/if}
						{#if parsedEntry.executionStatus}
							<span class="status status-{parsedEntry.executionStatus}">
								{parsedEntry.executionStatus}
							</span>
						{/if}
					</div>
					{#if diffClass}
						<div class="diff-indicator">
							{#if diffClass === 'diff-added'}
								<span class="diff-badge added">+ Added</span>
							{:else if diffClass === 'diff-removed'}
								<span class="diff-badge removed">- Removed</span>
							{:else if diffClass === 'diff-modified'}
								<span class="diff-badge modified">~ Modified</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			
			<div class="entry-content">
				{#if parsedEntry.testName}
					<div class="test-name {getFieldDiffClass(index, 'testName')}">
						<strong>{parsedEntry.testName}</strong>
					</div>
				{/if}
				
				{#if parsedEntry.currentStep}
					<div class="current-step {getFieldDiffClass(index, 'currentStep')}">
						<span class="step-label">Step:</span> {parsedEntry.currentStep}
					</div>
				{/if}
				
				{#if parsedEntry.screenName}
					<div class="screen-name {getFieldDiffClass(index, 'screenName')}">
						<span class="screen-label">Screen:</span> {parsedEntry.screenName}
					</div>
				{/if}
				
				{#if parsedEntry.currentAction}
					<div class="current-action {getFieldDiffClass(index, 'currentAction')}">
						{truncateText(parsedEntry.currentAction, 150)}
					</div>
				{/if}
				
				{#if parsedEntry.visionscriptCommands && parsedEntry.visionscriptCommands.length > 0}
					<div class="visionscript-preview {getFieldDiffClass(index, 'visionscriptCommands')}">
						<span class="commands-label">Commands:</span>
						{#each parsedEntry.visionscriptCommands.slice(0, 2) as command}
							<span class="command-item">{truncateText(command, 50)}</span>
						{/each}
						{#if parsedEntry.visionscriptCommands.length > 2}
							<span class="command-more">+{parsedEntry.visionscriptCommands.length - 2} more</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/each}
	
	{#if data.length === 0}
		<div class="empty-state">
			<p>No log entries loaded</p>
		</div>
	{/if}
</div>

<style>
	.compare-worksteps-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 0;
	}
	
	.workstep-entry {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		padding: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}
	
	.workstep-entry:hover {
		border-color: #007bff;
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
	}
	
	.workstep-entry.selected {
		border-color: #007bff;
		box-shadow: 0 2px 12px rgba(0, 123, 255, 0.2);
		background: #f8fbff;
	}
	
	/* Diff styling */
	.diff-added {
		border-left: 4px solid #28a745;
		background: #f8fff9;
	}
	
	.diff-removed {
		border-left: 4px solid #dc3545;
		background: #fff8f8;
	}
	
	.diff-modified {
		border-left: 4px solid #ffc107;
		background: #fffef8;
	}
	
	.field-diff {
		background: rgba(255, 193, 7, 0.2);
		padding: 2px 4px;
		border-radius: 3px;
		border: 1px solid rgba(255, 193, 7, 0.4);
	}
	
	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 8px;
	}
	
	.entry-info {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.entry-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.timestamp {
		font-size: 0.85rem;
		color: #666;
		font-family: 'Courier New', monospace;
	}
	
	.combined-indicator {
		font-size: 0.9rem;
		opacity: 0.7;
	}
	
	.status {
		padding: 2px 6px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}
	
	.status-success {
		background: #d4edda;
		color: #155724;
	}
	
	.status-error {
		background: #f8d7da;
		color: #721c24;
	}
	
	.status-user_interaction {
		background: #cce5ff;
		color: #0066cc;
	}
	
	.diff-indicator {
		display: flex;
		align-items: center;
	}
	
	.diff-badge {
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	
	.diff-badge.added {
		background: #d4edda;
		color: #155724;
	}
	
	.diff-badge.removed {
		background: #f8d7da;
		color: #721c24;
	}
	
	.diff-badge.modified {
		background: #fff3cd;
		color: #856404;
	}
	
	.entry-content {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	
	.test-name {
		font-size: 1rem;
		color: #333;
		font-weight: 600;
	}
	
	.current-step {
		font-size: 0.9rem;
		color: #555;
	}
	
	.screen-name {
		font-size: 0.9rem;
		color: #666;
	}
	
	.step-label, .screen-label {
		font-weight: 500;
		color: #888;
	}
	
	.current-action {
		font-size: 0.9rem;
		color: #444;
		line-height: 1.4;
		background: #f8f9fa;
		padding: 6px 8px;
		border-radius: 4px;
		border-left: 3px solid #007bff;
	}
	
	.visionscript-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: center;
		font-size: 0.85rem;
	}
	
	.commands-label {
		font-weight: 500;
		color: #666;
	}
	
	.command-item {
		background: #e9ecef;
		padding: 2px 6px;
		border-radius: 12px;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		color: #495057;
	}
	
	.command-more {
		color: #666;
		font-style: italic;
	}
	
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #666;
	}
	
	.empty-state p {
		margin: 0;
		font-size: 1.1rem;
	}
</style>