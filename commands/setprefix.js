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
        .setName('setprefix')
        .setDescription('Customize the bot prefix for this server')
        .addStringOption(opt => opt.setName('prefix').setDescription('The new prefix (Max 5 chars)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const newPrefix = interaction.options.getString('prefix');

        if (newPrefix.length > 5) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Prefix cannot be longer than 5 characters.`));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        db.set('prefixes', interaction.guildId, { prefix: newPrefix });

        const con = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ✅ Prefix Updated`),
                new TextDisplayBuilder().setContent(`The prefix for **${interaction.guild.name}** has been set to \`${newPrefix}\`.`)
            );
        return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
    },
};
