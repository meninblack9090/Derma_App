const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase v10 ships some modules as .cjs
config.resolver.sourceExts.push('cjs');


module.exports = config;
