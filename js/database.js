/**
 * Advanced Database System for Estakaadi Planner
 * Uses IndexedDB for reliable local storage with GitHub API sync
 */

class EstakaadiDatabase {
    constructor() {
        this.dbName = 'EstakaadiPlannerDB';
        this.version = 1;
        this.db = null;
        this.isReady = false;
        this.stores = {
            users: 'users',
            schedule: 'schedule', 
            notes: 'notes',
            gallery: 'gallery',
            companies: 'companies',
            settings: 'settings',
            logs: 'logs'
        };
        this.eventListeners = new Map();
    }

    /**
     * Initialize database
     */
    async init() {
        try {
            this.db = await this.openDatabase();
            this.isReady = true;
            console.log('✅ Database initialized successfully');
            
            // Initialize with default data if empty
            await this.initializeDefaultData();
            
            this.emit('ready', this.db);
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            return false;
        }
    }

    /**
     * Open IndexedDB database
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                Object.values(this.stores).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { 
                            keyPath: 'id',
                            autoIncrement: false 
                        });
                        
                        // Create indexes
                        if (storeName === 'notes') {
                            store.createIndex('user', 'createdBy', { unique: false });
                            store.createIndex('date', 'createdAt', { unique: false });
                        }
                        if (storeName === 'gallery') {
                            store.createIndex('category', 'category', { unique: false });
                            store.createIndex('company', 'company', { unique: false });
                            store.createIndex('user', 'createdBy', { unique: false });
                        }
                        if (storeName === 'logs') {
                            store.createIndex('user', 'user', { unique: false });
                            store.createIndex('action', 'action', { unique: false });
                            store.createIndex('date', 'timestamp', { unique: false });
                        }
                        
                        console.log(`📁 Created object store: ${storeName}`);
                    }
                });
            };
        });
    }

    /**
     * Initialize with default data
     */
    async initializeDefaultData() {
        try {
            // Check if users exist
            const existingUsers = await this.getAll('users');
            if (existingUsers.length === 0) {
                const defaultUsers = [
                    {
                        id: 'admin_001',
                        username: 'admin',
                        password: '321',
                        role: 'admin',
                        name: 'Администратор',
                        createdAt: new Date().toISOString(),
                        permissions: ['read', 'write', 'delete', 'manage_users']
                    },
                    {
                        id: 'maksim_001',
                        username: 'maksim',
                        password: '123',
                        role: 'admin',
                        name: 'Максим',
                        createdAt: new Date().toISOString(),
                        permissions: ['read', 'write', 'delete', 'manage_users']
                    },
                    {
                        id: 'boss_001',
                        username: 'boss',
                        password: '321',
                        role: 'admin',
                        name: 'Начальник',
                        createdAt: new Date().toISOString(),
                        permissions: ['read', 'write', 'delete', 'manage_users']
                    }
                ];

                for (const user of defaultUsers) {
                    await this.add('users', user);
                }
                console.log('👥 Default users created');
            }

            // Initialize companies if empty
            const existingCompanies = await this.getAll('companies');
            if (existingCompanies.length === 0) {
                const defaultCompanies = [
                    {
                        id: 'a_le_coq',
                        name: 'A. Le coq',
                        displayName: 'A. Le coq',
                        category: 'beverages',
                        active: true,
                        instructionsPath: 'img/instructions/brands/a-le-coq/',
                        photosPath: 'img/A. Le coq/'
                    },
                    {
                        id: 'coca_cola',
                        name: 'Coca-Cola',
                        displayName: 'Coca-Cola',
                        category: 'beverages',
                        active: true,
                        instructionsPath: 'img/instructions/brands/coca-cola/',
                        photosPath: 'img/Coca-Cola/'
                    },
                    {
                        id: 'saku',
                        name: 'Saku',
                        displayName: 'Saku',
                        category: 'beverages',
                        active: true,
                        instructionsPath: 'img/instructions/brands/saku/',
                        photosPath: 'img/Saku/'
                    },
                    {
                        id: 'prike',
                        name: 'Prike',
                        displayName: 'Prike',
                        category: 'beverages',
                        active: true,
                        instructionsPath: 'img/instructions/brands/prike/',
                        photosPath: 'img/Prike/'
                    },
                    {
                        id: 'mobec',
                        name: 'Mobec',
                        displayName: 'Mobec',
                        category: 'beverages',
                        active: true,
                        instructionsPath: 'img/instructions/brands/mobec/',
                        photosPath: 'img/Mobec/'
                    },
                    {
                        id: 'kaupmees',
                        name: 'Kaupmees',
                        displayName: 'Kaupmees',
                        category: 'retail',
                        active: true,
                        instructionsPath: 'img/instructions/brands/kaupmees/',
                        photosPath: 'img/Kaupmees/'
                    },
                    {
                        id: 'smarten',
                        name: 'Smarten',
                        displayName: 'Smarten',
                        category: 'retail',
                        active: true,
                        instructionsPath: 'img/instructions/brands/smarten/',
                        photosPath: 'img/Smarten/'
                    }
                ];

                for (const company of defaultCompanies) {
                    await this.add('companies', company);
                }
                console.log('🏢 Default companies created');
            }

            // Initialize schedule if empty
            const existingSchedule = await this.getAll('schedule');
            if (existingSchedule.length === 0) {
                const defaultSchedule = [
                    {
                        id: 'monday',
                        day: 'monday',
                        dayName: 'Понедельник',
                        companies: ['A. Le coq', 'Coca-Cola', 'Saku']
                    },
                    {
                        id: 'tuesday',
                        day: 'tuesday',
                        dayName: 'Вторник',
                        companies: ['Prike', 'Mobec']
                    },
                    {
                        id: 'wednesday',
                        day: 'wednesday',
                        dayName: 'Среда',
                        companies: ['Kaupmees', 'Smarten']
                    },
                    {
                        id: 'thursday',
                        day: 'thursday',
                        dayName: 'Четверг',
                        companies: ['A. Le coq', 'Coca-Cola']
                    },
                    {
                        id: 'friday',
                        day: 'friday',
                        dayName: 'Пятница',
                        companies: ['Saku', 'Prike']
                    },
                    {
                        id: 'saturday',
                        day: 'saturday',
                        dayName: 'Суббота',
                        companies: ['Mobec', 'Kaupmees']
                    },
                    {
                        id: 'sunday',
                        day: 'sunday',
                        dayName: 'Воскресенье',
                        companies: ['Smarten']
                    }
                ];

                for (const day of defaultSchedule) {
                    await this.add('schedule', day);
                }
                console.log('📅 Default schedule created');
            }

            // Add initial log entry
            await this.addLog('system_init', 'Database initialized with default data', 'system');

        } catch (error) {
            console.error('Error initializing default data:', error);
        }
    }

