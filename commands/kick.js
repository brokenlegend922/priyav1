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
        .setName('kick')
        .setDescription('Kicks a user from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!targetUser) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please specify a valid user to kick.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (targetUser.id === process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You cannot kick Your Daddy.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // 1. Permission & Hierarchy Checks
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I do not have permission to kick members.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!targetMember) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I cannot find this member in the server.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (targetMember.id === interaction.user.id) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You cannot kick yourself.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!targetMember.kickable) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I cannot kick this user (they might have a higher role or be the owner).'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const isBotOwner = interaction.user.id === process.env.OWNER_ID;
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id && !isBotOwner) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You cannot kick this user because they have a higher or equal role than you.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        try {
            const { sendModDM } = require('../utils/modLogger');
            await sendModDM(targetMember, interaction.guild, 'Kick', reason);

            await targetMember.kick(`Kicked by ${interaction.user.tag}: ${reason}`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🛡️ Moderation: User Kicked`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Target:** ${targetUser.tag} (${targetUser.id})`),
                    new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
                    new TextDisplayBuilder().setContent(`**Action By:** <@${interaction.user.id}>`)
                );

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error(error);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Failed to kick the user: ${error.message}`));
            await interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
