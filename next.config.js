// next.config.js
module.exports = {
  output: 'export',
  webpack(config) {
    config.module.rules.push({
      test: /pdf\.worker(\.min)?\.mjs$/,
      type: 'asset/resource',
    });
    return config;
  },
};
