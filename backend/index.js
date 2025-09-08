require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./auth');
const itemRoutes = require('./items');
const cartRoutes = require('./cart');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static images from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/cart', cartRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});