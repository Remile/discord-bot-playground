const { ACPClient } = require('./client');

async function testSDKConnection() {
  console.log('测试 ACP SDK 连接...\n');
  
  const client = new ACPClient();
  
  // 测试健康检查
  const isHealthy = await client.healthCheck();
  console.log(`健康检查: ${isHealthy ? '✅ 通过' : '❌ 失败'}`);
  
  if (!isHealthy) {
    console.log('OpenCode 命令不可用，跳过测试');
    return;
  }
  
  try {
    // 测试发送任务
    console.log('\n发送测试任务...');
    const result = await client.sendTask({
      workingDir: '/home/better/dev/repo/discord-bot-playground',
      prompt: 'echo "Hello from ACP SDK Test"',
      metadata: { test: true },
    });
    
    console.log('\n✅ 测试完成!');
    console.log('任务ID:', result.taskId);
    console.log('状态:', result.response.status);
    console.log('输出条数:', result.response.output.length);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testSDKConnection();
