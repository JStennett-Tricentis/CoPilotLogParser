<script>
	import { createEventDispatcher, onMount, onDestroy } from "svelte";
	import { WorkstepParser } from "$lib/utils/workstepParser.js";
	import { screenshots, filteredLogs } from "$lib/stores/logStore.js";

	export let entry = null;

	const dispatch = createEventDispatcher();

	function handleKeyDown(event) {
		if (event.ctrlKey || event.metaKey) return; // Don't interfere with browser shortcuts
		
		switch(event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				navigateToPrevEntry();
				break;
			case 'ArrowRight':
				event.preventDefault();
				navigateToNextEntry();
				break;
			case 'Escape':
				event.preventDefault();
				dispatch('backtolist');
				break;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeyDown);
	});

	$: parsedEntry = entry ? WorkstepParser.createReadableSummary(entry) : null;
	$: testSteps = parsedEntry?.workstepsData
		? WorkstepParser.extractTestSteps(parsedEntry.workstepsData)
		: [];
	$: currentStep = parsedEntry?.stepInfo;
	$: fieldValues = currentStep
		? WorkstepParser.formatFieldValues(currentStep.fieldValues)
		: [];
	$: tableEntries = currentStep
		? WorkstepParser.formatTableEntries(currentStep.tableEntries)
		: [];
	$: visionCommands = parsedEntry?.visionCommands || [];
	$: currentScreenshot = entry && $screenshots && (
		// For combined entries, use the original screenshot ID
		entry.isCombinedEntry && entry.originalScreenshotId 
			? $screenshots[entry.originalScreenshotId]
			: $screenshots[entry.timestamp || entry.id]
	);

	function formatTimestamp(timestamp) {
		if (!timestamp) return "";

		if (typeof timestamp === "string" && timestamp.length === 14) {
			const year = timestamp.substring(0, 4);
			const month = timestamp.substring(4, 6);
			const day = timestamp.substring(6, 8);
			const hour = timestamp.substring(8, 10);
			const minute = timestamp.substring(10, 12);
			const second = timestamp.substring(12, 14);

			return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
		}

		return timestamp;
	}

	function getStepStatus(step, currentStepNumber) {
		if (!currentStepNumber) return "pending";
		if (step.stepNumber < currentStepNumber) return "completed";
		if (step.stepNumber === currentStepNumber) return "current";
		return "pending";
	}

	function copyVisionScript() {
		if (visionCommands.length === 0) return;

		const scriptText = visionCommands
			.map((cmd) => cmd.description)
			.join("\n");

		navigator.clipboard.writeText(scriptText).then(() => {
			dispatch("copy", { type: "visionscript", content: scriptText });
		});
	}

	function copyFieldValues() {
		if (fieldValues.length === 0) return;

		const fieldsText = fieldValues
			.map((field) => `${field.field}: ${field.displayValue}`)
			.join("\n");

		navigator.clipboard.writeText(fieldsText).then(() => {
			dispatch("copy", { type: "fields", content: fieldsText });
		});
	}

	function navigateToStep(targetStep) {
		// Find log entry that matches this step
		const targetEntry = $filteredLogs.find(logEntry => {
			const parsed = WorkstepParser.createReadableSummary(logEntry);
			return parsed.stepInfo && parsed.stepInfo.stepNumber === targetStep.stepNumber;
		});

		if (targetEntry) {
			dispatch("entryselect", targetEntry);
		}
	}

	function navigateToNextEntry() {
		const currentIndex = $filteredLogs.findIndex(logEntry => 
			(logEntry.timestamp || logEntry.id) === (entry.timestamp || entry.id)
		);
		
		if (currentIndex !== -1 && currentIndex < $filteredLogs.length - 1) {
			dispatch("entryselect", $filteredLogs[currentIndex + 1]);
		}
	}

	function navigateToPrevEntry() {
		const currentIndex = $filteredLogs.findIndex(logEntry => 
			(logEntry.timestamp || logEntry.id) === (entry.timestamp || entry.id)
		);
		
		if (currentIndex > 0) {
			dispatch("entryselect", $filteredLogs[currentIndex - 1]);
		}
	}

	function getExecutionResultStatus(executionResult) {
		if (!executionResult) return 'info';
		
		if (executionResult.successful === true) {
			return 'success';
		} else if (executionResult.successful === false) {
			// Check if this is a user interaction result
			const resultLower = executionResult.result?.toLowerCase() || '';
			const isUserInteraction = resultLower.includes('ask_human') || 
									 resultLower.includes('answer') ||
									 resultLower.includes('user input') ||
									 resultLower.includes('confirmation') ||
									 resultLower.includes('user response') ||
									 resultLower.includes('human input') ||
									 resultLower.includes('waiting for user') ||
									 resultLower.includes('user interaction');
			
			return isUserInteraction ? 'user' : 'error';
		}
		
		return 'info';
	}
