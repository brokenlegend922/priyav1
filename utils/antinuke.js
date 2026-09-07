const db = require('./database');

const AntiNuke = {
    getSettings(guildId) {
        const defaultSettings = {
            enabled: false,
            panic: false,
            punishment: 'ban',
            whitelist: [], 
            whitelists: {}, 
            extraowners: [],
            logChannel: null,
            recovery: true, 
            protections: {
                anti_ban: true, anti_unban: true, anti_kick: true,
                anti_bot: true, channel_protection: true, role_protection: true,
                member_update: true, emoji_sticker: true, guild_settings: true,
                webhook_security: true, automod_protection: true, guild_events: true,
                thread_protection: true, invite_protection: true, everyone_ping: true,
                member_prune: true
            }
        };

        return db.get('antinuke', guildId, defaultSettings);
    },

    saveSettings(guildId, settings) {
        db.set('antinuke', guildId, settings);
    },

    deleteSettings(guildId) {
        db.delete('antinuke', guildId);
    },

    getWhitelistUser(guildId, userId) {
        const settings = this.getSettings(guildId);
        if (settings.whitelist && settings.whitelist.includes(userId)) return { full: true };
        if (settings.whitelists && settings.whitelists[userId]) return settings.whitelists[userId];
        return null;
    },

    isWhitelisted(guild, userId, check = null) {
        const settings = this.getSettings(guild.id);
        if (userId === guild.ownerId) return true;
        if (userId === process.env.OWNER_ID) return true;
        if (settings.extraowners && settings.extraowners.includes(userId)) return true;
        const perms = this.getWhitelistUser(guild.id, userId);
        if (!perms) return false;
        if (check && perms[check] === false) return false;
        return true;
    },

    async punish(guild, userId, reason) {
        try {
            const settings = this.getSettings(guild.id);
            const fullReason = `[Sentinel Prime Antinuke] ${reason}`;
            if (userId === process.env.OWNER_ID) return; 

            // 1. FAST PATH: BAN (Doesn't need member fetch)
            if (settings.punishment === 'ban') {
                await guild.members.ban(userId, { reason: fullReason }).catch(() => { });
            } else {
                // 2. SLOW PATH: KICK/STRIP (Needs member fetch)
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member && member.manageable) {
                    if (settings.punishment === 'kick') {
                        await member.kick(fullReason).catch(() => { });
                    } else if (settings.punishment === 'strip') {
                        await member.roles.set([], fullReason).catch(() => { });
                    }
                }
            }

            // 3. BACKGROUND TASK: DM (Do not 'await' to keep it fast)
            (async () => {
                try {
                    const { sendModDM } = require('./modLogger');
                    const targetUser = await guild.client.users.fetch(userId).catch(() => null);
                    if (targetUser) await sendModDM(targetUser, guild, `Antinuke: ${settings.punishment.toUpperCase()}`, reason);
                } catch (dmErr) {}
            })();

        } catch (e) {
            console.error('[ANTINUKE PUNISH ERROR]', e);
        }
    },

    async log(guild, content) {
         try {
            const settings = this.getSettings(guild.id);
            if (!settings.logChannel) return;
            const channel = guild.channels.cache.get(settings.logChannel);
            if (channel) {
                const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
                const embed = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### 🛡️ Sentinel Prime | Security Alert`),
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
            }
        } catch (e) {}
    }
};

module.exports = AntiNuke;
