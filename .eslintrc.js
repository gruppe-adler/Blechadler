module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
    ],
    extends: 'standard-with-typescript',
    rules: {
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/semi': ['error', 'always']
    },
    parserOptions: {
        project: './tsconfig.json'
    }
};