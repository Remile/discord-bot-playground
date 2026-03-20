const { SessionManager } = require('../utils/sessionManager');
const { ACPClient } = require('../acp/client');

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
  
  // Get session
  const session = SessionManager.get(message.channel.id);
  if (!session || !session.client) {
    await message.reply('❌ Session 已过期');
    return;
  }
  
  console.log(`[messageCreate] 处理 Thread 回复: ${message.content.substring(0, 50)}`);
  
  try {
    await message.channel.sendTyping();
    
    // Use streaming for thread replies too
    const acpClient = new ACPClient();
    await acpClient.sendTaskStreaming({
      workingDir: session.workingDir,
      prompt: message.content,
      onThinking: async (content) => {
        await message.channel.send({
          content: `💭\n\`\`\`\n${content}\n\`\`\``, 
        }).catch(err => console.error('[messageCreate] 发送思考内容失败:', err.message));
      },
      onComplete: async (result) => {
        console.log('[messageCreate] onComplete 被调用, output 长度:', result.output?.length);
        try {
          await message.reply({
            content: result?.output || '无输出'
          });
          console.log('[messageCreate] 最终回复发送成功');
          
          // Update session with new client
          SessionManager.create(message.channel.id, session.workingDir, result.sessionId, result.client);
        } catch (err) {
          console.error('[messageCreate] 发送最终回复失败:', err.message);
          await message.reply('❌ 发送回复失败');
        }
      },
      onError: async (error) => {
        console.error('[messageCreate] OpenCode 错误:', error);
        await message.reply('❌ 处理失败: ' + (error.message || '未知错误'));
      },
    });
  } catch (error) {
    console.error('[messageCreate] 处理失败:', error);
    await message.reply('❌ 处理失败');
  }
}

module.exports = { name, execute };
