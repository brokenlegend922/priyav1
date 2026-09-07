const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const AntiNuke = require('../utils/antinuke');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('multiwhitelist')
        .setDescription('Whitelist multiple users at once')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('users').setDescription('Space separated user IDs').setRequired(true)),
    name: 'multiwhitelist',
    aliases: ['mwl'],
    description: 'Whitelist multiple users at once',
    async execute(interaction, args) {
        const isPrefix = !interaction.options;
        const guild = interaction.guild;
        const input = isPrefix ? args.join(' ') : interaction.options.getString('users');

        if (!input) {
            const usageEmbed = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🛡️ Multi-Whitelist Usage`),
                new TextDisplayBuilder().setContent(`Whitelist multiple members at once by separating their IDs or mentions with a space:\n\n` +
                    `**Usage:** \`?multiwhitelist ID1 ID2 @mention3 ...\`\n\n` +
                    `> \`ID\` — User ID (Example: 2478491...)\n` +
                    `> \`Mention\` — Tagged User\n\n` +
                    `*Shortcut: ?mwl*`)
            );
            return interaction.reply({ components: [usageEmbed], flags: MessageFlags.IsComponentsV2 });
        }

        const AntiNuke = require('../utils/antinuke');
        const settings = AntiNuke.getSettings(guild.id);

        // Security Check
        if (interaction.user.id !== guild.ownerId && !settings.extraowners?.includes(interaction.user.id)) {
            const msg = 'Only the Server Owner and Extra Owners can manage the whitelist.';
            return isPrefix ? interaction.reply(msg) : interaction.reply({ content: msg, ephemeral: true });
        }

        // Parse mentions and raw IDs
        const ids = input.match(/\d{17,20}/g) || [];
        const validIds = [...new Set(ids)];

        let added = 0;
        for (const id of validIds) {
            if (!settings.whitelist.includes(id)) {
                settings.whitelist.push(id);
                if (!settings.whitelists[id]) {
                    settings.whitelists[id] = { anti_ban: false, anti_unban: false, anti_kick: false, anti_bot: false, channel_protection: false, role_protection: false, member_update: false, emoji_sticker: false, guild_settings: false, webhook_security: false, automod_protection: false, guild_events: false, thread_protection: false, invite_protection: false };
                }
                added++;
            }
        }

        if (added > 0) AntiNuke.saveSettings(guild.id, settings);

        const embed = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🛡️ Multi-Whitelist Success`),
            new TextDisplayBuilder().setContent(`Successfully whitelisted **${added}** users out of **${validIds.length}** unique IDs provided.`)
        );
        return interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    },
};
