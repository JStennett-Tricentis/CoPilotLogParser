<script>
	import { createEventDispatcher } from 'svelte';
	import { WorkstepParser } from '$lib/utils/workstepParser.js';
	
	export let entry = null;
	
	const dispatch = createEventDispatcher();
	
	$: parsedEntry = entry ? WorkstepParser.createReadableSummary(entry) : null;
	$: testSteps = parsedEntry?.workstepsData ? WorkstepParser.extractTestSteps(parsedEntry.workstepsData) : [];
	$: currentStep = parsedEntry?.stepInfo;
	$: fieldValues = currentStep ? WorkstepParser.formatFieldValues(currentStep.fieldValues) : [];
	$: tableEntries = currentStep ? WorkstepParser.formatTableEntries(currentStep.tableEntries) : [];
	$: visionCommands = parsedEntry?.visionCommands || [];

	function formatTimestamp(timestamp) {
		if (!timestamp) return '';
		
		if (typeof timestamp === 'string' && timestamp.length === 14) {
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
		if (!currentStepNumber) return 'pending';
		if (step.stepNumber < currentStepNumber) return 'completed';
		if (step.stepNumber === currentStepNumber) return 'current';
		return 'pending';
	}

	function copyVisionScript() {
		if (visionCommands.length === 0) return;
		
		const scriptText = visionCommands
			.map(cmd => cmd.description)
			.join('\n');
		
		navigator.clipboard.writeText(scriptText).then(() => {
			dispatch('copy', { type: 'visionscript', content: scriptText });
		});
	}

	function copyFieldValues() {
		if (fieldValues.length === 0) return;
		
		const fieldsText = fieldValues
			.map(field => `${field.field}: ${field.displayValue}`)
			.join('\n');
		
		navigator.clipboard.writeText(fieldsText).then(() => {
			dispatch('copy', { type: 'fields', content: fieldsText });
		});
	}
</script>

{#if parsedEntry}
	<div class="workstep-viewer">
		<!-- Test Overview -->
		{#if parsedEntry.workstepsData}
			<div class="test-overview">
				<div class="test-header">
					<h2>{parsedEntry.workstepsData.name}</h2>
					<div class="test-meta">
						<span class="session-id">Session: {parsedEntry.sessionId?.substring(0, 8)}...</span>
						<span class="timestamp">{formatTimestamp(parsedEntry.timestamp)}</span>
					</div>
				</div>
				<p class="test-description">{parsedEntry.workstepsData.description}</p>
			</div>
		{/if}

		<!-- Current Step Details -->
		{#if currentStep}
			<div class="current-step">
				<div class="step-header">
					<h3>
						<span class="step-number">Step {currentStep.stepNumber}</span>
						<span class="step-name">{currentStep.stepName}</span>
					</h3>
					<div class="step-meta">
						<span class="screen-name">📱 {currentStep.screenName}</span>
						{#if currentStep.requiresConfirmation}
							<span class="confirmation-required">⚠️ Requires Confirmation</span>
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
								<button class="copy-btn" on:click={copyFieldValues}>📋 Copy</button>
							</div>
							<div class="fields-grid">
								{#each fieldValues as field}
									<div class="field-item">
										<label>{field.field}:</label>
										<span class="field-value">{field.displayValue}</span>
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
											<span class="row-number">Row {entry.rowNumber}:</span>
											<div class="row-fields">
												{#each entry.fields as field}
													<span class="table-field">{field.field}: {field.displayValue}</span>
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
		{#if parsedEntry.description}
			<div class="current-action">
				<h4>🎯 Current Action</h4>
				<p>{parsedEntry.description}</p>
				{#if parsedEntry.thoughts}
					<div class="agent-thoughts">
						<h5>💭 Agent Thoughts</h5>
						<p>{parsedEntry.thoughts}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- VisionScript Commands -->
		{#if visionCommands.length > 0}
			<div class="vision-commands">
				<div class="section-header">
					<h4>🤖 Automation Commands</h4>
					<button class="copy-btn" on:click={copyVisionScript}>📋 Copy Script</button>
				</div>
				<div class="commands-list">
					{#each visionCommands as command, index}
						<div class="command-item {command.type}">
							<span class="command-number">{index + 1}</span>
							<span class="command-description">{command.description}</span>
							{#if command.type === 'unknown'}
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
					<div class="status {parsedEntry.executionResult.successful ? 'success' : 'error'}">
						{parsedEntry.executionResult.successful ? '✅' : '❌'} 
						{parsedEntry.executionResult.result}
					</div>
					{#if parsedEntry.executionResult.windowSelector}
						<div class="window-info">
							🪟 Window: {parsedEntry.executionResult.windowSelector}
							{#if parsedEntry.executionResult.isNewWindow}
								<span class="new-window-badge">New Window</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Test Steps Progress -->
		{#if testSteps.length > 0}
			<div class="test-progress">
				<h4>📈 Test Progress ({testSteps.length} steps)</h4>
				<div class="steps-timeline">
					{#each testSteps as step}
						<div class="timeline-step {getStepStatus(step, currentStep?.stepNumber)}">
							<div class="step-marker">
								{#if getStepStatus(step, currentStep?.stepNumber) === 'completed'}
									✅
								{:else if getStepStatus(step, currentStep?.stepNumber) === 'current'}
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

	.instruction p, .expected-result p {
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
</style>