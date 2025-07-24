/**
 * Parser for worksteps, visionscript, and related agent execution data
 */

export class WorkstepParser {
	/**
	 * Parse worksteps string into structured data
	 */
	static parseWorksteps(workstepsString) {
		if (!workstepsString) return null;

		try {
			// Handle string representation of dict/object
			let cleanedString = workstepsString;

			// Convert Python-style dict to JSON
			if (workstepsString.includes("'")) {
				// More careful replacement to handle nested quotes
				cleanedString = workstepsString
					// First handle boolean and null values
					.replace(/True/g, 'true')
					.replace(/False/g, 'false')
					.replace(/None/g, 'null')
					// Handle single quotes but preserve escaped quotes and quotes within strings
					.replace(/'/g, '"')
					// Fix any double-double quotes that might have been created
					.replace(/""/g, '"');

				// Additional cleanup for common Python dict patterns
				cleanedString = cleanedString
					// Fix cases where we have "text's" -> "text"s" -> should be "text's"
					.replace(/"([^"]*)"s"/g, '"$1\'s"')
					// Fix apostrophes in contractions
					.replace(/(\w)"(\w)/g, '$1\'$2');
			}

			const parsed = JSON.parse(cleanedString);
			return parsed;
		} catch (error) {
			// Try alternative parsing method
			try {
				// Use eval as last resort for Python dict literals (be careful!)
				// Only if the string looks like a Python dict and doesn't contain suspicious code
				if (workstepsString.trim().startsWith('{') &&
					workstepsString.trim().endsWith('}') &&
					!workstepsString.includes('import') &&
					!workstepsString.includes('exec') &&
					!workstepsString.includes('eval')) {

					// Replace Python-style values with JavaScript equivalents
					let pythonToJS = workstepsString
						.replace(/True/g, 'true')
						.replace(/False/g, 'false')
						.replace(/None/g, 'null');

					// Use Function constructor instead of eval for better security
					const parsed = new Function('return ' + pythonToJS)();
					return parsed;
				}
			} catch (evalError) {
				console.warn('Failed to parse worksteps with alternative method:', evalError);
			}

			console.warn('Failed to parse worksteps:', error);
			return null;
		}
	}

	/**
	 * Parse visionscript into readable commands
	 */
	static parseVisionscript(visionscript) {
		if (!visionscript) return [];

		const lines = visionscript.trim().split('\n');
		const commands = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// Parse different command types
			if (trimmed.startsWith('WAIT')) {
				const match = trimmed.match(/WAIT (\d+) SECONDS?/);
				if (match) {
					commands.push({
						type: 'wait',
						duration: parseInt(match[1]),
						description: `Wait ${match[1]} second${match[1] !== '1' ? 's' : ''}`
					});
				}
			} else if (trimmed.startsWith('TYPE')) {
				const match = trimmed.match(/TYPE "(.+)"/);
				if (match) {
					const text = match[1];
					commands.push({
						type: 'type',
						text: text,
						description: this.formatTypeCommand(text)
					});
				}
			} else if (trimmed.startsWith('CLICK')) {
				commands.push({
					type: 'click',
					description: 'Click action'
				});
			} else {
				commands.push({
					type: 'unknown',
					raw: trimmed,
					description: trimmed
				});
			}
		}

