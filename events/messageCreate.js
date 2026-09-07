const { Events, ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const AntiMod = require('../utils/automod');
const NoPrefix = require('../utils/noprefix');
const { getSetupState, removeSetupState } = require('../utils/ticketState');
const { getSettings, saveSettings } = require('../utils/ticketData');
const {
    buildMainManageDashboard,
    buildPanelSetupPage,
    buildDashboardSetupPage,
    buildTranscriptSetupPage,
    buildRolesLimitsPage
} = require('../utils/ticketUI');
const { logToDevChannel } = require('../utils/logger');
const { buildMentionContainer, categories } = require('../utils/helpUI');
const { formatTime } = require('../utils/playerUI');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- TICKET SETUP REDIRECT (NO MODALS) ---
        const setupState = getSetupState(message.author.id);

        if (setupState && setupState.guildId === message.guild.id && setupState.channelId === message.channel.id) {
            const settings = getSettings(message.guild.id);
            const value = message.content;

            if (value.toLowerCase() === 'cancel') {
                removeSetupState(message.author.id);
                await message.delete().catch(() => { });
                return message.channel.send({ content: '❌ Setup cancelled.', flags: (1 << 6) }).then(m => setTimeout(() => m.delete().catch(() => { }), 3000));
            }

            const field = setupState.field;
            if (field === 'title') settings.customTitle = value;
            if (field === 'desc') settings.customDescription = value;
            if (field === 'footer') settings.customFooter = value === 'none' ? null : value;
            if (field === 'color') settings.customColor = value;
            if (field === 'welcome_msg') settings.welcomeMsg = value;
            if (field === 'thumbnail') settings.customThumbnail = value === 'none' ? null : value;
            if (field === 'hero') settings.customHero = value === 'none' ? null : value;
            if (field === 'limit') settings.ticketLimit = parseInt(value) || 5;

            // Dashboard Fields
            if (field === 'dash_title') settings.dashTitle = value;
            if (field === 'dash_color') settings.dashColor = value;
            if (field === 'dash_thumbnail') settings.dashThumbnail = value;
            if (field === 'dash_hero') settings.dashHero = value === 'none' ? null : value;
            if (field === 'dash_footer') settings.dashFooter = value === 'none' ? null : value;
            if (field === 'ping_content') settings.pingContent = value;

            saveSettings(message.guild.id, settings);
            removeSetupState(message.author.id);
            await message.delete().catch(() => { });

            // Refresh Dashboard - find the original dashboard message
            const recentMessages = await message.channel.messages.fetch({ limit: 20 });
            const dashMsg = recentMessages.find(m =>
                m.author.id === message.client.user.id &&
                m.components.some(row => row.components.some(b => b.data.custom_id?.startsWith('ticket_')))
            );

            if (dashMsg) {
                const allButtons = dashMsg.components.flatMap(row => row.components);
                // Page Identification
                const isPanel = allButtons.some(b => b.data.custom_id === 'ticket_edit_title');
                const isWelcome = allButtons.some(b => b.data.custom_id === 'ticket_edit_welcome_msg');
                const isTranscript = allButtons.some(b => b.data.custom_id === 'ticket_page_transcript_logs');
                const isRoles = allButtons.some(b => b.data.custom_id === 'ticket_edit_limit');

                let newComps = [buildMainManageDashboard(settings)];
                if (isPanel) newComps = [buildPanelSetupPage(settings)];
                if (isWelcome) newComps = [buildDashboardSetupPage(settings)];
                if (isTranscript) newComps = [buildTranscriptSetupPage(settings)];
                if (isRoles) newComps = [buildRolesLimitsPage(settings)];

                await dashMsg.edit({ components: newComps, flags: MessageFlags.IsComponentsV2 });
            }

            const successMsg = await message.channel.send({ content: `✅ **Successfully updated ${field}!** (The message you sent has been deleted for privacy)` });
            setTimeout(() => successMsg.delete().catch(() => { }), 4000);
            return;
        }

        // --- ANTINUKE... ---
        const AntiNuke = require('../utils/antinuke');
        const nukeSettings = AntiNuke.getSettings(message.guild.id);

        if (nukeSettings.enabled && nukeSettings.protections.everyone_ping) {
            const hasEveryone = message.content.includes('@everyone') || message.content.includes('@here');

            if (hasEveryone) {
                if (!AntiNuke.isWhitelisted(message.guild, message.author.id, 'everyone_ping')) {
                    await message.delete().catch(() => { });
                    await AntiNuke.punish(message.guild, message.author.id, 'Unauthorized Everyone/Here Ping');
                    AntiNuke.log(message.guild, `⚠️ **Antinuke Triggered**\n**Executor:** <@${message.author.id}>\n**Action:** Everyone/Here Ping\n**Reason:** Unauthorized mass mention detected.`);
                    return;
                }
            }
        }
        // --- AUTOMOD PROTECTION SYSTEM ---
        const autoModSettings = AntiMod.getSettings(message.guild.id);

        if (autoModSettings.enabled) {
            let triggered = false;
            let reason = '';

            // Check if user is whitelisted or admin
            if (!AntiMod.isWhitelisted(message)) {
                if (autoModSettings.protections.anti_spam && AntiMod.checkSpam(message)) {
                    triggered = true; reason = 'Message Spamming';
                } else if (autoModSettings.protections.anti_invites && AntiMod.checkInvites(message.content)) {
                    triggered = true; reason = 'Discord Invite Link';
                } else if (autoModSettings.protections.anti_link && AntiMod.checkLinks(message.content)) {
                    triggered = true; reason = 'External Link';
                } else if (autoModSettings.protections.anti_nsfw && AntiMod.checkNSFW(message.content)) {
                    triggered = true; reason = 'NSFW Content Link';
                } else if (autoModSettings.protections.anti_caps && AntiMod.checkCaps(message.content)) {
                    triggered = true; reason = 'Excessive Caps';
                } else if (autoModSettings.protections.anti_mention && AntiMod.checkMentions(message)) {
                    triggered = true; reason = 'Mass Mentioning';
                } else if (autoModSettings.protections.anti_emoji && AntiMod.checkEmojis(message.content)) {
                    triggered = true; reason = 'Emoji Spam';
                }

                if (triggered) {
                    message.delete().catch(() => { });
                    AntiMod.punish(message, reason);
                    AntiMod.log(message.guild, `⚠️ **Automod Triggered**\n**Executor:** <@${message.author.id}>\n**Violation:** ${reason}\n**Action Taken:** ${autoModSettings.punishment.toUpperCase()}`);
                    return; // Stop further processing if automod triggered
                }
            }
        }
        // ----------------------------------------------

        const db = require('../utils/database');
        const pObj = db.get('prefixes', message.guild.id, { prefix: process.env.PREFIX || '?' });
        const prefix = pObj.prefix;

        const mentionPrefix = `<@${message.client.user.id}>`;
        const mentionPrefixNickname = `<@!${message.client.user.id}>`;

        const isNoPrefixUser = NoPrefix.isNoPrefix(message.author.id) || message.author.id === process.env.OWNER_ID;

        const aliases = {
            'j': 'join', 'dc': 'leave', 'stop': 'leave', 'p': 'play',
            'ap': 'autoplay', 's': 'skip', 'h': 'help', 'mwl': 'multiwhitelist',
            'rt': 'removetrack', 'rs': 'resume', 'np': 'noprefix',
            'stfu': 'timeout', 'chup': 'timeout', 'tm': 'timeout',
            'gstart': 'giveaway', 'gend': 'giveaway', 'greroll': 'giveaway',
            'fuckban': 'ban', 'unfuckban': 'unban', 'unstfu': 'untimeout', 'uchup': 'untimeout',
            'ui': 'userinfo', 'si': 'serverinfo', 'av': 'avatar', 'bn': 'banner', 'sicon': 'servericon', 'bi': 'botinfo',
            'swl': 'serverwl', 'sle': 'serverleave', 'chat': 'ai', 'ask': 'ai'
        };

        let usedPrefix = '';
        if (message.content.toLowerCase().startsWith(prefix.toLowerCase())) {
            // Strict check: No space allowed after prefix
            if (message.content[prefix.length] === ' ') return;
            usedPrefix = prefix;
        } else if (message.content.startsWith(mentionPrefix)) {
            usedPrefix = mentionPrefix;
        } else if (message.content.startsWith(mentionPrefixNickname)) {
            usedPrefix = mentionPrefixNickname;
        } else if (isNoPrefixUser) {
            const firstWord = message.content.split(/ +/)[0].toLowerCase();
            const cmdName = aliases[firstWord] || firstWord;
            if (message.client.commands.has(cmdName)) {
                usedPrefix = '';
            } else {
                return;
            }
        } else {
            return; // Not a command
        }

        const args = usedPrefix ? message.content.slice(usedPrefix.length).trim().split(/ +/) : message.content.trim().split(/ +/);
        const originalName = args.shift()?.toLowerCase();
        let commandName = originalName;

        // If only the bot was mentioned (no command followed), show the mention response
        if (!originalName && usedPrefix.startsWith('<@')) {
            return message.reply({ components: [buildMentionContainer(prefix)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        }

        if (aliases[commandName]) {
            commandName = aliases[commandName];
        }

        // --- IGNORED CHANNEL CHECK ---
        const ignoredData = db.get('ignored_channels', message.guild.id, { channels: [] });
        if (ignoredData.channels.includes(message.channel.id)) {
            const isOwner = message.author.id === process.env.OWNER_ID;
            const canManage = message.member.permissions.has('Administrator') || message.member.permissions.has('ManageChannels');

            // Allow only owner/admin to run 'ignore' to undo the setting
            if (commandName !== 'ignore' && !isOwner) return;
            // Even if admin, we skip regular commands to show it's working
            if (commandName !== 'ignore' && canManage && !isOwner) return;
        }
        // -----------------------------

        const command = message.client.commands.get(commandName);
        if (!command) {
            const allPlanned = Object.values(categories).flat();
            if (allPlanned.includes(commandName)) {
                const devMsg = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### 🛠️ Under Development`),
                        new TextDisplayBuilder().setContent(`The command \`${commandName}\` is currently being built by our developers and is not yet available for public use.\n\n**Status:** Developers have been notified of your interest!`)
                    );
                await message.reply({ components: [devMsg], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

                await logToDevChannel(message.client, 'usage', { commandName, userTag: message.author.tag, userId: message.author.id, guildName: message.guild.name, guildId: message.guild.id, channelId: message.channel.id });
                return;
            }
            return;
        }

        // --- Permission Check for Prefix Commands ---
        const requiredPerms = command.data.default_member_permissions || (command.data.toJSON ? command.data.toJSON().default_member_permissions : null);
        if (requiredPerms) {
            const permsBigInt = BigInt(requiredPerms);
            const isWhitelisted = AntiNuke.isWhitelisted(message.guild, message.author.id);
            const isOwner = message.author.id === message.guild.ownerId;
            const isDev = message.author.id === process.env.OWNER_ID;

            if (!message.member.permissions.has(permsBigInt) && !isOwner && !isWhitelisted && !isDev) {
                const { PermissionsBitField } = require('discord.js');
                const missingPerms = new PermissionsBitField(permsBigInt).toArray().filter(p => !message.member.permissions.has(p));
                const permNames = missingPerms.join(', ') || 'Authorized Access';

                const permErrContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### 🛡️ Unauthorized Action`),
                        new TextDisplayBuilder().setContent(`You do not have the required permissions to execute this command.\n\n**Required:** \`${permNames}\``)
                    );
                return message.reply({ components: [permErrContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }
        }
        // ------------------------------------------

        // --- MOCK INTERACTION FOR PREFIX COMMANDS ---
        let replyMessage;
        const interactionMock = {
            client: message.client,
            isMock: true,
            _rawName: originalName,
            originalMessage: message,
            user: message.author,
            member: message.member,
            guild: message.guild,
            guildId: message.guild.id,
            channelId: message.channel.id,
            channel: message.channel,
            createdTimestamp: message.createdTimestamp,
            isChatInputCommand: () => true,
            isCommand: () => true,
            isButton: () => false,
            options: {
                getSubcommand: () => {
                    // Check if the original command name WAS a subcommand (e.g. ?gstart)
                    const subMap = { 'gstart': 'start', 'gend': 'end', 'greroll': 'reroll' };
                    if (subMap[interactionMock._rawName]) return subMap[interactionMock._rawName];

                    const commandData = command.data.toJSON ? command.data.toJSON() : command.data;
                    const subcommands = (commandData.options || []).filter(opt => opt.type === 1);
                    if (subcommands.length > 0 && args.length > 0) {
                        const sub = subcommands.find(s => s.name === args[0].toLowerCase());
                        if (sub) return sub.name;
                    }
                    return null;
                },
                getSubcommandGroup: () => null,
                getString: (name) => {
                    const commandData = command.data.toJSON ? command.data.toJSON() : command.data;
                    const subName = interactionMock.options.getSubcommand();
                    let options = (commandData.options || []).filter(o => ![1, 2].includes(o.type)); // Filter out subcommands and groups

                    if (subName) {
                        const sub = (commandData.options || []).find(o => o.name === subName);
                        options = (sub?.options || []).filter(o => ![1, 2].includes(o.type));
                    }

                    const optIndex = options.findIndex(o => o.name === name);
                    if (optIndex === -1) return null;

                    const subMap = { 'gstart': 'start', 'gend': 'end', 'greroll': 'reroll' };
                    const isDirectSub = !!subMap[interactionMock._rawName];
                    const localArgs = (subName && !isDirectSub) ? args.slice(1) : [...args];

                    // Logic: If it's a string, and it's either the last option or there are missing args, join them
                    const isLastOption = optIndex === options.length - 1;
                    const isString = options[optIndex].type === 3;

                    if (isString && isLastOption) {
                        return localArgs.slice(optIndex).join(' ') || null;
                    }

                    return localArgs[optIndex] || null;
                },
                getInteger: (name) => {
                    const val = interactionMock.options.getString(name);
                    return val ? parseInt(val) : null;
                },
                getNumber: (name) => {
                    const val = interactionMock.options.getString(name);
                    return val ? parseFloat(val) : null;
                },
                getBoolean: (name) => {
                    const val = interactionMock.options.getString(name);
                    return val === 'true' || val === 'yes' || val === 'on';
                },
                getUser: (name) => {
                    const user = message.mentions.users.first();
                    if (user) return user;
                    const id = interactionMock.options.getString(name);
                    return message.client.users.cache.get(id) || null;
                },
                getMember: (name) => {
                    const member = message.mentions.members.first();
                    if (member) return member;
                    const id = interactionMock.options.getString(name);
                    return message.guild.members.cache.get(id) || null;
                },
                getChannel: (name) => {
                    const channel = message.mentions.channels.first();
                    if (channel) return channel;
                    const id = interactionMock.options.getString(name);
                    return message.guild.channels.cache.get(id) || null;
                },
                getRole: (name) => {
                    const role = message.mentions.roles.first();
                    if (role) return role;
                    const id = interactionMock.options.getString(name);
                    return message.guild.roles.cache.get(id) || null;
                }
            },
            reply: async (data) => {
                interactionMock.replied = true;
                try {
                    let payload = typeof data === 'string' ? { content: data } : { ...data };
                    payload.allowedMentions = { parse: [] };
                    if (payload.components && payload.components[0] && (payload.components[0].type === 17 || payload.components[0] instanceof ContainerBuilder)) {
                        payload.flags = MessageFlags.IsComponentsV2;
                        replyMessage = await message.channel.send(payload);
                    } else {
                        replyMessage = await message.reply(payload);
                    }
                    return replyMessage;
                } catch (e) {
                    console.error("Mock Reply Error:", e);
                    return await message.channel.send(data).catch(() => { });
                }
            },
            deferReply: async () => { return; },
            editReply: async (data) => {
                try {
                    if (!replyMessage) return interactionMock.reply(data);
                    let payload = typeof data === 'string' ? { content: data } : { ...data };
                    payload.allowedMentions = { parse: [] };
                    if (payload.components && payload.components[0] && (payload.components[0].type === 17 || payload.components[0] instanceof ContainerBuilder)) {
                        payload.flags = MessageFlags.IsComponentsV2;
                    }
                    return await replyMessage.edit(payload);
                } catch (e) {
                    console.error("Mock Edit Error:", e);
                    if (replyMessage) return await replyMessage.edit(data).catch(() => { });
                }
            },
            followUp: async (data) => interactionMock.reply(data)
        };

        // --- PREMIUM USAGE GUIDANCE SYSTEM ---
        const commandData = command.data.toJSON ? command.data.toJSON() : command.data;
        const subName = interactionMock.options.getSubcommand();
        const subMap = { 'gstart': 'start', 'gend': 'end', 'greroll': 'reroll' };
        const isDirectSub = !!subMap[interactionMock._rawName];

        let activeOptions = commandData.options || [];
        if (subName) {
            const sub = activeOptions.find(o => o.name === subName);
            if (sub) activeOptions = sub.options || [];
        }

        const requiredOptions = activeOptions.filter(opt => opt.required);
        const providedArgsCount = (subName && !isDirectSub ? args.slice(1) : args).length + (message.attachments.size);

        // Check if subcommands exist but none were used
        const hasSubcommands = (commandData.options || []).some(o => o.type === 1);
        let needsUsage = providedArgsCount < requiredOptions.length;
        if (hasSubcommands && !subName) needsUsage = true;

        // Custom check for known commands with complex requirements (like premium)
        if (commandName === 'premium' && subName === 'add' && args.length > 1 && !['guild', 'user'].includes(args[1].toLowerCase())) {
            needsUsage = true;
        }

        if (needsUsage) {
            // Adjust usage string for direct subcommand aliases
            let usageStr = `${usedPrefix}${isDirectSub ? interactionMock._rawName : commandData.name}${subName && !isDirectSub ? ` ${subName}` : ''}`;

            const argGuide = activeOptions.map(opt => {
                const typeLabel = opt.required ? `<${opt.name}>` : `[${opt.name}]`;
                const typeHint = opt.type === 3 ? 'Text' : opt.type === 4 ? 'Number' : opt.type === 6 ? 'User' : opt.type === 7 ? 'Channel' : opt.type === 8 ? 'Role' : 'Data';
                return `> **${typeLabel}** \`(${typeHint})\`: -# ${opt.description}`;
            }).join('\n');

            const usageEmbed = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ℹ️ Command Intelligence: ${isDirectSub ? interactionMock._rawName.toUpperCase() : commandData.name.toUpperCase()}`),
                    new TextDisplayBuilder().setContent(`**Current Syntax:** \`${usageStr} ${activeOptions.map(o => o.required ? `<${o.name}>` : `[${o.name}]`).join(' ')}\``)
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Required Arguments:**\n${argGuide || '-# No parameters required.'}`)
                );

            return message.reply({ components: [usageEmbed], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        }
        // ------------------------------------------

        try {
            await command.execute(interactionMock, args);
        } catch (error) {
            console.error(`[COMMAND ERROR] ${commandName}:`, error);
            await logToDevChannel(message.client, 'error', { commandName, userTag: message.author.tag, userId: message.author.id, guildName: message.guild.name, guildId: message.guild.id, channelId: message.channel.id, error });

            const errContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ❌ Technical Error`),
                    new TextDisplayBuilder().setContent(`This command encountered an internal error: \`${error.message}\`\n\n**Note:** Our development team has been automatically notified.`)
                );

            if (interactionMock.replied) {
                await interactionMock.editReply({ components: [errContainer] }).catch(() => { });
            } else {
                await message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
            }
        }
    },
};
