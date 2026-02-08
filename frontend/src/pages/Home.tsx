import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notesService } from '../services/notes'
import type { Note } from '../services/notes'
import Navbar from '../components/Navbar'

interface Stats {
    total: number
    completed: number
    pending: number
    dueSoon: number
    trashed?: number
}

interface DayData {
    day: string
    total: number
    pending: number
    completed: number
}

export default function Home() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0, dueSoon: 0 })
    const [recentNotes, setRecentNotes] = useState<Note[]>([])
    const [allNotes, setAllNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [animatedProgress, setAnimatedProgress] = useState(0)
    const [chartData, setChartData] = useState<DayData[]>([])

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    // Calculate notes by day of week for chart
    const calculateChartData = (notes: Note[]) => {
        const days = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']
        const today = new Date()
        const dayData: DayData[] = []

        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(today.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            const dayName = days[date.getDay()]

            const notesForDay = notes.filter(note => {
                const createdDate = note.createdAt?.toDate?.()?.toISOString().split('T')[0] || ''
                return createdDate === dateStr
            })

            dayData.push({
                day: dayName,
                total: notesForDay.length,
                pending: notesForDay.filter(n => !n.completed).length,
                completed: notesForDay.filter(n => n.completed).length
            })
        }
        return dayData
    }

    useEffect(() => {
        if (!user) return

        const loadData = async () => {
            try {
                const [statsData, notes] = await Promise.all([
                    notesService.getStats(user.id),
                    notesService.getAll(user.id)
                ])
                setStats(statsData)
                setAllNotes(notes)
                setRecentNotes(notes.slice(0, 3))
                setChartData(calculateChartData(notes))

                // Animate progress circle
                const targetProgress = statsData.total > 0
                    ? Math.round((statsData.completed / statsData.total) * 100)
                    : 0

                // Start animation from 0
                let current = 0
                const increment = targetProgress / 30 // 30 frames
                const interval = setInterval(() => {
                    current += increment
                    if (current >= targetProgress) {
                        setAnimatedProgress(targetProgress)
                        clearInterval(interval)
                    } else {
                        setAnimatedProgress(Math.round(current))
                    }
                }, 30)
            } catch (error) {
                console.error('Error loading dashboard:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user])

    // Calculate line chart points from real data
    const getLinePoints = (type: 'total' | 'pending' | 'completed') => {
        if (chartData.length === 0) return '20,50 60,50 100,50 140,50 180,50 220,50 260,50'

        const maxValue = Math.max(
            ...chartData.map(d => Math.max(d.total, d.pending, d.completed)),
            1
        )

        const xPositions = [20, 60, 100, 140, 180, 220, 260]
        const points = chartData.map((data, i) => {
            const value = data[type]
            // Invert Y (SVG 0 is top) and scale to range 15-85
            const y = 85 - ((value / maxValue) * 70)
            return `${xPositions[i]},${y}`
        })

        return points.join(' ')
    }

    // Calendar functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDayOfMonth = new Date(year, month, 1).getDay()
        return { daysInMonth, firstDayOfMonth }
    }

    const getNotesForDate = (dateStr: string) => {
        return allNotes.filter(note => note.dueDate === dateStr || note.startDate === dateStr)
    }

    const formatDateStr = (day: number) => {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const dayStr = String(day).padStart(2, '0')
        return `${year}-${month}-${dayStr}`
    }

    const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate)
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const dayNames = ['Dom', 'Lun', 'Mor', 'Mié', 'Jue', 'Vie', 'Sob']

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
        setSelectedDate(null)
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
        setSelectedDate(null)
    }

    const pinnedNotes = allNotes.filter(n => n.pinned)
    const notesForSelectedDate = selectedDate ? getNotesForDate(selectedDate) : []
    const favoritesCount = allNotes.filter(n => n.isFavorite).length

    // Calculate dash values for animated circle
    const circumference = 251 // 2 * PI * 40
    const dashOffset = circumference - (animatedProgress / 100) * circumference

    return (
        <div className="app-layout">
            {/* Shared Navbar */}
            <Navbar
                notesCount={stats.total}
                completedCount={stats.completed}
                pendingCount={stats.pending}
                favoritesCount={favoritesCount}
            />

            {/* Main Content */}
            <main className="main-content dashboard-bg">
                <div className="dashboard-container">
                    {/* Welcome Header */}
                    <header className="dashboard-header">
                        <div>
                            <h1>👋 Bienvenido, {user?.name || user?.email.split('@')[0]}!</h1>
                            <p>Aquí está el resumen de tus notas</p>
                        </div>
                        <button
                            className="btn btn-primary btn-new-note"
                            onClick={() => navigate('/notas?new=true')}
                        >
                            + Nueva Nota
                        </button>
                    </header>

                    {loading ? (
                        <div className="card">
                            <div className="loading">Cargando...</div>
                        </div>
                    ) : (
                        <div className="dashboard-grid-v2">
                            {/* ===== LEFT COLUMN ===== */}
                            <div className="dashboard-left-v2">
                                {/* Statistics Section Title */}
                                <h3 className="section-title-v2">📊 Estadísticas de Notas</h3>

                                {/* Stats Cards Row */}
                                <div className="stats-cards-row">
                                    <div className="stat-card-v2 stat-total-v2">
                                        <div className="stat-icon-v2 icon-blue">
                                            <span>📋</span>
                                        </div>
                                        <div className="stat-data">
                                            <span className="stat-number-v2">{stats.total}</span>
                                            <span className="stat-label-v2">Total Notas</span>
                                        </div>
                                    </div>

                                    <div className="stat-card-v2 stat-pending-v2">
                                        <div className="stat-icon-v2 icon-yellow">
                                            <span>⏳</span>
                                        </div>
                                        <div className="stat-data">
                                            <span className="stat-number-v2">{stats.pending}</span>
                                            <span className="stat-label-v2">Pendientes</span>
                                        </div>
                                    </div>

                                    <div className="stat-card-v2 stat-completed-v2">
                                        <div className="stat-icon-v2 icon-green">
                                            <span>✅</span>
                                        </div>
                                        <div className="stat-data">
                                            <span className="stat-number-v2">{stats.completed}</span>
                                            <span className="stat-label-v2">Completadas</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Due Soon Card - Full Width */}
                                <div className="stat-card-v2 stat-due-v2 full-width">
                                    <div className="stat-icon-v2 icon-red">
                                        <span>🔥</span>
                                    </div>
                                    <div className="stat-data">
                                        <span className="stat-number-v2">{stats.dueSoon}</span>
                                        <span className="stat-label-v2">Por Vencer</span>
                                    </div>
                                </div>

                                {/* Tu Progreso Section */}
                                <div className="progress-section-v2">
                                    <div className="progress-left">
                                        <h4>🎯 Tu Progreso</h4>
                                        <div className="progress-circle-container">
                                            <svg className="progress-circle" viewBox="0 0 100 100">
                                                <circle
                                                    className="progress-bg-circle"
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    fill="none"
                                                    strokeWidth="8"
                                                />
                                                <circle
                                                    className="progress-fill-circle animated"
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    fill="none"
                                                    strokeWidth="8"
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={dashOffset}
                                                    strokeLinecap="round"
                                                    transform="rotate(-90 50 50)"
                                                />
                                            </svg>
                                            <div className="progress-text">
                                                <span className="progress-percentage">
                                                    {animatedProgress}%
                                                </span>
                                                <span className="progress-sub">COMPLETADO</span>
                                            </div>
                                        </div>
                                        <p className="progress-info">{stats.completed} de {stats.total} notas completadas</p>
                                    </div>

                                    <div className="progress-right">
                                        {/* Legend */}
                                        <div className="chart-legend-v2">
                                            <span className="legend-dot blue"></span> Total
                                            <span className="legend-dot orange"></span> Pendientes
                                            <span className="legend-dot green"></span> Completadas
                                        </div>

                                        {/* Simple Line Chart with Real Data */}
                                        <div className="mini-line-chart">
                                            <svg viewBox="0 0 280 100" className="line-chart-svg-v2">
                                                {/* Grid lines */}
                                                <line x1="0" y1="25" x2="280" y2="25" stroke="#E5E7EB" strokeWidth="1" />
                                                <line x1="0" y1="50" x2="280" y2="50" stroke="#E5E7EB" strokeWidth="1" />
                                                <line x1="0" y1="75" x2="280" y2="75" stroke="#E5E7EB" strokeWidth="1" />

                                                {/* Total line (blue) */}
                                                <polyline
                                                    className="chart-line-animated"
                                                    fill="none"
                                                    stroke="#3B82F6"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    points={getLinePoints('total')}
                                                />

                                                {/* Pending line (orange) */}
                                                <polyline
                                                    className="chart-line-animated"
                                                    fill="none"
                                                    stroke="#F97316"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    points={getLinePoints('pending')}
                                                />

                                                {/* Completed line (green) */}
                                                <polyline
                                                    className="chart-line-animated"
                                                    fill="none"
                                                    stroke="#10B981"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    points={getLinePoints('completed')}
                                                />

                                                {/* X-axis labels - dynamic from chartData */}
                                                {chartData.map((data, i) => (
                                                    <text
                                                        key={i}
                                                        x={20 + i * 40}
                                                        y="98"
                                                        fontSize="9"
                                                        fill="#9CA3AF"
                                                    >
                                                        {data.day}
                                                    </text>
                                                ))}
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Pinned Notes Section */}
                                <div className="pinned-section-v2">
                                    <h4>📌 Notas Fijadas</h4>
                                    {pinnedNotes.length === 0 ? (
                                        <p className="empty-text">No hay notas fijadas</p>
                                    ) : (
                                        <div className="pinned-list-v2">
                                            {pinnedNotes.slice(0, 3).map(note => (
                                                <div
                                                    key={note.id}
                                                    className="pinned-item-v2"
                                                    onClick={() => navigate('/notas')}
                                                >
                                                    <div className="pinned-checkbox">
                                                        {note.completed ? '✅' : '⬜'}
                                                    </div>
                                                    <div className="pinned-info">
                                                        <span className="pinned-title">{note.title || 'Sin título'}</span>
                                                        {note.startDate && (
                                                            <span className="pinned-date">{note.startDate}</span>
                                                        )}
                                                    </div>
                                                    {note.dueDate && (
                                                        <span className="pinned-due-badge">🎯 {note.dueDate}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ===== RIGHT COLUMN ===== */}
                            <div className="dashboard-right-v2">
                                {/* Calendar */}
                                <div className="calendar-card-v2">
                                    <div className="calendar-header-v2">
                                        <button className="calendar-nav-v2" onClick={prevMonth}>◀</button>
                                        <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                                        <button className="calendar-nav-v2" onClick={nextMonth}>▶</button>
                                    </div>

                                    <div className="calendar-grid-v2">
                                        {dayNames.map(day => (
                                            <div key={day} className="calendar-day-name-v2">{day}</div>
                                        ))}

                                        {Array(firstDayOfMonth).fill(null).map((_, i) => (
                                            <div key={`empty-${i}`} className="calendar-day-v2 empty"></div>
                                        ))}

                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                            const dateStr = formatDateStr(day)
                                            const notesCount = getNotesForDate(dateStr).length
                                            const isToday = new Date().toISOString().split('T')[0] === dateStr
                                            const isSelected = selectedDate === dateStr

                                            return (
                                                <div
                                                    key={day}
                                                    className={`calendar-day-v2 
                                                        ${isToday ? 'today' : ''} 
                                                        ${isSelected ? 'selected' : ''}
                                                        ${notesCount > 0 ? 'has-notes' : ''}`}
                                                    onClick={() => setSelectedDate(dateStr)}
                                                >
                                                    <span>{day}</span>
                                                    {notesCount > 0 && (
                                                        <span className="note-indicator-v2">{notesCount}</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Notes for selected date */}
                                    {selectedDate && notesForSelectedDate.length > 0 && (
                                        <div className="calendar-notes-v2">
                                            <h4>📅 {selectedDate}</h4>
                                            {notesForSelectedDate.map(note => (
                                                <div key={note.id} className="calendar-note-item">
                                                    <span>{note.completed ? '✅' : '📝'}</span>
                                                    <span>{note.title || 'Sin título'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="quick-actions-v2">
                                    <h4>🚀 Acciones Rápidas</h4>
                                    <button
                                        className="btn-action-primary"
                                        onClick={() => navigate('/notas')}
                                    >
                                        📝 Ver Todas las Notas
                                    </button>
                                    <button
                                        className="btn-action-secondary"
                                        onClick={() => navigate('/notas?new=true')}
                                    >
                                        + Crear Nueva Nota
                                    </button>
                                </div>

                                {/* Recent Notes */}
                                <div className="recent-notes-v2">
                                    <div className="recent-header">
                                        <h4>📝 Notas Recientes</h4>
                                        <button className="btn-link-v2" onClick={() => navigate('/notas')}>
                                            Ver todas →
                                        </button>
                                    </div>
                                    {recentNotes.length === 0 ? (
                                        <p className="empty-text">No hay notas aún</p>
                                    ) : (
                                        <div className="recent-list-v2">
                                            {recentNotes.map(note => (
                                                <div
                                                    key={note.id}
                                                    className="recent-item-v2"
                                                    onClick={() => navigate('/notas')}
                                                >
                                                    <div className="recent-checkbox">
                                                        {note.completed ? '✅' : '⬜'}
                                                    </div>
                                                    <div className="recent-info">
                                                        <span className="recent-title">{note.title || 'Sin título'}</span>
                                                        {note.startDate && (
                                                            <span className="recent-date">{note.startDate}</span>
                                                        )}
                                                    </div>
                                                    {note.dueDate && (
                                                        <span className="recent-due-badge">📅 {note.dueDate}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
