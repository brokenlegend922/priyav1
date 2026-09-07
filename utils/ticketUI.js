const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');


function replaceVars(text, member, guild, ticketChannel) {
    if (!text || typeof text !== 'string') return text;
    const icon = guild.iconURL({ forceStatic: false, extension: 'png', size: 1024 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const vars = {
        '{user}': member ? `<@${member.id}>` : '{user}',
        '{user_mention}': member ? `<@${member.id}>` : '{user_mention}',
        '{user_name}': member ? (member.user ? member.user.username : member.username) : '{user_name}',
        '{user_nickname}': member ? (member.displayName || member.username) : '{user_nickname}',
        '{user_id}': member ? member.id : '{user_id}',
        '{server_name}': guild.name,
        '{server_membercount}': guild.memberCount,
        '{server_icon}': icon,
        '{channel}': ticketChannel ? `<#${ticketChannel.id}>` : '{channel}',
        '{channel_id}': ticketChannel ? ticketChannel.id : '{channel_id}',
        '{ticket_name}': ticketChannel ? ticketChannel.name : '{ticket_name}'
    };

    let res = text;
    for (const [key, value] of Object.entries(vars)) {
        res = res.split(key).join(value);
    }
    return res;
}


function isValidURL(string) {
    if (!string || typeof string !== 'string') return false;
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function buildSetupEmbed(guild, settings = {}) {
    const title = replaceVars(settings.customTitle || `## Support`, null, guild, null);
    const description = replaceVars(settings.customDescription || `Welcome to our support center.`, null, guild, null);

    let thumbnailURL = settings.customThumbnail;
    if (thumbnailURL === 'server_icon' || thumbnailURL === '{server_icon}') {
        thumbnailURL = guild.iconURL({ forceStatic: false, extension: 'png', size: 1024 }) || null;
    }

    let heroURL = settings.customHero;
    if (heroURL === 'server_icon' || heroURL === '{server_icon}') {
        heroURL = guild.iconURL({ forceStatic: false, extension: 'png', size: 1024 }) || null;
    }

    const hasThumbnail = thumbnailURL && isValidURL(thumbnailURL);
    const hasHero = heroURL && isValidURL(heroURL);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title));

    // Official Separator
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    if (hasHero) {
        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(heroURL));
        container.addSectionComponents(section);
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
    }

    if (settings.customFooter) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*${replaceVars(settings.customFooter, null, guild, null)}*`));
    }

    if (hasThumbnail) {
        const gallery = new MediaGalleryBuilder()
            .addItems(new MediaGalleryItemBuilder().setURL(thumbnailURL));
        container.addMediaGalleryComponents(gallery);
    }

    // Official Separator between Banner and Button
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        )
    );

    return container;
}


function buildTicketDashboard(member, guild, ticketChannel, settings = {}) {
    const welcome = replaceVars(settings.welcomeMsg, member, guild, ticketChannel);
    const title = replaceVars(settings.dashTitle || 'Ticket Opened: {user_name}', member, guild, ticketChannel);
    const footer = replaceVars(settings.dashFooter || 'Sentinel Prime Support', member, guild, ticketChannel);
    const ping = settings.pingEnabled ? replaceVars(settings.pingContent || '{user} | Welcome!', member, guild, ticketChannel) : null;

    // "Down" Image (Banner)
    let bannerURL = settings.dashThumbnail;
    if (bannerURL === 'server_icon' || bannerURL === '{server_icon}') {
        bannerURL = guild.iconURL({ forceStatic: false, extension: 'png', size: 1024 }) || null;
    } else if (bannerURL) {
        bannerURL = replaceVars(bannerURL, member, guild, ticketChannel);
    }

    // "Right Side" Image (Hero)
    let rightSideURL = settings.dashHero;
    if (rightSideURL === 'server_icon' || rightSideURL === '{server_icon}') {
        rightSideURL = guild.iconURL({ forceStatic: false, extension: 'png', size: 1024 }) || null;
    } else if (rightSideURL) {
        rightSideURL = replaceVars(rightSideURL, member, guild, ticketChannel);
    }

    // parse color
    let color = 0x2b2d31;
    if (settings.dashColor && settings.dashColor.toLowerCase() !== 'none') {
        try {
            const hex = settings.dashColor.replace('#', '');
            color = parseInt(hex, 16);
            if (isNaN(color)) color = 0x2b2d31;
        } catch (e) {
            color = 0x2b2d31;
        }
    } else if (settings.dashColor && settings.dashColor.toLowerCase() === 'none') {
        color = null; // No color visible
    }

    return {
        content: ping,
        embeds: [{
            title: title,
            description: welcome,
            color: color,
            timestamp: new Date(),
            thumbnail: (rightSideURL && isValidURL(rightSideURL)) ? { url: rightSideURL } : null,
            image: (bannerURL && isValidURL(bannerURL)) ? { url: bannerURL } : null,
            footer: footer ? { text: footer } : null
        }],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
                new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📑')
            )
        ]
    };
}


function buildMainManageDashboard(settings) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Ticket System Dashboard'),
            new TextDisplayBuilder().setContent(
                `**Status:** \`${settings.enabled ? 'Enabled' : 'Disabled'}\` | **Panel Type:** \`${settings.panelType}\`\n` +
                `**Ticket Category:** ${settings.categoryId ? `<#${settings.categoryId}>` : '`Not Set`'}\n` +
                `**Log Channel:** ${settings.logsChannelId ? `<#${settings.logsChannelId}>` : '`Not Set`'}\n` +
                `**Support Role:** ${settings.staffRoleId ? `<@&${settings.staffRoleId}>` : '`Not Set`'}\n` +
                `**Ticket Limit:** \`${settings.ticketLimit} per user\`\n` +
                `**Welcome Msg:** \`${settings.welcomeMsgEnabled ? 'On' : 'Off'}\` | **Transcripts:** \`${settings.transcriptsEnabled ? 'On' : 'Off'}\`\n` +
                `**Graphics:** \`Thumb: ${settings.customThumbnail ? '✅' : '❌'}\` | \`Hero: ${settings.customHero ? '✅' : '❌'}\`\n` +
                `**Tr Channel:** ${settings.transcriptChannelId ? `<#${settings.transcriptChannelId}>` : '`Not Set`'}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_page_panel').setLabel('Panel Setup').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_page_channels').setLabel('Channels').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_page_roles').setLabel('Roles & Limits').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_page_welcome').setLabel('Welcome Msg').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_page_transcripts').setLabel('Transcripts').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_config_send').setLabel('Post Panel').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_config_toggle').setLabel(settings.enabled ? 'Disable' : 'Enable').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_config_reset').setLabel('Full Reset').setStyle(ButtonStyle.Danger)
            )
        );
    return container;
}

