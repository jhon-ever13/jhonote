import { useState, useEffect } from 'react'
import type { Priority } from '../services/notes'

interface NoteModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (
        title: string,
        content: string,
        completed: boolean,
        startDate: string | null,
        dueDate: string | null,
        tags: string[],
        pinned: boolean,
        isFavorite: boolean,
        priority: Priority
    ) => void
    initialTitle?: string
    initialContent?: string
    initialCompleted?: boolean
    initialStartDate?: string | null
    initialDueDate?: string | null
    initialTags?: string[]
    initialPinned?: boolean
    initialFavorite?: boolean
    initialPriority?: Priority
    mode: 'create' | 'edit'
}

const TAG_SUGGESTIONS = ['clase', 'ideas', 'personal', 'urgente', 'proyecto']

export default function NoteModal({
    isOpen,
    onClose,
    onSave,
    initialTitle = '',
    initialContent = '',
    initialCompleted = false,
    initialStartDate = null,
    initialDueDate = null,
    initialTags = [],
    initialPinned = false,
    initialFavorite = false,
    initialPriority = 'media',
    mode
}: NoteModalProps) {
    const [title, setTitle] = useState(initialTitle)
    const [content, setContent] = useState(initialContent)
    const [completed, setCompleted] = useState(initialCompleted)
    const [startDate, setStartDate] = useState(initialStartDate || '')
    const [dueDate, setDueDate] = useState(initialDueDate || '')
    const [tags, setTags] = useState<string[]>(initialTags)
    const [tagInput, setTagInput] = useState('')
    const [pinned, setPinned] = useState(initialPinned)
    const [isFavorite, setIsFavorite] = useState(initialFavorite)
    const [priority, setPriority] = useState<Priority>(initialPriority)
    const [loading, setLoading] = useState(false)
    const [showTagSuggestions, setShowTagSuggestions] = useState(false)

    useEffect(() => {
        setTitle(initialTitle)
        setContent(initialContent)
        setCompleted(initialCompleted)
        setStartDate(initialStartDate || '')
        setDueDate(initialDueDate || '')
        setTags(initialTags || [])
        setPinned(initialPinned)
        setIsFavorite(initialFavorite)
        setPriority(initialPriority || 'media')
    }, [initialTitle, initialContent, initialCompleted, initialStartDate, initialDueDate, initialTags, initialPinned, initialFavorite, initialPriority, isOpen])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        setLoading(true)
        await onSave(
            title,
            content,
            completed,
            startDate || null,
            dueDate || null,
            tags,
            pinned,
            isFavorite,
            priority
        )
        setLoading(false)
    }

    const addTag = (tag: string) => {
        const cleanTag = tag.replace(/^#/, '').toLowerCase().trim()
        if (cleanTag && !tags.includes(cleanTag)) {
            setTags([...tags, cleanTag])
        }
        setTagInput('')
        setShowTagSuggestions(false)
    }

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove))
    }

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            if (tagInput.trim()) {
                addTag(tagInput)
            }
        }
    }

    const filteredSuggestions = TAG_SUGGESTIONS.filter(
        s => s.includes(tagInput.toLowerCase()) && !tags.includes(s)
    )

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'create' ? '📝 Nueva Nota' : '✏️ Editar Nota'}</h2>
                    <div className="modal-header-actions">
                        <button
                            type="button"
                            className={`icon-btn ${pinned ? 'active' : ''}`}
                            onClick={() => setPinned(!pinned)}
                            title={pinned ? 'Desfijar nota' : 'Fijar nota arriba'}
                        >
                            📌
                        </button>
                        <button
                            type="button"
                            className={`icon-btn favorite ${isFavorite ? 'active' : ''}`}
                            onClick={() => setIsFavorite(!isFavorite)}
                            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                            {isFavorite ? '⭐' : '☆'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Título (requerido)</label>
                        <input
                            type="text"
                            className="input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título de la nota..."
                            autoFocus
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Contenido (opcional) </label>
                        <textarea
                            className="input"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Escribe tu nota aquí..."
                            rows={4}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {/* Priority Selector */}
                    <div className="input-group">
                        <label>🎯 Prioridad</label>
                        <div className="priority-selector">
                            <button
                                type="button"
                                className={`priority-btn priority-alta ${priority === 'alta' ? 'active' : ''}`}
                                onClick={() => setPriority('alta')}
                            >
                                🔴 Alta
                            </button>
                            <button
                                type="button"
                                className={`priority-btn priority-media ${priority === 'media' ? 'active' : ''}`}
                                onClick={() => setPriority('media')}
                            >
                                🟡 Media
                            </button>
                            <button
                                type="button"
                                className={`priority-btn priority-baja ${priority === 'baja' ? 'active' : ''}`}
                                onClick={() => setPriority('baja')}
                            >
                                🟢 Baja
                            </button>
                        </div>
                    </div>

                    {/* Tags Input */}
                    <div className="input-group">
                        <label>🏷️ Etiquetas</label>
                        <div className="tags-container">
                            {tags.map(tag => (
                                <span key={tag} className="tag-badge">
                                    #{tag}
                                    <button type="button" onClick={() => removeTag(tag)}>×</button>
                                </span>
                            ))}
                            <div className="tag-input-wrapper">
                                <input
                                    type="text"
                                    className="tag-input"
                                    value={tagInput}
                                    onChange={(e) => {
                                        setTagInput(e.target.value)
                                        setShowTagSuggestions(true)
                                    }}
                                    onKeyDown={handleTagKeyDown}
                                    onFocus={() => setShowTagSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                    placeholder="Agregar etiqueta..."
                                />
                                {showTagSuggestions && filteredSuggestions.length > 0 && (
                                    <div className="tag-suggestions">
                                        {filteredSuggestions.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => addTag(s)}
                                            >
                                                #{s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="date-inputs">
                        <div className="input-group">
                            <label>📅 Fecha inicio</label>
                            <input
                                type="date"
                                className="input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>🎯 Fecha límite</label>
                            <input
                                type="date"
                                className="input"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {mode === 'edit' && (
                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={completed}
                                    onChange={(e) => setCompleted(e.target.checked)}
                                />
                                <span>Marcar como completada</span>
                            </label>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : mode === 'create' ? 'Crear Nota' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
