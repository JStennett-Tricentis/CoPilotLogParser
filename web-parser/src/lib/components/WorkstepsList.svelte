<script>
	import { createEventDispatcher } from "svelte";
	import { filteredLogs } from "$lib/stores/logStore.js";
	import { WorkstepParser } from "$lib/utils/workstepParser.js";

	const dispatch = createEventDispatcher();

	// Get all unique worksteps from the logs
	$: allWorksteps = extractAllWorksteps($filteredLogs);

	// Debug logging
	$: {
		console.log("WorkstepsList: filteredLogs count:", $filteredLogs.length);
		console.log("WorkstepsList: allWorksteps count:", allWorksteps.length);
		if (allWorksteps.length > 0) {
			console.log("WorkstepsList: first workstep:", allWorksteps[0]);
		}
	}

	function extractAllWorksteps(logs) {
		const stepsList = [];

		logs.forEach((entry, index) => {
			console.log(
				`Processing entry ${index}, has worksteps:`,
				!!entry.worksteps,
			);
			const parsed = WorkstepParser.createReadableSummary(entry);
			console.log(
				`Entry ${index} parsed workstepsData:`,
				!!parsed.workstepsData,
			);

			// Try to get worksteps from parsed data first
			if (parsed.workstepsData && parsed.workstepsData.test_steps) {
				const testPlan = parsed.workstepsData;
				const testSteps = WorkstepParser.extractTestSteps(testPlan);

				// Create a card for each individual step
				testSteps.forEach((step) => {
					stepsList.push({
						stepNumber: step.stepNumber,
						stepName: step.stepName,
						screenName: step.screenName,
						instruction: step.instruction,
						expectedResult: step.expectedResult,
						requiresConfirmation: step.requiresConfirmation,
						fieldValues: step.fieldValues,
						tableEntries: step.tableEntries,
						testPlanName: testPlan.name,
						testPlanDescription: testPlan.description,
						sessionId: parsed.sessionId,
						relatedEntry: entry,
						source: "worksteps",
					});
				});

				console.log(
					`Entry ${index} extracted ${testSteps.length} individual steps from: ${testPlan.name}`,
				);
			} else {
				// Fallback: try to extract info from description or other fields
				const workstepInfo = extractWorkstepInfoFromEntry(entry);
				if (workstepInfo && workstepInfo.testSteps) {
					workstepInfo.testSteps.forEach((step) => {
						stepsList.push({
							stepNumber: step.stepNumber,
							stepName: step.stepName,
							screenName: step.screenName || "Unknown",
							instruction: step.instruction,
							expectedResult:
								step.expectedResult || "Step completion",
							requiresConfirmation:
								step.requiresConfirmation || false,
							fieldValues: step.fieldValues || {},
							tableEntries: step.tableEntries || [],
							testPlanName: workstepInfo.name,
							testPlanDescription: workstepInfo.description,
							sessionId: parsed.sessionId,
							relatedEntry: entry,
							source: workstepInfo.source,
						});
					});
					console.log(
						`Entry ${index} extracted ${workstepInfo.testSteps.length} fallback steps`,
					);
				}
			}
		});

		// Sort by session and step number
		return stepsList.sort((a, b) => {
			if (a.sessionId !== b.sessionId) {
				return a.sessionId.localeCompare(b.sessionId);
			}
			return a.stepNumber - b.stepNumber;
		});
	}

	function extractWorkstepInfoFromEntry(entry) {
		// Try to extract workstep info from description field
		if (entry.description && entry.description.includes("test_data")) {
			const testDataMatch = entry.description.match(
				/<test_data>\s*\{[^}]*'name':\s*'([^']+)'[^}]*'description':\s*'([^']+)'/,
			);
			if (testDataMatch) {
				return {
					name: testDataMatch[1],
					description: testDataMatch[2],
					testSteps: extractStepsFromThoughts(entry),
					source: "description",
				};
			}
		}

		// Try to extract from thoughts if they contain step information
		if (entry.thoughts && entry.thoughts.includes("Step")) {
			const steps = extractStepsFromThoughts(entry);
			if (steps.length > 0) {
				return {
					name: "Agent Test Execution",
					description: "Test steps extracted from agent thoughts",
					testSteps: steps,
					source: "thoughts",
				};
			}
		}

		return null;
	}

	function extractStepsFromThoughts(entry) {
		const steps = [];

		if (!entry.thoughts) return steps;

		// Look for step references in thoughts
		const stepMatches = entry.thoughts.match(/Step\s+(\d+)[:\s]*([^.]+)/g);
		if (stepMatches) {
			stepMatches.forEach((match, index) => {
				const stepMatch = match.match(/Step\s+(\d+)[:\s]*(.+)/);
				if (stepMatch) {
					steps.push({
						stepNumber: parseInt(stepMatch[1]),
						stepName: stepMatch[2].trim(),
						screenName: "Unknown",
						instruction: stepMatch[2].trim(),
						expectedResult: "Step completion",
						requiresConfirmation: false,
						fieldValues: {},
						tableEntries: [],
					});
				}
			});
		}

		return steps;
	}

	function selectWorkstep(step) {
		// For individual steps, use the related entry directly
		dispatch("entryselect", step.relatedEntry);
	}

	function getStepStatusIcon(step) {
		if (step.requiresConfirmation) {
			return "⚠️";
		}
		return "✅";
	}

	function formatFieldValues(fieldValues) {
		if (!fieldValues || Object.keys(fieldValues).length === 0) return [];
		return Object.entries(fieldValues).map(([field, value]) => ({
			field,
			value,
		}));
	}

	function formatTableEntries(tableEntries) {
		if (!tableEntries || tableEntries.length === 0) return [];
		return tableEntries.map((table) => ({
			tableName: table.table_name,
			entries: table.entries.map((entry) => ({
				rowNumber: entry.row_number,
				fields: formatFieldValues(entry.field_values),
			})),
		}));
	}