</script>

{#if parsedEntry}
	<div class="workstep-viewer">
		<!-- Navigation Controls -->
		<div class="navigation-controls">
			<div class="nav-left">
				<div class="nav-context">
					Entry {$filteredLogs.findIndex(logEntry => (logEntry.timestamp || logEntry.id) === (entry.timestamp || entry.id)) + 1} of {$filteredLogs.length}
				</div>
				<button 
					class="nav-btn" 
					on:click={navigateToPrevEntry}
					disabled={$filteredLogs.findIndex(logEntry => (logEntry.timestamp || logEntry.id) === (entry.timestamp || entry.id)) === 0}
				>
					← Previous Entry
				</button>
				<button 
					class="nav-btn" 
					on:click={navigateToNextEntry}
					disabled={$filteredLogs.findIndex(logEntry => (logEntry.timestamp || logEntry.id) === (entry.timestamp || entry.id)) === $filteredLogs.length - 1}
				>
					Next Entry →
				</button>
			</div>
			<div class="nav-right">
				<div class="keyboard-hints">
					<small>← → to navigate | ESC for list</small>
				</div>
				<button 
					class="nav-btn secondary" 
					on:click={() => dispatch('backtolist')}
				>
					📋 Back to List
				</button>
			</div>
		</div>

		<!-- Test Overview -->
		{#if parsedEntry.workstepsData}
			<div class="test-overview">
				<div class="test-header">
					<h2>{parsedEntry.workstepsData.name}</h2>
					<div class="test-meta">
						<span class="session-id"
							>Session: {parsedEntry.sessionId?.substring(
								0,
								8,
							)}...</span
						>
						<span class="timestamp"
							>{formatTimestamp(parsedEntry.timestamp)}</span
						>
					</div>
				</div>
				<p class="test-description">
					{parsedEntry.workstepsData.description}
				</p>
			</div>
		{/if}

		<!-- Current Step Details -->
		{#if currentStep}
			<div class="current-step">
				<div class="step-header">
					<h3>
						<span class="step-number"
							>Step {currentStep.stepNumber}</span
						>
						<span class="step-name">{currentStep.stepName}</span>
					</h3>
					<div class="step-meta">
						<span class="screen-name"
							>📱 {currentStep.screenName}</span
						>
						{#if currentStep.requiresConfirmation}
							<span class="confirmation-required"
								>⚠️ Requires Confirmation</span
							>
						{/if}
					</div>
				</div>

				<div class="step-content">
					<div class="instruction">
						<h4>📋 Instruction</h4>
						<p>{currentStep.instruction}</p>
					</div>

					<div class="expected-result">
						<h4>✅ Expected Result</h4>
						<p>{currentStep.expectedResult}</p>
					</div>

					{#if fieldValues.length > 0}
						<div class="field-values">
							<div class="section-header">
								<h4>📝 Field Values</h4>
								<button
									class="copy-btn"
									on:click={copyFieldValues}>📋 Copy</button
								>
							</div>
							<div class="fields-grid">
								{#each fieldValues as field}
									<div class="field-item">
										<label>{field.field}:</label>
										<span class="field-value"
											>{field.displayValue}</span
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if tableEntries.length > 0}
						<div class="table-entries">
							<h4>📊 Table Data</h4>
							{#each tableEntries as table}
								<div class="table-section">
									<h5>{table.tableName}</h5>
									{#each table.entries as entry}
										<div class="table-row">
											<span class="row-number"
												>Row {entry.rowNumber}:</span
											>
											<div class="row-fields">
												{#each entry.fields as field}
													<span class="table-field"
														>{field.field}: {field.displayValue}</span
													>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Current Action Description -->
		{#if parsedEntry.currentAction}
			<div class="current-action">
				<div class="action-header">
					<h4>🎯 Current Action</h4>
					{#if parsedEntry.currentAction.screenContext}
						<span class="screen-context"
							>📱 {parsedEntry.currentAction.screenContext}</span
						>
					{/if}
				</div>

				<div class="action-description">
					<p>{parsedEntry.currentAction.description}</p>
					
					<!-- Screenshot Info for Combined Entries -->
					{#if entry.isCombinedEntry && entry.screenshotInfo}
						<div class="screenshot-info">
							<span class="screenshot-indicator">
								📸 Screenshot captured at {formatTimestamp(entry.screenshotInfo.timestamp)}
								{#if entry.screenshotInfo.window_selector}
									on {entry.screenshotInfo.window_selector.replace(/\s*-\s*Google Chrome\*?$/, '')}
								{/if}
							</span>
						</div>
					{/if}
				</div>

				{#if parsedEntry.currentAction.details && parsedEntry.currentAction.details.length > 0}
					<div class="action-details">
						{#each parsedEntry.currentAction.details as detail}
							<div class="detail-item {detail.type}">
								<span class="detail-label">{detail.label}:</span
								>
								<span class="detail-value">{detail.value}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if parsedEntry.currentAction.thoughts}
					<div class="agent-thoughts">
						<h5>💭 Agent Thoughts</h5>
						<p>{parsedEntry.currentAction.thoughts}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Screenshot Display -->
		{#if currentScreenshot}
			<div class="screenshot-section">
				<div class="section-header">
					<h4>📸 Screen Capture</h4>
					<span class="screenshot-timestamp">
						Timestamp: {entry.isCombinedEntry && entry.originalScreenshotId ? entry.originalScreenshotId : (entry.timestamp || entry.id)}
					</span>
				</div>
				<div class="screenshot-container">
					<img 
						src={currentScreenshot} 
						alt="Screen capture for {entry.isCombinedEntry && entry.originalScreenshotId ? entry.originalScreenshotId : (entry.timestamp || entry.id)}"
						class="screenshot-image"
						loading="lazy"
					/>
				</div>
			</div>
		{/if}

		<!-- VisionScript Commands -->
		{#if visionCommands.length > 0}
			<div class="vision-commands">
				<div class="section-header">
					<h4>🤖 Automation Commands</h4>
					<button class="copy-btn" on:click={copyVisionScript}
						>📋 Copy Script</button
					>
				</div>
				<div class="commands-list">
					{#each visionCommands as command, index}
						<div class="command-item {command.type}">
							<span class="command-number">{index + 1}</span>
							<span class="command-description"
								>{command.description}</span
							>
							{#if command.type === "unknown"}
								<code class="raw-command">{command.raw}</code>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Execution Result -->
		{#if parsedEntry.executionResult}
			<div class="execution-result">
				<h4>📊 Execution Result</h4>
				<div class="result-details">
					<div class="status {getExecutionResultStatus(parsedEntry.executionResult)}">
						{#if getExecutionResultStatus(parsedEntry.executionResult) === 'success'}
							✅
						{:else if getExecutionResultStatus(parsedEntry.executionResult) === 'user'}
							👤
						{:else if getExecutionResultStatus(parsedEntry.executionResult) === 'error'}
							❌
						{:else}
							ℹ️
						{/if}
						{parsedEntry.executionResult.result}
					</div>
					{#if parsedEntry.executionResult.windowSelector}
						<div class="window-info">
							🪟 Window: {parsedEntry.executionResult
								.windowSelector}
							{#if parsedEntry.executionResult.isNewWindow}
								<span class="new-window-badge">New Window</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Agent Instructions Summary -->
		{#if parsedEntry.parsedInstructions && parsedEntry.parsedInstructions.summary}
			<div class="instructions-summary">
				<h4>🤖 Agent Behavior</h4>
				<p class="instructions-summary-text">
					{parsedEntry.parsedInstructions.summary}
				</p>

				{#if parsedEntry.parsedInstructions.confirmationRules.length > 0}
					<details class="confirmation-rules">
						<summary>Key Confirmation Rules</summary>
						<ul>
							{#each parsedEntry.parsedInstructions.confirmationRules as rule}
								<li>{rule}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</div>
		{/if}

		<!-- Test Steps Progress -->
		{#if testSteps.length > 0}
			<div class="test-progress">
				<h4>📈 Test Progress ({testSteps.length} steps) - Click to navigate</h4>
				<div class="steps-timeline">
					{#each testSteps as step}
						<div
							class="timeline-step {getStepStatus(
								step,
								currentStep?.stepNumber,
							)} clickable"
							on:click={() => navigateToStep(step)}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && navigateToStep(step)}
							title="Click to navigate to this step"
						>
							<div class="step-marker">
								{#if getStepStatus(step, currentStep?.stepNumber) === "completed"}
									✅
								{:else if getStepStatus(step, currentStep?.stepNumber) === "current"}
									🔄
								{:else}
									⏳
								{/if}
							</div>
							<div class="step-info">
								<div class="step-title">
									{step.stepNumber}. {step.stepName}
								</div>
								<div class="step-screen">{step.screenName}</div>
							</div>
							<div class="step-nav-indicator">→</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="empty-state">
		<p>Select a log entry to view workstep details</p>
	</div>
{/if}

<style>
	.workstep-viewer {
		padding: 20px;
		max-height: 100%;
		overflow-y: auto;
	}

	.test-overview {
		background: var(--color-bg-2);
		padding: 20px;
		border-radius: 8px;
		margin-bottom: 20px;
		border-left: 4px solid var(--color-theme-1);
	}

	.test-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 10px;
	}

	.test-header h2 {
		margin: 0;
		color: var(--color-theme-1);
		font-size: 18px;
	}

	.test-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		font-size: 12px;
		color: #666;
	}

	.session-id {
		background: var(--color-info);
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		font-family: var(--font-mono);
	}

	.timestamp {
		font-family: var(--font-mono);
	}

	.test-description {
		margin: 0;
		color: #666;
		font-style: italic;
	}

	.no-worksteps-notice {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 8px;
		padding: 20px;
		margin-top: 15px;
	}

	.no-worksteps-notice p {
		margin: 10px 0;
		color: #856404;
		line-height: 1.5;
	}

	.no-worksteps-notice p:first-child {
		font-weight: 600;
		margin-top: 0;
	}

	.no-worksteps-notice ul {
		margin: 15px 0;
		padding-left: 20px;
		color: #856404;
	}

	.no-worksteps-notice li {
		margin: 5px 0;
	}

	.current-step {
		background: white;
		border: 2px solid var(--color-success);
		border-radius: 8px;
		margin-bottom: 20px;
		overflow: hidden;
	}

	.step-header {
		background: var(--color-success);
		color: white;
		padding: 15px 20px;
	}

	.step-header h3 {
		margin: 0 0 8px 0;
		font-size: 16px;
	}

	.step-number {
		background: rgba(255, 255, 255, 0.2);
		padding: 2px 8px;
		border-radius: 4px;
		font-weight: bold;
		margin-right: 10px;
	}

	.step-meta {
		display: flex;
		gap: 15px;
		font-size: 12px;
	}

	.screen-name {
		background: rgba(255, 255, 255, 0.2);
		padding: 2px 6px;
		border-radius: 3px;
	}

	.confirmation-required {
		background: var(--color-warning);
		color: #333;
		padding: 2px 6px;
		border-radius: 3px;
		font-weight: bold;
	}

	.step-content {
		padding: 20px;
	}

	.step-content > div {
		margin-bottom: 20px;
	}

	.step-content > div:last-child {
		margin-bottom: 0;
	}

	.step-content h4 {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: var(--color-theme-1);
	}

	.step-content h5 {
		margin: 0 0 6px 0;
		font-size: 13px;
		color: var(--color-theme-2);
	}

	.instruction p,
	.expected-result p {
		margin: 0;
		line-height: 1.5;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.copy-btn {
		background: var(--color-info);
		color: white;
		border: none;
		padding: 4px 8px;
		border-radius: 3px;
		font-size: 11px;
		cursor: pointer;
	}

	.copy-btn:hover {
		background: #138496;
	}

	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
	}

	.field-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field-item label {
		font-weight: 500;
		font-size: 12px;
		color: #666;
	}

	.field-value {
		background: var(--color-bg-2);
		padding: 6px 10px;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 12px;
		border: 1px solid var(--color-border);
	}

	.table-section {
		background: var(--color-bg-2);
		padding: 12px;
		border-radius: 4px;
		margin-bottom: 10px;
	}

	.table-section h5 {
		background: var(--color-theme-1);
		color: white;
		margin: -12px -12px 10px -12px;
		padding: 8px 12px;
		font-size: 12px;
	}

	.table-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}

	.row-number {
		font-weight: bold;
		color: var(--color-theme-1);
		font-size: 12px;
		min-width: 60px;
	}

	.row-fields {
		display: flex;
		gap: 15px;
		flex-wrap: wrap;
	}

	.table-field {
		background: white;
		padding: 4px 8px;
		border-radius: 3px;
		font-family: var(--font-mono);
		font-size: 11px;
		border: 1px solid var(--color-border);
	}

	.current-action {
		background: var(--color-bg-2);
		padding: 15px;
		border-radius: 6px;
		margin-bottom: 20px;
		border-left: 4px solid var(--color-warning);
	}

	.action-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.screen-context {
		background: var(--color-info);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.action-description p {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	.screenshot-info {
		margin-top: 8px;
		padding: 6px 10px;
		background: var(--color-info-light, #e1f5fe);
		border-radius: 4px;
		border-left: 3px solid var(--color-info, #2196f3);
	}
	
	.screenshot-indicator {
		font-size: 12px;
		color: var(--color-info-dark, #1565c0);
		font-style: italic;
	}

	.action-details {
		margin-top: 12px;
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
		position: relative;
	}
	
	.detail-item.user::before {
		content: "👤";
		margin-right: 6px;
		font-size: 14px;
	}

	.detail-label {
		font-weight: 600;
		color: #666;
		min-width: 80px;
	}

	.detail-value {
		font-family: var(--font-mono);
		flex: 1;
	}

	.agent-thoughts {
		margin-top: 12px;
		padding: 10px;
		background: rgba(255, 193, 7, 0.1);
		border-radius: 4px;
		border: 1px solid rgba(255, 193, 7, 0.3);
	}

	.agent-thoughts p {
		margin: 0;
		font-style: italic;
		color: #666;
	}

	.vision-commands {
		background: #1e1e1e;
		color: #d4d4d4;
		padding: 15px;
		border-radius: 6px;
		margin-bottom: 20px;
	}

	.vision-commands h4 {
		color: #4fc1ff !important;
		margin-bottom: 12px;
	}

	.commands-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.command-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 10px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
	}

	.command-number {
		background: var(--color-theme-1);
		color: white;
		padding: 2px 6px;
		border-radius: 50%;
		font-size: 10px;
		font-weight: bold;
		min-width: 20px;
		text-align: center;
	}

	.command-description {
		flex: 1;
		font-size: 13px;
	}

	.raw-command {
		font-family: var(--font-mono);
		font-size: 11px;
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 6px;
		border-radius: 3px;
		color: #ce9178;
	}

	.command-item.wait .command-number {
		background: var(--color-warning);
		color: #333;
	}

	.command-item.type .command-number {
		background: var(--color-success);
	}

	.execution-result {
		background: var(--color-bg-2);
		padding: 15px;
		border-radius: 6px;
		margin-bottom: 20px;
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

	.status.user {
		background: #e7f3ff;
		color: #004085;
		border: 1px solid #b3d9ff;
	}

	.status.info {
		background: #d1ecf1;
		color: #0c5460;
		border: 1px solid #bee5eb;
	}

	.window-info {
		font-family: var(--font-mono);
		font-size: 12px;
		color: #666;
	}

	.new-window-badge {
		background: var(--color-info);
		color: white;
		padding: 1px 4px;
		border-radius: 2px;
		font-size: 10px;
		margin-left: 8px;
	}

	.instructions-summary {
		background: #f8f9fa;
		padding: 15px;
		border-radius: 6px;
		margin-bottom: 20px;
		border-left: 4px solid var(--color-info);
	}

	.instructions-summary-text {
		margin: 0 0 10px 0;
		font-style: italic;
		color: #666;
	}

	.confirmation-rules {
		margin-top: 12px;
	}

	.confirmation-rules summary {
		cursor: pointer;
		font-weight: 500;
		color: var(--color-info);
		margin-bottom: 8px;
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

	.test-progress {
		background: var(--color-bg-2);
		padding: 15px;
		border-radius: 6px;
	}

	.steps-timeline {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.timeline-step {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.timeline-step.current {
		background: rgba(40, 167, 69, 0.1);
		border: 1px solid var(--color-success);
	}

	.timeline-step.completed {
		opacity: 0.7;
	}

	.step-marker {
		font-size: 16px;
		min-width: 24px;
		text-align: center;
	}

	.step-info {
		flex: 1;
	}

	.step-title {
		font-weight: 500;
		font-size: 13px;
	}

	.step-screen {
		font-size: 11px;
		color: #666;
		margin-top: 2px;
	}

	.empty-state {
		padding: 60px 20px;
		text-align: center;
		color: #666;
	}

	.screenshot-section {
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 16px;
	}

	.screenshot-timestamp {
		font-size: 12px;
		color: #666;
		background: var(--color-bg-1);
		padding: 4px 8px;
		border-radius: 4px;
	}

	.screenshot-container {
		margin-top: 12px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		background: #fff;
	}

	.screenshot-image {
		width: 100%;
		height: auto;
		display: block;
		max-height: 600px;
		object-fit: contain;
		cursor: zoom-in;
		transition: transform 0.2s ease;
	}

	.screenshot-image:hover {
		transform: scale(1.02);
	}

	.navigation-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding: 12px 16px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.nav-left {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.nav-context {
		font-size: 13px;
		color: #666;
		background: var(--color-bg-2);
		padding: 6px 10px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
	}

	.nav-btn {
		padding: 8px 16px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg-2);
		color: var(--color-text);
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--color-theme-1);
		color: white;
		border-color: var(--color-theme-1);
	}

	.nav-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-btn.secondary {
		background: transparent;
		color: var(--color-theme-1);
		border-color: var(--color-theme-1);
	}

	.nav-btn.secondary:hover {
		background: var(--color-theme-1);
		color: white;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.keyboard-hints {
		font-size: 11px;
		color: #888;
		font-style: italic;
	}

	.timeline-step.clickable {
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.timeline-step.clickable:hover {
		background: var(--color-bg-1);
		transform: translateX(4px);
	}

	.timeline-step.clickable .step-nav-indicator {
		opacity: 0;
		transition: opacity 0.2s ease;
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-theme-1);
		font-weight: bold;
	}

	.timeline-step.clickable:hover .step-nav-indicator {
		opacity: 1;
	}
</style>
