# AI Agent Instructions: MobilePixel

## 🎨 Project Overview

**Project**: MobilePixel (@mobilepixel/mcp)  
**Version**: 1.1.0  
**Repository**: https://github.com/MrTrotskiy/mobilepixel  
**Status**: ✅ Production Ready  
**Tools**: 94+ MCP tools for iOS & Android automation (5 new in v1.1.0)

---

## 📱 What is MobilePixel?

MobilePixel is a comprehensive Model Context Protocol (MCP) server for mobile testing and automation. It provides AI agents with 94+ tools for interacting with iOS and Android applications - like Playwright, but for mobile apps.

### Key Features
- 🤖 **AI-Powered Testing** - Natural language element finding
- 📱 **Cross-Platform** - iOS & Android support  
- 🎨 **Visual Testing** - Pixel-perfect screenshot comparison
- ♿ **Accessibility** - WCAG 2.1 compliance checking
- 📊 **Performance** - CPU, Memory, FPS monitoring
- 🔍 **Network Monitoring** - HTTP/HTTPS interception & HAR export
- 🎥 **Video Recording** - Record test execution
- 🔧 **CI/CD Ready** - JUnit XML, JSON, TAP, Markdown export

### NEW in v1.1.0 ⚡
- 🔍 **OCR Integration** - Find text elements that accessibility API misses
- 🚀 **Batch Operations** - Execute multiple actions atomically
- ⏳ **Loading Detection** - Auto-wait for animations & loading states
- ⚡ **3-7x Performance** - OCR Fast Mode, Worker Pool, Image Cache

---

## 🚀 Quick Start

### 1. Build Project
```bash
cd C:\Code\mobilepixel
npm install
npm run build
npm run fixlint
```

**Note**: On Windows, `chmod +x` will fail but this is not critical.

### 2. Configure Cursor

Create `.cursor/mcp.json` in project root (if not exists):
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

**Then restart Cursor completely** (not just reload window).

### 3. Connect Device
```bash
# Check Android device is connected
adb devices

# Should show:
# List of devices attached
# 843b3cd3        device
```

### 4. Test Installation
```bash
# Check server starts
node lib/index.js
# Should print: "MobilePixel server running on stdio"

# Run manual test
node test/manual/test-context.js

# Or test via Cursor AI chat
# "Show installed apps on device"
```

---

## 🛠️ Development Workflow

### Daily Workflow
1. **Read** existing code first - understand before changing
2. **Build** after changes: `npm run build && npm run fixlint`
3. **Test** with real device when connected
4. **Verify** no errors, backward compatible
5. **Commit** with clear message: `git commit -m "feat: [name] - [benefit]"`

### Code Standards
- ✅ Write clean, simple, readable code
- ✅ Keep files small and focused (<200 lines)
- ✅ Use clear, consistent naming
- ✅ Add lots of explanatory comments
- ✅ Test after every meaningful change
- ✅ One step at a time

### Before Every Commit
```bash
# Build and fix linting
npm run build && npm run fixlint

# Test if device is connected
# Run relevant manual tests from test/manual/
```

---

## 📁 Project Structure

### Core Directories
```
mobile-mcp/
├── src/              # TypeScript source code
├── lib/              # Compiled JavaScript (generated)
├── test/             # Test files
│   └── manual/       # Manual test scripts
├── docs/             # Feature documentation
└── other/            # Guides and instructions
```

### Key Files
- `src/server.ts` - MCP server with all 94+ tools
- `src/android.ts` - Android automation implementation
- `src/ios.ts` - iOS automation implementation
- `src/test-context.ts` - Test execution tracking
- `package.json` - Project configuration

---

## 🎯 Available Tools (94+)

### Core Features (11 tools)
- Device discovery & management
- Screen interactions (tap, swipe, type)
- Element finding & inspection
- Screenshot capture
- App launching & navigation

### Week 1: Logs & Context (7 tools)
- `mobile_get_app_logs` - Application logs
- `mobile_clear_app_logs` - Clear logs
- `mobile_get_crash_logs` - Crash detection
- `mobile_get_system_errors` - System errors
- `mobile_get_test_summary` - Test statistics
- `mobile_get_test_actions` - Action history
- `mobile_clear_test_context` - Clear history

### Week 2: Network & AI (12 tools)
- HTTP/HTTPS request interception
- HAR export for analysis
- Network filtering
- AI Element Finder (natural language)

### OCR & Recognition (2 tools) ⚡ NEW v1.1.0
- `mobile_ocr_screenshot` - Extract all text from screen (3x faster with Fast Mode)
- `mobile_find_text_by_ocr` - Find specific text using OCR (supports parallel processing)

### Batch Operations (1 tool) 🚀 NEW v1.1.0
- `mobile_batch_actions` - Execute multiple actions atomically with rollback

### Loading Detection (2 tools) 🎯 NEW v1.1.0
- `mobile_wait_for_loading` - Wait for screen to stabilize (screenshot comparison)
- `mobile_wait_for_element_condition` - Wait for element appear/disappear

### Week 3: Smart Testing (8 tools)
- Assertion framework
- Test recorder
- Code generator
- Test replay

### Week 4-5: Visual & Performance (22 tools)
- Visual regression testing
- Video recording
- Performance monitoring
- Device control (clipboard, battery, GPS, network)

### Week 6: Accessibility (8 tools)
- WCAG 2.1 compliance checker
- Screenshot annotations
- Bug report generator

