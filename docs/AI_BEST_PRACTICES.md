# AI Agent Guide - MobilePixel MCP

**Краткий гайд: Как правильно тестировать мобильные приложения через MCP**

---

## 🎯 Главное правило

**НИКОГДА не используй визуальные координаты! Всегда используй Accessibility API.**

```javascript
// ❌ НЕПРАВИЛЬНО
await mobile_click_on_screen_at_coordinates(deviceId, 540, 1400)

// ✅ ПРАВИЛЬНО
const elements = await mobile_list_elements_on_screen(deviceId)
const button = elements.find(el => el.label === "Home")
const x = button.rect.x + button.rect.width / 2
const y = button.rect.y + button.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, x, y)
```

---

## 📱 Что умеет MobilePixel MCP (94+ инструмента)

### Базовые операции
- ✅ `mobile_list_available_devices` - список устройств
- ✅ `mobile_list_apps` - установленные приложения
- ✅ `mobile_launch_app` - запуск приложения
- ✅ `mobile_take_screenshot` - скриншот
- ✅ `mobile_list_elements_on_screen` - элементы на экране
- ✅ `mobile_click_on_screen_at_coordinates` - клик по координатам
- ✅ `mobile_type_keys` - ввод текста
- ✅ `mobile_swipe_on_screen` - свайп
- ✅ `mobile_press_button` - системные кнопки (HOME, BACK)

### Умный поиск элементов
- ✅ `mobile_find_element_by_description` - AI поиск по описанию
- ✅ `mobile_tap_element_by_description` - найти и кликнуть
- ✅ `mobile_find_all_matching_elements` - все совпадения

### OCR (распознавание текста)
- ✅ `mobile_ocr_screenshot` - весь текст на экране
- ✅ `mobile_find_text_by_ocr` - найти конкретный текст
- ⚡ Быстрый режим - 3x быстрее (500ms)

### Ожидание и синхронизация
- ✅ `mobile_wait_for_loading` - ждать загрузки (по стабильности экрана)
- ✅ `mobile_wait_for_element_condition` - ждать появления/исчезновения элемента

### Batch операции (атомарно)
- ✅ `mobile_batch_actions` - выполнить несколько действий подряд
- ✅ Автоматический скриншот при ошибке
- ✅ Откат при неудаче

### Проверки (assertions)
- ✅ `mobile_expect_element_visible` - элемент виден
- ✅ `mobile_expect_element_not_visible` - элемент скрыт
- ✅ `mobile_expect_text_visible` - текст виден
- ✅ `mobile_expect_on_screen` - на нужном экране

### Логи и диагностика
- ✅ `mobile_get_app_logs` - логи приложения
- ✅ `mobile_get_crash_logs` - краш-репорты
- ✅ `mobile_get_system_errors` - системные ошибки
- ✅ `mobile_clear_app_logs` - очистить логи

### Баг-репорты
- ✅ `mobile_create_bug_report` - полный отчет (скриншот, логи, иерархия)
- ✅ `mobile_create_quick_bug_report` - быстрый отчет
- ✅ Автоматический скриншот и метаданные

### Accessibility
- ✅ `mobile_check_accessibility` - проверка доступности (WCAG)
- ✅ `mobile_get_accessibility_score` - оценка 0-100
- ✅ `mobile_find_accessibility_issues` - конкретные проблемы

### Визуальное тестирование
- ✅ `mobile_save_baseline` - сохранить эталон
- ✅ `mobile_compare_screenshot` - сравнить с эталоном
- ✅ `mobile_list_baselines` - список эталонов

### Аннотации скриншотов
- ✅ `mobile_annotate_screenshot` - добавить разметку
- ✅ `mobile_highlight_element` - выделить элемент
- ✅ `mobile_mark_tap_points` - отметить точки касания

### Запись и тестирование
- ✅ `mobile_start_recording` / `mobile_stop_recording` - запись видео
- ✅ `mobile_generate_test_code` - генерация кода теста
- ✅ Запись действий для автотестов

### Устройство
- ✅ `mobile_get_screen_size` - размер экрана
- ✅ `mobile_set_orientation` - портрет/ландшафт
- ✅ `mobile_get_clipboard` / `mobile_set_clipboard` - буфер обмена

### Сеть и производительность
- ✅ `mobile_set_airplane_mode` - авиарежим
- ✅ `mobile_set_wifi` / `mobile_set_mobile_data` - сеть
- ✅ `mobile_set_network_condition` - симуляция сети
- ✅ `mobile_set_battery_level` - уровень батареи (тестирование)

### Отладка
- ✅ `mobile_enable_touch_indicators` - показать касания
- ✅ `mobile_enable_demo_mode` - режим демонстрации
- ✅ `mobile_get_test_actions` - история действий

### CI/CD интеграция
- ✅ `mobile_export_test_results` - экспорт (JUnit, JSON, Markdown)
- ✅ `mobile_create_test_report` - отчет с метриками
- ✅ Поддержка Jenkins, GitHub Actions

