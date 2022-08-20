/* eslint-disable */
const path = require('path');

function createConfig(libraryTarget = 'var') {
  return {
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: `atrament.${libraryTarget}.min.js`,
      library: 'atrament',
      libraryTarget
    },
    entry: [
      './index.ts'
    ],
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    devtool: 'inline-source-map',
    optimization: {
      minimize: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    }
  };
}

// noinspection WebpackConfigHighlighting
module.exports = [
  createConfig('var'),
  createConfig('amd'),
  createConfig('umd')
];
