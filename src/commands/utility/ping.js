const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('检测 bot 响应延迟'),

	async execute(interaction) {
		const sent = await interaction.reply({
			content: '正在计算延迟...',
			withResponse: true,
		});

		const latency = sent.createdTimestamp - interaction.createdTimestamp;

		await interaction.editReply(`Pong! 🏓\n延迟: ${latency}ms`);
	},
};
