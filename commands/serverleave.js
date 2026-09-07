const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverleave')
        .setDescription('Force the bot to leave a specific server (Bot Owner Only)')
        .addStringOption(opt => opt.setName('server_id').setDescription('The ID of the server to leave').setRequired(true)),

    async execute(interaction) {
        // OWNERSHIP CHECK
        if (interaction.user.id !== process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ❌ Authorization Error`),
                new TextDisplayBuilder().setContent(`This command is restricted to the **Bot Developer** only.`)
            );
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const serverId = interaction.options.getString('server_id');
        const guild = interaction.client.guilds.cache.get(serverId);

        if (!guild) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ❌ Guild Not Found`),
                new TextDisplayBuilder().setContent(`I am not currently in a server with ID: \`${serverId}\`.`)
            );
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const serverName = guild.name;
            await guild.leave();

            const success = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⚠️ Mission Terminated`),
                new TextDisplayBuilder().setContent(`Successfully departed from **${serverName}** (\`${serverId}\`).`)
            );
            return interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ❌ Technical Error`),
                new TextDisplayBuilder().setContent(`Failed to leave guild: \`${error.message}\``)
            );
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
