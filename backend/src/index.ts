import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import notesRoutes from './routes/notes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/notes', notesRoutes)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'JHONOTE API' })
})

// Iniciar servidor
async function start() {
    try {
        await initDB()
        app.listen(PORT, () => {
            console.log(`🚀 JHONOTE API corriendo en http://localhost:${PORT}`)
        })
    } catch (error) {
        console.error('Error iniciando servidor:', error)
        process.exit(1)
    }
}

start()
