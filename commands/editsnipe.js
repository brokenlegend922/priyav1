const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const sniper = require('../utils/sniper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editsnipe')
        .setDescription('View the last edited message'),

    async execute(interaction) {
        const edit = sniper.getEdit(interaction.guildId, interaction.channelId);

        if (!edit) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ No edited messages found in this channel.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🔹 Edited Message Snipe`),
                new TextDisplayBuilder().setContent(`**Author:** <@${edit.author.id}> (${edit.author.tag})\n**Original Content:** ${edit.content}\n**Time:** <t:${Math.floor(edit.timestamp / 1000)}:R>`)
            );

        return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
    },
};
