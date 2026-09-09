module.exports = function (api) {
  api.cache(true);

  // Test ortaminda console.log/debug/info kaldirilmamali (jest testlerinde
  // bunlari assert ediyoruz). Production release build'de kaldirilir.
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      ...(isTest
        ? []
        : [
            [
              'transform-remove-console',
              {
                // error ve warn korunur ki production crash loglari gorunur kalsin.
                exclude: ['error', 'warn'],
              },
            ],
          ]),
      // Sprint 97.1: react-native-worklets plugin (Reanimated 4 + Moti icin).
      // Mutlaka EN SON plugin olmali — Reanimated docs uyarisi.
      'react-native-worklets/plugin',
    ],
  };
};
