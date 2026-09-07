const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removetrack')
        .setDescription('Remove a track from the queue by its index')
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('The index of the track in the queue')
                .setRequired(true)
        ),
    async execute(interaction) {
        const player = interaction.client.poru.players.get(interaction.guild.id);
        if (!player) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ No music is currently playing!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const index = interaction.options.getInteger('index');
        if (index <= 0 || index > player.queue.length) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Invalid index! Please provide a number between 1 and ${player.queue.length}.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const removedTrack = player.queue[index - 1];
        player.queue.remove(index - 1);

        const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 Removed **${removedTrack.info.title}** from the queue.`));
        await interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
    },
};
