# Централизованная система хранения данных

## Описание

Новая система хранения данных для Estakaadi Planner обеспечивает:

- 📦 **Централизованное хранение** - все данные в одном JSON файле
- 🔄 **Автоматическая синхронизация** - между вкладками браузера
- 💾 **Резервное копирование** - автоматическое создание бэкапов
- 🔒 **Контроль доступа** - разграничение прав пользователей
- 📊 **Логирование** - отслеживание всех изменений
- ⚡ **GitHub Pages совместимость** - работает на статических хостингах

## Структура данных

### Основной файл: `data/storage.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-08-07T00:00:00.000Z",
  "metadata": {
    "appName": "Estakaadi Planner",
    "storageFormat": "centralized",
    "backupCount": 0
  },
  "users": [...],
  "schedule": {...},
  "notes": {...},
  "gallery": {...},
  "companies": {...},
  "settings": {...},
  "logs": {...}
}
```

## API системы хранения

### Инициализация

```javascript
const storage = new DataStorage();
await storage.init();
```

### Основные операции

#### Получение данных
```javascript
// Получить все данные раздела
const notes = storage.get('notes');

// Получить конкретный элемент
const note = storage.get('notes', 'note_id_123');
```

#### Сохранение данных
```javascript
// Установить данные раздела
await storage.set('notes', notesArray, 'username');

// Добавить новый элемент
await storage.add('notes', newNote, 'username');

// Обновить существующий элемент
await storage.update('notes', 'note_id_123', updates, 'username');

// Удалить элемент
await storage.delete('notes', 'note_id_123', 'username');
```

#### Поиск и фильтрация
```javascript
// Поиск по тексту
const results = storage.search('notes', 'поисковый запрос');

// Фильтрация по условию
const filtered = storage.filter('notes', note => note.priority === 'high');

// Сортировка
const sorted = storage.sort('notes', (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
```

### События системы

```javascript
// Подписка на события
storage.on('dataLoaded', (data) => {
    console.log('Данные загружены');
});

storage.on('dataSaved', (data) => {
    console.log('Данные сохранены');
});

storage.on('dataChanged', ({section, data, userId}) => {
    console.log(`Изменен раздел: ${section}`);
});
```

## Разделы данных

### 1. Пользователи (`users`)
```json
{
  "id": "user_001",
  "username": "maksim",
  "role": "admin",
  "name": "Максим",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastLogin": null,
  "permissions": ["read", "write", "delete"]
}
```

### 2. Расписание (`schedule`)
```json
{
  "day": "monday",
  "dayName": "Понедельник",
  "companies": ["A. Le coq", "Coca-Cola"]
}
```

### 3. Заметки (`notes`)
```json
{
  "id": "note_001",
  "title": "Заголовок",
  "content": "Содержание заметки",
  "createdBy": "maksim",
  "createdAt": "2025-08-07T00:00:00.000Z"
}
```

### 4. Галерея (`gallery`)
```json
{
  "id": "photo_001",
  "filename": "example.jpg",
  "title": "Название фото",
  "category": "company",
  "company": "A. Le coq",
  "data": "data:image/jpeg;base64,/9j/4AAQ...",
  "size": 1024000,
  "createdBy": "maksim",
  "createdAt": "2025-08-07T00:00:00.000Z"
}
```

### 5. Компании (`companies`)
```json
{
  "id": "a_le_coq",
  "name": "A. Le coq",
  "displayName": "A. Le coq",
  "category": "beverages",
  "active": true,
  "instructionsPath": "img/instructions/brands/a-le-coq/",
  "photosPath": "img/A. Le coq/"
}
```

### 6. Настройки (`settings`)
```json
{
  "defaultLanguage": "ru",
  "theme": "light",
  "autoBackup": true,
  "maxStorageSize": 50
}
```

### 7. Журнал событий (`logs`)
```json
{
  "id": "log_001",
  "timestamp": "2025-08-07T00:00:00.000Z",
  "user": "maksim",
  "action": "data_update",
  "details": "Updated section: notes",
  "ipAddress": "127.0.0.1"
}
```

## Администрирование

### Экспорт данных
```javascript
await exportAllData(); // Скачивает JSON файл со всеми данными
```

### Импорт данных
```javascript
await importData(); // Загружает данные из JSON файла
```

### Очистка данных
```javascript
await clearAllData(); // Удаляет все данные (требует подтверждение)
```

### Статистика хранилища
```javascript
const stats = storage.getStorageStats();
console.log(stats.formattedSize); // "2.5 MB"
```

## Миграция данных

Система автоматически мигрирует данные из старых форматов:

1. **Заметки** - из `data/notes.json` и `localStorage['notes']`
2. **Расписание** - из `data/schedule.json`
3. **Галерея** - из `localStorage['gallery']`

## Совместимость с GitHub Pages

### Принцип работы:
1. **Чтение**: Сначала пытается загрузить `data/storage.json`
2. **Запись**: Сохраняет в `localStorage` (GitHub Pages - статический хостинг)
3. **Синхронизация**: Между вкладками через Storage Events
4. **Резервные копии**: Автоматически в `localStorage`

### Развертывание:
1. Загрузите файлы в репозиторий GitHub
2. Включите GitHub Pages
3. Система автоматически инициализируется

## Безопасность

### Контроль доступа:
- **Админы**: полный доступ ко всем данным
- **Пользователи**: ограниченный доступ к своим данным
- **Логирование**: все действия записываются в журнал

### Резервное копирование:
- **Автоматическое**: при каждом импорте данных
- **Ручное**: экспорт через админ панель
- **Локальное**: резервные копии в `localStorage`

## Производительность

### Оптимизации:
- **Ленивая загрузка**: данные загружаются по требованию
- **Кэширование**: минимизация обращений к хранилищу
- **Сжатие**: JSON минификация при сохранении
- **Пагинация**: для больших списков данных

### Ограничения:
- **localStorage**: ~5-10MB в зависимости от браузера
- **JSON файл**: рекомендуется до 50MB
- **Фотографии**: сжимаются в Base64 формат

## Мониторинг

### Метрики:
- Общий размер данных
- Количество элементов по разделам
- Частота обновлений
- Активность пользователей

### Уведомления:
- Предупреждения о превышении квот
- Ошибки синхронизации
- Успешные операции

## Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что localStorage доступен
3. Проверьте статистику хранилища в админ панели
4. Создайте резервную копию перед исправлениями
