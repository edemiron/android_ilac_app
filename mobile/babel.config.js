module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      // Production build'de console.* çağrılarını kaldır (startup performansı için)
      ...(isProduction ? ['transform-remove-console'] : []),
    ],
  };
};
