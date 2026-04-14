require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 8080;

// ── 1. HEALTH CHECKS (Must stay first for Railway) ───────────
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: "success", 
        message: "Techvault Backend API is Live",
        frontend: "https://techhvault.netlify.app"
    });
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// ── 2. MIDDLEWARE & CORS ──────────────────────────────────────
app.use(cors({
    origin: [
        'https://techhvault.netlify.app', // Your Netlify production URL
        'http://localhost:3000',          // Local development
        'http://localhost:5173'           // Vite default port
    ],
    credentials: true
}));
app.use(express.json());

// ── 3. API ROUTES ─────────────────────────────────────────────
try {
    app.use('/api/products', require('./routes/productRoutes'));
    app.use('/api/users', require('./routes/userRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));
    app.use('/api/reviews', require('./routes/reviewRoutes'));
} catch (error) {
    console.error("❌ Route Loading Error:", error.message);
}

// ── 4. BIND TO PORT IMMEDIATELY ──────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LIVE: Server listening on port ${PORT}`);
    
    // Connect to MongoDB in background AFTER listening
    connectDB()
        .then(() => {
            console.log("✅ MongoDB Connected");
            
            // Background Seeding Logic
            const autoSeed = async () => {
                try {
                    const Product = require('./models/Product');
                    const count = await Product.countDocuments();
                    if (count === 0) {
                        console.log("🌱 Database is empty. Seeding...");
                        const seedDB = require('./seed');
                        await seedDB();
                    } else {
                        console.log(`📦 ${count} products verified in database`);
                    }
                } catch (e) { 
                    console.log("Seed check skipped:", e.message); 
                }
            };
            autoSeed();
        })
        .catch(err => {
            console.error("❌ DB Connection Failed:", err.message);
        });
});

// ── 5. ERROR HANDLING & SHUTDOWN ─────────────────────────────
process.on('SIGTERM', () => {
    console.log('SIGTERM received: Closing server...');
    server.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});
