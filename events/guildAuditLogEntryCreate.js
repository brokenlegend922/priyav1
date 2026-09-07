const { Events, AuditLogEvent, PermissionsBitField, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

const ProtectedActions = [
    AuditLogEvent.ChannelCreate, AuditLogEvent.ChannelDelete, AuditLogEvent.ChannelUpdate,
    AuditLogEvent.RoleCreate, AuditLogEvent.RoleDelete, AuditLogEvent.RoleUpdate,
    AuditLogEvent.MemberKick, AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberBanRemove,
    AuditLogEvent.MemberUpdate, AuditLogEvent.MemberRoleUpdate,
    AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookDelete, AuditLogEvent.WebhookUpdate,
    AuditLogEvent.GuildUpdate, AuditLogEvent.BotAdd, AuditLogEvent.IntegrationCreate,
    AuditLogEvent.MemberPrune
];

module.exports = {
    name: Events.GuildAuditLogEntryCreate,
    async execute(auditLog, guild) {
        if (!auditLog) return;
        const AntiNuke = require('../utils/antinuke');
        const { action, executorId, targetId, reason, changes } = auditLog;

        if (executorId === guild.client.user.id) return;
        if (AntiNuke.isWhitelisted(guild, executorId)) return;

        const settings = AntiNuke.getSettings(guild.id);
        if (!settings.enabled) return;

        if (ProtectedActions.includes(action)) {
            // Mapping for readable log
            const map = {
                [AuditLogEvent.ChannelCreate]: 'Created Channel',
                [AuditLogEvent.ChannelDelete]: 'Deleted Channel',
                [AuditLogEvent.ChannelUpdate]: 'Updated Channel',
                [AuditLogEvent.RoleCreate]: 'Created Role',
                [AuditLogEvent.RoleDelete]: 'Deleted Role',
                [AuditLogEvent.RoleUpdate]: 'Updated Role Permissions',
                [AuditLogEvent.MemberKick]: 'Kicked Member',
                [AuditLogEvent.MemberBanAdd]: 'Banned Member',
                [AuditLogEvent.MemberBanRemove]: 'Unbanned Member',
                [AuditLogEvent.MemberUpdate]: 'Updated Member',
                [AuditLogEvent.MemberRoleUpdate]: 'Updated Member Roles',
                [AuditLogEvent.WebhookCreate]: 'Created Webhook',
                [AuditLogEvent.WebhookDelete]: 'Deleted Webhook',
                [AuditLogEvent.WebhookUpdate]: 'Updated Webhook',
                [AuditLogEvent.BotAdd]: 'Invited Bot',
                [AuditLogEvent.IntegrationCreate]: 'Created Integration',
                [AuditLogEvent.GuildUpdate]: 'Updated Server Settings',
                [AuditLogEvent.MemberPrune]: 'Pruned Members'
            };

            const actionName = map[action] || `Unknown (${action})`;
            const settings = AntiNuke.getSettings(guild.id);
            if (!settings.enabled) return;

            const p = settings.protections;
            let shouldPunish = false;
            let logReason = `Unauthorized ${actionName}`;

            switch (action) {
                case AuditLogEvent.ChannelCreate:
                case AuditLogEvent.ChannelDelete:
                case AuditLogEvent.ChannelUpdate:
                    if (p.channel_protection) shouldPunish = true;
                    break;
                case AuditLogEvent.RoleCreate:
                case AuditLogEvent.RoleDelete:
                    if (p.role_protection) shouldPunish = true;
                    break;
                case AuditLogEvent.RoleUpdate:
                    if (p.role_protection) {
                        const adminChange = changes.find(c => c.key === 'permissions' && (BigInt(c.new) & PermissionsBitField.Flags.Administrator));
                        if (adminChange) {
                            shouldPunish = true;
                            logReason = "Admin Escalted Role Update";
                        }
                    }
                    break;
                case AuditLogEvent.MemberKick:
                    if (p.anti_kick) shouldPunish = true;
                    break;
                case AuditLogEvent.MemberBanAdd:
                    if (p.anti_ban) shouldPunish = true;
                    break;
                case AuditLogEvent.MemberBanRemove:
                    if (p.anti_unban) shouldPunish = true;
                    break;
                case AuditLogEvent.MemberUpdate:
                    if (p.member_update) shouldPunish = true;
                    break;
                case AuditLogEvent.MemberRoleUpdate:
                    if (p.member_update || p.role_protection) {
                        // Check if any added roles have Admin or similar dangerous perms
                        const addedRoles = changes.find(c => c.key === '$add');
                        if (addedRoles) {
                            const dangerous = addedRoles.new.some(r => {
                                const role = guild.roles.cache.get(r.id);
                                return role && (role.permissions.has(PermissionsBitField.Flags.Administrator) || 
                                                role.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                                                role.permissions.has(PermissionsBitField.Flags.BanMembers));
                            });
                            if (dangerous) {
                                shouldPunish = true;
                                logReason = "Unauthorized Dangerous Role Assignment";
                            }
                        }
                    }
                    break;
                case AuditLogEvent.BotAdd:
                    if (p.anti_bot) shouldPunish = true;
                    break;
                case AuditLogEvent.WebhookCreate:
                case AuditLogEvent.WebhookDelete:
                case AuditLogEvent.WebhookUpdate:
                    if (p.webhook_security) shouldPunish = true;
                    break;
                case AuditLogEvent.GuildUpdate:
                    if (p.guild_settings) shouldPunish = true;
                    break;
                case AuditLogEvent.IntegrationCreate:
                    if (p.guild_settings) shouldPunish = true;
                    break;
                case AuditLogEvent.MemberPrune:
                    if (p.member_prune) shouldPunish = true;
                    break;
            }

            if (shouldPunish) {
                // 1. EXECUTE PUNISHMENT ASAP (No 'await' to allow instant recovery)
                if (action === AuditLogEvent.BotAdd) {
                    guild.members.ban(executorId, { reason: `[Sentinel Prime ANTINUKE] Unauthorized Bot Addition` }).catch(() => { });
                } else {
                    AntiNuke.punish(guild, executorId, logReason);
                }

                // 2. LOG ALERT (Background)
                AntiNuke.log(guild, `⚠️ **Antinuke Triggered**\n**Executor:** <@${executorId}>\n**Action:** ${actionName}\n**Reason:** ${logReason}`);

                // 3. RECOVERY OPERATIONS (Only if enabled)
                if (settings.recovery) {
                    const operations = [];

                    if (action === AuditLogEvent.ChannelDelete && p.channel_protection && auditLog.target) {
                        const chan = auditLog.target;
                        operations.push(guild.channels.create({
                            name: chan.name, type: chan.type, topic: chan.topic,
                            parent: chan.parentId, position: chan.position,
                            permissionOverwrites: chan.permissionOverwrites?.cache
                        }).catch(() => { }));
                    }

                    if (action === AuditLogEvent.RoleDelete && p.role_protection && auditLog.target) {
                        const r = auditLog.target;
                        operations.push(guild.roles.create({
                            name: r.name, color: r.color, hoist: r.hoist,
                            permissions: r.permissions, position: r.position, mentionable: r.mentionable
                        }).catch(() => { }));
                    }

                    if (action === AuditLogEvent.MemberBanAdd && (p.anti_ban || p.member_update) && targetId) {
                        operations.push(guild.members.unban(targetId, `[ANTINUKE RESTORE]`).catch(() => { }));
                    }

                    if (action === AuditLogEvent.MemberBanRemove && (p.anti_unban || p.member_update) && targetId) {
                        operations.push(guild.members.ban(targetId, { reason: `[ANTINUKE RESTORE] Re-banning unauthorized unban` }).catch(() => { }));
                    }

                    if (action === AuditLogEvent.MemberRoleUpdate && targetId) {
                        operations.push((async () => {
                            const member = await guild.members.fetch(targetId).catch(() => null);
                            if (!member) return;
                            const addedRoles = changes.find(c => c.key === '$add');
                            if (addedRoles) {
                                for (const r of addedRoles.new) {
                                    await member.roles.remove(r.id, `[ANTINUKE RESTORE]`).catch(() => { });
                                }
                            }
                        })());
                    }

                    if (action === AuditLogEvent.BotAdd && p.anti_bot && targetId) {
                        operations.push((async () => {
                            const bot = await guild.members.fetch(targetId).catch(() => null);
                            if (bot) await bot.ban({ reason: `[Sentinel Prime ANTINUKE] Unauthorized Bot` }).catch(() => { });
                        })());
                    }

                    if (action === AuditLogEvent.ChannelCreate && p.channel_protection && targetId) {
                        operations.push((async () => {
                            const chan = await guild.channels.fetch(targetId).catch(() => null);
                            if (chan) await chan.delete(`[Sentinel Prime ANTINUKE] Unauthorized Create`).catch(() => { });
                        })());
                    }

                    if (action === AuditLogEvent.RoleCreate && p.role_protection && targetId) {
                        operations.push((async () => {
                            const role = await guild.roles.fetch(targetId).catch(() => null);
                            if (role) await role.delete(`[Sentinel Prime ANTINUKE] Unauthorized Create`).catch(() => { });
                        })());
                    }

                    if (action === AuditLogEvent.ChannelUpdate && p.channel_protection && targetId) {
                         const chan = await guild.channels.fetch(targetId).catch(() => null);
                         if (chan && changes.length > 0) {
                             const oldData = {};
                             changes.forEach(c => oldData[c.key] = c.old);
                             operations.push(chan.edit(oldData).catch(() => { }));
                         }
                    }

                    if (action === AuditLogEvent.RoleUpdate && p.role_protection && targetId) {
                        const role = await guild.roles.fetch(targetId).catch(() => null);
                        if (role && changes.length > 0) {
                            const oldData = {};
                            changes.forEach(c => oldData[c.key] = c.old);
                            operations.push(role.edit(oldData).catch(() => { }));
                        }
                    }

                    if (action === AuditLogEvent.MemberUpdate && p.member_update && targetId) {
                        const member = await guild.members.fetch(targetId).catch(() => null);
                        if (member) {
                            const nickChange = changes.find(c => c.key === 'nick');
                            if (nickChange) {
                                operations.push(member.setNickname(nickChange.old, "[Sentinel Prime ANTINUKE] Reverting unauthorized nickname change").catch(() => { }));
                            }
                        }
                    }

                    if (action === AuditLogEvent.GuildUpdate && p.guild_settings) {
                        const updates = {};
                        changes.forEach(c => {
                            updates[c.key] = c.old;
                        });
                        if (Object.keys(updates).length > 0) {
                            operations.push(guild.edit(updates).catch(() => { }));
                        }
                    }

                    if (operations.length > 0) await Promise.all(operations);
                }
            }
        }
    },
};
