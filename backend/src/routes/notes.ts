import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'jhonote-secret'

// Tipos
interface Note extends RowDataPacket {
    id: number
    user_id: number
    title: string | null
    content: string
    created_at: Date
    updated_at: Date
}

// Middleware de autenticación
function getUserId(req: Request): number | null {
    try {
        const token = req.cookies.token
        if (!token) return null
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
        return decoded.userId
    } catch {
        return null
    }
}

// GET /api/notes - Listar notas
router.get('/', async (req: Request, res: Response) => {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'No autenticado' })

    try {
        const search = req.query.search as string || ''

        let query = 'SELECT * FROM notes WHERE user_id = ?'
        const params: (number | string)[] = [userId]

        if (search) {
            query += ' AND (title LIKE ? OR content LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        query += ' ORDER BY updated_at DESC'

        const [notes] = await pool.execute<Note[]>(query, params)

        res.json({ notes, total: notes.length })
    } catch (error) {
        console.error('Get notes error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

// POST /api/notes - Crear nota
router.post('/', async (req: Request, res: Response) => {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'No autenticado' })

    try {
        const { title, content } = req.body

        if (!content) {
            return res.status(400).json({ error: 'Contenido requerido' })
        }

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
            [userId, title || null, content]
        )

        const [notes] = await pool.execute<Note[]>(
            'SELECT * FROM notes WHERE id = ?',
            [result.insertId]
        )

        res.status(201).json({ note: notes[0] })
    } catch (error) {
        console.error('Create note error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

// PUT /api/notes/:id - Actualizar nota
router.put('/:id', async (req: Request, res: Response) => {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'No autenticado' })

    try {
        const { id } = req.params
        const { title, content } = req.body

        // Verificar propiedad
        const [existing] = await pool.execute<Note[]>(
            'SELECT id FROM notes WHERE id = ? AND user_id = ?',
            [id, userId]
        )

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Nota no encontrada' })
        }

        await pool.execute(
            'UPDATE notes SET title = ?, content = ? WHERE id = ?',
            [title || null, content, id]
        )

        const [notes] = await pool.execute<Note[]>(
            'SELECT * FROM notes WHERE id = ?',
            [id]
        )

        res.json({ note: notes[0] })
    } catch (error) {
        console.error('Update note error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

// DELETE /api/notes/:id - Eliminar nota
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'No autenticado' })

    try {
        const { id } = req.params

        const [result] = await pool.execute<ResultSetHeader>(
            'DELETE FROM notes WHERE id = ? AND user_id = ?',
            [id, userId]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nota no encontrada' })
        }

        res.json({ message: 'Nota eliminada' })
    } catch (error) {
        console.error('Delete note error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

// DELETE /api/notes - Eliminar todas las notas
router.delete('/', async (req: Request, res: Response) => {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'No autenticado' })

    try {
        const [result] = await pool.execute<ResultSetHeader>(
            'DELETE FROM notes WHERE user_id = ?',
            [userId]
        )

        res.json({ message: `${result.affectedRows} notas eliminadas` })
    } catch (error) {
        console.error('Delete all notes error:', error)
        res.status(500).json({ error: 'Error del servidor' })
    }
})

export default router
