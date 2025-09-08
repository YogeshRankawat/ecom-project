const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { readDb, writeDb } = require('./db');

const SECRET = process.env.JWT_SECRET;
const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
// Signup
router.post('/signup', (req, res) => {
   let db = readDb();
   const { email, password } = req.body;
  if (!emailPattern.test(email)) {
       return res.status(400).json({ message: "Invalid email format." });
   }
   // -------------------------

   if (!password || password.length < 6) {
     return res.status(400).json({ message: "Password must be at least 6 characters long." });
   }

   existingUser = db.users.find(u => u.email === email);
   if (existingUser) {
     return res.status(409).json({ message: "A user with this email address already exists." });
   }

   const hashedPassword = bcrypt.hashSync(password, 8);
   const newId = (db.nextUserId || 1);
   const newUser = { id: newId, email, password: hashedPassword };
   
   db.users.push(newUser);
   db.nextUserId = newId + 1; // Increment the next ID
   writeDb(db);

   // Automatically log in the user by providing a token
   const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET, { expiresIn: '8h' });
   res.status(201).json({ message: "Signup successful!", token });
});

// Login
router.post('/login', (req, res) => {
   let db = readDb();
   const { email, password } = req.body;

   let user = db.users.find(u => u.email === email);
   if (!user) {
     return res.status(404).json({ message: "User not found." });
   }

   const isPasswordCorrect = bcrypt.compareSync(password, user.password);
   if (!isPasswordCorrect) {
     return res.status(400).json({ message: "Invalid credentials." });
   }

   const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '8h' });
   res.status(200).json({ message: "Login successful!", token });
});

// API 1: FORGOT PASSWORD 
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const db = readDb();
    
    const user = db.users.find(u => u.email === email);
    if (!user) {

        return res.status(200).json({ message: 'If your email is registered, you will receive a reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // valid only 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = tokenExpiry;
    
    const userIndex = db.users.findIndex(u => u.email === email);
    db.users[userIndex] = user;
    writeDb(db);


    const resetLink = `http://127.0.0.1:5500/Frontend/reset.html?token=${resetToken}`;
    console.log('--- PASSWORD RESET LINK ---');
    console.log(`To: ${user.email}`);
    console.log(`Link (Copy this and open in browser): ${resetLink}`);
    console.log('---------------------------');

    res.status(200).json({ message: 'Password reset link has been generated (see terminal).' });
});


// API 2: RESET PASSWORD 
router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'The token and a new password (at least 6 characters) are required.' });
    }
    
    const db = readDb();
    
    const user = db.users.find(u => u.resetToken === token && u.resetTokenExpiry > Date.now());
    
    if (!user) {
        return res.status(400).json({ message: 'The password reset token is invalid or has expired.' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    
    const userIndex = db.users.findIndex(u => u.email === user.email);
    db.users[userIndex] = user;
    writeDb(db);
    
    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
});

module.exports = router;