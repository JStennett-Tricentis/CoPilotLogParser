<script>
	import { onMount } from "svelte";
	import FileUpload from "$lib/components/FileUpload.svelte";
	import LogViewer from "$lib/components/LogViewer.svelte";
	import WorkstepsList from "$lib/components/WorkstepsList.svelte";
	import FilterPanel from "$lib/components/FilterPanel.svelte";
	import Timeline from "$lib/components/Timeline.svelte";
	import WorkstepViewer from "$lib/components/WorkstepViewer.svelte";
	import CompareView from "$lib/components/CompareView.svelte";
	import {
		logStore,
		filteredLogs,
		parsedLogs,
	} from "$lib/stores/logStore.js";
	import { FileProcessor } from "$lib/utils/fileProcessor.js";

	let selectedEntry = null;
	let isLoading = false;
	let fileProcessor = new FileProcessor();
	let inputMode = "upload";
	let pastedJson = "";
	let currentView = "list";
	let searchTerm = "";

	async function handleFileSelect(event) {
		const {
			detail: { file },
		} = event;
		isLoading = true;

		try {
			const result = await fileProcessor.processFile(file);
			console.log(
				`Successfully processed ${result.entries} entries using ${result.method || "direct"} method`
			);
		} catch (error) {
			console.error("Error processing file:", error);
			alert("Error processing file: " + error.message);
		} finally {
			isLoading = false;
		}
	}

	function handleEntrySelect(event) {
		selectedEntry = event.detail;
		currentView = "worksteps";
	}

	function handleBackToList() {
		currentView = "list";
		selectedEntry = null;
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
		console.log(
			`Export completed: ${detail.count} entries exported as ${detail.format}`
		);
	}

	async function handlePastedJson() {
		if (!pastedJson.trim()) return;

		isLoading = true;
		try {
			JSON.parse(pastedJson); // Validate JSON
			const blob = new Blob([pastedJson], { type: "application/json" });
			const file = new File([blob], "pasted-data.json", {
				type: "application/json",
			});

			const result = await fileProcessor.processFile(file);
			console.log(
				`Successfully processed ${result.entries} entries from pasted JSON`
			);
		} catch (error) {
			console.error("Error parsing JSON:", error);
			alert("Error parsing JSON: " + error.message);
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
					class="input-btn {inputMode === 'upload' && currentView !== 'compare' ? 'active' : ''}"
					on:click={() => {inputMode = "upload"; currentView = "list"}}
				>
					📁 Upload File
				</button>
				<button
					class="input-btn {inputMode === 'paste' && currentView !== 'compare' ? 'active' : ''}"
					on:click={() => {inputMode = "paste"; currentView = "list"}}
				>
					📝 Paste JSON
				</button>
				<button
					class="input-btn {currentView === 'compare' ? 'active' : ''}"
					on:click={() => (currentView = "compare")}
				>
					🔀 Compare
				</button>
			</div>

			<!-- Only show input modes when NOT in compare mode -->
			{#if currentView !== "compare"}
				<div class="input-modes">
					{#if inputMode === "upload"}
						<div class="input-mode active">
							<FileUpload
								on:fileselect={handleFileSelect}
								{isLoading}
							/>
						</div>
					{:else}
						<div class="input-mode active">
							<div class="paste-json-section">
								<h3>Paste JSON Data</h3>
								<textarea
									class="json-input"
									placeholder="Paste your JSON log data here..."
									bind:value={pastedJson}
								></textarea>
								<button
									class="parse-btn"
									on:click={handlePastedJson}
									disabled={!pastedJson || isLoading}
								>
									{#if isLoading}🔄 Processing...{:else}🔄 Parse JSON{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
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
					/>
					<div class="view-controls">
						<button
							class="view-btn {currentView === 'timeline'
								? 'active'
								: ''}"
							on:click={() => (currentView = "timeline")}
						>
							📊 Timeline
						</button>
						<button
							class="view-btn {currentView === 'list'
								? 'active'
								: ''}"
							on:click={() => (currentView = "list")}
						>
							📋 Log List
						</button>
						<button
							class="view-btn {currentView === 'worksteps'
								? 'active'
								: ''}"
							on:click={() => (currentView = "worksteps")}
						>
							🎯 Workstep Detail
						</button>
						<button
							class="view-btn {currentView === 'worksteps-list'
								? 'active'
								: ''}"
							on:click={() => (currentView = "worksteps-list")}
						>
							📑 Worksteps List
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
			{#if currentView === "compare"}
				<div class="results-container">
					<div class="view-content compare-view">
						<CompareView />
					</div>
				</div>
			{:else if $parsedLogs.length === 0}
				<div class="results-placeholder">
					<p>📊</p>
					<p>
						Upload a JSON log file or paste log data to get started
					</p>
				</div>
			{:else}
				<div class="results-container">
					{#if currentView === "timeline"}
						<div class="view-content">
							<Timeline
								data={$filteredLogs}
								height={500}
								on:itemselect={handleTimelineSelect}
							/>
						</div>
					{:else if currentView === "list"}
						<div class="view-content">
							<LogViewer on:entryselect={handleEntrySelect} />
						</div>
					{:else if currentView === "worksteps-list"}
						<div class="view-content">
							<WorkstepsList on:entryselect={handleEntrySelect} />
						</div>
					{:else if currentView === "worksteps"}
						<div class="view-content worksteps-view">
							<WorkstepViewer
								entry={selectedEntry}
								on:copy={(e) =>
									console.log("Copied:", e.detail)}
								on:entryselect={handleEntrySelect}
								on:backtolist={handleBackToList}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
