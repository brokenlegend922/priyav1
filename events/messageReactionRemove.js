const { Events } = require('discord.js');
const giveawayManager = require('../utils/giveawayManager');

module.exports = {
    name: Events.MessageReactionRemove,
    async execute(reaction, user) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the reaction:', error);
                return;
            }
        }
        await giveawayManager.handleReactionRemove(reaction, user);
    },
};
