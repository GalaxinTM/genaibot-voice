const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder().setName('leave').setDescription('Leaves the voice channel.'),
	async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
            await interaction.reply('Leaving the voice channel...');
            connection.destroy();
        } else {
            await interaction.reply('I am not in a voice channel.');
        }
	},
};