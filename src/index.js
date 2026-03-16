const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { ProxyAgent } = require('undici');
const { bootstrap } = require('global-agent');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { ACPServer } = require('./acp/server');

// Configure proxy if HTTP_PROXY environment variable is set
const proxyUrl = process.env.HTTPS_PROXY || 
                 process.env.https_proxy || 
                 process.env.HTTP_PROXY || 
                 process.env.http_proxy;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

// Initialize global-agent for WebSocket proxy support
if (proxyUrl) {
	bootstrap();
	global.GLOBAL_AGENT.HTTP_PROXY = proxyUrl;
	global.GLOBAL_AGENT.HTTPS_PROXY = proxyUrl;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  rest: {
    agent: dispatcher,
  },
});

client.commands = new Collection();

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands', 'utility');

  if (!fs.existsSync(commandsPath)) {
    console.warn(`Commands directory not found: ${commandsPath}`);
    return;
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');

  if (!fs.existsSync(eventsPath)) {
    console.warn(`Events directory not found: ${eventsPath}`);
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if ('name' in event && 'execute' in event) {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      console.log(`Loaded event: ${event.name}`);
    } else {
      console.warn(`[WARNING] The event at ${filePath} is missing a required "name" or "execute" property.`);
    }
  }
}

async function main() {
  try {
    await loadCommands();
    await loadEvents();

    // 启动 ACP 回调服务器（如果配置了端口）
    const acpPort = process.env.BOT_ACP_PORT || 8080;
    if (process.env.BOT_ACP_ENDPOINT) {
      const acpServer = new ACPServer(acpPort);
      await acpServer.start();
      client.acpServer = acpServer;
      console.log(`ACP Server 已启动，Discord 回调地址: ${process.env.BOT_ACP_ENDPOINT}`);
    } else {
      console.log('警告: BOT_ACP_ENDPOINT 未配置，OpenCode 回调功能将不可用');
    }

    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot is starting...');
  } catch (error) {
    console.error('Error during bot initialization:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

main();
