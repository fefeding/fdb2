const fs = require('fs');
const path = require('path');

// 要处理的目录
const dir = './dist/server';

// 检查目录是否存在
if (!fs.existsSync(dir)) {
  console.error(`Directory ${dir} does not exist`);
  process.exit(1);
}

// 获取目录中的所有文件
const files = fs.readdirSync(dir);

// 重命名所有 .js 文件为 .cjs
files.forEach(file => {
  if (file.endsWith('.js') && !file.endsWith('.cjs')) {
    const oldPath = path.join(dir, file);
    const newPath = path.join(dir, file.replace('.js', '.cjs'));
    
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: ${file} -> ${file.replace('.js', '.cjs')}`);
    } catch (error) {
      console.error(`Failed to rename ${file}:`, error.message);
    }
  }
});
