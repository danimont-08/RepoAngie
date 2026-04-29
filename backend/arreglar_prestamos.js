const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vivimostodos',
    port: 3306
  });

  const conn = await pool.getConnection();

  try {
    // Eliminar la tabla actual para recrearla limpia con la estructura exacta de 8 columnas
    await conn.query(`DROP TABLE IF EXISTS prestamos_insumos`);
    console.log('OK: Tabla prestamos_insumos eliminada.');
    
    await conn.query(`
      CREATE TABLE prestamos_insumos (
        id_prestamo    INT(11)       AUTO_INCREMENT PRIMARY KEY,
        id_apartamento INT(11)       NOT NULL,
        id_reserva     INT(11)       NOT NULL,
        id_inventario  INT(11)       NOT NULL,
        cantidad       INT(11)       NOT NULL,
        fecha_prestamo DATETIME      NOT NULL,
        fecha_espera   DATETIME      NOT NULL,
        nombre_insumo  VARCHAR(150)  NOT NULL,
        CONSTRAINT fk_pi_apartamento FOREIGN KEY (id_apartamento) REFERENCES usuarios(id_apartamento)  ON DELETE CASCADE,
        CONSTRAINT fk_pi_reserva     FOREIGN KEY (id_reserva)     REFERENCES reservas(id_reserva)       ON DELETE CASCADE,
        CONSTRAINT fk_pi_inventario  FOREIGN KEY (id_inventario)  REFERENCES inventario(id_inventario)  ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('');
    console.log('\u2705 Tabla prestamos_insumos creada exitosamente con exactamente 8 campos:');
    console.log('   1. id_prestamo');
    console.log('   2. id_apartamento');
    console.log('   3. id_reserva');
    console.log('   4. id_inventario');
    console.log('   5. cantidad');
    console.log('   6. fecha_prestamo');
    console.log('   7. fecha_espera');
    console.log('   8. nombre_insumo');

  } catch (error) {
    console.error('\u274C Error:', error.message);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
})();
