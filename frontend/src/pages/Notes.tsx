import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { notesService } from '../services/notes'
import type { Note, Priority } from '../services/notes'
import NoteModal from '../components/NoteModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Navbar from '../components/Navbar'

type FilterType = 'all' | 'favorites' | 'pinned'
type PriorityFilter = 'all' | 'alta' | 'media' | 'baja'

export default function Notes() {
    const { user } = useAuth()
    const { showToast } = useToast()
    const [searchParams] = useSearchParams()
    const [notes, setNotes] = useState<Note[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingNote, setEditingNote] = useState<Note | null>(null)
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string }>({ open: false })
    const [filter, setFilter] = useState<FilterType>('all')
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

    // Open modal if ?new=true
    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setEditingNote(null)
            setModalOpen(true)
        }
    }, [searchParams])

    const fetchNotes = useCallback(async () => {
        if (!user) return
        try {
            const data = await notesService.getAll(user.id, search)
            setNotes(data)
        } catch (error) {
            console.error('Error fetching notes:', error)
        } finally {
            setLoading(false)
        }
    }, [user, search])

    useEffect(() => {
        fetchNotes()
    }, [fetchNotes])

    // Keyboard shortcut: Ctrl+N
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault()
                setEditingNote(null)
                setModalOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleSave = async (
        title: string,
        content: string,
        completed: boolean,
        startDate: string | null,
        dueDate: string | null,
        tags: string[],
        pinned: boolean,
        isFavorite: boolean,
        priority: Priority
    ) => {
        if (!user) return
        try {
            if (editingNote) {
                await notesService.update(editingNote.id, title, content, completed, startDate, dueDate, tags, pinned, isFavorite, priority)
            } else {
                await notesService.create(user.id, title, content, startDate, dueDate, tags, pinned, isFavorite, priority)
            }
            fetchNotes()
            setModalOpen(false)
            setEditingNote(null)
            showToast(editingNote ? '✅ Nota actualizada' : '✅ Nota creada exitosamente')
        } catch (error) {
            console.error('Error saving note:', error)
            showToast('Error al guardar la nota', 'error')
        }
    }

    const handleToggleComplete = async (note: Note) => {
        try {
            await notesService.toggleComplete(note.id, !note.completed)
            fetchNotes()
            showToast(note.completed ? '📝 Nota marcada como pendiente' : '✅ ¡Nota completada!')
        } catch (error) {
            console.error('Error toggling note:', error)
            showToast('Error al actualizar la nota', 'error')
        }
    }

    const handleTogglePin = async (note: Note) => {
        try {
            await notesService.togglePin(note.id, !note.pinned)
            fetchNotes()
            showToast(note.pinned ? '📌 Nota desfijada' : '📌 Nota fijada arriba')
        } catch (error) {
            console.error('Error toggling pin:', error)
            showToast('Error al fijar la nota', 'error')
        }
    }

    const handleToggleFavorite = async (note: Note) => {
        try {
            await notesService.toggleFavorite(note.id, !note.isFavorite)
            fetchNotes()
            showToast(note.isFavorite ? '☆ Quitado de favoritos' : '⭐ Agregado a favoritos')
        } catch (error) {
            console.error('Error toggling favorite:', error)
            showToast('Error al actualizar favorito', 'error')
        }
    }

    const handleDelete = async () => {
        if (!deleteDialog.id) return
        try {
            await notesService.delete(deleteDialog.id)
            fetchNotes()
            setDeleteDialog({ open: false })
            showToast('🗑️ Nota eliminada')
        } catch (error) {
            console.error('Error deleting note:', error)
            showToast('Error al eliminar la nota', 'error')
        }
    }

    // Get all unique tags
    const allTags = [...new Set(notes.flatMap(n => n.tags || []))]

    // Apply filters
    let filteredNotes = notes
    if (filter === 'favorites') {
        filteredNotes = filteredNotes.filter(n => n.isFavorite)
    } else if (filter === 'pinned') {
        filteredNotes = filteredNotes.filter(n => n.pinned)
    }
    if (selectedTag) {
        filteredNotes = filteredNotes.filter(n => n.tags?.includes(selectedTag))
    }
    if (priorityFilter !== 'all') {
        filteredNotes = filteredNotes.filter(n => n.priority === priorityFilter)
    }

    const pendingNotes = filteredNotes.filter(n => !n.completed)
    const completedNotes = filteredNotes.filter(n => n.completed)

    const filteredPending = search
        ? pendingNotes.filter(n =>
            n.title?.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase())
        )
        : pendingNotes

    const filteredCompleted = search
        ? completedNotes.filter(n =>
            n.title?.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase())
        )
        : completedNotes

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false
        return new Date(dueDate) < new Date()
    }

    return (
        <div className="app-layout">
            {/* Shared Navbar */}
            <Navbar
                notesCount={notes.length}
                completedCount={completedNotes.length}
                pendingCount={pendingNotes.length}
                favoritesCount={notes.filter(n => n.isFavorite).length}
            />

            {/* Main Content */}
            <main className="main-content dashboard-bg">
                {/* Compact Filter Toolbar */}
                <div className="filter-toolbar">
                    {/* Top Row: Search + New Note */}
                    <div className="toolbar-top">
                        <div className="search-inline">
                            <span className="search-icon-inline">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar notas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input-inline"
                            />
                        </div>
                        <button
                            className="btn-new-inline"
                            onClick={() => { setEditingNote(null); setModalOpen(true); }}
                        >
                            + Nueva Nota
                        </button>
                    </div>

                    {/* Filter Row: Tabs + Tags + Priority */}
                    <div className="filter-row">
                        {/* Main Tabs */}
                        <div className="filter-group">
                            <button
                                className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                📋 Todas
                            </button>
                            <button
                                className={`filter-chip ${filter === 'favorites' ? 'active' : ''}`}
                                onClick={() => setFilter('favorites')}
                            >
                                ⭐ Favoritas
                            </button>
                            <button
                                className={`filter-chip ${filter === 'pinned' ? 'active' : ''}`}
                                onClick={() => setFilter('pinned')}
                            >
                                📌 Fijadas
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="filter-divider"></div>

                        {/* Tags */}
                        {allTags.length > 0 && (
                            <div className="filter-group tags-group">
                                <span className="filter-group-label">Etiquetas:</span>
                                <button
                                    className={`filter-chip small ${!selectedTag ? 'active' : ''}`}
                                    onClick={() => setSelectedTag(null)}
                                >
                                    Todas
                                </button>
                                {allTags.slice(0, 5).map(tag => (
                                    <button
                                        key={tag}
                                        className={`filter-chip small tag ${selectedTag === tag ? 'active' : ''}`}
                                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                                {allTags.length > 5 && (
                                    <span className="more-tags">+{allTags.length - 5}</span>
                                )}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="filter-divider"></div>

                        {/* Priority */}
                        <div className="filter-group priority-group">
                            <span className="filter-group-label">Prioridad:</span>
                            <button
                                className={`filter-chip small ${priorityFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setPriorityFilter('all')}
                            >
                                Todas
                            </button>
                            <button
                                className={`filter-chip small priority-alta ${priorityFilter === 'alta' ? 'active' : ''}`}
                                onClick={() => setPriorityFilter('alta')}
                            >
                                🔴
                            </button>
                            <button
                                className={`filter-chip small priority-media ${priorityFilter === 'media' ? 'active' : ''}`}
                                onClick={() => setPriorityFilter('media')}
                            >
                                🟡
                            </button>
                            <button
                                className={`filter-chip small priority-baja ${priorityFilter === 'baja' ? 'active' : ''}`}
                                onClick={() => setPriorityFilter('baja')}
                            >
                                🟢
                            </button>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="columns-container">
                    {/* Pending Column */}
                    <div className="column">
                        <div className="column-header">
                            <h2>⏳ Notas Pendientes</h2>
                            <span className="column-count">{filteredPending.length}</span>
                        </div>

                        <div className="notes-list">
                            {loading ? (
                                <div className="loading-small">Cargando...</div>
                            ) : filteredPending.length === 0 ? (
                                <div className="empty-column">
                                    <p>No hay notas pendientes</p>
                                </div>
                            ) : (
                                filteredPending.map(note => (
                                    <div
                                        key={note.id}
                                        className={`note-item ${isOverdue(note.dueDate) ? 'overdue' : ''} ${note.pinned ? 'pinned' : ''}`}
                                    >
                                        {/* Note indicators */}
                                        <div className="note-indicators">
                                            {note.priority && (
                                                <span className={`indicator priority-indicator ${note.priority}`} title={`Prioridad ${note.priority}`}>
                                                    {note.priority === 'alta' ? '🔴' : note.priority === 'media' ? '🟡' : '🟢'}
                                                </span>
                                            )}
                                            {note.pinned && <span className="indicator pin" title="Nota fijada">📌</span>}
                                            {note.isFavorite && <span className="indicator favorite" title="Favorita">⭐</span>}
                                        </div>

                                        <div className="note-item-content">
                                            <h4>{note.title || 'Sin título'}</h4>
                                            <p>{note.content.length > 80
                                                ? note.content.substring(0, 80) + '...'
                                                : note.content}
                                            </p>

                                            {/* Tags */}
                                            {note.tags && note.tags.length > 0 && (
                                                <div className="note-tags">
                                                    {note.tags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="tag-badge small"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedTag(tag)
                                                            }}
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {note.dueDate && (
                                                <span className={`due-badge ${isOverdue(note.dueDate) ? 'overdue' : ''}`}>
                                                    🎯 {note.dueDate}
                                                </span>
                                            )}
                                        </div>
                                        <div className="note-item-actions">
                                            <button
                                                className={`action-btn pin ${note.pinned ? 'active' : ''}`}
                                                onClick={() => handleTogglePin(note)}
                                                title={note.pinned ? 'Desfijar' : 'Fijar arriba'}
                                            >
                                                📌
                                            </button>
                                            <button
                                                className={`action-btn favorite ${note.isFavorite ? 'active' : ''}`}
                                                onClick={() => handleToggleFavorite(note)}
                                                title={note.isFavorite ? 'Quitar favorito' : 'Agregar a favoritos'}
                                            >
                                                {note.isFavorite ? '⭐' : '☆'}
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => { setEditingNote(note); setModalOpen(true); }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="action-btn complete"
                                                onClick={() => handleToggleComplete(note)}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => setDeleteDialog({ open: true, id: note.id })}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Completed Column */}
                    <div className="column completed-column">
                        <div className="column-header">
                            <h2>✅ Notas Completadas</h2>
                            <span className="column-count">{filteredCompleted.length}</span>
                        </div>

                        <div className="notes-list">
                            {loading ? (
                                <div className="loading-small">Cargando...</div>
                            ) : filteredCompleted.length === 0 ? (
                                <div className="empty-column">
                                    <p>No hay notas completadas</p>
                                </div>
                            ) : (
                                filteredCompleted.map(note => (
                                    <div key={note.id} className={`note-item completed ${note.pinned ? 'pinned' : ''}`}>
                                        <div className="completed-check">✓</div>
                                        <div className="note-item-content">
                                            <h4>{note.title || 'Sin título'}</h4>
                                            {note.tags && note.tags.length > 0 && (
                                                <div className="note-tags">
                                                    {note.tags.map(tag => (
                                                        <span key={tag} className="tag-badge small">#{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="note-item-actions">
                                            <button
                                                className="action-btn undo"
                                                onClick={() => handleToggleComplete(note)}
                                                title="Marcar como pendiente"
                                            >
                                                ↩️
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => setDeleteDialog({ open: true, id: note.id })}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Bar */}
            <footer className="bottom-bar">
                <div className="bottom-stats">
                    <span className="stat">📋 Total: {notes.length}</span>
                    <span className="stat pending">⏳ Pendientes: {pendingNotes.length}</span>
                    <span className="stat completed">✅ Completadas: {completedNotes.length}</span>
                    <span className="stat favorites">⭐ Favoritas: {notes.filter(n => n.isFavorite).length}</span>
                </div>
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar nota..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </footer>

            {/* Note Modal */}
            <NoteModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingNote(null); }}
                onSave={handleSave}
                initialTitle={editingNote?.title || ''}
                initialContent={editingNote?.content || ''}
                initialCompleted={editingNote?.completed || false}
                initialStartDate={editingNote?.startDate}
                initialDueDate={editingNote?.dueDate}
                initialTags={editingNote?.tags || []}
                initialPinned={editingNote?.pinned || false}
                initialFavorite={editingNote?.isFavorite || false}
                initialPriority={editingNote?.priority || 'media'}
                mode={editingNote ? 'edit' : 'create'}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false })}
                onConfirm={handleDelete}
                title="¿Eliminar nota?"
                message="Esta acción no se puede deshacer."
            />


        </div>
    )
}
