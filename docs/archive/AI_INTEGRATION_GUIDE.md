# AI Integration Guide - MobilePixel

Quick guide to connect MobilePixel to AI tools for mobile automation.

---

## 📱 What is MobilePixel?

MobilePixel is a comprehensive MCP server with **94+ tools** for iOS & Android automation. Connect it to Cursor, Claude Desktop, or other AI tools to automate mobile testing with natural language.

**New in 1.1.0**: OCR text recognition, batch operations, loading detection, and 3-7x performance improvements!

---

## 🚀 Quick Setup (NPM)

**Recommended for most users** - no local build needed!

### Cursor AI
Cursor Settings → MCP Servers → Add:

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

### Claude Desktop

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Restart & Test
1. Restart your AI tool (Cursor/Claude Desktop)
2. In chat, type: `Show list of apps on my device`

---

## 🛠️ Local Development Setup

If you're developing MobilePixel locally:

### 1. Build Project
```bash
cd C:\Code\mobilepixel
npm install
npm run build
npm run fixlint
```

### 2. Configure AI Tool

#### Option A: Global Settings (Recommended) ✅

**Use when**: You want MCP to work from **any project** in Cursor.

1. Open Settings: `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"

2. Add configuration:
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

**Benefits**: 
- ✅ Works from any workspace/project
- ✅ One configuration for all projects
- ✅ No need to configure per project

#### Option B: Project-Level Config

**Use when**: You **only work inside mobile-mcp project**.

Create `.cursor/mcp.json` in mobile-mcp project root:
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

**⚠️ Limitation**: Won't work if you open other projects in Cursor.

#### Option C: Claude Desktop

Edit config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### 3. Restart AI Tool

**Important**: Fully restart Cursor or Claude Desktop (not just reload window).

### 4. Test
In AI chat:
```
Show installed apps on device
```

You should see `mobile-mcp-local` or `mobilepixel` in MCP servers list.

---

## 💬 Example Commands

### Basic Operations
```
Show list of installed apps
Open Settings and take screenshot
Find the login button and tap it
Type "test@example.com" into email field
```

### Testing with AI
```
Test the login flow in Good Mood app
Find blue "Sign In" button and tap it
Check accessibility of current screen
Generate 10 test user profiles
```

### Advanced Features
```
Start recording video, then navigate to profile screen
Save current screen as baseline, then check for visual changes
Monitor performance while scrolling the feed
Get application logs for com.thegoodmoodco
```

### OCR & Visual Recognition (NEW) ⚡
```
Find text "98" on screen using OCR
Find all text elements using OCR
Find button with text "Sign In" that accessibility API missed
```

### Batch Operations (NEW) 🚀
```
Execute login flow atomically: launch app, type email, type password, tap login
Run multiple actions and stop on first error
Execute test steps with automatic screenshots on failure
```

### Loading Detection (NEW) 🎯
```
Wait for screen to finish loading
Wait for "Loading..." text to disappear
Wait for animations to complete before taking screenshot
```

### Debugging
```
Check for app crashes
Show test execution history
Get system error logs
Create bug report with screenshot
```

---

## ⚡ Built-in Optimizations

All optimizations work automatically:

- 🚀 **Smart Caching** - Screen size and elements cached (0ms on hits)
- 🚀 **Fast Operations** - Tap ~150ms, Screenshot ~500ms
- 🚀 **Smart Waits** - AI automatically waits for elements
- 🚀 **Session Pooling** - iOS WebDriver reuse
- 🚀 **Network Monitoring** - HTTP/HTTPS interception

### NEW Performance Improvements (v1.1.0) ⚡
- ⚡ **OCR Fast Mode** - 3x faster text recognition (500ms vs 1,500ms)
- 🚀 **Worker Pool** - 7.5x faster for parallel OCR requests
- 🖼️ **Sharp Cache** - 4x faster image processing (when cached)
- 📦 **Smaller Downloads** - 25x smaller OCR data (2MB vs 50MB)

---

## 🤖 BEST PRACTICES FOR AI AGENTS

### ⚠️ CRITICAL: Never Use Visual Coordinates!

**The #1 mistake AI agents make**: Using coordinates from screenshots.

```javascript
// ❌ WRONG - Guessing coordinates from screenshot
await mobile_click_on_screen_at_coordinates(843b3cd3, 100, 1400)