---

## 🚀 Пошаговый workflow (ВСЕГДА следуй этому!)

### Шаг 1: Получить элементы
```javascript
const elements = await mobile_list_elements_on_screen(deviceId)
```

### Шаг 2: Найти нужный элемент
```javascript
// По label
const homeBtn = elements.find(el => el.label === "Home")

// По text
const loginBtn = elements.find(el => el.text?.includes("Login"))

// По identifier
const emailField = elements.find(el => el.identifier?.includes("email"))
```

### Шаг 3: Вычислить центр
```javascript
const centerX = element.rect.x + element.rect.width / 2
const centerY = element.rect.y + element.rect.height / 2
```

### Шаг 4: Кликнуть
```javascript
await mobile_click_on_screen_at_coordinates(deviceId, centerX, centerY)
```

---

## 💡 Практические примеры

### Пример 1: Навигация
```javascript
// 1. Получить элементы
const elements = await mobile_list_elements_on_screen("843b3cd3")

// 2. Найти кнопку Home
const homeBtn = elements.find(el => el.label === "Home")
// homeBtn.rect = { x: 0, y: 2076, width: 216, height: 90 }

// 3. Вычислить центр
const x = 0 + 216/2 = 108
const y = 2076 + 90/2 = 2121

// 4. Кликнуть
await mobile_click_on_screen_at_coordinates("843b3cd3", 108, 2121)
```

### Пример 2: Закрыть диалог
```javascript
// 1. Подождать, пока диалог появится
await new Promise(resolve => setTimeout(resolve, 500))

// 2. Получить элементы
const elements = await mobile_list_elements_on_screen("843b3cd3")

// 3. Найти кнопку OK
const okBtn = elements.find(el => el.text === "OK")
// okBtn.rect = { x: 799, y: 1251, width: 176, height: 149 }

// 4. Кликнуть в центр
const x = 799 + 176/2 = 887
const y = 1251 + 149/2 = 1326
await mobile_click_on_screen_at_coordinates("843b3cd3", 887, 1326)
```

### Пример 3: Ввод текста
```javascript
// 1. Найти поле email
const elements = await mobile_list_elements_on_screen("843b3cd3")
const emailField = elements.find(el => 
  el.identifier?.toLowerCase().includes("email") ||
  el.label?.toLowerCase().includes("email")
)

// 2. Кликнуть в поле
const x = emailField.rect.x + emailField.rect.width / 2
const y = emailField.rect.y + emailField.rect.height / 2
await mobile_click_on_screen_at_coordinates("843b3cd3", x, y)

// 3. Ввести текст
await mobile_type_keys("843b3cd3", "test@example.com", false)
```

### Пример 4: Комплексный флоу (batch)
```javascript
await mobile_batch_actions("843b3cd3", {
  actions: [
    {
      type: "launch_app",
      params: { packageName: "com.example.app" }
    },
    {
      type: "wait",
      params: { timeMs: 2000 }
    },
    {
      type: "tap",
      params: { x: 540, y: 800 },
      description: "Tap login button"
    },
    {
      type: "type",
      params: { text: "user@test.com" }
    }
  ],
  stopOnError: true,
  takeScreenshotOnError: true
})
```

### Пример 5: Проверка элемента
```javascript
// Ждать появления кнопки Submit
await mobile_expect_element_visible("843b3cd3", "Submit", 5000)

// Проверить, что на экране логина
await mobile_expect_on_screen("843b3cd3", "Login", 3000)

// Проверить, что текст виден
await mobile_expect_text_visible("843b3cd3", "Welcome", 2000)
```

### Пример 6: Использование OCR
```javascript
// Найти текст "98" на экране (когда accessibility не работает)
const result = await mobile_find_text_by_ocr("843b3cd3", "98")
// result: { text: "98", coordinates: { x: 450, y: 600 }, confidence: 95% }

// Кликнуть по найденному тексту
await mobile_click_on_screen_at_coordinates("843b3cd3", 450, 600)
```

### Пример 7: AI поиск элемента
```javascript
// Когда не знаешь точный label/text
await mobile_tap_element_by_description("843b3cd3", "blue login button in center")

// Или найти сначала
const element = await mobile_find_element_by_description("843b3cd3", "settings icon")
// element: { x: 920, y: 45, confidence: 87% }
```

---

## ⚠️ Частые ошибки

### ❌ Ошибка 1: Визуальные координаты
```javascript
// Видишь на скриншоте кнопку Home внизу
await mobile_click_on_screen_at_coordinates("843b3cd3", 70, 1445) // НЕ РАБОТАЕТ!
```

**Почему не работает:**
- Скриншот масштабирован
- Реальные координаты: y=2121 (не 1445!)

