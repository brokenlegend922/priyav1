const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprofile')
        .setDescription('Update the bot\'s global profile picture (Bot Developer Only).')
        .addStringOption(opt => opt.setName('url').setDescription('The URL of the new global avatar.').setRequired(true)),

    async execute(interaction) {
        // Developer Only Check
        if (interaction.user.id !== process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This command is restricted to the **Bot Developer**.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const url = interaction.options.getString('url');
        await interaction.deferReply();

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to download image.');
            const buffer = await response.buffer();

            await interaction.client.user.setAvatar(buffer);

            const success = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ✅ Global Avatar Updated`),
                new TextDisplayBuilder().setContent(`Successfully updated my global profile picture across all servers.`)
            );
            return interaction.editReply({ components: [success], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error(error);
            const err = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ❌ Global Update Failed`),
                new TextDisplayBuilder().setContent(`Failed to update global avatar. Discord limits global changes to 2 per hour.`)
            );
            return interaction.editReply({ components: [err], flags: MessageFlags.IsComponentsV2 });
        }
    },
};
