const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, SeparatorBuilder, SeparatorSpacingSize, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const AntiNuke = require('./antinuke');

function buildDashboardContainer(guild, settings) {
    const activeModules = Object.values(settings.protections).filter(Boolean).length;
    const totalModules = Object.keys(settings.protections).length;
    const punType = (settings.punishment || 'ban').toUpperCase();

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Security Dashboard`),
            new TextDisplayBuilder().setContent(`STATUS : **${settings.enabled ? '`` ✓ `` Active' : '`` ✗ `` Disabled'}**\nMODULES : **${activeModules} / ${totalModules} active**\nPANIC : **${settings.panic ? '`` ✓ `` Enabled' : '`` ✗ `` Disabled'}**\nPUNISHMENT : **${punType}**`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${guild.name} | Protection Overview`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const enableBtn = new ButtonBuilder()
        .setCustomId(settings.enabled ? 'antinuke_panel_disable' : 'antinuke_panel_enable')
        .setLabel(settings.enabled ? 'Disable' : 'Enable')
        .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success);

    const panicBtn = new ButtonBuilder()
        .setCustomId(settings.panic ? 'antinuke_panel_panic_off' : 'antinuke_panel_panic_on')
        .setLabel(settings.panic ? 'Disable Panic Mode' : 'Enable Panic Mode')
        .setStyle(settings.panic ? ButtonStyle.Success : ButtonStyle.Danger);

    const updateBtn = new ButtonBuilder().setCustomId('antinuke_panel_recovery').setLabel(`Recovery: ${settings.recovery ? 'ON' : 'OFF'}`).setStyle(settings.recovery ? ButtonStyle.Success : ButtonStyle.Secondary);

    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            enableBtn, 
            panicBtn, 
            updateBtn,
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('antinuke_panel_modules').setLabel('Modules').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('antinuke_panel_whitelist').setLabel('Whitelist').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('antinuke_panel_extraowners').setLabel('Extra Owners').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('antinuke_panel_logs').setLabel('Logs').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
             new ButtonBuilder().setCustomId('antinuke_panel_punishment').setLabel('Punishment Type').setStyle(ButtonStyle.Primary)
        )
    );

    return builder;
}

function buildWhitelistContainer(guild, settings) {
    const whitelistArr = Object.keys(settings.whitelists || {});
    const whitelistList = whitelistArr.length > 0 ? whitelistArr.map(id => `<@${id}> — **Full Trust**`).join('\n') : '*No whitelisted users*';

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Whitelist Manager`),
            new TextDisplayBuilder().setContent(`Manage who bypasses antinuke checks.\n\n${whitelistList}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('antinuke_whitelist_select_user')
        .setPlaceholder('Manage existing whitelisted users...')
        .addOptions(whitelistArr.length > 0 ?
            whitelistArr.map(id => {
                const member = guild.members.cache.get(id);
                const name = member?.displayName || id;
                return { label: name, value: id, description: `Manage permissions for ${name}` };
            }) :
            [{ label: 'No users', value: 'none' }]
        );

    const addUserMenu = new UserSelectMenuBuilder()
        .setCustomId('antinuke_whitelist_add_user')
        .setPlaceholder('Search & Add user to whitelist...');

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
    builder.addActionRowComponents(new ActionRowBuilder().addComponents(addUserMenu));
    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('antinuke_panel_back').setLabel('Close & Return').setStyle(ButtonStyle.Danger)
        )
    );

    return builder;
}

function buildUserConfigContainer(userId, perms) {
    const permsState = Object.entries(perms)
        .filter(([_, v]) => v)
        .map(([k, _]) => `· ${k.replace(/_/g, ' ').toUpperCase()}`)
        .join('\n') || '*No permissions selected*';

    const hasAnyPerm = Object.values(perms).some(Boolean);
    const hasAllPerms = Object.values(perms).every(Boolean);

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Whitelist — Permissions Setup`),
            new TextDisplayBuilder().setContent(`Target: <@${userId}>\n\n**Current Access:**\n${permsState}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const allPerms = [
        { label: 'Anti Ban', value: 'anti_ban' },
        { label: 'Anti Unban', value: 'anti_unban' },
        { label: 'Anti Kick', value: 'anti_kick' },
        { label: 'Anti Bot', value: 'anti_bot' },
        { label: 'Channel Protection', value: 'channel_protection' },
        { label: 'Role Protection', value: 'role_protection' },
        { label: 'Member Update', value: 'member_update' },
        { label: 'Emoji/Sticker', value: 'emoji_sticker' },
        { label: 'Guild Settings', value: 'guild_settings' },
        { label: 'Webhook Security', value: 'webhook_security' },
        { label: 'AutoMod', value: 'automod_protection' },
        { label: 'Guild Events', value: 'guild_events' },
        { label: 'Thread Security', value: 'thread_protection' },
        { label: 'Invite Protection', value: 'invite_protection' },
        { label: 'Everyone/Role Ping', value: 'everyone_ping' },
        { label: 'Member Prune', value: 'member_prune' }
    ];

    const select = new StringSelectMenuBuilder()
        .setCustomId(`antinuke_user_perm_toggle_${userId}`)
        .setPlaceholder('Toggle specific permissions...')
        .setMinValues(0)
        .setMaxValues(allPerms.length)
        .addOptions(allPerms.map(p => ({
            label: p.label,
            value: p.value,
            default: perms[p.value] || false
        })));

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(select));

    const mainBtn = new ButtonBuilder();
    if (hasAllPerms) {
        mainBtn.setCustomId(`antinuke_user_clearall_${userId}`).setLabel('Clear All Access').setStyle(ButtonStyle.Danger);
    } else if (hasAnyPerm) {
        mainBtn.setCustomId(`antinuke_panel_whitelist`).setLabel('Add User (Applied)').setStyle(ButtonStyle.Success);
    } else {
        mainBtn.setCustomId(`antinuke_user_trustall_${userId}`).setLabel('Trust All').setStyle(ButtonStyle.Success);
    }

    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            mainBtn,
            new ButtonBuilder().setCustomId('antinuke_panel_whitelist').setLabel('Back to List').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`antinuke_user_remove_${userId}`).setLabel('Remove User').setStyle(ButtonStyle.Danger)
        )
    );

    return builder;
}

