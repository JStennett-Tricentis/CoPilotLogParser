# CoPilot Log Parser v1.0

A sophisticated web-based tool for processing and analyzing agent execution logs from automated testing systems. The project focuses on parsing **worksteps**, **visionscript**, and **agent instructions** into readable, structured formats for better understanding of AI agent test execution flows.

![CoPilot Log Parser](https://img.shields.io/badge/version-1.0-blue.svg)
![Svelte](https://img.shields.io/badge/svelte-4.x-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Features

### Core Functionality

- **Worksteps Parsing**: Convert Python dict strings to structured test data with step-by-step instructions
- **VisionScript Analysis**: Transform UI automation commands into readable format
- **Current Action Display**: Clean, parsed descriptions of agent activities
- **Agent Instructions**: Summarized behavior rules and confirmation requirements
- **Screenshot Integration**: Automatic screenshot extraction and display from ZIP files
- **Multiple Data Formats**: Support for JSON files, ZIP archives, and pasted data

### User Interface

- **Modern Card-Based Design**: Clean, structured display inspired by contemporary UI patterns
- **Three View Modes**: Timeline, Log List, and detailed Workstep views
- **Interactive Navigation**: Keyboard shortcuts (←/→ arrows, ESC) and click navigation
- **Real-time Filtering**: Search and filter by session ID, step names, screen names
- **Copy Functionality**: Easy copying of visionscript commands and field values
- **Export Options**: Multiple export formats for processed data

### Advanced Features

- **Smart Entry Grouping**: Combines screenshot entries with analysis entries to reduce clutter
- **Result Status Detection**: Differentiates between user interactions, errors, and successful operations
- **Responsive Design**: Works on desktop and tablet devices
- **Performance Optimized**: Handles large log files with virtual scrolling and web workers

## 🏗️ Project Structure

```yaml
CoPilotLogParser/
├── README.md                    # This file
├── CLAUDE.md                    # AI assistant guidance
├── debug/                       # Sample data and examples
│   ├── partial-logs-examples/   # Sample worksteps data
│   │   └── agent_logs.json     # Contains visionscript, worksteps, instructions
│   ├── full-logs-examples/     # Complete log examples
│   └── website/                # Design inspiration examples
└── web-parser/                 # Main Svelte application
    ├── src/
    │   ├── lib/
    │   │   ├── components/
    │   │   │   ├── WorkstepViewer.svelte   # PRIMARY: Detailed workstep display
    │   │   │   ├── LogViewer.svelte        # List view with workstep info
    │   │   │   ├── Timeline.svelte         # Timeline visualization
    │   │   │   ├── FilterPanel.svelte      # Filtering and export
    │   │   │   ├── FileUpload.svelte       # File input handling
    │   │   │   └── WorkstepsList.svelte    # Worksteps-focused list view
    │   │   ├── utils/
    │   │   │   ├── workstepParser.js       # CORE: Parser for worksteps/visionscript
    │   │   │   ├── fileProcessor.js        # File processing logic
    │   │   │   └── exportUtils.js          # Export functionality
    │   │   ├── stores/
    │   │   │   └── logStore.js             # State management
    │   │   └── workers/
    │   │       └── jsonParser.js           # Web worker for large files
    │   └── routes/
    │       ├── +page.svelte                # Main application layout
    │       └── app.css                     # Global styles
    ├── package.json
    └── vite.config.js
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CoPilotLogParser
   ```

2. **Navigate to the web parser**

   ```bash
   cd web-parser
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   ```bash
   http://localhost:5173
   ```

### Building for Production

```bash
npm run build
npm run preview  # Preview the built app
```

## 📊 Usage

### Supported Data Formats

#### JSON Log Files

Upload JSON files containing agent execution logs with the following structure:

```json
{
  "20250723205312": {
    "thoughts": "Agent reasoning",
    "description": "Current action description",
    "worksteps": "{'name': 'Test Name', 'test_steps': [...]}",
    "actions": [...],
    "observations": [...],
    "session_id": "unique-session-id",
    "instructions": "Agent behavior rules"
  }
}
```

#### ZIP Archives

Upload ZIP files containing:

- `agent_logs.json` or `filtered_agent_logs.json`
- Screenshots (automatically extracted and linked)

#### Pasted Data

Paste JSON data directly into the application using the "📝 Paste JSON" tab.

### Navigation

#### View Modes

- **📊 Timeline**: Visual timeline of log entries
- **📋 Log List**: Workstep-focused list with automation commands
- **📑 Worksteps List**: Dedicated worksteps overview
- **🎯 Workstep Detail**: Detailed view of individual entries

#### Keyboard Shortcuts

- `←/→` Arrow keys: Navigate between entries
- `ESC`: Return to list view
- Standard browser shortcuts (Ctrl+C, etc.) for copying

### Key Components

#### WorkstepViewer (Primary Component)

The main interface for detailed workstep analysis:

- **Test Overview**: Test name, description, session info
- **Current Step Details**: Active step with fields and instructions
- **Current Action**: Clean description with screen context
- **VisionScript Commands**: Readable automation commands
- **Test Progress**: Timeline with navigation
- **Agent Behavior**: Summarized instructions

#### Parsing Engine

The `WorkstepParser` class handles:

- **Python Dict Parsing**: Converts Python-style dictionaries to JavaScript objects
- **VisionScript Processing**: Transforms raw commands into readable descriptions
- **HTML Cleaning**: Removes tags and extracts meaningful content
- **Result Status Detection**: Identifies user interactions vs errors

## 🔧 Configuration

### Environment Variables

The application uses standard Vite environment variables:

- `VITE_APP_TITLE`: Application title (default: "CoPilot Log Parser")
- `VITE_API_URL`: API endpoint if using server-side processing

### Customization

- **Themes**: Modify CSS variables in `app.css`
- **Parser Rules**: Extend `workstepParser.js` for custom log formats
- **Export Formats**: Add new formats in `exportUtils.js`

## 🛠️ Development

### Key Technologies

- **Svelte 4**: Reactive UI framework
- **Vite**: Build tool and dev server
- **JSZip**: ZIP file processing
- **Web Workers**: Large file processing

### Adding New Features

#### Custom Parsers

Extend the `WorkstepParser` class:

```javascript
// In workstepParser.js
static parseCustomFormat(data) {
    // Your custom parsing logic
    return parsedData;
}
```

#### New Export Formats

Add to `exportUtils.js`:

```javascript
static exportCustomFormat(data, options) {
    // Your export logic
    return formattedData;
}
```

#### UI Components

Follow the existing component structure:

- Use Svelte stores for state management
- Follow the card-based design pattern
- Implement keyboard navigation where appropriate

### Testing Data

Use sample data in `debug/partial-logs-examples/` for development and testing.

## 📝 Data Security & Context

- **Test Data Only**: Logs contain test data for SAP systems
- **No Production Data**: No production credentials or sensitive business information
- **Demo Configurations**: Sample usernames and system configurations are for testing purposes
- **Focus**: Test execution flow analysis and automation debugging

## 🔍 Troubleshooting

### Common Issues

#### "No worksteps data available"

- **Cause**: Worksteps data is truncated/redacted (contains `******`)
- **Solution**: Use unredacted log files or check console for parsing warnings

#### Large File Processing

- **Files < 5MB**: Processed directly in browser
- **Files 5-50MB**: Processed using web workers
- **Files > 50MB**: Require server-side processing

#### Performance Issues

- **Filter data**: Use search and filters to reduce displayed entries
- **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
- **Check console**: Look for JavaScript errors

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: Limited support (desktop recommended)

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly with sample data
5. Submit a pull request

### Code Standards

- Use ESLint configuration
- Follow Svelte best practices
- Add JSDoc comments for public methods
- Test with multiple log file formats

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

For questions, issues, or feature requests:

1. Check the troubleshooting section above
2. Review sample data in `debug/` folder
3. Check browser console for errors
4. Create an issue with detailed information

## 🔄 Version History

### v1.0.0 (Current)

- ✅ Complete workstep parsing and display
- ✅ VisionScript command parsing
- ✅ Modern card-based UI design
- ✅ Three-view navigation system
- ✅ ZIP file support with screenshot extraction
- ✅ Smart entry grouping and result status detection
- ✅ Export functionality with multiple formats
- ✅ Keyboard navigation and copy functionality

### Future Roadmap

- 🔲 Server-side processing for very large files
- 🔲 Advanced filtering and search capabilities
- 🔲 Custom parsing rule configurations
- 🔲 Integration with CI/CD pipelines
- 🔲 Real-time log streaming support
