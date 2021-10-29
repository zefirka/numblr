module.exports = {
    "extends": "../eslintrc.js",
    "overrides": [
        {
            "files": "*.js",
            "env": {
                "node": false,
                "es6": true,
                "browser": true
            },
            "parserOptions": {
                "project": null
            },
            "rules": {
                "@typescript-eslint/parser" : "off"
            }
        }
    ]
}

