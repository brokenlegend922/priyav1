const { 
    Events, 
    MessageFlags, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    SectionBuilder, 
    ThumbnailBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    disableValidators 
} = require('discord.js');

disableValidators();

const { buildPlayerContainer, formatTime } = require('../utils/playerUI');
const { buildHomeContainer, buildAllCommandsContainer, buildCategoryContainer } = require('../utils/helpUI');
const { buildFilterContainer } = require('../utils/filterUI');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const AntiNuke = require('../utils/antinuke');
        const AntiNukeUI = require('../utils/antinukeUI');
        const BotInfoUI = require('../utils/botinfoUI');
        const RoleUI = require('../utils/roleUI');
        const AntiMod = require('../utils/automod');
        const AntiModUI = require('../utils/automodUI');
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            // GLOBAL OWNER AND EXTRA OWNER BYPASS
            if (interaction.user.id !== process.env.OWNER_ID) {
                const isWhitelisted = AntiNuke.isWhitelisted(interaction.guild, interaction.user.id);
                
                // --- IGNORED CHANNEL CHECK ---
                const db = require('../utils/database');
                const ignoredData = db.get('ignored_channels', interaction.guildId, { channels: [] });
                if (ignoredData.channels.includes(interaction.channelId)) {
                    const isOwner = interaction.user.id === interaction.guild.ownerId;
                    // Allow only owner/admin to run 'ignore' to undo the setting
                    if (interaction.commandName !== 'ignore' && !isOwner) {
                        const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Commands are disabled in this channel.'));
                        return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    }
                }
                // -----------------------------

                if (!isWhitelisted && command.data.default_member_permissions) {
                    const perms = BigInt(command.data.default_member_permissions);
                    if (!interaction.member.permissions.has(perms) && interaction.user.id !== interaction.guild.ownerId) {
                        const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You do not have the required permissions to execute this command.'));
                        return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    }
                }
            }

            // PREMIUM CHECK
            if (command.premium) {
                const Premium = require('../utils/premium');
                const isPremium = Premium.isPremiumGuild(interaction.guildId) || Premium.isPremiumUser(interaction.user.id);
                
                if (!isPremium) {
                    const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
                    const premiumMsg = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`### 💎 Premium Feature`),
                            new TextDisplayBuilder().setContent(`The command \`/${interaction.commandName}\` is a **Premium Only** feature.\n\nEnjoy advanced security, music filters, and automated management by upgrading Sentinel Prime to Premium.`)
                        );
                    
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setLabel('Get Premium').setStyle(ButtonStyle.Link).setURL('https://discord.gg/FAtDM6bA5e'), // Updated support URL
                        new ButtonBuilder().setLabel('Premium Status').setCustomId('premium_status_check').setStyle(ButtonStyle.Secondary)
                    );

                    return interaction.reply({ 
                        components: [premiumMsg, row], 
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 
                    });
                }
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const { logToDevChannel } = require('../utils/logger');
                await logToDevChannel(interaction.client, 'error', { commandName: interaction.commandName, userTag: interaction.user.tag, userId: interaction.user.id, guildName: interaction.guild.name, guildId: interaction.guild.id, channelId: interaction.channelId, error });
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Technical Error\nThis command encountered an internal error. Devs notified.`));
                if (interaction.replied || interaction.deferred) await interaction.followUp({ components: [err], flags: MessageFlags.IsComponentsV2 });
                else await interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 });
            }
            return;
        }

        // --- COMPONENT INTERACTION AUTHENTICATION (USER LOCK) ---
        if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu()) {
            const isBotOwner = interaction.user.id === process.env.OWNER_ID;
            const isGuildOwner = interaction.user.id === interaction.guild.ownerId;
            const requesterId = interaction.message.interactionMetadata?.userId || interaction.message.interaction?.user?.id;
            const isRequester = requesterId ? interaction.user.id === requesterId : true;

            if (!isBotOwner && !isGuildOwner && !isRequester) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Access Denied**\nThis interaction menu belongs to <@${requesterId || 'another user'}>. Only the original requester or server owners can interact with it.`));
                return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith('save_to_dm_')) {
                const parts = interaction.customId.split('_');
                const targetId = parts[3];
                const type = parts[4]; // avatar, banner, icon

                let url = null;
                let title = '';

                try {
                    if (type === 'avatar') {
                        const user = await interaction.client.users.fetch(targetId);
                        url = user.displayAvatarURL({ size: 1024, extension: 'png' });
                        title = `${user.username}'s Avatar`;
                    } else if (type === 'banner') {
                        const user = await interaction.client.users.fetch(targetId, { force: true });
                        url = user.bannerURL({ size: 1024, extension: 'png' });
                        
                        // Check server-specific bot banner
                        if (targetId === interaction.client.user.id) {
                            const db = require('../utils/database');
                            const identity = db.get('identity', interaction.guildId, { banner: null });
                            if (identity.banner) url = identity.banner;
                        }
                        title = `${user.username}'s Banner`;
                    } else if (type === 'icon') {
                        const guild = interaction.client.guilds.cache.get(targetId) || interaction.guild;
                        url = guild.iconURL({ size: 1024, extension: 'png' });
                        title = `${guild.name}'s Icon`;
                    }

                    if (!url) {
                        const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Error:** This ${type} asset could not be found.`));
                        return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    }

                    const requesterId = interaction.message.interactionMetadata?.userId || interaction.message.interaction?.user?.id;

                    // --- PREPARE UI UPDATES (FAST RESPONSE) ---
                    const updatedOriginal = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url)))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# Format: **PNG** · Size: **1024px**`),
                            new TextDisplayBuilder().setContent(`-# Requested by <@${requesterId || interaction.user.id}>`)
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                        .addActionRowComponents(new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setLabel('Open in Browser').setURL(url).setStyle(ButtonStyle.Link).setDisabled(true),
                            new ButtonBuilder().setCustomId('saved_to_dm_msg').setLabel('Saved to DMs').setStyle(ButtonStyle.Secondary).setDisabled(true)
                        ));

                    // Instant UI feedback: Disable buttons
                    await interaction.update({ components: [updatedOriginal], flags: MessageFlags.IsComponentsV2 });

                    // --- BACKGROUND: SEND DM ---
                    const dmContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url)))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# Format: **PNG** · Size: **1024px**`),
                            new TextDisplayBuilder().setContent(`-# Saved from **${interaction.guild.name}**`)
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                        .addActionRowComponents(new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setLabel('Open in Browser').setURL(url).setStyle(ButtonStyle.Link)
                        ));

                    try {
                        await interaction.user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
                        const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ **Assets Saved:** Check your Direct Messages!'));
                        await interaction.followUp({ components: [success], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    } catch (dmErr) {
                        const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **DM Failed:** I couldn't message you. Please check your privacy settings.`));
                        await interaction.followUp({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    }
                } catch (e) {
                    console.error('[SAVE TO DM ERROR]', e);
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Technical Error:** ${e.message}`));
                    if (interaction.replied || interaction.deferred) await interaction.followUp({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    else await interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                }
                return;
            }


            if (interaction.customId === 'help_home') return await interaction.update({ components: [buildHomeContainer(interaction.guildId)], flags: MessageFlags.IsComponentsV2 });
            
            // --- ROLE MANAGEMENT HANDLERS ---
            if (interaction.customId === 'role_home') return await interaction.update({ components: [RoleUI.buildRoleMainMenu()], flags: MessageFlags.IsComponentsV2 });
            if (interaction.customId === 'role_menu_add' || interaction.customId === 'role_menu_remove') {
                const action = interaction.customId.split('_').pop();
                return await interaction.update({ components: [RoleUI.buildRoleTypeSelection(action)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId.startsWith('role_confirm_')) {
                const parts = interaction.customId.split('_'); 
                const action = parts[2]; const type = parts[3]; const roleId = parts[4]; const targetUserId = parts[5] || null;
                const role = interaction.guild.roles.cache.get(roleId);
                
                if (!role || role.position >= interaction.guild.members.me.roles.highest.position) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Error:** Role invalid or higher than my position.'));
                    return interaction.update({ components: [err], flags: MessageFlags.IsComponentsV2 });
                }
                
                const procMsg = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔄 **Processing:** ${action === 'add' ? 'Assigning' : 'Removing'} \`${role.name}\`...`));
                await interaction.update({ components: [procMsg], flags: MessageFlags.IsComponentsV2 });
                
                if (type === 'user' && targetUserId) {

                    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                    if (member) {
                        if (action === 'add') await member.roles.add(role).catch(() => {}); else await member.roles.remove(role).catch(() => {});
                        const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **Success:** Updated roles for <@${targetUserId}>.`));
                        return interaction.editReply({ components: [success], flags: MessageFlags.IsComponentsV2 });
                    }
                } else {
                    const members = await interaction.guild.members.fetch();
                    let count = 0;
                    for (const member of members.values()) {

                        if (type === 'humans' && member.user.bot) continue;
                        if (type === 'bots' && !member.user.bot) continue;
                        const has = member.roles.cache.has(roleId);
                        if (action === 'add' && !has) { await member.roles.add(role).catch(() => {}); count++; }
                        else if (action === 'remove' && has) { await member.roles.remove(role).catch(() => {}); count++; }
                        if (count > 0 && count % 20 === 0) await new Promise(r => setTimeout(r, 1000));
                    }
                    const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **Success:** ${action === 'add' ? 'Added' : 'Removed'} \`${role.name}\` for \`${count}\` members.`));
                    return interaction.editReply({ components: [success], flags: MessageFlags.IsComponentsV2 });
                }
            }

            if (interaction.customId.startsWith('botinfo_')) {
                if (!interaction.client.ownerUser && process.env.OWNER_ID) interaction.client.ownerUser = await interaction.client.users.fetch(process.env.OWNER_ID).catch(() => null);
                let con = null;
                if (interaction.customId === 'botinfo_general') con = BotInfoUI.buildGeneralInfo(interaction.client, interaction.guildId);
                else if (interaction.customId === 'botinfo_system') con = BotInfoUI.buildSystemStats(interaction.client);
                else if (interaction.customId === 'botinfo_performance') con = BotInfoUI.buildPerformance(interaction.client);
                if (con) return await interaction.update({ components: [con], flags: MessageFlags.IsComponentsV2 });
            }

            const player = interaction.client.poru.players.get(interaction.guild.id);
            if (interaction.customId.startsWith('music_')) {
                if (!player) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ No active player.'));
                    return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }
                
                if (interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You must be in the same voice channel to use this.'));
                    return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }

                switch(interaction.customId) {
                    case 'music_toggle_pause': 
                        const pauseRes = !player.isPaused;
                        player.pause(pauseRes); 
                        await updatePlayerUI(interaction, player, pauseRes); 
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(pauseRes ? '🎵 Player paused.' : '🎵 Player resumed.'))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_stop': 
                        player.destroy(); 
                        await interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✨ Stopped playback and cleared queue.'))],
                            flags: MessageFlags.IsComponentsV2
                        }); 
                        break;
                    case 'music_skip': 
                        player.skip(); 
                        await interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✨ Track skipped.'))], 
                            flags: MessageFlags.IsComponentsV2
                        }); 
                        break;
                    case 'music_prev':
                        player.previous();
                        await interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✨ Playing previous track.'))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_loop': 
                        const mode = player.loop === 'NONE' ? 'TRACK' : player.loop === 'TRACK' ? 'QUEUE' : 'NONE'; 
                        player.setLoop(mode); 
                        await updatePlayerUI(interaction, player); 
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✨ Loop mode set to: **${mode}**`))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_shuffle': 
                        player.queue.shuffle(); 
                        await interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('🔀 Queue shuffled successfully.'))],
                            flags: MessageFlags.IsComponentsV2
                        }); 
                        break;
                    case 'music_autoplay': 
                        player.data.autoplayEnabled = !player.data.autoplayEnabled; 
                        await updatePlayerUI(interaction, player);
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(player.data.autoplayEnabled ? '🎵 Autoplay enabled.' : '🎵 Autoplay disabled.'))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_add_upcoming':
                        player.autoplay();
                        await interaction.reply({
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ **Upcoming Added:** Added the next recommended track to the queue.'))],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                        break;
                    case 'music_vol_up': 
                        const vup = Math.min(player.volume + 10, 150); 
                        player.setVolume(vup); 
                        await updatePlayerUI(interaction, player); 
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✨ Volume increased to **${vup}%**`))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_vol_down': 
                        const vdw = Math.max(player.volume - 10, 0); 
                        player.setVolume(vdw); 
                        await updatePlayerUI(interaction, player); 
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✨ Volume decreased to **${vdw}%**`))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_like':
                        await interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('🔹 Added to your liked tracks!'))],
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_seek_forward': 
                        player.seek(Math.min(player.position + 30000, player.currentTrack.info.length)); 
                        await updatePlayerUI(interaction, player); 
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✨ Seeked forward 30 seconds.'))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_seek_back': 
                        player.seek(Math.max(player.position - 30000, 0)); 
                        await updatePlayerUI(interaction, player); 
                        await interaction.followUp({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✨ Seeked backward 30 seconds.'))], 
                            flags: MessageFlags.IsComponentsV2
                        });
                        break;
                    case 'music_queue': 
                        const ql = player.queue.length > 0 ? player.queue.map((t, i) => `${i + 1}. ${t.info.title}`).slice(0, 10).join('\n') : 'The queue is currently empty.';
                        await interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✨ Upcoming Tracks\n${ql}${player.queue.length > 10 ? `\n*...and ${player.queue.length - 10} more*` : ''}`))],
                            flags: MessageFlags.IsComponentsV2
                        }); 
                        break;
                    case 'music_filters': 
                        player.data.currentMenu = 'filters';
                        await interaction.update({ components: [buildFilterContainer()], flags: MessageFlags.IsComponentsV2 }); 
                        break;
                    case 'music_filter_back': 
                        player.data.currentMenu = 'player';
                        await updatePlayerUI(interaction, player); 
                        break;
                }
            }

            if (interaction.customId.startsWith('antinuke_')) {
                if (!interaction.member.permissions.has('Administrator') && !AntiNuke.isWhitelisted(interaction.guild, interaction.user.id)) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Unauthorized. Only Administrators or whitelisted users can interact here.'));
                    return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }
                const settings = AntiNuke.getSettings(interaction.guildId);
                const isMainOwner = interaction.user.id === interaction.guild.ownerId || interaction.user.id === process.env.OWNER_ID;

                if (interaction.customId === 'antinuke_panel_enable') { settings.enabled = true; AntiNuke.saveSettings(interaction.guildId, settings); con = AntiNukeUI.buildDashboardContainer(interaction.guild, settings); }
                else if (interaction.customId === 'antinuke_panel_disable') { settings.enabled = false; AntiNuke.saveSettings(interaction.guildId, settings); con = AntiNukeUI.buildDashboardContainer(interaction.guild, settings); }
                else if (interaction.customId === 'antinuke_panel_recovery') {
                    const s = AntiNuke.getSettings(interaction.guildId);
                    s.recovery = !s.recovery;
                    AntiNuke.saveSettings(interaction.guildId, s);
                    return await interaction.update({ components: [AntiNukeUI.buildDashboardContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
                }
                else if (interaction.customId === 'antinuke_panel_panic_on') { settings.panic = true; AntiNuke.saveSettings(interaction.guildId, settings); con = AntiNukeUI.buildDashboardContainer(interaction.guild, settings); }
                else if (interaction.customId === 'antinuke_panel_panic_off') { settings.panic = false; AntiNuke.saveSettings(interaction.guildId, settings); con = AntiNukeUI.buildDashboardContainer(interaction.guild, settings); }
                else if (interaction.customId === 'antinuke_panel_home' || interaction.customId === 'antinuke_panel_back') con = AntiNukeUI.buildDashboardContainer(interaction.guild, settings);
                else if (interaction.customId === 'antinuke_panel_whitelist') con = AntiNukeUI.buildWhitelistContainer(interaction.guild, settings);
                else if (interaction.customId === 'antinuke_panel_extraowners') {
                    if (!isMainOwner) {
                        return interaction.reply({ 
                            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Unauthorized.** Only the real **Server Owner** or **Bot Developer** can manage Extra Owners.'))], 
                            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 
                        });
                    }
                    con = AntiNukeUI.buildExtraOwnersContainer(interaction.guild, settings);
                }
                else if (interaction.customId === 'antinuke_panel_modules') con = AntiNukeUI.buildModulesContainer(interaction.guild, settings);
                else if (interaction.customId === 'antinuke_panel_logs') con = AntiNukeUI.buildLogsContainer(interaction.guild, settings);
                else if (interaction.customId === 'antinuke_panel_punishment') con = AntiNukeUI.buildPunishmentContainer(interaction.guild, settings);
                else if (interaction.customId.startsWith('antinuke_user_trustall_')) {
                    const uid = interaction.customId.split('_').pop();
                    const perms = AntiNuke.getWhitelistUser(interaction.guildId, uid);
                    Object.keys(perms).forEach(k => perms[k] = true);
                    AntiNuke.saveWhitelistUser(interaction.guildId, uid, perms);
                    con = AntiNukeUI.buildUserConfigContainer(uid, perms);
                }
                else if (interaction.customId.startsWith('antinuke_user_clearall_')) {
                    const uid = interaction.customId.split('_').pop();
                    const perms = AntiNuke.getWhitelistUser(interaction.guildId, uid);
                    Object.keys(perms).forEach(k => perms[k] = false);
                    AntiNuke.saveWhitelistUser(interaction.guildId, uid, perms);
                    con = AntiNukeUI.buildUserConfigContainer(uid, perms);
                }
                else if (interaction.customId.startsWith('antinuke_user_remove_')) {
                    const uid = interaction.customId.split('_').pop();
                    delete settings.whitelists[uid];
                    settings.whitelist = (settings.whitelist || []).filter(id => id !== uid);
                    AntiNuke.saveSettings(interaction.guildId, settings);
                    con = AntiNukeUI.buildWhitelistContainer(interaction.guild, settings);
                }
                else if (interaction.customId.startsWith('antinuke_extraowner_remove_btn_')) {
                    const uid = interaction.customId.split('_').pop();
                    settings.extraowners = (settings.extraowners || []).filter(id => id !== uid);
                    AntiNuke.saveSettings(interaction.guildId, settings);
                    con = AntiNukeUI.buildExtraOwnersContainer(interaction.guild, settings);
                }
                if (con) return await interaction.update({ components: [con], flags: MessageFlags.IsComponentsV2 });
            }

            // --- AUTOMOD BUTTON HANDLERS ---
            if (interaction.customId.startsWith('automod_')) {
                if (!AntiMod.isAdmin(interaction.member)) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Access Denied**\nOnly the Server Owner, Bot Developer, or Antinuke Extra Owners can manage Automod.'));
                    return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }

                const settings = AntiMod.getSettings(interaction.guildId);
                let con = null;

                if (interaction.customId === 'automod_panel_enable') { settings.enabled = true; AntiMod.saveSettings(interaction.guildId, settings); con = AntiModUI.buildAutomodDashboard(interaction.guild, settings); }
                else if (interaction.customId === 'automod_panel_disable') { settings.enabled = false; AntiMod.saveSettings(interaction.guildId, settings); con = AntiModUI.buildAutomodDashboard(interaction.guild, settings); }
                else if (interaction.customId === 'automod_panel_enable_all') { Object.keys(settings.protections).forEach(k => settings.protections[k] = true); AntiMod.saveSettings(interaction.guildId, settings); con = AntiModUI.buildModulesContainer(interaction.guild, settings); }
                else if (interaction.customId === 'automod_panel_back') { con = AntiModUI.buildAutomodDashboard(interaction.guild, settings); }
                else if (interaction.customId === 'automod_panel_modules') { con = AntiModUI.buildModulesContainer(interaction.guild, settings); }
                else if (interaction.customId === 'automod_panel_whitelist') { con = AntiModUI.buildWhitelistContainer(interaction.guild, settings); }
                else if (interaction.customId === 'automod_panel_punishment') { con = AntiModUI.buildPunishmentContainer(settings); }
                else if (interaction.customId === 'automod_cancel') { return interaction.message.delete().catch(() => {}); }

                if (con) return await interaction.update({ components: [con], flags: MessageFlags.IsComponentsV2 });
            }

            if (interaction.customId === 'premium_status_check') {
                const Premium = require('../utils/premium');
                const guildPremium = Premium.getStatus(interaction.guildId);
                const userPremium = Premium.getStatus(interaction.user.id);
                
                const statusPayload = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### 💎 Your Premium Status`),
                        new TextDisplayBuilder().setContent(`**Server Status:** ${guildPremium ? `✅ Active (Expires: ${guildPremium.expiry === -1 ? 'Never' : `<t:${Math.floor(guildPremium.expiry / 1000)}:R>`})` : '❌ Not Active'}`),
                        new TextDisplayBuilder().setContent(`**User Status:** ${userPremium ? `✅ Active (Expires: ${userPremium.expiry === -1 ? 'Never' : `<t:${Math.floor(userPremium.expiry / 1000)}:R>`})` : '❌ Not Active'}`)
                    );
                
                return interaction.reply({ components: [statusPayload], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
            }

            // --- NO PREFIX (NP) HANDLERS ---
            if (interaction.customId.startsWith('np_')) {
                if (interaction.user.id !== process.env.OWNER_ID) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Only the **Bot Developer** can manage No-Prefix.'));
                    return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }

                if (interaction.customId === 'np_cancel') {
                    return interaction.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Action cancelled.'))], flags: MessageFlags.IsComponentsV2 });
                }

                const NoPrefix = require('../utils/noprefix');
                const parts = interaction.customId.split('_');
                const durationType = parts[2]; // 1, 7, 30, or life
                const targetId = parts[3];

                let days = -1;
                if (durationType === '1') days = 1;
                else if (durationType === '7') days = 7;
                else if (durationType === '30') days = 30;
                else if (durationType === 'life') days = -1;

                NoPrefix.addUser(targetId, days);

                const success = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ✅ No-Prefix Whitelist Updated`),
                    new TextDisplayBuilder().setContent(`Added <@${targetId}> to the No-Prefix whitelist.\n**Duration:** ${days === -1 ? 'Lifetime' : `${days} Days`}`)
                );

                return interaction.update({ components: [success], flags: MessageFlags.IsComponentsV2 });
            }

            // --- AUTOROLE BUTTON HANDLERS ---
            if (interaction.customId.startsWith('autorole_')) {
                const AutoRole = require('../utils/autorole');
                const AutoRoleCmd = require('../commands/autorole');
                const settings = AutoRole.getSettings(interaction.guildId);
                let con = null;

                if (interaction.customId === 'autorole_toggle') {
                    settings.enabled = !settings.enabled;
                    AutoRole.saveSettings(interaction.guildId, settings);
                    con = AutoRoleCmd.buildDashboard(interaction.guild, settings);
                }
                else if (interaction.customId === 'autorole_panel_back') {
                    con = AutoRoleCmd.buildDashboard(interaction.guild, settings);
                }
                else if (interaction.customId === 'autorole_reset') {
                    settings.roles = { all: [], humans: [], bots: [] };
                    AutoRole.saveSettings(interaction.guildId, settings);
                    con = AutoRoleCmd.buildDashboard(interaction.guild, settings);
                }
                else if (interaction.customId === 'autorole_manage_all') con = AutoRoleCmd.buildPicker('all');
                else if (interaction.customId === 'autorole_manage_humans') con = AutoRoleCmd.buildPicker('humans');
                else if (interaction.customId === 'autorole_manage_bots') con = AutoRoleCmd.buildPicker('bots');

                if (con) return await interaction.update({ components: [con], flags: MessageFlags.IsComponentsV2 });
            }

            // --- BOTSETUP HANDLERS ---
            if (interaction.customId.startsWith('botsetup_')) {
                const Premium = require('../utils/premium');
                const isPremium = Premium.isPremiumGuild(interaction.guildId);
                const isServerOwner = interaction.user.id === interaction.guild.ownerId;
                const isDev = interaction.user.id === process.env.OWNER_ID;

                if (!isPremium || (!isServerOwner && !isDev)) {
                    const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Unauthorized.** Only the Server Owner or Bot Developer in a Premium server can manage this.'));
                    return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }

                const BotSetup = require('../commands/botsetup');
                const db = require('../utils/database');

                if (interaction.customId === 'botsetup_refresh') {
                    return await interaction.update(BotSetup.buildDashboard(interaction));
                } else if (interaction.customId === 'botsetup_reset') {
                    await interaction.guild.members.me.setNickname(null);
                    await interaction.client.rest.patch(`/guilds/${interaction.guildId}/members/@me`, { body: { avatar: null } });
                    db.delete('identity', interaction.guildId);
                    return await interaction.update(BotSetup.buildDashboard(interaction));
                } else if (interaction.customId === 'botsetup_edit_name') {
                    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
                    const modal = new ModalBuilder().setCustomId('botsetup_modal_name').setTitle('Update Bot Nickname');
                    const input = new TextInputBuilder().setCustomId('nickname').setLabel('New Nickname').setStyle(TextInputStyle.Short).setPlaceholder('Leave blank to reset').setRequired(false);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return await interaction.showModal(modal);
                } else if (interaction.customId === 'botsetup_edit_avatar') {
                    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
                    const modal = new ModalBuilder().setCustomId('botsetup_modal_avatar').setTitle('Update Bot Avatar');
                    const input = new TextInputBuilder().setCustomId('avatar_url').setLabel('Image URL').setStyle(TextInputStyle.Short).setPlaceholder('Direct Link (png, jpg)').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return await interaction.showModal(modal);
                } else if (interaction.customId === 'botsetup_edit_banner') {
                    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
                    const modal = new ModalBuilder().setCustomId('botsetup_modal_banner').setTitle('Update Bot Server Banner');
                    const input = new TextInputBuilder().setCustomId('banner_url').setLabel('Banner Image URL').setStyle(TextInputStyle.Short).setPlaceholder('Direct Link to image').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return await interaction.showModal(modal);
                } else if (interaction.customId === 'botsetup_premium_enable' || interaction.customId === 'botsetup_premium_disable') {
                    if (interaction.user.id !== process.env.OWNER_ID) return;
                    const active = interaction.customId.endsWith('enable');
                    if (active) Premium.addPremiumGuild(interaction.guildId, -1);
                    else Premium.removePremiumGuild(interaction.guildId);
                    return await interaction.update(BotSetup.buildDashboard(interaction));
                }
            }
        } 
        
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'help_category_select') {
                const db = require('../utils/database');
                const p = db.get('prefixes', interaction.guildId, { prefix: process.env.PREFIX || '?' });
                return await interaction.update({ components: [buildCategoryContainer(interaction.values[0].replace('help_cat_', ''), p.prefix)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId.startsWith('role_select_type_')) {
                const action = interaction.customId.split('_').pop();
                if (interaction.values[0] === 'user') return await interaction.update({ components: [RoleUI.buildUserPicker(action)], flags: MessageFlags.IsComponentsV2 });
                return await interaction.update({ components: [RoleUI.buildRolePicker(action, interaction.values[0])], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'music_filter_select') {
                const player = interaction.client.poru.players.get(interaction.guild.id);
                if (!player) return;
                const f = interaction.values[0];
                if (f === 'filter_reset') {
                    await player.filters.setFilters({});
                }
                else if (f === 'filter_bassboost') await player.filters.setBassboost(5);
                else if (f === 'filter_nightcore') await player.filters.setNightcore(true);
                else if (f === 'filter_vaporwave') await player.filters.setVaporwave(true);
                else if (f === 'filter_8d') await player.filters.set8D(true);
                else if (f === 'filter_soft') await player.filters.setFilters({ equalizer: [{ band: 0, gain: 0.1 }, { band: 1, gain: 0.1 }, { band: 2, gain: 0.05 }, { band: 3, gain: 0.05 }, { band: 4, gain: 0.05 }, { band: 5, gain: -0.05 }, { band: 6, gain: -0.05 }, { band: 7, gain: -0.1 }, { band: 8, gain: -0.1 }, { band: 9, gain: -0.1 }, { band: 10, gain: -0.1 }, { band: 11, gain: -0.1 }, { band: 12, gain: -0.1 }, { band: 13, gain: -0.1 }, { band: 14, gain: -0.1 }] });
                else if (f === 'filter_pop') await player.filters.setFilters({ equalizer: [{ band: 0, gain: -0.1 }, { band: 1, gain: 0.1 }, { band: 2, gain: 0.2 }, { band: 3, gain: 0.3 }, { band: 4, gain: 0.45 }, { band: 5, gain: 0.15 }, { band: 6, gain: 0.15 }, { band: 7, gain: 0.15 }, { band: 8, gain: 0.15 }, { band: 9, gain: 0.15 }, { band: 10, gain: 0.15 }, { band: 11, gain: 0.15 }, { band: 12, gain: 0.15 }, { band: 13, gain: 0.15 }, { band: 14, gain: 0.15 }] });
                
                const filterDisplayName = f === 'filter_reset' ? 'CLEARED ALL' : f.replace('filter_', '').toUpperCase();
                return interaction.reply({ 
                    components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Audio filter state: **${filterDisplayName}**`))], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
            if (interaction.customId === 'antinuke_toggle_select') {
                const s = AntiNuke.getSettings(interaction.guildId);
                Object.keys(s.protections).forEach(k => s.protections[k] = false);
                interaction.values.forEach(v => s.protections[v] = true);
                AntiNuke.saveSettings(interaction.guildId, s);
                return await interaction.update({ components: [AntiNukeUI.buildModulesContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'antinuke_whitelist_select_user') {
                const uid = interaction.values[0]; if (uid === 'none') return;
                const perms = AntiNuke.getWhitelistUser(interaction.guildId, uid);
                return await interaction.update({ components: [AntiNukeUI.buildUserConfigContainer(uid, perms)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId.startsWith('antinuke_user_perm_toggle_')) {
                const uid = interaction.customId.split('_').pop();
                const settings = AntiNuke.getSettings(interaction.guildId);
                Object.keys(settings.whitelists[uid]).forEach(k => settings.whitelists[uid][k] = false);
                interaction.values.forEach(p => settings.whitelists[uid][p] = true);
                AntiNuke.saveSettings(interaction.guildId, settings);
                return await interaction.update({ components: [AntiNukeUI.buildUserConfigContainer(uid, settings.whitelists[uid])], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'antinuke_punishment_select') {
                const s = AntiNuke.getSettings(interaction.guildId);
                s.punishment = interaction.values[0];
                AntiNuke.saveSettings(interaction.guildId, s);
                return await interaction.update({ components: [AntiNukeUI.buildPunishmentContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'antinuke_extraowner_select') {
                if (interaction.user.id !== interaction.guild.ownerId && interaction.user.id !== process.env.OWNER_ID) {
                    return interaction.reply({ 
                        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Only the **Server Owner** can manage Extra Owners.'))], 
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 
                    });
                }
                const uid = interaction.values[0]; if (uid === 'none') return;
                return await interaction.update({ components: [AntiNukeUI.buildExtraOwnerConfigContainer(interaction.guild, uid)], flags: MessageFlags.IsComponentsV2 });
            }

            // --- AUTOMOD SELECT MENU HANDLERS ---
            if (interaction.customId === 'automod_toggle_select') {
                if (!AntiMod.isAdmin(interaction.member)) return;
                const s = AntiMod.getSettings(interaction.guildId);
                Object.keys(s.protections).forEach(k => s.protections[k] = false);
                interaction.values.forEach(v => s.protections[v] = true);
                AntiMod.saveSettings(interaction.guildId, s);
                return await interaction.update({ components: [AntiModUI.buildModulesContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'automod_punishment_select') {
                if (!AntiMod.isAdmin(interaction.member)) return;
                const s = AntiMod.getSettings(interaction.guildId);
                s.punishment = interaction.values[0];
                AntiMod.saveSettings(interaction.guildId, s);
                return await interaction.update({ components: [AntiModUI.buildPunishmentContainer(s)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'automod_whitelist_remove_user') {
                if (!AntiMod.isAdmin(interaction.member)) return;
                const uid = interaction.values[0]; if (uid === 'none') return;
                const s = AntiMod.getSettings(interaction.guildId);
                s.whitelist.users = s.whitelist.users.filter(id => id !== uid);
                AntiMod.saveSettings(interaction.guildId, s);
                return await interaction.update({ components: [AntiModUI.buildWhitelistContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
        } 
        
        if (interaction.isUserSelectMenu()) {
            if (interaction.customId.startsWith('role_pick_user_')) return await interaction.update({ components: [RoleUI.buildRolePicker(interaction.customId.split('_').pop(), 'user', interaction.values[0])], flags: MessageFlags.IsComponentsV2 });
            if (interaction.customId === 'antinuke_whitelist_add_user') {
                const s = AntiNuke.getSettings(interaction.guildId);
                if (!s.whitelists[interaction.values[0]]) {
                    s.whitelists[interaction.values[0]] = { anti_ban: false, anti_unban: false, anti_kick: false, anti_bot: false, channel_protection: false, role_protection: false, member_update: false, emoji_sticker: false, guild_settings: false, webhook_security: false };
                    if (!s.whitelist.includes(interaction.values[0])) s.whitelist.push(interaction.values[0]);
                    AntiNuke.saveSettings(interaction.guildId, s);
                }
                return await interaction.update({ components: [AntiNukeUI.buildUserConfigContainer(interaction.values[0], s.whitelists[interaction.values[0]])], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'antinuke_extraowner_add_user') {
                const isMainOwner = interaction.user.id === interaction.guild.ownerId || interaction.user.id === process.env.OWNER_ID;
                if (!isMainOwner) {
                    return interaction.reply({ 
                        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Only the **Server Owner** can manage Extra Owners.'))], 
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 
                    });
                }
                const s = AntiNuke.getSettings(interaction.guildId);
                if (!s.extraowners.includes(interaction.values[0])) { s.extraowners.push(interaction.values[0]); AntiNuke.saveSettings(interaction.guildId, s); }
                return await interaction.update({ components: [AntiNukeUI.buildExtraOwnersContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
            if (interaction.customId === 'automod_whitelist_add_user') {
                if (!AntiMod.isAdmin(interaction.member)) return;
                const s = AntiMod.getSettings(interaction.guildId);
                if (!s.whitelist.users.includes(interaction.values[0])) {
                    s.whitelist.users.push(interaction.values[0]);
                    AntiMod.saveSettings(interaction.guildId, s);
                }
                return await interaction.update({ components: [AntiModUI.buildWhitelistContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
        } 
        
        if (interaction.isRoleSelectMenu()) {
            if (interaction.customId.startsWith('autorole_select_')) {
                const type = interaction.customId.replace('autorole_select_', '');
                const roleId = interaction.values[0];
                const AutoRole = require('../utils/autorole');
                const AutoRoleCmd = require('../commands/autorole');
                const settings = AutoRole.getSettings(interaction.guildId);

                if (settings.roles[type].includes(roleId)) {
                    settings.roles[type] = settings.roles[type].filter(id => id !== roleId);
                } else {
                    settings.roles[type].push(roleId);
                }

                AutoRole.saveSettings(interaction.guildId, settings);
                return await interaction.update({ 
                    components: [AutoRoleCmd.buildDashboard(interaction.guild, settings)], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }

            if (interaction.customId.startsWith('role_pick_role_')) {
                const parts = interaction.customId.split('_');
                return await interaction.update({ components: [RoleUI.buildRoleConfirmation(parts[3], parts[4], interaction.values[0], parts[5] || null)], flags: MessageFlags.IsComponentsV2 });
            }
        } 
        
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'botsetup_modal_name') {
                const name = interaction.fields.getTextInputValue('nickname') || null;
                await interaction.guild.members.me.setNickname(name);
                const BotSetup = require('../commands/botsetup');
                return await interaction.update(BotSetup.buildDashboard(interaction));
            }
            if (interaction.customId === 'botsetup_modal_avatar') {
                const url = interaction.fields.getTextInputValue('avatar_url');
                const fetch = require('node-fetch');
                const response = await fetch(url);
                const buffer = await response.buffer();
                const avatarData = `data:${response.headers.get('content-type')};base64,${buffer.toString('base64')}`;
                await interaction.client.rest.patch(`/guilds/${interaction.guildId}/members/@me`, { body: { avatar: avatarData } });
                const BotSetup = require('../commands/botsetup');
                return await interaction.update(BotSetup.buildDashboard(interaction));
            }
            if (interaction.customId === 'botsetup_modal_banner') {
                const url = interaction.fields.getTextInputValue('banner_url');
                const db = require('../utils/database');
                const identity = db.get('identity', interaction.guildId, { banner: null });
                db.set('identity', interaction.guildId, { ...identity, banner: url });
                const BotSetup = require('../commands/botsetup');
                return await interaction.update(BotSetup.buildDashboard(interaction));
            }
        }

        if (interaction.isChannelSelectMenu()) {
            if (interaction.customId === 'antinuke_log_channel_select') {
                const s = AntiNuke.getSettings(interaction.guildId);
                s.logChannel = interaction.values[0];
                AntiNuke.saveSettings(interaction.guildId, s);
                return await interaction.update({ components: [AntiNukeUI.buildLogsContainer(interaction.guild, s)], flags: MessageFlags.IsComponentsV2 });
            }
        }
    }
};

async function updatePlayerUI(interaction, player, isPaused = null) {
    const con = buildPlayerContainer(player, isPaused);
    if (!con) return;
    if (interaction.isButton() && !interaction.replied && !interaction.deferred) await interaction.update({ components: [con], flags: MessageFlags.IsComponentsV2 });
    else if (player.data.playerMessage) await player.data.playerMessage.edit({ components: [con], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}
