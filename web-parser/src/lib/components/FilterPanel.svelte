<script>
	import { createEventDispatcher } from 'svelte';
	import ExportPanel from './ExportPanel.svelte';
	
	export let allData = [];
	export let filteredData = [];
	export let compact = false;
	
	const dispatch = createEventDispatcher();
	
	let stepName = '';
	let screenName = '';
	let searchText = '';
	let startTime = '';
	let endTime = '';

	function applyFilters() {
		dispatch('filter', {
			stepName,
			screenName,
			searchText,
			timeRange: { start: startTime, end: endTime }
		});
	}

	function clearFilters() {
		stepName = '';
		screenName = '';
		searchText = '';
		startTime = '';
		endTime = '';
		applyFilters();
	}

	// Apply filters on input change
</script>

{#if compact}
	<div class="compact-filters">
		<ExportPanel 
			data={allData} 
			filteredData={filteredData}
			on:exportcomplete
			compact={true}
		/>
	</div>
{:else}
	<div class="filter-panel">
		<h3>Filters</h3>
		
		<div class="form-group">
			<label for="search">Search</label>
			<input
				id="search"
				type="text"
				placeholder="Search logs..."
				bind:value={searchText}
			>
		</div>


		<div class="form-group">
			<label for="stepName">Step Name</label>
			<input
				id="stepName"
				type="text"
				placeholder="Log On, Navigate..."
				bind:value={stepName}
			>
		</div>

		<div class="form-group">
			<label for="screenName">Screen Name</label>
			<input
				id="screenName"
				type="text"
				placeholder="Login, Home, Sales Order..."
				bind:value={screenName}
			>
		</div>

		<div class="form-group">
			<label for="startTime">Start Time</label>
			<input
				id="startTime"
				type="datetime-local"
				bind:value={startTime}
			>
		</div>

		<div class="form-group">
			<label for="endTime">End Time</label>
			<input
				id="endTime"
				type="datetime-local"
				bind:value={endTime}
			>
		</div>

		<div class="filter-actions">
			<button class="btn btn-secondary" on:click={clearFilters}>
				Clear All
			</button>
		</div>

		<ExportPanel 
			data={allData} 
			filteredData={filteredData}
			on:exportcomplete
		/>
	</div>
{/if}

<style>
	.filter-panel {
		padding-top: 16px;
	}

	.filter-actions {
		margin-top: 16px;
	}

	.filter-actions button {
		width: 100%;
	}
</style>