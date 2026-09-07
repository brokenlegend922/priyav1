const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

async function logToDevChannel(client, type, details) {
    const channelId = process.env.DEV_LOG_CHANNEL_ID;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const title = type === 'error' ? '❌ System Error Exception' : '🛠️ Developmental Command Used';
    const color = type === 'error' ? 'Danger' : 'Primary';

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${title}`),
            new TextDisplayBuilder().setContent(
                `**Command:** \`${details.commandName}\`\n` +
                `**User:** ${details.userTag} (\`${details.userId}\`)\n` +
                `**Guild:** ${details.guildName} (\`${details.guildId}\`)\n` +
                `**Channel:** <#${details.channelId}>`
            )
        );

    if (details.error) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Error Stack:**\n\`\`\`js\n${details.error.toString().substring(0, 500)}\n\`\`\``)
        );
    }

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

module.exports = { logToDevChannel };
