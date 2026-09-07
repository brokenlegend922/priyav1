const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Displays bot statistics'),

    async execute(interaction) {
        const ping = interaction.client.ws.ping;
        const days = Math.floor(interaction.client.uptime / 86400000);
        const hours = Math.floor((interaction.client.uptime % 86400000) / 3600000);
        const minutes = Math.floor((interaction.client.uptime % 3600000) / 60000);
        const uptimeStr = `${days}d ${hours}h ${minutes}m`;
        const serverCount = interaction.client.guilds.cache.size;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 📊 Sentinel Prime - Stats')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Ping:** \`${ping}ms\``),
                new TextDisplayBuilder().setContent(`**Uptime:** \`${uptimeStr}\``),
                new TextDisplayBuilder().setContent(`**Servers:** \`${serverCount}\``)
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
