const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildGeneralInfo } = require('../utils/botinfoUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Shows detailed information about the bot'),
    async execute(interaction) {
        // Ensure owner is fetched even if ready event was skipped or missed
        if (!interaction.client.ownerUser && process.env.OWNER_ID) {
            interaction.client.ownerUser = await interaction.client.users.fetch(process.env.OWNER_ID).catch(() => null);
        }
        const container = buildGeneralInfo(interaction.client, interaction.guildId);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};
