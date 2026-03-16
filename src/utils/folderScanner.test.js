const { scanSubfolders, isPathWithinWorkspace } = require('./folderScanner');
const fs = require('fs');
const path = require('path');

// 简单的手动测试
function testScanSubfolders() {
  const testDir = '/tmp/test-scanner';
  
  // 准备测试目录
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  fs.mkdirSync(path.join(testDir, 'folder-a'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'folder-b'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'file.txt'), 'test');
  
  const result = scanSubfolders(testDir);
  console.log('扫描结果:', result);
  
  // 验证
  if (result.length === 2 && result[0].name === 'folder-a') {
    console.log('✅ testScanSubfolders PASSED');
  } else {
    console.log('❌ testScanSubfolders FAILED');
    process.exit(1);
  }
  
  // 清理
  fs.rmSync(testDir, { recursive: true });
}

function testIsPathWithinWorkspace() {
  const workspace = '/home/user/workspace';
  
  const validCases = [
    '/home/user/workspace/project',
    '/home/user/workspace/project/src',
  ];
  
  const invalidCases = [
    '/home/user/other',
    '/etc/passwd',
    '/home/user/workspace/../other',
  ];
  
  for (const validPath of validCases) {
    if (!isPathWithinWorkspace(validPath, workspace)) {
      console.log(`❌ FAILED: ${validPath} 应该被允许`);
      process.exit(1);
    }
  }
  
  for (const invalidPath of invalidCases) {
    if (isPathWithinWorkspace(invalidPath, workspace)) {
      console.log(`❌ FAILED: ${invalidPath} 应该被拒绝`);
      process.exit(1);
    }
  }
  
  console.log('✅ testIsPathWithinWorkspace PASSED');
}

// 运行测试
testScanSubfolders();
testIsPathWithinWorkspace();
console.log('✅ 所有测试通过!');
