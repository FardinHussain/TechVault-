require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');

const { connectDB } = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const { protect, admin } = require('./middleware/authMiddleware');
const { deleteProduct } = require('./controllers/productController');
const { getAllOrders, updateOrderStatus, getStats } = require('./controllers/orderController');
const { getUserCount } = require('./controllers/userController');

const app = express();

// ✅ VERY FIRST → health check (Railway needs this FAST)
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: '*', // avoid CORS blocking in production
}));

app.use(express.json());

// ⚠️ TEMP DISABLE STATIC (prevents Railway issues)
// app.use(express.static(path.join(__dirname, '../public')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);

// ── Admin Routes ──────────────────────────────────────────────
app.get('/api/admin/stats', protect, admin, getStats);
app.get('/api/admin/orders', protect, admin, getAllOrders);
app.put('/api/admin/orders/:id/status', protect, admin, updateOrderStatus);
app.delete('/api/admin/products/:id', protect, admin, deleteProduct);
app.get('/api/admin/users/count', protect, admin, getUserCount);

// ── SAFE FALLBACK (MUST BE LAST) ──────────────────────────────
app.get('*', (req, res) => {
  res.status(200).send('OK');
});

// ── FALLBACK JSON ─────────────────────────────────────────────
const ensureFallbackData = async () => {
  try {
    const dataDir = path.join(__dirname, 'data');
    const jsonPath = path.join(dataDir, 'products.json');

    if (fs.existsSync(jsonPath)) return;

    const res = await fetch('https://dummyjson.com/products?limit=100');
    const data = await res.json();

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(jsonPath, JSON.stringify(data.products, null, 2));
    console.log('✅ Fallback JSON ready');
  } catch (err) {
    console.log('⚠️ Fallback failed:', err.message);
  }
};

// ── AUTO SEED ────────────────────────────────────────────────
const autoSeed = async () => {
  try {
    const Product = require('./models/Product');
    const count = await Product.countDocuments();

    if (count === 0) {
      console.log('🌱 Seeding DB...');
      const seedDB = require('./seed');
      await seedDB();
    } else {
      console.log(`📦 ${count} products exist`);
    }
  } catch (err) {
    console.log('⚠️ Seed skipped:', err.message);
  }
};

// ── START SERVER ──────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

// Start server FIRST
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Run DB init in background (won’t kill server if it fails)
(async () => {
  try {
    const dbOk = await connectDB();
    if (dbOk) {
      await autoSeed();
    } else {
      await ensureFallbackData();
    }
  } catch (err) {
    console.error('⚠️ Background init error:', err.message);
  }
})();