// ✅ CORRECT - Using Accessibility API
const elements = await mobile_list_elements_on_screen(843b3cd3)
const homeButton = elements.find(el => el.label === "Home")
const centerX = homeButton.rect.x + homeButton.rect.width / 2
const centerY = homeButton.rect.y + homeButton.rect.height / 2
await mobile_click_on_screen_at_coordinates(843b3cd3, centerX, centerY)
```

**Why?** 
- Screenshots may be scaled
- Visual coordinates ≠ Accessibility coordinates
- Bottom navigation bars have y-coordinates > 2000 (not 1400!)
- Dialogs appear at different positions than visible

### 📋 Step-by-Step Workflow

**Every time you want to click something:**

1. **Get accessibility tree** (ALWAYS first step!)
   ```
   mobile_list_elements_on_screen(deviceId)
   ```

2. **Find your element** in the results
   ```json
   {
     "type": "android.view.View",
     "label": "Home",
     "rect": { "x": 0, "y": 2076, "width": 216, "height": 90 }
   }
   ```

3. **Calculate CENTER coordinates**
   ```
   centerX = rect.x + rect.width / 2   // 0 + 216/2 = 108
   centerY = rect.y + rect.height / 2  // 2076 + 90/2 = 2121
   ```

4. **Click at center**
   ```
   mobile_click_on_screen_at_coordinates(deviceId, 108, 2121)
   ```

### ✅ Golden Rules

**ALWAYS:**
- ✅ Call `mobile_list_elements_on_screen()` first
- ✅ Use element coordinates from accessibility tree
- ✅ Calculate center: `x + width/2`, `y + height/2`
- ✅ Wait for dialogs to appear in accessibility tree
- ✅ Use `mobile_find_element_by_description()` for visual elements

**NEVER:**
- ❌ Guess coordinates from screenshots
- ❌ Use coordinates you see visually
- ❌ Click on element edges (always center!)
- ❌ Assume bottom nav is at y=1400 (it's usually y=2100+)
- ❌ Skip accessibility tree check

### 🎯 Common Patterns

#### Pattern 1: Click Navigation Button
```javascript
// 1. Get elements
const elements = await mobile_list_elements_on_screen(deviceId)

// 2. Find button by label
const homeBtn = elements.find(el => el.label === "Home")

// 3. Calculate center
const x = homeBtn.rect.x + homeBtn.rect.width / 2
const y = homeBtn.rect.y + homeBtn.rect.height / 2

// 4. Click
await mobile_click_on_screen_at_coordinates(deviceId, x, y)
```

#### Pattern 2: Click Dialog Button
```javascript
// 1. Wait a moment for dialog to render
await new Promise(resolve => setTimeout(resolve, 500))

// 2. Get elements (dialog should now be in tree)
const elements = await mobile_list_elements_on_screen(deviceId)

// 3. Find OK button
const okBtn = elements.find(el => el.text === "OK")

// 4. Click at center
const x = okBtn.rect.x + okBtn.rect.width / 2
const y = okBtn.rect.y + okBtn.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, x, y)
```

#### Pattern 3: Smart Click (with fallbacks)
```javascript
// Use AI element finder when accessibility fails
try {
  // Try 1: Accessibility tree
  const elements = await mobile_list_elements_on_screen(deviceId)
  const element = elements.find(el => 
    el.label?.includes("Login") || 
    el.text?.includes("Login")
  )
  
  if (element) {
    const x = element.rect.x + element.rect.width / 2
    const y = element.rect.y + element.rect.height / 2
    await mobile_click_on_screen_at_coordinates(deviceId, x, y)
  }
} catch {
  // Try 2: AI vision-based finder
  await mobile_tap_element_by_description(deviceId, "login button")
}
```

### 🐛 Debugging Tips

**Element not found?**
1. Check if element has `label` or `text` property
2. Look at `identifier` field
3. Try partial matching: `el.label?.includes("Home")`
4. Use OCR if text not in accessibility tree: `mobile_find_text_by_ocr()`

**Click not working?**
1. Verify you're clicking CENTER, not edges
2. Check if element is actually tappable (not disabled)
3. Wait for animations: `mobile_wait_for_loading()`
4. Enable touch indicators to see where you're clicking: `mobile_enable_touch_indicators()`

**Dialog not responding?**
1. Wait 500ms for dialog to appear in accessibility tree
2. Re-run `mobile_list_elements_on_screen()` after dialog opens
3. Dialog buttons usually at bottom of tree with `android.widget.Button` type

### 📚 Real-World Example

**Scenario**: Test login flow in React Native app

```javascript
// ❌ BAD APPROACH
await mobile_click_on_screen_at_coordinates(deviceId, 540, 1200) // Where's this?
await mobile_type_keys(deviceId, "test@example.com", false)
await mobile_click_on_screen_at_coordinates(deviceId, 540, 1500) // Random guess

// ✅ GOOD APPROACH
// 1. Get all elements
const elements = await mobile_list_elements_on_screen(deviceId)

// 2. Find email field
const emailField = elements.find(el => 
  el.identifier?.includes("email") || 
  el.label?.toLowerCase().includes("email")
)
const emailX = emailField.rect.x + emailField.rect.width / 2
const emailY = emailField.rect.y + emailField.rect.height / 2