### Week 7: Test Intelligence (21 tools)
- Flaky test detection
- Test data generator (5 locales)
- Visual touch indicators
- CI/CD integration (JUnit, JSON, TAP, Markdown)

---

## 💡 Usage Examples

### Via AI Chat (Cursor/Claude)
```
Show list of installed apps on device
Open Settings and take screenshot
Find login button and tap it
Check accessibility of current screen
Generate 10 test user profiles
Record video of app launch
```

### NEW Features (v1.1.0) ⚡
```
Find text "98" on screen using OCR
Find all text elements that accessibility API missed
Execute login flow atomically with error rollback
Wait for screen to finish loading animations
Wait for "Loading..." spinner to disappear
```

### Via Code
```typescript
import { AndroidRobot } from "@mobilepixel/mcp";

const android = new AndroidRobot("843b3cd3");

// Take screenshot
await android.screenshot();

// Find and tap element
const elements = await android.getElementsOnScreen();
await android.tap(100, 200);

// Get app logs
const logs = await android.getAppLogs("com.example.app", 100);

// Check for crashes
const crashes = await android.getCrashLogs("com.example.app");
```

---

## 🧪 Testing

### Manual Tests (Recommended)
```bash
# Test logs functionality
node test/manual/test-logs.js

# Test crash detection
node test/manual/test-crashes.js

# Test context tracking
node test/manual/test-context.js

# Test accessibility
node test/manual/test-accessibility-simple.js

# Interactive Good Mood app test
node test/manual/test-goodmood-complete.js
```

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test file
npx ts-node test/log-reader.ts
```

---

## 🔍 Troubleshooting

### Build Fails
```bash
# Check syntax and imports
npm run build

# Fix linting issues
npm run fixlint
```

### Device Not Found
```bash
# Check connection
adb devices

# Restart ADB if needed
adb kill-server
adb start-server
adb devices
```

### Test Fails
```bash
# Revert changes
git checkout .

# Check device is connected
adb devices

# Try manual test first
node test/manual/test-context.js
```

---

## 📊 Performance Features

All performance optimizations are built-in:
- 🚀 **Screen size caching** - 0ms on cache hits
- 🚀 **Element caching** - 200ms TTL
- 🚀 **Smart waiting** - `waitFor()` instead of `setTimeout()`
- 🚀 **Session pooling** - iOS WebDriver reuse
- 🚀 **HTTP Keep-Alive** - Faster iOS operations

### NEW Performance Improvements (v1.1.0) ⚡
- ⚡ **OCR Fast Mode** - 3x faster (500ms vs 1,500ms per request)
- 🚀 **OCR Worker Pool** - 7.5x faster for parallel requests (600ms for 4 requests vs 6,000ms)
- 🖼️ **Sharp Image Cache** - 4x faster for repeated operations (50ms vs 200ms)
- 📦 **Smaller Downloads** - 25x smaller OCR data (2MB vs 50MB)

Average operation speeds:
- Tap: ~150ms
- Screenshot: ~500ms
- OCR: ~500ms (3x faster than before!)
- Get elements: ~2500ms (cached: 0ms)
- Swipe: ~1100ms

---

## 🎯 Best Practices

1. **Always build before testing**
   ```bash
   npm run build && npm run fixlint
   ```

2. **Test on real device when possible**
   - Connect Android device: `843b3cd3`
   - Run manual tests from `test/manual/`

3. **Write tests for new features**
   - Add to `test/manual/` for quick verification
   - Add to `test/` for automated testing

4. **Keep backward compatibility**
   - Don't break existing APIs
   - Add new features, don't remove old ones
   - Test existing functionality after changes

5. **Comment your code**
   - Explain WHY, not just WHAT
   - Add examples in comments
   - Document edge cases

---

## 📖 Documentation

### Main Docs
- `README.md` - Project overview
- `CHANGELOG.md` - Version history
- `docs/WEEK1_FEATURES.md` - Logs & Context features
- `docs/WEEK2_NETWORK.md` - Network monitoring
- `docs/WEEK3_ASSERTIONS.md` - Testing features
- `docs/WEEK6_ACCESSIBILITY.md` - Accessibility testing

### Guides (other/)
- `AI_INTEGRATION_GUIDE.md` - Connect to AI tools
- `MCP_SERVER_SETUP.md` - Server setup guide
- `AI_AGENT_INSTRUCTIONS.md` - This file

---

## 🚀 Deployment

### Local Development (Current Setup)

**Recommended**: Use project-level config file `.cursor/mcp.json`:

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
- ✅ Relative paths (works across machines)
- ✅ Per-project configuration
- ✅ Automatic workspace detection
- ✅ No global settings needed

**Alternative**: Global settings with absolute path:
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

### NPM Package (Future)

**Note**: NPM package `@mobilepixel/mcp@1.0.0` is planned but not yet published.

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

## 🎉 Success Criteria

Before considering a feature complete:
- ✅ Build successfully (`npm run build`)
- ✅ Pass linting (`npm run fixlint`)
- ✅ Not break existing functionality
- ✅ Backward compatible
- ✅ Tested on real device
- ✅ Clear commit message
- ✅ Documentation updated

---

## 📚 Additional Resources

- **GitHub**: https://github.com/MrTrotskiy/mobilepixel
- **Original Project**: https://github.com/mobile-next/mobile-mcp
- **License**: Apache 2.0

---

*Last Updated: October 2, 2025*  
*Version: 1.1.0*  
*Status: Production Ready* 🎉  
*New: 94+ Tools with OCR, Batch Ops, Loading Detection, 3-7x Performance* ⚡
