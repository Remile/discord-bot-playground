const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { scanSubfolders } = require('../../utils/folderScanner');

// 简单的冷却时间管理
const cooldowns = new Map();
const COOLDOWN_SECONDS = 30;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opencode')
    .setDescription('在指定目录启动 OpenCode'),

  async execute(interaction) {
    // 检查冷却时间
    const userId = interaction.user.id;
    const now = Date.now();
    const cooldownKey = `opencode-${userId}`;
    
    if (cooldowns.has(cooldownKey)) {
      const expirationTime = cooldowns.get(cooldownKey) + COOLDOWN_SECONDS * 1000;
      if (now < expirationTime) {
        const remaining = Math.ceil((expirationTime - now) / 1000);
        return interaction.reply({
          content: `⏳ 请等待 ${remaining} 秒后再使用此命令`,
          ephemeral: true,
        });
      }
    }

    // 检查工作区配置
    const workspaceDir = process.env.WORKSPACE_DIR;
    if (!workspaceDir) {
      return interaction.reply({
        content: '❌ 错误: WORKSPACE_DIR 环境变量未配置',
        ephemeral: true,
      });
    }

    // 扫描文件夹
    const folders = scanSubfolders(workspaceDir);
    
    if (folders.length === 0) {
      return interaction.reply({
        content: '❌ 工作区中没有可用的子文件夹',
        ephemeral: true,
      });
    }

    // 限制最多 25 个选项（Discord 限制）
    const displayFolders = folders.slice(0, 25);
    
    // 创建选择菜单
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('opencode-folder-select')
      .setPlaceholder('选择工作目录')
      .addOptions(
        displayFolders.map(folder => 
          new StringSelectMenuOptionBuilder()
            .setLabel(folder.name)
            .setDescription(`路径: ${folder.path}`)
            .setValue(folder.name)
        )
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // 存储文件夹信息以便后续使用
    interaction.client.opencodeFolders = displayFolders;

    await interaction.reply({
      content: '📁 请选择一个工作目录：',
      components: [row],
      ephemeral: true,
    });

    // 设置冷却时间
    cooldowns.set(cooldownKey, now);
  },
};
