const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Displays information about a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get info about')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const member = interaction.options.getMember('target') || interaction.member;

        const joinedAt = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
        const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# 🔹 ${user.username}'s Profile`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**User ID:** ${user.id}`),
                new TextDisplayBuilder().setContent(`**Account Created:** ${createdAt}`),
                new TextDisplayBuilder().setContent(`**Joined Server:** ${joinedAt}`)
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
