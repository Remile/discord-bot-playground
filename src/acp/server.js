const express = require('express');

/**
 * ACP 回调服务器 - 接收 OpenCode 的结果
 */
class ACPServer {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.resultHandlers = new Map(); // taskId -> handler function
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    
    // 简单的请求日志
    this.app.use((req, res, next) => {
      console.log(`[ACP Server] ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'discord-bot-acp' });
    });

    // ACP 回调端点
    this.app.post('/acp/callback', async (req, res) => {
      try {
        const { type, taskId, status, result, error } = req.body;
        
        console.log(`[ACP Server] 收到回调: taskId=${taskId}, status=${status}`);
        
        if (type !== 'opencode.result') {
          console.warn(`[ACP Server] 未知的回调类型: ${type}`);
          return res.status(400).json({ error: 'Unknown callback type' });
        }

        // 查找对应的 handler
        const handler = this.resultHandlers.get(taskId);
        
        if (handler) {
          await handler({ taskId, status, result, error });
          this.resultHandlers.delete(taskId); // 清理 handler
          console.log(`[ACP Server] Handler 执行成功: ${taskId}`);
        } else {
          console.warn(`[ACP Server] 未找到 taskId=${taskId} 的 handler`);
        }

        res.json({ received: true });
      } catch (err) {
        console.error('[ACP Server] 处理回调失败:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // 404 处理
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * 注册结果处理器
   * @param {string} taskId - 任务ID
   * @param {Function} handler - 处理函数 (result) => Promise<void>
   */
  registerResultHandler(taskId, handler) {
    this.resultHandlers.set(taskId, handler);
    console.log(`[ACP Server] 注册 handler: ${taskId}`);
    
    // 设置超时清理（防止内存泄漏）
    setTimeout(() => {
      if (this.resultHandlers.has(taskId)) {
        console.warn(`[ACP Server] Handler 超时清理: ${taskId}`);
        this.resultHandlers.delete(taskId);
      }
    }, 10 * 60 * 1000); // 10 分钟超时
  }

  /**
   * 启动服务器
   */
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`[ACP Server] 启动成功，监听端口: ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * 停止服务器
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('[ACP Server] 已停止');
    }
  }
}

module.exports = { ACPServer };
