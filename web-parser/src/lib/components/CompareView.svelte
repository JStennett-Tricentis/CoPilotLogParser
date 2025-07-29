<script>
	import { createEventDispatcher } from 'svelte';
	import FileUpload from './FileUpload.svelte';
	import WorkstepViewer from './WorkstepViewer.svelte';
	import { FileProcessor } from '$lib/utils/fileProcessor.js';
	import { WorkstepParser } from '$lib/utils/workstepParser.js';
	
	const dispatch = createEventDispatcher();
	
	let leftFile = null;
	let rightFile = null;
	let leftData = [];
	let rightData = [];
	let leftEntry = null;
	let rightEntry = null;
	let isLoadingLeft = false;
	let isLoadingRight = false;
	let fileProcessor = new FileProcessor();
	let syncScroll = true;
	
	function clearComparison() {
		leftFile = null;
		rightFile = null;
		leftData = [];
		rightData = [];
		leftEntry = null;
		rightEntry = null;
	}
	
	async function handleLeftFileSelect(event) {
		const { detail: { file } } = event;
		leftFile = file;
		isLoadingLeft = true;
		
		try {
			// Process file directly without using the global store
			const entries = await fileProcessor.processFileForCompare(file);
			leftData = entries;
			if (leftData.length > 0) {
				leftEntry = leftData[0];
			}
		} catch (error) {
			console.error('Error processing left file:', error);
			alert('Error processing left file: ' + error.message);
		} finally {
			isLoadingLeft = false;
		}
	}
	
	async function handleRightFileSelect(event) {
		const { detail: { file } } = event;
		rightFile = file;
		isLoadingRight = true;
		
		try {
			// Process file directly without using the global store
			const entries = await fileProcessor.processFileForCompare(file);
			rightData = entries;
			if (rightData.length > 0) {
				rightEntry = rightData[0];
			}
		} catch (error) {
			console.error('Error processing right file:', error);
			alert('Error processing right file: ' + error.message);
		} finally {
			isLoadingRight = false;
		}
	}
	
	function handleLeftEntrySelect(event) {
		leftEntry = event.detail;
	}
	
	function handleRightEntrySelect(event) {
		rightEntry = event.detail;
	}
	
	function handleSyncScroll(element) {
		if (!syncScroll) return;
		
		const leftViewer = document.querySelector('.left-viewer .workstep-container');
		const rightViewer = document.querySelector('.right-viewer .workstep-container');
		
		if (!leftViewer || !rightViewer) return;
		
		if (element === 'left') {
			rightViewer.scrollTop = leftViewer.scrollTop;
		} else {
			leftViewer.scrollTop = rightViewer.scrollTop;
		}
	}
	
	function getEntryDescription(entry) {
		const parsed = WorkstepParser.createReadableSummary(entry);
		
		// Try to get step info first
		if (parsed.stepInfo) {
			return `Step ${parsed.stepInfo.stepNumber}: ${parsed.stepInfo.stepName}`;
		}
		
		// Try current action description
		if (parsed.currentAction && parsed.currentAction.description) {
			const desc = parsed.currentAction.description;
			return desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
		}
		
		// Try worksteps name
		if (parsed.workstepsData?.name) {
			return parsed.workstepsData.name;
		}
		
		// Fallback to timestamp or index
		return entry.timestamp || entry.id || 'Entry';
	}
</script>

