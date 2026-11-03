const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/blacklist');

const authenticateToken = (req, res, next) => {
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];

   if (!token) {
      return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
   }

   if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Format token tidak valid.' });
   }

   if (tokenBlacklist.has(token)) {
      return res.status(403).json({ message: 'Sesi telah berakhir. Silakan login kembali.' });
   }

   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });

      req.user = user;
      next();
   });
};

module.exports = authenticateToken;
