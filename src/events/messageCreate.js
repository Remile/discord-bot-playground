const { SessionManager } = require('../utils/sessionManager');

const name = 'messageCreate';
const cooldowns = new Map();
const COOLDOWN_SECONDS = 10;

async function execute(message) {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if in Thread and has active session
  if (!message.channel.isThread()) return;
  if (!SessionManager.has(message.channel.id)) return;
  
  // Check cooldown
  const userId = message.author.id;
  const now = Date.now();
  const lastUsed = cooldowns.get(userId);
  if (lastUsed && (now - lastUsed) < COOLDOWN_SECONDS * 1000) {
    const remaining = Math.ceil((COOLDOWN_SECONDS * 1000 - (now - lastUsed)) / 1000);
    await message.reply(`⏳ 请等待 ${remaining} 秒后再回复`);
    return;
  }
  cooldowns.set(userId, now);
  
  // Get session and continue conversation
  const session = SessionManager.get(message.channel.id);
  if (!session || !session.client) {
    await message.reply('❌ Session 已过期');
    return;
  }
  
  try {
    await message.channel.sendTyping();
    const result = await session.client.sendPrompt(message.content);
    await message.reply(result?.output || '无输出');
  } catch (error) {
    await message.reply('❌ 处理失败');
  }
}

module.exports = { name, execute };
