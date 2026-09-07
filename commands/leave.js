const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leaves the current voice channel'),

    async execute(interaction) {
        const player = interaction.client.poru.players.get(interaction.guild.id);

        if (!player) {
            const err = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('I am not currently in a voice channel!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        player.destroy();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 Successfully disconnected and left the voice channel.`));

        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};