function buildExtraOwnersContainer(guild, settings) {
    const extraOwners = settings.extraowners || [];
    const list = extraOwners.length > 0 ? extraOwners.map(id => `<@${id}>`).join('\n') : '*No extra owners*';

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Extra Owners`),
            new TextDisplayBuilder().setContent(`Extra owners fully bypass antinuke and can manage the bot.\n\n${list}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const select = new StringSelectMenuBuilder()
        .setCustomId('antinuke_extraowner_select')
        .setPlaceholder('Select an existing owner to remove or view...')
        .addOptions(extraOwners.length > 0 ?
            extraOwners.map(id => {
                const member = guild.members.cache.get(id);
                const name = member?.displayName || id;
                return { label: name, value: id };
            }) :
            [{ label: 'No users', value: 'none' }]
        );

    const addOwnerMenu = new UserSelectMenuBuilder()
        .setCustomId('antinuke_extraowner_add_user')
        .setPlaceholder('Search & Add extra owner...');

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    builder.addActionRowComponents(new ActionRowBuilder().addComponents(addOwnerMenu));
    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('antinuke_panel_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        )
    );

    return builder;
}

function buildModulesContainer(guild, settings) {
    const protections = settings.protections || {};
    const moduleList = Object.entries(protections)
        .map(([k, v]) => `${v ? '✅' : '❌'} : **${k.replace('anti_', '').replace(/_/g, ' ').toUpperCase()}**`)
        .join('\n');

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Module Configuration`),
            new TextDisplayBuilder().setContent(`Select the modules you want to **ENABLE**.\nUnselected modules will be disabled.`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(moduleList))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const select = new StringSelectMenuBuilder()
        .setCustomId('antinuke_toggle_select')
        .setPlaceholder('Select active modules...')
        .setMinValues(0)
        .setMaxValues(Object.keys(protections).length)
        .addOptions(Object.keys(protections).map(k => ({
            label: k.charAt(0).toUpperCase() + k.slice(1),
            value: k,
            default: protections[k]
        })));

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('antinuke_panel_back').setLabel('Back to Dashboard').setStyle(ButtonStyle.Secondary)
        )
    );

    return builder;
}

function buildLogsContainer(guild, settings) {
    const logChannel = settings.logChannel ? `<#${settings.logChannel}>` : '*Not configured*';

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Logging Configuration`),
            new TextDisplayBuilder().setContent(`CURRENT LOG CHANNEL · ${logChannel}\n\nSelect a channel below to receive real-time security alerts.`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('antinuke_log_channel_select')
        .setPlaceholder('Select a log channel...')
        .setChannelTypes([ChannelType.GuildText]);

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));
    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('antinuke_panel_back').setLabel('Back to Dashboard').setStyle(ButtonStyle.Secondary)
        )
    );

    return builder;
}

function buildExtraOwnerConfigContainer(guild, userId) {
    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Extra Owner — Profile Management`),
            new TextDisplayBuilder().setContent(`Target: <@${userId}>\n\n**Status · FULL BYPASS**\nExtra owners can manage all bot settings and bypass every security module. To revoke this access, use the button below.`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`antinuke_extraowner_remove_btn_${userId}`).setLabel('Remove Extra Owner').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('antinuke_panel_extraowners').setLabel('Back to List').setStyle(ButtonStyle.Secondary)
        )
    );

    return builder;
}

function buildPunishmentContainer(guild, settings) {
    const current = settings.punishment || 'ban';

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Punishment Configuration`),
            new TextDisplayBuilder().setContent(`Select the action the bot should take when an unauthorized action is detected.\n\nCURRENT ACTION · **${current.toUpperCase()}**`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const select = new StringSelectMenuBuilder()
        .setCustomId('antinuke_punishment_select')
        .setPlaceholder('Select reaction type...')
        .addOptions([
            { label: 'Ban Member', value: 'ban', description: 'Permanently bans the executor.', default: current === 'ban' },
            { label: 'Kick Member', value: 'kick', description: 'Kicks the executor from the server.', default: current === 'kick' },
            { label: 'Strip Roles', value: 'strip', description: 'Removes all roles from the executor.', default: current === 'strip' }
        ]);

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('antinuke_panel_back').setLabel('Back to Dashboard').setStyle(ButtonStyle.Secondary)
        )
    );

    return builder;
}

module.exports = {
    buildDashboardContainer,
    buildWhitelistContainer,
    buildUserConfigContainer,
    buildExtraOwnersContainer,
    buildModulesContainer,
    buildLogsContainer,
    buildExtraOwnerConfigContainer,
    buildPunishmentContainer
};
