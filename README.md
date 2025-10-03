# 🎨 MobilePixel - Pixel-Perfect Mobile Automation

> **Built on top of [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp)**  
> Original Author: Mobile Next Team  
> License: Apache 2.0

---

<h1 align="center">
  🎨 MobilePixel
</h1>

<h3 align="center">
  <strong>Pixel-perfect mobile automation with 89+ AI-powered tools</strong>
</h3>

<p align="center">
  The most comprehensive Model Context Protocol (MCP) server for mobile testing and automation.
  <br />
  Works with iOS & Android • Simulators, Emulators & Real Devices
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/Tools-89+-green?style=for-the-badge" alt="Tools" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-orange?style=for-the-badge" alt="License" />
</p>

---

## 🚀 What is MobilePixel?

**MobilePixel** is like **Playwright for mobile apps** - a powerful MCP server that enables AI agents and LLMs to interact with native iOS and Android applications through an intuitive, platform-agnostic interface.

With **89+ tools** spanning 7 major categories, MobilePixel provides everything you need for comprehensive mobile testing, from basic interactions to advanced features like visual regression, accessibility testing, and CI/CD integration.

### ✨ Key Highlights

- 🎯 **89+ MCP Tools** - Complete testing toolkit
- 🤖 **AI-Powered** - Natural language element finding
- 📱 **Cross-Platform** - iOS & Android support
- 🔍 **Visual Testing** - Pixel-perfect screenshot comparison
- ♿ **Accessibility** - WCAG 2.1 compliance checking
- 📊 **Analytics** - Performance monitoring & flaky test detection
- 🎨 **Visual Feedback** - Touch indicators for demos
- 🔧 **CI/CD Ready** - JUnit XML, JSON, TAP export

---

## 📦 Installation

### Local Development (Current)

For active development, use local build:

1. **Build project**:
   ```bash
   npm install
   npm run build
   npm run fixlint
   ```

2. **Configure Cursor** - create `.cursor/mcp.json`:
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

3. **Restart Cursor** completely

4. **Test**: `Show installed apps on device`

### NPM Installation (Future)

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

**Note**: NPM package not yet published. Use local setup above.

### Supported AI Tools

- **Cursor** ✅ - Configured via `.cursor/mcp.json`
- **Claude Desktop** - Edit config file
- **Cline** - Add to MCP settings
- **VS Code** - Install via MCP extension

---

## 🎯 Features by Category

### 📱 Week 1: Logs & Context (7 tools)
Track everything happening in your app:
- Application logs reading
- Crash detection & reporting
- System error tracking
- Test execution history
- Test context management

### 🌐 Week 2: Network & AI (12 tools)
Monitor and analyze network activity:
- HTTP/HTTPS request interception
- HAR export for analysis
- Network request filtering
- **AI Element Finder** - Find elements by natural language description
- Smart element detection

### 🧪 Week 3: Smart Testing (8 tools)
Build intelligent tests:
- Assertion framework (expectElementVisible, expectText, etc.)
- Test recorder - Record user actions
- Code generator - Auto-generate test code
- Test replay capabilities

### 🎨 Week 4-5: Visual & Performance (22 tools)

**Visual Regression Testing**
- Save/compare baseline screenshots
- Pixel-perfect diff detection
- Visual change reporting

**Video Recording**
- Record test execution
- Start/stop/cancel recording
- MP4 export

**Performance Monitoring**
- CPU, Memory, FPS tracking
- Performance metrics collection
- Resource usage analysis

**Device Control**
- Clipboard operations (get/set/clear)
- Battery simulation
- Network conditions (WiFi, mobile data, airplane mode)
- GPS location mocking

### ♿ Week 6: Accessibility & Documentation (8 tools)

**Accessibility Testing**
- WCAG 2.1 compliance checker
- Accessibility score (0-100)
- Find missing labels, small targets, overlaps
- Actionable recommendations

**Screenshot Annotations**
- Draw rectangles, circles, text
- Highlight elements
- Mark tap points
- Export annotated screenshots

