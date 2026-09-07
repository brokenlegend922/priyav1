const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Chat with AI')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('What do you want to ask?')
                .setRequired(true)
        ),

    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        const apiKey = process.env.OPENAI_API_KEY;
        const model = process.env.OPENAI_MODEL || 'gpt-5';

        if (!apiKey) {
            return interaction.reply('🤖 ❌ `OPENAI_API_KEY` is missing in `.env`.');
        }

        if (!interaction.isMock) await interaction.deferReply();
        else await interaction.reply('🤖 Thinking...');

        try {
            const response = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    instructions: 'You are a helpful Discord server assistant. Keep replies clear, useful, and under 1700 characters.',
                    input: prompt
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || `OpenAI API error ${response.status}`);

            let text = data.output_text;
            if (!text && Array.isArray(data.output)) {
                text = data.output
                    .flatMap(item => item.content || [])
                    .filter(item => item.type === 'output_text')
                    .map(item => item.text)
                    .join('\n');
            }
            text = (text || 'No response received.').trim();
            if (text.length > 1750) text = text.slice(0, 1747) + '...';

            return interaction.editReply(`🤖 **AI Chat**\n${text}`);
        } catch (error) {
            console.error('[AI]', error);
            return interaction.editReply(`🤖 ❌ AI request failed: ${String(error.message || error).slice(0, 500)}`);
        }
    }
};
