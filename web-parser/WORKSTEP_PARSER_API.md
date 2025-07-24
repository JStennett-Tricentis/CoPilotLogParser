# WorkstepParser API Documentation

The `WorkstepParser` class is the core utility for transforming raw agent execution logs into structured, readable formats. It focuses on parsing **worksteps**, **visionscript**, **current actions**, and **agent instructions**.

## Import

```javascript
import { WorkstepParser } from '$lib/utils/workstepParser.js';
```

## Main Methods

### `createReadableSummary(entry)`

**Primary method** that processes a complete log entry and returns a structured summary.

**Parameters:**

- `entry` (Object): Raw log entry from JSON data

**Returns:**

```javascript
{
  timestamp: string,           // Entry timestamp or ID
  sessionId: string,          // Session identifier
  description: string,        // Original description field
  thoughts: string,           // Agent thoughts
  stepInfo: Object|null,      // Current step information
  visionCommands: Array,      // Parsed visionscript commands
  executionResult: Object,    // Execution status and results
  workstepsData: Object|null, // Parsed worksteps structure
  currentAction: Object,      // Clean current action data
  parsedInstructions: Object  // Summarized agent instructions
}
```

**Example:**

```javascript
const logEntry = {
  "20250723205312": {
    "worksteps": "{'name': 'Create Sales Order', 'test_steps': [...]}",
    "description": "Navigate to Sales Order Creation",
    "visionscript": "WAIT 2 SECONDS\nTYPE \"{CTRL-SHIFT-F}\"",
    // ... other fields
  }
};

const summary = WorkstepParser.createReadableSummary(logEntry);
console.log(summary.workstepsData.name); // "Create Sales Order"
console.log(summary.visionCommands);     // Array of readable commands
```

## Parsing Methods

### `parseWorksteps(workstepsString)`

Converts Python dictionary strings to structured JSON objects.

**Parameters:**

- `workstepsString` (string): Python dict representation of worksteps

**Returns:**

```javascript
{
  name: string,           // Test name
  description: string,    // Test description
  test_steps: [
    {
      step_number: number,
      step_name: string,
      screen_name: string,
      instruction: string,
      field_values: Object,
      table_entries: Array,
      requires_user_confirmation: boolean,
      expected_result: string
    }
  ]
}
```

**Example:**

```javascript
const worksteps = "{'name': 'Login Test', 'test_steps': [...]}";
const parsed = WorkstepParser.parseWorksteps(worksteps);
```

### `parseVisionscript(visionscript)`

Transforms raw visionscript commands into readable action descriptions.

**Parameters:**

- `visionscript` (string): Raw visionscript commands separated by newlines

**Returns:**

```javascript
[
  {
    type: string,        // 'wait', 'type', 'click', 'unknown'
    description: string, // Human-readable description
    text?: string,       // For type commands - the text being typed
    duration?: number,   // For wait commands - duration in seconds
    raw?: string         // For unknown commands - raw command
  }
]
```

**Example:**

```javascript
const script = `WAIT 2 SECONDS
TYPE "{CTRL-SHIFT-F}"
TYPE "search query"`;

const commands = WorkstepParser.parseVisionscript(script);
// Result:
// [
//   { type: 'wait', duration: 2, description: 'Wait 2 seconds' },
//   { type: 'type', text: '{CTRL-SHIFT-F}', description: 'Press Ctrl+Shift+F (Open search)' },
//   { type: 'type', text: 'search query', description: 'Type: "search query"' }
// ]
```

### `parseDescription(description)`

Cleans HTML-like tags from description fields and extracts meaningful content.

**Parameters:**

- `description` (string): Raw description field with potential HTML tags

**Returns:**

```javascript
{
  cleanDescription: string,    // Cleaned action description
  guidingWorksteps: string,   // Extracted guiding worksteps content
  testData: string,           // Extracted test data content
  rawDescription: string      // Original description
}
```

**Example:**

```javascript
const desc = `<guiding_worksteps>Rules...</guiding_worksteps>
Navigate to Sales Order Creation
<test_data>{'step_name': 'Login'}</test_data>`;

const parsed = WorkstepParser.parseDescription(desc);
console.log(parsed.cleanDescription); // "Navigate to Sales Order Creation"
```

