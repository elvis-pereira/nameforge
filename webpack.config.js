import { ESBuildMinifyPlugin } from 'esbuild-loader';
import { resolve } from 'node:path';
import webpack from 'webpack';

const config = {
  entry: {
    nameforge: './src/module.js'
  },

  output: {
    clean: true,
    publicPath: 'modules/nameforge/dist/',
    filename: '[name].js',
    path: resolve('./dist')
  },

  plugins: [
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map[query]',
      exclude: ['vendor.js']
    })
  ],

  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2021',
        keepNames: true,
        sourcemap: true
      })
    ],
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          chunks: 'all',
          name: 'vendor'
        }
      }
    }
  }
};

export default config;
