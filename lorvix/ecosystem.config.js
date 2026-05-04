module.exports = {
  apps: [
    {
      name: 'lorvix',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/root/clara.atende.novo/lorvix',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/lorvix-error.log',
      out_file: '/var/log/pm2/lorvix-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
