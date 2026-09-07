const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const AntiNuke = require('../utils/antinuke');
const { buildDashboardContainer } = require('../utils/antinukeUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('Open the Antinuke Dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Only the REAL owner or extra owners should access the dashboard for security
        // But for standard users, Administrator is the check in SlashCommand.
        // We'll add an extra check for safety.

        const settings = AntiNuke.getSettings(interaction.guild.id);
        const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !AntiNuke.isWhitelisted(interaction.guild, interaction.user.id)) {
            const err = { type: 10, components: [{ type: 12, components: [{ type: 11, content: '### 🛡️ Unauthorized\nOnly Administrators or whitelisted users can access the Security Dashboard.' }] }] };
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const container = buildDashboardContainer(interaction.guild, settings);

        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};
