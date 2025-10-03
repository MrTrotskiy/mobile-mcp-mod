# MobilePixel Server Setup Guide

Complete guide to setting up MobilePixel MCP server for mobile automation with AI.

---

## 📋 Prerequisites

### Required Software
- ✅ Node.js 18+ installed
- ✅ Android Platform Tools (ADB) for Android
- ✅ Xcode Command Line Tools (for iOS, macOS only)

### Required Hardware
- ✅ Android device or emulator
- ✅ iOS device or simulator (optional)

### Check Installation

```bash
# Check Node.js version
node --version
# Should show v18.x or higher

# Check ADB is installed
adb version
# Should show Android Debug Bridge version

# Check device connection
adb devices
# Should show connected device
```

---

## 🚀 Quick Start (Recommended)

### Option 1: Local Development Setup

**For active development** - build and run from source:

#### Step 1: Build Project
```bash
cd C:\Code\mobilepixel
npm install
npm run build
npm run fixlint
```

#### Step 2: Configure Cursor

File `.cursor/mcp.json` should already exist in project root with:
```json
{
  "mcpServers": {
    "mobile-mcp-local": {
      "command": "node",
      "args": ["lib/index.js"],
      "cwd": "${workspaceFolder}",
      "env": {}
    }
  }
}
```

If not, create it manually in the root of your project.

#### Step 3: Restart Cursor completely

**Important**: 
- Close Cursor completely (not just close window)
- Reopen Cursor
- MCP servers will reload automatically

#### Step 4: Test
In Cursor chat: `Show installed apps on device`

---

### Option 2: NPM Installation (Future)

**Note**: NPM package not yet published. Use local setup above.

When available:
```json
{
  "mcpServers": {
    "mobilepixel": {
      "command": "npx",
      "args": ["-y", "@mobilepixel/mcp@latest"]
    }
  }
}
```

---

## 🔧 Configuration Details

### Project Config (.cursor/mcp.json)

**Recommended approach** - create in project root:

```json
{
  "mcpServers": {
    "mobile-mcp-local": {
      "command": "node",
      "args": ["lib/index.js"],
      "cwd": "${workspaceFolder}",
      "env": {}
    }
  }
}
```

**Benefits**:
- ✅ Relative paths (portable across machines)
- ✅ Per-project settings
- ✅ Version control friendly
- ✅ Works with workspace folder variable

### Global Config (Alternative)

**For Cursor**: Settings → MCP Servers

**For Claude Desktop**: 
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**Note**: Use absolute paths in global config.

---

## 🔌 Connect Device

### Android Setup

#### 1. Enable USB Debugging
On your Android device:
1. Settings → About Phone
2. Tap "Build Number" 7 times
3. Settings → Developer Options
4. Enable "USB Debugging"

#### 2. Connect Device
```bash
# Connect device via USB
# Then check connection:
adb devices

# Should show:
# List of devices attached
# 843b3cd3        device
```

#### 3. Test Connection
```bash
# Get device info
adb shell getprop ro.product.model

# Take screenshot test
adb shell screencap -p /sdcard/test.png
```

### iOS Setup (macOS only)

#### 1. Install Dependencies
```bash
# Install ios-deploy
npm install -g ios-deploy

# Install WebDriverAgent (if needed)
brew install carthage
```

#### 2. Connect Device
- Connect iPhone/iPad via USB
- Trust computer on device
- Verify in Finder (macOS) or iTunes (Windows)

---

## 🎯 Server Modes

### Stdio Mode (For AI Tools)

**Used by**: Cursor, Claude Desktop, Cline, VSCode MCP

**Start**: Automatically started by AI tool

**Configuration**:
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

**Logs**: Appear in AI tool's MCP console

---

### SSE Mode (For HTTP Access)

**Used by**: Web interfaces, custom integrations

**Start**:
```bash
node lib/index.js --port 3000
```

**Access**:
- Endpoint: `http://localhost:3000/mcp`
- GET: Connect to server
- POST: Send commands

**Test**:
```bash
curl http://localhost:3000/mcp
```

---

## ✅ Verify Setup

### 1. Build Test
```bash
npm run build && npm run fixlint
```
Should complete without errors.

### 2. Device Test
```bash
adb devices
```
Should show your device.

### 3. Manual Test
```bash
# Test logs
node test/manual/test-logs.js

# Test context
node test/manual/test-context.js

# Test accessibility
node test/manual/test-accessibility-simple.js
```

### 4. AI Integration Test

In your AI tool (Cursor/Claude), try:
```
Show installed apps on my Android device
```

Should list all installed applications.

---

## 🔧 Configuration

### Build Configuration

Location: `C:\Code\mobilepixel\package.json`

```json
{
  "scripts": {
    "build": "tsc && chmod +x lib/index.js",
    "fixlint": "eslint . --fix",
    "start": "node lib/index.js"
  }
}
```

