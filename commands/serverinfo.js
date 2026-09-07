const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Displays information about the server (Utility module)'),

    async execute(interaction) {
        const { guild } = interaction;
        const owner = await guild.fetchOwner().catch(() => ({ id: guild.ownerId, user: { username: 'Unknown' } }));
        const iconURL = guild.iconURL({ size: 1024, extension: 'png' });
        const bannerURL = guild.bannerURL({ size: 1024, extension: 'png' }) || guild.discoverySplashURL({ size: 1024, extension: 'png' });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${guild.name}`),
                new TextDisplayBuilder().setContent(`**Owner:** <@${owner.id}> | **ID:** \`${guild.id}\``),
                new TextDisplayBuilder().setContent(`**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:d> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ℹ️ Stats & Counts`),
                new TextDisplayBuilder().setContent(`> • **Members:** \`${guild.memberCount.toLocaleString()}\``),
                new TextDisplayBuilder().setContent(`> • **Channels:** \`${guild.channels.cache.size}\` | **Roles:** \`${guild.roles.cache.size}\``),
                new TextDisplayBuilder().setContent(`> • **Boosts:** \`${guild.premiumSubscriptionCount || 0}\` (Level ${guild.premiumTier})`)
            );

        if (bannerURL) {
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerURL))
                );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Requested by ${interaction.user.username}`)
        );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
