const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot\'s invite link'),

    async execute(interaction) {
        const invite = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Invite Sentinel Prime`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Experience the next generation of intelligence and high-performance Antimuke.`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `🔹 **Advanced Security**\n-# Real-time Anti-Nuke & Anti-Wizz protection protocols.\n\n` +
                    `🔹 **Premium Entertainment**\n-# High-fidelity music playback from Spotify & YouTube.\n\n` +
                    `🔹 **Intelligent Moderation**\n-# Automated content filtering & ghost-ping detection.\n\n` +
                    `🔹 **Dynamic Management**\n-# Professional giveaway & support ticket systems.`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('https://cdn.discordapp.com/attachments/1495001833389953157/1495663067592392744/standard_13.gif?ex=69e71047&is=69e5bec7&hm=4e4f963e9291f71fde1973c5c5b28d43e65e9c354ce6d4a21fff31c2b4e6c6dc&')
                )
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Invite Link')
                .setURL(invite)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Support Server')
                .setURL('https://discord.gg/FAtDM6bA5e')
                .setStyle(ButtonStyle.Link)
        );

        return interaction.reply({ components: [con, row], flags: MessageFlags.IsComponentsV2 });
    },
};
