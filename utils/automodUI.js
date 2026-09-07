const {
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    UserSelectMenuBuilder
} = require('discord.js');
const AntiMod = require('./automod');

function buildAutomodDashboard(guild, settings) {
    const activeModules = Object.values(settings.protections).filter(Boolean).length;
    const totalModules = Object.keys(settings.protections).length;

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Automod Dashboard`),
            new TextDisplayBuilder().setContent(`STATUS : **${settings.enabled ? '`` ✓ `` Active' : '`` ✗ `` Disabled'}**\nMODULES : ** ${activeModules} / ${totalModules} active **\nPUNISHMENT · ** ${(settings.punishment || 'timeout').toUpperCase()}** `)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${guild.name} | Security Overview`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const enableBtn = new ButtonBuilder()
        .setCustomId(settings.enabled ? 'automod_panel_disable' : 'automod_panel_enable')
        .setLabel(settings.enabled ? 'Disable System' : 'Enable System')
        .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success);

    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            enableBtn, 
            new ButtonBuilder().setCustomId('automod_panel_modules').setLabel('Modules').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('automod_panel_whitelist').setLabel('Whitelist').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('automod_panel_punishment').setLabel('Punishment').setStyle(ButtonStyle.Primary)
        )
    );

    return builder;
}

function buildModulesContainer(guild, settings) {
    const protections = settings.protections;
    const statusList = Object.entries(protections)
        .map(([k, v]) => `${v ? '✅' : '❌'} : **${k.replace('anti_', '').replace(/_/g, ' ').toUpperCase()}**`)
        .join('\n');

    const builder = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Module Configuration`),
            new TextDisplayBuilder().setContent(`Configure which content filters are currently active in this server.`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(statusList))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('automod_toggle_select')
        .setPlaceholder('Select active filters...')
        .setMinValues(0)
        .setMaxValues(Object.keys(protections).length)
        .addOptions(Object.keys(protections).map(k => ({
            label: k.replace('anti_', '').replace(/_/g, ' ').toUpperCase(),
            value: k,
            default: protections[k]
        })));

    builder.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
    builder.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('automod_panel_enable_all').setLabel('Enable All').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('automod_panel_back').setLabel('Back to Dashboard').setStyle(ButtonStyle.Secondary)
        )
    );

    return builder;
}

function buildPunishmentContainer(settings) {
    const current = settings.punishment || 'timeout';

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Punishment Settings`),
            new TextDisplayBuilder().setContent(`Action taken when a user violates an automod rule.\n\nCURRENT ACTION · ** ${current.toUpperCase()}** `)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('automod_punishment_select')
                    .setPlaceholder('Select reaction type...')
                    .addOptions([
                        { label: 'Timeout', value: 'timeout', description: 'Restricts member from speaking.', default: current === 'timeout' },
                        { label: 'Warn', value: 'warn', description: 'Sends a visual warning.', default: current === 'warn' },
                        { label: 'Kick', value: 'kick', description: 'Removes the member.', default: current === 'kick' },
                        { label: 'Ban', value: 'ban', description: 'Permanently bans the member.', default: current === 'ban' }
                    ])
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('automod_panel_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
}

function buildWhitelistContainer(guild, settings) {
    const users = settings.whitelist.users || [];
    const list = users.length > 0 ? users.map(id => `< @${id}> `).join('\n') : '*No whitelisted users*';

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Automod Whitelist`),
            new TextDisplayBuilder().setContent(`Users in this list bypass all content moderation checks.\n\n${list} `)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('automod_whitelist_add_user')
                    .setPlaceholder('Search & Add User to Whitelist...')
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('automod_whitelist_remove_user')
                    .setPlaceholder('Remove User from Whitelist...')
                    .addOptions(users.length > 0 ? users.map(id => ({ label: guild.members.cache.get(id)?.displayName || id, value: id })) : [{ label: 'Empty', value: 'none' }])
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('automod_panel_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
}

module.exports = {
    buildAutomodDashboard,
    buildModulesContainer,
    buildPunishmentContainer,
    buildWhitelistContainer
};
