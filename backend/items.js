const express = require('express');
const router = express.Router();
const { readDb, writeDb } = require('./db');

// Get all items with optional filters
router.get('/', function(req, res) {
  let db = readDb();
  let data = db.items || [];

  const { category, minPrice, maxPrice, q } = req.query;

  if (category) {
    data = data.filter(it => it.category.toLowerCase() === category.toLowerCase());
  }
  if (minPrice) {
    data = data.filter(it => it.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    data = data.filter(it => it.price <= parseFloat(maxPrice));
  }
  if (q) {
    const searchTerm = q.toLowerCase();
    data = data.filter(it => 
      it.title.toLowerCase().includes(searchTerm) || 
      (it.desc || '').toLowerCase().includes(searchTerm)
    );
  }

  res.json(data);
});

// Get a single item by ID
router.get('/:id', function(req, res) {
  let db = readDb();
  const id = parseInt(req.params.id);
  const found = db.items.find(it => it.id === id);
  if (!found) {
    return res.status(404).json({ message: 'Item not found' });
  }
  res.json(found);
});

module.exports = router;