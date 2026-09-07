const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildRoleMainMenu } = require('../utils/roleUI');
const AntiNuke = require('../utils/antinuke');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Open the Role Management dashboard'),
    async execute(interaction) {
        if (!AntiNuke.isWhitelisted(interaction.guild, interaction.user.id)) {
            const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🛠️ Unauthorized\nOnly whitelisted and authorized users can access role management.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const container = buildRoleMainMenu();
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};
