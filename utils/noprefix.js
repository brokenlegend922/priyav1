const db = require('./database');

class NoPrefix {
    static getNoPrefixData() {
        return db.get('noprefix', 'global', { users: {} });
    }

    static addUser(userId, durationDays = -1) {
        const data = this.getNoPrefixData();
        const expiry = durationDays === -1 ? -1 : Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        data.users[userId] = { addedAt: Date.now(), expiry };
        db.set('noprefix', 'global', data);
    }

    static removeUser(userId) {
        const data = this.getNoPrefixData();
        delete data.users[userId];
        db.set('noprefix', 'global', data);
    }

    static isNoPrefix(userId) {
        const data = this.getNoPrefixData();
        const user = data.users[userId];
        if (!user) return false;

        if (user.expiry !== -1 && user.expiry < Date.now()) {
            this.removeUser(userId); 
            return false;
        }
        return true;
    }

    static getData(userId) {
        const data = this.getNoPrefixData();
        return data.users[userId] || null;
    }

    static getAllUsers() {
        const data = this.getNoPrefixData();
        return Object.keys(data.users);
    }
}

module.exports = NoPrefix;
