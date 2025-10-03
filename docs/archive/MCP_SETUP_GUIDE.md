# MobilePixel MCP Setup Guide
**Universal guide for setting up MobilePixel in any project**

---

## ⚡ Quick Setup (30 seconds)

### Copy-Paste for AI

Give this instruction to AI:

```
Create two files in project root:

1. `.cursor/mcp.json`:
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
    }
  }
}

2. `.cursor/mcp-config.json` (optional, copy from C:\Code\mobilepixel\mcp-config.json)

Replace "C:\\Code\\mobilepixel" with your actual MobilePixel path.
Then restart Cursor completely.
Test: "List all available devices"
```

---

## 🚀 Manual Setup (3 Steps)

### Step 1: Create Config Files

**File 1**: `.cursor/mcp.json` - MobilePixel server location:

```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "node",
      "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
    }
  }
}
```

Replace path with your MobilePixel location.

**File 2**: `.cursor/mcp-config.json` - Tools configuration (optional):

```json
{
  "tools": {
    "core": true,
    "ai": true,
    "testing": true,
    "assertions": true,
    "visual_testing": true,
    "accessibility": true,
    "bug_reports": true,
    "test_recording": true,
    "batch_operations": true,
    "loading_detection": true,
    "clipboard": true,
    "device_conditions": true,
    "video_recording": false,
    "performance_monitoring": false,
    "network_monitoring": false,
    "flakiness_detection": false,
    "test_data_generation": false
  }
}
```

Or just copy from: `C:\Code\mobilepixel\mcp-config.json`

### Step 2: Build MobilePixel
```bash
cd C:\Code\mobilepixel
npm run build && npm run fixlint
```

### Step 3: Restart Cursor
Close Cursor completely → Reopen → Done!

---

## ✅ Test Setup

In Cursor chat:
```
List all available devices
```

Should show your Android/iOS devices.

---

## 🔧 Configuration Options

### Path Options (mcp.json)

**Absolute (Recommended)**:
```json
"args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
```

**Relative**:
```json
"args": ["../mobilepixel/lib/index.js"],
"cwd": "${workspaceFolder}"
```

**With Debug**:
```json
"args": ["C:\\Code\\mobilepixel\\lib\\index.js"],
"env": {
  "MCP_DEBUG": "true"
}
```

### Tools Configuration (mcp-config.json)

**Full Setup (Recommended)**:
```json
{
  "tools": {
    "core": true,              // Basic: tap, swipe, screenshot
    "ai": true,                // AI element finder
    "testing": true,           // Element lists, screen info
    "assertions": true,        // expect_* tools
    "visual_testing": true,    // Screenshot comparison
    "accessibility": true,     // A11y checks
    "bug_reports": true,       // Bug report generation
    "test_recording": true,    // Test recording & code gen
    "batch_operations": true,  // Batch actions
    "loading_detection": true, // Wait for loading
    "clipboard": true,         // Clipboard operations
    "device_conditions": true, // Battery, network, GPS
    "video_recording": false,  // Heavy operation
    "performance_monitoring": false,
    "network_monitoring": false,
    "flakiness_detection": false,
    "test_data_generation": false
  }
}
```

**Minimal Setup** (only essentials):
```json
{
  "tools": {
    "core": true,
    "ai": true,
    "testing": true,
    "assertions": false,
    "visual_testing": false,
    "accessibility": false,
    "bug_reports": false,
    "test_recording": false,
    "batch_operations": true,
    "loading_detection": true,
    "clipboard": false,
    "device_conditions": false,
    "video_recording": false,
    "performance_monitoring": false,
    "network_monitoring": false,
    "flakiness_detection": false,
    "test_data_generation": false
  }
}
```

---

## 🛠 Troubleshooting

### Server not found
1. Check file exists: `C:\Code\mobilepixel\lib\index.js`
2. Use absolute path
3. Restart Cursor completely

### No devices
```bash
adb kill-server && adb start-server
adb devices
```

### Build errors
```bash
cd C:\Code\mobilepixel
npm install
npm run build && npm run fixlint
```

---

## 📚 What You Get

### Basic Operations
- Launch/terminate apps
- Take screenshots
- Click, swipe, type
- Press buttons

### AI-Powered Features
- Find element by description: `"tap on Login button"`
- Wait for loading complete
- OCR text recognition
- Accessibility checks

### Testing
- Start/stop recording
- Generate test code
- Visual regression testing
- Bug report generation
- Batch operations

### Debug & Logs
- Get app logs
- Get crash logs
- System error logs
- Performance monitoring

**94+ tools total** - see all in Cursor after setup

---

## 🎯 Example Commands

After setup, try:

```
Launch Good Mood app on device
```

```
Take screenshot and find "Submit" button
```

```
Tap on element "Login button"
```

```
Wait for loading to complete
```

```
Start recording test actions
```

```
Get app logs for com.goodmood.app
```

```
Check accessibility issues on screen
```

---

## 📖 Additional Docs

Need more details? Check:

- **Full setup**: `MCP_SERVER_SETUP.md`
- **AI integration**: `AI_INTEGRATION_GUIDE.md`
- **Agent instructions**: `AI_AGENT_INSTRUCTIONS.md`
- **Tool configuration**: `MCP_TOOLS_CONFIGURATION.md`
- **Quick start**: `QUICK_START_CURSOR.md`

---

## ✨ Success Criteria

Setup complete when:

✅ File `.cursor/mcp.json` created (server location)  
✅ File `.cursor/mcp-config.json` created (tools config, optional)  
✅ MobilePixel server shows in Cursor MCP panel  
✅ AI can list devices  
✅ AI can take screenshots  

**All working? Start automating! 🚀**

---

## 📝 Two Config Files Explained

| File | Purpose | Required? |
|------|---------|-----------|
| `.cursor/mcp.json` | Tells Cursor WHERE MobilePixel is located | ✅ Yes |
| `.cursor/mcp-config.json` | Tells MobilePixel WHICH tools to enable | ⚠️ Optional |

**Without mcp-config.json**: All tools enabled by default  
**With mcp-config.json**: You control which tools are available

---

*Last Updated: October 3, 2025 | Version 1.1.0*

