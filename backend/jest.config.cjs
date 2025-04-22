module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
    setupFiles: ['./jest.setup.js'],
    maxWorkers: 1,
    testTimeout: 20000,
};