# 🧪 Automated Extension Testing Guide

This document explains the comprehensive testing automation system for the Ishka extension.

## 🚀 Quick Start

### Option 1: One-Shot Automated Test
```bash
# Build and run complete automated test suite
pnpm run test:auto
```

### Option 2: Watch Mode with Real-Time Dashboard
```bash
# Terminal 1: Start file watcher
pnpm run test:watch

# Terminal 2: Open test dashboard
pnpm run test:dashboard
```

## 🔧 Testing Workflows

### 1. **Automated Extension Test** (`pnpm run test:auto`)
- ✅ Builds extension automatically
- ✅ Launches Chrome with extension loaded  
- ✅ Tests popup functionality (diagnostics, export, UI)
- ✅ Tests content script injection
- ✅ Tests background script communication
- ✅ Tests retry mechanisms
- ✅ Captures extension errors from `chrome://extensions/?errors=ID`
- ✅ Generates detailed reports with recommendations

**Output**: 
- JSON report: `test-reports/extension-test-{sessionId}.json`
- Human summary: `test-reports/extension-test-{sessionId}-summary.txt`

### 2. **Watch Mode** (`pnpm run test:watch`)
- 🔄 Watches source files for changes
- 🔄 Auto-rebuilds on file save
- 🔄 Auto-reloads extension in Chrome (requires setup)
- 🔄 Runs quick tests continuously
- 📊 Real-time dashboard at `localhost:8080`

### 3. **Error Detection Tests** (`pnpm run test:e2e`)
- 🔍 Specialized error detection and reporting
- 🔍 Captures JavaScript errors, console errors, page errors
- 🔍 Tests popup, content script, background script separately
- 🔍 Memory leak detection
- 🔍 Export functionality validation

## 📊 Test Dashboard Features

The real-time dashboard (`scripts/test-dashboard.html`) provides:

- **Live Status**: Current test state (running/idle/error)
- **Build Statistics**: Success/failure counts and rates
- **Error Monitoring**: Real-time error capture and display
- **Test Results**: Pass/fail status for all test categories
- **Live Logs**: Streaming test output with timestamps
- **Quick Actions**: 
  - Manual test trigger
  - Extension error page shortcut
  - Chrome extensions manager shortcut

## 🔄 Auto-Reload Setup (Optional)

To enable automatic extension reloading when files change:

1. **Start Chrome with debugging enabled**:
   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

   # Windows
   chrome.exe --remote-debugging-port=9222
   
   # Linux
   google-chrome --remote-debugging-port=9222
   ```

2. **Load your extension** in Chrome as usual

3. **Run watch mode** - it will now auto-reload the extension:
   ```bash
   pnpm run test:watch
   ```

## 🎯 Solving the Manual Testing Problem

### Before: Manual Workflow
1. ❌ Make code changes
2. ❌ Run `pnpm build` manually
3. ❌ Go to `chrome://extensions/`
4. ❌ Click reload button
5. ❌ Pin extension to toolbar
6. ❌ Click extension icon
7. ❌ Test functionality manually
8. ❌ If errors, manually copy error messages
9. ❌ Manually navigate to `chrome://extensions/?errors=ID`
10. ❌ Manually report errors back

### After: Automated Workflow
1. ✅ Make code changes
2. ✅ Save file (auto-triggers everything else)
3. ✅ **Automatic**: Build, reload, test, report errors
4. ✅ **Dashboard shows**: Real-time status and results
5. ✅ **Auto-generated**: Error reports with recommendations

## 📋 Test Categories

### Popup Tests
- ✅ Loads without JavaScript errors
- ✅ All diagnostic tabs present and functional
- ✅ Diagnostics execute successfully
- ✅ Export functionality works (JSON, clipboard)
- ✅ Tab switching works
- ✅ UI components render correctly

### Content Script Tests  
- ✅ Injects diagnostic element on all pages
- ✅ Handles ChatGPT pages specifically
- ✅ No errors on non-ChatGPT pages
- ✅ Shadow DOM isolation works
- ✅ Event listeners attach correctly

### Background Script Tests
- ✅ Service worker initializes
- ✅ Storage permissions work
- ✅ Message passing functional
- ✅ Tab management works
- ✅ Periodic cleanup runs

### Retry Mechanism Tests
- ✅ Retry configuration loads correctly
- ✅ Exponential backoff implemented  
- ✅ Telemetry tracking works
- ✅ Failed tests retry appropriately
- ✅ Success after retry tracked

### Error Detection Tests
- ✅ Console errors captured
- ✅ Page errors captured  
- ✅ Extension errors from Chrome detected
- ✅ Memory leaks identified
- ✅ Critical vs non-critical error classification

## 🚨 Error Automation

### Automatic Error Capture
The system automatically captures errors from:

1. **Console Errors**: `page.on('console')` 
2. **Page Errors**: `page.on('pageerror')`
3. **Extension Errors**: `chrome://extensions/?errors=ID`
4. **Build Errors**: Build process stderr
5. **Test Failures**: Test execution errors

### Error Classification
- **Critical**: TypeError, ReferenceError, "Cannot read property"
- **Warning**: Manifest V2 warnings, favicon errors
- **Info**: Development-only messages

### Auto-Recommendations
Based on detected errors, the system provides:
- "Check popup component initialization" → for popup errors
- "Verify content script injection" → for content script errors  
- "Review Chrome extension errors" → for extension API errors
- "Check manifest permissions" → for permission errors

## 🎛️ Configuration

### File Watching
Edit `scripts/watch-and-test.ts` to modify:
- Watch patterns (currently: `src/**/*.{ts,svelte,css,json}`)
- Debounce timeout (currently: 1 second)
- Test frequency

### Test Scope
Edit `scripts/automated-extension-test.ts` to:
- Add/remove test categories
- Modify error detection rules
- Change timeout values
- Customize reporting

### Dashboard
Edit `scripts/test-dashboard.html` to:
- Change WebSocket port (currently: 8081)
- Modify UI appearance
- Add custom metrics
- Change auto-refresh behavior

## 🐛 Troubleshooting

### Common Issues

**"Extension ID not found"**
- Make sure extension is loaded in Chrome
- Check extension name contains "Ishka"
- Manually verify at `chrome://extensions/`

**"WebSocket connection failed"**  
- Check if watch mode is running
- Verify port 8081 is available
- Refresh dashboard page

**"Chrome DevTools connection failed"**
- Start Chrome with `--remote-debugging-port=9222`
- Check port 9222 is available
- Verify Chrome is running

**"Build failed"**
- Check TypeScript errors
- Verify all dependencies installed
- Run `pnpm install` again

### Debug Mode
Add `DEBUG=1` to enable verbose logging:
```bash
DEBUG=1 pnpm run test:auto
DEBUG=1 pnpm run test:watch
```

## 📈 Benefits

✅ **Zero Manual Steps**: File save triggers everything  
✅ **Instant Feedback**: Real-time error detection  
✅ **Comprehensive Coverage**: All extension components tested  
✅ **Error Context**: Detailed error reports with file/line numbers  
✅ **Trend Tracking**: Success rates and failure patterns  
✅ **CI/CD Ready**: Can run in headless mode for automation  
✅ **Developer Productivity**: Focus on code, not manual testing  

This automated testing system eliminates the tedious manual workflow and provides instant, actionable feedback on extension functionality and errors.