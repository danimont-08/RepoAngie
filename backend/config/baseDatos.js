const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConexion = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vivimostodos',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // dateStrings: true hace que mysql2 devuelva fechas siempre como string
  // "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss", evitando errores de zona horaria
  // y el bug "Invalid Date" en el frontend.
  dateStrings: true,
});

const verificarConexion = async () => {
  try {
    const conexion = await poolConexion.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    conexion.release();
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { poolConexion, verificarConexion };