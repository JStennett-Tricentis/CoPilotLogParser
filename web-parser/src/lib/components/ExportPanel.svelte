<script>
	import { createEventDispatcher } from 'svelte';
	import { ExportUtils } from '$lib/utils/exportUtils.js';
	
	export let data = [];
	export let filteredData = [];
	export let compact = false;
	
	const dispatch = createEventDispatcher();
	
	let exportFormat = 'json';
	let exportScope = 'filtered'; // 'all' or 'filtered'
	let includeRawData = true;
	let isExporting = false;

	async function handleExport() {
		if (isExporting) return;
		
		isExporting = true;
		
		try {
			const exportData = exportScope === 'all' ? data : filteredData;
			
			if (!exportData || exportData.length === 0) {
				alert('No data to export');
				return;
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
			const baseFilename = `sap-logs-${timestamp}`;

			switch (exportFormat) {
				case 'json':
					ExportUtils.exportToJSON(exportData, `${baseFilename}.json`);
					break;
				case 'csv':
					ExportUtils.exportToCSV(exportData, `${baseFilename}.csv`);
					break;
				case 'excel':
					ExportUtils.exportToExcel(exportData, `${baseFilename}.xlsx`);
					break;
				case 'summary':
					const summary = ExportUtils.generateSummaryReport(exportData);
					ExportUtils.exportToJSON(summary, `${baseFilename}-summary.json`);
					break;
				default:
					throw new Error('Unknown export format');
			}

			dispatch('exportcomplete', { 
				format: exportFormat, 
				scope: exportScope, 
				count: exportData.length 
			});

		} catch (error) {
			console.error('Export error:', error);
			alert('Export failed: ' + error.message);
		} finally {
			isExporting = false;
		}
	}

	function getDataCount() {
		return exportScope === 'all' ? data.length : filteredData.length;
	}
</script>

{#if compact}
	<div class="compact-export">
		<button 
			class="btn export-btn" 
			on:click={handleExport}
			disabled={isExporting || getDataCount() === 0}
		>
			{#if isExporting}
				💾 Exporting...
			{:else}
				💾 Export JSON
			{/if}
		</button>
	</div>
{:else}
	<div class="export-panel">
		<h4>Export Data</h4>
		
		<div class="form-group">
			<label for="exportFormat">Format</label>
			<select id="exportFormat" bind:value={exportFormat}>
				<option value="json">JSON</option>
				<option value="csv">CSV</option>
				<option value="excel">Excel (CSV)</option>
				<option value="summary">Summary Report</option>
			</select>
		</div>

		<div class="form-group">
			<label for="exportScope">Data Scope</label>
			<select id="exportScope" bind:value={exportScope}>
				<option value="filtered">Filtered Results ({filteredData.length} entries)</option>
				<option value="all">All Data ({data.length} entries)</option>
			</select>
		</div>

		{#if exportFormat !== 'summary'}
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={includeRawData}>
					Include raw data fields
				</label>
			</div>
		{/if}

		<div class="export-info">
			<small>
				Will export {getDataCount()} entries as {exportFormat.toUpperCase()}
			</small>
		</div>

		<button 
			class="btn" 
			on:click={handleExport}
			disabled={isExporting || getDataCount() === 0}
		>
			{#if isExporting}
				Exporting...
			{:else}
				Export {exportFormat.toUpperCase()}
			{/if}
		</button>

		{#if exportFormat === 'summary'}
			<div class="export-note">
				<small>
					<strong>Summary Report includes:</strong><br>
					• Total entries and date range<br>
					• Action types<br>
					• Test step statistics<br>
					• Generated metadata
				</small>
			</div>
		{:else if exportFormat === 'csv'}
			<div class="export-note">
				<small>
					<strong>CSV Export notes:</strong><br>
					• Complex objects will be flattened<br>
					• Arrays converted to JSON strings<br>
					• UTF-8 encoding with Excel compatibility
				</small>
			</div>
		{:else if exportFormat === 'excel'}
			<div class="export-note">
				<small>
					<strong>Excel Export:</strong><br>
					Currently exports as CSV format.<br>
					For full Excel support, SheetJS integration needed.
				</small>
			</div>
		{/if}
	</div>
{/if}

<style>
	.export-panel {
		padding-top: 16px;
		border-top: 1px solid var(--color-border);
		margin-top: 16px;
	}

	.export-panel h4 {
		margin: 0 0 12px 0;
		font-size: 14px;
	}

	.export-info {
		margin: 8px 0;
		color: #666;
	}

	.export-note {
		margin-top: 8px;
		padding: 8px;
		background: var(--color-bg-1);
		border-radius: 4px;
		color: #666;
		font-size: 11px;
		line-height: 1.4;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	label {
		font-size: 12px;
	}

	label input[type="checkbox"] {
		margin-right: 6px;
	}

	.compact-export {
		display: flex;
		align-items: center;
	}

	.export-btn {
		background: var(--color-warning);
		color: #333;
		padding: 8px 12px;
		font-size: 12px;
	}

	.export-btn:hover:not(:disabled) {
		background: #e0a800;
	}
</style>