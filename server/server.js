require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const app = express();
// Railway provides the PORT, but we default to 8080 as a fallback
const PORT = process.env.PORT || 8080;

// ── 1. THE "HEALTHY" RESPONSE (MUST BE FIRST) ──────────────────
// This prevents Railway from sending the SIGTERM.
app.get('/', (req, res) => res.status(200).send('OK'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// ── 2. MIDDLEWARE ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── 3. ROUTES ─────────────────────────────────────────────────
// We use a try-catch to ensure a broken route file doesn't crash the server
try {
    app.use('/api/products', require('./routes/productRoutes'));
    app.use('/api/users', require('./routes/userRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));
    app.use('/api/reviews', require('./routes/reviewRoutes'));
} catch (error) {
    console.error("❌ Route Loading Error:", error.message);
}

// ── 4. BIND TO PORT IMMEDIATELY ──────────────────────────────
// We listen BEFORE connecting to the database.
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LIVE: Server listening on port ${PORT}`);
    
    // Connect to MongoDB in the background AFTER the server is up
    connectDB()
        .then(() => {
            console.log("✅ MongoDB Connected");
            // Run seeding only if DB is connected
            const autoSeed = async () => {
                try {
                    const Product = require('./models/Product');
                    const count = await Product.countDocuments();
                    console.log(`📦 ${count} products verified`);
                } catch (e) { console.log("Seed check skipped"); }
            };
            autoSeed();
        })
        .catch(err => {
            console.error("❌ DB Connection Failed:", err.message);
            // We do NOT exit. Let the server stay alive so you can debug.
        });
});

// ── 5. GRACEFUL SHUTDOWN ──────────────────────────────────────
process.on('SIGTERM', () => {
    console.log('SIGTERM received: Closing server...');
    server.close(() => {
        process.exit(0);
    });
});

// Prevent the "unhandledRejection" crash
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});
