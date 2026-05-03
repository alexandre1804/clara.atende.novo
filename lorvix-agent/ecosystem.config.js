module.exports = {
  apps: [
    {
      name:        'lorvix-agent',
      script:      'dist/index.js',
      instances:   1,
      autorestart: true,
      watch:       false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/agent-error.log',
      out_file:   'logs/agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
