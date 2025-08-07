# 🚀 Инструкция по развертыванию Estakaadi Planner

## Вариант 1: GitHub Pages (Рекомендуется)

### Пошаговая инструкция:

1. **Создать GitHub репозиторий:**
   - Зайти на [github.com](https://github.com)
   - Нажать "New repository"
   - Название: `estakaadi-planner`
   - Поставить галочку "Public"
   - Нажать "Create repository"

2. **Загрузить файлы:**
   ```bash
   git add .
   git commit -m "Initial commit: Estakaadi Planner"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/estakaadi-planner.git
   git push -u origin main
   ```

3. **Включить GitHub Pages:**
   - В репозитории перейти в Settings
   - Найти раздел "Pages" в левом меню
   - Source: "Deploy from a branch"
   - Branch: выбрать "main"
   - Folder: "/ (root)"
   - Нажать "Save"

4. **Получить ссылку:**
   - Ссылка будет: `https://YOUR_USERNAME.github.io/estakaadi-planner`
   - Приложение будет доступно через 5-10 минут

## Вариант 2: Netlify

1. **Создать ZIP архив** со всеми файлами проекта
2. Зайти на [netlify.com](https://netlify.com)
3. Перетащить ZIP файл в окно "Deploy"
4. Получить ссылку типа `https://random-name.netlify.app`

## Вариант 3: Vercel

1. Загрузить код в GitHub (как в варианте 1)
2. Зайти на [vercel.com](https://vercel.com)
3. Подключить GitHub репозиторий
4. Нажать "Deploy"
5. Получить ссылку типа `https://project-name.vercel.app`

## 🔧 Локальный сервер для разработки

```bash
# Python
python -m http.server 8000

# Node.js (если установлен)
npx serve .

# PHP (если установлен)
php -S localhost:8000
```

## 📱 Мобильная версия

Приложение автоматически адаптируется под мобильные устройства.

## 🔐 Безопасность

- Данные хранятся в LocalStorage браузера
- Каждый пользователь имеет доступ только к своим данным
- Администраторы могут управлять всеми данными

## 📊 База данных

Для продакшн версии рекомендуется:
- Firebase Firestore (бесплатно до 1GB)
- MongoDB Atlas (бесплатно до 512MB)
- Supabase (бесплатно с ограничениями)

## 🌐 Кастомный домен

После развертывания можно подключить собственный домен:
- GitHub Pages: Settings → Pages → Custom domain
- Netlify: Site settings → Domain management
- Vercel: Project settings → Domains
