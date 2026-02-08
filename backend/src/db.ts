import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'notas_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Crear tablas si no existen
export async function initDB() {
  const connection = await pool.getConnection()
  try {
    const dbName = process.env.DB_NAME || 'notas_db'

    // Verificar si la tabla users tiene estructura incorrecta (de Sequelize/ORM anterior)
    const [tableInfo]: any = await connection.execute(`
      SELECT COLUMN_NAME, EXTRA FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'
    `, [dbName])

    // Si existe la tabla pero el id no tiene auto_increment, recrear las tablas
    if (tableInfo.length > 0 && !tableInfo[0].EXTRA.includes('auto_increment')) {
      console.log('⚠️ Tabla users tiene estructura incorrecta. Recreando tablas...')
      await connection.execute(`DROP TABLE IF EXISTS notes`)
      await connection.execute(`DROP TABLE IF EXISTS users`)
      console.log('🗑️ Tablas eliminadas')
    }

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    console.log('✅ Base de datos inicializada')
  } finally {
    connection.release()
  }
}

export default pool
