const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { whitelistServer, unwhitelistServer, isServerWhitelisted } = require('../utils/serverwhitelist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverwl')
        .setDescription('Manage server whitelist for member requirement bypass (Bot Owner Only)')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a server to the whitelist')
                .addStringOption(opt => opt.setName('server_id').setDescription('The ID of the server to whitelist').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a server from the whitelist')
                .addStringOption(opt => opt.setName('server_id').setDescription('The ID of the server to unwhitelist').setRequired(true))
        ),

    async execute(interaction) {
        // OWNERSHIP CHECK
        if (interaction.user.id !== process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ❌ Authorization Error`),
                new TextDisplayBuilder().setContent(`This command is restricted to the **Bot Developer** only.`)
            );
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const serverId = interaction.options.getString('server_id');

        if (subcommand === 'remove') {
            unwhitelistServer(serverId);
            const con = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Database Updated`),
                new TextDisplayBuilder().setContent(`Server ID \`${serverId}\` has been **removed** from the whitelist. It must now meet the 100-member requirement.`)
            );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        } else if (subcommand === 'add') {
            whitelistServer(serverId);
            const con = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Database Updated`),
                new TextDisplayBuilder().setContent(`Server ID \`${serverId}\` is now **whitelisted**. Sentinel Prime will join regardless of member count.`)
            );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