</script>

<div class="worksteps-list">
	<div class="list-header">
		<h2>📋 All Test Steps</h2>
		<p class="list-summary">
			{allWorksteps.length} test step{allWorksteps.length !== 1
				? "s"
				: ""} found
		</p>
	</div>

	{#if allWorksteps.length === 0}
		<div class="empty-state">
			<p>No test steps found in the loaded logs.</p>
			<p>This might happen if:</p>
			<ul>
				<li>The logs don't contain worksteps data</li>
				<li>The worksteps data is truncated or malformed</li>
				<li>The worksteps are in an unsupported format</li>
			</ul>
			<p>Check the browser console for parsing warnings.</p>
		</div>
	{:else}
		<div class="worksteps-grid">
			{#each allWorksteps as step}
				<div
					class="workstep-card"
					on:click={() => selectWorkstep(step)}
					on:keydown={(e) =>
						e.key === "Enter" && selectWorkstep(step)}
					role="button"
					tabindex="0"
				>
					<div class="workstep-header">
						<div class="step-number-badge">{step.stepNumber}</div>
						<div class="step-info">
							<h3>{step.stepName}</h3>
							<div class="workstep-meta">
								<span class="test-plan-badge"
									>{step.testPlanName}</span
								>
								<span class="session-badge"
									>Session: {step.sessionId?.substring(
										0,
										8,
									)}...</span
								>
							</div>
						</div>
						<div class="step-status">
							{getStepStatusIcon(step)}
						</div>
					</div>

					<div class="step-details">
						<div class="step-screen">📱 {step.screenName}</div>
						<div class="step-instruction">{step.instruction}</div>

						{#if step.expectedResult}
							<div class="step-expected">
								<strong>Expected:</strong>
								{step.expectedResult}
							</div>
						{/if}

						{#if formatFieldValues(step.fieldValues).length > 0}
							<div class="step-fields">
								<strong>Fields:</strong>
								{#each formatFieldValues(step.fieldValues) as field}
									<span class="field-tag"
										>{field.field}: {field.value}</span
									>
								{/each}
							</div>
						{/if}

						{#if formatTableEntries(step.tableEntries).length > 0}
							<div class="step-tables">
								<strong>Tables:</strong>
								{#each formatTableEntries(step.tableEntries) as table}
									<span class="table-tag"
										>{table.tableName} ({table.entries
											.length} rows)</span
									>
								{/each}
							</div>
						{/if}
					</div>

					<div class="workstep-footer">
						<span class="step-source">Source: {step.source}</span>
						<button class="view-btn">View Details →</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.worksteps-list {
		padding: 20px;
		max-height: 100vh;
		overflow-y: auto;
	}

	.list-header {
		margin-bottom: 30px;
		text-align: center;
	}

	.list-header h2 {
		margin: 0 0 10px 0;
		color: #333;
		font-size: 28px;
	}

	.list-summary {
		color: #666;
		font-size: 14px;
		margin: 0;
	}

	.empty-state {
		text-align: center;
		padding: 60px 20px;
		color: #666;
		max-width: 600px;
		margin: 0 auto;
	}

	.empty-state p {
		margin: 15px 0;
		line-height: 1.5;
	}

	.empty-state ul {
		text-align: left;
		display: inline-block;
		margin: 20px 0;
	}

	.empty-state li {
		margin: 8px 0;
		color: #777;
	}

	.worksteps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
		gap: 20px;
	}

	.workstep-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 20px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.workstep-card:hover {
		border-color: var(--color-theme-1, #007bff);
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
		transform: translateY(-2px);
	}

	.workstep-header {
		display: flex;
		align-items: flex-start;
		gap: 15px;
		margin-bottom: 15px;
	}

	.step-number-badge {
		background: var(--color-theme-1, #007bff);
		color: white;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 16px;
		flex-shrink: 0;
	}

	.step-info {
		flex: 1;
	}

	.step-info h3 {
		margin: 0 0 8px 0;
		color: #333;
		font-size: 18px;
		font-weight: 600;
		line-height: 1.3;
	}

	.workstep-meta {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	.step-status {
		font-size: 20px;
		flex-shrink: 0;
	}

	.session-badge {
		background: #f0f0f0;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		color: #666;
		font-family: monospace;
	}

	.test-plan-badge {
		background: var(--color-theme-1, #007bff);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.step-details {
		margin-bottom: 15px;
	}

	.step-screen {
		color: #666;
		font-size: 13px;
		margin-bottom: 8px;
		font-weight: 500;
	}

	.step-instruction {
		color: #333;
		font-size: 14px;
		line-height: 1.4;
		margin-bottom: 10px;
	}

	.step-expected {
		color: #555;
		font-size: 13px;
		line-height: 1.4;
		margin-bottom: 10px;
		padding: 8px;
		background: #f8f9fa;
		border-radius: 4px;
	}

	.step-expected strong {
		color: #333;
	}

	.step-fields,
	.step-tables {
		margin-bottom: 8px;
	}

	.step-fields strong,
	.step-tables strong {
		color: #333;
		font-size: 12px;
		display: block;
		margin-bottom: 5px;
	}

	.field-tag,
	.table-tag {
		display: inline-block;
		background: #e7f3ff;
		color: #0066cc;
		padding: 2px 6px;
		margin: 2px 4px 2px 0;
		border-radius: 3px;
		font-size: 11px;
		font-family: monospace;
	}

	.table-tag {
		background: #fff2e7;
		color: #cc6600;
	}

	.workstep-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 15px;
		padding-top: 15px;
		border-top: 1px solid #f0f0f0;
	}

	.step-source {
		color: #666;
		font-size: 12px;
	}

	.view-btn {
		background: var(--color-theme-1, #007bff);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.view-btn:hover {
		background: var(--color-theme-2, #0056b3);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.worksteps-grid {
			grid-template-columns: 1fr;
		}

		.workstep-card {
			padding: 15px;
		}
	}
</style>
