const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current music playback'),
    async execute(interaction) {
        const player = interaction.client.poru.players.get(interaction.guild.id);
        if (!player) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ No music is currently playing!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (player.isPaused) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ The music is already paused!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        player.pause(true);
        const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('🎵 Successfully paused the playback.'));

        // Find if we have a UI refresh utility or just update directly
        const { buildPlayerContainer } = require('../utils/playerUI');
        const container = buildPlayerContainer(player, true);
        if (player.data.playerMessage) {
            await player.data.playerMessage.edit({ components: [container] }).catch(() => { });
        }

        await interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
    },
};
