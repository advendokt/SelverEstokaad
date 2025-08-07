// Estakaadi Planner - Main JavaScript File

// Global variables
let currentUser = null;
let currentLanguage = 'ru';
let translations = {};
let currentCalendarDate = new Date();
let selectedEventId = null;

// Storage adapter functions
async function getUsers() {
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        return storage.get('users') || [];
    }
    // Fallback to hardcoded users
    return [
        { id: "admin_001", username: "maksim", password: "123", role: "admin", name: "Максим" },
        { id: "admin_002", username: "admin", password: "321", role: "admin", name: "Администратор" },
        { id: "admin_003", username: "boss", password: "321", role: "admin", name: "Начальник" },
        { id: "admin_004", username: "dima", password: "456", role: "admin", name: "Дима" },
        { id: "user_001", username: "worker1", password: "111", role: "user", name: "Сотрудник 1" },
        { id: "user_002", username: "worker2", password: "222", role: "user", name: "Сотрудник 2" }
    ];
}

async function saveUser(userData) {
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        if (userData.id) {
            return await storage.update('users', userData.id, userData, currentUser?.username || 'system');
        } else {
            return await storage.add('users', userData, currentUser?.username || 'system');
        }
    }
    return false;
}

// Authentication functions
async function login(username, password, remember = false) {
    const users = await getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        
        // Store in session or local storage
        const storageType = remember ? localStorage : sessionStorage;
        storageType.setItem('currentUser', JSON.stringify(user));
        
        // Log login activity
        if (typeof storage !== 'undefined' && storage.isLoaded) {
            storage.addLog('user_login', `User ${username} logged in`, username);
        }
        
        return true;
    }
    
    return false;
}

function logout() {
    if (typeof storage !== 'undefined' && storage.isLoaded && currentUser) {
        storage.addLog('user_logout', `User ${currentUser.username} logged out`, currentUser.username);
    }
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function checkAuth() {
    // Check if user is logged in
    const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUserInterface();
        loadTranslations();
    } else {
        // Redirect to login if not authenticated and not on login page
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
}

function updateUserInterface() {
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.name;
        
        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        const adminTabItem = document.getElementById('admin-tab-item');
        
        if (currentUser.role === 'admin') {
            adminElements.forEach(el => el.style.display = 'block');
            if (adminTabItem) adminTabItem.style.display = 'block';
        } else {
            adminElements.forEach(el => el.style.display = 'none');
            if (adminTabItem) adminTabItem.style.display = 'none';
        }
    }
}

// Language functions
function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('currentLanguage', lang);
    loadTranslations();
}

async function loadTranslations() {
    try {
        // Load current language from storage
        const storedLang = localStorage.getItem('currentLanguage');
        if (storedLang) {
            currentLanguage = storedLang;
        }
        
        const response = await fetch(`lang/${currentLanguage}.json`);
        translations = await response.json();
        
        // Apply translations to the page
        applyTranslations();
        
        // Update language buttons
        updateLanguageButtons();
        
    } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to default language
        if (currentLanguage !== 'ru') {
            currentLanguage = 'ru';
            loadTranslations();
        }
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
    
    // Update page title
    if (translations.page_title) {
        document.title = translations.page_title;
    }
}

function updateLanguageButtons() {
    const ruBtn = document.getElementById('lang-ru');
    const eeBtn = document.getElementById('lang-ee');
    
    if (ruBtn && eeBtn) {
        ruBtn.classList.toggle('active', currentLanguage === 'ru');
        eeBtn.classList.toggle('active', currentLanguage === 'ee');
    }
}

// Navigation functions
function showTab(tabName) {
    const tab = document.getElementById(tabName + '-tab');
    if (tab) {
        const tabInstance = new bootstrap.Tab(tab);
        tabInstance.show();
    }
}

