const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    ThumbnailBuilder,
} = require('discord.js');

function formatTime(ms) {
    if (!ms || isNaN(ms) || ms < 0) return '0:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0
        ? `${h}:${(m % 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
        : `${m % 60}:${(s % 60).toString().padStart(2, '0')}`;
}

function buildPlayerContainer(player, isPaused = null) {
    const track = player.currentTrack;
    if (!track) return null;

    const paused = isPaused !== null ? isPaused : player.isPaused;
    const durationCount = track.info.length || 0;
    const durationLabel = formatTime(durationCount);

    const videoId = track.info.uri.includes('youtube.com') ? track.info.uri.split('v=')[1]?.split('&')[0] : (track.info.uri.includes('youtu.be') ? track.info.uri.split('/').pop() : null);
    const thumbnail = track.info.image || track.info.artworkUrl || track.info.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://cdn.discordapp.com/embed/avatars/0.png');

    const mainSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**✨ Title:** [${track.info.title.substring(0, 35)}${track.info.title.length > 35 ? '...' : ''}](${track.info.uri})`),
            new TextDisplayBuilder().setContent(`**✨ Author:** ${track.info.author}\n**✨ Requested by:** ${track.info.requester.displayName || track.info.requester.username || 'System'}`),
            new TextDisplayBuilder().setContent(`**✨ Duration:** \`${durationLabel}\` | **Volume:** \`${player.volume}%\``)
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail));

    return new ContainerBuilder()
        .addSectionComponents(mainSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('music_prev').setStyle(ButtonStyle.Secondary).setEmoji('⏮️'),
                new ButtonBuilder().setCustomId('music_seek_back').setStyle(ButtonStyle.Secondary).setEmoji('⏪'),
                new ButtonBuilder().setCustomId('music_toggle_pause').setStyle(ButtonStyle.Secondary).setEmoji(paused ? '▶️' : '⏸️'),
                new ButtonBuilder().setCustomId('music_seek_forward').setStyle(ButtonStyle.Secondary).setEmoji('⏩'),
                new ButtonBuilder().setCustomId('music_skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️')
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('music_vol_down').setStyle(ButtonStyle.Secondary).setEmoji('🔉'),
                new ButtonBuilder().setCustomId('music_autoplay').setStyle(ButtonStyle.Secondary).setEmoji('🔁'),
                new ButtonBuilder().setCustomId('music_like').setStyle(ButtonStyle.Secondary).setEmoji('💙'),
                new ButtonBuilder().setCustomId('music_loop').setStyle(ButtonStyle.Secondary).setEmoji('🔂'),
                new ButtonBuilder().setCustomId('music_vol_up').setStyle(ButtonStyle.Secondary).setEmoji('🔊')
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('music_queue').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
                new ButtonBuilder().setCustomId('music_filters').setStyle(ButtonStyle.Secondary).setEmoji('✨'),
                new ButtonBuilder().setCustomId('music_stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
            )
        );
}

module.exports = { buildPlayerContainer, formatTime };
