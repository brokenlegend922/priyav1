const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildHomeContainer } = require('../utils/helpUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays information about Sentinel Prime bot capabilities'),

    async execute(interaction) {
        const container = buildHomeContainer(interaction.guildId);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};

