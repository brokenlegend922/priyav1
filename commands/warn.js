const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    PermissionFlagsBits
} = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Manage user warnings')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a warning to a user')
            .addUserOption(opt => opt.setName('target').setDescription('The user to warn').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List warnings for a user')
            .addUserOption(opt => opt.setName('target').setDescription('The user to check').setRequired(true)))
        .addSubcommand(sub => sub.setName('clear').setDescription('Clear warnings for a user')
            .addUserOption(opt => opt.setName('target').setDescription('The user to clear').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('target');
        const guildId = interaction.guildId;

        const allWarns = db.get('warns', guildId, {});
        if (!allWarns[target.id]) allWarns[target.id] = [];

        if (sub === 'add') {
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const warnObj = {
                reason,
                moderator: interaction.user.tag,
                timestamp: Date.now()
            };
            allWarns[target.id].push(warnObj);
            db.set('warns', guildId, allWarns);

            const { sendModDM } = require('../utils/modLogger');
            await sendModDM(target, interaction.guild, 'Warning', reason);

            const con = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 🛡️ User Warned`),
                    new TextDisplayBuilder().setContent(`**Target:** ${target.tag}\n**Reason:** ${reason}\n**Total Warns:** ${allWarns[target.id].length}`)
                );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'list') {
            const warns = allWarns[target.id];
            if (warns.length === 0) {
                const con = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **${target.tag}** has no warnings.`));
                return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
            }

            const warnList = warns.map((w, i) => `**${i + 1}.** ${w.reason} (By: ${w.moderator} | <t:${Math.floor(w.timestamp / 1000)}:R>)`).join('\n');
            const con = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ⚠️ Warnings for ${target.username}`),
                    new TextDisplayBuilder().setContent(warnList)
                );
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'clear') {
            delete allWarns[target.id];
            dataManager.set('warns.json', guildId, allWarns);
            const con = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Cleared all warnings for **${target.tag}**.`));
            return interaction.reply({ components: [con], flags: MessageFlags.IsComponentsV2 });
        }
    },
};
