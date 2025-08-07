// Estakaadi Planner - Main JavaScript File

// Global variables
let currentUser = null;
let currentLanguage = 'ru';
let translations = {};
let currentCalendarDate = new Date();
let selectedEventId = null;

// User database (in production, this would be in a proper database)
const users = [
    { username: "maksim", password: "123", role: "admin", name: "Максим" },
    { username: "admin", password: "321", role: "admin", name: "Администратор" },
    { username: "boss", password: "321", role: "admin", name: "Начальник" },
    { username: "dima", password: "456", role: "admin", name: "Дима" },
    { username: "worker1", password: "111", role: "user", name: "Сотрудник 1" },
    { username: "worker2", password: "222", role: "user", name: "Сотрудник 2" }
];

// Authentication functions
function login(username, password, remember = false) {
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        
        // Store in session or local storage
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify(user));
        
        return true;
    }
    
    return false;
}

function logout() {
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
        const response = await fetch('data/schedule.json');
        const scheduleData = await response.json();
        
        const tableBody = document.querySelector('#schedule-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            scheduleData.schedule.forEach(day => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${day.day}</strong></td>
                    <td>${day.companies.join(', ')}</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Update today's deliveries on dashboard
        updateTodayDeliveries(scheduleData);
        
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
        <div class="instruction-content">
            <h6>${translations.pallets_info || 'Типы палет и подставок'}</h6>
            <div class="row mb-3">
                ${instructions.images.map(img => `
                    <div class="col-md-6 mb-2">
                        <img src="${img.src}" class="img-fluid rounded instruction-image" 
                             alt="${img.alt}" onclick="showFullImage('${img.src}', '${img.alt}')">
                        <small class="d-block text-muted mt-1">${img.description}</small>
                    </div>
                `).join('')}
            </div>
            
            <h6>${translations.packing_steps || 'Шаги упаковки палет'}</h6>
            <ol class="packing-steps">
                ${instructions.steps.map(step => `
                    <li class="mb-2">${step}</li>
                `).join('')}
            </ol>
            
            ${instructions.notes ? `
                <div class="alert alert-info">
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
    
    // Специальные инструкции для разных компаний
    const companyInstructions = {
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
                <h6>${translations.dashboard_today_companies || 'Компании сегодня'}:</h6>
                <div class="d-flex flex-wrap gap-1 mb-3">
                    ${todaySchedule.companies.map(company => {
                        const hasArrived = todayArrivals.includes(company);
                        return `
                            <span class="badge company-arrival ${hasArrived ? 'bg-success' : 'bg-primary'}" 
                                  onclick="toggleCompanyArrival('${company}')" 
                                  style="cursor: pointer;" 
                                  title="${hasArrived ? 'Прибыл' : 'Ожидается'}">${company}</span>
                        `;
                    }).join('')}
                </div>
                <small class="text-muted">
                    <i class="bi bi-info-circle"></i> ${translations.click_to_mark_arrived || 'Нажмите на компанию чтобы отметить прибытие'}
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
        
        // Add initial packaging item
        addPackagingItem();
        
        // Load existing packaging data
        loadPackagingData();
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
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${packaging.company}</h6>
                            <div class="btn-group btn-group-sm">
                                ${(currentUser.role === 'admin' || packaging.user === currentUser.username) ? `
                                    <button class="btn btn-outline-primary btn-sm" onclick="editPackaging(${packaging.id})" title="${translations.edit || 'Редактировать'}">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="deletePackaging(${packaging.id})" title="${translations.delete || 'Удалить'}">
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
function loadNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    
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
                            ${note.user} - ${new Date(note.timestamp).toLocaleString()}
                        </small>
                    </div>
                    <div>
                        ${(currentUser.role === 'admin' || currentUser.username === note.user) ? `
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editNote(${note.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(${note.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function addNote() {
    const title = prompt(translations.note_title_prompt || 'Введите заголовок заметки:');
    if (!title) return;
    
    const content = prompt(translations.note_content_prompt || 'Введите текст заметки:');
    if (!content) return;
    
    const note = {
        id: Date.now(),
        title,
        content,
        user: currentUser.username,
        timestamp: new Date().toISOString()
    };
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push(note);
    localStorage.setItem('notes', JSON.stringify(notes));
    
    loadNotes();
    loadDashboardData(); // Update dashboard
}

function editNote(noteId) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find(n => n.id === noteId);
    
    if (!note) return;
    
    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.username !== note.user) {
        alert(translations.no_permission || 'Нет прав для редактирования');
        return;
    }
    
    const newTitle = prompt(translations.note_title_prompt || 'Введите заголовок заметки:', note.title);
    if (newTitle === null) return;
    
    const newContent = prompt(translations.note_content_prompt || 'Введите текст заметки:', note.content);
    if (newContent === null) return;
    
    note.title = newTitle;
    note.content = newContent;
    note.editedBy = currentUser.username;
    note.editedAt = new Date().toISOString();
    
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
    loadDashboardData(); // Update dashboard
}

function deleteNote(noteId) {
    if (!confirm(translations.confirm_delete_note || 'Удалить заметку?')) return;
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) return;
    
    // Check permissions
    const note = notes[noteIndex];
    if (currentUser.role !== 'admin' && currentUser.username !== note.user) {
        alert(translations.no_permission || 'Нет прав для удаления');
        return;
    }
    
    notes.splice(noteIndex, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
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
