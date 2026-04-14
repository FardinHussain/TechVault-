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

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://techhvault.netlify.app',
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// ✅ ── HEALTH CHECK (VERY IMPORTANT) ──────────────────────────
app.get('/', (req, res) => {
  res.status(200).send('TechVault API is running ✅');
});

// ── Fallback frontend (SAFE) ──────────────────────────────────
app.get('*', (req, res) => {
  res.send('Fallback route working');
});

// ── Fallback JSON ─────────────────────────────────────────────
const ensureFallbackData = async () => {
  const dataDir = path.join(__dirname, 'data');
  const jsonPath = path.join(dataDir, 'products.json');

  if (fs.existsSync(jsonPath)) return;

  try {
    const res = await fetch('https://dummyjson.com/products?limit=100');
    const data = await res.json();

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const mapped = data.products.map(p => ({
      _id: String(p.id),
      title: p.title,
      description: p.description,
      price: p.price,
      category: p.category,
      stock: p.stock,
      images: p.images,
      thumbnail: p.thumbnail,
      rating: p.rating,
      numReviews: Math.floor(Math.random() * 50)
    }));

    fs.writeFileSync(jsonPath, JSON.stringify(mapped, null, 2));
    console.log('✅ Fallback JSON saved');

  } catch (err) {
    console.log('❌ Fallback fetch failed:', err.message);
  }
};

// ── Auto seed DB ──────────────────────────────────────────────
const autoSeed = async () => {
  try {
    const Product = require('./models/Product');
    const count = await Product.countDocuments();

    if (count === 0) {
      console.log('🌱 Seeding database...');
      const seedDB = require('./seed');
      await seedDB();
    } else {
      console.log(`📦 ${count} products already exist`);
    }

  } catch (err) {
    console.log('❌ Seed error:', err.message);
  }
};

// ── START SERVER ──────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

console.log("ENV PORT VALUE:", process.env.PORT);
console.log("FINAL PORT USED:", PORT);

(async () => {
  try {
    const dbOk = await connectDB();

    if (dbOk) {
      console.log('⏳ Waiting for DB ready...');
      await new Promise(res => setTimeout(res, 1000));
      await autoSeed();
    } else {
      await ensureFallbackData();
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔑 Admin → ${process.env.ADMIN_EMAIL}`);
      console.log(`🗄️ DB → ${dbOk ? 'MongoDB Connected' : 'Fallback Mode'}`);
    });

  } catch (error) {
    console.error('❌ Server start failed:', error.message);
    process.exit(1);
  }
})();