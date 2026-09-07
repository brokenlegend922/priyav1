const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlockall')
        .setDescription('Unlock every text channel in the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();
        const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        let count = 0;

        for (const channel of channels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null
                }, { reason: `Unlockall by ${interaction.user.tag}` });
                count++;
            } catch (e) { }
        }

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Global Restore`),
                new TextDisplayBuilder().setContent(`I have unlocked \`${count}\` text channels across the server.`)
            );
        return interaction.editReply({ components: [con], flags: MessageFlags.IsComponentsV2 });
    },
};
