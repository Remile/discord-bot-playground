const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('显示所有可用指令'),

	async execute(interaction) {
		const commands = interaction.client.commands;
		
		const embed = new EmbedBuilder()
			.setColor('#0099FF')
			.setTitle('📋 指令列表')
			.setDescription('以下是所有可用的指令：')
			.setTimestamp();

		const commandFields = [];
		commands.forEach(command => {
			commandFields.push({
				name: `/${command.data.name}`,
				value: command.data.description || '无描述',
				inline: false,
			});
		});

		embed.addFields(commandFields);
		embed.setFooter({ text: `共 ${commands.size} 个指令` });

		await interaction.reply({ embeds: [embed] });
	},
};
