module.exports = {
  apps: [
    {
      name: 'asterlogic-hrms-api',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: process.env.PORT || 5000,
        FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
      }
    }
  ]
}
