const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * @param {import('discord.js').VoiceState} oldState 
     * @param {import('discord.js').VoiceState} newState 
     */
    async execute(oldState, newState) {
        const { client, guild } = newState;

        // Note: Voice state packets are now handled via the 'raw' listener in index.js for better reliability.

        // Identify activities involving the bot itself
        if (newState.id === client.user.id) {
            
            // 1️⃣ Bot Joined or Reconnected to a VC
            if (!oldState.channelId && newState.channelId) {
                console.log(`[VOICE] 🔊 Sentinel Prime joined channel: ${newState.channel?.name || 'Unknown'} (Guild: ${guild.name})`);
            }

            // 2️⃣ Bot Left or was Disconnected/Kicked from VC
            else if (oldState.channelId && !newState.channelId) {
                console.warn(`[VOICE] 🔌 Sentinel Prime disconnected from voice in ${guild.name}`);
                
                // If a player exists for this guild, ensure it's destroyed to prevent ghost players/stuck UI
                const player = client.poru?.players.get(guild.id);
                if (player) {
                    console.log(`[VOICE] Cleaning up player for ${guild.name} due to disconnection.`);
                    player.destroy();
                }
            }

            // 3️⃣ Bot Moved to a different Voice Channel
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                console.log(`[VOICE] 🚚 Sentinel Prime moved from ${oldState.channel?.name} to ${newState.channel?.name} in ${guild.name}`);
                
                // Update player data if necessary (Poru usually handles this, but we log it)
                const player = client.poru?.players.get(guild.id);
                if (player) {
                    player.voiceChannel = newState.channelId;
                }
            }
        }

        // Optional: Auto-disconnect when empty logic can be added here if desired later.
    },
};
