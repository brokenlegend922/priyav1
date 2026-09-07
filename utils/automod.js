const db = require('./database');

class AntiMod {
    static getSettings(guildId) {
        const defaultSettings = {
            enabled: false,
            punishment: 'timeout', // ban, kick, timeout, warn
            timeoutDuration: 60, // in seconds (default 1 min)
            protections: {
                anti_spam: false,
                anti_caps: false,
                anti_link: false,
                anti_invites: false,
                anti_mention: false,
                anti_emoji: false,
                anti_nsfw: false
            },
            whitelist: {
                channels: [],
                roles: [],
                users: []
            }
        };

        return db.get('automod', guildId, defaultSettings);
    }

    static saveSettings(guildId, settings) {
        db.set('automod', guildId, settings);
    }

    static deleteSettings(guildId) {
        db.delete('automod', guildId);
    }

    static isWhitelisted(message) {
        const settings = this.getSettings(message.guild.id);
        const AntiNuke = require('./antinuke');
        const nukeSettings = AntiNuke.getSettings(message.guild.id);
        
        // --- TIER 1: ABSOLUTE BYPASS (Owners & Extra Owners) ---
        if (message.author.id === message.guild.ownerId) return true;
        if (message.author.id === process.env.OWNER_ID) return true;
        if (nukeSettings.extraowners && nukeSettings.extraowners.includes(message.author.id)) return true;

        // --- TIER 2: EXPLICIT WHITELIST ---
        if (settings.whitelist.channels.includes(message.channel.id)) return true;
        if (settings.whitelist.users.includes(message.author.id)) return true;
        if (message.member && settings.whitelist.roles.some(r => message.member.roles.cache.has(r))) return true;

        // --- TIER 3: CONDITIONAL PERMISSION BYPASS ---
        // Administrators only bypass if the punishment is light (Warn/Timeout).
        // If the punishment is heavy (Ban/Kick), they MUST be whitelisted.
        const isStaff = message.member && (message.member.permissions.has('ManageMessages') || message.member.permissions.has('Administrator'));
        const isPunishmentLight = ['warn', 'timeout'].includes(settings.punishment);

        if (isStaff && isPunishmentLight) return true;

        return false;
    }

    static isAdmin(member) {
        if (!member) return false;
        if (member.id === process.env.OWNER_ID) return true;
        if (member.id === member.guild.ownerId) return true;
        if (member.permissions.has('Administrator')) return true;
        
        const AntiNuke = require('./antinuke');
        const nukeSettings = AntiNuke.getSettings(member.guild.id);
        if (nukeSettings.extraowners && nukeSettings.extraowners.includes(member.id)) return true;
        
        return false;
    }

    static async log(guild, content) {
        const AntiNuke = require('./antinuke');
        const settings = AntiNuke.getSettings(guild.id); // Reusing Antinuke log channel for consistency
        if (!settings.logChannel) return;

        const channel = guild.channels.cache.get(settings.logChannel);
        if (channel) {
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
            try {
                const embed = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### 🛡️ Sentinel Prime | Automod Alert`),
                    new TextDisplayBuilder().setContent(`**Server:** ${guild.name}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:f>`)
                )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(content)
                    );
                await channel.send({ 
                    components: [embed], 
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                }).catch(() => { });
            } catch (e) { }
        }
    }

    static async punish(message, reason) {
        const settings = this.getSettings(message.guild.id);
        const { punishment, timeoutDuration } = settings;
        const guild = message.guild;
        const user = message.author;
        const member = message.member;

        const fullReason = `[Sentinel Prime Automod] ${reason}`;

        try {
            // 1. EXECUTE PUNISHMENT IMMEDIATELY (Highest Priority)
            let punishPromise;
            switch (punishment) {
                case 'warn':
                    punishPromise = message.channel.send(`⚠️ <@${user.id}>, ${reason}`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                    break;
                case 'timeout':
                    if (member && member.manageable) {
                        punishPromise = member.timeout(timeoutDuration * 1000, fullReason);
                    } else {
                        punishPromise = message.channel.send(`⚠️ <@${user.id}>, ${reason} (Timeout failed: Bot lacks permissions)`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                    }
                    break;
                case 'kick':
                    if (member && member.manageable) {
                        punishPromise = member.kick(fullReason);
                    } else {
                        punishPromise = message.channel.send(`⚠️ <@${user.id}>, ${reason} (Kick failed: Bot lacks permissions)`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                    }
                    break;
                case 'ban':
                    if (member && member.manageable) {
                        punishPromise = guild.members.ban(user.id, { reason: fullReason });
                    } else {
                        punishPromise = message.channel.send(`⚠️ <@${user.id}>, ${reason} (Ban failed: Bot lacks permissions)`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                    }
                    break;
            }

            // 2. BACKGROUND TASKS (DMs & Logs) - Do not 'await' these so the loop continues instantly
            const { sendModDM } = require('./modLogger');
            sendModDM(user, guild, `Automod: ${punishment.toUpperCase()}`, reason).catch(() => {});
            
            // Wait for punishment to resolve only if needed (usually good for error catching)
            if (punishPromise) await punishPromise.catch(() => {});

        } catch (e) {
            console.error('[AUTOMOD PUNISH ERROR]', e);
        }
    }

    // --- CHECKERS ---
    static checkCaps(content) {
        if (content.length < 10) return false;
        const caps = content.replace(/[^A-Z]/g, "").length;
        const ratio = caps / content.length;
        return ratio > 0.7; // More than 70% caps
    }

    static checkLinks(content) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        return urlRegex.test(content);
    }

    static checkInvites(content) {
        const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/gi;
        return inviteRegex.test(content);
    }

    static checkMentions(message) {
        return message.mentions.users.size >= 3 || message.mentions.roles.size >= 3;
    }

    static checkEmojis(content) {
        const emojiRegex = /<a?:.+?:\d+>|[\u{1f300}-\u{1f5ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{1f1e6}-\u{1f1ff}\u{2702}-\u{27b0}\u{24c2}-\u{1f251}]/gu;
        const matches = content.match(emojiRegex);
        return matches && matches.length > 8;
    }

    static checkNSFW(content) {
        const nsfwDomains = ['porn', 'sex', 'xvideos', 'xnxx', 'rule34', 'hentai', 'brazzers', 'pornhub']; // Add more as needed
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const matches = content.match(urlRegex);
        if (!matches) return false;
        return matches.some(url => nsfwDomains.some(domain => url.toLowerCase().includes(domain)));
    }
}

// Spam track (In-memory for performance, could be moved to file if needed)
const userMessages = new Map();
AntiMod.checkSpam = (message) => {
    const userId = message.author.id;
    const now = Date.now();
    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }
    const timestamps = userMessages.get(userId);
    timestamps.push(now);
    // Remove timestamps older than 5 seconds
    const filtered = timestamps.filter(t => now - t < 5000);
    userMessages.set(userId, filtered);
    return filtered.length > 5; // More than 5 messages in 5 seconds
};

module.exports = AntiMod;
