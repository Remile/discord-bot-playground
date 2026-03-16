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
   * @returns {Promise<{taskId: string}>} 任务ID
   */
  async sendTask({ workingDir, prompt, metadata }) {
    const taskId = generateId();
    
    console.log(`[ACP] 任务: ${taskId}`);
    
    const client = new OpenCodeClient({
      workingDir,
      onEvent: (event) => {
        console.log(`[Event] ${event.type}:`, event.content?.substring(0, 50));
      },
    });

    try {
      await client.connect();
      const result = await client.sendPrompt(prompt);
      
      return {
        taskId,
        response: {
          status: 'success',
          result,
        },
      };
    } finally {
      client.disconnect();
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
