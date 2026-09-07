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
        .setName('ban')
        .setDescription('Bans a user from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!targetUser) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please specify a valid user to ban.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (targetUser.id === process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You cannot ban Your Daddy.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // 1. Permission & Hierarchy Checks
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I do not have permission to ban members.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (targetMember) {
            if (targetMember.id === interaction.user.id) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You cannot ban yourself.'));
                return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
            if (!targetMember.bannable) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ I cannot ban this user (they might have a higher role or be the owner).'));
                return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
            const isBotOwner = interaction.user.id === process.env.OWNER_ID;
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id && !isBotOwner) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You cannot ban this user because they have a higher or equal role than you.'));
                return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
        }

        try {
            const { sendModDM } = require('../utils/modLogger');
            await sendModDM(targetUser, interaction.guild, 'Ban', reason);

            await interaction.guild.members.ban(targetUser, { reason: `Banned by ${interaction.user.tag}: ${reason}` });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⚠️ Moderation: User Banned`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Target:** ${targetUser.tag} (${targetUser.id})`),
                    new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
                    new TextDisplayBuilder().setContent(`**Action By:** <@${interaction.user.id}>`)
                );

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error(error);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Failed to ban the user: ${error.message}`));
            await interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