// Schedule functions
async function loadSchedule() {
    try {
        let scheduleData;
        
        // Try to load from new storage system
        if (typeof storage !== 'undefined' && storage.isLoaded) {
            scheduleData = storage.get('schedule');
        }
        
        // Fallback to old JSON file
        if (!scheduleData) {
            const response = await fetch('data/schedule.json');
            const jsonData = await response.json();
            scheduleData = jsonData.schedule || jsonData;
        }
        
        const tableBody = document.querySelector('#schedule-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            scheduleData.forEach(day => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${day.dayName || day.day}</strong></td>
                    <td>${day.companies.join(', ')}</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Update today's deliveries on dashboard
        updateTodayDeliveries({ schedule: scheduleData });
        
    } catch (error) {
        console.error('Error loading schedule:', error);
        // Show error message in schedule table if exists
        const tableBody = document.querySelector('#schedule-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="2" class="text-danger">Ошибка загрузки расписания</td></tr>';
        }
    }
}

// Dashboard functions
function loadDashboardData() {
    updateTodayDeliveries();
    loadWeekEvents();
    loadRecentNotes();
    loadRecentReturns();
    updatePackagingStats();
}

function loadWeekEvents() {
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    const container = document.getElementById('week-events');
    
    if (!container) return;
    
    // Get events for the next 7 days
    const today = new Date();
    const weekEvents = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayEvents = events.filter(event => event.date === dateStr);
        
        if (dayEvents.length > 0) {
            weekEvents.push({
                date: dateStr,
                dayName: date.toLocaleDateString('ru-RU', { weekday: 'long' }),
                events: dayEvents
            });
        }
    }
    
    if (weekEvents.length === 0) {
        container.innerHTML = `<p class="text-muted">${translations.dashboard_no_events || 'События на неделю не запланированы'}</p>`;
        return;
    }
    
    container.innerHTML = weekEvents.map(day => `
        <div class="mb-3">
            <h6 class="text-primary">${day.dayName} (${new Date(day.date).toLocaleDateString()})</h6>
            ${day.events.map(event => `
                <div class="d-flex align-items-center mb-1">
                    <span class="badge bg-${getEventColor(event.type)} me-2">${event.time || '—'}</span>
                    <small>${event.title}</small>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function loadRecentNotes() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const container = document.getElementById('recent-notes');
    
    if (!container) return;
    
    // Get last 3 notes
    const recentNotes = notes.slice(-3).reverse();
    
    if (recentNotes.length === 0) {
        container.innerHTML = `<p class="text-muted">${translations.dashboard_no_notes || 'Заметок пока нет'}</p>`;
        return;
    }
    
    container.innerHTML = recentNotes.map(note => `
        <div class="mb-2 p-2 border-start border-primary border-3">
            <div class="fw-bold small">${note.title || translations.note_no_title || 'Без названия'}</div>
            <div class="small text-muted">${note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content}</div>
            <div class="small text-muted">${note.user} - ${new Date(note.timestamp).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function loadRecentReturns() {
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    const tbody = document.getElementById('recent-returns-body');
    
    if (!tbody) return;
    
    // Get last 5 returns
    const recentReturns = returns.slice(-5).reverse();
    
    if (recentReturns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center">${translations.dashboard_no_returns || 'Возвратов пока нет'}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = recentReturns.map(returnItem => `
        <tr>
            <td>${new Date(returnItem.date).toLocaleDateString()}</td>
            <td>${returnItem.company}</td>
            <td>${returnItem.item}</td>
            <td>${returnItem.quantity}</td>
            <td><small>${returnItem.reason.length > 30 ? returnItem.reason.substring(0, 30) + '...' : returnItem.reason}</small></td>
        </tr>
    `).join('');
}

function getEventColor(type) {
    const colors = {
        'delivery': 'info',
        'meeting': 'warning',
        'maintenance': 'danger',
        'other': 'secondary'
    };
    return colors[type] || 'secondary';
}

// Company arrival functions
function toggleCompanyArrival(company) {
    const today = new Date().toISOString().split('T')[0];
    const arrivals = JSON.parse(localStorage.getItem('dailyArrivals') || '{}');
    
    if (!arrivals[today]) {
        arrivals[today] = [];
    }
    
    const companyIndex = arrivals[today].indexOf(company);
    
    if (companyIndex > -1) {
        // Company was marked as arrived, remove it (mark as not arrived)
        arrivals[today].splice(companyIndex, 1);
    } else {
        // Company was not arrived, add it (mark as arrived)
        arrivals[today].push(company);
        
        // Log the arrival
        logCompanyArrival(company);
    }
    
    localStorage.setItem('dailyArrivals', JSON.stringify(arrivals));
    
    // Refresh the display
    updateTodayDeliveries();
}

function logCompanyArrival(company) {
    // Log this event for admin tracking
    const logs = JSON.parse(localStorage.getItem('logs') || '[]');
    logs.push({
        action: translations.company_arrived || 'Компания прибыла',
        details: company,
        user: currentUser.username,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('logs', JSON.stringify(logs));
}

function getArrivedCompaniesCount() {
    const today = new Date().toISOString().split('T')[0];
    const arrivals = JSON.parse(localStorage.getItem('dailyArrivals') || '{}');
    return arrivals[today] ? arrivals[today].length : 0;
}

// Photo instructions functions
function showPackagingInstructions(company) {
    const modal = document.getElementById('instructionsModal') || createInstructionsModal();
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    
    modalTitle.textContent = `${translations.packaging_instructions || 'Инструкции по упаковке'} - ${company}`;
    
    // Load instructions for specific company
    const instructions = getPackagingInstructions(company);
    
    modalBody.innerHTML = `
        <div class="instruction-content animate-fade-in">
            <h6 class="animate-slide-up">${translations.pallets_info || 'Типы палет и подставок'}</h6>
            <div class="row mb-3">
                ${instructions.images.map((img, index) => `
                    <div class="col-md-6 mb-2 animate-fade-in animate-delay-${index + 1}">
                        <img src="${img.src}" class="img-fluid rounded instruction-image hover-lift" 
                             alt="${img.alt}" onclick="showFullImage('${img.src}', '${img.alt}')"
                             onerror="handleImageError(this, '${img.src}')">
                        <small class="d-block text-muted mt-1">${img.description}</small>
                    </div>
                `).join('')}
            </div>
            ${instructions.images.some(img => img.src.includes('.heic')) ? `
                <div class="alert alert-info alert-sm animate-slide-up">
                    <i class="bi bi-info-circle icon-pulse"></i> 
                    Некоторые фото в формате HEIC. Если они не отображаются, используйте современный браузер (Chrome 98+, Safari, Edge).
                </div>
            ` : ''}
            
            <h6 class="animate-slide-up" style="animation-delay: 0.3s;">${translations.packing_steps || 'Шаги упаковки палет'}</h6>
            <ol class="packing-steps">
                ${instructions.steps.map(step => `
                    <li class="mb-2">${step}</li>
                `).join('')}
            </ol>
            
            ${instructions.notes ? `
                <div class="alert alert-info animate-zoom-in" style="animation-delay: 0.5s;">
                    <i class="bi bi-info-circle"></i> ${instructions.notes}
                </div>
            ` : ''}
        </div>
    `;
    
    new bootstrap.Modal(modal).show();
}

function getPackagingInstructions(company) {
    // Default instructions structure - работа с палетами и подставками
    const defaultInstructions = {
        images: [
            {
                src: 'img/instructions/pallet-example.svg',
                alt: 'Типы палет',
                description: translations.pallet_types || 'Целые палеты, 1/2 и 1/4 палеты'
            },
            {
                src: 'img/instructions/drink-stands.svg', 
                alt: 'Подставки',
                description: translations.stands_types || 'Различные типы подставок'
            }
        ],
        steps: [
            translations.step_1 || '1. Определить тип палеты (целая, 1/2, 1/4)',
            translations.step_2 || '2. Проверить состояние палеты и подставок',
            translations.step_3 || '3. Разместить подставки согласно требованиям компании',
            translations.step_4 || '4. Закрепить упаковочной пленкой при необходимости',
            translations.step_5 || '5. Прикрепить этикетку с данными компании и типом палеты'
        ],
        notes: translations.packing_notes || 'Внимание: учитывайте размеры палет при размещении подставок'
    };
    
    // Специальные инструкции для разных компаний с фотопримерами
    const companyInstructions = {
        'ALE COQ': {
            ...defaultInstructions,
            images: [
                ...defaultInstructions.images,
                {
                    src: 'img/A. Le coq/converted/File 08.03.2025, 17 13 47 (1).jpg',
                    alt: 'A. Le Coq - Пример 1',
                    description: 'Пример упаковки A. Le Coq - основной способ'
                },
                {
                    src: 'img/A. Le coq/converted/File 08.03.2025, 17 13 47 (2).jpg',
                    alt: 'A. Le Coq - Пример 2',
                    description: 'Альтернативное размещение подставок'
                },
                {
                    src: 'img/A. Le coq/converted/IMG_1695.jpg',
                    alt: 'A. Le Coq - Пример 3',
                    description: 'Маркировка и этикетирование'
                }
            ]
        },
        'COCA-COLA': {
            ...defaultInstructions,
            images: [
                ...defaultInstructions.images,
                {
                    src: 'img/instructions/brands/coca-cola/wooden-base-1-4.jpg',
                    alt: 'Coca-Cola - Деревянная основа',
                    description: 'Деревянная основа для палет 1-4'
                },
                {
                    src: 'img/instructions/brands/coca-cola/packing-example-1.jpg',
                    alt: 'Coca-Cola - Пример 1',
                    description: 'Базовое размещение продукции'
                },
                {
                    src: 'img/instructions/brands/coca-cola/packing-example-2.jpg',
                    alt: 'Coca-Cola - Пример 2',
                    description: 'Способ укладки для стеклянных бутылок'
                }
            ]
        },
        'KAUPMEES': {
            ...defaultInstructions,
            images: [
                ...defaultInstructions.images,
                {
                    src: 'img/Kaupmees/converted/File 08.03.2025, 17 15 17 (1).jpg',
                    alt: 'Kaupmees - Пример 1',
                    description: 'Стандартная упаковка Kaupmees'
                },
                {
                    src: 'img/Kaupmees/converted/File 08.03.2025, 17 15 17 (2).jpg',
                    alt: 'Kaupmees - Пример 2',
                    description: 'Размещение этикеток и маркировка'
                }
            ]
        },
        'MOBEC': {
            ...defaultInstructions,
            images: [
                ...defaultInstructions.images,
                {
                    src: 'img/Mobec/converted/File 08.03.2025, 17 14 23.jpg',
                    alt: 'Mobec - Пример',
                    description: 'Упаковка продукции Mobec'
                }
            ]
        },
        'SMARTEN': {
            ...defaultInstructions,
            images: [
                ...defaultInstructions.images,
                {
                    src: 'img/Smarten/converted/File 08.03.2025, 17 09 30 (1).jpg',
                    alt: 'Smarten - Пример 1',
                    description: 'Упаковка продукции Smarten'
                },
                {
                    src: 'img/Smarten/converted/File 08.03.2025, 17 09 30 (2).jpg',
                    alt: 'Smarten - Пример 2',
                    description: 'Правильная маркировка'
                }
            ]
        },
        'SAKU': {
            ...defaultInstructions,
            images: [
                ...defaultInstructions.images,
                {
                    src: 'img/Saku/converted/File 08.03.2025, 17 17 36 (1).jpg',
                    alt: 'Saku - Пример 1',
                    description: 'Упаковка продукции Saku'
                },
                {
                    src: 'img/Saku/converted/File 08.03.2025, 17 17 36 (2).jpg',
                    alt: 'Saku - Пример 2',
                    description: 'Правильная маркировка Saku'
                },
                {
                    src: 'img/Saku/converted/File 08.03.2025, 17 17 36 (3).jpg',
                    alt: 'Saku - Пример 3',
                    description: 'Альтернативная упаковка'
                }
            ]
        },
        'Selver': {
            ...defaultInstructions,
            steps: [
                ...defaultInstructions.steps,
                translations.selver_special || 'Специальная маркировка для Selver'
            ]
        },
        'Rimi': {
            ...defaultInstructions,
            steps: [
                ...defaultInstructions.steps,
                translations.rimi_special || 'Использовать синие палеты для Rimi'
            ]
        }
    };
    
    return companyInstructions[company] || defaultInstructions;
}

function createInstructionsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'instructionsModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        ${translations.close || 'Закрыть'}
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function showFullImage(src, alt) {
    const modal = document.getElementById('imageModal') || createImageModal();
    const img = modal.querySelector('#fullImage');
    const caption = modal.querySelector('#imageCaption');
    
    img.src = src;
    img.alt = alt;
    caption.textContent = alt;
    
    new bootstrap.Modal(modal).show();
}

function handleImageError(imgElement, originalSrc) {
    // Replace broken image with placeholder
    imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPtCk0L7RgtC+INC90LUg0LfQsNCz0YDRg9C30LjQu9Cw0YHRjDwvdGV4dD48L3N2Zz4=';
    imgElement.alt = 'Фото не загрузилось';
    imgElement.title = `Не удалось загрузить: ${originalSrc}`;
    
    // Add error styling
    imgElement.style.border = '2px dashed #dc3545';
    imgElement.style.opacity = '0.7';
    
    // Show console error for debugging
    console.error('Failed to load image:', originalSrc);
}

function createImageModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'imageModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${translations.photo_instruction || 'Фотоинструкция'}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <img id="fullImage" class="img-fluid" alt="">
                    <p id="imageCaption" class="mt-2 text-muted"></p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function editSchedule() {
    if (currentUser.role !== 'admin') {
        alert('Нет прав для редактирования');
        return;
    }
    
    alert('Функция редактирования расписания будет добавлена в следующей версии');
}

function updateTodayDeliveries(scheduleData = null) {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['pühapäev', 'esmaspäev', 'teisipäev', 'kolmapäev', 'neljapäev', 'reede', 'laupäev'];
    const todayName = dayNames[today];
    
    console.log('Today is:', today, todayName); // Debug
    
    // If no scheduleData provided, try to get it from a global variable or fetch it
    if (!scheduleData) {
        // Try to get from localStorage cache or fetch
        const cachedSchedule = localStorage.getItem('scheduleCache');
        if (cachedSchedule) {
            scheduleData = JSON.parse(cachedSchedule);
        } else {
            // Fetch schedule data
            fetch('data/schedule.json')
                .then(response => response.json())
                .then(data => {
                    localStorage.setItem('scheduleCache', JSON.stringify(data));
                    updateTodayDeliveries(data);
                })
                .catch(error => console.error('Error fetching schedule:', error));
            return;
        }
    }
    
    const todaySchedule = scheduleData.schedule.find(day => {
        console.log('Checking day:', day.day_short, 'against', todayName); // Debug
        return day.day_short === todayName;
    });
    
    const container = document.getElementById('today-deliveries');
    
    if (container) {
        if (todaySchedule) {
            // Get today's arrivals from localStorage
            const today = new Date().toISOString().split('T')[0];
            const arrivals = JSON.parse(localStorage.getItem('dailyArrivals') || '{}');
            const todayArrivals = arrivals[today] || [];
            
            container.innerHTML = `
                <h6 class="animate-fade-in">${translations.dashboard_today_companies || 'Компании сегодня'}:</h6>
                <div class="d-flex flex-wrap gap-1 mb-3">
                    ${todaySchedule.companies.map((company, index) => {
                        const hasArrived = todayArrivals.includes(company);
                        return `
                            <span class="badge company-arrival hover-scale animate-fade-in animate-delay-${index + 1} ${hasArrived ? 'bg-success' : 'bg-primary'}" 
                                  onclick="toggleCompanyArrival('${company}')" 
                                  style="cursor: pointer; animation-delay: ${index * 0.1}s;" 
                                  title="${hasArrived ? 'Прибыл' : 'Ожидается'}">${company}</span>
                        `;
                    }).join('')}
                </div>
                <small class="text-muted animate-slide-up" style="animation-delay: 0.5s;">
                    <i class="bi bi-info-circle icon-pulse"></i> ${translations.click_to_mark_arrived || 'Нажмите на компанию чтобы отметить прибытие'}
                </small>
            `;
        } else {
            container.innerHTML = `<p class="text-muted">${translations.dashboard_no_deliveries || 'Сегодня поставок нет'} (${todayName})</p>`;
        }
    }
}

// Packaging functions
function initPackagingForm() {
    const form = document.getElementById('packaging-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addPackaging();
        });
        
        // Set today's date as default
        const dateInput = document.getElementById('packaging-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        // Load companies for the select
        loadCompaniesForSelect('packaging-company');
        
        // Add event listener for company select to enable/disable instructions button
        const companySelect = document.getElementById('packaging-company');
        if (companySelect) {
            companySelect.addEventListener('change', updateInstructionsButton);
        }
        
        // Add initial packaging item
        addPackagingItem();
        
        // Load existing packaging data
        loadPackagingData();
        
        // Initialize instructions button state
        updateInstructionsButton();
    }
}

let packagingItemCounter = 0;

function addPackagingItem() {
    packagingItemCounter++;
    const container = document.getElementById('packaging-items-container');
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'packaging-item-row border rounded p-3 mb-3';
    itemDiv.id = `packaging-item-${packagingItemCounter}`;
    
    itemDiv.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <label class="form-label" data-translate="packaging_item_type">Тип</label>
                <select class="form-select packaging-item-type" required>
                    <option value="" data-translate="select_item_type">Выберите тип</option>
                    <option value="whole_pallet" data-translate="whole_pallet">Целая палета</option>
                    <option value="half_pallet" data-translate="half_pallet">Половинка (1/2)</option>
                    <option value="quarter_pallet" data-translate="quarter_pallet">Четвертинка (1/4)</option>
                    <option value="drink_stand" data-translate="drink_stand">Подставка для напитков</option>
                    <option value="display_stand" data-translate="display_stand">Выставочная подставка</option>
                    <option value="other_stand" data-translate="other_stand">Другая подставка</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label" data-translate="packaging_number">Номер</label>
                <input type="text" class="form-control packaging-item-number" placeholder="${translations.item_number_placeholder || 'напр. A-1, B-2'}" required>
            </div>
            <div class="col-md-3">
                <label class="form-label" data-translate="packaging_quantity">Количество</label>
                <input type="number" class="form-control packaging-item-quantity" min="1" required>
            </div>
            <div class="col-md-2 d-flex align-items-end">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="removePackagingItem(${packagingItemCounter})" ${packagingItemCounter === 1 ? 'style="display:none"' : ''}>
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(itemDiv);
    
    // Apply translations to new elements
    applyTranslations();
}

function removePackagingItem(itemId) {
    const item = document.getElementById(`packaging-item-${itemId}`);
    if (item) {
        item.remove();
    }
    
    // Show first remove button if there are multiple items
    const container = document.getElementById('packaging-items-container');
    const items = container.querySelectorAll('.packaging-item-row');
    if (items.length > 1) {
        const firstRemoveBtn = items[0].querySelector('button');
        if (firstRemoveBtn) {
            firstRemoveBtn.style.display = 'block';
        }
    }
}

function addPackaging() {
    const company = document.getElementById('packaging-company').value;
    const date = document.getElementById('packaging-date').value;
    const notes = document.getElementById('packaging-notes').value;
    const container = document.getElementById('packaging-items-container');
    const itemRows = container.querySelectorAll('.packaging-item-row');
    
    // Collect all packaging items
    const items = [];
    let isValid = true;
    
    itemRows.forEach(row => {
        const typeSelect = row.querySelector('.packaging-item-type');
        const type = typeSelect.value;
        const typeDisplayName = typeSelect.options[typeSelect.selectedIndex].text;
        const number = row.querySelector('.packaging-item-number').value.trim();
        const quantity = row.querySelector('.packaging-item-quantity').value;
        
        if (type && number && quantity) {
            items.push({
                type: typeDisplayName, // Store display name
                typeValue: type, // Store value for processing  
                number: number,
                quantity: parseInt(quantity)
            });
        } else {
            isValid = false;
        }
    });
    
    if (!company || !date || !isValid || items.length === 0) {
        alert(translations.form_required_fields || 'Заполните все обязательные поля');
        return;
    }
    
    const packagingData = {
        company,
        items: items,
        date,
        notes,
        user: currentUser.username,
        timestamp: new Date().toISOString()
    };
    
    let packagings = JSON.parse(localStorage.getItem('packagings') || '[]');
    
    if (currentEditingPackagingId) {
        // Update existing packaging
        const index = packagings.findIndex(p => p.id === currentEditingPackagingId);
        if (index !== -1) {
            packagingData.id = currentEditingPackagingId;
            packagings[index] = packagingData;
            alert(translations.packaging_updated || 'Упаковка обновлена');
        }
        currentEditingPackagingId = null;
    } else {
        // Create new packaging
        packagingData.id = Date.now();
        packagings.push(packagingData);
        alert(translations.packaging_saved || 'Упаковка сохранена');
    }
    
    localStorage.setItem('packagings', JSON.stringify(packagings));
    
    // Show success animation and notification
    const form = document.getElementById('packaging-form');
    showSuccessAnimation(form);
    
    if (currentEditingPackagingId) {
        createFloatingNotification(translations.packaging_updated || 'Упаковка обновлена', 'success');
        currentEditingPackagingId = null;
    } else {
        createFloatingNotification(translations.packaging_saved || 'Упаковка сохранена', 'success');
    }
    
    // Reset form
    resetPackagingForm();
    
    // Refresh packaging display
    loadPackagingData();
    updatePackagingStats();
}

function resetPackagingForm() {
    document.getElementById('packaging-form').reset();
    document.getElementById('packaging-date').valueAsDate = new Date();
    
    // Reset items container and add one initial item
    const itemsContainer = document.getElementById('packaging-items-container');
    itemsContainer.innerHTML = '';
    packagingItemCounter = 0;
    addPackagingItem();
    
    // Reset button text
    const submitBtn = document.querySelector('#packaging-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="bi bi-plus"></i> ${translations.add_packaging || 'Добавить упаковку'}`;
    }
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    updateInstructionsButton(); // Reset instructions button
}

function loadPackagingData() {
    const packagings = JSON.parse(localStorage.getItem('packagings') || '[]');
    const container = document.getElementById('packaging-history');
    
    if (!container) return;
    
    if (packagings.length === 0) {
        container.innerHTML = `<p class="text-muted">${translations.no_packaging_data || 'Нет данных об упаковке'}</p>`;
        return;
    }
    
    // Sort by date (newest first)
    packagings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let html = '<div class="row">';
    
    packagings.forEach(packaging => {
        const date = new Date(packaging.timestamp);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString();
        
        // Create items list
        let itemsList = '';
        if (packaging.items && packaging.items.length > 0) {
            itemsList = packaging.items.map(item => 
                `<li><strong>${item.type}</strong> №${item.number} - ${item.quantity} шт.</li>`
            ).join('');
        } else {
            // Handle old format (single item)
            itemsList = `<li><strong>${packaging.item || packaging.itemType}</strong> - ${packaging.quantity} шт.</li>`;
        }
        
        html += `
            <div class="col-md-6 mb-3 animate-fade-in" style="animation-delay: ${packaging.id % 10 * 0.1}s;">
                <div class="card card-animated hover-lift">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${packaging.company}</h6>
                            <div class="btn-group btn-group-sm">
                                ${(currentUser.role === 'admin' || packaging.user === currentUser.username) ? `
                                    <button class="btn btn-outline-primary btn-sm btn-animated hover-glow" onclick="editPackaging(${packaging.id})" title="${translations.edit || 'Редактировать'}">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm btn-animated hover-scale" onclick="deletePackaging(${packaging.id})" title="${translations.delete || 'Удалить'}">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <ul class="list-unstyled mb-2">
                            ${itemsList}
                        </ul>
                        ${packaging.notes ? `<p class="card-text"><small>${packaging.notes}</small></p>` : ''}
                        <small class="text-muted">
                            ${formattedDate} ${formattedTime} - ${packaging.user}
                        </small>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function editPackaging(packagingId) {
    const packagings = JSON.parse(localStorage.getItem('packagings') || '[]');
    const packaging = packagings.find(p => p.id === packagingId);
    
    if (!packaging) {
        alert(translations.packaging_not_found || 'Запись упаковки не найдена');
        return;
    }
    
    // Check permissions
    if (currentUser.role !== 'admin' && packaging.user !== currentUser.username) {
        alert(translations.no_edit_permission || 'Нет прав для редактирования');
        return;
    }
    
    // Switch to packaging tab
    showTab('packaging');
    
    // Fill form with existing data
    document.getElementById('packaging-company').value = packaging.company;
    document.getElementById('packaging-date').value = packaging.date;
    document.getElementById('packaging-notes').value = packaging.notes || '';
    
    // Clear existing items and add packaging items
    const itemsContainer = document.getElementById('packaging-items-container');
    itemsContainer.innerHTML = '';
    packagingItemCounter = 0;
    
    if (packaging.items && packaging.items.length > 0) {
        // New format with multiple items
        packaging.items.forEach(item => {
            addPackagingItem();
            const lastItem = itemsContainer.lastElementChild;
            lastItem.querySelector('.packaging-item-type').value = item.typeValue || getItemTypeValue(item.type);
            lastItem.querySelector('.packaging-item-number').value = item.number;
            lastItem.querySelector('.packaging-item-quantity').value = item.quantity;
        });
    } else {
        // Old format with single item
        addPackagingItem();
        const lastItem = itemsContainer.lastElementChild;
        lastItem.querySelector('.packaging-item-type').value = packaging.itemType || getItemTypeValue(packaging.item);
        lastItem.querySelector('.packaging-item-number').value = '1';
        lastItem.querySelector('.packaging-item-quantity').value = packaging.quantity;
    }
    
    // Store the ID for updating instead of creating new
    currentEditingPackagingId = packagingId;
    
    // Change button text
    const submitBtn = document.querySelector('#packaging-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="bi bi-check"></i> ${translations.update || 'Обновить'}`;
    }
    
    // Show cancel button
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'block';
    }
}

function cancelPackagingEdit() {
    currentEditingPackagingId = null;
    resetPackagingForm();
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

function getItemTypeValue(displayName) {
    const typeMap = {
        'Целая палета': 'whole_pallet',
        'Половинка (1/2)': 'half_pallet', 
        'Четвертинка (1/4)': 'quarter_pallet',
        'Подставка для напитков': 'drink_stand',
        'Выставочная подставка': 'display_stand',
        'Другая подставка': 'other_stand'
    };
    return typeMap[displayName] || 'other_stand';
}

function deletePackaging(packagingId) {
    const packagings = JSON.parse(localStorage.getItem('packagings') || '[]');
    const packaging = packagings.find(p => p.id === packagingId);
    
    if (!packaging) {
        alert(translations.packaging_not_found || 'Запись упаковки не найдена');
        return;
    }
    
    // Check permissions
    if (currentUser.role !== 'admin' && packaging.user !== currentUser.username) {
        alert(translations.no_edit_permission || 'Нет прав для редактирования');
        return;
    }
    
    if (confirm(translations.confirm_delete_packaging || 'Удалить эту запись упаковки?')) {
        const updatedPackagings = packagings.filter(p => p.id !== packagingId);
        localStorage.setItem('packagings', JSON.stringify(updatedPackagings));
        
        alert(translations.packaging_deleted || 'Запись упаковки удалена');
        loadPackagingData();
        updatePackagingStats();
    }
}

let currentEditingPackagingId = null;

function updateInstructionsButton() {
    const companySelect = document.getElementById('packaging-company');
    const instructionsBtn = document.getElementById('show-instructions-btn');
    
    if (companySelect && instructionsBtn) {
        instructionsBtn.disabled = !companySelect.value;
    }
}

function showPackagingInstructionsForSelected() {
    const companySelect = document.getElementById('packaging-company');
    if (companySelect && companySelect.value) {
        showPackagingInstructions(companySelect.value);
    }
}

// Returns functions
function initReturnsForm() {
    const form = document.getElementById('returns-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addReturn();
        });
        
        // Set today's date as default
        const dateInput = document.getElementById('returns-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        // Load companies for the select
        loadCompaniesForSelect('returns-company');
    }
}

function addReturn() {
    const company = document.getElementById('returns-company').value;
    const item = document.getElementById('returns-item').value;
    const quantity = document.getElementById('returns-quantity').value;
    const date = document.getElementById('returns-date').value;
    const reason = document.getElementById('returns-reason').value;
    
    if (!company || !item || !quantity || !date || !reason) {
        alert(translations.form_required_fields || 'Заполните все обязательные поля');
        return;
    }
    
    // Get display name for the item type
    const itemSelect = document.getElementById('returns-item');
    const itemDisplayName = itemSelect.options[itemSelect.selectedIndex].text;
    
    const returnItem = {
        id: Date.now(),
        company,
        item: itemDisplayName, // Store display name
        itemType: item, // Store value for processing
        quantity: parseInt(quantity),
        date,
        reason,
        user: currentUser.username,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    returns.push(returnItem);
    localStorage.setItem('returns', JSON.stringify(returns));
    
    // Reset form
    document.getElementById('returns-form').reset();
    document.getElementById('returns-date').valueAsDate = new Date();
    updateReturnsInstructionsButton(); // Reset instructions button
    
    alert(translations.return_saved || 'Возврат сохранен');
    loadDashboardData(); // Update dashboard
}

function updateReturnsInstructionsButton() {
    const companySelect = document.getElementById('returns-company');
    const instructionsBtn = document.getElementById('show-returns-instructions-btn');
    
    if (companySelect && instructionsBtn) {
        instructionsBtn.disabled = !companySelect.value;
    }
}

function showReturnsInstructionsForSelected() {
    const companySelect = document.getElementById('returns-company');
    if (companySelect && companySelect.value) {
        showReturnsInstructions(companySelect.value);
    }
}

function showReturnsInstructions(company) {
    const modal = document.getElementById('instructionsModal') || createInstructionsModal();
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    
    modalTitle.textContent = `${translations.returns_instructions || 'Инструкции по возвратам'} - ${company}`;
    
    // Load returns instructions for specific company
    const instructions = getReturnsInstructions(company);
    
    modalBody.innerHTML = `
        <div class="instruction-content">
            <h6>${translations.returns_process || 'Процесс оформления возврата'}</h6>
            <div class="row mb-3">
                ${instructions.images.map(img => `
                    <div class="col-md-6 mb-2">
                        <img src="${img.src}" class="img-fluid rounded instruction-image" 
                             alt="${img.alt}" onclick="showFullImage('${img.src}', '${img.alt}')">
                        <small class="d-block text-muted mt-1">${img.description}</small>
                    </div>
                `).join('')}
            </div>
            
            <h6>${translations.returns_steps || 'Шаги оформления возврата'}</h6>
            <ol class="returns-steps">
                ${instructions.steps.map(step => `
                    <li class="mb-2">${step}</li>
                `).join('')}
            </ol>
            
            ${instructions.notes ? `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> ${instructions.notes}
                </div>
            ` : ''}
        </div>
    `;
    
    new bootstrap.Modal(modal).show();
}

function getReturnsInstructions(company) {
    // Default returns instructions structure
    const defaultInstructions = {
        images: [
            {
                src: 'img/instructions/return-pallet.svg',
                alt: 'Возвратная палета',
                description: translations.return_pallet_desc || 'Пример оформления возвратной палеты'
            },
            {
                src: 'img/instructions/return-labels.svg', 
                alt: 'Этикетки возврата',
                description: translations.return_labels_desc || 'Правильное размещение этикеток'
            }
        ],
        steps: [
            translations.return_step_1 || '1. Проверить состояние товара и причину возврата',
            translations.return_step_2 || '2. Заполнить форму возврата с указанием причины',
            translations.return_step_3 || '3. Разместить товар на возвратной палете',
            translations.return_step_4 || '4. Прикрепить этикетку возврата к палете',
            translations.return_step_5 || '5. Сфотографировать товар для документации'
        ],
        notes: translations.returns_warning || 'Внимание: проверьте сроки возврата для каждой компании'
    };
    
    // Специальные инструкции для разных компаний
    const companyInstructions = {
        'Selver': {
            ...defaultInstructions,
            steps: [
                ...defaultInstructions.steps,
                translations.selver_return_special || 'Уведомить менеджера Selver о возврате'
            ]
        },
        'Rimi': {
            ...defaultInstructions,
            steps: [
                ...defaultInstructions.steps,
                translations.rimi_return_special || 'Использовать специальные этикетки Rimi'
            ]
        }
    };
    
    return companyInstructions[company] || defaultInstructions;
}

// Notes functions
async function loadNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;
    
    let notes = [];
    
    // Try to load from new storage system
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        notes = storage.get('notes') || [];
    } else {
        // Fallback to localStorage
        notes = JSON.parse(localStorage.getItem('notes') || '[]');
    }
    
    if (notes.length === 0) {
        container.innerHTML = `<p class="text-muted">${translations.no_notes || 'Заметок пока нет'}</p>`;
        return;
    }
    
    container.innerHTML = notes.map(note => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="card-title">${note.title || translations.note_no_title || 'Без названия'}</h6>
                        <p class="card-text">${note.content}</p>
                        <small class="text-muted">
                            ${note.user || note.createdBy} - ${new Date(note.timestamp || note.createdAt).toLocaleString()}
                        </small>
                    </div>
                    <div>
                        ${(currentUser.role === 'admin' || currentUser.username === (note.user || note.createdBy)) ? `
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editNote('${note.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteNote('${note.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function addNote() {
    const title = prompt(translations.note_title_prompt || 'Введите заголовок заметки:');
    if (!title) return;
    
    const content = prompt(translations.note_content_prompt || 'Введите текст заметки:');
    if (!content) return;
    
    const note = {
        title,
        content,
        user: currentUser.username // Keep for compatibility
    };
    
    // Try to save to new storage system first
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        await storage.add('notes', note, currentUser.username);
    } else {
        // Fallback to localStorage
        note.id = Date.now();
        note.timestamp = new Date().toISOString();
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push(note);
        localStorage.setItem('notes', JSON.stringify(notes));
    }
    
    loadNotes();
    loadDashboardData(); // Update dashboard
}

async function editNote(noteId) {
    let notes, note;
    
    // Try to get from new storage system first
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        notes = storage.get('notes') || [];
        note = notes.find(n => n.id === noteId);
    } else {
        // Fallback to localStorage
        notes = JSON.parse(localStorage.getItem('notes') || '[]');
        note = notes.find(n => n.id == noteId);
    }
    
    if (!note) return;
    
    // Check permissions
    const noteUser = note.user || note.createdBy;
    if (currentUser.role !== 'admin' && currentUser.username !== noteUser) {
        alert(translations.no_permission || 'Нет прав для редактирования');
        return;
    }
    
    const newTitle = prompt(translations.note_title_prompt || 'Введите заголовок заметки:', note.title);
    if (newTitle === null) return;
    
    const newContent = prompt(translations.note_content_prompt || 'Введите текст заметки:', note.content);
    if (newContent === null) return;
    
    const updates = {
        title: newTitle,
        content: newContent,
        editedBy: currentUser.username,
        editedAt: new Date().toISOString()
    };
    
    // Try to save to new storage system first
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        await storage.update('notes', noteId, updates, currentUser.username);
    } else {
        // Fallback to localStorage
        Object.assign(note, updates);
        localStorage.setItem('notes', JSON.stringify(notes));
    }
    
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
    loadDashboardData(); // Update dashboard
}

async function deleteNote(noteId) {
    if (!confirm(translations.confirm_delete_note || 'Удалить заметку?')) return;
    
    let notes, note;
    
    // Try to get from new storage system first
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        notes = storage.get('notes') || [];
        note = notes.find(n => n.id === noteId);
    } else {
        // Fallback to localStorage
        notes = JSON.parse(localStorage.getItem('notes') || '[]');
        note = notes.find(n => n.id == noteId);
    }
    
    if (!note) return;
    
    // Check permissions
    const noteUser = note.user || note.createdBy;
    if (currentUser.role !== 'admin' && currentUser.username !== noteUser) {
        alert(translations.no_permission || 'Нет прав для удаления');
        return;
    }
    
    // Try to delete from new storage system first
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        await storage.delete('notes', noteId, currentUser.username);
    } else {
        // Fallback to localStorage
        const noteIndex = notes.findIndex(n => n.id == noteId);
        if (noteIndex !== -1) {
            notes.splice(noteIndex, 1);
            localStorage.setItem('notes', JSON.stringify(notes));
        }
    }
    
    loadNotes();
    loadDashboardData(); // Update dashboard
}

// Utility functions
async function loadCompaniesForSelect(selectId) {
    try {
        const response = await fetch('data/schedule.json');
        const data = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Get unique companies from schedule
        const companies = new Set();
        data.schedule.forEach(day => {
            day.companies.forEach(company => companies.add(company));
        });
        
        // Clear existing options except the first one
        const firstOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        
        // Add company options
        Array.from(companies).sort().forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

// Admin functions
function addUser() {
    // This would open a modal in a real application
    const username = prompt(translations.admin_username_prompt || 'Введите логин:');
    if (!username) return;
    
    const password = prompt(translations.admin_password_prompt || 'Введите пароль:');
    if (!password) return;
    
    const name = prompt(translations.admin_name_prompt || 'Введите имя:');
    if (!name) return;
    
    const role = confirm(translations.admin_role_prompt || 'Сделать администратором?') ? 'admin' : 'user';
    
    // In a real application, this would be sent to a server
    users.push({ username, password, role, name });
    
    alert(translations.user_added || 'Пользователь добавлен');
}

function exportData() {
    const data = {
        packagings: JSON.parse(localStorage.getItem('packagings') || '[]'),
        returns: JSON.parse(localStorage.getItem('returns') || '[]'),
        notes: JSON.parse(localStorage.getItem('notes') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `estakaadi-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.packagings) localStorage.setItem('packagings', JSON.stringify(data.packagings));
                if (data.returns) localStorage.setItem('returns', JSON.stringify(data.returns));
                if (data.notes) localStorage.setItem('notes', JSON.stringify(data.notes));
                
                alert(translations.data_imported || 'Данные импортированы');
                location.reload();
                
            } catch (error) {
                alert(translations.import_error || 'Ошибка при импорте данных');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function clearData() {
    if (!confirm(translations.confirm_clear_data || 'Удалить все данные? Это действие нельзя отменить!')) return;
    
    localStorage.removeItem('packagings');
    localStorage.removeItem('returns');
    localStorage.removeItem('notes');
    
    alert(translations.data_cleared || 'Данные очищены');
    location.reload();
}

// Calendar functions
function initCalendar() {
    currentCalendarDate = new Date();
    generateCalendar();
}

function generateCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update month/year display
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const monthNamesEE = [
        'Jaanuar', 'Veebruar', 'Märts', 'Aprill', 'Mai', 'Juuni',
        'Juuli', 'August', 'September', 'Oktoober', 'November', 'Detsember'
    ];
    
    const monthDisplay = currentLanguage === 'ee' ? monthNamesEE[month] : monthNames[month];
    document.getElementById('current-month-year').textContent = `${monthDisplay} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert to Monday = 0
    
    // Generate calendar grid
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';
    
    let date = 1;
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    
    // Create calendar rows
    for (let week = 0; week < 6; week++) {
        const row = document.createElement('tr');
        
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('td');
            cell.className = 'calendar-cell';
            
            if (week === 0 && day < startingDayOfWeek) {
                // Empty cells before month starts
                cell.innerHTML = '';
            } else if (date > daysInMonth) {
                // Empty cells after month ends
                cell.innerHTML = '';
            } else {
                // Regular day cells
                const cellDate = new Date(year, month, date);
                const dateStr = cellDate.toISOString().split('T')[0];
                
                // Check if it's today
                const today = new Date();
                const isToday = cellDate.toDateString() === today.toDateString();
                
                // Get events for this date
                const dayEvents = events.filter(event => event.date === dateStr);
                
                cell.innerHTML = `
                    <div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectDate('${dateStr}')">
                        <div class="day-number">${date}</div>
                        <div class="day-events">
                            ${dayEvents.map(event => `
                                <div class="event-item event-${event.type}" onclick="showEventDetails(${event.id})" title="${event.title}">
                                    ${event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                date++;
            }
            
            row.appendChild(cell);
        }
        
        calendarBody.appendChild(row);
        
        // Stop if we've filled all days
        if (date > daysInMonth) break;
    }
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    generateCalendar();
}

function selectDate(dateStr) {
    // Set the date in add event modal
    document.getElementById('event-date').value = dateStr;
    showAddEventModal();
}

function showAddEventModal() {
    // Set default date to today if not set
    const dateInput = document.getElementById('event-date');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    new bootstrap.Modal(document.getElementById('addEventModal')).show();
}

function addCalendarEvent() {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const type = document.getElementById('event-type').value;
    const description = document.getElementById('event-description').value;
    
    if (!title || !date) {
        alert(translations.form_required_fields || 'Заполните все обязательные поля');
        return;
    }
    
    const event = {
        id: Date.now(),
        title,
        date,
        time,
        type,
        description,
        user: currentUser.username,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    events.push(event);
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    
    // Close modal and reset form
    bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
    document.getElementById('add-event-form').reset();
    
    // Refresh calendar
    generateCalendar();
    
    alert(translations.event_saved || 'Событие сохранено');
    loadDashboardData(); // Update dashboard
}

function showEventDetails(eventId) {
    event.stopPropagation(); // Prevent date selection
    
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    const eventData = events.find(e => e.id === eventId);
    
    if (!eventData) return;
    
    selectedEventId = eventId;
    
    const modal = document.getElementById('eventDetailsModal');
    document.getElementById('event-details-title').textContent = eventData.title;
    
    const eventTypeNames = {
        'delivery': translations.event_delivery || 'Поставка',
        'meeting': translations.event_meeting || 'Совещание', 
        'maintenance': translations.event_maintenance || 'Техобслуживание',
        'other': translations.event_other || 'Другое'
    };
    
    document.getElementById('event-details-body').innerHTML = `
        <p><strong>${translations.event_date || 'Дата'}:</strong> ${new Date(eventData.date).toLocaleDateString()}</p>
        ${eventData.time ? `<p><strong>${translations.event_time || 'Время'}:</strong> ${eventData.time}</p>` : ''}
        <p><strong>${translations.event_type || 'Тип'}:</strong> ${eventTypeNames[eventData.type]}</p>
        ${eventData.description ? `<p><strong>${translations.event_description || 'Описание'}:</strong> ${eventData.description}</p>` : ''}
        <p><strong>${translations.created_by || 'Создано'}:</strong> ${eventData.user} - ${new Date(eventData.timestamp).toLocaleString()}</p>
    `;
    
    // Show delete button if user has permission
    const deleteBtn = document.getElementById('delete-event-btn');
    if (currentUser.role === 'admin' || currentUser.username === eventData.user) {
        deleteBtn.style.display = 'block';
    } else {
        deleteBtn.style.display = 'none';
    }
    
    new bootstrap.Modal(modal).show();
}

function deleteEvent() {
    if (!selectedEventId) return;
    
    if (!confirm(translations.confirm_delete_event || 'Удалить событие?')) return;
    
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    const eventIndex = events.findIndex(e => e.id === selectedEventId);
    
    if (eventIndex === -1) return;
    
    // Check permissions
    const event = events[eventIndex];
    if (currentUser.role !== 'admin' && currentUser.username !== event.user) {
        alert(translations.no_permission || 'Нет прав для удаления');
        return;
    }
    
    events.splice(eventIndex, 1);
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    
    // Close modal and refresh calendar
    bootstrap.Modal.getInstance(document.getElementById('eventDetailsModal')).hide();
    generateCalendar();
    
    selectedEventId = null;
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize forms
    initPackagingForm();
    initReturnsForm();
    
    // Initialize calendar
    initCalendar();
    
    // Load data
    loadSchedule();
    loadNotes();
    loadDashboardData();
    
    // Initialize animations
    setTimeout(() => {
        addPageAnimations();
        initializeTooltips();
        initializeInteractiveAnimations();
    }, 100);
    
    // Set up tab event listeners
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const target = e.target.getAttribute('data-bs-target');
            
            // Reload data when switching to certain tabs
            if (target === '#notes') {
                loadNotes();
            } else if (target === '#schedule') {
                loadSchedule();
            } else if (target === '#calendar') {
                generateCalendar();
            } else if (target === '#dashboard') {
                loadDashboardData();
            } else if (target === '#packaging') {
                loadPackagingData();
            }
        });
    });
});

function updatePackagingStats() {
    const packagings = JSON.parse(localStorage.getItem('packagings') || '[]');
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    // Count today's packagings
    const todayPackagings = packagings.filter(packaging => {
        return packaging.date === today;
    });
    
    // Count today's returns
    const todayReturns = returns.filter(returnItem => {
        return returnItem.date === today;
    });
    
    // Update packaging count in stats
    const packagingCountElement = document.getElementById('packaging-count');
    if (packagingCountElement) {
        packagingCountElement.textContent = todayPackagings.length;
    }
    
    // Update total items count  
    let totalItems = 0;
    todayPackagings.forEach(packaging => {
        if (packaging.items && packaging.items.length > 0) {
            // New format with multiple items
            packaging.items.forEach(item => {
                totalItems += item.quantity;
            });
        } else if (packaging.quantity) {
            // Old format with single item
            totalItems += packaging.quantity;
        }
    });
    
    const itemsCountElement = document.getElementById('items-count');
    if (itemsCountElement) {
        itemsCountElement.textContent = totalItems;
    }
    
    // Update returns count
    const returnsCountElement = document.getElementById('returns-count');
    if (returnsCountElement) {
        returnsCountElement.textContent = todayReturns.length;
    }
    
    // Update notes count (total, not just today)
    const notesCountElement = document.getElementById('notes-count');
    if (notesCountElement) {
        notesCountElement.textContent = notes.length;
    }
}

// Data export/import functions
function exportData() {
    const data = {
        packagings: JSON.parse(localStorage.getItem('packagings') || '[]'),
        returns: JSON.parse(localStorage.getItem('returns') || '[]'),
        notes: JSON.parse(localStorage.getItem('notes') || '[]'),
        schedule: JSON.parse(localStorage.getItem('schedule') || '{}'),
        calendarEvents: JSON.parse(localStorage.getItem('calendarEvents') || '[]'),
        arrivals: JSON.parse(localStorage.getItem('arrivals') || '[]'),
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `estakaadi-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(translations.data_exported || 'Данные экспортированы');
}

function importData() {
    document.getElementById('import-file-input').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm(translations.confirm_import || 'Импортировать данные? Текущие данные будут заменены.')) {
                // Import all data
                if (data.packagings) localStorage.setItem('packagings', JSON.stringify(data.packagings));
                if (data.returns) localStorage.setItem('returns', JSON.stringify(data.returns));
                if (data.notes) localStorage.setItem('notes', JSON.stringify(data.notes));
                if (data.schedule) localStorage.setItem('schedule', JSON.stringify(data.schedule));
                if (data.calendarEvents) localStorage.setItem('calendarEvents', JSON.stringify(data.calendarEvents));
                if (data.arrivals) localStorage.setItem('arrivals', JSON.stringify(data.arrivals));
                
                alert(translations.data_imported || 'Данные импортированы');
                
                // Reload current view
                loadDashboardData();
                loadPackagingData();
                loadNotes();
                loadSchedule();
            }
        } catch (error) {
            alert(translations.import_error || 'Ошибка при импорте данных');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Animation Functions
function addPageAnimations() {
    // Add fade-in animation to main content
    const mainContent = document.querySelector('.container-fluid');
    if (mainContent) {
        mainContent.classList.add('animate-fade-in');
    }
    
    // Add animations to cards with delays
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.classList.add('card-animated', 'animate-fade-in');
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add hover animations to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        if (!btn.classList.contains('btn-animated')) {
            btn.classList.add('btn-animated');
        }
    });
    
    // Add animations to badges
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.classList.add('hover-scale');
    });
}

function initializeTooltips() {
    // Initialize Bootstrap tooltips if available
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }
}

