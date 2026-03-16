# Discord Bot

一个基于 [discord.js](https://discord.js.org/) 构建的模块化 Discord 机器人。

## 功能特性

| 指令 | 描述 |
|------|------|
| `/ping` | 检测 bot 响应延迟 |
| `/echo` | 复读你输入的消息 |
| `/help` | 显示所有可用指令列表 |

## 安装步骤

1. **克隆仓库** (如果使用 git):
   ```bash
   git clone https://github.com/your-username/discord-bot.git
   cd discord-bot
   ```

2. **安装依赖**:
   ```bash
   npm install
   ```

## 配置说明

### 获取必要的环境变量

#### 1. Discord Bot Token

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 "New Application" 创建新应用
3. 在左侧菜单选择 **Bot**
4. 点击 "Reset Token" 获取 `DISCORD_TOKEN`

#### 2. Client ID (Application ID)

1. 在 Discord Developer Portal 中选择 **General Information**
2. 复制 **Application ID** 作为 `CLIENT_ID`

#### 3. Guild ID (可选)

1. 在 Discord 中开启开发者模式：设置 -> 高级 -> 开发者模式
2. 右键点击你的测试服务器，选择 "复制服务器 ID"
3. 填入 `.env` 的 `GUILD_ID`

**说明**: `GUILD_ID` 是可选的。如果填写，命令会立即注册到该服务器；如果不填，命令会全局注册，但可能需要最多1小时生效。

### 配置 .env 文件

```bash
# 复制示例文件
cp .env.example .env
```

然后编辑 `.env` 文件，填入你的值：

```env
# Bot Token (必需)
DISCORD_TOKEN=your_bot_token_here

# Application ID (必需)
CLIENT_ID=your_application_id_here

# 测试服务器 ID (可选)
GUILD_ID=your_test_server_id_here
```

## 运行指令

### 注册斜杠命令

首次运行或添加新命令后，需要注册命令：

```bash
npm run deploy
```

### 启动 Bot

```bash
npm start
```

成功启动后，你会看到 `已登录为: BotName#1234` 的提示。

## 项目结构

```
discord-bot/
├── package.json
├── .env.example          # 环境变量示例
├── README.md
├── src/
│   ├── index.js          # Bot 入口文件
│   ├── deploy-commands.js # 命令注册脚本
│   ├── commands/         # 指令文件夹
│   │   └── utility/      # 工具类指令
│   │       ├── ping.js
│   │       ├── echo.js
│   │       └── help.js
│   └── events/           # 事件处理文件夹
│       ├── ready.js      # Bot 启动事件
│       └── interactionCreate.js  # 指令交互事件
```

## 如何添加新指令

1. 在 `src/commands/utility/` 目录下创建新的 `.js` 文件
2. 使用以下模板：

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('指令名称')
        .setDescription('指令描述'),
    
    async execute(interaction) {
        // 你的逻辑代码
        await interaction.reply('回复内容');
    },
};
```

3. 运行 `npm run deploy` 注册新命令
4. 重启 bot 或直接使用新命令

---

**Node.js 版本要求**: >= 18.0.0
