const {
    ContainerBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    UserSelectMenuBuilder,
} = require('discord.js');

function buildRoleMainMenu() {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ Role Management`),
            new TextDisplayBuilder().setContent(`Select an action to begin bulk role assignment or removal in this server.`)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('role_menu_add')
                    .setLabel('Add Role')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('role_menu_remove')
                    .setLabel('Remove Role')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖')
            )
        );
}

function buildRoleTypeSelection(action) {
    const label = action === 'add' ? 'Add' : 'Remove';
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ ${label} Role | Target Selection`),
            new TextDisplayBuilder().setContent(`Who should the role be ${action}ed to? Select an option below.`)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`role_select_type_${action}`)
                    .setPlaceholder('Choose target audience...')
                    .addOptions(
                        { label: 'Role All', value: 'all', description: `Assign role to every member`, emoji: '👥' },
                        { label: 'Role Humans', value: 'humans', description: `Assign role to real users only`, emoji: '👨' },
                        { label: 'Role Bots', value: 'bots', description: `Assign role to automated accounts`, emoji: '🤖' },
                        { label: 'Role User', value: 'user', description: `Assign role to a specific user`, emoji: '👤' }
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('role_home').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
}

function buildRolePicker(action, type, targetUserId = null) {
    const customId = targetUserId ? `role_pick_role_${action}_${type}_${targetUserId}` : `role_pick_role_${action}_${type}`;
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ ${action.charAt(0).toUpperCase() + action.slice(1)} Role | Select Role`),
            new TextDisplayBuilder().setContent(`Pick the role you want to ${action} for **${type}**.`)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Select a role from the list...')
            )
        );
}

function buildUserPicker(action) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ ${action.charAt(0).toUpperCase() + action.slice(1)} Role | Select User`),
            new TextDisplayBuilder().setContent(`Search and select the specific user you want to manage.`)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(`role_pick_user_${action}`)
                    .setPlaceholder('Find a server member...')
            )
        );
}

function buildRoleConfirmation(action, type, roleId, targetUserId = null) {
    const targetDisplay = targetUserId ? `<@${targetUserId}>` : `**${type}**`;
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ Final Confirmation`),
            new TextDisplayBuilder().setContent(
                `**Action:** ${action === 'add' ? 'Assigning' : 'Removing'}\n` +
                `**Target:** ${targetDisplay}\n` +
                `**Role:** <@&${roleId}>\n\n` +
                `Are you sure you want to proceed? This action may be logged.`
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_confirm_${action}_${type}_${roleId}${targetUserId ? `_${targetUserId}` : ''}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('role_home')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
}

module.exports = {
    buildRoleMainMenu,
    buildRoleTypeSelection,
    buildRolePicker,
    buildUserPicker,
    buildRoleConfirmation
};
