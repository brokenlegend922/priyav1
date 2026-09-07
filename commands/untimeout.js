const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove a timeout from a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to unmute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unmute')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I cannot find this member in the server.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I do not have permission to moderate members.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!targetMember.communicationDisabledUntilTimestamp) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This user is not timed out.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        try {
            await targetMember.timeout(null, `Unmuted by ${interaction.user.tag}: ${reason}`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⚠️ Moderation: User Unmuted`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Target:** ${targetUser.tag}`),
                    new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
                    new TextDisplayBuilder().setContent(`**Action By:** <@${interaction.user.id}>`)
                );

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error(error);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Failed to unmute the user: ${error.message}`));
            await interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
