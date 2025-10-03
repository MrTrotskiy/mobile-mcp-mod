# MobilePixel MCP - Tools Reference

**Complete list of all 94+ MCP tools**

---

## 📱 Tool Categories

### ✅ Core (20 tools) - ALWAYS ENABLED
`mobile_list_available_devices` `mobile_list_apps` `mobile_launch_app` `mobile_terminate_app` `mobile_get_screen_size` `mobile_click_on_screen_at_coordinates` `mobile_long_press_on_screen_at_coordinates` `mobile_list_elements_on_screen` `mobile_press_button` `mobile_open_url` `mobile_swipe_on_screen` `mobile_swipe_in_element` `mobile_type_keys` `mobile_take_screenshot` `mobile_save_screenshot` `mobile_set_orientation` `mobile_get_orientation` `mobile_get_app_logs` `mobile_get_crash_logs` `mobile_get_system_errors` `mobile_clear_app_logs`

### 🤖 AI Search (7 tools)
`mobile_find_element_by_description` `mobile_tap_element_by_description` `mobile_find_all_matching_elements` `mobile_hide_keyboard` `mobile_select_option_by_text` `mobile_ocr_screenshot` `mobile_find_text_by_ocr`

### 🧪 Testing (6 tools)
`mobile_get_session_summary` `mobile_get_test_actions` `mobile_get_test_logs` `mobile_clear_test_context`

### ✔️ Assertions (6 tools)
`mobile_expect_element_visible` `mobile_expect_element_not_visible` `mobile_expect_text_visible` `mobile_expect_text_not_visible` `mobile_expect_element_count` `mobile_expect_on_screen`

### 🎨 Visual Testing (4 tools)
`mobile_save_baseline` `mobile_compare_screenshot` `mobile_list_baselines` `mobile_delete_baseline`

### ♿ Accessibility (3 tools)
`mobile_check_accessibility` `mobile_get_accessibility_score` `mobile_find_accessibility_issues`

### 🐛 Bug Reports (3 tools)
`mobile_create_bug_report` `mobile_create_quick_bug_report` `mobile_annotate_screenshot` `mobile_highlight_element` `mobile_mark_tap_points`

### 🎬 Test Recording (5 tools)
`mobile_start_recording` `mobile_stop_recording` `mobile_get_recording_status` `mobile_generate_test_code` `mobile_clear_recording`

### 📦 Batch Operations (1 tool)
`mobile_batch_actions`

### ⏳ Loading Detection (2 tools)
`mobile_wait_for_loading` `mobile_wait_for_element_condition`

### 📋 Clipboard (3 tools)
`mobile_get_clipboard` `mobile_set_clipboard` `mobile_clear_clipboard`

### 📱 Device Conditions (8 tools)
`mobile_set_battery_level` `mobile_reset_battery` `mobile_get_battery_status` `mobile_set_airplane_mode` `mobile_set_wifi` `mobile_set_mobile_data` `mobile_set_network_condition` `mobile_set_geolocation`

### 🎥 Video Recording (2 tools)
`mobile_start_video_recording` `mobile_stop_video_recording`

### ⚡ Performance Monitoring (5 tools)
`mobile_start_performance_monitoring` `mobile_stop_performance_monitoring` `mobile_get_performance_metrics` `mobile_get_benchmark_results` `mobile_compare_performance`

### 🌐 Network Monitoring (4 tools)
`mobile_start_network_monitoring` `mobile_stop_network_monitoring` `mobile_get_network_traffic` `mobile_export_har`

### 🔍 Flakiness Detection (3 tools)
`mobile_mark_test_flaky` `mobile_get_flaky_tests` `mobile_analyze_test_stability`

### 📊 Test Data Generation (2 tools)
`mobile_generate_test_data` `mobile_generate_user_profiles`

### 🎯 Visual Touch Indicators (5 tools)
`mobile_enable_touch_indicators` `mobile_disable_touch_indicators` `mobile_toggle_touch_indicators` `mobile_get_touch_indicator_status` `mobile_enable_demo_mode`

### 📈 CI/CD Integration (2 tools)
`mobile_export_test_results` `mobile_create_test_report`

---

## ⚙️ Configure Tools

### Default Configuration

Create `mcp-config.json` in project root:

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

### Recommended for 80 Tools Limit

