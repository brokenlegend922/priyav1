const {
    ContainerBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
} = require('discord.js');

/**
 * Builds a filter selection container
 */
function buildFilterContainer() {
    const filterOptions = [
        { label: 'Reset Filters', value: 'filter_reset', description: 'Clear all active music filters', emoji: '🧹' },
        { label: 'Bassboost', value: 'filter_bassboost', description: 'Enhance the bass', emoji: '🔊' },
        { label: 'Nightcore', value: 'filter_nightcore', description: 'Faster and higher pitch', emoji: '🌙' },
        { label: 'Vaporwave', value: 'filter_vaporwave', description: 'Slow and chilled vibe', emoji: '🌌' },
        { label: '8D Audio', value: 'filter_8d', description: 'Immersive rotating sound', emoji: '🎧' },
        { label: 'Soft', value: 'filter_soft', description: 'Gentle and smooth audio', emoji: '☁️' },
        { label: 'Pop', value: 'filter_pop', description: 'Optimized for pop music', emoji: '🎤' }
    ];

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('music_filter_select')
        .setPlaceholder('Select an audio filter to apply...')
        .addOptions(filterOptions);

    const backButton = new ButtonBuilder()
        .setCustomId('music_filter_back')
        .setLabel('Back to Player')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### ✨ Audio Filters'),
            new TextDisplayBuilder().setContent('Enhance your listening experience by selecting a filter below.\n*Note: It may take a moment to apply.*')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu))
        .addActionRowComponents(new ActionRowBuilder().addComponents(backButton));
}

module.exports = { buildFilterContainer };
