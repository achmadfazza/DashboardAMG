const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const tokenBlacklist = require('../utils/blacklist');

// ==========================================
// LOGIC SIGN UP
// ==========================================
exports.signup = async (req, res) => {
   const { firstName, lastName, email, password, nik } = req.body;
   try {
      // Validasi input
      if (!firstName || !lastName || !email || !password || !nik) {
         return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await pool.query(
         'INSERT INTO users (first_name, last_name, email, password, nik) VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, nik, role, created_at',
         [firstName, lastName, email, hashedPassword, nik]
      );

      res.status(201).json({ message: 'Registrasi berhasil!', user: newUser.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// LOGIC SIGN IN
// ==========================================
exports.signin = async (req, res) => {
   const { nik, password } = req.body;
   try {
      const userQuery = await pool.query('SELECT * FROM users WHERE nik = $1', [nik]);
      if (userQuery.rows.length === 0) return res.status(401).json({ message: 'NIK atau password salah.' });

      const user = userQuery.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ message: 'NIK atau password salah.' });

      const token = jwt.sign(
         { userId: user.id, email: user.email, role: user.role, nik: user.nik },
         process.env.JWT_SECRET,
         { expiresIn: '30m' }
      );

      // Parsing FE
      const userData = {
         id: user.id,
         firstName: user.first_name,
         lastName: user.last_name,
         email: user.email,
         nik: user.nik,
         role: user.role
      };

      res.json({
         message: 'Sign in berhasil!',
         token: token,
         user: userData
      });
   } catch (err) {
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// LOGIC SIGN OUT
// ==========================================
exports.signout = (req, res) => {
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];

   if (!token) {
      return res.status(400).json({ message: 'Token tidak ditemukan.' });
   }

   tokenBlacklist.add(token);
   res.status(200).json({ message: 'Berhasil sign out. Token telah dihancurkan.' });
};
