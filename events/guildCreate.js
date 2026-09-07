const {
    Events,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder
} = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        const client = guild.client;
        const { isServerWhitelisted } = require('../utils/serverwhitelist');

        // --- SERVER REQUIREMENT CHECK (100 MEMBERS) ---
        const memberCount = guild.memberCount;
        const isWhitelisted = isServerWhitelisted(guild.id);

        if (memberCount < 100 && !isWhitelisted) {
            // Find a channel to send the message
            const targetChannel = guild.channels.cache.find(c =>
                c.isTextBased() &&
                c.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel']) &&
                !c.isThread()
            );

            if (targetChannel) {
                const rejectionCon = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## ✨ Sentinel Prime | Requirement Not Met`),
                        new TextDisplayBuilder().setContent(
                            `Protocol activation rejected for **${guild.name}**.\n\n` +
                            `> **Status:** ⚠️ Insufficient Member Count\n` +
                            `> **Required:** 100 Members\n` +
                            `> **Current:** ${memberCount} Members\n\n` +
                            `I will leave now. Please add me again once you reach the 100-member threshold. If this is a partner server, contact my developers for a whitelist.`
                        )
                    );

                await targetChannel.send({
                    components: [rejectionCon],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => { });
            }

            // Log the departure in the dev log channel
            const LOG_CHANNEL_ID = process.env.GUILD_LOG_CHANNEL_ID || process.env.DEV_LOG_CHANNEL_ID;
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

            if (logChannel) {
                const logCon = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 🔹 Automatically Left Server`),
                    new TextDisplayBuilder().setContent(`**Server:** ${guild.name} (\`${guild.id}\`)\n**Reason:** Insufficient members (${memberCount}/100)\n**Status:** Not Whitelisted`)
                );
                await logChannel.send({ components: [logCon], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
            }

            return guild.leave();
        }

        // 📝 LOG CHANNEL CONFIGURATION (SUCCESSFUL JOIN)
        const LOG_CHANNEL_ID = process.env.GUILD_LOG_CHANNEL_ID || process.env.DEV_LOG_CHANNEL_ID;
        const channel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        // Fetch owner and stats
        const owner = await guild.fetchOwner().catch(() => null);
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const userCount = guild.memberCount - botCount;

        // Try to generate an invite link
        let inviteUrl = '`No Permission`';
        const inviteChannel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
        if (inviteChannel) {
            const invite = await inviteChannel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
            if (invite) inviteUrl = `[Click to Join](${invite.url})`;
        }

        // Global Bot Stats
        const totalServers = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

        // Build Premium CV2 Log
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 📥 Bot Joined a New Server!`),
                new TextDisplayBuilder().setContent(
                    `**Server Information**\n` +
                    `ℹ️ **Name:** ${guild.name}\n` +
                    `✨ **ID:** \`${guild.id}\`\n` +
                    `📊 **Members:** \`${guild.memberCount}\` (\`${userCount}\` Users | \`${botCount}\` Bots)`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Ownership & Access**\n` +
                    `👑 **Owner:** ${owner ? `**${owner.user.tag}** (\`${owner.id}\`)` : 'Unknown'}\n` +
                    `🔗 **Invite:** ${inviteUrl}\n` +
                    `📝 **Description:** ${guild.description || 'No description provided.'}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Bot Global Statistics**\n` +
                    `🌐 **Total Servers:** \`${totalServers}\`\n` +
                    `👥 **Total Users:** \`${totalUsers}\`\n` +
                    `-# Timestamp: <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        // Send to log channel with CV2 flags
        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        }).catch(err => {
            console.error(`[ERROR] Failed to send GuildJoin log:`, err);
        });
    }
};
