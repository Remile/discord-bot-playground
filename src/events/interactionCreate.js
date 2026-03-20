const { ACPClient } = require('../acp/client');
const { isPathWithinWorkspace } = require('../utils/folderScanner');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const name = 'interactionCreate';

async function execute(interaction) {
  // 处理 Slash Command
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`警告：命令 "${interaction.commandName}" 未找到`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '执行命令时发生错误！', ephemeral: true });
      } else {
        await interaction.reply({ content: '执行命令时发生错误！', ephemeral: true });
      }
    }
  }
  
  // 处理 SelectMenu（文件夹选择）
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'opencode-folder-select') {
      await handleFolderSelect(interaction);
    }
  }
  
  // 处理 Modal 提交
  else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'opencode-modal') {
      await handleModalSubmit(interaction);
    }
  }
}

/**
 * 处理文件夹选择
 */
async function handleFolderSelect(interaction) {
  const selectedFolderName = interaction.values[0];
  const folders = interaction.client.opencodeFolders || [];
  const selectedFolder = folders.find(f => f.name === selectedFolderName);
  
  if (!selectedFolder) {
    return interaction.reply({
      content: '❌ 选择的文件夹无效',
      ephemeral: true,
    });
  }

  // 创建 Modal 让用户输入 prompt
  const modal = new ModalBuilder()
    .setCustomId('opencode-modal')
    .setTitle(`OpenCode: ${selectedFolder.name}`);

  const promptInput = new TextInputBuilder()
    .setCustomId('prompt')
    .setLabel('Prompt')
    .setPlaceholder('输入你想让 OpenCode 做什么...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  const actionRow = new ActionRowBuilder().addComponents(promptInput);
  modal.addComponents(actionRow);

  // 存储选中的文件夹信息
  interaction.client.opencodeSelectedFolder = selectedFolder;

  await interaction.showModal(modal);
}

/**
 * 处理 Modal 提交
 */
async function handleModalSubmit(interaction) {
  const prompt = interaction.fields.getTextInputValue('prompt');
  const selectedFolder = interaction.client.opencodeSelectedFolder;
  
  if (!selectedFolder) {
    return interaction.reply({
      content: '❌ 错误: 未找到选中的文件夹信息',
      ephemeral: true,
    });
  }

  // 验证路径安全
  const workspaceDir = process.env.WORKSPACE_DIR;
  if (!isPathWithinWorkspace(selectedFolder.path, workspaceDir)) {
    return interaction.reply({
      content: '❌ 错误: 路径安全检查失败',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    // 创建 Thread
    const thread = await interaction.channel.threads.create({
      name: `🤖 OpenCode: ${selectedFolder.name}`,
      autoArchiveDuration: 60, // 1 小时后自动归档
      reason: 'OpenCode 任务',
    });

    // 在 Thread 中发送初始消息
    const initialMessage = await thread.send({
      content: `🚀 **OpenCode 任务已启动**

📁 **工作目录**: \`${selectedFolder.name}\`
💬 **Prompt**:
\`\`\`
${prompt}
\`\`\`
⏳ **状态**: 正在发送到 OpenCode...`,
    });

    // 更新原始交互
    await interaction.editReply({
      content: `✅ 任务已创建: ${thread}`,
    });

    // 发送 ACP 请求并获取结果
    const acpClient = new ACPClient();
    const { taskId, response } = await acpClient.sendTask({
      workingDir: selectedFolder.path,
      prompt: prompt,
      metadata: {
        discordChannelId: interaction.channelId,
        discordThreadId: thread.id,
        discordMessageId: initialMessage.id,
        requestedBy: interaction.user.id,
        requestedByUsername: interaction.user.username,
      },
    });

    // 提取思考内容
    const thinking = response.result?.thinking || '';

    // 截断过长的思考内容
    const MAX_THINKING_LENGTH = 1500;
    let displayThinking = thinking;
    if (thinking.length > MAX_THINKING_LENGTH) {
      displayThinking = thinking.substring(0, MAX_THINKING_LENGTH) + '\n\n（思考过程过长，已截断显示）';
    }

    // 更新状态为已完成
    if (response.status === 'success') {
      // 先发送思考内容
      if (displayThinking) {
        // 将思考内容转换为引用格式（每行前面加 >）
        const quotedThinking = displayThinking.split('\n').map(line => `> ${line}`).join('\n');
        
        await thread.send({
          content: `💭 **思考过程**\n\`\`\`\n${quotedThinking}\n\`\`\``,
        });
      }

      // 然后发送正式回复
      await thread.send({
        content: `✅ **OpenCode 回复**:

${response.result.output || '无输出'}

---
💡 你可以在这个 Thread 中继续追问`,
      });
    } else {
      await thread.send({
        content: `❌ **OpenCode 处理失败**:

错误信息: ${response.error?.message || '未知错误'}

请检查配置或稍后重试。`,
      });
    }

  } catch (error) {
    console.error('[OpenCode] 处理 Modal 提交失败:', error);
    await interaction.editReply({
      content: `❌ 创建任务失败: ${error.message}`,
    });
  }
}

module.exports = {
  name,
  execute,
};