### ❌ Ошибка 2: Клик по краю
```javascript
// Кликаешь на x=0 (левый край элемента)
await mobile_click_on_screen_at_coordinates("843b3cd3", 0, 2121) // Может не сработать
```

**Правильно:**
```javascript
// Клик в центр: x = 0 + 216/2 = 108
await mobile_click_on_screen_at_coordinates("843b3cd3", 108, 2121) // Работает!
```

### ❌ Ошибка 3: Диалог не найден
```javascript
// Диалог только что появился
const elements = await mobile_list_elements_on_screen("843b3cd3")
const okBtn = elements.find(el => el.text === "OK") // undefined!
```

**Правильно:**
```javascript
// Подождать 500ms, пока диалог появится в accessibility tree
await new Promise(resolve => setTimeout(resolve, 500))
const elements = await mobile_list_elements_on_screen("843b3cd3")
const okBtn = elements.find(el => el.text === "OK") // Найдено!
```

---

## 🎓 Чек-лист перед каждым действием

- [ ] Вызвал `mobile_list_elements_on_screen()`?
- [ ] Нашел элемент в результатах?
- [ ] Вычислил центр: `x + width/2`, `y + height/2`?
- [ ] НЕ использую визуальные координаты?
- [ ] Для диалогов подождал 500ms?

---

## 🔍 Debugging

### Проблема: Элемент не найден
**Решение:**
```javascript
// 1. Получить все элементы
const elements = await mobile_list_elements_on_screen(deviceId)

// 2. Вывести первые 5
console.log(elements.slice(0, 5))

// 3. Искать по частичному совпадению
const btn = elements.find(el => 
  el.label?.toLowerCase().includes("home") ||
  el.text?.toLowerCase().includes("home")
)
```

### Проблема: Клик не работает
**Решение:**
```javascript
// 1. Включить визуализацию касаний
await mobile_enable_touch_indicators(deviceId, true)

// 2. Кликнуть
await mobile_click_on_screen_at_coordinates(deviceId, x, y)

// 3. Сделать скриншот - увидишь где кликнул
await mobile_take_screenshot(deviceId)
```

### Проблема: Элемент не в accessibility tree
**Решение:**
```javascript
// Использовать OCR
const text = await mobile_find_text_by_ocr(deviceId, "Login")
await mobile_click_on_screen_at_coordinates(deviceId, text.x, text.y)

// Или AI поиск
await mobile_tap_element_by_description(deviceId, "login button")
```

---

## 📊 Типичные сценарии

### Сценарий 1: Тест логина
```javascript
// 1. Запустить приложение
await mobile_launch_app(deviceId, "com.example.app")

// 2. Подождать загрузки
await mobile_wait_for_loading(deviceId, { timeout: 5000 })

// 3. Найти и кликнуть email поле
const elements = await mobile_list_elements_on_screen(deviceId)
const emailField = elements.find(el => el.identifier?.includes("email"))
const emailX = emailField.rect.x + emailField.rect.width / 2
const emailY = emailField.rect.y + emailField.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, emailX, emailY)

// 4. Ввести email
await mobile_type_keys(deviceId, "test@example.com", false)

// 5. Кликнуть password поле
const pwdField = elements.find(el => el.identifier?.includes("password"))
const pwdX = pwdField.rect.x + pwdField.rect.width / 2
const pwdY = pwdField.rect.y + pwdField.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, pwdX, pwdY)

// 6. Ввести пароль
await mobile_type_keys(deviceId, "password123", false)

// 7. Найти и кликнуть Login
const loginBtn = elements.find(el => el.text?.includes("Login"))
const loginX = loginBtn.rect.x + loginBtn.rect.width / 2
const loginY = loginBtn.rect.y + loginBtn.rect.height / 2
await mobile_click_on_screen_at_coordinates(deviceId, loginX, loginY)

// 8. Проверить успех
await mobile_expect_text_visible(deviceId, "Welcome", 5000)
```

### Сценарий 2: Баг-репорт
```javascript
// При обнаружении бага
await mobile_create_bug_report(deviceId, {
  title: "Login button не работает",
  description: "Кнопка не реагирует на нажатия",
  severity: "high",
  stepsToReproduce: [
    "Открыть приложение",
    "Заполнить email и пароль",
    "Кликнуть Login",
    "Ничего не происходит"
  ],
  expectedBehavior: "Должен быть переход на главный экран",
  actualBehavior: "Ничего не происходит",
  packageName: "com.example.app",
  includeScreenshot: true,
  includeElementHierarchy: true,
  includeLogs: true
})
```

---

## ✅ Правила успеха

1. **Всегда** используй `mobile_list_elements_on_screen()`
2. **Всегда** вычисляй центр элемента
3. **Никогда** не используй визуальные координаты
4. **Всегда** проверяй, что элемент найден
5. **Для диалогов** жди 500ms перед чтением элементов

---

**Следуй этим правилам → Тесты будут работать стабильно! 🚀**

