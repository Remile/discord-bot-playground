const { OpenCodeClient } = require('../opencode-client');

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ACP 客户端 - 使用 OpenCode SDK
 */
class ACPClient {
  constructor(config = {}) {
    this.timeout = config.timeout || 5 * 60 * 1000;
    this.callbackUrl = config.callbackUrl || process.env.BOT_ACP_ENDPOINT;
  }

  /**
   * 发送任务到 OpenCode
   * @param {Object} params - 任务参数
   * @param {string} params.workingDir - 工作目录
   * @param {string} params.prompt - 用户输入的 prompt
   * @param {Object} params.metadata - 元数据
   * @returns {Promise<{taskId: string, response: Object}>} 任务ID和响应
   */
  async sendTask({ workingDir, prompt, metadata }) {
    const taskId = generateId();
    
    console.log(`[ACP] 任务: ${taskId}`);
    
    // 收集消息内容
    const messages = [];
    const thinkingParts = [];
    
    const client = new OpenCodeClient({
      workingDir,
      onEvent: (event) => {
        console.log(`[Event] ${event.type}:`, event.content?.substring(0, 50));
        
        // 收集消息类型的内容
        if (event.type === 'message' && event.content) {
          messages.push(event.content);
        }
        
        // 收集思考类型的内容
        if (event.type === 'thinking' && event.content) {
          thinkingParts.push(event.content);
        }
      },
    });

    try {
      await client.connect();
      const result = await client.sendPrompt(prompt);
      
      // 等待一小段时间确保所有消息事件都被处理
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 返回最终结果 - 优先使用 messages 数组，否则用 result
      const finalOutput = messages.join('') || result?.output || result?.content || '无输出';
      const finalThinking = thinkingParts.join('');
      
      console.log(`[ACP] 最终输出:`, finalOutput.substring(0, 100));
      
      return {
        taskId,
        response: {
          status: 'success',
          result: { ...result, output: finalOutput, thinking: finalThinking },
        },
      };
    } finally {
      client.disconnect();
    }
  }


  /**
   * 发送流式任务到 OpenCode
   * @param {Object} params - 任务参数
   * @param {string} params.workingDir - 工作目录
   * @param {string} params.prompt - 用户输入的 prompt
   * @param {Function} params.onThinking - 思考内容回调 (content) => void
   * @param {Function} params.onMessage - 消息内容回调 (content) => void
   * @param {Function} params.onComplete - 完成回调 (result) => void, result = {output, sessionId, client}
   * @param {Function} params.onError - 错误回调 (error) => void
   * @returns {Promise<void>}
   */
  async sendTaskStreaming({ workingDir, prompt, onThinking, onMessage, onComplete, onError }) {
    const messages = [];
    let sessionId = null;

    const client = new OpenCodeClient({
      workingDir,
      onEvent: (event) => {
        console.log(`[Streaming Event] ${event.type}:`, event.content?.substring(0, 50));

        if (event.type === 'thinking' && event.content && onThinking) {
          onThinking(event.content);
        }

        if (event.type === 'message' && event.content) {
          messages.push(event.content);
          if (onMessage) {
            onMessage(event.content);
          }
        }

        if (event.sessionId && !sessionId) {
          sessionId = event.sessionId;
        }
      },
    });

    try {
      await client.connect();
      const result = await client.sendPrompt(prompt);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const output = messages.join('') || result?.output || result?.content || '';
      this.sessionId = sessionId || result?.sessionId;

      console.log(`[ACP Streaming] 最终输出:`, output.substring(0, 100));

      if (onComplete) {
        onComplete({
          output,
          sessionId: this.sessionId,
          client,
        });
      }
    } catch (error) {
      console.error(`[ACP Streaming] 错误:`, error);
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 检查 OpenCode 是否可用
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const { execSync } = require('child_process');
      execSync('which opencode', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { ACPClient };
