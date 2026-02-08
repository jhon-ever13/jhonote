import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { notesService } from '../services/notes'
import type { Note } from '../services/notes'
import ConfirmDialog from '../components/ConfirmDialog'
import Navbar from '../components/Navbar'

interface Stats {
    total: number
    completed: number
    pending: number
    favorites: number
}

export default function Trash() {
    const { user } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [trashedNotes, setTrashedNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string; type: 'single' | 'all' }>({ open: false, type: 'single' })
    const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0, favorites: 0 })

    const fetchTrash = useCallback(async () => {
        if (!user) return
        try {
            const notes = await notesService.getTrash(user.id)
            setTrashedNotes(notes)
        } catch (error) {
            console.error('Error fetching trash:', error)
            showToast('Error al cargar la papelera', 'error')
        } finally {
            setLoading(false)
        }
    }, [user, showToast])

    // Fetch stats for profile modal
    const fetchStats = useCallback(async () => {
        if (!user) return
        try {
            const allNotes = await notesService.getAll(user.id)
            setStats({
                total: allNotes.length,
                completed: allNotes.filter(n => n.completed).length,
                pending: allNotes.filter(n => !n.completed).length,
                favorites: allNotes.filter(n => n.isFavorite).length
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }, [user])

    useEffect(() => {
        fetchTrash()
        fetchStats()
    }, [fetchTrash, fetchStats])

    const handleRestore = async (noteId: string) => {
        try {
            await notesService.restore(noteId)
            fetchTrash()
            showToast('♻️ Nota restaurada exitosamente')
        } catch (error) {
            console.error('Error restoring note:', error)
            showToast('Error al restaurar la nota', 'error')
        }
    }

    const handlePermanentDelete = async () => {
        if (deleteDialog.type === 'all') {
            // Empty entire trash
            if (!user) return
            try {
                await notesService.emptyTrash(user.id)
                fetchTrash()
                setDeleteDialog({ open: false, type: 'single' })
                showToast('🗑️ Papelera vaciada')
            } catch (error) {
                console.error('Error emptying trash:', error)
                showToast('Error al vaciar la papelera', 'error')
            }
        } else if (deleteDialog.id) {
            // Delete single note
            try {
                await notesService.permanentDelete(deleteDialog.id)
                fetchTrash()
                setDeleteDialog({ open: false, type: 'single' })
                showToast('🗑️ Nota eliminada permanentemente')
            } catch (error) {
                console.error('Error deleting note:', error)
                showToast('Error al eliminar la nota', 'error')
            }
        }
    }

    const handleRestoreAll = async () => {
        try {
            const restorePromises = trashedNotes.map(note => notesService.restore(note.id))
            await Promise.all(restorePromises)
            fetchTrash()
            showToast('♻️ Todas las notas restauradas')
        } catch (error) {
            console.error('Error restoring all notes:', error)
            showToast('Error al restaurar las notas', 'error')
        }
    }

    // Filter notes by search
    const filteredNotes = trashedNotes.filter(note =>
        note.title?.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase())
    )

    // Format date for display
    const formatDate = (timestamp: any) => {
        if (!timestamp) return ''
        const date = timestamp.toDate()
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="app-layout">
            {/* Shared Navbar */}
            <Navbar
                notesCount={stats.total}
                completedCount={stats.completed}
                pendingCount={stats.pending}
                favoritesCount={stats.favorites}
            />

            {/* Main Content */}
            <main className="main-content dashboard-bg">
                {/* Trash Header */}
                <div className="trash-header">
                    <div className="trash-title-section">
                        <h2>🗑️ Papelera</h2>
                        <span className="trash-count">{trashedNotes.length} nota{trashedNotes.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="trash-actions">
                        {/* Search */}
                        <div className="search-inline">
                            <span className="search-icon-inline">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar en papelera..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input-inline"
                            />
                        </div>

                        {trashedNotes.length > 0 && (
                            <>
                                <button
                                    className="btn-restore-all"
                                    onClick={handleRestoreAll}
                                >
                                    ♻️ Restaurar Todo
                                </button>
                                <button
                                    className="btn-empty-trash"
                                    onClick={() => setDeleteDialog({ open: true, type: 'all' })}
                                >
                                    🗑️ Vaciar Papelera
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Info Banner */}
                <div className="trash-info">
                    <span className="info-icon">ℹ️</span>
                    <span>Las notas en la papelera se pueden restaurar o eliminar permanentemente.</span>
                </div>

                {/* Trash Content */}
                <div className="trash-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Cargando papelera...</p>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="empty-trash">
                            <span className="empty-icon">🗑️</span>
                            <h3>{search ? 'No hay resultados' : 'La papelera está vacía'}</h3>
                            <p>{search ? 'No se encontraron notas con esa búsqueda' : 'Las notas eliminadas aparecerán aquí'}</p>
                            <button className="btn-back-notes" onClick={() => navigate('/notas')}>
                                📋 Ir a Notas
                            </button>
                        </div>
                    ) : (
                        <div className="trash-grid">
                            {filteredNotes.map(note => (
                                <div key={note.id} className="trash-item">
                                    <div className="trash-item-header">
                                        <h3>{note.title || 'Sin título'}</h3>
                                        <div className="trash-meta">
                                            <span className="deleted-date">
                                                Eliminada: {formatDate(note.deletedAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="trash-item-content">
                                        {note.content.length > 120
                                            ? note.content.substring(0, 120) + '...'
                                            : note.content || 'Sin contenido'}
                                    </p>

                                    <div className="trash-item-tags">
                                        {note.tags?.slice(0, 3).map(tag => (
                                            <span key={tag} className="tag-badge">#{tag}</span>
                                        ))}
                                    </div>

                                    <div className="trash-item-actions">
                                        <button
                                            className="btn-restore"
                                            onClick={() => handleRestore(note.id)}
                                        >
                                            ♻️ Restaurar
                                        </button>
                                        <button
                                            className="btn-delete-permanent"
                                            onClick={() => setDeleteDialog({ open: true, id: note.id, type: 'single' })}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, type: 'single' })}
                onConfirm={handlePermanentDelete}
                title={deleteDialog.type === 'all' ? '¿Vaciar papelera?' : '¿Eliminar permanentemente?'}
                message={deleteDialog.type === 'all'
                    ? 'Esta acción eliminará todas las notas de la papelera. No se podrán recuperar.'
                    : 'Esta nota se eliminará para siempre. No se podrá recuperar.'}
            />
        </div>
    )
}
