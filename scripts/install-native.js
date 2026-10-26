// Installs the app's packages at the exact versions Expo lists for this SDK
// (node_modules/expo/bundledNativeModules.json), the same versions `expo install` would pick.
const { execSync } = require('child_process');
const versions = require('expo/bundledNativeModules.json');
const pkgs = [
  'react',
  'react-native',
  '@react-native-async-storage/async-storage',
  'expo-splash-screen',
  'expo-status-bar',
  'react-native-safe-area-context',
  'react-native-svg',
];
const missing = pkgs.filter((p) => !versions[p]);
if (missing.length) {
  console.error('No Expo version listed for: ' + missing.join(', '));
  process.exit(1);
}
const args = pkgs.map((p) => `${p}@${versions[p]}`).join(' ');
console.log('Installing ' + args);
execSync(`npm install --save ${args}`, { stdio: 'inherit' });
