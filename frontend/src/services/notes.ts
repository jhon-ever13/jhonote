import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export type Priority = 'alta' | 'media' | 'baja'

export interface Note {
    id: string
    userId: string
    title: string | null
    content: string
    completed: boolean
    startDate: string | null
    dueDate: string | null
    tags: string[]
    pinned: boolean
    isFavorite: boolean
    priority: Priority
    createdAt: Timestamp
    updatedAt: Timestamp
    deletedAt?: Timestamp | null  // Soft delete field
}

const COLLECTION = 'notas'

export const notesService = {
    // Obtener todas las notas activas del usuario (excluyendo eliminadas)
    async getAll(userId: string, search?: string): Promise<Note[]> {
        const notesRef = collection(db, COLLECTION)
        const q = query(
            notesRef,
            where('userId', '==', userId)
        )

        const snapshot = await getDocs(q)
        let notes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Note[]

        // Filtrar notas eliminadas (soft delete)
        notes = notes.filter(n => !n.deletedAt)

        // Ordenar: pinned primero, luego por fecha
        notes.sort((a, b) => {
            // Primero por pinned
            if (a.pinned && !b.pinned) return -1
            if (!a.pinned && b.pinned) return 1
            // Luego por fecha
            const dateA = a.updatedAt?.toMillis() || 0
            const dateB = b.updatedAt?.toMillis() || 0
            return dateB - dateA
        })

        // Filtrar por búsqueda si existe
        if (search) {
            const searchLower = search.toLowerCase()
            notes = notes.filter(note =>
                note.title?.toLowerCase().includes(searchLower) ||
                note.content.toLowerCase().includes(searchLower)
            )
        }

        return notes
    },

    // Obtener notas en la papelera
    async getTrash(userId: string): Promise<Note[]> {
        const notesRef = collection(db, COLLECTION)
        const q = query(
            notesRef,
            where('userId', '==', userId)
        )

        const snapshot = await getDocs(q)
        let notes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Note[]

        // Solo notas eliminadas
        notes = notes.filter(n => n.deletedAt)

        // Ordenar por fecha de eliminación (más recientes primero)
        notes.sort((a, b) => {
            const dateA = a.deletedAt?.toMillis() || 0
            const dateB = b.deletedAt?.toMillis() || 0
            return dateB - dateA
        })

        return notes
    },

    // Crear nueva nota
    async create(
        userId: string,
        title: string,
        content: string,
        startDate: string | null = null,
        dueDate: string | null = null,
        tags: string[] = [],
        pinned: boolean = false,
        isFavorite: boolean = false,
        priority: Priority = 'media'
    ): Promise<string> {
        const notesRef = collection(db, COLLECTION)
        const docRef = await addDoc(notesRef, {
            userId,
            title: title || null,
            content,
            completed: false,
            startDate,
            dueDate,
            tags,
            pinned,
            isFavorite,
            priority,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            deletedAt: null
        })
        return docRef.id
    },

    // Actualizar nota
    async update(
        noteId: string,
        title: string,
        content: string,
        completed: boolean = false,
        startDate: string | null = null,
        dueDate: string | null = null,
        tags: string[] = [],
        pinned: boolean = false,
        isFavorite: boolean = false,
        priority: Priority = 'media'
    ): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await updateDoc(noteRef, {
            title: title || null,
            content,
            completed,
            startDate,
            dueDate,
            tags,
            pinned,
            isFavorite,
            priority,
            updatedAt: serverTimestamp()
        })
    },

    // Marcar como completada/pendiente
    async toggleComplete(noteId: string, completed: boolean): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await updateDoc(noteRef, {
            completed,
            updatedAt: serverTimestamp()
        })
    },

    // Fijar/desfijar nota
    async togglePin(noteId: string, pinned: boolean): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await updateDoc(noteRef, {
            pinned,
            updatedAt: serverTimestamp()
        })
    },

    // Marcar/desmarcar favorito
    async toggleFavorite(noteId: string, isFavorite: boolean): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await updateDoc(noteRef, {
            isFavorite,
            updatedAt: serverTimestamp()
        })
    },

    // Mover a papelera (soft delete)
    async delete(noteId: string): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await updateDoc(noteRef, {
            deletedAt: serverTimestamp()
        })
    },

    // Restaurar de la papelera
    async restore(noteId: string): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await updateDoc(noteRef, {
            deletedAt: null,
            updatedAt: serverTimestamp()
        })
    },

    // Eliminar permanentemente
    async permanentDelete(noteId: string): Promise<void> {
        const noteRef = doc(db, COLLECTION, noteId)
        await deleteDoc(noteRef)
    },

    // Vaciar papelera (eliminar todas las notas borradas)
    async emptyTrash(userId: string): Promise<void> {
        const trashNotes = await this.getTrash(userId)
        const deletePromises = trashNotes.map(note => this.permanentDelete(note.id))
        await Promise.all(deletePromises)
    },

    // Eliminar todas las notas del usuario
    async deleteAll(userId: string): Promise<void> {
        const notesRef = collection(db, COLLECTION)
        const q = query(notesRef, where('userId', '==', userId))
        const snapshot = await getDocs(q)

        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
    },

    // Obtener estadísticas
    async getStats(userId: string): Promise<{
        total: number
        completed: number
        pending: number
        dueSoon: number
        trashed: number
    }> {
        const notes = await this.getAll(userId)
        const trashNotes = await this.getTrash(userId)
        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

        return {
            total: notes.length,
            completed: notes.filter(n => n.completed).length,
            pending: notes.filter(n => !n.completed).length,
            dueSoon: notes.filter(n => {
                if (!n.dueDate || n.completed) return false
                const due = new Date(n.dueDate)
                return due <= threeDaysFromNow && due >= now
            }).length,
            trashed: trashNotes.length
        }
    }
}

