const pool = require('../config/db');

// ==========================================
// LOGIC GET ALL DEPARTMENTS
// ==========================================
exports.getDepartments = async (req, res) => {
   try {
      const result = await pool.query('SELECT id, department_name, created_at FROM departments ORDER BY created_at DESC');
      res.json({ message: 'Data departemen berhasil diambil.', data: result.rows });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// LOGIC CREATE DEPARTMENT
// ==========================================
exports.createDepartment = async (req, res) => {
   const { department_name } = req.body;
   try {
      if (!department_name) {
         return res.status(400).json({ message: 'Nama departemen wajib diisi.' });
      }

      const result = await pool.query(
         'INSERT INTO departments (department_name) VALUES ($1) RETURNING id, department_name, created_at',
         [department_name]
      );

      res.status(201).json({ message: 'Departemen berhasil dibuat.', data: result.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// LOGIC UPDATE DEPARTMENT
// ==========================================
exports.updateDepartment = async (req, res) => {
   const { id } = req.params;
   const { department_name } = req.body;
   try {
      if (!department_name) {
         return res.status(400).json({ message: 'Nama departemen wajib diisi.' });
      }

      const result = await pool.query(
         'UPDATE departments SET department_name = $1 WHERE id = $2 RETURNING id, department_name, created_at',
         [department_name, id]
      );

      if (result.rows.length === 0) {
         return res.status(404).json({ message: 'Departemen tidak ditemukan.' });
      }

      res.json({ message: 'Departemen berhasil diupdate.', data: result.rows[0] });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

// ==========================================
// LOGIC DELETE DEPARTMENT
// ==========================================
exports.deleteDepartment = async (req, res) => {
   const { id } = req.params;
   try {
      const result = await pool.query(
         'DELETE FROM departments WHERE id = $1 RETURNING id, department_name, created_at',
         [id]
      );

      if (result.rows.length === 0) {
         return res.status(404).json({ message: 'Departemen tidak ditemukan.' });
      }

      res.json({ message: 'Departemen berhasil dihapus.' });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
   }
};

module.exports = {
   getDepartments: exports.getDepartments,
   createDepartment: exports.createDepartment,
   updateDepartment: exports.updateDepartment,
   deleteDepartment: exports.deleteDepartment,
};
