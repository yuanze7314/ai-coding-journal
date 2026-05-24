module.exports = {
  apps: [
    {
      name: 'ai-coding-journal',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
        DATA_DIR: process.env.DATA_DIR || './server/data',
        UPLOAD_DIR: process.env.UPLOAD_DIR || './server/uploads',
      },
    },
  ],
}
