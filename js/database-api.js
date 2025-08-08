/**
 * Database Integration Layer
 * Provides unified API for all data operations
 */

class DatabaseAPI {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.fallbackStorage = null;
    }

    async init() {
        try {
            // Try to use IndexedDB first
            if (typeof database !== 'undefined') {
                this.db = database;
                await this.waitForDatabase();
                this.isReady = true;
                console.log('✅ Using IndexedDB for data storage');
            } else {
                throw new Error('IndexedDB not available');
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB failed, falling back to localStorage');
            this.fallbackStorage = typeof storage !== 'undefined' ? storage : null;
            this.isReady = true;
        }

        // Migrate existing data
        await this.migrateExistingData();
        
        return this.isReady;
    }

    async waitForDatabase() {
        if (this.db && this.db.isReady) return;
        
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.db && this.db.isReady) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    // Unified API methods
    async getUsers() {
        if (this.db && this.db.isReady) {
            return await this.db.getAll('users');
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.get('users') || [];
        }
        return [];
    }

    async saveUser(userData) {
        if (this.db && this.db.isReady) {
            if (userData.id) {
                return await this.db.update('users', userData.id, userData, userData.username);
            } else {
                return await this.db.add('users', userData, userData.username);
            }
        } else if (this.fallbackStorage) {
            if (userData.id) {
                return await this.fallbackStorage.update('users', userData.id, userData, userData.username);
            } else {
                return await this.fallbackStorage.add('users', userData, userData.username);
            }
        }
        return false;
    }

    async getNotes() {
        if (this.db && this.db.isReady) {
            return await this.db.getAll('notes');
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.get('notes') || [];
        }
        return [];
    }

    async saveNote(noteData, userId) {
        if (this.db && this.db.isReady) {
            if (noteData.id) {
                return await this.db.update('notes', noteData.id, noteData, userId);
            } else {
                return await this.db.add('notes', noteData, userId);
            }
        } else if (this.fallbackStorage) {
            if (noteData.id) {
                return await this.fallbackStorage.update('notes', noteData.id, noteData, userId);
            } else {
                return await this.fallbackStorage.add('notes', noteData, userId);
            }
        }
        return false;
    }

    async deleteNote(noteId, userId) {
        if (this.db && this.db.isReady) {
            return await this.db.delete('notes', noteId, userId);
        } else if (this.fallbackStorage) {
            return await this.fallbackStorage.delete('notes', noteId, userId);
        }
        return false;
    }

    async getSchedule() {
        if (this.db && this.db.isReady) {
            return await this.db.getAll('schedule');
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.get('schedule') || [];
        }
        return [];
    }

    async saveSchedule(scheduleData, userId) {
        if (this.db && this.db.isReady) {
            // Clear existing schedule
            const existing = await this.db.getAll('schedule');
            for (const item of existing) {
                await this.db.delete('schedule', item.id, userId);
            }
            // Add new schedule
            for (const day of scheduleData) {
                await this.db.add('schedule', day, userId);
            }
            return true;
        } else if (this.fallbackStorage) {
            return await this.fallbackStorage.set('schedule', scheduleData, userId);
        }
        return false;
    }

    async getGallery() {
        if (this.db && this.db.isReady) {
            return await this.db.getAll('gallery');
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.get('gallery') || [];
        }
        return [];
    }

    async savePhoto(photoData, userId) {
        if (this.db && this.db.isReady) {
            return await this.db.add('gallery', photoData, userId);
        } else if (this.fallbackStorage) {
            return await this.fallbackStorage.add('gallery', photoData, userId);
        }
        return false;
    }

    async deletePhoto(photoId, userId) {
        if (this.db && this.db.isReady) {
            return await this.db.delete('gallery', photoId, userId);
        } else if (this.fallbackStorage) {
            return await this.fallbackStorage.delete('gallery', photoId, userId);
        }
        return false;
    }

    async getCompanies() {
        if (this.db && this.db.isReady) {
            return await this.db.getAll('companies');
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.get('companies') || [];
        }
        return [];
    }

    async getLogs() {
        if (this.db && this.db.isReady) {
            const logs = await this.db.getAll('logs');
            return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.get('logs') || [];
        }
        return [];
    }

    async addLog(action, details, userId = 'system') {
        if (this.db && this.db.isReady) {
            return await this.db.addLog(action, details, userId);
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.addLog(action, details, userId);
        }
    }

    async exportData() {
        if (this.db && this.db.isReady) {
            return await this.db.exportData();
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.exportData();
        }
        return null;
    }

    async importData(data, userId) {
        if (this.db && this.db.isReady) {
            return await this.db.importData(data, userId);
        } else if (this.fallbackStorage) {
            return await this.fallbackStorage.importData(data, userId);
        }
        return false;
    }

    async getStorageStats() {
        if (this.db && this.db.isReady) {
            const stats = await this.db.getStorageStats();
            return {
                totalSize: 0, // IndexedDB doesn't provide size info easily
                formattedSize: 'N/A',
                sections: Object.keys(stats.stores).map(storeName => ({
                    name: storeName,
                    itemCount: stats.stores[storeName].count,
                    size: 0,
                    formattedSize: 'N/A'
                })),
                lastUpdated: stats.lastUpdated,
                version: '2.0.0'
            };
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.getStorageStats();
        }
        return null;
    }

    async search(storeName, query, fields) {
        if (this.db && this.db.isReady) {
            return await this.db.search(storeName, query, fields);
        } else if (this.fallbackStorage) {
            return this.fallbackStorage.search(storeName, query, fields);
        }
        return [];
    }

    // Migration from old systems
    async migrateExistingData() {
        if (!this.db || !this.db.isReady) return;

        try {
            console.log('🔄 Starting data migration...');

            // Migrate from localStorage
            await this.migrateFromLocalStorage();
            
            // Migrate from old storage system
            await this.migrateFromOldStorage();
            
            // Migrate from JSON files
            await this.migrateFromJSONFiles();

            console.log('✅ Data migration completed');
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }

    async migrateFromLocalStorage() {
        try {
            // Migrate notes
            const oldNotes = localStorage.getItem('notes');
            if (oldNotes) {
                const notes = JSON.parse(oldNotes);
                if (Array.isArray(notes) && notes.length > 0) {
                    const existingNotes = await this.db.getAll('notes');
                    if (existingNotes.length === 0) {
                        for (const note of notes) {
                            await this.db.add('notes', {
                                ...note,
                                id: note.id || this.db.generateId('note')
                            }, 'migration');
                        }
                        console.log('📝 Migrated notes from localStorage');
                    }
                }
            }

            // Migrate gallery
            const oldGallery = localStorage.getItem('gallery');
            if (oldGallery) {
                const gallery = JSON.parse(oldGallery);
                if (Array.isArray(gallery) && gallery.length > 0) {
                    const existingGallery = await this.db.getAll('gallery');
                    if (existingGallery.length === 0) {
                        for (const photo of gallery) {
                            await this.db.add('gallery', {
                                ...photo,
                                id: photo.id || this.db.generateId('photo')
                            }, 'migration');
                        }
                        console.log('🖼️ Migrated gallery from localStorage');
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ localStorage migration failed:', error);
        }
    }

    async migrateFromOldStorage() {
        try {
            if (typeof storage !== 'undefined' && storage.isLoaded) {
                // Migrate all sections
                const sections = ['notes', 'gallery', 'schedule'];
                for (const section of sections) {
                    const oldData = storage.get(section);
                    if (oldData && Array.isArray(oldData) && oldData.length > 0) {
                        const existingData = await this.db.getAll(section);
                        if (existingData.length === 0) {
                            for (const item of oldData) {
                                await this.db.add(section, {
                                    ...item,
                                    id: item.id || this.db.generateId(section)
                                }, 'migration');
                            }
                            console.log(`📦 Migrated ${section} from old storage`);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Old storage migration failed:', error);
        }
    }

    async migrateFromJSONFiles() {
        try {
            // Try to load schedule from JSON
            const response = await fetch('data/schedule.json');
            if (response.ok) {
                const scheduleData = await response.json();
                if (scheduleData.schedule) {
                    const existingSchedule = await this.db.getAll('schedule');
                    if (existingSchedule.length === 0) {
                        for (const day of scheduleData.schedule) {
                            await this.db.add('schedule', {
                                ...day,
                                id: day.day
                            }, 'migration');
                        }
                        console.log('📅 Migrated schedule from JSON file');
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ JSON migration failed:', error);
        }
    }

    // Event delegation
    on(event, callback) {
        if (this.db && this.db.on) {
            this.db.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.db && this.db.off) {
            this.db.off(event, callback);
        }
    }
}

// Create global API instance
const dbAPI = new DatabaseAPI();

// Export for global access
window.dbAPI = dbAPI;

// Auto-initialize
document.addEventListener('DOMContentLoaded', async () => {
    await dbAPI.init();
    console.log('🎯 Database API ready!');
});

export default DatabaseAPI;
