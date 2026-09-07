const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const db = require('./database');

/**
 * Applies the server-specific bot banner to a ContainerBuilder if it exists.
 * @param {ContainerBuilder} container The container to modify.
 * @param {string} guildId The ID of the guild to check identity for.
 * @returns {ContainerBuilder} The modified container.
 */
function applyServerBanner(container, guildId) {
    const identity = db.get('identity', guildId, { banner: null });
    if (identity.banner) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(identity.banner)
            )
        );
    }
    return container;
}

module.exports = { applyServerBanner };
