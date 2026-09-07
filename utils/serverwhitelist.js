const db = require('./database');

/**
 * Checks if a server is whitelisted.
 * @param {string} guildId The ID of the guild to check.
 * @returns {boolean}
 */
function isServerWhitelisted(guildId) {
    const data = db.get('server_whitelist', 'global', { ids: [] });
    return data.ids.includes(guildId);
}

/**
 * Adds a server to the whitelist.
 * @param {string} guildId The ID of the guild to whitelist.
 */
function whitelistServer(guildId) {
    const data = db.get('server_whitelist', 'global', { ids: [] });
    if (!data.ids.includes(guildId)) {
        data.ids.push(guildId);
        db.set('server_whitelist', 'global', data);
    }
}

/**
 * Removes a server from the whitelist.
 * @param {string} guildId The ID of the guild to un-whitelist.
 */
function unwhitelistServer(guildId) {
    const data = db.get('server_whitelist', 'global', { ids: [] });
    data.ids = data.ids.filter(id => id !== guildId);
    db.set('server_whitelist', 'global', data);
}

module.exports = { isServerWhitelisted, whitelistServer, unwhitelistServer };
