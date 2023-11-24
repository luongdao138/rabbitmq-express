module.exports = {
  apps: [
    {
      script: './dist/main.js',
      watch: false,
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      env: {
        ENV: 'production',
      },
    },
  ],
};
