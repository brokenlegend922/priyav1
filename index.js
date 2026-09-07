require('dotenv').config();
const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const { Client, GatewayIntentBits, Collection, disableValidators, SectionBuilder, ContainerBuilder, Events, Partials } = require('discord.js');

// 🛡️ Global Security Patch for Discord.js CV2 Builders
disableValidators();
if (SectionBuilder.prototype && SectionBuilder.prototype.toJSON) {
    const originalSectionToJSON = SectionBuilder.prototype.toJSON;
    SectionBuilder.prototype.toJSON = function () {
        try {
            const res = originalSectionToJSON.apply(this);
            if (res) {
                res.type = 9;
                res.components = res.components || res.items || [];
            }
            return res;
        } catch (e) {
            const data = this.data || {};
            const comps = data.components || this._components || this._items || [];
            const accessory = data.accessory || this._accessory;
            const res = { type: 9, components: comps.map(c => c.toJSON ? c.toJSON() : (c.data || c)) };
            if (accessory) res.accessory = accessory.toJSON ? accessory.toJSON() : (accessory.data || accessory);
            return res;
        }
    };
}

if (ContainerBuilder.prototype && ContainerBuilder.prototype.toJSON) {
    const originalContainerToJSON = ContainerBuilder.prototype.toJSON;
    ContainerBuilder.prototype.toJSON = function () {
        try {
            const res = originalContainerToJSON.apply(this);
            if (res) {
                res.type = 17;
                res.components = res.components || res.items || [];
            }
            return res;
        } catch (e) {
            const data = this.data || {};
            const comps = data.components || this._components || this._items || [];
            return { type: 17, components: comps.map(c => c.toJSON ? c.toJSON() : (c.data || c)) };
        }
    };
}

const { ActionRowBuilder: ARB } = require('discord.js');
if (ARB.prototype && ARB.prototype.toJSON) {
    const originalARBToJSON = ARB.prototype.toJSON;
    ARB.prototype.toJSON = function () {
        try {
            return originalARBToJSON.apply(this);
        } catch (e) {
            const comps = this.components || (this.data && this.data.components) || [];
            return { type: 1, components: comps.map(c => c.toJSON ? c.toJSON() : c) };
        }
    };
}

const fs = require('fs');
const path = require('path');
const db = require('./utils/database');

// Initialize High-Speed MongoDB
db.connect(process.env.MONGODB_URI);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

// --- Voice State Helper ---
client.getVoiceState = (guildId) => {
    const guild = client.guilds.cache.get(guildId);
    return guild?.members.me.voice?.channelId ? guild.members.me.voice : null;
};

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) client.once(event.name, (...args) => event.execute(...args));
    else client.on(event.name, (...args) => event.execute(...args));
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) client.commands.set(command.data.name, command);
}

const { Poru, customFilter } = require('poru');
const { buildPlayerContainer } = require('./utils/playerUI');

// ... (Lavalink node and events follow) ...

process.on('unhandledRejection', (reason, promise) => {
    if (reason && (reason.message?.includes('An unknown event') || reason.toString().includes('An unknown event'))) return;
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
});

const nodes = [{ name: "Lavalink Premium (Serenetia)", password: "https://seretia.link/discord", host: "lavalinkv4.serenetia.com", port: 443, secure: true, reconnectTries: 20 }];

client.poru = new Poru(client, nodes, {
    library: 'discord.js',
    defaultPlatform: 'ytmsearch',
    customFilter: customFilter,
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
});

client.on('raw', (packet) => client.poru.packetUpdate(packet));

client.poru.on('nodeConnect', (node) => console.log(`[LAVALINK] Connected to Node: ${node.name}`));
client.poru.on('nodeError', (node, error) => console.error(`[LAVALINK] Error on Node ${node.name}:`, error));
client.poru.on('nodeReconnect', (node) => console.log(`[LAVALINK] Reconnecting to Node: ${node.name}`));
client.poru.on('nodeDisconnect', (node, reason) => console.warn(`[LAVALINK] Disconnected from Node ${node.name}. Reason:`, reason));

