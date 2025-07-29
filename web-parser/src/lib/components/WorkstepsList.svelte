<script>
	import { createEventDispatcher } from "svelte";
	import { filteredLogs, screenshots } from "$lib/stores/logStore.js";
	import { WorkstepParser } from "$lib/utils/workstepParser.js";

	const dispatch = createEventDispatcher();

	// Get all logs with worksteps data grouped by test plan
	$: allWorksteps = extractAllWorkstepDetails($filteredLogs);

	function extractAllWorkstepDetails(logs) {
		const workstepDetails = [];

		logs.forEach((entry, index) => {
			const parsed = WorkstepParser.createReadableSummary(entry);

			// Include ALL entries, not just ones with successfully parsed worksteps
			// This matches what the Log List shows
			// Check for screenshots - need to check both the entry ID and originalScreenshotId for combined entries
			let screenshot = null;
			if ($screenshots) {
				// Try the entry's own ID first
				screenshot = $screenshots[entry.timestamp || entry.id];

				// If this is a combined entry, also try the original screenshot ID
				if (!screenshot && entry.originalScreenshotId) {
					screenshot = $screenshots[entry.originalScreenshotId];
				}

				// Also check if there's screenshot info embedded in the entry
				if (!screenshot && entry.screenshotInfo?.timestamp) {
					screenshot = $screenshots[entry.screenshotInfo.timestamp];
				}
			}

			workstepDetails.push({
				entry: entry,
				parsedEntry: parsed,
				testSteps: parsed.workstepsData
					? WorkstepParser.extractTestSteps(parsed.workstepsData)
					: [],
				currentStep: parsed.stepInfo,
				visionCommands: parsed.visionCommands || [],
				screenshot: screenshot,
			});
		});

		// Sort by session and timestamp
		return workstepDetails.sort((a, b) => {
			if (a.parsedEntry.sessionId !== b.parsedEntry.sessionId) {
				return a.parsedEntry.sessionId.localeCompare(
					b.parsedEntry.sessionId
				);
			}
			return (a.entry.timestamp || a.entry.id).localeCompare(
				b.entry.timestamp || b.entry.id
			);
		});
	}

	function formatTimestamp(timestamp) {
		if (!timestamp) return "";
		try {
			const date = new Date(timestamp);
			return date.toLocaleString();
		} catch {
			return timestamp;
		}
	}

	function getStepStatus(step, currentStepNumber) {
		if (!currentStepNumber) return "pending";
		if (step.stepNumber < currentStepNumber) return "completed";
		if (step.stepNumber === currentStepNumber) return "current";
		return "pending";
	}

	function copyToClipboard(text) {
		navigator.clipboard.writeText(text).then(() => {
			console.log("Copied to clipboard:", text);
		});
	}

	// Get the correct result type using the same logic as WorkstepViewer
	function getResultType(executionResult) {
		if (!executionResult || !executionResult.result) return "info";

		if (executionResult.successful === true) {
			return "success";
		} else if (executionResult.successful === false) {
			// Check if this is a user interaction result
			const resultLower = executionResult.result.toLowerCase();
			const isUserInteraction =
				resultLower.includes("ask_human") ||
				resultLower.includes("answer") ||
				resultLower.includes("user input") ||
				resultLower.includes("confirmation") ||
				resultLower.includes("user response") ||
				resultLower.includes("human input") ||
				resultLower.includes("waiting for user") ||
				resultLower.includes("user interaction");

			return isUserInteraction ? "user" : "error";
		}

		return "info";
	}
</script>

