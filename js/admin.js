/**
 * Admin functions for centralized storage system
 */

// Storage administration functions
function updateStorageStats() {
    if (typeof storage === 'undefined' || !storage.isLoaded) {
        console.warn('Storage system not available');
        return;
    }

    const stats = storage.getStorageStats();
    
    // Update storage info display
    const storageInfo = document.getElementById('storage-info');
    if (storageInfo) {
        storageInfo.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <h6 class="card-title">Общий размер</h6>
                            <h4>${stats.formattedSize}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h6 class="card-title">Последнее обновление</h6>
                            <p>${new Date(stats.lastUpdated).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-warning text-white">
                        <div class="card-body">
                            <h6 class="card-title">Версия</h6>
                            <h4>${stats.version}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-3">
                <h6>Статистика по разделам:</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Раздел</th>
                                <th>Элементов</th>
                                <th>Размер</th>
                                <th>Доля</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.sections.map(section => `
                                <tr>
                                    <td><strong>${getSectionDisplayName(section.name)}</strong></td>
                                    <td>${section.itemCount}</td>
                                    <td>${section.formattedSize}</td>
                                    <td>
                                        <div class="progress" style="height: 6px;">
                                            <div class="progress-bar" style="width: ${(section.size / stats.totalSize * 100).toFixed(1)}%"></div>
                                        </div>
                                        ${(section.size / stats.totalSize * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

function getSectionDisplayName(sectionName) {
    const names = {
        'users': 'Пользователи',
        'schedule': 'Расписание',
        'notes': 'Заметки',
        'gallery': 'Галерея',
        'companies': 'Компании',
        'settings': 'Настройки',
        'logs': 'Журнал событий',
        'metadata': 'Метаданные'
    };
    return names[sectionName] || sectionName;
}

async function exportAllData() {
    try {
        if (typeof storage === 'undefined' || !storage.isLoaded) {
            throw new Error('Storage system not available');
        }

        const exportData = storage.exportData();
        const dataStr = JSON.stringify(exportData, null, 2);
        
        // Create downloadable file
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `estakaadi_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        createFloatingNotification('Данные экспортированы', 'success');
        
    } catch (error) {
        console.error('Export failed:', error);
        createFloatingNotification('Ошибка экспорта данных', 'danger');
    }
}

async function importData() {
    try {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = async function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    if (!confirm('Импорт данных заменит все текущие данные. Продолжить?')) {
                        return;
                    }
                    
                    const success = await storage.importData(importedData, currentUser?.username || 'admin');
                    
                    if (success) {
                        createFloatingNotification('Данные импортированы', 'success');
                        // Refresh all displays
                        location.reload();
                    } else {
                        createFloatingNotification('Ошибка импорта данных', 'danger');
                    }
                    
                } catch (error) {
                    console.error('Import failed:', error);
                    createFloatingNotification('Неверный формат файла', 'danger');
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
        
    } catch (error) {
        console.error('Import initialization failed:', error);
        createFloatingNotification('Ошибка инициализации импорта', 'danger');
    }
}

async function clearAllData() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ данные системы. Продолжить?')) {
        return;
    }
    
    if (!confirm('Последнее предупреждение! Все данные будут безвозвратно утеряны. Продолжить?')) {
        return;
    }
    
    try {
        // Clear storage
        if (typeof storage !== 'undefined') {
            await storage.initializeEmptyStorage();
        }
        
        // Clear localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('estakaadi_') || ['gallery', 'notes', 'currentUser'].includes(key)) {
                localStorage.removeItem(key);
            }
        });
        
        createFloatingNotification('Все данные очищены', 'success');
        
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Clear data failed:', error);
        createFloatingNotification('Ошибка очистки данных', 'danger');
    }
}

async function loadUsersTable() {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;
    
    try {
        let users = [];
        
        if (typeof storage !== 'undefined' && storage.isLoaded) {
            users = storage.get('users') || [];
        }
        
        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Пользователи не найдены</td></tr>';
            return;
        }
        
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.name || user.username}</td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                        ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </span>
                </td>
                <td>
                    ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Никогда'}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Ошибка загрузки пользователей</td></tr>';
    }
}

async function loadLogs() {
    const tableBody = document.querySelector('#logs-table tbody');
    if (!tableBody) return;
    
    try {
        let logs = [];
        
        if (typeof storage !== 'undefined' && storage.isLoaded) {
            logs = storage.get('logs') || [];
        }
        
        if (logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Журнал событий пуст</td></tr>';
            return;
        }
        
        // Show only last 50 logs
        const recentLogs = logs.slice(0, 50);
        
        tableBody.innerHTML = recentLogs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.user}</td>
                <td>
                    <span class="badge ${getActionBadgeClass(log.action)}">
                        ${getActionDisplayName(log.action)}
                    </span>
                </td>
                <td>${log.details}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading logs:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Ошибка загрузки журнала</td></tr>';
    }
}

function getActionBadgeClass(action) {
    const classes = {
        'user_login': 'bg-success',
        'user_logout': 'bg-warning',
        'data_update': 'bg-info',
        'data_import': 'bg-primary',
        'data_export': 'bg-secondary',
        'system_init': 'bg-dark'
    };
    return classes[action] || 'bg-light text-dark';
}

function getActionDisplayName(action) {
    const names = {
        'user_login': 'Вход',
        'user_logout': 'Выход',
        'data_update': 'Обновление',
        'data_import': 'Импорт',
        'data_export': 'Экспорт',
        'system_init': 'Инициализация'
    };
    return names[action] || action;
}

async function manageBackups() {
    try {
        const backupKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('estakaadi_data_backup_')
        );
        
        if (backupKeys.length === 0) {
            alert('Резервные копии не найдены');
            return;
        }
        
        let backupList = 'Доступные резервные копии:\n\n';
        backupKeys.forEach((key, index) => {
            const timestamp = key.split('_').pop();
            const date = new Date(parseInt(timestamp));
            backupList += `${index + 1}. ${date.toLocaleString()}\n`;
        });
        
        backupList += '\nВведите номер для восстановления (0 - отмена):';
        
        const choice = prompt(backupList);
        const choiceNum = parseInt(choice);
        
        if (!choiceNum || choiceNum < 1 || choiceNum > backupKeys.length) {
            return;
        }
        
        const selectedKey = backupKeys[choiceNum - 1];
        const backupData = JSON.parse(localStorage.getItem(selectedKey));
        
        if (confirm('Восстановить данные из резервной копии? Текущие данные будут заменены.')) {
            const success = await storage.importData(backupData, currentUser?.username || 'admin');
            
            if (success) {
                createFloatingNotification('Резервная копия восстановлена', 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                createFloatingNotification('Ошибка восстановления', 'danger');
            }
        }
        
    } catch (error) {
        console.error('Backup management failed:', error);
        createFloatingNotification('Ошибка управления резервными копиями', 'danger');
    }
}

// Initialize admin functions
document.addEventListener('DOMContentLoaded', function() {
    // Update storage stats when storage is ready
    if (typeof storage !== 'undefined') {
        storage.on('dataLoaded', updateStorageStats);
        storage.on('dataSaved', updateStorageStats);
        storage.on('dataImported', updateStorageStats);
    }
});

// Export admin functions to global scope
window.updateStorageStats = updateStorageStats;
window.exportAllData = exportAllData;
window.importData = importData;
window.clearAllData = clearAllData;
window.loadUsersTable = loadUsersTable;
window.loadLogs = loadLogs;
window.manageBackups = manageBackups;
