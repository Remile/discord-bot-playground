const fs = require('fs');
const path = require('path');

/**
 * 扫描指定目录下的所有子文件夹
 * @param {string} workspaceDir - 工作区目录路径
 * @returns {Array<{name: string, path: string}>} 文件夹列表
 */
function scanSubfolders(workspaceDir) {
  try {
    if (!fs.existsSync(workspaceDir)) {
      console.warn(`[folderScanner] 工作区目录不存在: ${workspaceDir}`);
      return [];
    }

    const items = fs.readdirSync(workspaceDir, { withFileTypes: true });
    const folders = items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        path: path.join(workspaceDir, item.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return folders;
  } catch (error) {
    console.error('[folderScanner] 扫描文件夹失败:', error);
    return [];
  }
}

/**
 * 验证路径是否在工作区内（安全校验）
 * @param {string} targetPath - 目标路径
 * @param {string} workspaceDir - 工作区目录
 * @returns {boolean} 是否合法
 */
function isPathWithinWorkspace(targetPath, workspaceDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedWorkspace = path.resolve(workspaceDir);
  return resolvedTarget.startsWith(resolvedWorkspace);
}

module.exports = {
  scanSubfolders,
  isPathWithinWorkspace,
};
