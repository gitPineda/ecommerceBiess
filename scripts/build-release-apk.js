const { spawnSync } = require('node:child_process');
const path = require('node:path');

const androidDir = path.join(__dirname, '..', 'mobile', 'android');
const isWindows = process.platform === 'win32';
const gradleCommand = isWindows ? 'gradlew.bat' : './gradlew';
const gradleUserHome =
  process.env.GRADLE_USER_HOME ||
  path.join(process.env.USERPROFILE || process.env.HOME || androidDir, '.gradle-ecommercebiess');

const result = spawnSync(
  gradleCommand,
  ['app:assembleRelease', '-x', 'lint', '-x', 'test', '--console=plain', '--no-daemon'],
  {
    cwd: androidDir,
    env: {
      ...process.env,
      EXPO_NO_METRO_WORKSPACE_ROOT: '1',
      NODE_ENV: 'production',
      GRADLE_USER_HOME: gradleUserHome,
    },
    stdio: 'inherit',
    shell: isWindows,
  }
);

process.exit(result.status ?? 1);
