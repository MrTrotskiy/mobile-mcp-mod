# AI Agent Guide - MobilePixel MCP

## 🎯 Главное правило

**❌ НЕ используй визуальные координаты → ✅ Используй Accessibility API**

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

## 📱 Возможности MCP (94+ инструмента)

**Базовые:** devices, apps, launch, screenshot, elements, click, type, swipe, buttons
**AI поиск:** find_element_by_description, tap_element_by_description
**OCR:** ocr_screenshot, find_text_by_ocr (⚡ 3x faster)
**Ожидание:** wait_for_loading, wait_for_element_condition
**Batch:** batch_actions (атомарно с откатом)
**Проверки:** expect_element_visible, expect_text_visible, expect_on_screen
**Логи:** get_app_logs, get_crash_logs, get_system_errors
**Баг-репорты:** create_bug_report (screenshot + logs + hierarchy)
**Accessibility:** check_accessibility, get_accessibility_score
**Визуальное:** save_baseline, compare_screenshot
**Аннотации:** annotate_screenshot, highlight_element, mark_tap_points
**Запись:** start/stop_recording, generate_test_code
**Устройство:** screen_size, orientation, clipboard
**Сеть:** airplane_mode, wifi, mobile_data, network_condition, battery_level
**Отладка:** enable_touch_indicators, demo_mode, test_actions
**CI/CD:** export_test_results (JUnit/JSON/Markdown)

---

## 🚀 Workflow (4 шага)

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

## 💡 Примеры

### Навигация
```javascript
const els = await mobile_list_elements_on_screen(device)
const btn = els.find(el => el.label === "Home")
const x = btn.rect.x + btn.rect.width / 2
const y = btn.rect.y + btn.rect.height / 2
await mobile_click_on_screen_at_coordinates(device, x, y)
```

### Диалог (важно: wait 500ms!)
```javascript
await new Promise(resolve => setTimeout(resolve, 500))
const els = await mobile_list_elements_on_screen(device)
const ok = els.find(el => el.text === "OK")
await mobile_click_on_screen_at_coordinates(device, 
  ok.rect.x + ok.rect.width / 2, 
  ok.rect.y + ok.rect.height / 2)
```

### Ввод текста
```javascript
const els = await mobile_list_elements_on_screen(device)
const field = els.find(el => el.identifier?.includes("email"))
await mobile_click_on_screen_at_coordinates(device, 
  field.rect.x + field.rect.width / 2, 
  field.rect.y + field.rect.height / 2)
await mobile_type_keys(device, "test@example.com", false)
```

### Batch операции
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

### Проверки
```javascript
await mobile_expect_element_visible(device, "Submit", 5000)
await mobile_expect_on_screen(device, "Login", 3000)
await mobile_expect_text_visible(device, "Welcome", 2000)
```

### OCR (когда accessibility не работает)
```javascript
const result = await mobile_find_text_by_ocr(device, "98")
await mobile_click_on_screen_at_coordinates(device, result.x, result.y)
```

### AI поиск
```javascript
await mobile_tap_element_by_description(device, "blue login button")
```

---

## ⚠️ Частые ошибки

❌ **Визуальные координаты** → Скриншот масштабирован, реальные y=2121 (не 1445!)
❌ **Клик по краю** → Кликать в центр: `x + width/2`, `y + height/2`
❌ **Диалог не найден** → Подождать 500ms перед `list_elements_on_screen()`

## 🔍 Debugging

**Элемент не найден?** → Искать по частичному: `el.label?.includes("home")`
**Клик не работает?** → `enable_touch_indicators()` → screenshot → смотреть где кликнул
**Не в accessibility tree?** → Использовать OCR или AI поиск

---

## ✅ 5 правил

1. `mobile_list_elements_on_screen()` ВСЕГДА первым
2. Вычислять центр: `x + width/2`, `y + height/2`
3. НЕ использовать визуальные координаты
4. Проверять что элемент найден (не undefined)
5. Для диалогов: wait 500ms
