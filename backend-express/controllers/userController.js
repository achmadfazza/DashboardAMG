const bcrypt = require('bcrypt');
const pool = require('../config/db');

// ==========================================
// GET ALL USERS
// ==========================================
exports.getAllUsers = async (req, res) => {
   try {
      const { search } = req.query;
      let query = `SELECT u.id, u.first_name, u.last_name, u.email, u.nik, u.role, u.created_at, d.department_name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id`;
      const values = [];

      if (search) {
         query += ' WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR nik ILIKE $1)';
         values.push(`%${search}%`);
      }

      query += ' ORDER BY u.created_at DESC';
      const result = await pool.query(query, values);
      res.json({ message: 'Data user berhasil diambil.', data: result.rows });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// GET USER BY ID
// ==========================================
exports.getUserById = async (req, res) => {
   const { id } = req.params;
   try {
      // department_id is required by the edit form; department_name is joined
      // for display and mirrors what GET /api/users returns.
      const result = await pool.query(
         `SELECT u.id, u.first_name, u.last_name, u.email, u.nik, u.role, u.created_at,
                 u.department_id, d.department_name AS department_name
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.id = $1`,
         [id]
      );
      if (result.rows.length === 0) {
         return res.status(404).json({ message: 'User tidak ditemukan.' });
      }
      res.json({ message: 'Data user berhasil diambil.', data: result.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// CREATE USER (Admin only)
// ==========================================
exports.createUser = async (req, res) => {
   const { firstName, lastName, email, password, nik, role, department_id } = req.body;
   try {
      // Validasi input
      if (!firstName || !lastName || !email || !password || !nik) {
         return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
         return res.status(400).json({ message: 'Email sudah terdaftar.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await pool.query(
         'INSERT INTO users (first_name, last_name, email, password, nik, role, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, last_name, email, nik, role, department_id, created_at',
         [firstName, lastName, email, hashedPassword, nik, role || 'user', department_id || null]
      );

      res.status(201).json({ message: 'User berhasil dibuat.', data: newUser.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// UPDATE USER
// ==========================================
exports.updateUser = async (req, res) => {
   const { id } = req.params;
   const { firstName, lastName, email, nik, role, department_id, password } = req.body;
   try {
      // Cek apakah user ada
      const userExists = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (userExists.rows.length === 0) {
         return res.status(404).json({ message: 'User tidak ditemukan.' });
      }

      // Password hanya diubah jika diisi. Form edit mengirim string kosong
      // ketika admin tidak ingin mengganti password, jadi jangan sampai
      // menimpa hash lama dengan string kosong.
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      const result = await pool.query(
         `UPDATE users
          SET first_name = $1, last_name = $2, email = $3, nik = $4, role = $5,
              department_id = $6, password = COALESCE($7::varchar, password)
          WHERE id = $8
          RETURNING id, first_name, last_name, email, nik, role, department_id, created_at`,
         [firstName, lastName, email, nik, role, department_id || null, hashedPassword, id]
      );

      res.json({ message: 'User berhasil diupdate.', data: result.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// UPDATE USER PASSWORD
// ==========================================
exports.updatePassword = async (req, res) => {
   const { id } = req.params;
   const { password } = req.body;
   try {
      if (!password) {
         return res.status(400).json({ message: 'Password wajib diisi.' });
      }

      const userExists = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (userExists.rows.length === 0) {
         return res.status(404).json({ message: 'User tidak ditemukan.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);

      res.json({ message: 'Password berhasil diupdate.' });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// DELETE USER
// ==========================================
exports.deleteUser = async (req, res) => {
   const { id } = req.params;
   try {
      const userExists = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (userExists.rows.length === 0) {
         return res.status(404).json({ message: 'User tidak ditemukan.' });
      }

      // Cek apakah user yang dihapus adalah admin terakhir
      if (userExists.rows[0].role === 'admin') {
         const adminCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
         if (parseInt(adminCount.rows[0].count) <= 1) {
            return res.status(400).json({ message: 'Tidak bisa menghapus admin terakhir.' });
         }
      }

      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ message: 'User berhasil dihapus.' });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// GET USER PROFILE (Own profile)
// ==========================================
exports.getProfile = async (req, res) => {
   try {
      const result = await pool.query(
         'SELECT id, first_name, last_name, email, nik, role, created_at FROM users WHERE id = $1',
         [req.user.userId]
      );
      if (result.rows.length === 0) {
         return res.status(404).json({ message: 'User tidak ditemukan.' });
      }
      res.json({ message: 'Profile berhasil diambil.', data: result.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// UPDATE OWN PROFILE
// ==========================================
exports.updateProfile = async (req, res) => {
   const { firstName, lastName, email, nik } = req.body;
   try {
      const result = await pool.query(
         'UPDATE users SET first_name = $1, last_name = $2, email = $3, nik = $4 WHERE id = $5 RETURNING id, first_name, last_name, email, nik, role, created_at',
         [firstName, lastName, email, nik, req.user.userId]
      );
      res.json({ message: 'Profile berhasil diupdate.', data: result.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};
