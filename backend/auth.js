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
       return res.status(400).json({ message: "अमान्य ईमेल फॉर्मेट।" });
   }
   // -------------------------

   if (!password || password.length < 6) {
     return res.status(400).json({ message: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए।" });
   }

   existingUser = db.users.find(u => u.email === email);
   if (existingUser) {
     return res.status(409).json({ message: "इस ईमेल से यूज़र पहले से मौजूद है।" });
   }

   
  //  if (!email || !password || password.length < 6) {
  //    return res.status(400).json({ message: "Invalid email or password (min 6 chars)." });
  //  }

  //  let existingUser = db.users.find(u => u.email === email);
  //  if (existingUser) {
  //    return res.status(409).json({ message: "User with this email already exists." });
  //  }

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

// API 1: FORGOT PASSWORD (रीसेट लिंक जेनरेट करने के लिए)
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const db = readDb();
    
    const user = db.users.find(u => u.email === email);
    if (!user) {
        // अगर यूज़र नहीं है, तब भी सुरक्षा के लिए सफलता का संदेश भेजें
        // ताकि कोई यह पता न लगा सके कि कौन सा ईमेल रजिस्टर्ड है
        return res.status(200).json({ message: 'अगर आपका ईमेल रजिस्टर्ड है, तो आपको रीसेट लिंक मिलेगा।' });
    }

    // एक सुरक्षित रैंडम टोकन बनाएं
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // 1 घंटे के लिए वैलिड

    // यूज़र ऑब्जेक्ट में टोकन और एक्सपायरी सेव करें
    user.resetToken = resetToken;
    user.resetTokenExpiry = tokenExpiry;
    
    const userIndex = db.users.findIndex(u => u.email === email);
    db.users[userIndex] = user;
    writeDb(db);

    // --- ईमेल भेजने का सिमुलेशन ---
    // असली ऐप में, यह लिंक ईमेल किया जाएगा।
    // अभी हम इसे टर्मिनल में प्रिंट करेंगे।
    const resetLink = `http://127.0.0.1:5500/Frontend/reset.html?token=${resetToken}`; //frontend ke path ke according change kre 
    console.log('--- PASSWORD RESET LINK ---');
    console.log(`To: ${user.email}`);
    console.log(`Link (Copy this and open in browser): ${resetLink}`);
    console.log('---------------------------');

    res.status(200).json({ message: 'पासवर्ड रीसेट लिंक जेनरेट हो गया है (टर्मिनल देखें)।' });
});


// API 2: RESET PASSWORD (नया पासवर्ड सेट करने के लिए)
router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'टोकन और नया पासवर्ड (कम से कम 6 अक्षर) ज़रूरी है।' });
    }
    
    const db = readDb();
    
    // टोकन के आधार पर यूज़र ढूंढें और देखें कि टोकन एक्सपायर तो नहीं हुआ
    const user = db.users.find(u => u.resetToken === token && u.resetTokenExpiry > Date.now());
    
    if (!user) {
        return res.status(400).json({ message: 'पासवर्ड रीसेट टोकन अमान्य है या एक्सपायर हो गया है।' });
    }
    
    // नए पासवर्ड को हैश करें
    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    
    // पासवर्ड अपडेट करें और टोकन को हटा दें
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    
    const userIndex = db.users.findIndex(u => u.email === user.email);
    db.users[userIndex] = user;
    writeDb(db);
    
    res.status(200).json({ message: 'पासवर्ड सफलतापूर्वक रीसेट हो गया है। अब आप लॉगिन कर सकते हैं।' });
});

module.exports = router;