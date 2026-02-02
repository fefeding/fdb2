const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Checking for running fdb2 instances...');

try {
  const projectRoot = path.resolve(__dirname, '..');
  const pidFilePath = path.join(projectRoot, 'server.pid');

  if (fs.existsSync(pidFilePath)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFilePath, 'utf8'));
      process.kill(pid, 0);
      console.log('Found running fdb2 instance with PID:', pid);
      console.log('Stopping fdb2...');

      try {
        execSync('node bin/fdb2.js stop', {
          cwd: projectRoot,
          stdio: 'inherit'
        });
        console.log('fdb2 stopped successfully');
      } catch (stopError) {
        console.warn('Failed to stop fdb2:', stopError.message);
      }
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('Cleaning up stale PID file...');
        fs.unlinkSync(pidFilePath);
      }
    }
  } else {
    console.log('No running fdb2 instance found');
  }
} catch (error) {
  console.warn('Pre-install check failed:', error.message);
}
