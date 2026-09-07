const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Premium = require('../utils/premium');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Manage or check premium status.')
        .addSubcommand(sub => sub.setName('status').setDescription('Check your server/user premium status.'))
        .addSubcommand(sub => sub.setName('activate').setDescription('Activate premium for this server (Bot Owner Only).')
            .addStringOption(opt => opt.setName('server_id').setDescription('ID of the guild (Defaults to current)').setRequired(false))
            .addIntegerOption(opt => opt.setName('days').setDescription('Duration in days (-1 for Lifetime)').setRequired(false)))
        .addSubcommand(sub => sub.setName('add').setDescription('Add premium to a guild or user (Bot Owner Only).')
            .addStringOption(opt => opt.setName('type').setDescription('Type of premium').setRequired(true).addChoices({ name: 'Guild', value: 'guild' }, { name: 'User', value: 'user' }))
            .addStringOption(opt => opt.setName('target_id').setDescription('ID of the guild or user').setRequired(true))
            .addIntegerOption(opt => opt.setName('days').setDescription('Duration in days (-1 for Lifetime)').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove premium from a guild or user (Bot Owner Only).')
            .addStringOption(opt => opt.setName('type').setDescription('Type of premium').setRequired(true).addChoices({ name: 'Guild', value: 'guild' }, { name: 'User', value: 'user' }))
            .addStringOption(opt => opt.setName('target_id').setDescription('ID of the guild or user').setRequired(true))),

    async execute(interaction) {
        let sub = null;
        try { sub = interaction.options.getSubcommand(); } catch (e) { }

        if (!sub) {
            return interaction.reply({
                components: [this.buildPremiumInfo(interaction)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (sub === 'status') {
            const guildPremium = Premium.getStatus(interaction.guildId);
            const userPremium = Premium.getStatus(interaction.user.id);

            const statusPayload = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 🔹 Premium Status`),
                    new TextDisplayBuilder().setContent(`**Server Status:** ${guildPremium ? `🔹 Active (Expires: ${guildPremium.expiry === -1 ? 'Never' : `<t:${Math.floor(guildPremium.expiry / 1000)}:R>`})` : '❌ Not Active'}`),
                    new TextDisplayBuilder().setContent(`**User Status:** ${userPremium ? `🔹 Active (Expires: ${userPremium.expiry === -1 ? 'Never' : `<t:${Math.floor(userPremium.expiry / 1000)}:R>`})` : '❌ Not Active'}`)
                );

            return interaction.reply({ components: [statusPayload], flags: MessageFlags.IsComponentsV2 });
        }

        // Owner Only Check for management/activation
        if (interaction.user.id !== process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This command is restricted to the **Bot Developer**.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (sub === 'activate') {
            const targetId = interaction.options.getString('server_id') || interaction.guildId;
            const days = interaction.options.getInteger('days') || -1;
            Premium.addPremiumGuild(targetId, days);
            const success = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`🔹 **Premium Activated!**`),
                new TextDisplayBuilder().setContent(`Premium has been activated for server \`${targetId}\` for ${days === -1 ? 'Lifetime' : `${days} Days`}.`)
            );
            return interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'add') {
            const type = interaction.options.getString('type');
            const targetId = interaction.options.getString('target_id');
            const days = interaction.options.getInteger('days');

            if (type === 'guild') Premium.addPremiumGuild(targetId, days);
            else Premium.addPremiumUser(targetId, days);

            const success = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`🔹 **Premium Added Successfully!**`),
                new TextDisplayBuilder().setContent(`**Type:** ${type}\n**ID:** \`${targetId}\`\n**Duration:** ${days === -1 ? 'Lifetime' : `${days} Days`}`)
            );
            return interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'remove') {
            const type = interaction.options.getString('type');
            const targetId = interaction.options.getString('target_id');

            if (type === 'guild') Premium.removePremiumGuild(targetId);
            else Premium.removePremiumUser(targetId);

            const success = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`🔹 **Premium Removed Successfully!**`),
                new TextDisplayBuilder().setContent(`**Type:** ${type}\n**ID:** \`${targetId}\``)
            );
            return interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
        }
    },

    buildPremiumInfo(interaction) {
        const prefix = process.env.PREFIX || 'v!';
        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🔹 Sentinel Prime Premium`),
                new TextDisplayBuilder().setContent(`Elevate your experience with Sentinel Prime Premium. Get access to exclusive commands and advanced customization.`)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Premium Only Commands:**`),
                new TextDisplayBuilder().setContent(`- \`${prefix}botsetup\` : Change bot name, avatar, and banner in this server.`),
                new TextDisplayBuilder().setContent(`- \`${prefix}premium status\` : Check current subscription state.`)
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('premium_status_check').setLabel('Check Status').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('Get Premium').setStyle(ButtonStyle.Link).setURL('https://discord.gg/2KpdfZcwrh')
        );

        con.addActionRowComponents(row);
        return con;
    }
};