### `parseInstructions(instructions)`

Summarizes verbose agent instruction blocks into key points.

**Parameters:**

- `instructions` (string): Full agent instructions with confirmation rules

**Returns:**

```javascript
{
  summary: string,              // Brief summary of behavior
  confirmationRules: Array,     // Key confirmation rules (max 5)
  promptFormat: string,         // Prompt format template
  behaviorRules: Array          // Additional behavior rules
}
```

### `extractCurrentAction(entry)`

Creates clean current action context from raw log entry.

**Parameters:**

- `entry` (Object): Raw log entry

**Returns:**

```javascript
{
  description: string,      // Clean action description
  thoughts: string,         // Agent thoughts
  screenContext: string,    // Current screen/window
  actionType: string,       // Type of action being performed
  details: [                // Execution details
    {
      label: string,
      value: string,
      type: 'success'|'error'|'info'
    }
  ]
}
```

## Utility Methods

### `extractTestSteps(workstepsData)`

Extracts and formats test steps from parsed worksteps data.

**Parameters:**

- `workstepsData` (Object): Parsed worksteps object

**Returns:**

```javascript
[
  {
    stepNumber: number,
    stepName: string,
    screenName: string,
    instruction: string,
    expectedResult: string,
    requiresConfirmation: boolean,
    fieldValues: Object,
    tableEntries: Array
  }
]
```

### `formatFieldValues(fieldValues)`

Formats field values for display.

**Parameters:**

- `fieldValues` (Object): Raw field values object

**Returns:**

```javascript
[
  {
    field: string,        // Field name
    value: any,          // Raw value
    displayValue: string // Formatted display value
  }
]
```

### `formatTableEntries(tableEntries)`

Formats table entries for display.

**Parameters:**

- `tableEntries` (Array): Raw table entries

**Returns:**

```javascript
[
  {
    tableName: string,
    entries: [
      {
        rowNumber: number,
        fields: Array  // Formatted field values
      }
    ]
  }
]
```

### `formatTypeCommand(text)`

Formats TYPE commands with special key handling.

**Parameters:**

- `text` (string): Text being typed (may include key combinations)

**Returns:**

- `string`: Human-readable description

**Key Mappings:**

- `{CTRL-SHIFT-F}` → "Press Ctrl+Shift+F (Open search)"
- `{CTRL-A}` → "Press Ctrl+A (Select all)"
- `{BACK}` → "Press Backspace"
- `{ENTER}` → "Press Enter"
- `{TAB}` → "Press Tab"
- `{ESC}` → "Press Escape"

## Usage Examples

### Basic Log Processing

```javascript
import { WorkstepParser } from '$lib/utils/workstepParser.js';

// Process a single log entry
const entry = /* raw log entry */;
const summary = WorkstepParser.createReadableSummary(entry);

// Display test information
if (summary.workstepsData) {
  console.log(`Test: ${summary.workstepsData.name}`);
  console.log(`Steps: ${summary.workstepsData.test_steps.length}`);
}

// Display current action
if (summary.currentAction) {
  console.log(`Action: ${summary.currentAction.description}`);
  console.log(`Screen: ${summary.currentAction.screenContext}`);
}

// Display visionscript commands
summary.visionCommands.forEach((cmd, i) => {
  console.log(`${i + 1}. ${cmd.description}`);
});
```

### Component Integration

```svelte
<script>
  import { WorkstepParser } from '$lib/utils/workstepParser.js';

  export let logEntry;

  $: parsedEntry = WorkstepParser.createReadableSummary(logEntry);
  $: testSteps = parsedEntry.workstepsData ?
    WorkstepParser.extractTestSteps(parsedEntry.workstepsData) : [];
</script>

{#if parsedEntry.workstepsData}
  <h2>{parsedEntry.workstepsData.name}</h2>
  <p>{parsedEntry.workstepsData.description}</p>

  {#each testSteps as step}
    <div class="step">
      <h3>Step {step.stepNumber}: {step.stepName}</h3>
      <p>{step.instruction}</p>

      {#if step.fieldValues && Object.keys(step.fieldValues).length > 0}
        <div class="fields">
          {#each WorkstepParser.formatFieldValues(step.fieldValues) as field}
            <div>{field.field}: {field.displayValue}</div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
{/if}
```

