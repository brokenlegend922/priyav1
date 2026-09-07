const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggles the autoplay feature of the music player'),

    async execute(interaction) {
        const player = interaction.client.poru.players.get(interaction.guild.id);

        if (!player) {
            const err = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('No music is currently playing!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const autoplay = player.data.autoplayEnabled || false;
        player.data.autoplayEnabled = !autoplay;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🎵 Autoplay is now **${player.data.autoplayEnabled ? 'Enabled' : 'Disabled'}**.`));


        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};
