const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost', user: 'root', password: '', database: 'vivimostodos', port: 3306
  });
  const conn = await pool.getConnection();

  const [rows] = await conn.query(
    'SELECT id_apartamento, nombre_titular, correo, rol, estado FROM usuarios ORDER BY id_apartamento'
  );

  console.log('=== USUARIOS EN LA BASE DE DATOS ===');
  rows.forEach(u => {
    const estado = u.estado ? 'Activo' : 'Inactivo';
    console.log('Apt ' + u.id_apartamento + ' | ' + u.nombre_titular + ' | ' + u.correo + ' | ' + u.rol + ' | ' + estado);
  });
  console.log('Total:', rows.length);

  conn.release();
  process.exit(0);
})();
