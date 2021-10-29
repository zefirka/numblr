import fs from 'fs';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import scss from 'rollup-plugin-scss';
import {terser} from 'rollup-plugin-terser';

const getCfg = (min) => ({
    input: './src/client/client.ts',
    output: {
        name: 'Numblr',
        format: 'iife',
        file: min ? './static/numblr.min.js' : './static/numblr.js',
        esModule: false,
        exports: 'default',
    },
    context: 'this',
    plugins: [
        typescript({
            typescript: require('typescript'),
            tsconfig: './src/client/tsconfig.json',
            useTsconfigDeclarationDir: true,
            objectHashIgnoreUnknownHack: true,
        }),
        scss({
            output: (styles) => {
                fs.writeFileSync('./static/index.css', styles);
            },
            bundle: 'index.css',
        }),
        commonjs(),
        resolve(),
        min && terser({
            compress: {
                inline: 0,
                passes: 2,
                keep_fnames: false,
                keep_fargs: false,
                pure_getters: true,
            },
            output: {
                comments: /^!/,
            }
        }),
    ].filter(Boolean)
})

module.exports = [
    getCfg(false),
    getCfg(true),
]


