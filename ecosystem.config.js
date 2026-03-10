module.exports = {
  apps: [
    {
      name: 'asterlogic-hrms-api',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 5000,
        JWT_SECRET: 'change_me_secure',
        FRONTEND_ORIGIN: 'http://localhost'
      }
    }
  ]
}
