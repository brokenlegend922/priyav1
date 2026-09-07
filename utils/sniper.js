const snipes = new Map();
const edits = new Map();

module.exports = {
    setSnipe: (guildId, channelId, message) => {
        snipes.set(`${guildId}_${channelId}`, {
            content: message.content,
            author: message.author,
            timestamp: Date.now(),
            image: message.attachments.first()?.proxyURL || null
        });
    },
    getSnipe: (guildId, channelId) => snipes.get(`${guildId}_${channelId}`),
    
    setEdit: (guildId, channelId, oldMessage) => {
        edits.set(`${guildId}_${channelId}`, {
            content: oldMessage.content,
            author: oldMessage.author,
            timestamp: Date.now()
        });
    },
    getEdit: (guildId, channelId) => edits.get(`${guildId}_${channelId}`)
};