function initializeInteractiveAnimations() {
    // Add animations to company arrival badges
    const companyBadges = document.querySelectorAll('.company-arrival');
    companyBadges.forEach(badge => {
        badge.addEventListener('click', function() {
            this.classList.add('animate-bounce');
            setTimeout(() => {
                this.classList.remove('animate-bounce');
            }, 1000);
        });
    });
    
    // Add animations to form inputs
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.classList.add('animate-pulse');
        });
        
        input.addEventListener('blur', function() {
            this.classList.remove('animate-pulse');
        });
    });
    
    // Add animations to tab switching
    const tabLinks = document.querySelectorAll('.nav-tabs .nav-link');
    tabLinks.forEach(tab => {
        tab.addEventListener('click', function() {
            // Add animation to tab content
            setTimeout(() => {
                const activeTabContent = document.querySelector('.tab-pane.active');
                if (activeTabContent) {
                    activeTabContent.classList.add('animate-fade-in');
                    setTimeout(() => {
                        activeTabContent.classList.remove('animate-fade-in');
                    }, 600);
                }
            }, 50);
        });
    });
}

function animateElement(element, animationClass, duration = 600) {
    if (!element) return;
    
    element.classList.add(animationClass);
    setTimeout(() => {
        element.classList.remove(animationClass);
    }, duration);
}

