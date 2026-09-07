const { Events } = require('discord.js');
const AutoRole = require('../utils/autorole');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const settings = AutoRole.getSettings(member.guild.id);
        if (!settings.enabled) return;

        const rolesToAdd = [];

        // All category
        if (settings.roles.all && settings.roles.all.length > 0) {
            rolesToAdd.push(...settings.roles.all);
        }

        // Humans vs Bots
        if (member.user.bot) {
            if (settings.roles.bots && settings.roles.bots.length > 0) {
                rolesToAdd.push(...settings.roles.bots);
            }
        } else {
            if (settings.roles.humans && settings.roles.humans.length > 0) {
                rolesToAdd.push(...settings.roles.humans);
            }
        }

        if (rolesToAdd.length === 0) return;

        // Filtering out roles that don't exist or are above bot's highest role
        const validRoles = rolesToAdd.filter(id => {
            const role = member.guild.roles.cache.get(id);
            return role && role.position < member.guild.members.me.roles.highest.position;
        });

        if (validRoles.length > 0) {
            await member.roles.add(validRoles).catch(() => {});
        }
    }
};
