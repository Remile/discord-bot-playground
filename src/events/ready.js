module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} servers`);
  },
};
