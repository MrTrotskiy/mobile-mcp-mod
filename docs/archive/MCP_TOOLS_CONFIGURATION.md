# MCP Tools Configuration Guide

## Overview

MobilePixel MCP server provides **106 tools** for mobile testing automation. However, Cursor IDE recommends using **maximum 80 tools** for optimal performance and better model response quality.

This guide explains how to configure which tool categories are enabled/disabled to keep your MCP server lean and fast.

---

## Problem

When you have too many tools enabled:
- ⚠️ **Performance degradation** - Cursor becomes slower
- ⚠️ **Model confusion** - AI may not respect more than 80 tools
- ⚠️ **Warning message** - "Exceeding total tools limit"

```
Exceeding total tools limit
You have 106 tools from enabled servers. Too many tools can 
degrade performance, and some models may not respect more 
than 80 tools.
```

---

## Solution: Tool Categories Configuration

You can enable/disable entire categories of tools using the `mcp-config.json` file.

### Configuration File Location

Create or edit `mcp-config.json` in the **root of your project**:

```
mobilepixel/
├── mcp-config.json  ← Configuration file
├── src/
├── lib/
└── ...
```

### Configuration Format

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

---

## Tool Categories

### ✅ Core Tools (~20 tools) - **ALWAYS ENABLED**

**Essential tools for basic mobile testing:**

- `mobile_list_available_devices` - Find devices
- `mobile_list_apps` - List installed apps
- `mobile_launch_app` - Open apps
- `mobile_terminate_app` - Close apps
- `mobile_get_screen_size` - Get screen dimensions
- `mobile_click_on_screen_at_coordinates` - Tap at coordinates
- `mobile_long_press_on_screen_at_coordinates` - Long press
- `mobile_list_elements_on_screen` - Get UI elements
- `mobile_press_button` - Press hardware buttons (Back, Home, etc.)
- `mobile_open_url` - Open URLs in browser
- `mobile_swipe_on_screen` - Swipe gestures
- `mobile_type_keys` - Type text
- `mobile_take_screenshot` - Capture screen
- `mobile_save_screenshot` - Save screenshot to file
- `mobile_set_orientation` - Change orientation (portrait/landscape)
- `mobile_get_orientation` - Get current orientation
- `mobile_get_app_logs` - Get application logs
- `mobile_get_crash_logs` - Get crash logs
- `mobile_get_system_errors` - Get system errors
- `mobile_clear_app_logs` - Clear logs

**Status:** `"core": true` ✅ (Required)

---

### ✅ AI Tools (~10 tools) - **RECOMMENDED**

**AI-powered element detection and interaction:**

- `mobile_find_element_by_description` - Find element by natural language ("blue login button")
- `mobile_tap_element_by_description` - Tap element by description
- `mobile_find_all_matching_elements` - Find all matching elements
- `mobile_swipe_in_element` - Swipe inside specific element
- `mobile_ocr_screenshot` - Extract text from screenshot (OCR)
- `mobile_find_text_by_ocr` - Find specific text using OCR
- `mobile_hide_keyboard` - Hide soft keyboard
- `mobile_select_option_by_text` - Select picker option

**Status:** `"ai": true` ✅ (Recommended for AI agents)

---

### ✅ Testing Tools (~15 tools) - **RECOMMENDED**

**Essential testing utilities:**

- `mobile_wait_for_loading` - Wait for screen to stabilize
- `mobile_wait_for_element_condition` - Wait for element to appear/disappear
- `mobile_expect_element_visible` - Assert element is visible
- `mobile_expect_element_not_visible` - Assert element is NOT visible
- `mobile_expect_text_visible` - Assert text is visible
- `mobile_expect_text_not_visible` - Assert text is NOT visible
- `mobile_expect_element_count` - Assert element count
- `mobile_expect_on_screen` - Assert on specific screen
- `mobile_clear_test_context` - Clear test history
- `mobile_get_session_summary` - Get session summary
- `mobile_get_test_actions` - Get test action history
- `mobile_get_test_logs` - Get test logs

**Status:** `"testing": true` ✅ (Recommended)

---

### ✅ Batch Operations (~5 tools) - **USEFUL**

**Execute multiple actions atomically:**

- `mobile_batch_actions` - Execute sequence of actions

**Status:** `"batch_operations": true` ✅

---

### ✅ Visual Testing (~15 tools) - **OPTIONAL**

**Visual regression testing:**

- `mobile_save_baseline` - Save baseline screenshot
- `mobile_compare_screenshot` - Compare with baseline
- `mobile_list_baselines` - List saved baselines
- `mobile_delete_baseline` - Delete baseline

**Status:** `"visual_testing": true` ⚠️ (Can disable if not doing visual regression)

---

### ✅ Accessibility (~3 tools) - **USEFUL**

**Accessibility testing:**

