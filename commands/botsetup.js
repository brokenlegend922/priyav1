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
const Premium = require('../utils/premium');
const fetch = require('node-fetch');

module.exports = {
    premium: true,
    data: new SlashCommandBuilder()
        .setName('botsetup')
        .setDescription('Configure bot name, avatar, and identity for this server (Premium Only)')
        .addStringOption(opt => opt.setName('name').setDescription('New nickname for the bot in this server').setRequired(false))
        .addStringOption(opt => opt.setName('avatar').setDescription('URL of the new server-specific avatar').setRequired(false))
        .addStringOption(opt => opt.setName('banner').setDescription('URL of the new banner (Global Bot Identity)').setRequired(false))
        .addBooleanOption(opt => opt.setName('reset').setDescription('Reset all server-specific settings').setRequired(false)),

    async execute(interaction) {
        // --- PREMIUM & PERMISSION CHECK ---
        const isPremium = Premium.isPremiumGuild(interaction.guildId);
        const isServerOwner = interaction.user.id === interaction.guild.ownerId;
        const isDev = interaction.user.id === process.env.OWNER_ID;

        if (!isPremium) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🔹 Premium Required`),
                new TextDisplayBuilder().setContent(`The \`/botsetup\` command is a **Premium Only** feature for this server.`)
            );
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!isServerOwner && !isDev) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ❌ Access Denied`),
                new TextDisplayBuilder().setContent(`Only the **Server Owner** or **Bot Developer** can manage my premium identity settings.`)
            );
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const name = interaction.options.getString('name');
        const avatarURL = interaction.options.getString('avatar');
        const bannerURL = interaction.options.getString('banner');
        const reset = interaction.options.getBoolean('reset');

        if (!name && !avatarURL && !bannerURL && !reset) {
            return this.sendDashboard(interaction);
        }

        await interaction.deferReply();

        try {
            const results = [];

            if (reset) {
                await interaction.guild.members.me.setNickname(null);
                await interaction.client.rest.patch(`/guilds/${interaction.guildId}/members/@me`, { body: { avatar: null } });
                const db = require('../utils/database');
                db.delete('identity', interaction.guildId);
                results.push('🔹 **Identity Reset:** Restored original name, avatar, and banner for this server.');
            } else {
                if (name) {
                    await interaction.guild.members.me.setNickname(name);
                    results.push(`🔹 **Name Updated:** Set nickname to \`${name}\`.`);
                }

                if (avatarURL) {
                    const response = await fetch(avatarURL);
                    if (response.ok) {
                        const buffer = await response.buffer();
                        const contentType = response.headers.get('content-type');
                        const avatarData = `data:${contentType};base64,${buffer.toString('base64')}`;
                        await interaction.client.rest.patch(`/guilds/${interaction.guildId}/members/@me`, { body: { avatar: avatarData } });
                        results.push('🔹 **Avatar Updated:** Applied new server-specific profile picture.');
                    } else {
                        results.push('❌ **Avatar Error:** Failed to download the provided image URL.');
                    }
                }

                if (bannerURL) {
                    const db = require('../utils/database');
                    const identity = db.get('identity', interaction.guildId, { banner: null });
                    db.set('identity', interaction.guildId, { ...identity, banner: bannerURL });
                    results.push('🔹 **Banner Updated:** Applied new server-specific banner to bot components.');
                }
            }

            const successCon = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✨ Identity Configuration`),
                    new TextDisplayBuilder().setContent(results.join('\n'))
                );

            return interaction.editReply({ components: [successCon], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error(error);
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Action Failed:** ${error.message}`));
            return interaction.editReply({ components: [err], flags: MessageFlags.IsComponentsV2 });
        }
    },

    async sendDashboard(interaction) {
        const { components } = this.buildDashboard(interaction);
        return interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
    },

    buildDashboard(interaction) {
        const me = interaction.guild.members.me;
        const isPremium = Premium.isPremiumGuild(interaction.guild.id);
        const status = Premium.getStatus(interaction.guild.id);
        const db = require('../utils/database');
        const identity = db.get('identity', interaction.guildId, { banner: null });

        let pText = isPremium ? `🔹 **Active**` : `❌ **Inactive**`;
        if (isPremium && status?.expiry !== -1) {
            pText += ` (Expires: <t:${Math.floor(status.expiry / 1000)}:R>)`;
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ✨ Bot Setup | Identity Dashboard`),
                new TextDisplayBuilder().setContent(`Customize Sentinel Prime's appearance specifically for **${interaction.guild.name}**.`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Server Identity:**`),
                new TextDisplayBuilder().setContent(`> • **Nickname:** ${me.nickname || 'Default'}`),
                new TextDisplayBuilder().setContent(`> • **Server Avatar:** ${me.avatarURL() ? '[Custom Asset]' : 'Default'}`),
                new TextDisplayBuilder().setContent(`> • **Server Banner:** ${identity.banner ? '[Custom Asset]' : 'Default'}`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Subscription Status:**`),
                new TextDisplayBuilder().setContent(`> • **Premium:** ${pText}`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Use the buttons below to update settings. Changes are applied instantly.`)
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('botsetup_edit_name').setLabel('Set Nickname').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('botsetup_edit_avatar').setLabel('Set Avatar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('botsetup_edit_banner').setLabel('Set Banner').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('botsetup_reset').setLabel('Reset Identity').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('botsetup_refresh').setLabel('Refresh Status').setStyle(ButtonStyle.Primary)
        );

        // DEV ONLY: Add Premium Toggle
        if (interaction.user.id === process.env.OWNER_ID) {
            row2.addComponents(
                new ButtonBuilder().setCustomId(isPremium ? 'botsetup_premium_disable' : 'botsetup_premium_enable').setLabel(isPremium ? 'Disable Premium' : 'Enable Premium').setStyle(isPremium ? ButtonStyle.Danger : ButtonStyle.Success)
            );
        }

        return { components: [container, row, row2] };
    }
};
