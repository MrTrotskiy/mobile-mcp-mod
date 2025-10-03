# AI Agent Guide - MobilePixel MCP

## 🎯 Main Rule

**❌ DON'T use visual coordinates → ✅ Use Accessibility API**

```javascript
// ❌ WRONG
await mobile_click_on_screen_at_coordinates(deviceId, 540, 1400)

// ✅ CORRECT
const elements = await mobile_list_elements_on_screen(deviceId)
const btn = elements.find(el => el.label === "Home")
const x = btn.rect.x + btn.rect.width / 2
const y = btn.rect.y + btn.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, x, y)
```

---

## 📱 MCP Capabilities (94+ tools)

**Basics:** devices, apps, launch, screenshot, elements, click, type, swipe, buttons
**AI Search:** find_element_by_description, tap_element_by_description
**OCR:** ocr_screenshot, find_text_by_ocr (⚡ 3x faster)
**Waiting:** wait_for_loading, wait_for_element_condition
**Batch:** batch_actions (atomic with rollback)
**Assertions:** expect_element_visible, expect_text_visible, expect_on_screen
**Logs:** get_app_logs, get_crash_logs, get_system_errors
**Bug Reports:** create_bug_report (screenshot + logs + hierarchy)
**Accessibility:** check_accessibility, get_accessibility_score
**Visual:** save_baseline, compare_screenshot
**Annotations:** annotate_screenshot, highlight_element, mark_tap_points
**Recording:** start/stop_recording, generate_test_code
**Device:** screen_size, orientation, clipboard
**Network:** airplane_mode, wifi, mobile_data, network_condition, battery_level
**Debug:** enable_touch_indicators, demo_mode, test_actions
**CI/CD:** export_test_results (JUnit/JSON/Markdown)

---

## 🚀 Workflow (4 steps)

```javascript
// 1. Get elements
const elements = await mobile_list_elements_on_screen(deviceId)

// 2. Find element (by label/text/identifier)
const btn = elements.find(el => el.label === "Home")

// 3. Calculate center
const x = btn.rect.x + btn.rect.width / 2
const y = btn.rect.y + btn.rect.height / 2

// 4. Click
await mobile_click_on_screen_at_coordinates(deviceId, x, y)
```

---

## 💡 Examples

### Navigation
```javascript
const els = await mobile_list_elements_on_screen(device)
const btn = els.find(el => el.label === "Home")
const x = btn.rect.x + btn.rect.width / 2
const y = btn.rect.y + btn.rect.height / 2
await mobile_click_on_screen_at_coordinates(device, x, y)
```

### Dialog (important: wait 500ms!)
```javascript
await new Promise(resolve => setTimeout(resolve, 500))
const els = await mobile_list_elements_on_screen(device)
const ok = els.find(el => el.text === "OK")
await mobile_click_on_screen_at_coordinates(device, 
  ok.rect.x + ok.rect.width / 2, 
  ok.rect.y + ok.rect.height / 2)
```

### Text Input
```javascript
const els = await mobile_list_elements_on_screen(device)
const field = els.find(el => el.identifier?.includes("email"))
await mobile_click_on_screen_at_coordinates(device, 
  field.rect.x + field.rect.width / 2, 
  field.rect.y + field.rect.height / 2)
await mobile_type_keys(device, "test@example.com", false)
```

### Batch Operations
```javascript
await mobile_batch_actions(device, {
  actions: [
    { type: "launch_app", params: { packageName: "com.app" } },
    { type: "wait", params: { timeMs: 2000 } },
    { type: "tap", params: { x: 540, y: 800 } },
    { type: "type", params: { text: "user@test.com" } }
  ],
  stopOnError: true
})
```

### Assertions
```javascript
await mobile_expect_element_visible(device, "Submit", 5000)
await mobile_expect_on_screen(device, "Login", 3000)
await mobile_expect_text_visible(device, "Welcome", 2000)
```

### OCR (when accessibility fails)
```javascript
const result = await mobile_find_text_by_ocr(device, "98")
await mobile_click_on_screen_at_coordinates(device, result.x, result.y)
```

### AI Search
```javascript
await mobile_tap_element_by_description(device, "blue login button")
```

---

## ⚠️ Common Errors

❌ **Visual coordinates** → Screenshot scaled, real y=2121 (not 1445!)
❌ **Click on edge** → Click center: `x + width/2`, `y + height/2`
❌ **Dialog not found** → Wait 500ms before `list_elements_on_screen()`

## 🔍 Debugging

**Element not found?** → Partial match: `el.label?.includes("home")`
**Click not working?** → `enable_touch_indicators()` → screenshot → see where clicked
**Not in accessibility tree?** → Use OCR or AI search

---

## ✅ 5 Rules

1. `mobile_list_elements_on_screen()` ALWAYS first
2. Calculate center: `x + width/2`, `y + height/2`
3. DON'T use visual coordinates
4. Check element found (not undefined)
5. For dialogs: wait 500ms