		return commands;
	}

	/**
	 * Format TYPE commands for readability
	 */
	static formatTypeCommand(text) {
		// Handle special key combinations
		const keyMappings = {
			'{CTRL-SHIFT-F}': 'Ctrl+Shift+F (Open search)',
			'{CTRL-A}': 'Ctrl+A (Select all)',
			'{BACK}': 'Backspace',
			'{ENTER}': 'Enter',
			'{TAB}': 'Tab',
			'{ESC}': 'Escape'
		};

		if (keyMappings[text]) {
			return `Press ${keyMappings[text]}`;
		}

		// Regular text input
		return `Type: "${text}"`;
	}

	/**
	 * Extract test steps from worksteps data
	 */
	static extractTestSteps(workstepsData) {
		if (!workstepsData || !workstepsData.test_steps) return [];

		return workstepsData.test_steps.map(step => ({
			stepNumber: step.step_number,
			stepName: step.step_name,
			screenName: step.screen_name,
			instruction: step.instruction,
			expectedResult: step.expected_result,
			requiresConfirmation: step.requires_user_confirmation,
			fieldValues: step.field_values || {},
			tableEntries: step.table_entries || []
		}));
	}

	/**
	 * Parse description field to extract clean action description
	 */
	static parseDescription(description) {
		if (!description) return null;

		const result = {
			cleanDescription: '',
			guidingWorksteps: '',
			testData: '',
			rawDescription: description
		};

		// Remove HTML-like tags and extract content
		let cleanDesc = description;

		// Extract guiding worksteps
		const workstepsMatch = description.match(/<guiding_worksteps>(.*?)<\/guiding_worksteps>/s);
		if (workstepsMatch) {
			result.guidingWorksteps = workstepsMatch[1].trim();
			cleanDesc = cleanDesc.replace(/<guiding_worksteps>.*?<\/guiding_worksteps>/s, '');
		}

		// Extract test data
		const testDataMatch = description.match(/<test_data>(.*?)<\/test_data>/s);
		if (testDataMatch) {
			result.testData = testDataMatch[1].trim();
			cleanDesc = cleanDesc.replace(/<test_data>.*?<\/test_data>/s, '');
		}

		// Clean up remaining content
		cleanDesc = cleanDesc
			.replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
			.replace(/\n\s*\n/g, '\n') // Remove extra line breaks
			.trim();

		result.cleanDescription = cleanDesc;

		// If no clean description remains, try to extract from the step context
		if (!result.cleanDescription && result.testData) {
			// Try to extract step name from context
			const stepMatch = result.testData.match(/'step_name':\s*'([^']+)'/);
			if (stepMatch) {
				result.cleanDescription = stepMatch[1];
			}
		}

		return result;
	}

	/**
	 * Parse instructions into structured rules
	 */
	static parseInstructions(instructions) {
		if (!instructions) return null;

		const sections = {
			summary: '',
			confirmationRules: [],
			promptFormat: '',
			behaviorRules: []
		};

		// Create a summary of the key points
		if (instructions.includes('requires_user_confirmation')) {
			sections.summary = 'Agent follows confirmation rules for user interaction during test execution.';
		}

		// Extract confirmation rules for "true" cases
		const confirmationTrue = instructions.match(/Set `requires_user_confirmation: true` when:(.*?)Set `requires_user_confirmation: false`/s);
		if (confirmationTrue) {
			const rules = confirmationTrue[1]
				.split('\n-')
				.map(rule => rule.trim().replace(/^-\s*/, ''))
				.filter(rule => rule.length > 0 && rule.length < 200); // Skip overly long rules
			sections.confirmationRules = rules.slice(0, 5); // Limit to top 5 rules
		}

		// Extract prompt format
		const promptMatch = instructions.match(/Prompt format:(.*?)Before ending:/s);
		if (promptMatch) {
			sections.promptFormat = promptMatch[1].trim();
		}

		return sections;
	}

	/**
	 * Extract current action context from entry
	 */
	static extractCurrentAction(entry) {
		const action = {
			description: '',
			thoughts: entry.thoughts || '',
			screenContext: '',
			actionType: 'unknown',
			details: []
		};

		// Parse description
		if (entry.description) {
			const parsedDesc = this.parseDescription(entry.description);
			action.description = parsedDesc.cleanDescription;

			// Extract more context if description is still empty or unclear
			if (!action.description && entry.actions && entry.actions.length > 0) {
				const primaryAction = entry.actions[0];
				action.actionType = primaryAction.action;

				// Create readable description based on action type
				switch (primaryAction.action) {
					case 'screenshot':
						action.description = 'Taking screenshot of current screen';
						break;
					case 'search':
						if (primaryAction.args && primaryAction.args.query) {
							action.description = `Searching for: "${primaryAction.args.query}"`;
						} else {
							action.description = 'Performing search operation';
						}
						break;
					case 'click':
						action.description = 'Clicking on screen element';
						break;
					case 'type':
						action.description = 'Typing input data';
						break;
					default:
						action.description = `Executing ${primaryAction.action} action`;
				}
			}
		}

		// Extract screen context from observations
		if (entry.observations && entry.observations.length > 0) {
			const obs = entry.observations[0];
			if (obs.window_selector) {
				action.screenContext = obs.window_selector.replace(/\s*-\s*Google Chrome\*?$/, '');
			}
		}

		// Add execution details
		if (entry.observations && entry.observations.length > 0) {
			const obs = entry.observations[0];
			if (obs.result) {
				action.details.push({
					label: 'Result',
					value: obs.result,
					type: obs.successful ? 'success' : 'error'
				});
			}

			if (obs.description && obs.description !== action.description) {
				action.details.push({
					label: 'Technical Description',
					value: obs.description,
					type: 'info'
				});
			}
		}

		return action;
	}

	/**
	 * Create a readable summary of an agent execution entry
	 */
	static createReadableSummary(entry) {
		const summary = {
			timestamp: entry.timestamp || entry.id,
			sessionId: entry.session_id,
			description: entry.description,
			thoughts: entry.thoughts,
			stepInfo: null,
			visionCommands: [],
			executionResult: null,
			workstepsData: null,
			currentAction: null,
			parsedInstructions: null
		};

		// Parse worksteps
		if (entry.worksteps) {
			summary.workstepsData = this.parseWorksteps(entry.worksteps);
		}

		// Parse visionscript from observations
		if (entry.observations && entry.observations.length > 0) {
			const observation = entry.observations[0];
			summary.executionResult = {
				result: observation.result,
				successful: observation.successful,
				windowSelector: observation.window_selector,
				isNewWindow: observation.is_new_window
			};

			if (observation.visionscript) {
				summary.visionCommands = this.parseVisionscript(observation.visionscript);
			}
		}

		// Parse current action
		summary.currentAction = this.extractCurrentAction(entry);

		// Parse instructions
		if (entry.instructions) {
			summary.parsedInstructions = this.parseInstructions(entry.instructions);
		}

		// Extract current step info from worksteps
		if (summary.workstepsData && summary.workstepsData.test_steps) {
			// Try to match current step based on description
			const currentStep = summary.workstepsData.test_steps.find(step =>
				summary.currentAction.description && summary.currentAction.description.includes(step.step_name)
			);
			if (currentStep) {
				summary.stepInfo = this.extractTestSteps(summary.workstepsData).find(s => s.stepNumber === currentStep.step_number);
			}
		}

		return summary;
	}

	/**
	 * Format field values for display
	 */
	static formatFieldValues(fieldValues) {
		if (!fieldValues || Object.keys(fieldValues).length === 0) return [];

		return Object.entries(fieldValues).map(([field, value]) => ({
			field,
			value,
			displayValue: typeof value === 'string' ? value : JSON.stringify(value)
		}));
	}

	/**
	 * Format table entries for display
	 */
	static formatTableEntries(tableEntries) {
		if (!tableEntries || tableEntries.length === 0) return [];

		return tableEntries.map(table => ({
			tableName: table.table_name,
			entries: table.entries.map(entry => ({
				rowNumber: entry.row_number,
				fields: this.formatFieldValues(entry.field_values)
			}))
		}));
	}
}