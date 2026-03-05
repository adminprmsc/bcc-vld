const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('cjs')) {
  config.resolver.assetExts.push('cjs');
}

const cssStubPath = path.join(__dirname, 'metro.mapbox-css-stub.js');
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@rnmapbox/maps': path.join(__dirname, 'node_modules/@rnmapbox/maps/lib/module/index.native.js'),
  'mapbox-gl/dist/mapbox-gl.css': cssStubPath,
};

const { assetExts, sourceExts } = config.resolver;

config.resolver.assetExts = assetExts.includes('css') ? assetExts : [...assetExts, 'css'];
config.resolver.sourceExts = sourceExts.filter((ext) => ext !== 'css');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.css')) {
    return {
      type: 'sourceFile',
      filePath: cssStubPath,
    };
  }

  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