<div class="worksteps-full-list">
	<div class="list-header">
		<h2>📋 Complete Worksteps Details</h2>
		<p class="list-summary">
			{allWorksteps.length} log entr{allWorksteps.length !== 1
				? "ies"
				: "y"} with details
		</p>
	</div>

	{#if allWorksteps.length === 0}
		<div class="empty-state">
			<p>No worksteps found in the loaded logs.</p>
			<p>This might happen if:</p>
			<ul>
				<li>The logs don't contain worksteps data</li>
				<li>The worksteps data is truncated or malformed</li>
				<li>The worksteps are in an unsupported format</li>
			</ul>
			<p>Check the browser console for parsing warnings.</p>
		</div>
	{:else}
		<div class="worksteps-details">
			{#each allWorksteps as workstepDetail, index}
				<div class="workstep-full-section">
					<!-- Test Overview -->
					<div class="test-overview">
						<div class="test-header">
							<h2>
								{workstepDetail.parsedEntry.workstepsData
									?.name || "Log Entry " + (index + 1)}
							</h2>
							<div class="test-meta">
								<span class="session-id"
									>Session: {workstepDetail.parsedEntry.sessionId?.substring(
										0,
										8
									) || "Unknown"}...</span
								>
								<span class="timestamp"
									>{formatTimestamp(
										workstepDetail.entry.timestamp ||
											workstepDetail.entry.id
									)}</span
								>
							</div>
						</div>
						{#if workstepDetail.parsedEntry.workstepsData?.description}
							<p class="test-description">
								{workstepDetail.parsedEntry.workstepsData
									.description}
							</p>
						{:else if workstepDetail.parsedEntry.description}
							<p class="test-description">
								{workstepDetail.parsedEntry.description}
							</p>
						{/if}
					</div>

					<!-- Current Action (if available) -->
					{#if workstepDetail.parsedEntry.currentAction}
						<div class="current-action">
							<h4>🎯 Current Action</h4>
							<div class="action-content">
								<div class="action-description">
									<span class="action-text"
										>{workstepDetail.parsedEntry
											.currentAction.description}</span
									>
									{#if workstepDetail.parsedEntry.currentAction.screenContext}
										<span class="screen-badge"
											>📱 {workstepDetail.parsedEntry
												.currentAction
												.screenContext}</span
										>
									{/if}
								</div>

								{#if workstepDetail.parsedEntry.currentAction.details && workstepDetail.parsedEntry.currentAction.details.length > 0}
									<div class="action-details">
										{#each workstepDetail.parsedEntry.currentAction.details as detail}
											<div
												class="detail-item {detail.type}"
											>
												<span class="detail-label"
													>{detail.label}:</span
												>
												<span class="detail-value"
													>{detail.value}</span
												>
											</div>
										{/each}
									</div>
								{/if}

								{#if workstepDetail.parsedEntry.currentAction.thoughts}
									<div class="agent-thoughts">
										<h5>💭 Agent Thoughts</h5>
										<p>
											{workstepDetail.parsedEntry
												.currentAction.thoughts}
										</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Current Step Details -->
					{#if workstepDetail.currentStep}
						<div class="current-step">
							<h4>
								📋 Current Step: {workstepDetail.currentStep
									.stepNumber}. {workstepDetail.currentStep
									.stepName}
							</h4>
							<div class="step-content">
								<div class="step-instruction">
									<strong>Instruction:</strong>
									{workstepDetail.currentStep.instruction}
								</div>

								{#if workstepDetail.currentStep.expectedResult}
									<div class="step-expected">
										<strong>Expected Result:</strong>
										{workstepDetail.currentStep
											.expectedResult}
									</div>
								{/if}

								{#if WorkstepParser.formatFieldValues(workstepDetail.currentStep.fieldValues).length > 0}
									<div class="step-fields">
										<strong>Field Values:</strong>
										<div class="fields-grid">
											{#each WorkstepParser.formatFieldValues(workstepDetail.currentStep.fieldValues) as field}
												<div class="field-item">
													<span class="field-name"
														>{field.field}:</span
													>
													<span
														class="field-value"
														on:click={() =>
															copyToClipboard(
																field.displayValue
															)}
														title="Click to copy"
														>{field.displayValue}</span
													>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								{#if WorkstepParser.formatTableEntries(workstepDetail.currentStep.tableEntries).length > 0}
									<div class="step-tables">
										<strong>Table Data:</strong>
										{#each WorkstepParser.formatTableEntries(workstepDetail.currentStep.tableEntries) as table}
											<div class="table-section">
												<h5>{table.tableName}</h5>
												{#each table.entries as entry}
													<div class="table-row">
														<span class="row-number"
															>Row {entry.rowNumber}:</span
														>
														{#each entry.fields as field}
															<span
																class="table-field"
																>{field.field}: {field.displayValue}</span
															>
														{/each}
													</div>
												{/each}
											</div>
										{/each}
									</div>
								{/if}

								{#if workstepDetail.currentStep.requiresConfirmation}
									<div class="confirmation-required">
										⚠️ Requires User Confirmation
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- VisionScript Commands -->
					{#if workstepDetail.visionCommands.length > 0}
						<div class="vision-commands">
							<h4>🔧 VisionScript Commands</h4>
							<div class="commands-list">
								{#each workstepDetail.visionCommands as command, i}
									<div
										class="command-item"
										on:click={() =>
											copyToClipboard(
												command.raw ||
													command.description
											)}
										title="Click to copy"
									>
										<span class="command-number"
											>{i + 1}.</span
										>
										<span class="command-description"
											>{command.description}</span
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Execution Result -->
					{#if workstepDetail.parsedEntry.executionResult}
						<div class="execution-result">
							<h4>📊 Execution Result</h4>
							<div class="result-details">
								<div
									class="status {getResultType(
										workstepDetail.parsedEntry
											.executionResult
									)}"
								>
									{#if getResultType(workstepDetail.parsedEntry.executionResult) === "success"}
										✅
									{:else if getResultType(workstepDetail.parsedEntry.executionResult) === "user"}
										👤
									{:else if getResultType(workstepDetail.parsedEntry.executionResult) === "error"}
										❌
									{:else}
										ℹ️
									{/if}
									{workstepDetail.parsedEntry.executionResult
										.result}
								</div>
								{#if workstepDetail.parsedEntry.executionResult.windowSelector}
									<div class="window-info">
										🪟 Window: {workstepDetail.parsedEntry
											.executionResult.windowSelector}
										{#if workstepDetail.parsedEntry.executionResult.isNewWindow}
											<span class="new-window-badge"
												>New Window</span
											>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Test Steps Progress -->
					{#if workstepDetail.testSteps.length > 0}
						<div class="test-progress">
							<h4>
								📈 All Steps ({workstepDetail.testSteps.length} total)
							</h4>
							<div class="steps-timeline">
								{#each workstepDetail.testSteps as step}
									<div
										class="timeline-step {getStepStatus(
											step,
											workstepDetail.currentStep
												?.stepNumber
										)}"
									>
										<div class="step-marker">
											{#if getStepStatus(step, workstepDetail.currentStep?.stepNumber) === "completed"}
												✅
											{:else if getStepStatus(step, workstepDetail.currentStep?.stepNumber) === "current"}
												🔄
											{:else}
												⏳
											{/if}
										</div>
										<div class="step-info">
											<div class="step-title">
												{step.stepNumber}. {step.stepName}
											</div>
											<div class="step-screen">
												{step.screenName}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Screenshot -->
					{#if workstepDetail.screenshot}
						<div class="screenshot-section">
							<h4>📸 Screen Capture</h4>
							<div class="screenshot-container">
								<img
									src={workstepDetail.screenshot}
									alt="Screen capture for {workstepDetail
										.entry.timestamp ||
										workstepDetail.entry.id}"
									class="screenshot-image"
								/>
							</div>
						</div>
					{/if}

					<!-- Agent Instructions Summary - Collapsible like in WorkstepViewer -->
					{#if workstepDetail.parsedEntry.parsedInstructions && workstepDetail.parsedEntry.parsedInstructions.summary}
						<div class="instructions-summary">
							<details class="agent-behavior-details">
								<summary
									>🤖 Agent Behavior (Click to expand)</summary
								>
								<div class="agent-behavior-content">
									<p class="instructions-summary-text">
										{workstepDetail.parsedEntry
											.parsedInstructions.summary}
									</p>

									{#if workstepDetail.parsedEntry.parsedInstructions.confirmationRules.length > 0}
										<details class="confirmation-rules">
											<summary
												>Key Confirmation Rules</summary
											>
											<ul>
												{#each workstepDetail.parsedEntry.parsedInstructions.confirmationRules as rule}
													<li>{rule}</li>
												{/each}
											</ul>
										</details>
									{/if}
								</div>
							</details>
						</div>
					{/if}

					{#if index < allWorksteps.length - 1}
						<div class="section-divider"></div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.worksteps-full-list {
		padding: 12px;
		max-height: 100vh;
		overflow-y: auto;
		background: #f5f5f5;
	}

	.list-header {
		margin-bottom: 16px;
		text-align: center;
		background: white;
		padding: 12px;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.list-header h2 {
		margin: 0 0 4px 0;
		color: #333;
		font-size: 22px;
	}

	.list-summary {
		color: #666;
		font-size: 13px;
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

	/* Full workstep details layout */
	.worksteps-details {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.workstep-full-section {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	/* Test Overview */
	.test-overview {
		background: var(--color-bg-2, #f8f9fa);
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 12px;
		border-left: 3px solid var(--color-theme-1, #007bff);
	}

	.test-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 6px;
	}

	.test-header h2 {
		margin: 0;
		color: var(--color-theme-1, #007bff);
		font-size: 18px;
	}

	.test-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		font-size: 12px;
	}

	.session-id {
		background: var(--color-info, #17a2b8);
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		font-family: monospace;
	}

	.timestamp {
		color: #666;
		font-family: monospace;
	}

	.test-description {
		margin: 0;
		color: #666;
		font-style: italic;
	}

	/* Current Action */
	.current-action {
		background: #fff9e6;
		border: 1px solid #ffd700;
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.current-action h4 {
		margin: 0 0 8px 0;
		color: #b8860b;
		font-size: 15px;
	}

	.action-description {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
		font-weight: 500;
		font-size: 14px;
		min-height: 24px; /* Prevent height shift when badge appears */
	}

	.action-text {
		flex: 1; /* Take up available space */
		min-width: 0; /* Allow text to shrink if needed */
	}

	.screen-badge {
		background: #e3f2fd;
		color: #1976d2;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: normal;
		flex-shrink: 0; /* Prevent badge from shrinking */
		white-space: nowrap; /* Prevent badge text from wrapping */
	}

	.action-details {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.detail-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 4px;
		font-size: 12px;
	}

	.detail-item.success {
		background: #d4edda;
		border: 1px solid #c3e6cb;
	}

	.detail-item.error {
		background: #f8d7da;
		border: 1px solid #f5c6cb;
	}

	.detail-item.info {
		background: #d1ecf1;
		border: 1px solid #bee5eb;
	}

	.detail-item.user {
		background: #e7f3ff;
		border: 1px solid #b3d9ff;
		color: #004085;
	}

	.detail-item.user::before {
		content: "👤";
		margin-right: 6px;
	}

	.detail-label {
		font-weight: 600;
		color: #666;
	}

	/* Current Step */
	.current-step {
		background: #f0f8ff;
		border: 1px solid #4a90e2;
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.current-step h4 {
		margin: 0 0 8px 0;
		color: #2c5aa0;
		font-size: 15px;
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.step-instruction,
	.step-expected {
		padding: 8px 12px;
		border-radius: 4px;
		background: white;
		border-left: 3px solid #4a90e2;
	}

	.step-fields {
		background: white;
		padding: 12px;
		border-radius: 4px;
		border-left: 3px solid #28a745;
	}

	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 8px;
		margin-top: 8px;
	}

	.field-item {
		display: flex;
		gap: 8px;
		padding: 4px 8px;
		background: #f8f9fa;
		border-radius: 4px;
	}

	.field-name {
		font-weight: 500;
		color: #495057;
		min-width: 80px;
	}

	.field-value {
		color: #007bff;
		cursor: pointer;
		font-family: monospace;
		word-break: break-all;
	}

	.field-value:hover {
		background: #e3f2fd;
		border-radius: 2px;
	}

	.step-tables {
		background: white;
		padding: 12px;
		border-radius: 4px;
		border-left: 3px solid #fd7e14;
	}

	.table-section {
		margin-bottom: 12px;
	}

	.table-section h5 {
		margin: 0 0 8px 0;
		color: #fd7e14;
		font-size: 14px;
	}

	.table-row {
		padding: 4px 8px;
		background: #fff3cd;
		border-radius: 4px;
		margin-bottom: 4px;
		font-size: 12px;
	}

	.row-number {
		font-weight: 500;
		margin-right: 8px;
	}

	.table-field {
		margin-right: 12px;
		color: #856404;
	}

	.confirmation-required {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		padding: 8px 12px;
		border-radius: 4px;
		color: #856404;
		font-weight: 500;
	}

	/* Vision Commands */
	.vision-commands {
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.vision-commands h4 {
		margin: 0 0 8px 0;
		color: #495057;
		font-size: 15px;
	}

	.commands-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.command-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		font-family: monospace;
		font-size: 12px;
	}

	.command-item:hover {
		background: #e9ecef;
	}

	.command-number {
		color: #6c757d;
		font-weight: 500;
		min-width: 20px;
	}

	.command-description {
		color: #495057;
		flex: 1;
	}

	/* Test Progress */
	.test-progress {
		background: #f1f8e9;
		border: 1px solid #c3d69b;
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.test-progress h4 {
		margin: 0 0 8px 0;
		color: #4caf50;
		font-size: 15px;
	}

	.steps-timeline {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.timeline-step {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		background: white;
		border-radius: 4px;
		border-left: 3px solid #ccc;
		font-size: 13px;
	}

	.timeline-step.completed {
		border-left-color: #28a745;
		background: #f8fff9;
	}

	.timeline-step.current {
		border-left-color: #ffc107;
		background: #fffef5;
	}

	.timeline-step.pending {
		border-left-color: #6c757d;
		background: #f8f9fa;
	}

	.step-marker {
		font-size: 16px;
		width: 24px;
		text-align: center;
	}

	.step-info {
		flex: 1;
	}

	.step-title {
		font-weight: 500;
		color: #495057;
		margin-bottom: 2px;
	}

	.step-screen {
		font-size: 12px;
		color: #6c757d;
	}

	/* Screenshot */
	.screenshot-section {
		background: var(--color-bg-2, #f8f9fa);
		border: 1px solid var(--color-border, #dee2e6);
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.screenshot-section h4 {
		margin: 0 0 8px 0;
		color: #495057;
		font-size: 15px;
	}

	.screenshot-container {
		border: 1px solid #dee2e6;
		border-radius: 4px;
		overflow: hidden;
		background: white;
	}

	.screenshot-image {
		width: 100%;
		height: auto;
		display: block;
		max-height: 400px;
		object-fit: contain;
	}

	/* Execution Result */
	.execution-result {
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.execution-result h4 {
		margin: 0 0 8px 0;
		color: #495057;
		font-size: 15px;
	}

	.result-details {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status {
		padding: 8px 12px;
		border-radius: 4px;
		font-weight: 500;
		font-size: 13px;
	}

	.status.success {
		background: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.status.error {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.status.info {
		background: #d1ecf1;
		color: #0c5460;
		border: 1px solid #bee5eb;
	}

	.status.user {
		background: #e7f3ff;
		color: #004085;
		border: 1px solid #b3d9ff;
	}

	.window-info {
		font-family: monospace;
		font-size: 12px;
		color: #666;
	}

	.new-window-badge {
		background: #17a2b8;
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 10px;
		margin-left: 8px;
		font-weight: 500;
	}

	/* Agent Thoughts */
	.agent-thoughts {
		margin-top: 12px;
		padding: 10px;
		background: rgba(255, 193, 7, 0.1);
		border-radius: 4px;
		border: 1px solid rgba(255, 193, 7, 0.3);
	}

	.agent-thoughts h5 {
		margin: 0 0 6px 0;
		color: #b8860b;
		font-size: 13px;
	}

	.agent-thoughts p {
		margin: 0;
		font-style: italic;
		color: #666;
		font-size: 13px;
	}

	/* Agent Instructions Summary */
	.instructions-summary {
		background: #f8f9fa;
		padding: 10px;
		border-radius: 6px;
		margin-top: 20px;
		margin-bottom: 20px;
		border-left: 4px solid #ccc;
	}

	.agent-behavior-details {
		margin: 0;
	}

	.agent-behavior-details summary {
		cursor: pointer;
		font-weight: 500;
		color: #666;
		padding: 8px 0;
		user-select: none;
	}

	.agent-behavior-details summary:hover {
		color: #007bff;
	}

	.agent-behavior-content {
		padding-top: 10px;
	}

	.instructions-summary-text {
		margin: 0 0 10px 0;
		font-style: italic;
		color: #666;
		font-size: 13px;
	}

	.confirmation-rules {
		margin-top: 12px;
	}

	.confirmation-rules summary {
		cursor: pointer;
		font-weight: 500;
		color: #17a2b8;
		margin-bottom: 8px;
		font-size: 13px;
	}

	.confirmation-rules ul {
		margin: 8px 0 0 20px;
		padding: 0;
	}

	.confirmation-rules li {
		margin-bottom: 6px;
		font-size: 12px;
		line-height: 1.4;
		color: #666;
	}

	/* Section Divider */
	.section-divider {
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			#dee2e6,
			transparent
		);
		margin: 12px 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.worksteps-full-list {
			padding: 12px;
		}

		.workstep-full-section {
			padding: 16px;
		}

		.fields-grid {
			grid-template-columns: 1fr;
		}

		.test-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.test-meta {
			align-items: flex-start;
		}
	}
</style>
