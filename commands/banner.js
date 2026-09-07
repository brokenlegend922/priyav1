const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Displays the profile banner of a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get the banner of')
                .setRequired(false)
        ),

    async execute(interaction) {
        let user = interaction.options.getUser('target') || interaction.user;

        // Fetch the user to get the banner data
        user = await interaction.client.users.fetch(user.id, { force: true });

        let bannerURL = user.bannerURL({ forceStatic: false, size: 1024 });

        // --- SERVER SPECIFIC BOT BANNER SIMULATION ---
        if (user.id === interaction.client.user.id) {
            const db = require('../utils/database');
            const identity = db.get('identity', interaction.guildId, { banner: null });
            if (identity.banner) bannerURL = identity.banner;
        }

        if (!bannerURL) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${user.username}** does not have a profile banner.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const actualExtension = bannerURL.includes('.gif') ? 'GIF' : bannerURL.includes('.webp') ? 'WEBP' : 'PNG';

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${user.username}'s Banner`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(bannerURL)
                )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Format: **${actualExtension}** · Size: **1024px**`),
                new TextDisplayBuilder().setContent(`-# Requested by <@${interaction.user.id}>`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Open in Browser')
                        .setURL(bannerURL)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setCustomId(`save_to_dm_${user.id}_banner`)
                        .setLabel('Save to DM')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
