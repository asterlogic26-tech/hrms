const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./database');
const rateLimit = require('express-rate-limit');

// Load .env from the backend directory regardless of process.cwd()
// (PM2 starts from the repo root, so plain dotenv.config() loads the wrong path)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