function showSuccessAnimation(element) {
    if (element) {
        animateElement(element, 'success-animation', 1000);
    }
}

function showErrorAnimation(element) {
    if (element) {
        animateElement(element, 'error-animation', 600);
    }
}

function animateCounter(element, startValue, endValue, duration = 1000) {
    if (!element) return;
    
    const startTime = performance.now();
    const startNum = parseInt(startValue) || 0;
    const endNum = parseInt(endValue) || 0;
    const diff = endNum - startNum;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startNum + (diff * easeOutQuart));
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

function slideInElement(element, direction = 'up') {
    if (!element) return;
    
    const animationClass = direction === 'up' ? 'animate-slide-up' : 
                          direction === 'left' ? 'animate-fade-in-left' : 
                          'animate-fade-in-right';
    
    element.classList.add(animationClass);
}

function addLoadingAnimation(button) {
    if (!button) return;
    
    const originalContent = button.innerHTML;
    const spinner = '<span class="loading-spinner me-2"></span>';
    
    button.innerHTML = spinner + button.textContent;
    button.disabled = true;
    
    return function removeLoading() {
        button.innerHTML = originalContent;
        button.disabled = false;
    };
}

function animateProgressBar(progressBar, targetWidth, duration = 1000) {
    if (!progressBar) return;
    
    progressBar.style.width = '0%';
    progressBar.style.transition = `width ${duration}ms ease-out`;
    
    setTimeout(() => {
        progressBar.style.width = targetWidth + '%';
    }, 50);
}

function createFloatingNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideInRight 0.5s ease-out;
    `;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'fadeOut 0.5s ease-out';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 500);
        }
    }, duration);
    
    return notification;
}

// Add CSS for slideInRight animation
const additionalStyles = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Gallery Functions
let currentGalleryFilter = 'all';
let currentGallerySort = 'newest';
let selectedPhotoId = null;

function initGallery() {
    loadGalleryData();
    loadCompaniesForGalleryFilter();
    setupGalleryEventListeners();
}

function setupGalleryEventListeners() {
    // Photo category change handler
    const categorySelect = document.getElementById('photo-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const companyContainer = document.getElementById('company-select-container');
            if (this.value === 'company') {
                companyContainer.style.display = 'block';
            } else {
                companyContainer.style.display = 'none';
            }
        });
    }

    // Photo files change handler
    const photoFiles = document.getElementById('photo-files');
    if (photoFiles) {
        photoFiles.addEventListener('change', previewPhotos);
    }
}

async function loadCompaniesForGalleryFilter() {
    try {
        const response = await fetch('data/schedule.json');
        const data = await response.json();
        
        const companySelects = [
            document.getElementById('photo-company'),
            document.getElementById('gallery-company-filter')
        ];
        
        companySelects.forEach(select => {
            if (!select) return;
            
            // Get unique companies
            const companies = new Set();
            data.schedule.forEach(day => {
                day.companies.forEach(company => companies.add(company));
            });
            
            // Clear existing options except first
            const firstOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);
            
            // Add company options
            Array.from(companies).sort().forEach(company => {
                const option = document.createElement('option');
                option.value = company;
                option.textContent = company;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading companies for gallery:', error);
    }
}

function showUploadModal() {
    const modal = new bootstrap.Modal(document.getElementById('uploadPhotoModal'));
    modal.show();
}

function previewPhotos() {
    const fileInput = document.getElementById('photo-files');
    const previewContainer = document.getElementById('preview-container');
    const photoPreview = document.getElementById('photo-preview');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (!fileInput.files.length) {
        photoPreview.style.display = 'none';
        uploadBtn.disabled = true;
        return;
    }
    
    previewContainer.innerHTML = '';
    photoPreview.style.display = 'block';
    uploadBtn.disabled = false;
    
    Array.from(fileInput.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'photo-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="photo-preview-remove" onclick="removePreviewPhoto(${index})">×</button>
            `;
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removePreviewPhoto(index) {
    const fileInput = document.getElementById('photo-files');
    const dt = new DataTransfer();
    
    Array.from(fileInput.files).forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    fileInput.files = dt.files;
    previewPhotos();
}

