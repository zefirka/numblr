module.exports = {
    // Настройки проекта
    "env": {
        "browser": false,
        "es6": true,
        "es2017": true,
        "node": true
    },
    // Наборы правил
    "extends": [
        // Базовый набор правил eslint
        "eslint:recommended",
        // Отключаем правила из базового набора
        "plugin:@typescript-eslint/eslint-recommended",
        // Базовые правила для TypeScript
        "plugin:@typescript-eslint/recommended",
        // Правила TS, требующие инфо о типах
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    // Движок парсинга
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        // Движку нужен проект TS для правил с типами
        "project": "tsconfig.json",
        "tsconfigRootDir": __dirname,
    },
    // Плагин с наборами правил для TypeScript
    "plugins": ["@typescript-eslint"],
    "rules": {
        "semi": ["error", "always"],
        quotes: ["error", "single"],
        // "no-await-in-loop": "error",
        // "no-template-curly-in-string": "error",
        // "no-else-return": "error",
        // "no-new-wrappers": "error",
        // "no-useless-catch": "error",
        // "lines-between-class-members": [
        //     "error",
        //     "always",
        //     {
        //         "exceptAfterSingleLine": true
        //     }
        // ],
        // "no-lonely-if": "error",
        // "no-multi-assign": "error",
        // "no-unneeded-ternary": "error",
        // "object-shorthand": ["error", "properties"],
        // "prefer-object-spread": "error",
        // "no-duplicate-imports": "error",
        // "@typescript-eslint/member-ordering": [
        //     "error",
        //     {
        //         "default": [
        //             "static-field",
        //             "private-instance-field",
        //             "public-instance-field",
        //             "instance-field",
        //             "constructor",
        //             "public-instance-method"
        //         ]
        //     }
        // ],
        // "@typescript-eslint/no-explicit-any": "error",
        // "@typescript-eslint/no-inferrable-types": [
        //     "error",
        //     {
        //         "ignoreParameters": false,
        //         "ignoreProperties": false
        //     }
        // ],
        // "@typescript-eslint/consistent-type-assertions": [
        //     "error",
        //     {
        //         "assertionStyle": "as",
        //         "objectLiteralTypeAssertions": "allow-as-parameter"
        //     }
        // ],
        // "@typescript-eslint/triple-slash-reference": [
        //     "error",
        //     {
        //         "types": "prefer-import"
        //     }
        // ],
        "@typescript-eslint/no-unused-vars": "error",
        // "@typescript-eslint/no-use-before-define": [
        //     "error",
        //     {
        //         "functions": false
        //     }
        // ],
        "@typescript-eslint/no-misused-promises": "off",
        // "@typescript-eslint/prefer-regexp-exec": "off",
        // "@typescript-eslint/require-await": "off",
        // "@typescript-eslint/no-empty-function": "off",
        // "@typescript-eslint/no-useless-constructor": "error",
        // "@typescript-eslint/no-unused-expressions": "error",
        // "@typescript-eslint/prefer-function-type": "error",
        // "@typescript-eslint/ban-types": "off",
        // "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        // "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-assignment": "off"
        // "@typescript-eslint/no-unsafe-return": "off"
    },
    "overrides": [
        {
            "files": "*.js",
            "env": {
                "node": true,
                "es6": true
            },
            "parserOptions": {
                "project": null
            },
        }
    ]
}
