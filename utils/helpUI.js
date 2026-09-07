const {
    ContainerBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');

require('dotenv').config();

const categories = {
    'Antinuke': ['antinuke', 'extraowner', 'multiwhitelist', 'whitelist'],
    'Automod': ['antighostping', 'automod', 'automodwhitelist'],
    'Giveaway': ['gdelete', 'gend', 'glist', 'greroll', 'gstart'],
    'Info': ['avatar', 'banner', 'botinfo', 'servericon', 'serverinfo', 'stats', 'userinfo'],
    'Moderation': ['ban', 'clear', 'hide', 'kick', 'lock', 'lockall', 'timeout', 'unban', 'unhide', 'unlock', 'unlockall', 'untimeout', 'warn'],
    'Music': ['autoplay', 'join', 'leave', 'pause', 'play', 'queue', 'removetrack', 'resume', 'skip'],
    'Premium': ['botsetup', 'noprefix', 'premium', 'setprofile'],
    'Roles': ['autorole', 'role'],
    'Tickets': ['ticket'],
    'Utility': ['editsnipe', 'help', 'ignore', 'invite', 'membercount', 'ping', 'ai', 'setprefix', 'snipe', 'uptime'],
    'Welcome': ['greet'],
    'Developer': ['serverleave', 'serverwl']
};

const categoryEmojis = {
    'Antinuke': '🛡️',
    'Automod': '✨',
    'Giveaway': '🎉',
    'Info': 'ℹ️',
    'Moderation': '✨',
    'Music': '🎵',
    'Premium': '✨',
    'Roles': '🏷️',
    'Tickets': '✨',
    'Utility': '🛠️',
    'Welcome': '✨',
    'Developer': '🔹'
};

const commandDescriptions = {
    // Moderation
    'ban': '-# Permanently remove a member from the server',
    'clear': '-# Batch delete messages from the current channel',
    'kick': '-# Kick a member with confirmation',
    'warn': '-# Manage user warnings',
    'lock': '-# Instant channel lockdown',
    'unlock': '-# Restore channel messaging',
    'hide': '-# Make a channel invisible to members',
    'unhide': '-# Show a hidden channel',
    'lockall': '-# Lock every text channel in the server',
    'unlockall': '-# Unlock every text channel in the server',
    'timeout': '-# Temporarily restrict a member from interacting',
    'untimeout': '-# Remove an active timeout from a user',
    'unban': '-# Remove a user from the server blacklist',
    'role': '-# Dynamically manage user roles',
    // Utility
    'autorole': '-# Automatically assign roles to new members on join',
    'ping': '-# Check bot & API response times',
    'ignore': '-# Disable bot commands in specific channels',
    'setprefix': '-# Customize the bot prefix for this server',
    'membercount': '-# View total user/bot statistics',
    'uptime': '-# Check how long the bot has been active',
    'invite': '-# Get the bot\'s invite link',
    'snipe': '-# View the last deleted message',
    'editsnipe': '-# View the last edited message (es)',
    'help': '-# Display the bot help menu',
    'ticket': '-# Access the support ticket system',
    // Music
    'autoplay': '-# Enable or disable automatic music playback',
    'join': '-# Join your current voice channel',
    'leave': '-# Stop music and leave the voice channel',
    'pause': '-# Pause the currently playing song',
    'play': '-# Play a song from YouTube or Spotify',
    'queue': '-# View the current music queue',
    'removetrack': '-# Remove a specific track from the queue',
    'resume': '-# Resume playback of a paused song',
    'skip': '-# Skip the current playing track',
    // Info
    'userinfo': '-# Shows detailed information about the user',
    'serverinfo': '-# Shows detailed information about the server',
    'avatar': '-# View user avatars',
    'banner': '-# View user profile banners',
    'servericon': '-# View server icon',
    'botinfo': '-# View core technical details about Sentinel Prime',
    'stats': '-# View real-time bot performance statistics',
    // Antinuke
    'antinuke': '-# Enable/Disable the Antinuke system',
    'extraowner': '-# Manage extra owners for Antinuke bypass',
    'multiwhitelist': '-# Whitelist multiple users at once',
    'whitelist': '-# Whitelist a user from Antinuke actions',
    // Automod
    'antighostping': '-# Detect and log ghost pings',
    'automod': '-# Manage automatic content moderation',
    'automodwhitelist': '-# Whitelist users from automod',
    // Giveaway
    'gdelete': '-# Delete an active giveaway',
    'gend': '-# End a giveaway and choose winners',
    'glist': '-# List all active giveaways',
    'greroll': '-# Reroll a giveaway winner',
    'gstart': '-# Start a new giveaway in the channel',
    // Premium
    'premium': '-# Manage server and user premium status',
    'botsetup': '-# Change bot name, avatar, and banner (Premium Only)',
    'setprofile': '-# Configure global profile settings',
    'noprefix': '-# Manage zero-prefix protocol users',
    'serverleave': '-# Force the bot to leave a specific server',
    'serverwl': '-# Whitelist servers from member requirements',
    // Welcome
    'greet': '-# Configure welcome greetings for new members'
};

function buildNavigationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_home')
            .setLabel('Home')
            .setStyle(ButtonStyle.Secondary)
    );
}