**Note**: `chmod` fails on Windows but is not critical.

### Runtime Settings

Location: `C:\Code\mobilepixel\src\config.ts`

```typescript
export const TIMEOUTS = {
  fast: 5000,      // Element search timeout
  medium: 10000,   // App launch timeout
  slow: 30000,     // Long operations
};
```

### Environment Variables

```bash
# Set Android SDK path (if not in PATH)
export ANDROID_HOME=/path/to/android/sdk

# Set custom device
export DEVICE_ID=843b3cd3
```

---

## 🔍 Troubleshooting

### Problem: "adb: command not found"

**Windows Solution**:
```bash
# Add to PATH
setx ANDROID_HOME "C:\Users\YOUR_USER\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools"
```

Restart terminal after setting PATH.

**Verify**:
```bash
adb version
```

---

### Problem: "No devices found"

**Solution**:
```bash
# Restart ADB server
adb kill-server
adb start-server

# Check devices
adb devices

# Check USB debugging is enabled on device
adb shell getprop ro.debuggable
```

---

### Problem: Build fails

**Solution**:
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
npm run fixlint
```

**Check for**:
- Syntax errors in TypeScript files
- Missing dependencies in `package.json`
- TypeScript version compatibility

---

### Problem: Port already in use (SSE mode)

**Windows Solution**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Or use different port**:
```bash
node lib/index.js --port 3001
```

---

### Problem: NPM Package Error

**Error**: `npm ERR! Cannot set properties of null (setting 'peer')`

**Cause**: NPM package `@mobilepixel/mcp@latest` not yet published.

**Solution**: Use local development setup:

1. Build project: `npm run build && npm run fixlint`
2. Create `.cursor/mcp.json` with local config
3. Restart Cursor completely

### Problem: AI tool doesn't see MCP server

**Solutions**:
1. **Check `.cursor/mcp.json` exists** in project root
2. **Verify path** - must point to `lib/index.js`
3. **Restart Cursor** completely (not just reload)
4. **Check build completed**: `dir lib\index.js`
5. **View MCP logs**: Output → MCP channel in Cursor
6. **Try absolute path** if relative doesn't work:
   ```json
   {
     "command": "node",
     "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
   }
   ```

---

## 📊 Performance Check

### Run Benchmarks
```bash
# Performance test
npx ts-node test/performance-android.ts

# Full benchmark suite (if available)
npx ts-node test/benchmark-suite.ts
```

### Expected Performance

**Standard Operations:**
- Tap: ~150ms
- Screenshot: ~500ms
- Get elements: ~2500ms (cached: 0ms)
- App launch: ~3000ms

**NEW in v1.1.0 - OCR Operations:** ⚡
- OCR single request: ~500ms (3x faster than v1.0.0)
- OCR parallel (4 requests): ~600ms total (7.5x faster)
- Image processing (cached): ~50ms (4x faster)

---

## 🎯 Testing Your Setup

### Quick Tests
```bash
# 1. Test logs
node test/manual/test-logs.js

# 2. Test crashes
node test/manual/test-crashes.js

# 3. Test context
node test/manual/test-context.js
```

### Full Test Suite
```bash
npm test
```

### Real App Test
```bash
# Interactive test with Good Mood app
node test/manual/test-goodmood-complete.js
```

---

## 🚀 Production Deployment

### NPM Package
Published as: `@mobilepixel/mcp@1.0.0`

### Install Globally
```bash
npm install -g @mobilepixel/mcp
```

### Use in Scripts
```json
{
  "scripts": {
    "mobile-test": "mobilepixel --port 3000"
  }
}
```

---

## 📖 Next Steps

After successful setup:

1. ✅ **Connect to AI**: See `AI_INTEGRATION_GUIDE.md`
2. ✅ **Learn features**: Check `docs/` folder
3. ✅ **Run examples**: Try `test/manual/` scripts
4. ✅ **Read docs**: See `AI_AGENT_INSTRUCTIONS.md`

---

## 📚 Additional Resources

- **GitHub**: https://github.com/MrTrotskiy/mobilepixel
- **Original Project**: https://github.com/mobile-next/mobile-mcp
- **Issues**: https://github.com/MrTrotskiy/mobilepixel/issues
- **License**: Apache 2.0

---

## 🎉 Quick Checklist

Before starting development:

- ✅ Node.js 18+ installed
- ✅ ADB working (`adb devices`)
- ✅ Device connected
- ✅ Project built (`npm run build`)
- ✅ Tests passing (`node test/manual/test-context.js`)
- ✅ AI tool configured
- ✅ AI can see device

**All green? You're ready to automate! 🚀**

---

*Last Updated: October 2, 2025*  
*Version: 1.1.0 (94+ Tools - OCR, Batch Ops, Loading Detection)*
