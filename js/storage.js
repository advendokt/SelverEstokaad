/**
 * Centralized Data Storage System for Estakaadi Planner
 * Manages all application data through a unified API
 * Compatible with GitHub Pages static hosting
 */

class DataStorage {
    constructor() {
        this.storageFile = 'data/storage.json';
        this.localStorageKey = 'estakaadi_data';
        this.data = null;
        this.isLoaded = false;
        this.syncInterval = null;
        this.eventListeners = new Map();
    }

    /**
     * Initialize storage system
     */
    async init() {
        try {
            await this.loadData();
            this.setupAutoSync();
            this.setupEventListeners();
            console.log('✅ Storage system initialized');
            return true;
        } catch (error) {
            console.error('❌ Storage initialization failed:', error);
            await this.initializeEmptyStorage();
            return false;
        }
    }

    /**
     * Load data from JSON file or localStorage
     */
    async loadData() {
        try {
            // Try to load from JSON file first
            const response = await fetch(this.storageFile);
            if (response.ok) {
                this.data = await response.json();
                console.log('📂 Data loaded from JSON file');
            } else {
                throw new Error('JSON file not accessible');
            }
        } catch (error) {
            // Fallback to localStorage
            console.warn('⚠️ JSON file not accessible, using localStorage');
            const localData = localStorage.getItem(this.localStorageKey);
            if (localData) {
                this.data = JSON.parse(localData);
                console.log('💾 Data loaded from localStorage');
            } else {
                throw new Error('No data source available');
            }
        }
        
        this.isLoaded = true;
        this.emit('dataLoaded', this.data);
    }

    /**
     * Initialize empty storage structure
     */
    async initializeEmptyStorage() {
        this.data = {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            metadata: {
                appName: "Estakaadi Planner",
                storageFormat: "centralized",
                backupCount: 0
            },
            users: [],
            schedule: { lastModified: null, modifiedBy: null, data: [] },
            notes: { lastModified: null, modifiedBy: null, data: [] },
            gallery: { lastModified: null, modifiedBy: null, totalPhotos: 0, totalSize: 0, data: [] },
            companies: { lastModified: null, modifiedBy: null, data: [] },
            settings: { lastModified: null, modifiedBy: null, data: {} },
            logs: { lastModified: null, data: [] }
        };
        
        await this.saveToLocalStorage();
        this.isLoaded = true;
        console.log('🔧 Empty storage initialized');
    }

