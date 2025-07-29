<script>
	import { createEventDispatcher } from 'svelte';
	import FileUpload from './FileUpload.svelte';
	import WorkstepViewer from './WorkstepViewer.svelte';
	import { FileProcessor } from '$lib/utils/fileProcessor.js';
	
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
</script>

<div class="compare-container">
	<div class="compare-header">
		<h2>Compare Test Runs</h2>
		<label class="sync-toggle">
			<input type="checkbox" bind:checked={syncScroll}>
			<span>Sync Scrolling</span>
		</label>
	</div>
	
	<div class="compare-panels">
		<!-- Left Panel -->
		<div class="compare-panel left-panel">
			<div class="panel-header">
				<h3>Test Run 1</h3>
				{#if leftFile}
					<span class="file-name" title={leftFile.name}>{leftFile.name}</span>
				{/if}
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
					<select on:change={(e) => leftEntry = leftData[e.target.value]}>
						{#each leftData as entry, index}
							<option value={index}>
								{entry.parsedData?.currentStep?.step_name || entry.description || `Entry ${index + 1}`}
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
				{#if rightFile}
					<span class="file-name" title={rightFile.name}>{rightFile.name}</span>
				{/if}
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
					<select on:change={(e) => rightEntry = rightData[e.target.value]}>
						{#each rightData as entry, index}
							<option value={index}>
								{entry.parsedData?.currentStep?.step_name || entry.description || `Entry ${index + 1}`}
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
	
	.sync-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}
	
	.sync-toggle input {
		cursor: pointer;
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
	
	.file-name {
		font-size: 0.9rem;
		color: #666;
		max-width: 200px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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