async function uploadPhotos() {
    const fileInput = document.getElementById('photo-files');
    const category = document.getElementById('photo-category').value;
    const company = document.getElementById('photo-company').value;
    const title = document.getElementById('photo-title').value;
    const description = document.getElementById('photo-description').value;
    const tags = document.getElementById('photo-tags').value;
    
    if (!fileInput.files.length || !category) {
        alert(translations.form_required_fields || 'Заполните все обязательные поля');
        return;
    }
    
    if (category === 'company' && !company) {
        alert('Выберите компанию для категории "Компания"');
        return;
    }
    
    const uploadBtn = document.getElementById('upload-btn');
    const removeLoading = addLoadingAnimation(uploadBtn);
    
    try {
        const photos = [];
        
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const photoData = await processPhotoFile(file, {
                category,
                company: category === 'company' ? company : null,
                title: title || file.name,
                description,
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            });
            photos.push(photoData);
        }
        
        // Save to new storage system first
        if (typeof storage !== 'undefined' && storage.isLoaded) {
            // Add photos one by one to maintain proper IDs and timestamps
            for (const photo of photos) {
                await storage.add('gallery', photo, currentUser.username);
            }
            
            // Update gallery stats
            const currentGallery = storage.get('gallery') || [];
            const totalSize = currentGallery.reduce((sum, photo) => sum + (photo.size || 0), 0);
            storage.data.gallery.totalPhotos = currentGallery.length;
            storage.data.gallery.totalSize = totalSize;
        } else {
            // Fallback to localStorage
            const galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
            galleryData.push(...photos);
            localStorage.setItem('gallery', JSON.stringify(galleryData));
        }
        
        // Close modal and refresh gallery
        bootstrap.Modal.getInstance(document.getElementById('uploadPhotoModal')).hide();
        document.getElementById('upload-photo-form').reset();
        document.getElementById('photo-preview').style.display = 'none';
        
        createFloatingNotification(
            `Загружено ${photos.length} фотографий`, 
            'success'
        );
        
        loadGalleryData();
        
    } catch (error) {
        console.error('Upload error:', error);
        createFloatingNotification('Ошибка при загрузке фотографий', 'danger');
    } finally {
        removeLoading();
    }
}

