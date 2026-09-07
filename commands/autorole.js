const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, RoleSelectMenuBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const AutoRole = require('../utils/autorole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Open the AutoRole Management Dashboard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const settings = AutoRole.getSettings(interaction.guildId);

        // Open the rich dashboard directly
        return interaction.reply({
            components: [this.buildDashboard(interaction.guild, settings)],
            flags: MessageFlags.IsComponentsV2
        });
    },

    buildDashboard(guild, settings) {
        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🛠️ AutoRole Management Matrix`),
                new TextDisplayBuilder().setContent(`**Status:** ${settings.enabled ? '`` ✓ `` Online & Active' : '`` ✗ `` Offline'}\nControl the automated synchronization of roles for incoming members.`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Configuration Overview:**`),
                new TextDisplayBuilder().setContent(`> **Global (All):** ${settings.roles.all.length > 0 ? settings.roles.all.map(id => `<@&${id}>`).join(' ') : '`Disconnected`'}`),
                new TextDisplayBuilder().setContent(`> **Humans Only:** ${settings.roles.humans.length > 0 ? settings.roles.humans.map(id => `<@&${id}>`).join(' ') : '`Disconnected`'}`),
                new TextDisplayBuilder().setContent(`> **Bots Only:** ${settings.roles.bots.length > 0 ? settings.roles.bots.map(id => `<@&${id}>`).join(' ') : '`Disconnected`'}`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('autorole_toggle').setLabel(settings.enabled ? 'Disable' : 'Enable').setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder().setCustomId('autorole_manage_all').setLabel('Global').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('autorole_manage_humans').setLabel('Humans').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('autorole_manage_bots').setLabel('Bots').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('autorole_reset').setLabel('Clear All Config').setStyle(ButtonStyle.Secondary)
        );

        con.addActionRowComponents(row1, row2);
        return con;
    },

    buildPicker(type) {
        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🛠️ Modifying Vector: ${type.toUpperCase()}`),
                new TextDisplayBuilder().setContent(`Assign or detach a role from the **${type}** automation stream.`)
            );

        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId(`autorole_select_${type}`)
            .setPlaceholder('Select a role to bridge...')
            .setMinValues(1)
            .setMaxValues(1);

        con.addActionRowComponents(new ActionRowBuilder().addComponents(roleSelect));
        con.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('autorole_panel_back').setLabel('Return to Matrix').setStyle(ButtonStyle.Secondary)
        ));

        return con;
    }
};
