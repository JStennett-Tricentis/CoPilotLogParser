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
	let inputMode = 'upload';
	let pastedJson = '';
	let currentView = 'list';
	let searchTerm = '';

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
		currentView = 'details';
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

	async function handlePastedJson() {
		if (!pastedJson.trim()) return;
		
		isLoading = true;
		try {
			JSON.parse(pastedJson); // Validate JSON
			const blob = new Blob([pastedJson], { type: 'application/json' });
			const file = new File([blob], 'pasted-data.json', { type: 'application/json' });
			
			const result = await fileProcessor.processFile(file);
			console.log(`Successfully processed ${result.entries} entries from pasted JSON`);
		} catch (error) {
			console.error('Error parsing JSON:', error);
			alert('Error parsing JSON: ' + error.message);
		} finally {
			isLoading = false;
		}
	}

	function handleSearch() {
		const filters = { search: searchTerm };
		logStore.applyFilters(filters);
	}
</script>

<svelte:head>
	<title>CoPilot Log Parser</title>
</svelte:head>

<div class="container">
	<!-- Header -->
	<div class="header">
		<div class="logo">CL</div>
		<h1>CoPilot Log Parser v1.0</h1>
	</div>

	<div class="main-content">
		<!-- Input Section -->
		<div class="input-section">
			<div class="input-tabs">
				<button 
					class="input-btn {inputMode === 'upload' ? 'active' : ''}" 
					on:click={() => inputMode = 'upload'}
				>
					📁 Upload File
				</button>
				<button 
					class="input-btn {inputMode === 'paste' ? 'active' : ''}" 
					on:click={() => inputMode = 'paste'}
				>
					📝 Paste JSON
				</button>
			</div>

			<div class="input-modes">
				{#if inputMode === 'upload'}
					<div class="input-mode active">
						<FileUpload on:fileselect={handleFileSelect} {isLoading} />
					</div>
				{:else}
					<div class="input-mode active">
						<textarea 
							class="json-input" 
							placeholder="Paste your JSON log data here..."
							bind:value={pastedJson}
						></textarea>
						<button class="parse-btn" on:click={handlePastedJson} disabled={!pastedJson || isLoading}>
							{#if isLoading}🔄 Processing...{:else}🔄 Parse JSON{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Combined Header -->
		{#if $parsedLogs.length > 0}
			<div class="filters-section">
				<div class="filters-content">
					<input 
						type="text" 
						placeholder="Search logs..." 
						class="search-input"
						bind:value={searchTerm}
						on:input={handleSearch}
					>
					<div class="view-controls">
						<button 
							class="view-btn {currentView === 'timeline' ? 'active' : ''}"
							on:click={() => currentView = 'timeline'}
						>
							📊 Timeline
						</button>
						<button 
							class="view-btn {currentView === 'list' ? 'active' : ''}"
							on:click={() => currentView = 'list'}
						>
							📋 List
						</button>
						<button 
							class="view-btn {currentView === 'details' ? 'active' : ''}"
							on:click={() => currentView = 'details'}
						>
							🔍 Details
						</button>
					</div>
					<FilterPanel 
						allData={$parsedLogs}
						filteredData={$filteredLogs}
						on:filter={handleFilter} 
						on:exportcomplete={handleExportComplete}
						compact={true}
					/>
					<div class="log-count">
						{$filteredLogs.length} entries
					</div>
				</div>
			</div>
		{/if}

		<!-- Results Section -->
		<div class="results-section">
			{#if $parsedLogs.length === 0}
				<div class="results-placeholder">
					<p>📊</p>
					<p>Upload a JSON log file or paste log data to get started</p>
				</div>
			{:else}
				<div class="results-container">
					{#if currentView === 'timeline'}
						<div class="view-content">
							<Timeline 
								data={$filteredLogs} 
								height={500}
								on:itemselect={handleTimelineSelect}
							/>
						</div>
					{:else if currentView === 'list'}
						<div class="view-content">
							<LogViewer on:entryselect={handleEntrySelect} />
						</div>
					{:else if currentView === 'details' && selectedEntry}
						<div class="view-content details-view">
							<div class="details-header">
								<h3>Entry Details</h3>
								<button class="btn-back" on:click={() => currentView = 'list'}>← Back to List</button>
							</div>
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
						</div>
					{:else if currentView === 'details'}
						<div class="view-content">
							<div class="empty-details">
								<p>Select a log entry to view details</p>
								<button class="btn" on:click={() => currentView = 'list'}>← Back to List</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>