const db = require('./database');
const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');

class GiveawayManager {
    constructor() {
        this.activeGiveaways = new Map(); // messageId -> data
        this.checkInterval = null;
    }

    async init(client) {
        this.client = client;
        // Load active giveaways from MongoDB
        // Note: In our database structure, we store by module.guildId
        // For giveaways, we might have multiple per guild. 
        // We'll store them in a single global 'giveaways' module for easy scanning.

        const data = db.get('giveaways', 'global', { active: [] });

        for (const g of data.active) {
            this.activeGiveaways.set(g.messageId, g);
            // If already expired while bot was offline, end it now
            if (g.endAt <= Date.now()) {
                this.endGiveaway(g.messageId);
            }
        }

        // Start checking every 10 seconds
        this.checkInterval = setInterval(() => this.checkGiveaways(), 10000);
        console.log(`🎁 Giveaway Manager initialized with ${this.activeGiveaways.size} active sessions.`);
    }

    async startGiveaway(guild, channel, prize, durationMs, winnersCount, hostId) {
        const endAt = Date.now() + durationMs;

        const embed = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Giveaway ⚠️`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**## 🔹   ${prize}**`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`🔹 **Ends:** <t:${Math.floor(endAt / 1000)}:R>\n🔹 **Winners:** \`${winnersCount}\`\n🔹 **Hosted by:** <@${hostId}>`),
                new TextDisplayBuilder().setContent(`\nReact with 🎉 to participate!`)
            );

        const msg = await channel.send({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        await msg.react('🎉');

        const giveawayData = {
            messageId: msg.id,
            channelId: channel.id,
            guildId: guild.id,
            prize,
            winnersCount,
            endAt,
            hostId,
            entries: []
        };

        this.activeGiveaways.set(msg.id, giveawayData);
        this.saveToDB();
        return msg.id;
    }

    async checkGiveaways() {
        const now = Date.now();
        for (const [msgId, data] of this.activeGiveaways) {
            if (data.endAt <= now) {
                await this.endGiveaway(msgId);
            }
        }
    }

    async handleReactionAdd(reaction, user) {
        if (user.bot) return;
        const giveawayEmoji = '🎉';
        if (reaction.emoji.toString() !== giveawayEmoji && reaction.emoji.name !== '🎉') return;

        const data = this.activeGiveaways.get(reaction.message.id);
        if (!data) return;

        if (!data.entries.includes(user.id)) {
            data.entries.push(user.id);
            this.saveToDB();
        }
    }

    async handleReactionRemove(reaction, user) {
        if (user.bot) return;
        const giveawayEmoji = '🎉';
        if (reaction.emoji.toString() !== giveawayEmoji && reaction.emoji.name !== '🎉') return;

        const data = this.activeGiveaways.get(reaction.message.id);
        if (!data) return;

        data.entries = data.entries.filter(id => id !== user.id);
        this.saveToDB();
    }

    async updateMessage(data) {
        try {
            const channel = await this.client.channels.fetch(data.channelId).catch(() => null);
            if (!channel) return;
            const msg = await channel.messages.fetch(data.messageId).catch(() => null);
            if (!msg) return;

            const row = ActionRowBuilder.from(msg.components[0]);
            row.components[1].setLabel(`${data.entries.length}`);

            await msg.edit({ components: [msg.components[0], row], flags: MessageFlags.IsComponentsV2 });
        } catch (e) { }
    }

    async endGiveaway(messageId) {
        const data = this.activeGiveaways.get(messageId);
        if (!data) return;

        // Save to history for rerolling
        const history = db.get('giveaways_history', 'global', { list: [] });
        history.list.push(data);
        if (history.list.length > 50) history.list.shift(); // Keep only last 50 giveaways
        db.set('giveaways_history', 'global', history);

        this.activeGiveaways.delete(messageId);
        this.saveToDB();

        const channel = await this.client.channels.fetch(data.channelId).catch(() => null);
        if (!channel) return;
        const msg = await channel.messages.fetch(data.messageId).catch(() => null);

        let winners = [];
        if (data.entries.length > 0) {
            const shuffled = [...data.entries].sort(() => 0.5 - Math.random());
            winners = shuffled.slice(0, data.winnersCount);
        }

        const embed = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Giveaway Ended ⚠️`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**## 🔹   ${data.prize}**`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`🔹 **Ended:** <t:${Math.floor(Date.now() / 1000)}:R>\n🔹 **Hosted by:** <@${data.hostId}>\n🔹 **Winners:** ${winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'No one joined.'}`)
            );

        if (msg) {
            await msg.edit({ components: [embed], flags: MessageFlags.IsComponentsV2 });
            if (winners.length > 0) {
                await channel.send({ content: `🎉 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${data.prize}**!` });
            }
        }
    }

    async reroll(channel, messageId) {
        const history = db.get('giveaways_history', 'global', { list: [] });
        const data = history.list.find(g => g.messageId === messageId);

        if (!data) {
            return { success: false, message: 'Giveaway data not found in recent history or is too old.' };
        }

        if (!data.entries || data.entries.length === 0) {
            return { success: false, message: 'No entries were found for this giveaway.' };
        }

        const shuffled = [...data.entries].sort(() => 0.5 - Math.random());
        const winner = shuffled[0];

        await channel.send({ content: `🎉 **Reroll:** Congratulations <@${winner}>! You are the new winner for **${data.prize}**!` });
        return { success: true };
    }

    saveToDB() {
        const activeList = Array.from(this.activeGiveaways.values());
        db.set('giveaways', 'global', { active: activeList });
    }
}

module.exports = new GiveawayManager();
