const path = require("path");

module.exports = {
  entry: path.resolve(__dirname, "src/client/index.ts"),
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "public")
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.client.json"
          }
        },
        exclude: /node_modules/
      }
    ]
  }
};