function buildCategorySelect() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Choose a module to explore...')
            .addOptions(
                Object.keys(categories).sort().map(cat => ({
                    label: cat,
                    value: `help_cat_${cat.toLowerCase()}`,
                    description: `Explore the ${cat} module commands`,
                    emoji: categoryEmojis[cat]
                }))
            )
    );
}

function buildHomeContainer(guildId) {
    const db = require('./database');
    const p = db.get('prefixes', guildId, { prefix: process.env.PREFIX || '?' });
    const prefix = p.prefix;
    const totalCommands = Object.values(categories).reduce((acc, curr) => acc + curr.length, 0);

    const identity = db.get('identity', guildId, { banner: null });

    const categoryList = Object.keys(categories)
        .sort()
        .map(cat => `${categoryEmojis[cat] || '❓'} **${cat}**`)
        .join('\n');

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ⚠️ Sentinel Prime — Help Menu ⚠️`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> My current prefix in this server is \`${prefix}\`.\n> Modules: \`${Object.keys(categories).length}\` · Total Commands: \`${totalCommands}\``)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(categoryList)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Select a module from the menu below to view its specific command set.`)
        )
        .addActionRowComponents(buildCategorySelect());
}

function buildCategoryContainer(category, prefix) {
    const categoryTitle = Object.keys(categories).find(c => c.toLowerCase() === category.toLowerCase()) || category;
    const cmds = categories[categoryTitle] || [];
    const emoji = categoryEmojis[categoryTitle] || '❓';
    const currentPrefix = prefix || '?';

    const cmdList = cmds.sort().map(c => {
        const desc = commandDescriptions[c] || '-# Module documentation under review.';
        return `**\`${currentPrefix}${c}\`** \n${desc}\n`;
    }).join('\n');

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emoji} ${categoryTitle} — Module Commands`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### [ ${cmds.length} Protocols Loaded ]\n\n${cmdList}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(buildNavigationRow());
}

function buildMentionContainer(prefix) {
    const currentPrefix = prefix || '?';
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## ⚠️ Sentinel Prime'),
            new TextDisplayBuilder().setContent(`> My localized prefix is set to \`${currentPrefix}\`.\n> Advanced protocols are ready for deployment.`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Select the **Help Menu** to view my command processing capabilities.')
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_home')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('Invite')
                    .setURL('https://discord.com/api/oauth2/authorize?client_id=1495501114705969152&permissions=8&integration_type=0&scope=bot')
                    .setStyle(ButtonStyle.Link)
            )
        );
}

module.exports = {
    categories,
    buildHomeContainer,
    buildCategoryContainer,
    buildMentionContainer
};
