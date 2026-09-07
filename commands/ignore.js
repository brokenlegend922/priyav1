const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ignore')
        .setDescription('Disable bot commands in specific channels')
        .addChannelOption(opt => opt.setName('channel').setDescription('The channel to ignore/unignore').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;
        const settings = db.get('ignored_channels', guildId, { channels: [] });

        if (settings.channels.includes(channel.id)) {
            settings.channels = settings.channels.filter(id => id !== channel.id);
            db.set('ignored_channels', guildId, settings);
            const con = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 **${channel.name}** is no longer ignored.`));
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        } else {
            settings.channels.push(channel.id);
            db.set('ignored_channels', guildId, settings);
            const con = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 **${channel.name}** is now ignored. I will not respond to commands there.`));
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }
    },
};