async function processPhotoFile(file, metadata) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create photo object
            const photo = {
                id: Date.now() + Math.random(),
                filename: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result, // Base64 data URL
                category: metadata.category,
                company: metadata.company,
                title: metadata.title,
                description: metadata.description,
                tags: metadata.tags,
                uploadDate: new Date().toISOString(),
                user: currentUser.username
            };
            resolve(photo);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadGalleryData() {
    let galleryData = [];
    
    // Try to load from new storage system first
    if (typeof storage !== 'undefined' && storage.isLoaded) {
        galleryData = storage.get('gallery') || [];
    } else {
        // Fallback to localStorage
        galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
    }
    
    const container = document.getElementById('gallery-container');
    const emptyState = document.getElementById('gallery-empty');
    
    if (!container) return;
    
    if (galleryData.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyState.style.display = 'none';
    
    // Filter and sort data
    let filteredData = filterGalleryData(galleryData);
    filteredData = sortGalleryData(filteredData);
    
    // Render gallery items
    container.innerHTML = filteredData.map(photo => createGalleryItem(photo)).join('');
    
    // Add animations
    setTimeout(() => {
        const items = container.querySelectorAll('.gallery-item');
        items.forEach((item, index) => {
            item.classList.add('animate-fade-in');
            item.style.animationDelay = `${index * 0.05}s`;
        });
    }, 50);
}

function createGalleryItem(photo) {
    const categoryClass = `gallery-category-${photo.category}`;
    const canEdit = currentUser.role === 'admin' || currentUser.username === photo.user;
    
    return `
        <div class="col-md-3 col-sm-6 mb-4">
            <div class="gallery-item card-animated" data-photo-id="${photo.id}" onclick="showPhotoModal('${photo.id}')">
                <img src="${photo.data}" alt="${photo.title}" class="gallery-item-image">
                <div class="gallery-item-category ${categoryClass}">
                    ${getCategoryName(photo.category)}
                </div>
                ${canEdit ? `
                <div class="gallery-item-actions">
                    <button class="btn btn-sm btn-outline-light" onclick="event.stopPropagation(); editPhoto('${photo.id}')" title="Редактировать">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deletePhoto('${photo.id}')" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                ` : ''}
                <div class="gallery-item-overlay">
                    <div class="gallery-item-title">${photo.title}</div>
                    <div class="gallery-item-info">
                        ${photo.company ? photo.company + ' • ' : ''}
                        ${new Date(photo.uploadDate).toLocaleDateString()}
                        ${photo.tags.length > 0 ? `
                        <div class="gallery-tags">
                            ${photo.tags.map(tag => `<span class="gallery-tag">${tag}</span>`).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getCategoryName(category) {
    const names = {
        'company': 'Компания',
        'instructions': 'Инструкции',
        'other': 'Прочее'
    };
    return names[category] || category;
}

function filterGalleryData(data) {
    let filtered = data;
    
    // Filter by category
    if (currentGalleryFilter !== 'all') {
        filtered = filtered.filter(photo => photo.category === currentGalleryFilter);
    }
    
    // Filter by company
    const companyFilter = document.getElementById('gallery-company-filter');
    if (companyFilter && companyFilter.value) {
        filtered = filtered.filter(photo => photo.company === companyFilter.value);
    }
    
    // Filter by search
    const searchInput = document.getElementById('gallery-search');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        filtered = filtered.filter(photo => 
            photo.title.toLowerCase().includes(searchTerm) ||
            photo.description.toLowerCase().includes(searchTerm) ||
            photo.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
            (photo.company && photo.company.toLowerCase().includes(searchTerm))
        );
    }
    
    return filtered;
}

function sortGalleryData(data) {
    const sortBy = currentGallerySort;
    
    switch (sortBy) {
        case 'newest':
            return data.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        case 'oldest':
            return data.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
        case 'name':
            return data.sort((a, b) => a.title.localeCompare(b.title));
        default:
            return data;
    }
}

function filterGallery(category) {
    currentGalleryFilter = category;
    
    // Update filter buttons
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadGalleryData();
}

function filterByCompany() {
    loadGalleryData();
}

function searchGallery() {
    // Debounce search
    clearTimeout(window.gallerySearchTimeout);
    window.gallerySearchTimeout = setTimeout(() => {
        loadGalleryData();
    }, 300);
}

function sortGallery() {
    const sortSelect = document.getElementById('gallery-sort');
    currentGallerySort = sortSelect.value;
    loadGalleryData();
}

function showPhotoModal(photoId) {
    const galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
    const photo = galleryData.find(p => p.id == photoId);
    
    if (!photo) return;
    
    selectedPhotoId = photoId;
    
    const modal = document.getElementById('photoViewModal');
    const image = document.getElementById('photo-view-image');
    const title = document.getElementById('photo-view-title');
    const info = document.getElementById('photo-view-info');
    const editBtn = document.getElementById('edit-photo-btn');
    const deleteBtn = document.getElementById('delete-photo-btn');
    
    image.src = photo.data;
    image.alt = photo.title;
    title.textContent = photo.title;
    
    info.innerHTML = `
        <div class="photo-info-grid">
            <span class="photo-info-label">Категория:</span>
            <span>${getCategoryName(photo.category)}</span>
            ${photo.company ? `
            <span class="photo-info-label">Компания:</span>
            <span>${photo.company}</span>
            ` : ''}
            <span class="photo-info-label">Дата загрузки:</span>
            <span>${new Date(photo.uploadDate).toLocaleDateString()}</span>
            <span class="photo-info-label">Загрузил:</span>
            <span>${photo.user}</span>
            <span class="photo-info-label">Размер файла:</span>
            <span>${formatFileSize(photo.size)}</span>
            ${photo.description ? `
            <span class="photo-info-label">Описание:</span>
            <span>${photo.description}</span>
            ` : ''}
            ${photo.tags.length > 0 ? `
            <span class="photo-info-label">Теги:</span>
            <div class="gallery-tags">
                ${photo.tags.map(tag => `<span class="gallery-tag">${tag}</span>`).join('')}
            </div>
            ` : ''}
        </div>
    `;
    
    // Show/hide action buttons based on permissions
    const canEdit = currentUser.role === 'admin' || currentUser.username === photo.user;
    editBtn.style.display = canEdit ? 'block' : 'none';
    deleteBtn.style.display = canEdit ? 'block' : 'none';
    
    new bootstrap.Modal(modal).show();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function downloadPhoto() {
    if (!selectedPhotoId) return;
    
    const galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
    const photo = galleryData.find(p => p.id == selectedPhotoId);
    
    if (!photo) return;
    
    const link = document.createElement('a');
    link.href = photo.data;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function editPhoto(photoId = null) {
    const id = photoId || selectedPhotoId;
    if (!id) return;
    
    const galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
    const photo = galleryData.find(p => p.id == id);
    
    if (!photo) return;
    
    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.username !== photo.user) {
        alert('Нет прав для редактирования');
        return;
    }
    
    // Simple edit implementation - you can expand this
    const newTitle = prompt('Новое название:', photo.title);
    if (newTitle === null) return;
    
    const newDescription = prompt('Новое описание:', photo.description || '');
    if (newDescription === null) return;
    
    const newTags = prompt('Новые теги (через запятую):', photo.tags.join(', '));
    if (newTags === null) return;
    
    // Update photo
    photo.title = newTitle;
    photo.description = newDescription;
    photo.tags = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    photo.editedBy = currentUser.username;
    photo.editedAt = new Date().toISOString();
    
    // Save changes
    localStorage.setItem('gallery', JSON.stringify(galleryData));
    
    createFloatingNotification('Фотография обновлена', 'success');
    
    // Refresh displays
    loadGalleryData();
    if (selectedPhotoId) {
        showPhotoModal(selectedPhotoId);
    }
}

function deletePhoto(photoId = null) {
    const id = photoId || selectedPhotoId;
    if (!id) return;
    
    const galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
    const photo = galleryData.find(p => p.id == id);
    
    if (!photo) return;
    
    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.username !== photo.user) {
        alert('Нет прав для удаления');
        return;
    }
    
    if (!confirm('Удалить эту фотографию?')) return;
    
    // Remove photo
    const updatedData = galleryData.filter(p => p.id != id);
    localStorage.setItem('gallery', JSON.stringify(updatedData));
    
    createFloatingNotification('Фотография удалена', 'success');
    
    // Close modal if open and refresh gallery
    if (selectedPhotoId) {
        bootstrap.Modal.getInstance(document.getElementById('photoViewModal')).hide();
        selectedPhotoId = null;
    }
    
    loadGalleryData();
}

// Storage management functions
function getStorageUsage() {
    const galleryData = JSON.parse(localStorage.getItem('gallery') || '[]');
    let totalSize = 0;
    
    galleryData.forEach(photo => {
        totalSize += photo.size || 0;
    });
    
    return {
        photos: galleryData.length,
        totalSize: totalSize,
        formattedSize: formatFileSize(totalSize)
    };
}

function checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const usage = getStorageUsage();
            const quotaUsed = (estimate.usage / estimate.quota) * 100;
            
            if (quotaUsed > 80) {
                showStorageWarning(quotaUsed, usage);
            }
        });
    }
}

function showStorageWarning(quotaUsed, usage) {
    const warning = document.createElement('div');
    warning.className = 'storage-status warning';
    warning.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        Внимание: Использовано ${quotaUsed.toFixed(1)}% хранилища
        <br>Фотографий: ${usage.photos}, Размер: ${usage.formattedSize}
    `;
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.remove();
    }, 5000);
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('gallery-container')) {
        initGallery();
        checkStorageQuota();
    }
});
