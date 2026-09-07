const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Set presence
        client.user.setPresence({
            activities: [{ name: process.env.BOT_STATUS_NAME || 'Kaiza', type: ActivityType.Listening }],
            status: 'online',
        });

        // Professional Console Logging
        const line = '━'.repeat(50);
        const cyan = '\x1b[36m';
        const purple = '\x1b[35m';
        const green = '\x1b[32m';
        const reset = '\x1b[0m';

        process.stdout.write('\x1Bc'); // Clear console
        console.log(`${cyan}${line}${reset}`);
        console.log(`${purple}          __      _______ ____  _____            \n          \\ \\    / /_   _/ __ \\|  __ \\     /\\    \n           \\ \\  / /  | || |  | | |__) |   /  \\   \n            \\ \\/ /   | || |  | |  _  /   / /\\ \\  \n             \\  /   _| || |__| | | \\ \\  / ____ \\ \n              \\/   |_____\\____/|_|  \\_\\/_/    \\_\\${reset}`);
        console.log(`${cyan}${line}${reset}`);
        console.log(`${green}» Bot Username:${reset}  ${client.user.tag}`);
        console.log(`${green}» Client ID:${reset}     ${client.user.id}`);
        console.log(`${green}» Total Guilds:${reset}  ${client.guilds.cache.size}`);
        console.log(`${green}» Prefix:${reset}        ${process.env.PREFIX || '/'}`);
        console.log(`${cyan}${line}${reset}`);
        console.log(`${green}  STATUS: Sentinel Prime is now active and listening.${reset}`);
        console.log(`${cyan}${line}${reset}`);

        if (client.poru) {
            client.poru.init(client);
        }

        // Auto-sync slash commands on startup (no separate deploy step needed)
        try {
            const fs = require('fs');
            const path = require('path');
            const slashCommands = [];
            const commandsPath = path.join(__dirname, '..', 'commands');
            for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
                const command = require(path.join(commandsPath, file));
                if (command.data && command.execute) slashCommands.push(command.data.toJSON());
            }
            await client.application.commands.set(slashCommands);
            console.log(`✅ Synced ${slashCommands.length} global slash commands.`);
        } catch (error) {
            console.error('❌ Slash command sync failed:', error);
        }

        // Initialize Giveaway Manager
        const giveawayManager = require('../utils/giveawayManager');
        giveawayManager.init(client);

        // --- PERIODIC DATABASE CLEANUP ---
        const db = require('../utils/database');
        const performCleanup = async () => {
            console.log('🧹 Starting periodic database cleanup...');
            const storedIds = db.getAllStoredGuildIds();
            let count = 0;

            for (const id of storedIds) {
                // If it's a number/ID (guilds) and bot is not in it
                if (!client.guilds.cache.has(id)) {
                    await db.clearAllGuildData(id);
                    count++;
                }
            }
            if (count > 0) console.log(`✅ Cleanup complete. Removed configurations for ${count} orphaned servers.`);
        };

        // Run once on startup
        setTimeout(performCleanup, 10000); // Wait 10s for cache to stabilize

        // Run every 12 hours
        setInterval(performCleanup, 43200000);
    },
};
