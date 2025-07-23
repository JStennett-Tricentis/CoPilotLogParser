<script>
	import { onMount } from 'svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import LogViewer from '$lib/components/LogViewer.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import { logStore, filteredLogs, parsedLogs } from '$lib/stores/logStore.js';
	import { FileProcessor } from '$lib/utils/fileProcessor.js';

	let selectedEntry = null;
	let isLoading = false;
	let fileProcessor = new FileProcessor();

	async function handleFileSelect(event) {
		const { detail: { file } } = event;
		isLoading = true;
		
		try {
			const result = await fileProcessor.processFile(file);
			console.log(`Successfully processed ${result.entries} entries using ${result.method || 'direct'} method`);
		} catch (error) {
			console.error('Error processing file:', error);
			alert('Error processing file: ' + error.message);
		} finally {
			isLoading = false;
		}
	}

	function handleEntrySelect(event) {
		selectedEntry = event.detail;
	}

	function handleFilter(event) {
		const { detail: filters } = event;
		logStore.applyFilters(filters);
	}

	function handleTimelineSelect(event) {
		const { detail } = event;
		if (detail && detail.originalData) {
			selectedEntry = detail.originalData;
		}
	}

	function handleExportComplete(event) {
		const { detail } = event;
		console.log(`Export completed: ${detail.count} entries exported as ${detail.format}`);
	}
</script>

<svelte:head>
	<title>SAP Log Parser</title>
</svelte:head>

<div class="app-layout">
	<!-- Top Section: Controls and Timeline -->
	<div class="top-section">
		<div class="panel" style="width: 300px; flex-shrink: 0;">
			<div class="panel-header">Controls</div>
			<div class="panel-content">
				<FileUpload on:fileselect={handleFileSelect} {isLoading} />
				<FilterPanel 
					allData={$parsedLogs}
					filteredData={$filteredLogs}
					on:filter={handleFilter} 
					on:exportcomplete={handleExportComplete}
				/>
			</div>
		</div>
		
		<div class="panel" style="flex: 1;">
			<div class="panel-header">Timeline</div>
			<div class="panel-content">
				<Timeline 
					data={$filteredLogs} 
					height={280}
					on:itemselect={handleTimelineSelect}
				/>
			</div>
		</div>
	</div>

	<!-- Bottom Section: Log List and Details -->
	<div class="bottom-section">
		<div class="panel" style="flex: 1;">
			<div class="panel-header">Log Entries</div>
			<div class="panel-content">
				<LogViewer on:entryselect={handleEntrySelect} />
			</div>
		</div>

		<div class="panel" style="width: 400px; flex-shrink: 0;">
			<div class="panel-header">Details</div>
			<div class="panel-content">
				{#if selectedEntry}
					<h3>Entry Details</h3>
					<div class="details-content">
						<div class="detail-section">
							<h4>Basic Info</h4>
							<p><strong>Timestamp:</strong> {selectedEntry.timestamp || selectedEntry.id}</p>
							{#if selectedEntry.session_id}
								<p><strong>Session ID:</strong> {selectedEntry.session_id}</p>
							{/if}
						</div>
						
						{#if selectedEntry.test_steps}
							<div class="detail-section">
								<h4>Test Steps ({selectedEntry.test_steps.length})</h4>
								{#each selectedEntry.test_steps as step}
									<div class="test-step">
										<strong>{step.step_name || step.description}</strong>
										{#if step.screen_name}
											<br><small>Screen: {step.screen_name}</small>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
						
						{#if selectedEntry.actions}
							<div class="detail-section">
								<h4>Actions ({selectedEntry.actions.length})</h4>
								{#each selectedEntry.actions as action}
									<div class="action-item">
										<code>{action.action}</code>
									</div>
								{/each}
							</div>
						{/if}
						
						<div class="detail-section">
							<h4>Raw Data</h4>
							<pre class="raw-data">{JSON.stringify(selectedEntry, null, 2)}</pre>
						</div>
					</div>
				{:else}
					<p>Select a log entry to view details</p>
				{/if}
			</div>
		</div>
	</div>
</div>