    /**
     * Generic get method
     */
    async get(storeName, id) {
        if (!this.isReady) throw new Error('Database not ready');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic getAll method
     */
    async getAll(storeName) {
        if (!this.isReady) throw new Error('Database not ready');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic add method
     */
    async add(storeName, data, userId = 'system') {
        if (!this.isReady) throw new Error('Database not ready');
        
        // Add metadata
        if (!data.id) {
            data.id = this.generateId(storeName);
        }
        data.createdAt = data.createdAt || new Date().toISOString();
        data.createdBy = data.createdBy || userId;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                this.addLog('data_create', `Added item to ${storeName}`, userId);
                this.emit('dataChanged', { action: 'add', storeName, data });
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic update method
     */
    async update(storeName, id, updates, userId = 'system') {
        if (!this.isReady) throw new Error('Database not ready');
        
        const existing = await this.get(storeName, id);
        if (!existing) throw new Error(`Item ${id} not found in ${storeName}`);

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(updated);

            request.onsuccess = () => {
                this.addLog('data_update', `Updated item in ${storeName}`, userId);
                this.emit('dataChanged', { action: 'update', storeName, data: updated });
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic delete method
     */
    async delete(storeName, id, userId = 'system') {
        if (!this.isReady) throw new Error('Database not ready');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                this.addLog('data_delete', `Deleted item from ${storeName}`, userId);
                this.emit('dataChanged', { action: 'delete', storeName, id });
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Search by index
     */
    async searchByIndex(storeName, indexName, value) {
        if (!this.isReady) throw new Error('Database not ready');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Full text search
     */
    async search(storeName, query, fields = ['title', 'name', 'content']) {
        const allItems = await this.getAll(storeName);
        const searchTerm = query.toLowerCase();
        
        return allItems.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(searchTerm);
            });
        });
    }

    /**
     * Add log entry
     */
    async addLog(action, details, userId = 'system') {
        const logEntry = {
            id: this.generateId('logs'),
            timestamp: new Date().toISOString(),
            user: userId,
            action,
            details,
            ipAddress: '127.0.0.1'
        };

        try {
            await this.add('logs', logEntry, userId);
            
            // Keep only last 1000 logs
            const allLogs = await this.getAll('logs');
            if (allLogs.length > 1000) {
                const sortedLogs = allLogs.sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                const toDelete = sortedLogs.slice(1000);
                
                for (const log of toDelete) {
                    await this.delete('logs', log.id, 'system');
                }
            }
        } catch (error) {
            // Ignore log errors to prevent infinite loops
            console.warn('Failed to add log:', error);
        }
    }

    /**
     * Generate unique ID
     */
    generateId(prefix = 'item') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Export all data
     */
    async exportData() {
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            exportedBy: 'system',
            data: {}
        };

        for (const storeName of Object.values(this.stores)) {
            exportData.data[storeName] = await this.getAll(storeName);
        }

        return exportData;
    }

    /**
     * Import data
     */
    async importData(importData, userId = 'system') {
        try {
            // Validate structure
            if (!importData.data) {
                throw new Error('Invalid import data structure');
            }

            // Clear existing data
            await this.clearAllData();

            // Import new data
            for (const [storeName, items] of Object.entries(importData.data)) {
                if (Array.isArray(items)) {
                    for (const item of items) {
                        await this.add(storeName, item, userId);
                    }
                }
            }

            await this.addLog('data_import', 'Data imported successfully', userId);
            this.emit('dataImported', importData);
            
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        for (const storeName of Object.values(this.stores)) {
            const items = await this.getAll(storeName);
            for (const item of items) {
                await this.delete(storeName, item.id, 'system');
            }
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        const stats = {
            stores: {},
            totalItems: 0,
            lastUpdated: new Date().toISOString()
        };

        for (const storeName of Object.values(this.stores)) {
            const items = await this.getAll(storeName);
            stats.stores[storeName] = {
                count: items.length,
                items: items
            };
            stats.totalItems += items.length;
        }

        return stats;
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Close database
     */
    close() {
        if (this.db) {
            this.db.close();
            this.isReady = false;
            console.log('🔒 Database closed');
        }
    }
}

// Create global database instance
const database = new EstakaadiDatabase();

// Export for global access
window.database = database;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const success = await database.init();
    if (success) {
        console.log('🎉 Database system ready!');
        
        // Migrate data from old systems
        if (typeof migrateFromOldSystems === 'function') {
            await migrateFromOldSystems();
        }
    }
});

export default EstakaadiDatabase;
