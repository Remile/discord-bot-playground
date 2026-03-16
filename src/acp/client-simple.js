const { spawn } = require('child_process');

// 简单的 UUID 生成器
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ACP 客户端 - 使用 OpenCode CLI 直接执行
 * 替代不稳定的 ACP HTTP/SDK 接口
 */
class ACPClient {
  constructor(config = {}) {
    this.timeout = config.timeout || 5 * 60 * 1000; // 5分钟超时
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
    
    console.log(`[ACP] 启动任务: ${taskId}`);
    console.log(`[ACP] 工作目录: ${workingDir}`);

    return new Promise((resolve, reject) => {
      // 使用 opencode --prompt 直接执行
      const child = spawn('opencode', ['--prompt', prompt], {
        cwd: workingDir,
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // 设置超时
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('任务执行超时'));
      }, this.timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        console.log(`[ACP] 任务完成: ${taskId}, 退出码: ${code}`);
        
        resolve({
          taskId,
          response: {
            status: code === 0 ? 'success' : 'error',
            output: output || '无输出',
            errors: errorOutput || null,
            exitCode: code,
          },
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error(`[ACP] 任务失败: ${taskId}`, error.message);
        reject(new Error(`启动 OpenCode 失败: ${error.message}`));
      });
    });
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
