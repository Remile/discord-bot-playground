# OpenCode 命令测试清单

## 前置条件
- [ ] WORKSPACE_DIR 已正确配置
- [ ] BOT_ACP_PORT 和 BOT_ACP_ENDPOINT 已配置
- [ ] OpenCode ACP 服务已启动
- [ ] Discord bot 已注册并运行

## 功能测试

### 测试 1: 命令注册
- [ ] 运行 `npm run deploy`
- [ ] 在 Discord 中输入 `/opencode`
- [ ] 验证命令显示在补全列表中

### 测试 2: 基本流程
- [ ] 运行 `/opencode`
- [ ] 验证显示文件夹选择菜单
- [ ] 选择一个文件夹
- [ ] 验证显示 Modal 输入 prompt
- [ ] 输入 prompt 并提交
- [ ] 验证创建 Thread
- [ ] 验证 Thread 中显示正确的文件夹和 prompt
- [ ] 验证发送 ACP 请求

### 测试 3: 错误处理
- [ ] 测试 WORKSPACE_DIR 未配置时的错误提示
- [ ] 测试工作区为空时的错误提示
- [ ] 测试创建 Thread 失败时的错误处理
- [ ] 测试 ACP 连接失败时的错误处理

### 测试 4: 冷却时间
- [ ] 连续快速运行两次 `/opencode`
- [ ] 验证第二次显示冷却提示

### 测试 5: 安全
- [ ] 尝试通过构造特殊路径访问 WORKSPACE_DIR 之外的文件夹
- [ ] 验证路径安全检查生效
