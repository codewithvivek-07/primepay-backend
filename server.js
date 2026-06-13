require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./models/db');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
  origin: '*', // restrict to your frontend domain in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Connect to database (or fallback to in-memory) ---
connectDB();

// --- API Routes ---
app.use('/api', orderRoutes);
app.use('/api', webhookRoutes);
app.use('/api', transactionRoutes);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PrimePay Test Gateway API is running.' });
});

// --- Serve frontend (optional, for single-deployment setups) ---
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, req.path === '/' ? 'index.html' : req.path), (err) => {
    if (err) res.status(404).sendFile(path.join(frontendPath, 'index.html'));
  });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`🚀 PrimePay Test Gateway server running on port ${PORT}`);
});
