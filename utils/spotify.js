const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_ID,
    clientSecret: process.env.SPOTIFY_SECRET
});

let tokenExpiry = 0;

async function ensureToken() {
    if (Date.now() < tokenExpiry) return;

    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        tokenExpiry = Date.now() + (data.body['expires_in'] * 1000) - 60000;
        console.log('[SPOTIFY] Access token refreshed.');
    } catch (error) {
        console.error('[SPOTIFY] Could not refresh access token', error);
    }
}

async function resolveSpotify(url) {
    await ensureToken();

    try {
        if (url.includes('/track/')) {
            const id = url.split('/track/')[1].split('?')[0];
            const data = await spotifyApi.getTrack(id);
            const track = data.body;
            return {
                type: 'track',
                tracks: [{ name: track.name, artist: track.artists[0].name }],
                thumbnail: track.album.images[0]?.url
            };
        }

        if (url.includes('/album/')) {
            const id = url.split('/album/')[1].split('?')[0];
            const data = await spotifyApi.getAlbum(id);
            const album = data.body;
            return {
                type: 'playlist',
                name: album.name,
                tracks: album.tracks.items.map(t => ({ name: t.name, artist: t.artists[0].name })),
                thumbnail: album.images[0]?.url
            };
        }

        if (url.includes('/playlist/')) {
            const id = url.split('/playlist/')[1].split('?')[0];
            const tracks = [];
            let offset = 0;
            let limit = 100;
            let total = 1;
            let playlistName = 'Spotify Playlist';
            let thumbnail = '';

            const initialData = await spotifyApi.getPlaylist(id);
            playlistName = initialData.body.name;
            thumbnail = initialData.body.images[0]?.url;
            total = initialData.body.tracks.total;

            while (tracks.length < total && tracks.length < 500) { // Limit to 500 for performance
                const data = await spotifyApi.getPlaylistTracks(id, { offset, limit });
                tracks.push(...data.body.items.filter(i => i.track).map(i => ({ name: i.track.name, artist: i.track.artists[0].name })));
                offset += limit;
            }

            return {
                type: 'playlist',
                name: playlistName,
                tracks: tracks,
                thumbnail: thumbnail
            };
        }
    } catch (e) {
        console.error('[SPOTIFY] Resolve Error:', e);
        return null;
    }

    return null;
}

module.exports = { resolveSpotify };
