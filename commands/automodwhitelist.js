const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const AntiMod = require('../utils/automod');
const { buildWhitelistContainer } = require('../utils/automodUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automodwhitelist')
        .setDescription('Directly manage the Automod bypass list')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Enforce Admin Only Access (Bot Owner, Server Owner, or Antinuke Extra Owner)
        if (!AntiMod.isAdmin(interaction.member)) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent('🛡️ **Unauthorized Access**\nOnly the Server Owner, Bot Developer, or Antinuke Extra Owners can manage Automod.')
            );
            return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const settings = AntiMod.getSettings(interaction.guildId);
        const container = buildWhitelistContainer(interaction.guild, settings);

        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
