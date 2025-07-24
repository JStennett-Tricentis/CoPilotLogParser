# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **CoPilotLogParser** project - a sophisticated web-based tool for processing and analyzing agent execution logs from automated testing systems. The project focuses on parsing **worksteps**, **visionscript**, and **agent instructions** into readable, structured formats for better understanding of AI agent test execution flows.

## 🎯 **Primary Focus: Worksteps & VisionScript Parsing**

The main goal is to parse and display:

1. **Worksteps**: Structured test plans with step-by-step instructions, field values, and table entries
2. **VisionScript**: UI automation commands converted to readable format
3. **Current Actions**: Clean, parsed descriptions of what the agent is currently doing
4. **Agent Instructions**: Summarized behavior rules and confirmation requirements

## Project Structure

```yaml
CoPilotLogParser/
├── CLAUDE.md                    # This file - project guidance
├── debug/                       # Sample data and examples
│   ├── partial-logs-examples/   # Updated sample data with worksteps
│   │   └── agent_logs.json     # Contains visionscript, worksteps, instructions
│   ├── full-logs-examples/     # Complete log examples
│   └── website/                # Example website for design inspiration
└── web-parser/                 # Main Svelte application
    ├── src/
    │   ├── lib/
    │   │   ├── components/
    │   │   │   ├── WorkstepViewer.svelte   # **PRIMARY** component for parsed worksteps
    │   │   │   ├── LogViewer.svelte        # List view with workstep-focused info
    │   │   │   ├── Timeline.svelte         # Timeline visualization
    │   │   │   ├── FilterPanel.svelte      # Filtering and export
    │   │   │   └── FileUpload.svelte       # File input handling
    │   │   ├── utils/
    │   │   │   ├── workstepParser.js       # **CORE** parser for worksteps/visionscript
    │   │   │   ├── fileProcessor.js        # File processing logic
    │   │   │   └── exportUtils.js          # Export functionality
    │   │   └── stores/
    │   │       └── logStore.js             # State management
    │   └── routes/
    │       ├── +page.svelte                # Main application layout
    │       └── app.css                     # Global styles
    └── package.json
```

## 🔧 **Key Components**

### **WorkstepParser (`workstepParser.js`)**

The core parsing utility that transforms raw log data into structured, readable formats:

- **`parseWorksteps()`**: Converts Python dict strings to structured test data
- **`parseVisionscript()`**: Breaks down automation commands into readable steps
- **`parseDescription()`**: Cleans HTML tags and extracts action descriptions
- **`parseInstructions()`**: Summarizes verbose agent behavior rules
- **`extractCurrentAction()`**: Creates clean current action context
- **`createReadableSummary()`**: Main method that processes entire log entries

### **WorkstepViewer Component**

The primary UI component that displays parsed workstep data:

- **Test Overview**: Shows test name, description, session info
- **Current Step Details**: Active step with fields, instructions, expected results
- **Current Action**: Clean description with screen context and execution status
- **VisionScript Commands**: Step-by-step automation with copy functionality
- **Test Progress**: Timeline showing all steps with current step highlighted
- **Agent Behavior**: Summarized instructions and confirmation rules

### **Application Flow**

1. **Input**: Upload JSON or paste data via tabbed interface
2. **Parse**: WorkstepParser processes raw log entries
3. **Display**: Three main views:
   - **Timeline**: Visual timeline of log entries
   - **Log List**: Workstep-focused list with step names and automation commands
   - **Worksteps**: **PRIMARY VIEW** - Detailed parsed workstep display

## 📊 **Log File Structure**

### **Parsed Log Entry Fields**

Each log entry contains:

- **`worksteps`**: Python dict string with complete test plan structure
- **`visionscript`**: Raw automation commands (in observations)
- **`description`**: Current action description (may contain HTML tags)
- **`instructions`**: Agent behavior rules and confirmation requirements
- **`thoughts`**: Agent reasoning for current action
- **`actions`**: Array of actions being executed
- **`observations`**: Execution results with visionscript and outcomes

### **Worksteps Structure**

```json
{
  "name": "Create Sales Order",
  "description": "Test description",
  "test_steps": [
    {
      "step_number": 1,
      "step_name": "Log On",
      "screen_name": "Login",
      "instruction": "Log on to the SAP Fiori launchpad",
      "field_values": {"Username": "tomst", "Password": "Password223!"},
      "requires_user_confirmation": false,
      "expected_result": "The SAP Fiori launchpad displays"
    }
  ]
}
```

### **VisionScript Commands**

Raw automation commands like:

```bash
WAIT 2 SECONDS
TYPE "{CTRL-SHIFT-F}"
TYPE "Create sales order va01"
TYPE "{ENTER}"
```

Parsed into readable format:

- "Wait 2 seconds"
- "Press Ctrl+Shift+F (Open search)"
- "Type: 'Create sales order va01'"
- "Press Enter"

## 🎨 **UI/UX Focus**

The interface prioritizes **workstep readability**:

- **Modern card-based design** inspired by debug/website/ example
- **Worksteps as primary content** with supporting data as context
- **Clean, structured display** of test steps, field values, and automation commands
- **Auto-navigation** from list selection to workstep details
- **Copy functionality** for visionscript and field values

## 🔍 **Development Guidelines**

### **When Working with Logs**

1. **Use WorkstepParser.createReadableSummary()** for all log entry processing
2. **Apply WorkstepParser.groupScreenshotEntries()** to reduce entry count automatically  
3. **Focus on worksteps data** as the primary content
4. **Parse descriptions** to remove HTML tags and extract clean actions
5. **Display visionscript** in readable command format
6. **Show current step context** prominently
7. **Handle combined entries** - Check for `isCombinedEntry` flag and use `originalScreenshotId` for screenshots

### **UI Component Updates**

- **WorkstepViewer** is the main component for detailed views
- **LogViewer** should show workstep-focused summaries (step names, screen context)
- **Keep other data** (session IDs, timestamps) as supporting context
- **Maintain responsive design** with proper card layouts

### **Parser Enhancements**

When extending the parser:

- Add new parsing methods to `workstepParser.js`
- Update `createReadableSummary()` to include new data
- Consider if new entry types need grouping logic (see `groupScreenshotEntries()`)
- Update result status detection in `extractCurrentAction()` for new result types
- Test with sample data in `debug/partial-logs-examples/`
- Ensure UI components can handle new parsed data structures

## 📝 **Data Security & Context**

- Logs contain **test data only** for SAP systems
- No production credentials or sensitive business information
- Sample usernames and system configurations are for demo/testing purposes
- Focus on **test execution flow analysis** and **automation debugging**

## 🚀 **Current State**

**✅ Completed:**

- Modern UI with card-based design
- Complete workstep parsing and display
- VisionScript command parsing
- Current action parsing with clean descriptions
- Agent instruction summarization
- Three-view navigation (Timeline, List, Worksteps)
- Export functionality with multiple formats
- **Screenshot entry grouping** - Combines "Screenshot taken" with analysis entries
- **Smart result status detection** - User interactions styled as blue, not red errors
- **ZIP file support** - Automatic screenshot extraction from compressed uploads
- **Visual indicators** - Clear icons for combined entries (🔗) and screenshots (📸)

**🎯 Ready for:**

- Additional parsing enhancements
- New visualization components
- Extended export formats
- Performance optimizations for large datasets
