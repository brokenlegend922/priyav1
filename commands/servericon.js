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
        .setName('servericon')
        .setDescription('Displays the icon of the current server'),

    async execute(interaction) {
        const guild = interaction.guild;
        const iconURL = guild.iconURL({ forceStatic: false, size: 1024 });

        if (!iconURL) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ This server does not have an icon.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const actualExtension = iconURL.includes('.gif') ? 'GIF' : iconURL.includes('.webp') ? 'WEBP' : 'PNG';

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${guild.name}'s Icon`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(iconURL)
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
                        .setURL(iconURL)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setCustomId(`save_to_dm_${guild.id}_icon`)
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
