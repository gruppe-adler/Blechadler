module.exports = {
    extends: 'standard-with-typescript',
    parserOptions: {
        project: './tsconfig.json'
    },
    rules: {
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/semi': ['error', 'always']
    }
};