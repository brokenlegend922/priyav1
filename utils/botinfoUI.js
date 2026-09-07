const {
    ContainerBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');

const os = require('os');
const v = require('../package.json').version;

function buildGeneralInfo(client, guildId) {
    const owner = client.ownerUser;
    const ownerName = owner ? `**${owner.displayName}** \`(@${owner.username})\`` : 'Unknown Developer';
    const ownerId = owner ? owner.id : (process.env.OWNER_ID || 'Unknown');

    const db = require('./database');
    const identity = db.get('identity', guildId, { banner: null });

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🎵 Sentinel Prime | System Information`),
            new TextDisplayBuilder().setContent(`**Developer:** ${ownerName}\n**ID:** \`${ownerId}\`\n**Version:** \`${v}\` · **Node:** \`${process.version}\``)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**✨ Core Library:** discord.js (\`${require('discord.js').version}\`)\n**❌ Music Engine:** Poru (\`5.3.0\`)`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Powered by High-Performance Node.js Clusters`)
        )
        .addActionRowComponents(buildNavigationRow('general'));
}

function buildSystemStats(client) {
    const memory = process.memoryUsage();
    const usedMemory = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ℹ️ Sentinel Prime | System Health`),
            new TextDisplayBuilder().setContent(`**Heap Memory:** \`${usedMemory} MB\`\n**Total OS RAM:** \`${totalMemory} GB\`\n**Ping:** \`${client.ws.ping}ms\``)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**CPU:** ${os.cpus()[0].model}\n**Cores:** ${os.cpus().length} vCPUs\n**OS:** ${os.type()} ${os.release()}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(buildNavigationRow('system'));
}

function buildPerformance(client) {
    const uptime = Math.floor(client.uptime / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📊 Sentinel Prime | Performance`),
            new TextDisplayBuilder().setContent(`**Servers:** \`${client.guilds.cache.size}\` · **Users:** \`${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}\` · **Channels:** \`${client.channels.cache.size}\``)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Uptime:** \`${h}\`h \`${m}\`m \`${s}\`s\n**Players:** \`${client.poru.players.size}\` active nodes`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(buildNavigationRow('performance'));
}

function buildNavigationRow(active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('botinfo_general')
            .setLabel('Developer')
            .setStyle(active === 'general' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('botinfo_system')
            .setLabel('Health')
            .setStyle(active === 'system' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('botinfo_performance')
            .setLabel('Performance')
            .setStyle(active === 'performance' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
}

module.exports = { buildGeneralInfo, buildSystemStats, buildPerformance };

module.exports = { buildGeneralInfo, buildSystemStats, buildPerformance };
