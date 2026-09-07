const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Restore channel messaging')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlock').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for unlock').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null
            }, { reason: `Unlocked by ${interaction.user.tag}: ${reason}` });

            const con = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ⚠️ Channel Unlocked`),
                    new TextDisplayBuilder().setContent(`The channel ${channel} has been unlocked.\n**Reason:** ${reason}`)
                );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Failure:** I cannot unlock this channel.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },
};
