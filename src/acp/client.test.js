const { ACPClient } = require('./client');

async function testGenerateId() {
  const client = new ACPClient();
  const result = await client.sendTask({
    workingDir: '/tmp/test',
    prompt: 'test prompt',
    metadata: { test: true },
  }).catch(err => ({ error: err.message }));
  
  // 由于没有真实的 OpenCode 服务，我们期望连接失败
  if (result.error && result.error.includes('发送任务到 OpenCode 失败')) {
    console.log('✅ testGenerateId PASSED (预期的连接失败)');
  } else {
    console.log('❌ testGenerateId FAILED: 意外的结果', result);
    process.exit(1);
  }
}

async function testHealthCheck() {
  const client = new ACPClient({ baseUrl: 'http://localhost:99999' });
  const isHealthy = await client.healthCheck();
  
  if (isHealthy === false) {
    console.log('✅ testHealthCheck PASSED');
  } else {
    console.log('❌ testHealthCheck FAILED');
    process.exit(1);
  }
}

// 运行测试
(async () => {
  await testGenerateId();
  await testHealthCheck();
  console.log('✅ 所有 ACP 客户端测试通过!');
})();
