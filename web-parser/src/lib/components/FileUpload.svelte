<script>
	import { createEventDispatcher } from 'svelte';
	
	export let isLoading = false;
	
	const dispatch = createEventDispatcher();
	
	let fileInput;
	let dragover = false;

	function handleFileSelect(event) {
		const file = event.target.files[0];
		if (file && (file.type === 'application/json' || file.type === 'application/zip' || file.name.endsWith('.zip'))) {
			dispatch('fileselect', { file });
		} else {
			alert('Please select a JSON or ZIP file');
		}
	}

	function handleDrop(event) {
		event.preventDefault();
		dragover = false;
		
		const file = event.dataTransfer.files[0];
		if (file && (file.type === 'application/json' || file.type === 'application/zip' || file.name.endsWith('.zip'))) {
			dispatch('fileselect', { file });
		} else {
			alert('Please drop a JSON or ZIP file');
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
		dragover = true;
	}

	function handleDragLeave() {
		dragover = false;
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="file-upload">
	<h3>Upload Log File</h3>
	
	<div 
		class="drop-zone" 
		class:dragover
		class:loading={isLoading}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		role="button"
		tabindex="0"
		on:click={() => fileInput.click()}
		on:keydown={(e) => e.key === 'Enter' && fileInput.click()}
	>
		{#if isLoading}
			<div class="loading">Processing...</div>
		{:else}
			<div class="drop-text">
				<strong>Drop JSON or ZIP file here</strong><br>
				or click to browse
			</div>
		{/if}
	</div>
	
	<input
		bind:this={fileInput}
		type="file"
		accept=".json,.zip"
		on:change={handleFileSelect}
		style="display: none;"
	>
	
	<div class="file-info">
		<small>Supports: JSON files (agent_logs.json, filtered_agent_logs.json) or ZIP files (diagnostics.zip with logs + screenshots)</small><br>
		<small>Max recommended size: 50MB</small>
	</div>
</div>

<style>
	.file-upload {
		margin-bottom: 24px;
	}

	.drop-zone {
		border: 2px dashed var(--color-border);
		border-radius: 8px;
		padding: 32px 16px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		margin: 12px 0;
	}

	.drop-zone:hover,
	.drop-zone.dragover {
		border-color: var(--color-theme-1);
		background-color: var(--color-bg-1);
	}

	.drop-zone.loading {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.drop-text {
		color: var(--color-text);
	}

	.loading {
		color: var(--color-theme-1);
		font-weight: 500;
	}

	.file-info {
		color: #666;
		font-size: 12px;
		text-align: center;
	}
</style>