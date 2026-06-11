module.exports = {
  apps: [
    {
      name: 'rhose-api',
      cwd: './backend',
      script: 'dist/index.js',
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES || 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};
