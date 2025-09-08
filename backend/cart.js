const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { readDb, writeDb } = require('./db');

const SECRET = process.env.JWT_SECRET;

// Middleware to authenticate and set req.user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
}

// Get user's cart
router.get('/', authenticateToken, (req, res) => {
  const db = readDb();
  const userId = req.user.id;

  const userCartItems = db.cart
    .filter(c => c.userId === userId)
    .map(cartItem => {
      const item = db.items.find(i => i.id === cartItem.itemId);
      return {
        ...cartItem,
        title: item ? item.title : 'Deleted Item',
        price: item ? item.price : 0,
        image: item ? item.image : ''
      };
    });
  res.json(userCartItems);
});

// Add to cart
router.post('/add', authenticateToken, (req, res) => {
  const db = readDb();
  const userId = req.user.id;
  const { itemId, qty } = req.body;

  if (!itemId || !qty || qty < 1) {
      return res.status(400).json({ message: "Invalid item data" });
  }

  let cartItem = db.cart.find(c => c.userId === userId && c.itemId === itemId);

  if (cartItem) {
    cartItem.qty += qty;
  } else {
    const newCartId = (db.nextCartId || 1);
    db.cart.push({ id: newCartId, userId, itemId, qty });
    db.nextCartId = newCartId + 1;
  }

  writeDb(db);
  res.status(200).json({ message: 'Item added to cart' });
});

// Update cart item quantity
router.put('/update', authenticateToken, (req, res) => {
  const db = readDb();
  const userId = req.user.id;
  const { itemId, qty } = req.body;

  if (!itemId || qty === undefined || qty < 0) {
      return res.status(400).json({ message: "Invalid item data" });
  }
  
  const itemIndex = db.cart.findIndex(c => c.userId === userId && c.itemId === itemId);

  if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not in cart" });
  }
  
  if (qty === 0) {
      // Remove item if quantity is 0
      db.cart.splice(itemIndex, 1);
  } else {
      // Update quantity
      db.cart[itemIndex].qty = qty;
  }
  
  writeDb(db);
  res.status(200).json({ message: 'Cart updated' });
});


module.exports = router;