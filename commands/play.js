const {
    SlashCommandBuilder,
} = require('discord.js');
const { getDetails } = require('spotify-url-info')(require('node-fetch'));

const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ThumbnailBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');
const { formatTime } = require('../utils/playerUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song using the Music module')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('The song to play')
                .setRequired(true)
        ),

    async execute(interaction) {
        const songQuery = interaction.options.getString('song');
        const voiceChannel = interaction.member?.voice?.channel;

        if (!voiceChannel) {
            const err = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('ℹ️ You must be in a voice channel to play music!'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        try {
            await interaction.deferReply();

            let finalQuery = songQuery;
            let isSpotify = false;
            let spotifyTracks = [];

            const player = interaction.client.poru.createConnection({
                guildId: interaction.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: interaction.channel.id,
                deaf: true
            });

            if (!player.data) player.data = {};
            if (player.data.autoplayEnabled === undefined) player.data.autoplayEnabled = false;

            let tracksAdded = [];
            let thumbnail = "https://cdn.discordapp.com/embed/avatars/0.png";

            // AGGRESSIVE YOUTUBE BRIDGE (Proven Stable)
            const { resolveSpotify } = require('../utils/spotify');
            if (songQuery.includes('spotify.com')) {
                const searchRes = await resolveSpotify(songQuery);
                if (searchRes) {
                    const loadContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔎 **Loading ${searchRes.type === 'playlist' ? searchRes.tracks.length : '1'} track(s) from Spotify...**`));
                    await interaction.editReply({ components: [loadContainer] });

                    if (searchRes.type === 'track') {
                        const trk = searchRes.tracks[0];
                        const q = `${trk.name} ${trk.artist}`;
                        const resolveRes = await interaction.client.poru.resolve({ query: q, source: 'ytsearch', requester: interaction.user });
                        if (resolveRes && resolveRes.tracks?.[0]) {
                            const track = resolveRes.tracks[0];
                            track.info.requester = interaction.user;
                            player.queue.add(track);
                            tracksAdded.push(track);
                            if (!player.playing && !player.paused) player.play();
                            return handleSuccess(interaction, player, resolveRes, tracksAdded, searchRes.thumbnail);
                        }
                    } else if (searchRes.type === 'playlist') {
                        const total = searchRes.tracks.length;
                        for (let i = 0; i < total; i++) {
                            const t = searchRes.tracks[i];
                            const q = `${t.name} ${t.artist}`;
                            const resolveRes = await interaction.client.poru.resolve({ query: q, source: 'ytsearch', requester: interaction.user });

                            if (resolveRes && resolveRes.tracks?.[0]) {
                                const trk = resolveRes.tracks[0];
                                trk.info.requester = interaction.user;
                                player.queue.add(trk);
                                tracksAdded.push(trk);
                                if (i === 0 && !player.playing && !player.paused) player.play();
                            }

                            if (i % 10 === 0 && i > 0) {
                                const progContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔎 **Bridging Spotify Playlist:** \`${i}/${total}\` songs processed...`));
                                await interaction.editReply({ components: [progContainer] }).catch(() => { });
                            }
                        }
                        const res = { loadType: 'playlist', tracks: tracksAdded, playlistInfo: { name: searchRes.name } };
                        return handleSuccess(interaction, player, res, tracksAdded, searchRes.thumbnail);
                    }
                }
            }

            // Fallback for Soundcloud/Apple (legacy method)
            if (songQuery.includes('soundcloud.com') || songQuery.includes('apple.com')) {
                try {
                    const details = await getDetails(songQuery);
                    if (details.tracks && details.tracks.length > 0) {
                        // ... legacy loop ...
                        for (let i = 0; i < details.tracks.length; i++) {
                            const t = details.tracks[i];
                            const q = `${t.name} ${t.artists?.[0]?.name || t.artist || ''}`;
                            const searchRes = await interaction.client.poru.resolve({ query: q, source: 'ytsearch', requester: interaction.user });
                            if (searchRes && searchRes.tracks?.[0]) {
                                const trk = searchRes.tracks[0];
                                trk.info.requester = interaction.user;
                                player.queue.add(trk);
                                tracksAdded.push(trk);
                                if (i === 0 && !player.playing && !player.paused) player.play();
                            }
                        }
                        const res = { loadType: 'playlist', tracks: tracksAdded, playlistInfo: { name: 'Bridged Music' } };
                        return handleSuccess(interaction, player, res, tracksAdded, thumbnail);
                    }
                } catch (e) { }
            }

            const res = await interaction.client.poru.resolve({
                query: finalQuery,
                source: isSpotify || !songQuery.includes('http') ? 'ytsearch' : undefined,
                requester: interaction.user
            });

            if (res.loadType === 'error' || res.loadType === 'empty') {
                const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`Could not find any songs for \`${songQuery}\`. \n-# Search Provider: ${res.loadType.toUpperCase()}`));
                return interaction.editReply({ components: [errContainer] });
            }

            // Extra safety: Always favor the first track for search results
            if (res.loadType === 'playlist' && !songQuery.includes('list=')) {
                res.loadType = 'track';
            }

            return handleSuccess(interaction, player, res, tracksAdded, thumbnail);
        } catch (e) {
            console.error('[PLAY ERROR]:', e);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Processing Error:** ${e.message}`));
            if (interaction.deferred) return interaction.editReply({ components: [err] });
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    }
};

async function handleSuccess(interaction, player, res, tracksAdded, thumbnail) {
    const { MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ThumbnailBuilder, SeparatorSpacingSize } = require('discord.js');
    const { formatTime } = require('../utils/playerUI');

    try {
        if (tracksAdded.length === 0) {
            if (res.loadType === 'playlist') {
                for (const track of res.tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                    tracksAdded.push(track);
                }
                const firstTrack = res.tracks[0];
                const videoId = firstTrack.info.uri.includes('youtube.com') ? firstTrack.info.uri.split('v=')[1]?.split('&')[0] : (firstTrack.info.uri.includes('youtu.be') ? firstTrack.info.uri.split('/').pop() : null);
                thumbnail = firstTrack.info.image || firstTrack.info.artworkUrl || firstTrack.info.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : thumbnail);
            } else {
                const track = res.tracks[0];
                track.info.requester = interaction.user;
                player.queue.add(track);
                tracksAdded.push(track);
                const videoId = track.info.uri.includes('youtube.com') ? track.info.uri.split('v=')[1]?.split('&')[0] : (track.info.uri.includes('youtu.be') ? track.info.uri.split('/').pop() : null);
                thumbnail = track.info.image || track.info.artworkUrl || track.info.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : thumbnail);
            }
        }

        const track = res.tracks[0];
        let sourceIcon = '🔍';
        const sName = track.info.sourceName?.toLowerCase() || '';
        if (sName.includes('youtube')) sourceIcon = '✨';
        else if (sName.includes('spotify')) sourceIcon = '✨';
        else if (sName.includes('soundcloud')) sourceIcon = '☁️';

        const position = player.queue.length - tracksAdded.length;

        let description = `> • **Author:** ${track.info.author}\n` +
            `> • **Duration:** \`${formatTime(track.info.length)}\` \n` +
            `> • **Source:** ${sourceIcon} ${sName.charAt(0).toUpperCase() + sName.slice(1) || 'Unknown'}\n` +
            `> • **Requester:** ${interaction.user.displayName || interaction.user.username}\n` +
            `> • **Position:** \`${position < 0 ? 0 : position}\``;

        let titleContent = `### 🎵 Enqueued [${track.info.title.substring(0, 30)}${track.info.title.length > 30 ? '...' : ''}](${track.info.uri})`;
        if (res.loadType === 'playlist') {
            titleContent = `### 🎵 Enqueued Playlist: ${res.playlistInfo.name}`;
            description = `• **Tracks:** \`${res.tracks.length}\`\n` + description;
        }

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_upcoming_disabled')
                .setLabel('Add Upcoming')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );

        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(titleContent),
                new TextDisplayBuilder().setContent(description)
            );
        if (thumbnail) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail));

        const container = new ContainerBuilder()
            .addSectionComponents(section)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addActionRowComponents(disabledRow);

        await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

        if (!player.isPlaying && !player.isPaused) {
            player.play();
        }
    } catch (e) {
        console.error(e);
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Error:** ${e.message}`));
        try {
            await interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        } catch (err) { }
    }
}








