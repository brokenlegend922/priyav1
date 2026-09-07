const { Events, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: Events.GuildDelete,
    async execute(guild) {
        if (!guild.name) return; // Happens if the bot is removed while offline or during cache issues

        console.log(`🚪 Bot removed from server: ${guild.name} (${guild.id})`);

        // --- AUTOMATIC DATABASE CLEANUP ---
        await db.clearAllGuildData(guild.id);

        // 📝 LOG DEPARTURE
        const LOG_CHANNEL_ID = process.env.GUILD_LOG_CHANNEL_ID || process.env.DEV_LOG_CHANNEL_ID;
        if (!LOG_CHANNEL_ID) return;

        const client = guild.client;
        const channel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        
        if (channel) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 📤 Bot Removed from a Server`),
                    new TextDisplayBuilder().setContent(
                        `**Server Information**\n` +
                        `❌ **Name:** ${guild.name}\n` +
                        `🆔 **ID:** \`${guild.id}\`\n\n` +
                        `**Cleanup Status:** ✅ All server configurations have been wiped from MongoDB.`
                    )
                );

            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
    }
};
