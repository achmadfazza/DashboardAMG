const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

const app = express();

// Middlewares Global
app.use(cors());
app.use(express.json());

// Routes
// Semua rute dari authRoutes akan diawali dengan /api/auth
app.use('/api/auth', authRoutes);

// Semua rute dari userRoutes akan diawali dengan /api/users
app.use('/api/users', userRoutes);

// Semua rute dari departmentRoutes akan diawali dengan /api/departments
app.use('/api/departments', departmentRoutes);

// Health check
app.get('/', (req, res) => {
   res.send('Server berjalan dengan baik');
});

// 404 Handler - Route tidak ditemukan
app.use((req, res) => {
   res.status(404).json({ message: 'Route tidak ditemukan.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

// Jalankan Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
   console.log(`Server berjalan di http://localhost:${PORT}`);
});
