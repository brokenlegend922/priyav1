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
        .setName('avatar')
        .setDescription('Displays the avatar of a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get the avatar of')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const isAnimated = user.avatar && user.avatar.startsWith('a_');
        const extension = isAnimated ? 'gif' : 'png';
        const avatarURL = user.displayAvatarURL({ forceStatic: false, size: 1024 });
        const actualExtension = avatarURL.includes('.gif') ? 'GIF' : 'PNG';

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${user.username}'s Avatar`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(avatarURL)
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
                        .setURL(avatarURL)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setCustomId(`save_to_dm_${user.id}_avatar`)
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
