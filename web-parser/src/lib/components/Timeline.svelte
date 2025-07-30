<script>
	import { onMount, onDestroy } from 'svelte';
	import { Timeline as VisTimeline } from 'vis-timeline/standalone';
	import { DataSet } from 'vis-data';
	import { createEventDispatcher } from 'svelte';
	
	export let data = [];
	export let height = 300;
	
	const dispatch = createEventDispatcher();
	
	let container;
	let timeline;
	let items;
	
	onMount(() => {
		initializeTimeline();
	});
	
	onDestroy(() => {
		if (timeline) {
			timeline.destroy();
		}
	});
	
	$: if (timeline && data) {
		updateTimelineData();
	}
	
	function initializeTimeline() {
		if (!container) return;
		
		items = new DataSet();
		
		const options = {
			height: `${height}px`,
			margin: {
				item: 10,
				axis: 40
			},
			orientation: 'top',
			showCurrentTime: false,
			zoomable: true,
			moveable: true,
			selectable: true,
			multiselect: false,
			template: function(item) {
				return `<div class="timeline-item">
					<strong>${item.content}</strong>
					${item.description ? `<br><small>${item.description}</small>` : ''}
				</div>`;
			}
		};
		
		timeline = new VisTimeline(container, items, options);
		
		// Event listeners
		timeline.on('select', function(properties) {
			if (properties.items.length > 0) {
				const selectedId = properties.items[0];
				const selectedItem = items.get(selectedId);
				dispatch('itemselect', selectedItem);
			}
		});
		
		timeline.on('doubleClick', function(properties) {
			if (properties.item) {
				const item = items.get(properties.item);
				dispatch('itemdoubleclick', item);
			}
		});
		
		updateTimelineData();
	}
	
	function updateTimelineData() {
		if (!items || !data.length) return;
		
		const timelineItems = data.map((entry, index) => {
			const timestamp = parseTimestamp(entry.timestamp || entry.id);
			const endTime = calculateEndTime(entry, timestamp);
			
			return {
				id: index,
				start: timestamp,
				end: endTime,
				content: getItemTitle(entry),
				description: getItemDescription(entry),
				className: getItemClass(entry),
				originalData: entry
			};
		}).filter(item => item.start); // Filter out items without valid timestamps
		
		items.clear();
		items.add(timelineItems);
		
		// Fit timeline to show all items
		if (timelineItems.length > 0) {
			timeline.fit();
		}
	}
	
	function parseTimestamp(timestamp) {
		if (!timestamp) return null;
		
		// Handle format: 20250723205312
		if (typeof timestamp === 'string' && timestamp.length === 14) {
			const year = timestamp.substring(0, 4);
			const month = timestamp.substring(4, 6);
			const day = timestamp.substring(6, 8);
			const hour = timestamp.substring(8, 10);
			const minute = timestamp.substring(10, 12);
			const second = timestamp.substring(12, 14);
			
			return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
		}
		
		// Try to parse as regular date
		const parsed = new Date(timestamp);
		return isNaN(parsed.getTime()) ? null : parsed;
	}
	
	function calculateEndTime(entry, startTime) {
		if (!startTime) return null;
		
		// Estimate duration based on content
		let durationMs = 5000; // Default 5 seconds
		
		if (entry.actions && entry.actions.length > 0) {
			durationMs = entry.actions.length * 2000; // 2 seconds per action
		}
		
		if (entry.test_steps && entry.test_steps.length > 0) {
			durationMs = entry.test_steps.length * 10000; // 10 seconds per test step
		}
		
		return new Date(startTime.getTime() + durationMs);
	}
	
	function getItemTitle(entry) {
		if (entry.test_steps && entry.test_steps.length > 0) {
			return entry.test_steps[0].description || 'Test Step';
		}
		
		if (entry.description) {
			const desc = entry.description.replace(/<[^>]*>/g, '').trim();
			return desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
		}
		
		return 'Log Entry';
	}
	
	function getItemDescription(entry) {
		const details = [];
		
		
		if (entry.actions) {
			details.push(`${entry.actions.length} actions`);
		}
		
		if (entry.test_steps) {
			details.push(`${entry.test_steps.length} test steps`);
		}
		
		return details.join(', ');
	}
	
	function getItemClass(entry) {
		if (entry.actions) {
			const actionTypes = entry.actions.map(a => a.action);
			if (actionTypes.includes('screenshot')) return 'timeline-screenshot';
			if (actionTypes.includes('error')) return 'timeline-error';
		}
		
		return 'timeline-default';
	}
</script>

<div class="timeline-container">
	<div class="timeline-header">
		<h4>Timeline View</h4>
		<div class="timeline-controls">
			<button class="btn btn-secondary" on:click={() => timeline && timeline.fit()}>
				Fit All
			</button>
			<button class="btn btn-secondary" on:click={() => timeline && timeline.zoomIn(0.5)}>
				Zoom In
			</button>
			<button class="btn btn-secondary" on:click={() => timeline && timeline.zoomOut(0.5)}>
				Zoom Out
			</button>
		</div>
	</div>
	
	<div class="timeline-wrapper" bind:this={container}></div>
</div>

<style>
	.timeline-container {
		background: white;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: var(--color-bg-1);
		border-bottom: 1px solid var(--color-border);
	}

	.timeline-header h4 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	.timeline-controls {
		display: flex;
		gap: 4px;
	}

	.timeline-controls .btn {
		padding: 4px 8px;
		font-size: 11px;
	}

	.timeline-wrapper {
		position: relative;
	}
	
	/* Timeline item styles */
	:global(.timeline-item) {
		padding: 4px 8px;
		font-size: 12px;
		line-height: 1.3;
	}
	
	:global(.timeline-default .vis-item) {
		background-color: var(--color-theme-1);
		border-color: var(--color-theme-2);
	}
	
	:global(.timeline-screenshot .vis-item) {
		background-color: #28a745;
		border-color: #1e7e34;
	}
	
	:global(.timeline-error .vis-item) {
		background-color: #dc3545;
		border-color: #c82333;
	}
	
	:global(.vis-item.vis-selected) {
		border-width: 2px;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.3);
	}
</style>