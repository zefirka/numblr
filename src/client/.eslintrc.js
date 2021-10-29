const {resolve} = require('path');

module.exports = {
    "extends": resolve(__dirname, '../../.eslintrc.js'),
    "env": {
        "node": false,
        "es6": true,
        "browser": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        // Движку нужен проект TS для правил с типами
        "project": "tsconfig.json",
        "tsconfigRootDir": __dirname,
    },
    "rules": {
        "@typescript-eslint/parser" : "off",
        "@typescript-eslint/no-floating-promises": "off",
    }
}

