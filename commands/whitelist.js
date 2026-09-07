const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const AntiNuke = require('../utils/antinuke');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Whitelist a user from Antinuke actions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a user to the whitelist')
                .addUserOption(opt => opt.setName('user').setDescription('The user to whitelist').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a user from the whitelist')
                .addUserOption(opt => opt.setName('user').setDescription('The user to remove').setRequired(true))),
    name: 'whitelist',
    aliases: ['wl'],
    description: 'Manage whitelisted users',
    async execute(interaction, args) {
        const isPrefix = !interaction.options;
        const guild = interaction.guild;
        const sub = isPrefix ? args[0] : (interaction.options.getSubcommand ? interaction.options.getSubcommand() : 'list');
        const userObj = isPrefix ? (interaction.mentions.users.first() || interaction.client.users.cache.get(args[1])) : interaction.options.getUser('user');

        const settings = AntiNuke.getSettings(guild.id);

        // Security Check
        if (interaction.user.id !== guild.ownerId && !settings.extraowners?.includes(interaction.user.id)) {
            const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Only the Server Owner and Extra Owners can manage the whitelist.'));
            return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const usageEmbed = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ Whitelist Usage`),
            new TextDisplayBuilder().setContent(`Manage whitelisted users with these commands:\n\n` +
                `> \`whitelist add <@user/id>\` — Whitelist a new member\n` +
                `> \`whitelist remove <@user/id>\` — Remove a member from whitelist\n` +
                `> \`whitelist list\` — View all whitelisted members\n\n` +
                `*Aliases available: wl*`)
        );

        if (sub === 'add') {
            if (!userObj) return interaction.reply({ components: [usageEmbed], flags: MessageFlags.IsComponentsV2 });
            if (settings.whitelist.includes(userObj.id)) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ User is already whitelisted.'));
                return interaction.reply({ components: [err], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
            }
            settings.whitelist.push(userObj.id);
            if (!settings.whitelists[userObj.id]) {
                settings.whitelists[userObj.id] = { anti_ban: false, anti_unban: false, anti_kick: false, anti_bot: false, channel_protection: false, role_protection: false, member_update: false, emoji_sticker: false, guild_settings: false, webhook_security: false, automod_protection: false, guild_events: false, thread_protection: false, invite_protection: false };
            }
            AntiNuke.saveSettings(guild.id, settings);
            const embed = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **${userObj.tag}** added to whitelist.`));
            return interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'remove') {
            if (!userObj) return interaction.reply({ components: [usageEmbed], flags: MessageFlags.IsComponentsV2 });
            settings.whitelist = settings.whitelist.filter(id => id !== userObj.id);
            delete settings.whitelists[userObj.id];
            AntiNuke.saveSettings(guild.id, settings);
            const embed = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${userObj.tag}** removed from whitelist.`));
            return interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
        }

        // Default to List
        const list = settings.whitelist.length > 0 ? settings.whitelist.map(id => `<@${id}> (\`${id}\`)`).join('\n') : 'No users whitelisted.';
        const embed = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ Whitelisted Users`),
            new TextDisplayBuilder().setContent(list)
        );
        return interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    },
};
