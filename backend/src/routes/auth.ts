import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'jhonote-secret'

// Tipos
interface User extends RowDataPacket {
    id: number
    email: string
    password_hash: string
    name: string | null
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' })
        }

        // Verificar si existe
        const [existing] = await pool.execute<User[]>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        )

        if (existing.length > 0) {
            return res.status(409).json({ error: 'El email ya está registrado' })
        }

        // Crear usuario
        const passwordHash = await bcrypt.hash(password, 12)
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
            [email, passwordHash, name || null]
        )

        // Crear token
        const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: '7d' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.status(201).json({
            user: { id: result.insertId, email, name: name || null }
        })
    } catch (error) {
        console.error('Register error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' })
        }

        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        )

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }

        const user = users[0]
        const validPassword = await bcrypt.compare(password, user.password_hash)

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.json({
            user: { id: user.id, email: user.email, name: user.name }
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('token')
    res.json({ message: 'Sesión cerrada' })
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }

        const [users] = await pool.execute<User[]>(
            'SELECT id, email, name FROM users WHERE id = ?',
            [decoded.userId]
        )

        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' })
        }

        res.json({ user: users[0] })
    } catch (error) {
        res.clearCookie('token')
        res.status(401).json({ error: 'Token inválido' })
    }
})

export default router