// 3. Click email field
await mobile_click_on_screen_at_coordinates(deviceId, emailX, emailY)

// 4. Type email
await mobile_type_keys(deviceId, "test@example.com", false)

// 5. Find and click login button
const loginBtn = elements.find(el => 
  el.text?.toLowerCase().includes("login") ||
  el.label?.toLowerCase().includes("login")
)
const loginX = loginBtn.rect.x + loginBtn.rect.width / 2
const loginY = loginBtn.rect.y + loginBtn.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, loginX, loginY)
```

### 🎓 Key Takeaway

> **Visual coordinates from screenshots are NEVER reliable.**  
> **ALWAYS use Accessibility API coordinates from `mobile_list_elements_on_screen()`.**

This is the difference between:
- ❌ Tests that break randomly
- ✅ Tests that work reliably

---

## ❗ Troubleshooting

### NPM Package Error

**Error**: `npm ERR! Cannot set properties of null (setting 'peer')`

**Cause**: NPM package `@mobilepixel/mcp@latest` has issues or doesn't exist yet.

**Solution**: Use local development setup instead:

1. Create `.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "mobile-mcp-local": {
         "command": "node",
         "args": ["lib/index.js"],
         "cwd": "${workspaceFolder}"
       }
     }
   }
   ```

2. Build project:
   ```bash
   npm run build && npm run fixlint
   ```

3. Restart Cursor completely

### Device Not Found

```bash
# Check device connection
adb devices

# Should show:
# List of devices attached
# 843b3cd3        device

# If empty, restart ADB
adb kill-server
adb start-server
adb devices
```

### AI Not Responding

1. **Check MCP logs** in Cursor: View → Output → Select "MCP"
2. **Restart AI tool** completely (Cursor/Claude Desktop)
3. **Check path** in config - must point to `lib/index.js`
4. **Rebuild project** if using local setup:
   ```bash
   npm run build && npm run fixlint
   ```
5. **Verify file exists**: `dir lib\index.js`

### MCP Server Not Found in Cursor

**Problem**: Cursor shows "No server info found"

**Solutions**:
1. **Check `.cursor/mcp.json` exists** in project root
2. **Verify paths** are correct (relative to workspace)
3. **Check build completed**: `lib/` folder should exist
4. **View MCP logs**: Output → MCP channel
5. **Try absolute path** if relative doesn't work:
   ```json
   {
     "command": "node",
     "args": ["C:\\Code\\mobile-mcp-mod\\mobile-mcp\\lib\\index.js"]
   }
   ```

### Build Errors (Local Setup)

```bash
# Clean and rebuild
cd C:\Code\mobilepixel
npm run clean
npm install
npm run build
npm run fixlint
```

**Note**: On Windows, `chmod` command will fail but this is not critical.

---

## 🎯 Available Features (94+ Tools)

### Core (11 tools)
- Device management
- Tap, swipe, type
- Screenshots
- App launching

### Logs & Context (7 tools)
- Application logs
- Crash detection
- System errors
- Test history

### Network & AI (12 tools)
- HTTP interception
- HAR export
- AI element finder

### OCR & Recognition (2 tools) ⚡ NEW
- `mobile_ocr_screenshot` - OCR on entire screen
- `mobile_find_text_by_ocr` - Find specific text

### Batch Operations (1 tool) 🚀 NEW
- `mobile_batch_actions` - Execute multiple actions atomically

### Loading Detection (2 tools) 🎯 NEW
- `mobile_wait_for_loading` - Wait for screen stability
- `mobile_wait_for_element_condition` - Wait for element

### Testing (8 tools)
- Assertions
- Test recorder
- Code generator

### Visual & Performance (22 tools)
- Visual regression
- Video recording
- Performance monitoring
- Device simulation

### Accessibility (8 tools)
- WCAG compliance
- Screenshot annotations
- Bug reports

### Intelligence (21 tools)
- Flaky test detection
- Test data generator
- Touch indicators
- CI/CD integration

---

## 📖 More Info

- **🤖 AI Best Practices**: `docs/AI_BEST_PRACTICES.md` - **Обязательно к прочтению!**
- **Full Setup Guide**: `docs/MCP_SERVER_SETUP.md`
- **Development Guide**: `docs/AI_AGENT_INSTRUCTIONS.md`
- **Documentation**: `docs/` folder
- **GitHub**: https://github.com/MrTrotskiy/mobilepixel

---

## 🎉 Quick Test Checklist

After setup, verify everything works:

```
✅ "Show installed apps" - Lists apps
✅ "Take screenshot" - Returns screenshot
✅ "Open Settings" - Launches app
✅ "Find buttons on screen" - Lists elements
✅ "Get app logs" - Shows logs
```

---

*Ready to automate! 🚀*
