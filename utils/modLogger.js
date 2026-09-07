const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

/**
 * Sends a premium DM notification to a user about a moderation action.
 * @param {User|GuildMember} user The user to DM
 * @param {Guild} guild The guild where the action happened
 * @param {string} action The action taken (Ban, Kick, Timeout, etc.)
 * @param {string} reason The reason for the action
 */
async function sendModDM(user, guild, action, reason) {
    try {
        const target = user.user || user;
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# 🛡️ Security Alert: ${guild.name}`),
                new TextDisplayBuilder().setContent(`Hello **${target.username}**, this is an automated notification regarding your account status in **${guild.name}**.`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Action Taken:** \`${action.toUpperCase()}\``),
                new TextDisplayBuilder().setContent(`**Reason:** ${reason}`),
                new TextDisplayBuilder().setContent(`-# If you believe this was a mistake, please contact the server administrators directly.`)
            );

        await target.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    } catch (e) {
        // Silently fail if DMs are closed
    }
}

module.exports = { sendModDM };
