const { REST, Routes } = require('discord.js');
const { ProxyAgent } = require('undici');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// Configure proxy if HTTP_PROXY environment variable is set
const proxyUrl = process.env.HTTPS_PROXY ||
                 process.env.https_proxy ||
                 process.env.HTTP_PROXY ||
                 process.env.http_proxy;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const rest = new REST({ agent: dispatcher }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		let data;
		if (process.env.GUILD_ID) {
			data = await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
				{ body: commands },
			);
			console.log(`Successfully reloaded ${data.length} guild application (/) commands for guild ${process.env.GUILD_ID}.`);
		} else {
			data = await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID),
				{ body: commands },
			);
			console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
