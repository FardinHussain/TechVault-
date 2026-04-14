require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Initialize Express
const app = express();

// 1. SET PORT FIRST
// Ensure Railway sees the app listening immediately
const PORT = process.env.PORT || 8080;

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. FAST Health Check for Railway (The "I am alive" signal)
app.get('/health', (req, res) => res.status(200).send('OK'));

// 4. API Routes (Import these normally)
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// 5. Root Route Fix 
// (Don't use sendFile yet—it might be crashing if the path is wrong)
app.get('/', (req, res) => {
    res.json({ message: "Techvault API is running", database: "Connecting..." });
});

// 6. START SERVER IMMEDIATELY
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRITICAL: Server is listening on port ${PORT}`);
    
    // NOW connect to the DB after the server is safely up
    connectDB().then(async () => {
        console.log("🗄️ Database logic started...");
        try {
            const Product = require('./models/Product');
            const count = await Product.countDocuments();
            console.log(`📦 ${count} products exist`);
        } catch (e) {
            console.log("Seed check skipped:", e.message);
        }
    }).catch(err => {
        console.error("❌ DB failed but server stays alive:", err.message);
    });
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Cleaning up...');
    server.close(() => process.exit(0));
});
