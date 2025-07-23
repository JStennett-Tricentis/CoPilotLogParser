<script>
	import { createEventDispatcher } from 'svelte';
	
	export let data = [];
	export let columns = [];
	export let height = 400;
	
	const dispatch = createEventDispatcher();
	
	let container;
	let scrollTop = 0;
	let containerHeight = height;
	
	// Virtual scrolling parameters
	const itemHeight = 50;
	const overscan = 5;
	
	$: visibleStart = Math.floor(scrollTop / itemHeight);
	$: visibleEnd = Math.min(
		visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
		data.length
	);
	$: visibleItems = data.slice(
		Math.max(0, visibleStart - overscan),
		visibleEnd
	);
	$: offsetY = Math.max(0, visibleStart - overscan) * itemHeight;
	
	function handleScroll(e) {
		scrollTop = e.target.scrollTop;
	}
	
	function handleRowClick(item, index) {
		dispatch('rowclick', { item, index });
	}
	
	function getCellValue(item, column) {
		if (column.accessor) {
			return column.accessor(item);
		}
		return item[column.key] || '';
	}
</script>

<div class="virtual-table" style="height: {height}px;">
	<!-- Header -->
	<div class="table-header">
		{#each columns as column}
			<div class="header-cell" style="width: {column.width || 'auto'};">
				{column.header}
			</div>
		{/each}
	</div>
	
	<!-- Body with virtual scrolling -->
	<div 
		class="table-body"
		bind:this={container}
		on:scroll={handleScroll}
		style="height: {height - 40}px;"
	>
		<div 
			class="table-content"
			style="height: {data.length * itemHeight}px; position: relative;"
		>
			<div 
				class="visible-rows"
				style="transform: translateY({offsetY}px);"
			>
				{#each visibleItems as item, index}
					<div 
						class="table-row"
						style="height: {itemHeight}px;"
						on:click={() => handleRowClick(item, index)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleRowClick(item, index)}
					>
						{#each columns as column}
							<div class="table-cell" style="width: {column.width || 'auto'};">
								{getCellValue(item, column)}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.virtual-table {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		background: white;
	}

	.table-header {
		display: flex;
		background: var(--color-bg-2);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-cell {
		padding: 12px 8px;
		font-weight: 600;
		border-right: 1px solid var(--color-border);
		flex: 1;
		min-width: 0;
	}

	.header-cell:last-child {
		border-right: none;
	}

	.table-body {
		overflow: auto;
		position: relative;
	}

	.table-content {
		position: relative;
	}

	.visible-rows {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.table-row {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.table-row:hover {
		background-color: var(--color-bg-1);
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.table-cell {
		padding: 8px;
		border-right: 1px solid var(--color-border);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
	}

	.table-cell:last-child {
		border-right: none;
	}
</style>