- `mobile_check_accessibility` - Check accessibility issues
- `mobile_get_accessibility_score` - Get accessibility score (0-100)
- `mobile_find_accessibility_issues` - Find specific issues

**Status:** `"accessibility": true` ✅

---

### ✅ Bug Reports (~5 tools) - **USEFUL**

**Bug reporting and screenshot annotation:**

- `mobile_annotate_screenshot` - Add visual markers to screenshots
- `mobile_highlight_element` - Highlight specific element
- `mobile_mark_tap_points` - Mark tap points on screenshot
- `mobile_create_bug_report` - Create comprehensive bug report
- `mobile_create_quick_bug_report` - Quick bug report

**Status:** `"bug_reports": true` ✅

---

### ✅ Clipboard (~3 tools) - **USEFUL**

**Clipboard operations:**

- `mobile_get_clipboard` - Get clipboard content
- `mobile_set_clipboard` - Set clipboard content
- `mobile_clear_clipboard` - Clear clipboard

**Status:** `"clipboard": true` ✅

---

### ✅ Device Conditions (~8 tools) - **USEFUL**

**Simulate device conditions:**

- `mobile_set_battery_level` - Simulate battery level (Android only)
- `mobile_reset_battery` - Reset battery simulation
- `mobile_get_battery_status` - Get battery status
- `mobile_set_airplane_mode` - Enable/disable airplane mode
- `mobile_set_wifi` - Enable/disable WiFi
- `mobile_set_mobile_data` - Enable/disable mobile data
- `mobile_set_network_condition` - Simulate network conditions
- `mobile_set_geolocation` - Set GPS coordinates

**Status:** `"device_conditions": true` ✅

---

### ❌ Video Recording (4 tools) - **DISABLED BY DEFAULT**

**Record device screen:**

- `mobile_start_video_recording` - Start recording
- `mobile_stop_video_recording` - Stop and save
- `mobile_get_recording_status_video` - Check status
- `mobile_cancel_video_recording` - Cancel recording

**Status:** `"video_recording": false` ❌

**Why disabled:**
- Rarely used in AI-driven testing
- Can record manually if needed
- Adds overhead

**To enable:** Set `"video_recording": true`

---

### ❌ Performance Monitoring (3 tools) - **DISABLED BY DEFAULT**

**Monitor CPU/memory:**

- `mobile_start_performance_monitoring` - Start monitoring
- `mobile_stop_performance_monitoring` - Stop and get metrics
- `mobile_get_performance_status` - Check status

**Status:** `"performance_monitoring": false` ❌

**Why disabled:**
- Specialized use case
- Not needed for functional testing
- Better handled by dedicated tools (Android Profiler, Instruments)

**To enable:** Set `"performance_monitoring": true`

---

### ❌ Network Monitoring (6 tools) - **DISABLED BY DEFAULT**

**Capture HTTP/HTTPS requests:**

- `mobile_set_proxy` - Set HTTP proxy
- `mobile_clear_proxy` - Clear proxy
- `mobile_get_proxy` - Get proxy settings
- `mobile_network_start_monitoring` - Start capturing
- `mobile_network_stop_monitoring` - Stop capturing
- `mobile_network_get_requests` - Get captured requests
- `mobile_network_get_request_details` - Get request details
- `mobile_network_get_summary` - Get summary
- `mobile_network_clear` - Clear captured data

**Status:** `"network_monitoring": false` ❌

**Why disabled:**
- Requires proxy setup (mitmproxy/Charles)
- Complex setup for AI agents
- Better handled manually

**To enable:** Set `"network_monitoring": true`

---

### ❌ Flakiness Detection (5 tools) - **DISABLED BY DEFAULT**

**Track test flakiness:**

- `mobile_record_test_result` - Record test result
- `mobile_get_test_statistics` - Get test stats
- `mobile_get_flaky_tests` - Get flaky tests
- `mobile_get_test_summary` - Get test summary
- `mobile_clear_test_history` - Clear history

**Status:** `"flakiness_detection": false` ❌

**Why disabled:**
- Designed for CI/CD pipelines
- Not useful for ad-hoc AI testing
- Requires consistent test naming

**To enable:** Set `"flakiness_detection": true`

---

### ❌ Test Data Generation (9 tools) - **DISABLED BY DEFAULT**

**Generate random test data:**

- `mobile_generate_person` - Generate person data
- `mobile_generate_email` - Generate email
- `mobile_generate_phone` - Generate phone number
- `mobile_generate_address` - Generate address
- `mobile_generate_credit_card` - Generate test credit card
- `mobile_generate_password` - Generate password
- `mobile_generate_date` - Generate date
- `mobile_generate_text` - Generate lorem ipsum
- `mobile_generate_batch_data` - Generate batch data

**Status:** `"test_data_generation": false` ❌

**Why disabled:**
- AI can generate test data itself
- Adds 9 tools for limited benefit
- Simple data can be hardcoded

