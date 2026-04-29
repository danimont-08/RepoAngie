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
    // 1) Ampliar ENUM de reservas para incluir aprobada y rechazada
    await conn.query(
      "ALTER TABLE reservas MODIFY COLUMN estado ENUM('activa','cancelada','aprobada','rechazada','completada') DEFAULT 'activa'"
    );
    console.log('OK: reservas.estado actualizado');

    // 2) Ampliar ENUM de prestamos_insumos para incluir pendiente_devolucion
    await conn.query(
      "ALTER TABLE prestamos_insumos MODIFY COLUMN estado ENUM('activo','devuelto','pendiente_devolucion') DEFAULT 'activo'"
    );
    console.log('OK: prestamos_insumos.estado actualizado');

    // 3) Verificar resultado final
    const [r1] = await conn.query("SHOW COLUMNS FROM reservas WHERE Field = 'estado'");
    const [r2] = await conn.query("SHOW COLUMNS FROM prestamos_insumos WHERE Field = 'estado'");

    console.log('reservas.estado tipo:         ', r1[0].Type);
    console.log('prestamos_insumos.estado tipo:', r2[0].Type);

    // Añadir id_reserva a prestamos_insumos
    try {
      await conn.query(
        "ALTER TABLE prestamos_insumos ADD COLUMN id_reserva INT(11) DEFAULT NULL AFTER id_apartamento"
      );
      console.log('OK: Columna id_reserva añadida a prestamos_insumos');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('INFO: La columna id_reserva ya existe en prestamos_insumos');
      } else {
        throw e;
      }
    }

    try {
      await conn.query(
        "ALTER TABLE prestamos_insumos ADD CONSTRAINT fk_prestamo_reserva FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE"
      );
      console.log('OK: Foreign Key fk_prestamo_reserva añadida a prestamos_insumos');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate key')) {
        console.log('INFO: La Foreign Key fk_prestamo_reserva ya existe');
      } else if (e.code === 'ER_CANT_CREATE_TABLE') {
        console.log('INFO: Puede que la FK ya exista, omitiendo...');
      } else {
        throw e;
      }
    }

    // Añadir nombre_insumo
    try {
      await conn.query(
        "ALTER TABLE prestamos_insumos ADD COLUMN nombre_insumo VARCHAR(150) DEFAULT NULL AFTER id_inventario"
      );
      console.log('OK: Columna nombre_insumo añadida a prestamos_insumos');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('INFO: La columna nombre_insumo ya existe');
      } else {
        throw e;
      }
    }

    // Cambiar tipo de fecha a DATETIME para guardar horas
    try {
      await conn.query("ALTER TABLE prestamos_insumos MODIFY COLUMN fecha_uso DATETIME DEFAULT NULL");
      await conn.query("ALTER TABLE prestamos_insumos MODIFY COLUMN fecha_devolucion_esperada DATETIME DEFAULT NULL");
      console.log('OK: Columnas de fecha convertidas a DATETIME');
    } catch (e) {
      console.log('INFO: Las columnas de fecha no pudieron modificarse a DATETIME o ya lo son', e.message);
    }

    console.log('\n Base de datos actualizada con id_reserva, nombre_insumo y fechas DATETIME correctamente.');
    conn.release();
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    conn.release();
    process.exit(1);
  }
})();