function buildPanelSetupPage(settings) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Panel Setup'),
            new TextDisplayBuilder().setContent('Configure how your ticket panel looks.'),
            new TextDisplayBuilder().setContent(
                `**Title:** \`${settings.customTitle}\`\n` +
                `**Description:**\n> ${settings.customDescription}\n` +
                `**Footer:** \`${settings.customFooter || 'None'}\`\n` +
                `**Thumbnail:** \`${settings.customThumbnail ? 'Set' : 'None'}\`\n` +
                `**Hero Image:** \`${settings.customHero ? 'Set' : 'None'}\`\n` +
                `**Color:** \`${settings.customColor}\`\n` +
                `**Type:** \`${settings.panelType}\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_edit_title').setLabel('Edit Title').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_desc').setLabel('Edit Desc').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_footer').setLabel('Edit Footer').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_edit_thumbnail').setLabel('Edit Thumbnail').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_hero').setLabel('Edit Hero Image').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_color').setLabel('Edit Color').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_btn_type_button').setLabel('Use Button').setStyle(settings.panelType === 'BUTTON' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_btn_type_dropdown').setLabel('Use Dropdown').setStyle(settings.panelType === 'DROPDOWN' ? ButtonStyle.Success : ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_page_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
    return container;
}

function buildDashboardSetupPage(settings) {
    const welcome = settings.welcomeMsg || '';
    const pingContent = settings.pingContent || '';
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Ticket Dashboard Setup'),
            new TextDisplayBuilder().setContent('Configure the embed and ping message that appears inside the ticket.'),
            new TextDisplayBuilder().setContent(
                `**Ping Msg:** \`${settings.pingEnabled ? 'Enabled' : 'Disabled'}\` | **Embed:** \`${settings.welcomeMsgEnabled ? 'Enabled' : 'Disabled'}\`\n` +
                `**Ping Content:** \`${pingContent}\`\n` +
                `**Welcome Msg:** \`${welcome.substring(0, 40)}${welcome.length > 40 ? '...' : ''}\`\n` +
                `**Dash Title:** \`${settings.dashTitle || 'Not Set'}\`\n` +
                `**Down Image:** \`${(settings.dashThumbnail || '').substring(0, 20)}\` | **Right Image:** \`${(settings.dashHero || 'None').substring(0, 20)}\`\n` +
                `**Dash Color:** \`${settings.dashColor || '#2b2d31'}\` | **Dash Footer:** \`${settings.dashFooter || 'None'}\`\n\n` +
                `*Variables:* \`{user}\` \`{user_name}\` \`{server_name}\` \`{server_icon}\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_btn_ping_toggle').setLabel(settings.pingEnabled ? 'Disable Ping' : 'Enable Ping').setStyle(settings.pingEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_edit_ping_content').setLabel('Edit Ping Msg').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_btn_welcome_toggle').setLabel(settings.welcomeMsgEnabled ? 'Disable Embed' : 'Enable Embed').setStyle(settings.welcomeMsgEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_edit_welcome_msg').setLabel('Edit Welcome').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_dash_title').setLabel('Edit Title').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_dash_thumbnail').setLabel('Edit Down Img').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_edit_dash_hero').setLabel('Edit Right Img').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_dash_color').setLabel('Edit Color').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_dash_footer').setLabel('Edit Footer').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_page_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
    return container;
}

function buildTranscriptSetupPage(settings) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Ticket Transcripts'),
            new TextDisplayBuilder().setContent('Configure where and how ticket transcripts are saved.'),
            new TextDisplayBuilder().setContent(
                `**Status:** \`${settings.transcriptsEnabled ? 'Enabled' : 'Disabled'}\`\n` +
                `**Transcript Channel:** ${settings.transcriptChannelId ? `<#${settings.transcriptChannelId}>` : '`Not Set`'}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_btn_transcript_toggle').setLabel(settings.transcriptsEnabled ? 'Disable' : 'Enable').setStyle(settings.transcriptsEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_page_transcript_logs').setLabel('Set Log Channel').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_page_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
    return container;
}

function buildRolesLimitsPage(settings) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Roles & Limits'),
            new TextDisplayBuilder().setContent('Manage who can handle tickets and how many each user can open.'),
            new TextDisplayBuilder().setContent(
                `**Support Role:** ${settings.staffRoleId ? `<@&${settings.staffRoleId}>` : '`Not Set`'}\n` +
                `**Ticket Limit:** \`${settings.ticketLimit} per user\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_page_roles_select').setLabel('Select Support Role').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_edit_limit').setLabel('Edit Ticket Limit').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_page_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
            )
        );
    return container;
}

module.exports = {
    buildSetupEmbed,
    buildTicketDashboard,
    buildMainManageDashboard,
    buildPanelSetupPage,
    buildDashboardSetupPage,
    buildTranscriptSetupPage,
    buildRolesLimitsPage
};