**To enable:** Set `"test_data_generation": true`

---

### ✅ Test Recording (~4 tools) - **USEFUL**

**Record and generate test code:**

- `mobile_start_recording` - Start recording actions
- `mobile_stop_recording` - Stop recording
- `mobile_get_recording_status` - Get recording status
- `mobile_generate_test_code` - Generate test code from recording

**Status:** `"test_recording": true` ✅

---

## Recommended Configurations

### Configuration 1: Lean Setup (Recommended) - **~78 tools**

**Best for:** AI-driven testing in Cursor IDE

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

**Total tools:** ~78 ✅ (under 80 limit)

---

### Configuration 2: Minimal Setup - **~50 tools**

**Best for:** Simple testing, maximum performance

```json
{
  "tools": {
    "core": true,
    "ai": true,
    "testing": true,
    "assertions": true,
    "visual_testing": false,
    "accessibility": false,
    "bug_reports": false,
    "test_recording": true,
    "batch_operations": true,
    "loading_detection": true,
    "clipboard": true,
    "device_conditions": false,
    "video_recording": false,
    "performance_monitoring": false,
    "network_monitoring": false,
    "flakiness_detection": false,
    "test_data_generation": false
  }
}
```

**Total tools:** ~50 ✅

---

### Configuration 3: Full Setup - **~106 tools**

**Best for:** Manual testing, advanced QA workflows

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
    "video_recording": true,
    "performance_monitoring": true,
    "network_monitoring": true,
    "flakiness_detection": true,
    "test_data_generation": true
  }
}
```

**Total tools:** ~106 ⚠️ (exceeds limit, but all features available)

---

## How to Apply Configuration

### Step 1: Create/Edit Configuration File

Create `mcp-config.json` in the root of `mobilepixel` project:

```bash
cd mobilepixel
notepad mcp-config.json  # Windows
# or
nano mcp-config.json     # Mac/Linux
```

### Step 2: Paste Configuration

Choose one of the recommended configurations above or customize your own.

### Step 3: Restart MCP Server

**Option A: Restart Cursor**
- Close and reopen Cursor IDE

**Option B: Reload Window**
- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- Type: "Developer: Reload Window"
- Press Enter

**Option C: Restart MCP Server (Cursor MCP Panel)**
- Open MCP Panel
- Find "mobilepixel" server
- Click "Restart"

### Step 4: Verify Tool Count

Open MCP Panel in Cursor and check the tool count:

```
✅ mobilepixel - 78 tools
```

---

## Troubleshooting

### Configuration Not Loading

**Problem:** Changes to `mcp-config.json` are not applied

**Solution:**
1. Check file location - must be in project root (same level as `package.json`)
2. Verify JSON syntax - use [JSONLint](https://jsonlint.com/) to validate
3. Restart Cursor completely (close all windows)
4. Check MCP logs in Cursor Output panel

---

### Tools Still Showing as Disabled

**Problem:** Enabled tools in config but still getting errors like "Tool not found"

**Solution:**
1. Rebuild the project: `npm run build`
2. Restart MCP server
3. Check that the tool category name is correct (case-sensitive)

---

### Want to Re-enable Disabled Tools

**Problem:** Need video recording or performance monitoring

**Solution:**
1. Edit `mcp-config.json`
2. Set desired category to `true`:
   ```json
   {
     "tools": {
       "video_recording": true,
       "performance_monitoring": true
     }
   }
   ```
3. Restart MCP server

---

## Default Behavior

If `mcp-config.json` **does not exist**, all tools are **enabled by default**.

This ensures backward compatibility with existing installations.

---

## Summary

| Configuration | Tool Count | Best For | Performance |
|--------------|-----------|----------|-------------|
| **Lean** (Recommended) | ~78 | AI testing in Cursor | ⚡⚡⚡ Fast |
| **Minimal** | ~50 | Simple testing | ⚡⚡⚡⚡ Very Fast |
| **Full** | ~106 | Advanced QA workflows | ⚡⚡ Slower |

**Recommendation:** Use **Lean Setup** for best experience with Cursor AI.

---

## Related Documentation

- [Quick Start Guide](QUICK_START_CURSOR.md) - Get started with MobilePixel MCP
- [MCP Server Setup](MCP_SERVER_SETUP.md) - Installation and configuration
- [AI Integration Guide](AI_INTEGRATION_GUIDE.md) - Using AI with mobile testing
- [AI Agent Instructions](AI_AGENT_INSTRUCTIONS.md) - Best practices for AI agents

---

## Questions?

If you have questions or need help:
- Check the [GitHub Issues](https://github.com/MrTrotskiy/mobilepixel/issues)
- Read the [documentation](https://github.com/MrTrotskiy/mobilepixel)

---

**Last Updated:** October 2025  
**MobilePixel MCP Version:** 1.0.0+


