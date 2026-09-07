const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unhide')
        .setDescription('Show a hidden channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unhide').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                ViewChannel: null
            }, { reason: `Unhidden by ${interaction.user.tag}` });

            const con = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ⚠️ Channel Visible`),
                    new TextDisplayBuilder().setContent(`The channel ${channel} is now visible to standard members.`)
                );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Failure:** I cannot unhide this channel.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
