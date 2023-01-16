import { resolve } from 'node:path';
import webpack from 'webpack';

const config = {
  entry: {
    nameforge: './src/module.js'
  },

  output: {
    clean: true,
    publicPath: '/modules/nameforge/dist/',
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
