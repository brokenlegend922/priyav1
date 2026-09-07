const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const giveawayManager = require('../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage server giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(opt => opt.setName('duration').setDescription('How long? (e.g. 1m, 1h, 1d)').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
                .addStringOption(opt => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End an active giveaway early')
                .addStringOption(opt => opt.setName('message_id').setDescription('The message ID of the giveaway').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Pick a new winner for a giveaway')
                .addStringOption(opt => opt.setName('message_id').setDescription('The message ID of the giveaway').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            const prize = interaction.options.getString('prize');
            const durationStr = interaction.options.getString('duration');
            const winners = interaction.options.getInteger('winners') || 1;

            // Parse duration
            const timeMap = { 'm': 60000, 'h': 3600000, 'd': 86400000 };
            const unit = durationStr.slice(-1);
            const value = parseInt(durationStr.slice(0, -1));

            if (isNaN(value) || !timeMap[unit]) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Invalid Duration:** Use format like `10m`, `1h`, or `1d`.'));
                return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
            }

            const ms = value * timeMap[unit];

            await giveawayManager.startGiveaway(interaction.guild, interaction.channel, prize, ms, winners, interaction.user.id);

            const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🎉 Giveaway started in ${interaction.channel}!`));

            const reply = await interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });

            // Delete the trigger message if it's a mock interaction (prefix command)
            if (interaction.isMock && interaction.originalMessage) {
                await interaction.originalMessage.delete().catch(() => { });
            }

            // Auto-delete the success message after 4 seconds
            setTimeout(() => {
                if (reply && reply.delete) reply.delete().catch(() => { });
            }, 4000);
            return;
        }

        if (subcommand === 'end') {
            const msgId = interaction.options.getString('message_id');
            if (!giveawayManager.activeGiveaways.has(msgId)) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Not Found:** No active giveaway found with that Message ID.'));
                return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
            }

            await giveawayManager.endGiveaway(msgId);
            const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **Giveaway Terminated:** Winners (if any) have been picked.`));
            
            const reply = await interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });

            // Delete the trigger message if it's a mock interaction (prefix command)
            if (interaction.isMock && interaction.originalMessage) {
                await interaction.originalMessage.delete().catch(() => { });
            }

            // Auto-delete the success message after 4 seconds
            setTimeout(() => {
                if (reply && reply.delete) reply.delete().catch(() => { });
            }, 4000);
            return;
        }

        if (subcommand === 'reroll') {
            const msgId = interaction.options.getString('message_id');
            const result = await giveawayManager.reroll(interaction.channel, msgId);

            if (!result.success) {
                const err = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **Reroll Failed:** ${result.message}`));
                return interaction.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
            }

            const success = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **Giveaway Rerolled:** A new winner has been picked.`));
            const reply = await interaction.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });

            // Delete trigger
            if (interaction.isMock && interaction.originalMessage) {
                await interaction.originalMessage.delete().catch(() => { });
            }

            // Auto-delete reply after 4 seconds
            setTimeout(() => {
                if (reply && reply.delete) reply.delete().catch(() => { });
            }, 4000);
            return;
        }
    },
};
