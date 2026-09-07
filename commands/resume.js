const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the currently paused music playback'),
    async execute(interaction) {
        const player = interaction.client.poru.players.get(interaction.guild.id);
        if (!player) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ No music is currently playing!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!player.isPaused) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ The music is not paused!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        player.pause(false);
        const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('🎵 Successfully resumed the playback.'));

        const { buildPlayerContainer } = require('../utils/playerUI');
        const container = buildPlayerContainer(player, false);
        if (player.data.playerMessage) {
            await player.data.playerMessage.edit({ components: [container] }).catch(() => { });
        }

        await interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
    },
};
