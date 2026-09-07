const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder
} = require('discord.js');

const hasThumbnail = typeof ThumbnailBuilder !== 'undefined';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current music queue (Music module)'),

    async execute(interaction) {
        const player = interaction.client.poru.players.get(interaction.guild.id);
        const { MessageFlags } = require('discord.js');

        if (!player) {
            const err = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('No music is currently playing!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const queueList = player.queue.length > 0
            ? player.queue.map((track, i) => `**${i + 1}.** ${track.info.title}`).slice(0, 10).join('\n')
            : (player.data?.autoplayEnabled ? 'Queue is empty (Autoplay is enabled)' : 'Queue is empty');

        const nowPlaying = player.currentTrack ? `**Now Playing:** ${player.currentTrack.info.title}\n\n` : '';

        const currentTrack = player.currentTrack;
        const videoId = currentTrack?.info?.uri?.includes('youtube.com') ? currentTrack.info.uri.split('v=')[1]?.split('&')[0] : (currentTrack?.info?.uri?.includes('youtu.be') ? currentTrack.info.uri.split('/').pop() : null);
        const thumbnail = currentTrack?.info?.image || currentTrack?.info?.artworkUrl || currentTrack?.info?.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://cdn.discordapp.com/embed/avatars/0.png');

        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${nowPlaying}${queueList}`)
            );

        if (thumbnail) {
            try {
                section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail));
            } catch (e) { }
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🎵 Music Player: Queue`)
            )
            .addSectionComponents(section)
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );


        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });
    },
};
