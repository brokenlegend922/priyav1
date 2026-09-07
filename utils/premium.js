const db = require('./database');

class Premium {
    static getPremiumData() {
        return db.get('premium', 'global', { guilds: {}, users: {} });
    }

    static savePremiumData(data) {
        db.set('premium', 'global', data);
    }

    /**
     * @param {string} guildId 
     * @returns {boolean}
     */
    static isPremiumGuild(guildId) {
        const data = this.getPremiumData();
        const guild = data.guilds[guildId];
        if (!guild) return false;

        // Check expiry
        if (guild.expiry !== -1 && guild.expiry < Date.now()) {
            this.removePremiumGuild(guildId);
            return false;
        }
        return true;
    }

    /**
     * @param {string} userId 
     * @returns {boolean}
     */
    static isPremiumUser(userId) {
        const data = this.getPremiumData();
        const user = data.users[userId];
        if (!user) return false;

        // Check expiry
        if (user.expiry !== -1 && user.expiry < Date.now()) {
            this.removePremiumUser(userId);
            return false;
        }
        return true;
    }

    static addPremiumGuild(guildId, durationDays = -1) {
        const data = this.getPremiumData();
        const expiry = durationDays === -1 ? -1 : Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        data.guilds[guildId] = { addedAt: Date.now(), expiry };
        this.savePremiumData(data);
    }

    static removePremiumGuild(guildId) {
        const data = this.getPremiumData();
        delete data.guilds[guildId];
        this.savePremiumData(data);
    }

    static addPremiumUser(userId, durationDays = -1) {
        const data = this.getPremiumData();
        const expiry = durationDays === -1 ? -1 : Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        data.users[userId] = { addedAt: Date.now(), expiry };
        this.savePremiumData(data);
    }

    static removePremiumUser(userId) {
        const data = this.getPremiumData();
        delete data.users[userId];
        this.savePremiumData(data);
    }

    static getStatus(id) {
        const data = this.getPremiumData();
        const premium = data.guilds[id] || data.users[id];
        if (!premium) return null;
        return premium;
    }
}

module.exports = Premium;
