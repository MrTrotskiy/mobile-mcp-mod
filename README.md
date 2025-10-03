# 🎨 MobilePixel - Pixel-Perfect Mobile Automation

> **Built on top of [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp)**  
> Original Author: Mobile Next Team  
> License: Apache 2.0

---

<h1 align="center">
  🎨 MobilePixel
</h1>

<h3 align="center">
  <strong>Pixel-perfect mobile automation with 94+ AI-powered tools</strong>
</h3>

<p align="center">
  The most comprehensive Model Context Protocol (MCP) server for mobile testing and automation.
  <br />
  Works with iOS & Android • Simulators, Emulators & Real Devices
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.1.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/Tools-94+-green?style=for-the-badge" alt="Tools" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-orange?style=for-the-badge" alt="License" />
</p>

---

## 🚀 What is MobilePixel?

**MobilePixel** is like **Playwright for mobile apps** - a powerful MCP server that enables AI agents and LLMs to interact with native iOS and Android applications through an intuitive, platform-agnostic interface.

With **94+ tools** spanning multiple categories, MobilePixel provides everything you need for comprehensive mobile testing, from basic interactions to advanced features like OCR, visual regression, accessibility testing, and CI/CD integration.

### ✨ Key Highlights

- 🎯 **94+ MCP Tools** - Complete testing toolkit
- 🤖 **AI-Powered** - Natural language element finding
- 🔍 **OCR Integration** - Find text that accessibility API misses (⚡ 3x faster)
- 📦 **Batch Operations** - Execute multiple actions atomically
- ⏳ **Smart Waiting** - Auto-detect loading states
- 📱 **Cross-Platform** - iOS & Android support
- 🎨 **Visual Testing** - Pixel-perfect screenshot comparison
- ♿ **Accessibility** - WCAG 2.1 compliance checking
- 🔧 **CI/CD Ready** - JUnit XML, JSON, TAP export

### 🆕 What's New in v1.1.0

- **OCR Text Recognition** - Fast mode (500ms), Worker Pool (7.5x faster parallel)
- **Batch Operations** - Atomic multi-action execution with rollback
- **Loading Detection** - Smart waiting for screen stability
- **Performance** - 3-7x faster image processing with caching

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

## 📚 Documentation

**For AI Agents** - Compact, no-nonsense guides:

- **[AI_BEST_PRACTICES.md](docs/AI_BEST_PRACTICES.md)** - How to use MCP correctly (146 lines)
  - Main rule: Use Accessibility API, not visual coordinates
  - 4-step workflow, 7 examples, debugging tips
  
- **[SETUP.md](docs/SETUP.md)** - Build, configure, troubleshoot
  - Local development setup
  - Configure in any project
  - Device setup (Android/iOS)
  
- **[TOOLS.md](docs/TOOLS.md)** - Complete 94+ tools reference
  - All tools by category
  - Enable/disable categories
  - 80 tools limit configuration

---

## 🎯 Features Overview

### Core Tools (20)
Device management, screen interactions, element finding, screenshots, logs

### AI & OCR (7)
Natural language element finding, OCR text recognition (⚡ 3x faster)

### Smart Testing (14)
Assertions, test recording, code generation, batch operations, loading detection

### Visual Testing (4)
Baseline screenshots, pixel-perfect comparison, visual regression

### Accessibility (3)
WCAG 2.1 compliance, accessibility score, issue detection

### Bug Reports & Annotations (5)
Auto bug reports, screenshot annotations, element highlighting

### Performance & Network (9)
CPU/Memory/FPS monitoring, HTTP interception, HAR export

### Device Control (8)
Clipboard, battery simulation, network conditions, GPS mocking

### Test Intelligence (5)
Flaky test detection, test data generation, stability analysis

### CI/CD Integration (2)
JUnit XML, JSON, Markdown, TAP, GitHub Actions

### Visual Feedback (5)
Touch indicators, demo mode, pointer trails (perfect for AI debugging)

**Total: 94+ tools** - See [TOOLS.md](docs/TOOLS.md) for complete list

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

1. **Most Comprehensive** - 94+ tools covering everything from basic interactions to advanced testing
2. **AI-Native** - Built for LLMs with natural language support & OCR
3. **Visual First** - Pixel-perfect testing with visual regression and annotations
4. **Intelligence Built-in** - Flaky test detection, smart element finding, batch operations
5. **Production Ready** - CI/CD integration, comprehensive reporting
6. **Performance Focused** - 3-7x faster with smart caching and worker pools
7. **Developer Friendly** - Compact documentation, clear examples

---

## 📊 Stats

- **94+ MCP Tools** (5 new in v1.1.0)
- **~20,000 Lines of Code**
- **11 Tool Categories**
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
