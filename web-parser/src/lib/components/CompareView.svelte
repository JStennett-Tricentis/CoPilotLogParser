<script>
	import FileUpload from './FileUpload.svelte';
	import CompareWorkstepsList from './CompareWorkstepsList.svelte';
	import { FileProcessor } from '$lib/utils/fileProcessor.js';
	
	let leftFile = null;
	let rightFile = null;
	let leftData = [];
	let rightData = [];
	let isLoadingLeft = false;
	let isLoadingRight = false;
	let fileProcessor = new FileProcessor();
	let syncScroll = true;
	let scrollSyncEnabled = true;
	let lastScrollSource = null;
	let scrollTimeout = null;
	let comparisonData = { left: [], right: [], diffs: [] };
	let selectedIndex = -1;
	
	// Reactive statement to compute differences when data changes
	$: if (leftData.length > 0 && rightData.length > 0) {
		comparisonData = computeDifferences(leftData, rightData);
	} else {
		comparisonData = { left: leftData, right: rightData, diffs: [] };
	}
	
	function clearComparison() {
		leftFile = null;
		rightFile = null;
		leftData = [];
		rightData = [];
	}
	
	async function handleLeftFileSelect(event) {
		const { detail: { file } } = event;
		leftFile = file;
		isLoadingLeft = true;
		
		try {
			// Process file directly without using the global store
			const entries = await fileProcessor.processFileForCompare(file);
			leftData = entries;
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
		} catch (error) {
			console.error('Error processing right file:', error);
			alert('Error processing right file: ' + error.message);
		} finally {
			isLoadingRight = false;
		}
	}
	
	function handleSyncScroll(source) {
		if (!syncScroll || !scrollSyncEnabled) return;
		
		// Prevent infinite loop by tracking scroll source
		if (lastScrollSource === source) return;
		
		const leftViewer = document.querySelector('.left-viewer');
		const rightViewer = document.querySelector('.right-viewer');
		
		if (!leftViewer || !rightViewer) return;
		
		// Temporarily disable sync to prevent loop
		scrollSyncEnabled = false;
		lastScrollSource = source;
		
		const sourceElement = source === 'left' ? leftViewer : rightViewer;
		const targetElement = source === 'left' ? rightViewer : leftViewer;
		
		// Calculate relative scroll position
		const scrollRatio = sourceElement.scrollTop / (sourceElement.scrollHeight - sourceElement.clientHeight);
		const targetScrollTop = scrollRatio * (targetElement.scrollHeight - targetElement.clientHeight);
		
		// Apply scroll with smooth transition
		targetElement.scrollTo({
			top: isNaN(targetScrollTop) ? sourceElement.scrollTop : targetScrollTop,
			behavior: 'auto'
		});
		
		// Re-enable sync after a brief delay
		if (scrollTimeout) clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			scrollSyncEnabled = true;
			lastScrollSource = null;
		}, 50);
	}
	
	function computeDifferences(left, right) {
		const diffs = [];
		const maxLength = Math.max(left.length, right.length);
		
		for (let i = 0; i < maxLength; i++) {
			const leftEntry = left[i];
			const rightEntry = right[i];
			
			if (!leftEntry && rightEntry) {
				// Entry only in right
				diffs.push({ index: i, type: 'added', side: 'right', entry: rightEntry });
			} else if (leftEntry && !rightEntry) {
				// Entry only in left
				diffs.push({ index: i, type: 'removed', side: 'left', entry: leftEntry });
			} else if (leftEntry && rightEntry) {
				// Compare entries
				const differences = compareEntries(leftEntry, rightEntry);
				if (differences.length > 0) {
					diffs.push({ 
						index: i, 
						type: 'modified', 
						leftEntry, 
						rightEntry, 
						differences 
					});
				}
			}
		}
		
		return { left, right, diffs };
	}
	
	function compareEntries(left, right) {
		const differences = [];
		
		// Compare key fields
		const fieldsToCompare = [
			'currentAction',
			'currentStep',
			'screenName',
			'visionscriptCommands',
			'testName',
			'executionStatus'
		];
		
		fieldsToCompare.forEach(field => {
			const leftValue = getNestedProperty(left, field);
			const rightValue = getNestedProperty(right, field);
			
			if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
				differences.push({
					field,
					leftValue,
					rightValue
				});
			}
		});
		
		return differences;
	}
	
	function getNestedProperty(obj, path) {
		return path.split('.').reduce((current, key) => current?.[key], obj);
	}
	
	function handleEntrySelect(index) {
		selectedIndex = index;
		
		// Scroll both panels to the selected entry
		const leftViewer = document.querySelector('.left-viewer');
		const rightViewer = document.querySelector('.right-viewer');
		const entryElements = document.querySelectorAll('.workstep-entry');
		
		if (entryElements[index] && leftViewer && rightViewer) {
			const scrollTop = entryElements[index].offsetTop - 100;
			leftViewer.scrollTo({ top: scrollTop, behavior: 'smooth' });
			rightViewer.scrollTo({ top: scrollTop, behavior: 'smooth' });
		}
	}
</script>

<div class="compare-container">
	<div class="compare-controls">
		<div class="controls-left">
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
		
		{#if comparisonData.diffs.length > 0}
			{@const addedCount = comparisonData.diffs.filter(d => d.type === 'added').length}
			{@const removedCount = comparisonData.diffs.filter(d => d.type === 'removed').length}
			{@const modifiedCount = comparisonData.diffs.filter(d => d.type === 'modified').length}
			<div class="diff-summary">
				{#if addedCount > 0}
					<div class="diff-stat added">
						<span>+{addedCount}</span>
					</div>
				{/if}
				{#if removedCount > 0}
					<div class="diff-stat removed">
						<span>-{removedCount}</span>
					</div>
				{/if}
				{#if modifiedCount > 0}
					<div class="diff-stat modified">
						<span>~{modifiedCount}</span>
					</div>
				{/if}
			</div>
		{/if}
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
				<div class="left-viewer" on:scroll={() => handleSyncScroll('left')}>
					<CompareWorkstepsList 
						data={comparisonData.left} 
						diffs={comparisonData.diffs}
						side="left"
						{selectedIndex}
						on:entryselect={(e) => handleEntrySelect(e.detail)}
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
				<div class="right-viewer" on:scroll={() => handleSyncScroll('right')}>
					<CompareWorkstepsList 
						data={comparisonData.right} 
						diffs={comparisonData.diffs}
						side="right"
						{selectedIndex}
						on:entryselect={(e) => handleEntrySelect(e.detail)}
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
		padding: 16px;
	}
	
	
	.compare-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 20px;
		padding: 12px;
		background-color: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}
	
	.controls-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.diff-summary {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.9rem;
	}
	
	.diff-stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 2px 6px;
		border-radius: 12px;
		font-weight: 500;
	}
	
	.diff-stat.added {
		background: #d4edda;
		color: #155724;
	}
	
	.diff-stat.removed {
		background: #f8d7da;
		color: #721c24;
	}
	
	.diff-stat.modified {
		background: #fff3cd;
		color: #856404;
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
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: white;
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
		align-items: flex-start;
		justify-content: center;
		padding: 2rem;
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
	
	/* Override WorkstepsList styles for compare view */
	:global(.compare-panel .worksteps-full-list) {
		padding: 0;
		background: transparent;
	}
</style>