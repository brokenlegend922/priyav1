const db = require('./database');

class AutoRole {
    static getSettings(guildId) {
        const defaultSettings = {
            enabled: false,
            roles: {
                all: [],
                humans: [],
                bots: []
            }
        };

        return db.get('autorole', guildId, defaultSettings);
    }

    static saveSettings(guildId, settings) {
        db.set('autorole', guildId, settings);
    }
}

module.exports = AutoRole;
