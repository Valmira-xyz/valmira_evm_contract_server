module.exports = {
    apps: [{
      name: "valmira-contracts-server",
      script: "src/index.js",
      env: {
        NODE_ENV: "development",
      },
      watch: ["src/**/*.js"],
      ignore_watch: ["src/**/*.test.js", "node_modules", "logs", "artifacts", "cache"],
      watch_options: {
        "usePolling": true,
        "interval": 1000
      }
    }]
  };