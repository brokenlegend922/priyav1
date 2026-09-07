const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const AntiMod = require('../utils/automod');
const { buildAutomodDashboard, buildPunishmentContainer } = require('../utils/automodUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Manage the Bot Automod settings (Unified Dashboard)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Enforce Admin Only Access (Bot Owner, Server Owner, or Antinuke Extra Owner)
        if (!AntiMod.isAdmin(interaction.member)) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### 🛡️ **Unauthorized Access**\nOnly the Server Owner, Bot Developer, or Antinuke Extra Owners can manage Automod.')
            );
            return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const settings = AntiMod.getSettings(interaction.guildId);
        const container = buildAutomodDashboard(interaction.guild, settings);

        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
