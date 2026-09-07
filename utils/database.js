const mongoose = require('mongoose');

/**
 * 🚀 Sentinel Prime Ultra-Fast MongoDB Manager
 * Performance Strategy:
 * 1. Cache EVERYTHING in a Memory Map on startup.
 * 2. Reads are O(1) (Instant) - never touches the database.
 * 3. Writes happen to memory first, then persist to DB in the background.
 */

// Define Schema
const SettingsSchema = new mongoose.Schema({
    module: { type: String, required: true },
    guildId: { type: String, required: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
});

// Optimization: Indexing for fast background lookups
SettingsSchema.index({ module: 1, guildId: 1 }, { unique: true });

const Settings = mongoose.model('Settings', SettingsSchema);

class MongoManager {
    constructor() {
        this.cache = new Map(); // module.guildId -> settings
        this.isReady = false;
    }

    /**
     * Connects to MongoDB and preloads all settings into memory.
     */
    async connect(uri) {
        if (!uri) {
            console.error('❌ MONGODB_URI is missing in .env!');
            return;
        }

        try {
            await mongoose.connect(uri, { 
                family: 4 // Force IPv4 to avoid DNS/IPv6 issues
            });
            console.log('✅ Connected to MongoDB Atlas.');

            // Preload everything
            const allSettings = await Settings.find({});
            for (const item of allSettings) {
                this.cache.set(`${item.module}.${item.guildId}`, item.settings);
            }
            
            this.isReady = true;
            console.log(`🚀 Memory cache primed with ${allSettings.length} guild configurations.`);
        } catch (err) {
            console.error('❌ MongoDB Connection Error:', err);
        }
    }

    /**
     * Instant lookup from memory cache
     */
    get(module, guildId, defaults = {}) {
        const key = `${module}.${guildId}`;
        const cached = this.cache.get(key);
        
        // Deep merge with defaults to ensure reliability
        return cached ? { ...defaults, ...cached } : defaults;
    }

    /**
     * Non-blocking write: Updates cache instantly, saves to DB in background
     */
    async set(module, guildId, data) {
        const key = `${module}.${guildId}`;
        
        // 1. Update Memory (Instant - This makes the bot feel fast)
        this.cache.set(key, data);

        // 2. Persist to MongoDB in background
        try {
            await Settings.findOneAndUpdate(
                { module, guildId },
                { settings: data },
                { upsert: true, returnDocument: 'after' }
            );
        } catch (err) {
            console.error(`❌ Background save error for ${module}/${guildId}:`, err);
        }
    }

    /**
     * Deletes all settings for a specific guild across all modules
     */
    async clearAllGuildData(guildId) {
        // Clear from cache
        for (const [key, _] of this.cache) {
            if (key.endsWith(`.${guildId}`)) {
                this.cache.delete(key);
            }
        }
        // Clear from Database
        await Settings.deleteMany({ guildId });
        console.log(`🧹 Database & Cache cleared for guild ID: ${guildId}`);
    }

    /**
     * Returns all unique guild IDs present in the cache/database
     */
    getAllStoredGuildIds() {
        const guildIds = new Set();
        for (const key of this.cache.keys()) {
            const parts = key.split('.');
            if (parts.length > 1) {
                guildIds.add(parts[parts.length - 1]);
            }
        }
        return Array.from(guildIds);
    }

    /**
     * Deletes settings instantly
     */
    async delete(module, guildId) {
        this.cache.delete(`${module}.${guildId}`);
        await Settings.deleteOne({ module, guildId });
    }
}

module.exports = new MongoManager();
