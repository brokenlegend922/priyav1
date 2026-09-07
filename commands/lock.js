const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Instant channel lockdown')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for lockdown').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

            const con = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ⚠️ Channel Locked`),
                    new TextDisplayBuilder().setContent(`The channel ${channel} has been locked.\n**Reason:** ${reason}`)
                );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Failure:** I cannot lock this channel.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
