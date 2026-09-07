const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Check how long the bot has been active'),

    async execute(interaction) {
        const totalSeconds = (interaction.client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = Math.floor(totalSeconds % 60);

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ℹ️ Bot Uptime`),
                new TextDisplayBuilder().setContent(`I have been active for:\n**${days}d ${hours}h ${minutes}m ${seconds}s**`)
            );

        return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
    },
};