Disable these 5 categories:
- `video_recording: false` (saves 2 tools)
- `performance_monitoring: false` (saves 5 tools)
- `network_monitoring: false` (saves 4 tools)
- `flakiness_detection: false` (saves 3 tools)
- `test_data_generation: false` (saves 2 tools)

**Total**: ~94 tools → ~78 tools (within limit)

---

## 📝 Tool Details

### Core Tools

**Device Management:**
- `mobile_list_available_devices` - Find connected devices
- `mobile_list_apps` - Get installed apps
- `mobile_launch_app` - Start app
- `mobile_terminate_app` - Stop app
- `mobile_get_screen_size` - Screen dimensions

**Interaction:**
- `mobile_click_on_screen_at_coordinates` - Tap (x, y)
- `mobile_long_press_on_screen_at_coordinates` - Long press (x, y)
- `mobile_swipe_on_screen` - Swipe gesture
- `mobile_swipe_in_element` - Swipe inside element
- `mobile_type_keys` - Type text
- `mobile_press_button` - Hardware buttons (HOME, BACK)
- `mobile_open_url` - Open URL

**Inspection:**
- `mobile_list_elements_on_screen` - Get all UI elements
- `mobile_take_screenshot` - Capture screen
- `mobile_save_screenshot` - Save to file
- `mobile_set_orientation` - Portrait/landscape
- `mobile_get_orientation` - Get orientation

**Logs:**
- `mobile_get_app_logs` - App logs
- `mobile_get_crash_logs` - Crash reports
- `mobile_get_system_errors` - System errors
- `mobile_clear_app_logs` - Clear logs

### AI Search Tools

- `mobile_find_element_by_description` - Find by description ("blue button")
- `mobile_tap_element_by_description` - Find + tap
- `mobile_find_all_matching_elements` - Multiple matches
- `mobile_ocr_screenshot` - Read all text on screen (⚡ 3x faster)
- `mobile_find_text_by_ocr` - Find specific text
- `mobile_hide_keyboard` - Dismiss keyboard
- `mobile_select_option_by_text` - Select picker option

### Assertions

- `mobile_expect_element_visible` - Wait for element
- `mobile_expect_element_not_visible` - Wait for hide
- `mobile_expect_text_visible` - Text present
- `mobile_expect_text_not_visible` - Text absent
- `mobile_expect_element_count` - Count elements
- `mobile_expect_on_screen` - On specific screen

### Batch Operations

- `mobile_batch_actions` - Execute multiple actions atomically
  - Supports: launch_app, wait, tap, type, screenshot, expect
  - Auto-rollback on error
  - Screenshot on failure

### Loading Detection

- `mobile_wait_for_loading` - Wait for screen stability
- `mobile_wait_for_element_condition` - Wait for element state

### Visual Testing

- `mobile_save_baseline` - Save reference image
- `mobile_compare_screenshot` - Compare with baseline
- `mobile_list_baselines` - List saved baselines
- `mobile_delete_baseline` - Remove baseline

### Accessibility

- `mobile_check_accessibility` - WCAG 2.1 check
- `mobile_get_accessibility_score` - Score 0-100
- `mobile_find_accessibility_issues` - List issues

### Bug Reports

- `mobile_create_bug_report` - Full report (screenshot + logs + hierarchy)
- `mobile_create_quick_bug_report` - Quick report
- `mobile_annotate_screenshot` - Add annotations
- `mobile_highlight_element` - Highlight element
- `mobile_mark_tap_points` - Mark tap locations

### Device Conditions

- `mobile_set_battery_level` - Simulate battery
- `mobile_set_airplane_mode` - Toggle airplane mode
- `mobile_set_wifi` / `mobile_set_mobile_data` - Network control
- `mobile_set_network_condition` - Simulate network (offline/wifi/4g/3g/2g)
- `mobile_set_geolocation` - Set GPS location

### CI/CD Integration

- `mobile_export_test_results` - Export (JUnit/JSON/Markdown/TAP/GitHub)
- `mobile_create_test_report` - Generate report with metrics

---

## 🔄 Enable/Disable Categories

**Enable all**:
```json
{ "tools": { "core": true, "ai": true, ... } }
```

**Disable specific**:
```json
{ "tools": { "video_recording": false } }
```

**Restart Cursor** after changing config.

---

**See AI_BEST_PRACTICES.md for usage examples.**

