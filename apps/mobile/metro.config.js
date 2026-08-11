// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const appsRoot = path.resolve(projectRoot, '..');
const repoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: resolve packages from app + root node_modules (cavitour-shared, hoisted deps).
config.watchFolders = [appsRoot, repoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(repoRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  'cavitour-shared': path.resolve(appsRoot, 'shared'),
};

config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'js', 'jsx', 'ts', 'tsx'];

// Faster startup + smaller initial evaluate; assets load when screens need them.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