client.poru.on('trackStart', async (player, track) => {
    const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
    if (player.data.playerMessage) {
        try { await player.data.playerMessage.delete().catch(() => {}); } catch (e) {}
        player.data.playerMessage = null;
    }
    const container = buildPlayerContainer(player);
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
        const { Routes } = require('discord.js');
        player.data.currentMenu = 'player';
        try {
            const payload = { components: [container.toJSON ? container.toJSON() : container], flags: MessageFlags.IsComponentsV2, allowed_mentions: { parse: [] } };
            const rawData = await client.rest.post(Routes.channelMessages(channel.id), { body: payload });
            const message = await channel.messages.fetch(rawData.id);
            if (message) {
                player.data.playerMessage = message;
                if (player.data.playerInterval) clearInterval(player.data.playerInterval);
                const interval = setInterval(async () => {
                    if (!player.isPlaying || !player.currentTrack || player.currentTrack.info.uri !== track.info.uri) {
                        clearInterval(interval);
                        delete player.data.playerInterval;
                        return;
                    }
                    if (player.data.currentMenu && player.data.currentMenu !== 'player') return;
                    if (player.isPaused) return;
                    const activeContainer = buildPlayerContainer(player);
                    try {
                        const editPayload = { components: [activeContainer.toJSON ? activeContainer.toJSON() : activeContainer], flags: MessageFlags.IsComponentsV2, allowed_mentions: { parse: [] } };
                        await client.rest.patch(Routes.channelMessage(channel.id, message.id), { body: editPayload });
                    } catch (e) {}
                }, 5000);
                player.data.playerInterval = interval;
            }
        } catch (e) { console.error('[UI] Failed to send player UI via REST:', e); }
    }
});

client.poru.on('trackEnd', (player) => {
    const interval = player.data.playerInterval;
    if (interval) { clearInterval(interval); delete player.data.playerInterval; }
});

client.poru.on('trackError', (player, track, error) => {
    player.skip();
    const channel = client.channels.cache.get(player.textChannel);
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    try {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Music Sync Failed`), new TextDisplayBuilder().setContent(`Skipping \`${track.info.title}\` because Lavalink could not stream it.`));
        if (channel) channel.send({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(console.error);
    } catch (e) { if (channel) channel.send(`❌ **Music Sync Failed:** Skipping \`${track.info.title}\` because Lavalink could not stream it.`).catch(console.error); }
});

client.poru.on('trackStuck', (player, track, _threshold) => {
    player.skip();
    const channel = client.channels.cache.get(player.textChannel);
    const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
    try {
        const stuckContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`⚠️ **Buffer Timeout:** Skipping track to keep playback active.`));
        if (channel) channel.send({ components: [stuckContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(console.error);
    } catch (e) { if (channel) channel.send(`⚠️ **Buffer Timeout:** Skipping track to keep playback active.`).catch(console.error); }
});

client.poru.on('queueEnd', (player) => {
    if (player.data && player.data.autoplayEnabled) return player.autoplay();
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
        const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
        try {
            const endContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Queue finished.** No more songs left.`));
            if (channel) channel.send({ components: [endContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(console.error);
        } catch (e) { channel.send(`❌ **Queue finished.** No more songs left.`).catch(console.error); }
    }
    player.destroy();
});

client.on('error', console.error);

const sniper = require('./utils/sniper');
client.on(Events.MessageDelete, (message) => {
    if (message.author?.bot || !message.guild || !message.content) return;
    sniper.setSnipe(message.guild.id, message.channel.id, message);
});

client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    if (oldMessage.author?.bot || !oldMessage.guild || oldMessage.content === newMessage.content) return;
    sniper.setEdit(oldMessage.guild.id, oldMessage.channel.id, oldMessage);
});

client.login(process.env.TOKEN);
