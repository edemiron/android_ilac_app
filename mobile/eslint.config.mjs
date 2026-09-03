import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __DEV__: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        // React Native globals
        fetch: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        AbortController: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // Node.js / TypeScript globals
        NodeJS: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    rules: {
      // TypeScript kuralları
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // React kuralları
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Genel kuralları
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-unused-vars': 'off', // TypeScript versiyonunu kullan

      /**
       * ═══════════════════════════════════════════════════════════════════
       * PROJEYE OZEL KAPILAR — hepsi UretimDE YASANMIS hatalardan turedi.
       *
       * Bunlar stil tercihi DEGIL. Her biri kullaniciya ulasmis bir kusurun
       * tekrar etmesini engelliyor; bu yuzden `warn` degil `error`.
       * ═══════════════════════════════════════════════════════════════════
       */
      'no-restricted-syntax': [
        'error',
        {
          /**
           * UTC GUN TUZAGI (v1.7.5 / v1.7.7 / v1.7.10)
           *
           * `new Date().toISOString().split('T')[0]` UTC gununu verir.
           * Turkiye UTC+3 oldugu icin 00:00-03:00 arasi BIR ONCEKI gunu
           * gosterir. Bu kalip kod tabaninda 14 yerde vardi ve su hatalari
           * uretti: cok dozlu ilacin dozu yanlis gune yazildi, islenmis alarm
           * anahtari kaydi, bakici takibi yanlis gunu izledi, `endDate` bir
           * gun erken doldu (ve v1.7.7'den beri `endDate` alarmi SUSTURUYOR).
           *
           * Dogrusu: `getLocalDateKey(date)` — src/domain/doseLog.ts
           */
          selector:
            "CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']",
          message:
            "UTC gun tuzagi: toISOString().split('T')[0] UTC gununu verir (TR'de 00:00-03:00 arasi bir onceki gun). getLocalDateKey() kullan — src/domain/doseLog.ts",
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Jest test dosyaları için config
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**/*.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
        global: 'writable',
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'android/',
      'ios/',
      '.expo/',
      'dist/',
      'build/',
      '*.config.js',
    ],
  },
];
