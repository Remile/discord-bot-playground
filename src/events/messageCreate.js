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
  
  // Get session
  const session = SessionManager.get(message.channel.id);
  if (!session || !session.client) {
    await message.reply('❌ Session 已过期');
    return;
  }
  
  console.log(`[messageCreate] 处理 Thread 回复: ${message.content.substring(0, 50)}`);
  console.log(`[messageCreate] 复用现有 session: ${session.client?.sessionId || 'unknown'}`);
  
  try {
    await message.channel.sendTyping();
    
    // 直接使用现有的 client，不创建新的 session
    const client = session.client;
    
    // 设置临时事件处理器来捕获流式输出
    const messages = [];
    let thinkingBuffer = [];
    let thinkingTimer = null;
    const THINKING_INTERVAL = 2000;
    
    const flushThinking = async () => {
      if (thinkingBuffer.length > 0) {
        const content = thinkingBuffer.join('');
        thinkingBuffer = [];
        try {
          await message.channel.send({
            content: `💭\n\`\`\`\n${content}\n\`\`\``, 
          });
        } catch (err) {
          console.error('[messageCreate] 发送思考内容失败:', err.message);
        }
      }
    };
    
    // 临时替换 onEvent 处理器
    const originalOnEvent = client.onEvent;
    client.setOnEvent((event) => {
      console.log(`[Thread Streaming] ${event.type}:`, event.content?.substring(0, 50));
      
      if (event.type === 'thinking' && event.content) {
        thinkingBuffer.push(event.content);
        if (!thinkingTimer) {
          thinkingTimer = setTimeout(async () => {
            await flushThinking();
            thinkingTimer = null;
          }, THINKING_INTERVAL);
        }
      }
      
      if (event.type === 'message' && event.content) {
        console.log(`[Thread Streaming] 收集 message chunk, 当前共 ${messages.length} 个`);
        messages.push(event.content);
      }
      
      // 不调用 originalOnEvent，避免重复发送
      // originalOnEvent 是 ACPClient 的处理器，会发送 Discord 消息
      // 我们在这里直接处理，不需要再调用原始处理器
      if (originalOnEvent) {
        originalOnEvent(event);
      }
    });
    
    // 使用现有的 session 发送 prompt
    const result = await client.sendPrompt(message.content);
    
    // 等待事件处理完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 刷新剩余的思考内容
    if (thinkingTimer) {
      clearTimeout(thinkingTimer);
      await flushThinking();
    }
    
    // 恢复原始事件处理器
    client.setOnEvent(originalOnEvent);
    
    console.log(`[messageCreate] messages 数组长度: ${messages.length}`);
    console.log(`[messageCreate] result:`, result);
    const output = messages.join('') || result?.output || result?.content || '无输出';
    console.log('[messageCreate] 最终输出长度:', output.length);
    
    // 发送最终回复
    await message.reply({ content: output });
    console.log('[messageCreate] 回复发送成功');
    
  } catch (error) {
    console.error('[messageCreate] 处理失败:', error);
    await message.reply('❌ 处理失败: ' + (error.message || '未知错误'));
  }
}

module.exports = { name, execute };