**Bug Report Generator**
- Auto-generate comprehensive bug reports
- Include screenshots, logs, device info
- Markdown & JSON export

### 🔬 Week 7: Test Intelligence & CI/CD (21 tools)

**Flaky Test Detection**
- Track test execution history
- Calculate flakiness score (0-100)
- Identify failure patterns
- Get fix recommendations

**Test Data Generator**
- Generate realistic person data
- Email, phone, address generation
- Credit cards (test data only)
- Passwords, dates, lorem ipsum
- Batch generation (up to 100 items)
- Multi-locale support (en-US, ru-RU, uk-UA, de-DE, fr-FR)

**Visual Touch Indicators** 👆
- Show circles at tap points
- Pointer trails and coordinates
- Demo mode for presentations
- Perfect for debugging AI interactions

**CI/CD Integration**
- Export to JUnit XML (Jenkins, GitHub Actions)
- JSON format for custom dashboards
- Markdown reports for PR comments
- TAP (Test Anything Protocol)
- GitHub Actions summary

### 🎯 Core Features (11 tools)
- Device management & discovery
- Screen interactions (tap, swipe, type)
- Element finding & inspection
- Screenshot capture
- App launching & navigation

---

## 💡 Example Usage

### Basic Interaction
```
Find the login button and tap it
```

### AI-Powered Element Finding
```
Find the blue "Sign In" button and tap it
```

### Visual Testing
```
Save current screen as baseline "login-screen", then navigate to profile 
and compare with baseline "profile-screen" to detect any visual changes
```

### Accessibility Check
```
Check accessibility of current screen and report any issues
```

### Performance Test
```
Start performance monitoring, navigate through the app, 
then stop and show CPU and memory usage
```

### Generate Test Data
```
Generate 10 realistic user profiles with emails and phone numbers
```

### CI/CD Export
```
Export test results to JUnit XML format for Jenkins
```

---

## 🛠️ Prerequisites

**Required:**
- [Node.js](https://nodejs.org/) v18+
- [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools) (for Android)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/) (for iOS, macOS only)

**Devices:**
- iOS Simulators (macOS/Linux)
- Android Emulators (Linux/Windows/macOS)
- Real iOS/Android devices (with proper drivers)

---

## 📖 Example Workflows

### Test Registration Flow
```
Enable touch indicators, then open the app, fill registration form with 
generated test data, submit, verify success message, take screenshot 
and create bug report if any issues found
```

### Visual Regression Suite
```
For each screen: home, profile, settings - save baseline screenshot, 
make UI changes, compare with baseline and report differences > 5%
```

### Accessibility Audit
```
Navigate through all main screens, check accessibility score for each,
create report with all issues found and recommendations
```

### Performance Benchmark
```
Start performance monitoring, execute typical user flow,
stop monitoring and export metrics to CI/CD in JSON format
```

---

## 🎨 What Makes MobilePixel Special?

1. **Most Comprehensive** - 89+ tools covering everything from basic interactions to advanced testing
2. **AI-Native** - Built for LLMs with natural language support
3. **Visual First** - Pixel-perfect testing with visual regression and annotations
4. **Intelligence Built-in** - Flaky test detection, smart element finding
5. **Production Ready** - CI/CD integration, comprehensive reporting
6. **Real-World Tested** - Tested on actual devices, not just simulators
7. **Developer Friendly** - Clear tool descriptions, helpful error messages

---

## 📊 Stats

- **89+ MCP Tools**
- **~20,000 Lines of Code**
- **7 Feature Categories**
- **5 Locales Supported**
- **Android ✅ iOS ✅**
- **Production Ready ✅**

---

## 🙏 Credits

**Original Project:** [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp)  
**Original Authors:** Mobile Next Team  
**License:** Apache 2.0

MobilePixel is built on top of the excellent Mobile MCP project, extending it with advanced testing features, intelligence capabilities, and comprehensive tooling for modern mobile development.

---

## 📄 License

Apache 2.0 - See [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

---

<p align="center">
  <strong>MobilePixel - Every pixel matters in mobile testing</strong>
  <br />
  Made with ❤️ for mobile developers and QA engineers
</p>
