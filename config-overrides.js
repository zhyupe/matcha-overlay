const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const pkg = require('./package.json')
const path = require('path')

module.exports = function override(config, env) {
  config.plugins = config.plugins.filter(plugin => {
    const name = plugin.constructor.name;
    return !['GenerateSW', 'ManifestPlugin'].includes(name);
  })

  const htmlPlugin = config.plugins.find(plugin => plugin.constructor.name === 'HtmlWebpackPlugin');
  if (htmlPlugin) {
    htmlPlugin.options.excludeChunks.push('map')
  }

  const buildTime = Date.now() - new Date(2020, 0, 1).getTime()
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.build': `'${pkg.version}-${Math.floor(buildTime / 1000 / 60 / 60)}'`
    })
  )
  config.plugins.push(
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["map"],
      template: path.join(__dirname, 'public/map.html'),
      filename: 'map.html',
    })
  )
 
  if (!process.env.CI) {
    if (process.env.NODE_ENV === 'production') {
      config.output.publicPath = `/matcha/${process.argv.includes('--staging') ? 'overlay-staging' : 'overlay'}/`;
      config.devtool = '';
    } else {
      config.output.publicPath = '/';
    }
  }

  config.entry = {
    main: config.entry,
    map: path.join(__dirname, 'src/map/index.ts')
  }
  return config;
}