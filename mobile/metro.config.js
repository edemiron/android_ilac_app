const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Sprint 103.2: Hanken Grotesk + Inter .woff2 fontları Metro bundler
// tarafından asset olarak tanınmalı (expo-font require() binary modules).
// Default assetExts listesi .woff2 içermez; jest moduleNameMapper
// sadece test ortamı için geçerli, Metro bundler ayrı konfig gerektirir.
config.resolver.assetExts = [...config.resolver.assetExts, 'woff2'];

module.exports = config;
