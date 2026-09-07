const activeSetups = new Map();

/**
 * States: { guildId, userId, channelId, field, messageId }
 */

module.exports = {
    setSetupState: (userId, data) => activeSetups.set(userId, data),
    getSetupState: (userId) => activeSetups.get(userId),
    removeSetupState: (userId) => activeSetups.delete(userId)
};
