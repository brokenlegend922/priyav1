const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('View total user/bot statistics'),

    async execute(interaction) {
        const guild = interaction.guild;
        const total = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = total - bots;

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ℹ️ Member Statistics`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Total Members:** \`${total}\``),
                new TextDisplayBuilder().setContent(`**Humans:** \`${humans}\``),
                new TextDisplayBuilder().setContent(`**Bots:** \`${bots}\``)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Server: **${guild.name}**`)
            );

        return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
    },
};
