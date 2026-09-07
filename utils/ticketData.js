const db = require('./database');

const defaultSettings = {
    enabled: true,
    panelType: 'BUTTON', // or 'DROPDOWN'
    categoryId: null,
    staffRoleId: null,
    logsChannelId: null,
    transcriptChannelId: null,
    ticketLimit: 5,
    welcomeMsgEnabled: true,
    welcomeMsg: 'Hey {user}, a staff member will be with you shortly.',
    transcriptsEnabled: true,
    
    // Panel Customization
    customTitle: '## Support Tickets',
    customDescription: 'Click below to open a support ticket.',
    customFooter: null,
    customColor: '#2b2d31',
    customThumbnail: null,
    customHero: null,

    // Dashboard Customization (Inside Ticket)
    dashTitle: 'Ticket Opened: {user_name}',
    dashColor: '#2b2d31',
    dashThumbnail: '{server_icon}',
    dashHero: null,
    dashFooter: 'Sentinel Prime Support System',

    // Ping Message Settings
    pingEnabled: true,
    pingContent: '{user} | Welcome!'
};

function getSettings(guildId) {
    return db.get('tickets', guildId, defaultSettings);
}

function saveSettings(guildId, settings) {
    db.set('tickets', guildId, settings);
    return true;
}

module.exports = { getSettings, saveSettings };