    /**
     * Save data to localStorage (GitHub Pages compatible)
     */
    async saveToLocalStorage() {
        try {
            this.data.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.data));
            console.log('💾 Data saved to localStorage');
            this.emit('dataSaved', this.data);
            return true;
        } catch (error) {
            console.error('❌ Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Get data from specific section
     */
    get(section, id = null) {
        if (!this.isLoaded) {
            console.warn('⚠️ Storage not loaded yet');
            return null;
        }

        if (!this.data[section]) {
            console.warn(`⚠️ Section '${section}' not found`);
            return null;
        }

        const sectionData = this.data[section].data || this.data[section];
        
        if (id && Array.isArray(sectionData)) {
            return sectionData.find(item => item.id === id);
        }
        
        return sectionData;
    }

    /**
     * Set data in specific section
     */
    async set(section, data, userId = 'system') {
        if (!this.isLoaded) {
            console.warn('⚠️ Storage not loaded yet');
            return false;
        }

        if (!this.data[section]) {
            console.warn(`⚠️ Section '${section}' not found`);
            return false;
        }

        // Update section data
        if (this.data[section].data !== undefined) {
            this.data[section].data = data;
            this.data[section].lastModified = new Date().toISOString();
            this.data[section].modifiedBy = userId;
        } else {
            this.data[section] = data;
        }

        // Log the change
        this.addLog('data_update', `Updated section: ${section}`, userId);

        // Save to localStorage
        const saved = await this.saveToLocalStorage();
        if (saved) {
            this.emit('dataChanged', { section, data, userId });
        }
        
        return saved;
    }

    /**
     * Add item to array-based section
     */
    async add(section, item, userId = 'system') {
        const currentData = this.get(section);
        if (!Array.isArray(currentData)) {
            console.warn(`⚠️ Section '${section}' is not an array`);
            return false;
        }

        // Generate ID if not present
        if (!item.id) {
            item.id = this.generateId(section);
        }

        // Add timestamps
        item.createdAt = new Date().toISOString();
        item.createdBy = userId;

        currentData.push(item);
        return await this.set(section, currentData, userId);
    }

    /**
     * Update item in array-based section
     */
    async update(section, itemId, updates, userId = 'system') {
        const currentData = this.get(section);
        if (!Array.isArray(currentData)) {
            console.warn(`⚠️ Section '${section}' is not an array`);
            return false;
        }

        const itemIndex = currentData.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            console.warn(`⚠️ Item '${itemId}' not found in '${section}'`);
            return false;
        }

        // Apply updates
        currentData[itemIndex] = {
            ...currentData[itemIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
        };

        return await this.set(section, currentData, userId);
    }

    /**
     * Delete item from array-based section
     */
    async delete(section, itemId, userId = 'system') {
        const currentData = this.get(section);
        if (!Array.isArray(currentData)) {
            console.warn(`⚠️ Section '${section}' is not an array`);
            return false;
        }

        const initialLength = currentData.length;
        const filteredData = currentData.filter(item => item.id !== itemId);
        
        if (filteredData.length === initialLength) {
            console.warn(`⚠️ Item '${itemId}' not found in '${section}'`);
            return false;
        }

        return await this.set(section, filteredData, userId);
    }

    /**
     * Search items in section
     */
    search(section, query, fields = ['title', 'name', 'description']) {
        const data = this.get(section);
        if (!Array.isArray(data)) return [];

        const searchTerm = query.toLowerCase();
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(searchTerm);
            });
        });
    }

    /**
     * Filter items in section
     */
    filter(section, filterFn) {
        const data = this.get(section);
        if (!Array.isArray(data)) return [];
        
        return data.filter(filterFn);
    }

    /**
     * Sort items in section
     */
    sort(section, sortFn) {
        const data = this.get(section);
        if (!Array.isArray(data)) return [];
        
        return [...data].sort(sortFn);
    }

    /**
     * Add log entry
     */
    addLog(action, details, userId = 'system', ipAddress = '127.0.0.1') {
        const logEntry = {
            id: this.generateId('logs'),
            timestamp: new Date().toISOString(),
            user: userId,
            action,
            details,
            ipAddress
        };

        const logs = this.get('logs') || [];
        logs.unshift(logEntry); // Add to beginning

        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(1000);
        }

        this.data.logs.data = logs;
        this.data.logs.lastModified = new Date().toISOString();
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
     * Export data for backup
     */
    exportData() {
        if (!this.isLoaded) return null;
        
        return {
            ...this.data,
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser?.username || 'unknown'
        };
    }

    /**
     * Import data from backup
     */
    async importData(importedData, userId = 'system') {
        try {
            // Validate structure
            if (!importedData.version || !importedData.metadata) {
                throw new Error('Invalid data structure');
            }

            // Create backup of current data
            const backup = this.exportData();
            if (backup) {
                const backupKey = `${this.localStorageKey}_backup_${Date.now()}`;
                localStorage.setItem(backupKey, JSON.stringify(backup));
                console.log('📦 Backup created before import');
            }

            // Import new data
            this.data = importedData;
            this.data.lastUpdated = new Date().toISOString();
            
            this.addLog('data_import', 'Data imported from backup', userId);
            
            const saved = await this.saveToLocalStorage();
            if (saved) {
                this.emit('dataImported', this.data);
                console.log('📥 Data imported successfully');
            }
            
            return saved;
        } catch (error) {
            console.error('❌ Import failed:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    getStorageStats() {
        if (!this.isLoaded) return null;

        const dataStr = JSON.stringify(this.data);
        const sizeInBytes = new Blob([dataStr]).size;
        
        return {
            totalSize: sizeInBytes,
            formattedSize: this.formatFileSize(sizeInBytes),
            sections: Object.keys(this.data).map(section => {
                const sectionData = this.data[section];
                const sectionStr = JSON.stringify(sectionData);
                const sectionSize = new Blob([sectionStr]).size;
                
                return {
                    name: section,
                    size: sectionSize,
                    formattedSize: this.formatFileSize(sectionSize),
                    itemCount: Array.isArray(sectionData.data) ? sectionData.data.length : 
                              Array.isArray(sectionData) ? sectionData.length : 1
                };
            }),
            lastUpdated: this.data.lastUpdated,
            version: this.data.version
        };
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Setup automatic sync to localStorage
     */
    setupAutoSync() {
        // Auto-save every 30 seconds if there are changes
        this.syncInterval = setInterval(async () => {
            if (this.isLoaded) {
                await this.saveToLocalStorage();
            }
        }, 30000);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Save before page unload
        window.addEventListener('beforeunload', () => {
            if (this.isLoaded) {
                this.saveToLocalStorage();
            }
        });

        // Handle storage events (multi-tab sync)
        window.addEventListener('storage', (event) => {
            if (event.key === this.localStorageKey && event.newValue) {
                try {
                    this.data = JSON.parse(event.newValue);
                    this.emit('dataSync', this.data);
                    console.log('🔄 Data synced from another tab');
                } catch (error) {
                    console.error('❌ Failed to sync data:', error);
                }
            }
        });
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
                    console.error(`❌ Event callback error for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.eventListeners.clear();
        console.log('🧹 Storage system cleaned up');
    }
}

// Create global storage instance
const storage = new DataStorage();

// Migration helpers for existing data
const DataMigration = {
    /**
     * Migrate notes from old format
     */
    async migrateNotes() {
        try {
            const response = await fetch('data/notes.json');
            if (response.ok) {
                const oldNotes = await response.json();
                if (oldNotes && Array.isArray(oldNotes)) {
                    await storage.set('notes', oldNotes, 'migration');
                    console.log('📝 Notes migrated successfully');
                }
            }
        } catch (error) {
            console.log('ℹ️ No old notes to migrate');
        }
    },

    /**
     * Migrate schedule from old format
     */
    async migrateSchedule() {
        try {
            const response = await fetch('data/schedule.json');
            if (response.ok) {
                const oldSchedule = await response.json();
                if (oldSchedule && oldSchedule.schedule) {
                    await storage.set('schedule', oldSchedule.schedule, 'migration');
                    console.log('📅 Schedule migrated successfully');
                }
            }
        } catch (error) {
            console.log('ℹ️ No old schedule to migrate');
        }
    },

    /**
     * Migrate gallery from localStorage
     */
    async migrateGallery() {
        try {
            const oldGallery = localStorage.getItem('gallery');
            if (oldGallery) {
                const galleryData = JSON.parse(oldGallery);
                if (Array.isArray(galleryData)) {
                    const galleryStats = {
                        totalPhotos: galleryData.length,
                        totalSize: galleryData.reduce((sum, photo) => sum + (photo.size || 0), 0)
                    };
                    
                    await storage.set('gallery', galleryData, 'migration');
                    
                    // Update stats
                    storage.data.gallery.totalPhotos = galleryStats.totalPhotos;
                    storage.data.gallery.totalSize = galleryStats.totalSize;
                    
                    console.log('🖼️ Gallery migrated successfully');
                    
                    // Remove old data
                    localStorage.removeItem('gallery');
                }
            }
        } catch (error) {
            console.log('ℹ️ No old gallery to migrate');
        }
    },

    /**
     * Run all migrations
     */
    async runAll() {
        console.log('🔄 Starting data migration...');
        await this.migrateNotes();
        await this.migrateSchedule();
        await this.migrateGallery();
        console.log('✅ Migration completed');
    }
};

// Initialize storage when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const initSuccess = await storage.init();
    
    if (initSuccess) {
        // Run migrations for existing data
        await DataMigration.runAll();
        
        // Set up storage stats display
        if (typeof updateStorageStats === 'function') {
            updateStorageStats();
        }
    }
});

// Export for global access
window.storage = storage;
window.DataMigration = DataMigration;
