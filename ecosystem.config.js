/**
 * PM2 Ecosystem Configuration
 * 
 * Production deployment for LDS Application
 * Server: 203.175.74.168
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart lds-backend
 *   pm2 logs lds-backend
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'lds-backend',
      cwd: './backend',
      script: './bin/www',
      instances: 'max', // Use all available CPUs
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8083
      },
      
      // Logging
      log_file: '/var/log/pm2/lds-backend.log',
      out_file: '/var/log/pm2/lds-backend-out.log',
      error_file: '/var/log/pm2/lds-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Watch (disable in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Source maps for error tracking
      source_map_support: true,
      
      // Node arguments
      node_args: '--max-old-space-size=512'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: '203.175.74.168',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/lds.git',
      path: '/var/www/lds',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
