# CoPilot Log Parser - Web Interface

A sophisticated web-based tool for parsing and analyzing AI agent execution logs from automated testing systems. The application focuses on transforming raw log data into readable, structured formats with emphasis on **worksteps**, **visionscript**, and **agent behavior** analysis.

## 🎯 Key Features

### **Workstep-Focused Parsing**

- **Structured Test Plans**: Parses Python dict worksteps into readable test step sequences
- **Field Values Display**: Clean presentation of form data and table entries
- **Step Progress Tracking**: Visual timeline showing current step in test execution
- **Confirmation Requirements**: Highlights steps requiring user approval

### **VisionScript Command Parsing**

- **Automation Commands**: Converts raw visionscript to readable actions
- **Command Categorization**: Wait, Type, Click actions with proper formatting
- **Keyboard Shortcuts**: Translates key combinations (e.g., `{CTRL-SHIFT-F}` → "Press Ctrl+Shift+F")
- **Copy Functionality**: Easy copying of automation scripts

### **Current Action Analysis**

- **Clean Descriptions**: Removes HTML tags and metadata noise
- **Screen Context**: Shows current window/application context
- **Execution Results**: Success/failure status with technical details
- **Agent Thoughts**: Displays agent reasoning when available

### **Modern UI/UX**

- **Card-Based Design**: Clean, modern interface inspired by best practices
- **Three View Modes**: Timeline, Log List, and detailed Worksteps view
- **Tabbed Input**: Upload files or paste JSON data directly
- **Responsive Layout**: Works on desktop and tablet devices

### Performance Optimizations

- **Streaming JSON Parser**: Handle large files without memory exhaustion
- **Web Workers**: Background processing prevents UI blocking
- **Virtual Scrolling**: Display millions of entries without performance degradation
- **Progressive Loading**: Incremental data loading with progress indicators

## 🛠 Technology Stack

- **Framework**: SvelteKit with Vite build system
- **JSON Processing**: @streamparser/json-whatwg for large file streaming
- **Timeline**: Vis-Timeline for temporal visualization
- **Virtual Scrolling**: Custom implementation optimized for log data
- **Styling**: Custom CSS with modern design system

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd web-parser

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 Usage

### Starting the Application

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Loading Log Files

1. **Drag & Drop**: Drop JSON files directly onto the upload area
2. **File Browser**: Click the upload area to select files
3. **Supported Formats**:
   - `agent_logs.json` (full execution logs)
   - `filtered_agent_logs.json` (condensed test steps)

### File Size Handling

- **< 5MB**: Direct JSON parsing for instant loading
- **5-50MB**: Streaming parser with Web Workers for background processing
- **> 50MB**: Displays warning (requires server-side processing for production)

### Filtering Data

Use the filter panel to narrow down log entries:

- **Search**: Full-text search across all log content
- **Session ID**: Filter by specific test session
- **Step Name**: Filter by test step names (Log On, Navigate, etc.)
- **Screen Name**: Filter by SAP screen names (Login, Home, Sales Order Creation)
- **Time Range**: Filter by execution timestamp range

### Viewing Data

**List View** (Default):

- Rich card-based display
- Shows timestamp, description, session info
- Action summaries and step counts
- Hover effects for easy selection

**Table View**:

- Tabular data with virtual scrolling
- Sortable columns
- Optimized for large datasets
- Export-friendly format

**Timeline View**:

- Visual chronology of test execution
- Zoom and pan controls
- Color-coded by action type
- Click to select entries

### Exporting Data

Choose from multiple export formats:

- **JSON**: Complete structured data export
- **CSV**: Flattened data for Excel/Google Sheets
- **Summary Report**: Analytics and statistics
- **Filtered vs All**: Export current filtered results or complete dataset

## 📊 Log File Structure

### Full Logs (`agent_logs.json`)

```json
{
  "20250723205312": {
    "thoughts": "",
    "description": "Test step description...",
    "actions": [{"action": "screenshot", "args": {}}],
    "observations": [...],
    "session_id": "c99d4cd38d67c28089b3940e3b7b4f1e",
    "instructions": "...",
    "worksteps": "...",
    "test_data": ""
  }
}
```

### Filtered Logs (`filtered_agent_logs.json`)

```json
{
  "test_steps": [
    {
      "description": "Navigate to Sales Order Creation",
      "is_new_window": true,
      "window_selector": "Home - Google Chrome*",
      "observations": [
        {
          "actions_sequence_number": 1,
          "execution_timestamp": 1753304011.6478562,
          "description": "Search for 'Create sales order va01'",
          "action_mode": "input",
          "visionscript": "..."
        }
      ]
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file for custom configuration:

```env
# Development
VITE_DEV_MODE=true

# File size limits (in MB)
VITE_MAX_CLIENT_FILE_SIZE=50
VITE_STREAMING_THRESHOLD=5

# Export settings
VITE_DEFAULT_EXPORT_FORMAT=json
```

### Customization

**Modify parsing logic**: Edit `src/lib/stores/logStore.js`
**Add new export formats**: Extend `src/lib/utils/exportUtils.js`
**Customize UI themes**: Update CSS variables in `src/routes/app.css`

## 📈 Performance Guidelines

### File Size Recommendations

| File Size | Method | Performance |
|-----------|--------|-------------|
| < 5MB | Direct parsing | Instant |
| 5-25MB | Streaming + Workers | 2-5 seconds |
| 25-50MB | Streaming + Chunking | 10-30 seconds |
| > 50MB | Server-side recommended | N/A |

### Browser Compatibility

- **Chrome 90+**: Full feature support including Snappy compression
- **Firefox 88+**: Full support
- **Safari 14+**: Full support
- **Edge 90+**: Full support

### Memory Usage

- Typical memory consumption: 3-10x JSON file size
- Virtual scrolling limits DOM nodes to ~100 regardless of data size
- Web Workers isolate parsing from main thread

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Static Hosting

The application builds to static files compatible with:

- Vercel
- Netlify
- GitHub Pages
- Any static file server

### Environment-Specific Builds

```bash
# Development build
npm run build:dev

# Production build
npm run build:prod

# Preview production build
npm run preview
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🔍 Troubleshooting

### Common Issues

**Large files not loading**:

- Ensure file is under 50MB for client-side processing
- Check browser console for detailed error messages
- Try using streaming mode by refreshing the page

**Timeline not displaying**:

- Verify log entries have valid timestamps
- Check that timestamp format matches expected patterns
- Ensure Vis-Timeline dependencies loaded correctly

**Export failing**:

- Check that filtered data is not empty
- Verify browser allows file downloads
- Try different export formats

**Performance issues**:

- Enable virtual scrolling for large datasets
- Use table view instead of list view for better performance
- Consider filtering data before viewing

### Browser Console

Enable developer tools and check the console for detailed error messages and performance metrics.

## 📞 Support

For issues, feature requests, or questions:

- Check existing [Issues](../issues)
- Create a new issue with detailed description
- Include browser version, file size, and error messages
