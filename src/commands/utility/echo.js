const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('echo')
		.setDescription('复读你的消息')
		.addStringOption(option =>
			option
				.setName('message')
				.setDescription('要复读的消息')
				.setRequired(true)),
	async execute(interaction) {
		const message = interaction.options.getString('message');
		await interaction.reply(message);
	},
};
