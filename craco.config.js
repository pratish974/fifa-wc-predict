module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false, // This tells Webpack to stop demanding .js extensions
        },
      });
      return webpackConfig;
    },
  },
};