### Error Handling

```javascript
try {
  const summary = WorkstepParser.createReadableSummary(entry);

  // Check if parsing was successful
  if (!summary.workstepsData) {
    console.warn('No worksteps data found in entry');
  }

  if (summary.visionCommands.length === 0) {
    console.warn('No visionscript commands found');
  }

} catch (error) {
  console.error('Parsing failed:', error);
  // Handle parsing error gracefully
}
```

## Performance Considerations

- **Caching**: Results are not cached automatically - implement caching if processing same entries multiple times
- **Large Datasets**: For large datasets, consider processing entries on-demand rather than pre-processing all
- **Memory Usage**: Parsed results contain references to original data - be mindful of memory usage with large logs

## Extension Points

To extend the parser for new log formats:

1. **Add new parsing method:**

```javascript
static parseCustomField(data) {
  // Custom parsing logic
  return parsedData;
}
```

1. **Update createReadableSummary:**

```javascript
static createReadableSummary(entry) {
  const summary = { /* existing fields */ };
  summary.customData = this.parseCustomField(entry.customField);
  return summary;
}
```

1. **Test with sample data** and update components to handle new data structure.

## Entry Grouping Methods

### `groupScreenshotEntries(logEntries)`

**New feature** that reduces log entry count by combining "Screenshot taken" entries with their subsequent analysis entries.

**Parameters:**

- `logEntries` (Array): Array of log entries to process

**Returns:**

Array of entries with screenshot entries intelligently combined with analysis entries. Combined entries include:

```javascript
{
  // All original analysis entry fields, plus:
  isCombinedEntry: true,           // Flag indicating this is a combined entry
  originalScreenshotId: string,    // Original screenshot timestamp/ID
  screenshotInfo: {
    timestamp: string,             // Screenshot capture timestamp
    window_selector: string,       // Window context from screenshot
    is_new_window: boolean        // Whether screenshot was in new window
  }
}
```

**Example:**

```javascript
const rawEntries = [
  { timestamp: '001', actions: [{action: 'screenshot'}], observations: [{result: 'Screenshot taken'}] },
  { timestamp: '002', thoughts: 'Analysis...', actions: [{action: 'search'}], observations: [...] }
];

const grouped = WorkstepParser.groupScreenshotEntries(rawEntries);
// Returns 1 entry instead of 2, with screenshot info preserved
console.log(grouped[0].isCombinedEntry);      // true
console.log(grouped[0].originalScreenshotId); // '001'
```

### `isScreenshotEntry(entry)`

Helper method to identify screenshot-only entries.

**Parameters:**

- `entry` (Object): Log entry to analyze

**Returns:**

- `boolean`: true if entry is primarily a screenshot capture

### `isAnalysisEntry(entry)`

Helper method to identify entries with meaningful analysis content.

**Parameters:**

- `entry` (Object): Log entry to analyze

**Returns:**

- `boolean`: true if entry contains thoughts, actions, or visionscript content

### `combineScreenshotWithAnalysis(screenshotEntry, analysisEntry)`

Merges screenshot metadata with analysis entry content.

**Parameters:**

- `screenshotEntry` (Object): Screenshot capture entry
- `analysisEntry` (Object): Analysis/action entry

**Returns:**

- `Object`: Combined entry with preserved screenshot information

## Enhanced Result Status Detection

The parser now includes intelligent detection of user interaction results vs system errors:

**User Interaction Patterns Detected:**
- `ask_human` / `answer`
- `user input` / `user response` 
- `confirmation` / `human input`
- `waiting for user` / `user interaction`

**Result Types:**
- `'success'`: Successful operations (✅ green)
- `'user'`: User interactions (👤 blue)
- `'error'`: System failures (❌ red)
- `'info'`: General information (ℹ️ light blue)

This ensures user confirmations and inputs are styled appropriately rather than being displayed as errors.
