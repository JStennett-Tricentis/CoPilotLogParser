/**
 * Parser for worksteps, visionscript, and related agent execution data
 */

export class WorkstepParser {
	/**
	 * Parse worksteps string into structured data
	 */
	static parseWorksteps(workstepsString) {
		if (!workstepsString) return null;

		// Only check for actually malformed strings
		if (typeof workstepsString === 'string') {
			const trimmed = workstepsString.trim();
			
			// Check if string doesn't have proper closing braces for large objects
			if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
				console.warn('Worksteps string has unmatched braces, skipping parsing:', trimmed.substring(0, 100) + '...');
				return null;
			}
		}

		// For Python dict strings (which include single quotes), use Function constructor approach
		// as it handles apostrophes and complex quoting better than simple replacement
		if (workstepsString.includes("'") && 
			workstepsString.trim().startsWith('{') &&
			workstepsString.trim().endsWith('}') &&
			!workstepsString.includes('import') &&
			!workstepsString.includes('exec') &&
			!workstepsString.includes('eval')) {
			
			try {
				// Replace Python-style values with JavaScript equivalents
				let pythonToJS = workstepsString
					.replace(/True/g, 'true')
					.replace(/False/g, 'false')
					.replace(/None/g, 'null');

				// Use Function constructor instead of eval for better security
				const parsed = new Function('return ' + pythonToJS)();
				return parsed;
			} catch (funcError) {
				console.warn('Failed to parse worksteps with Function constructor:', funcError);
				// Fall through to JSON approach as backup
			}
		}

		// Try JSON parsing for regular JSON strings or as backup
		try {
			let cleanedString = workstepsString;

			// Convert Python-style dict to JSON (backup approach)
			if (workstepsString.includes("'")) {
				cleanedString = workstepsString
					.replace(/True/g, 'true')
					.replace(/False/g, 'false')
					.replace(/None/g, 'null')
					.replace(/'/g, '"');
			}

			const parsed = JSON.parse(cleanedString);
			return parsed;
		} catch (error) {
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
				// Determine result type - user interactions should not be treated as errors
				let resultType = 'info'; // default to neutral
				
				if (obs.successful === true) {
					resultType = 'success';
				} else if (obs.successful === false) {
					// Check if this is a user interaction result
					const resultLower = obs.result.toLowerCase();
					const isUserInteraction = resultLower.includes('ask_human') || 
											 resultLower.includes('answer') ||
											 resultLower.includes('user input') ||
											 resultLower.includes('confirmation') ||
											 resultLower.includes('user response') ||
											 resultLower.includes('human input') ||
											 resultLower.includes('waiting for user') ||
											 resultLower.includes('user interaction');
					
					// User interactions are neutral, not errors
					resultType = isUserInteraction ? 'user' : 'error';
				}
				
				action.details.push({
					label: 'Result',
					value: obs.result,
					type: resultType
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

	/**
	 * Group screenshot entries with their following analysis entries
	 * This reduces the number of entries by combining "Screenshot taken" with subsequent actions
	 */
	static groupScreenshotEntries(logEntries) {
		if (!Array.isArray(logEntries) || logEntries.length === 0) return logEntries;

		const grouped = [];
		let i = 0;

		while (i < logEntries.length) {
			const currentEntry = logEntries[i];
			
			// Check if this is a screenshot entry
			const isScreenshotEntry = this.isScreenshotEntry(currentEntry);
			
			if (isScreenshotEntry && i + 1 < logEntries.length) {
				const nextEntry = logEntries[i + 1];
				
				// Check if the next entry is an analysis/action entry (has meaningful content)
				if (this.isAnalysisEntry(nextEntry)) {
					// Combine the screenshot info with the analysis entry
					const combinedEntry = this.combineScreenshotWithAnalysis(currentEntry, nextEntry);
					grouped.push(combinedEntry);
					i += 2; // Skip both entries since we combined them
					continue;
				}
			}
			
			// If not a screenshot+analysis pair, just add the current entry
			grouped.push(currentEntry);
			i++;
		}

		return grouped;
	}

	/**
	 * Check if an entry is a screenshot entry
	 */
	static isScreenshotEntry(entry) {
		// Check if the primary action is screenshot
		if (entry.actions && entry.actions.length > 0) {
			const primaryAction = entry.actions[0];
			if (primaryAction.action === 'screenshot') {
				return true;
			}
		}

		// Check if observations indicate screenshot was taken
		if (entry.observations && entry.observations.length > 0) {
			const observation = entry.observations[0];
			if (observation.result === 'Screenshot taken') {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if an entry is an analysis/action entry (has meaningful content to combine with screenshot)
	 */
	static isAnalysisEntry(entry) {
		// Must have meaningful thoughts, description, or actions beyond just screenshot
		const hasThoughts = entry.thoughts && entry.thoughts.trim().length > 0;
		const hasDescription = entry.description && entry.description.trim().length > 0;
		
		// Check if actions are meaningful (not just screenshots)
		const hasMeaningfulActions = entry.actions && entry.actions.length > 0 && 
			entry.actions.some(action => action.action !== 'screenshot');

		// Check if observations have visionscript or meaningful results
		const hasVisionScript = entry.observations && entry.observations.length > 0 &&
			entry.observations.some(obs => obs.visionscript && obs.visionscript.trim().length > 0);

		return hasThoughts || hasDescription || hasMeaningfulActions || hasVisionScript;
	}

	/**
	 * Combine a screenshot entry with its following analysis entry
	 */
	static combineScreenshotWithAnalysis(screenshotEntry, analysisEntry) {
		// Start with the analysis entry as the base (it has the meaningful content)
		const combined = { ...analysisEntry };

		// Add screenshot information
		combined.screenshotInfo = {
			timestamp: screenshotEntry.timestamp || screenshotEntry.id,
			window_selector: screenshotEntry.observations?.[0]?.window_selector,
			is_new_window: screenshotEntry.observations?.[0]?.is_new_window
		};

		// If the analysis entry doesn't have meaningful window context, use screenshot's
		if (!combined.observations?.[0]?.window_selector && screenshotEntry.observations?.[0]?.window_selector) {
			if (!combined.observations) combined.observations = [];
			if (!combined.observations[0]) combined.observations[0] = {};
			combined.observations[0].window_selector = screenshotEntry.observations[0].window_selector;
			combined.observations[0].is_new_window = screenshotEntry.observations[0].is_new_window;
		}

		// Mark this as a combined entry for UI purposes
		combined.isCombinedEntry = true;
		combined.originalScreenshotId = screenshotEntry.timestamp || screenshotEntry.id;

		return combined;
	}
}