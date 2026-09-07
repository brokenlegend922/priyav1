const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const sniper = require('../utils/sniper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('View the last deleted message'),

    async execute(interaction) {
        const snipe = sniper.getSnipe(interaction.guildId, interaction.channelId);

        if (!snipe) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ No deleted messages found in this channel.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ℹ️ Deleted Message Snipe`),
                new TextDisplayBuilder().setContent(`**Author:** <@${snipe.author.id}> (${snipe.author.tag})\n**Content:** ${snipe.content}\n**Time:** <t:${Math.floor(snipe.timestamp / 1000)}:R>`)
            );

        if (snipe.image) {
            con.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(snipe.image)));
        }

        return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
    },
};
