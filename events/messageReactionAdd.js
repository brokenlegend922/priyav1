const { Events } = require('discord.js');
const giveawayManager = require('../utils/giveawayManager');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the reaction:', error);
                return;
            }
        }
        await giveawayManager.handleReactionAdd(reaction, user);
    },
};