<div class="compare-container">
	<div class="compare-header">
		<h2>Compare Test Runs</h2>
		<div class="header-controls">
			<label class="sync-toggle">
				<input type="checkbox" bind:checked={syncScroll}>
				<span>Sync Scrolling</span>
			</label>
			{#if leftData.length > 0 || rightData.length > 0}
				<button class="clear-btn" on:click={clearComparison}>
					🗑️ Clear All
				</button>
			{/if}
		</div>
	</div>
	
	<div class="compare-panels">
		<!-- Left Panel -->
		<div class="compare-panel left-panel">
			<div class="panel-header">
				<h3>Test Run 1</h3>
				<div class="panel-info">
					{#if leftFile}
						<span class="file-name" title={leftFile.name}>{leftFile.name}</span>
					{/if}
					{#if leftData.length > 0}
						<span class="entry-count">{leftData.length} entries</span>
					{/if}
				</div>
			</div>
			
			{#if !leftData.length}
				<div class="upload-area">
					<FileUpload 
						on:fileselect={handleLeftFileSelect} 
						isLoading={isLoadingLeft}
						acceptedFormats={['.zip', '.json']}
					/>
				</div>
			{:else}
				<div class="entry-selector">
					<label>Select Entry:</label>
					<select bind:value={leftEntry}>
						{#each leftData as entry, index}
							<option value={entry}>
								{getEntryDescription(entry)}
							</option>
						{/each}
					</select>
				</div>
				
				<div class="left-viewer" on:scroll={() => handleSyncScroll('left')}>
					<WorkstepViewer 
						entry={leftEntry}
						on:entryselect={handleLeftEntrySelect}
						compact={true}
					/>
				</div>
			{/if}
		</div>
		
		<!-- Divider -->
		<div class="divider"></div>
		
		<!-- Right Panel -->
		<div class="compare-panel right-panel">
			<div class="panel-header">
				<h3>Test Run 2</h3>
				<div class="panel-info">
					{#if rightFile}
						<span class="file-name" title={rightFile.name}>{rightFile.name}</span>
					{/if}
					{#if rightData.length > 0}
						<span class="entry-count">{rightData.length} entries</span>
					{/if}
				</div>
			</div>
			
			{#if !rightData.length}
				<div class="upload-area">
					<FileUpload 
						on:fileselect={handleRightFileSelect} 
						isLoading={isLoadingRight}
						acceptedFormats={['.zip', '.json']}
					/>
				</div>
			{:else}
				<div class="entry-selector">
					<label>Select Entry:</label>
					<select bind:value={rightEntry}>
						{#each rightData as entry, index}
							<option value={entry}>
								{getEntryDescription(entry)}
							</option>
						{/each}
					</select>
				</div>
				
				<div class="right-viewer" on:scroll={() => handleSyncScroll('right')}>
					<WorkstepViewer 
						entry={rightEntry}
						on:entryselect={handleRightEntrySelect}
						compact={true}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.compare-container {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	
	.compare-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #e0e0e0;
		background-color: #f8f9fa;
	}
	
	.compare-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #333;
	}
	
	.header-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.sync-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}
	
	.sync-toggle input {
		cursor: pointer;
	}
	
	.clear-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s ease;
	}
	
	.clear-btn:hover {
		background: #c82333;
	}
	
	.compare-panels {
		flex: 1;
		display: flex;
		overflow: hidden;
	}
	
	.compare-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.panel-header {
		padding: 1rem;
		background-color: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.panel-header h3 {
		margin: 0;
		font-size: 1.2rem;
		color: #555;
	}
	
	.panel-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}
	
	.file-name {
		font-size: 0.9rem;
		color: #666;
		max-width: 200px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.entry-count {
		font-size: 0.8rem;
		color: #888;
		background: #e9ecef;
		padding: 2px 6px;
		border-radius: 12px;
		font-weight: 500;
	}
	
	.upload-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}
	
	.entry-selector {
		padding: 1rem;
		background-color: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.entry-selector label {
		font-weight: 500;
		color: #555;
		font-size: 0.9rem;
	}
	
	.entry-selector select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.9rem;
		background-color: white;
		cursor: pointer;
	}
	
	.entry-selector select:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}
	
	.left-viewer,
	.right-viewer {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		background-color: #fafafa;
	}
	
	.divider {
		width: 2px;
		background-color: #e0e0e0;
	}
	
	/* Responsive design */
	@media (max-width: 768px) {
		.compare-panels {
			flex-direction: column;
		}
		
		.divider {
			width: 100%;
			height: 2px;
		}
		
		.compare-panel {
			min-height: 400px;
		}
	}
	
	/* Override WorkstepViewer styles for compact view */
	:global(.compare-panel .workstep-container) {
		max-width: none;
		margin: 0;
	}
	
	:global(.compare-panel .workstep-card) {
		margin: 0.5rem 0;
	}
</style>