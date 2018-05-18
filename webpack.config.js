const {resolve} = require('path')
const Html = require('html-webpack-plugin')

module.exports = () => ({
  entry: './index.js',
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {test: /\.jsx?$/, loader: 'babel-loader'},
      {test: isImage, loader: 'url-loader'},
      {test: /\.css$/, use: [
        'style-loader',
        {
          loader: 'css-loader', 
          options: {modules: true},
        }
      ]}
    ]
  },
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    extensions: ['.jsx', '.js', '.json']
  },
  plugins: [
    new Html({template: 'index.html'})
  ]  
})

const isImage = /\.(png|jpg|jpeg|gif|svg)$/