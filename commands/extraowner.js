const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'data', 'antinuke.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('extraowner')
        .setDescription('Manage extra owners for Antinuke bypass')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Register an extra owner')
                .addUserOption(opt => opt.setName('user').setDescription('The user to register').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove an extra owner')
                .addUserOption(opt => opt.setName('user').setDescription('The user to remove').setRequired(true))),
    name: 'extraowner',
    aliases: ['eo'],
    description: 'Manage extra owners for Antinuke bypass',
    async execute(interaction, args) {
        const isPrefix = interaction.isChatInputCommand ? !interaction.isChatInputCommand() : true;
        const guild = interaction.guild;
        const sub = isPrefix ? args[0]?.toLowerCase() : (interaction.options.getSubcommand ? interaction.options.getSubcommand() : null);
        const idTry = isPrefix ? args[1]?.replace(/[<@!>]/g, '') : null;
        const userObj = isPrefix ? (interaction.mentions.users.first() || interaction.client.users.cache.get(idTry)) : interaction.options.getUser('user');

        if (interaction.user.id !== guild.ownerId && interaction.user.id !== process.env.OWNER_ID) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Only the actual Server Owner or Bot Developer can manage Extra Owners.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!userObj || !sub) {
            const usageEmbed = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 🔹 Extra Owner Usage`),
                new TextDisplayBuilder().setContent(`To manage extra owners, use one of the following:\n\n` +
                    `> \`?extraowner add <@user/id>\` — Add a new extra owner\n` +
                    `> \`?extraowner remove <@user/id>\` — Remove an extra owner\n\n` +
                    `*Note: Only the Server Owner can use these commands.*`)
            );
            return interaction.reply({ components: [usageEmbed], flags: MessageFlags.IsComponentsV2 });
        }

        const AntiNuke = require('../utils/antinuke');
        const settings = AntiNuke.getSettings(guild.id);
        if (!settings.extraowners) settings.extraowners = [];
        const extraowners = settings.extraowners;

        if (sub === 'add') {
            if (settings.extraowners.includes(userObj.id)) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ User is already an extra owner.'));
                return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
            settings.extraowners.push(userObj.id);
            AntiNuke.saveSettings(guild.id, settings);
            const embed = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 **${userObj.tag}** is now an **Extra Owner**.`));
            return interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'remove') {
            settings.extraowners = settings.extraowners.filter(id => id !== userObj.id);
            AntiNuke.saveSettings(guild.id, settings);
            const embed = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔹 **${userObj.tag}** is no longer an **Extra Owner**.`));
            return interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }
    },
};
