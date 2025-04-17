module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: { node: 'current' },
                // Явно вказуємо трансформувати ES модулі в CommonJS
                modules: 'commonjs'
            }
        ]
    ]
};