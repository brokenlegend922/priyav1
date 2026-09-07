const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const { buildSetupEmbed } = require('../utils/ticketUI');

const { buildManageDashboard } = require('../utils/ticketUI');
const { getSettings } = require('../utils/ticketData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const { buildMainManageDashboard } = require('../utils/ticketUI');
            const { getSettings } = require('../utils/ticketData');

            const settings = getSettings(interaction.guild.id);
            const container = buildMainManageDashboard(settings);


            // For prefix commands (interactionMock), we want to send to channel
            if (interaction.isMock) {
                await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
                return;
            }

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to open ticket management.', ephemeral: true });
        }
    }
};

