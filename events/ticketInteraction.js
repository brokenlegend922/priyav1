const {
    Events,
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const {
    buildTicketDashboard,
    buildSetupEmbed,
    buildMainManageDashboard,
    buildPanelSetupPage,
    buildDashboardSetupPage,
    buildTranscriptSetupPage,
    buildRolesLimitsPage
} = require('../utils/ticketUI');
const { getSettings, saveSettings } = require('../utils/ticketData');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isAnySelectMenu()) return;

        const { customId, guild, user, channel } = interaction;
        if (!guild) return;

        const settings = getSettings(guild.id);

        const refreshDashboard = async (inter) => {
            const upSettings = getSettings(guild.id);
            try {
                let messageToEdit = null;
                const currentMsg = await inter.channel.messages.fetch(inter.message.id).catch(() => null);
                if (currentMsg && currentMsg.editable && !currentMsg.flags.has(MessageFlags.Ephemeral)) {
                    messageToEdit = currentMsg;
                }

                if (!messageToEdit) {
                    const recentMessages = await inter.channel.messages.fetch({ limit: 15 });
                    messageToEdit = recentMessages.find(m => m.author.id === interaction.client.user.id && m.components[0]?.components[0]?.data.custom_id?.startsWith('ticket_page_'));
                }

                if (messageToEdit) {
                    // Page Identification
                    const allButtons = messageToEdit.components.flatMap(row => row.components);
                    const isPanel = allButtons.some(b => b.data.custom_id === 'ticket_edit_title');
                    const isWelcome = allButtons.some(b => b.data.custom_id === 'ticket_edit_welcome_msg');
                    const isTranscript = allButtons.some(b => b.data.custom_id === 'ticket_page_transcript_logs');
                    const isRoles = allButtons.some(b => b.data.custom_id === 'ticket_edit_limit');

                    let newComps = [buildMainManageDashboard(upSettings)];
                    if (isPanel) newComps = [buildPanelSetupPage(upSettings)];
                    if (isWelcome) newComps = [buildDashboardSetupPage(upSettings)];
                    if (isTranscript) newComps = [buildTranscriptSetupPage(upSettings)];
                    if (isRoles) newComps = [buildRolesLimitsPage(upSettings)];

                    await messageToEdit.edit({ components: newComps, flags: MessageFlags.IsComponentsV2 });
                }
            } catch (e) {
                console.log('[Dashboard Refresh Error]', e.message);
            }
        };

        // --- CORE TICKET LOGIC ---
        if (customId === 'ticket_open') {
            const currentSettings = getSettings(guild.id);
            if (!currentSettings.enabled) return interaction.reply({ content: '❌ The ticket system is currently disabled.', flags: MessageFlags.Ephemeral });
            if (!currentSettings.categoryId || !currentSettings.staffRoleId) return interaction.reply({ content: '❌ Setup Incomplete (Missing Category or Staff Role).', flags: MessageFlags.Ephemeral });

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                const ticketsOpened = guild.channels.cache.filter(c => c.name === `ticket-${user.username.toLowerCase()}`).size;
                if (ticketsOpened >= currentSettings.ticketLimit) return interaction.editReply({ content: `❌ You have reached your limit of ${currentSettings.ticketLimit} tickets.` });

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: currentSettings.categoryId,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: currentSettings.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] }
                    ],
                });

                const { content: pingContent, embeds, components } = buildTicketDashboard(interaction.member, guild, ticketChannel, currentSettings);

                try {
                    await ticketChannel.send({
                        content: pingContent || null,
                        embeds,
                        components
                    });
                } catch (e) {
                    console.error('[Ticket UI Send Error]', e);
                    await ticketChannel.send({ content: `<@${user.id}> | Welcome! Please describe your issue below.` });
                }

                await interaction.editReply({ content: `✅ **Ticket Created!** Please head over to ${ticketChannel}` });

                // --- LOG CREATION ---
                if (currentSettings.logsChannelId) {
                    const logChan = guild.channels.cache.get(currentSettings.logsChannelId);
                    if (logChan) {
                        const logEmbed = {
                            title: '🎫 Ticket Created',
                            fields: [
                                { name: 'User', value: `<@${user.id}>`, inline: true },
                                { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: true }
                            ],
                            color: 0x57f287,
                            timestamp: new Date()
                        };
                        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }

            } catch (error) { console.error(error); await interaction.editReply({ content: '❌ Error creating ticket.' }); }
            return;
        }

        // --- NAVIGATION ---
        if (customId === 'ticket_page_main') return await interaction.update({ components: [buildMainManageDashboard(getSettings(guild.id))], flags: MessageFlags.IsComponentsV2 });
        if (customId === 'ticket_page_panel') return await interaction.update({ components: [buildPanelSetupPage(getSettings(guild.id))], flags: MessageFlags.IsComponentsV2 });
        if (customId === 'ticket_page_welcome') return await interaction.update({ components: [buildDashboardSetupPage(getSettings(guild.id))], flags: MessageFlags.IsComponentsV2 });
        if (customId === 'ticket_page_transcripts') return await interaction.update({ components: [buildTranscriptSetupPage(getSettings(guild.id))], flags: MessageFlags.IsComponentsV2 });
        if (customId === 'ticket_page_roles') return await interaction.update({ components: [buildRolesLimitsPage(getSettings(guild.id))], flags: MessageFlags.IsComponentsV2 });

        // --- CONFIGURATION VIA CHAT (No Modals) ---
        if (customId.startsWith('ticket_edit_')) {
            const field = customId.replace('ticket_edit_', '');
            const { setSetupState } = require('../utils/ticketState');

            setSetupState(user.id, { guildId: guild.id, field, channelId: channel.id });

            let content = `📝 **Configuring:** \`${field}\`\n> Please type the new value below in this channel.\n> Type \`cancel\` to abort. The bot will automatically clean up your message.`;
            
            if (field === 'color' || field === 'dash_color') {
                content = `📝 **Configuring:** \`Color\`\n> Please type a color hex code like **#ffffff** or **#2b2d31**.\n> Type **none** for no hex (default).\n> Type \`cancel\` to abort.`;
            } else if (field === 'thumbnail' || field === 'dash_thumbnail' || field === 'dash_hero') {
                content = `📝 **Configuring:** \`Image Field\`\n> Please provide a direct image URL.\n> Type **server_icon** to use this server's profile picture.\n> Type **none** to remove the image.\n> Type \`cancel\` to abort.`;
            } else if (field === 'dash_title' || field === 'dash_footer' || field === 'ping_content') {
                content = `📝 **Configuring:** \`Text Field\`\n> Type the new text.\n> *Variables supported:* \`{user}\` \`{user_name}\` \`{server_name}\` \`{server_icon}\` \n> Type \`none\` to clear (for footer).\n> Type \`cancel\` to abort.`;
            }

            await interaction.reply({
                content: content,
                flags: MessageFlags.Ephemeral
            });
        }

        // --- REMOVE MODAL SUBMIT HANDLER (NOT NEEDED ANYMORE) ---


        // --- SELECT MENUS (Ephemeral) ---
        if (customId === 'ticket_page_channels' || customId === 'ticket_page_transcript_logs' || customId === 'ticket_page_roles_select') {
            const rows = [];
            if (customId === 'ticket_page_channels') {
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('ticket_select_category').setPlaceholder('Select Category').addChannelTypes(ChannelType.GuildCategory)));
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('ticket_select_logs').setPlaceholder('Select Logs Channel').addChannelTypes(ChannelType.GuildText)));
            } else if (customId === 'ticket_page_transcript_logs') {
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('ticket_select_transcript').setPlaceholder('Select Transcript Channel').addChannelTypes(ChannelType.GuildText)));
            } else {
                rows.push(new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('ticket_select_role').setPlaceholder('Select Support Role')));
            }
            const pickContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('Please configure using the menus:'));
            await interaction.reply({ components: [pickContainer, ...rows], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        // --- MENU UPDATES ---
        if (interaction.isAnySelectMenu() && customId.startsWith('ticket_select_')) {
            const field = customId.replace('ticket_select_', '');
            if (field === 'category') settings.categoryId = interaction.values[0];
            if (field === 'logs') settings.logsChannelId = interaction.values[0];
            if (field === 'role') settings.staffRoleId = interaction.values[0];
            if (field === 'transcript') settings.transcriptChannelId = interaction.values[0];

            saveSettings(guild.id, settings);
            await interaction.reply({ content: `✅ Updated ${field}!`, flags: MessageFlags.Ephemeral });
            await refreshDashboard(interaction);
        }

        // --- TOGGLES (Re-fetch for atomic accuracy) ---
        if (customId === 'ticket_config_toggle') { 
            const s = getSettings(guild.id);
            s.enabled = !s.enabled; 
            saveSettings(guild.id, s); 
            return await interaction.update({ components: [buildMainManageDashboard(s)], flags: MessageFlags.IsComponentsV2 }); 
        }
        if (customId === 'ticket_btn_welcome_toggle') { 
            const s = getSettings(guild.id);
            s.welcomeMsgEnabled = !s.welcomeMsgEnabled; 
            saveSettings(guild.id, s); 
            return await interaction.update({ components: [buildDashboardSetupPage(s)], flags: MessageFlags.IsComponentsV2 }); 
        }
        if (customId === 'ticket_btn_ping_toggle') { 
            const s = getSettings(guild.id);
            s.pingEnabled = !s.pingEnabled; 
            saveSettings(guild.id, s); 
            return await interaction.update({ components: [buildDashboardSetupPage(s)], flags: MessageFlags.IsComponentsV2 }); 
        }
        if (customId === 'ticket_btn_transcript_toggle') { 
            const s = getSettings(guild.id);
            s.transcriptsEnabled = !s.transcriptsEnabled; 
            saveSettings(guild.id, s); 
            return await interaction.update({ components: [buildTranscriptSetupPage(s)], flags: MessageFlags.IsComponentsV2 }); 
        }

        // --- ACTIONS ---
        if (customId === 'ticket_config_send') {
            if (!settings.categoryId || !settings.staffRoleId) return interaction.reply({ content: '❌ Category and Staff Role are required!', flags: MessageFlags.Ephemeral });
            
            try {
                const container = buildSetupEmbed(guild, settings);
                await interaction.channel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
                await interaction.reply({ content: '✅ Panel Posted!', flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error('[Post Panel Error]', error);
                await interaction.reply({ 
                    content: `❌ **Failed to post panel:** ${error.message}\n> This is often due to an invalid Image/Thumbnail URL. Please check your settings.`, 
                    flags: MessageFlags.Ephemeral 
                }).catch(() => {});
            }
        }
        if (customId === 'ticket_config_reset') { saveSettings(guild.id, { ...getSettings('default') }); await interaction.update({ components: [buildMainManageDashboard(getSettings(guild.id))], flags: MessageFlags.IsComponentsV2 }); }

        // --- TICKET CONTROLS ---
        if (customId === 'ticket_claim') { 
            await interaction.reply({ content: `🙋‍♂️ Claimed by <@${user.id}>` }); 
            await channel.edit({ name: `claimed-${user.username}` }).catch(() => { }); 
            
            if (settings.logsChannelId) {
                const logChan = guild.channels.cache.get(settings.logsChannelId);
                if (logChan) {
                    await logChan.send({ embeds: [{
                        title: '🙋‍♂️ Ticket Claimed',
                        fields: [
                            { name: 'Staff', value: `<@${user.id}>`, inline: true },
                            { name: 'Channel', value: `<#${channel.id}>`, inline: true }
                        ],
                        color: 0xfee75c,
                        timestamp: new Date()
                    }]}).catch(() => {});
                }
            }
        }
        if (customId === 'ticket_close_confirm') { 
            const confirmContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('⚠️ **Close ticket?**'));
            const confirmRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close_final').setLabel('Yes').setStyle(ButtonStyle.Danger));
            await interaction.reply({ components: [confirmContainer, confirmRow], flags: MessageFlags.IsComponentsV2 }); 
        }
        
        if (customId === 'ticket_transcript') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const discordTranscripts = require('discord-html-transcripts');
            const attachment = await discordTranscripts.createTranscript(channel, {
                limit: -1, 
                fileName: `transcript-${channel.name}.html`,
                saveImages: true,
                poweredBy: false
            });
            
            await interaction.editReply({ 
                content: '📑 **HTML Transcript Generated**',
                files: [attachment] 
            });
        }

        if (customId === 'ticket_close_final') {
            // Logging and Transcripts
            const discordTranscripts = require('discord-html-transcripts');
            const attachment = await discordTranscripts.createTranscript(channel, {
                limit: -1, 
                fileName: `transcript-${channel.name}.html`,
                saveImages: true,
                poweredBy: false
            }).catch(() => null);

            if (settings.transcriptsEnabled && settings.transcriptChannelId && attachment) {
                const trChan = guild.channels.cache.get(settings.transcriptChannelId);
                if (trChan) {
                    const trEmbed = {
                        title: '📑 Ticket Transcript',
                        fields: [
                            { name: 'Channel', value: `${channel.name}`, inline: true },
                            { name: 'Closed By', value: `<@${user.id}>`, inline: true }
                        ],
                        color: 0x5865f2,
                        timestamp: new Date()
                    };
                    await trChan.send({ embeds: [trEmbed], files: [attachment] }).catch(() => {});
                }
            }

            if (settings.logsChannelId) {
                const logChan = guild.channels.cache.get(settings.logsChannelId);
                if (logChan) {
                    const logEmbed = {
                        title: '🔒 Ticket Closed',
                        fields: [
                            { name: 'Ticket', value: `\`${channel.name}\``, inline: true },
                            { name: 'Closed By', value: `<@${user.id}>`, inline: true },
                        ],
                        color: 0xed4245,
                        timestamp: new Date()
                    };
                    await logChan.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }

            await interaction.reply({ content: '🔒 Closing ticket...' });
            setTimeout(() => channel.delete().catch(() => {}), 2000);
        }
    }
};
