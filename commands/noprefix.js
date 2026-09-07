const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const NoPrefix = require('../utils/noprefix');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noprefix')
        .setDescription('Manage No-Prefix whitelist users (Bot Developer Only).')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a user to No-Prefix list.').addUserOption(opt => opt.setName('user').setDescription('The user to add').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user from No-Prefix list.').addUserOption(opt => opt.setName('user').setDescription('The user to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all users with No-Prefix permission.'))
        .addSubcommand(sub => sub.setName('status').setDescription('Check your No-Prefix status.')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'list') {
            const users = NoPrefix.getAllUsers();
            const list = users.map(id => {
                const data = NoPrefix.getData(id);
                const expiryStr = data.expiry === -1 ? 'Lifetime' : `<t:${Math.floor(data.expiry / 1000)}:R>`;
                return `<@${id}> (\`${id}\`) - Expires: ${expiryStr}`;
            }).join('\n');

            const con = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 🔹 No-Prefix Users`),
                new TextDisplayBuilder().setContent(list || '*No users in whitelist.*')
            );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'status') {
            const data = NoPrefix.getData(interaction.user.id);
            const isDev = interaction.user.id === process.env.OWNER_ID;

            const con = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 🔹 No-Prefix Status`),
                new TextDisplayBuilder().setContent(isDev ? '🔹 **Active** (Bot Developer Bypass)' : data ? `✅ **Active** (Expires: ${data.expiry === -1 ? 'Never' : `<t:${Math.floor(data.expiry / 1000)}:R>`})` : '❌ **Not Active** (You must use the prefix)')
            );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }

        // Developer Only Check for setup
        if (interaction.user.id !== process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This command is restricted to the **Bot Developer**.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('user');

        if (sub === 'add') {
            const con = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ⚠️ Set No-Prefix Duration`),
                    new TextDisplayBuilder().setContent(`Adding **${user.tag}** to whitelist.\nSelect the duration for this permission:`)
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`np_add_1_${user.id}`).setLabel('1 Day').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`np_add_7_${user.id}`).setLabel('7 Days').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`np_add_30_${user.id}`).setLabel('30 Days').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`np_add_life_${user.id}`).setLabel('Lifetime').setStyle(ButtonStyle.Success)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('np_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ components: [con, row, row2], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'remove') {
            NoPrefix.removeUser(user.id);
            const success = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ✅ No-Prefix Removed`),
                new TextDisplayBuilder().setContent(`Successfully removed **${user.tag}** from the No-Prefix whitelist.`)
            );
            return interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
        }
    },
};
