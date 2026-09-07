const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Joins your voice channel'),

    async execute(interaction) {
        const voiceChannel = interaction.member?.voice?.channel;

        if (!voiceChannel) {
            const err = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('You must be in a voice channel for me to join!'))
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        try {
            interaction.client.poru.createConnection({
                guildId: interaction.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: interaction.channel.id,
                deaf: true
            });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 Successfully joined <#${voiceChannel.id}>!`))

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            console.error(e);
            const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`Error tying to join: ${e.message}`));
            await interaction.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
