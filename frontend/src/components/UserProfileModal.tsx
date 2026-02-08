import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

interface UserProfileModalProps {
    isOpen: boolean
    onClose: () => void
    notesCount: number
    completedCount: number
    pendingCount: number
    favoritesCount: number
}

export default function UserProfileModal({
    isOpen,
    onClose,
    notesCount,
    completedCount,
    pendingCount,
    favoritesCount
}: UserProfileModalProps) {
    const { user, logout } = useAuth()
    const { showToast } = useToast()
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    if (!isOpen || !user) return null

    const handleLogout = async () => {
        try {
            await logout()
            showToast('👋 Sesión cerrada correctamente')
        } catch (error) {
            showToast('Error al cerrar sesión', 'error')
        }
    }

    const completionRate = notesCount > 0
        ? Math.round((completedCount / notesCount) * 100)
        : 0

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        }
        return email.substring(0, 2).toUpperCase()
    }

    const getMemberSince = () => {
        // Approximation since Firebase doesn't give us account creation in real-time
        return 'Enero 2026'
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                {/* Header with gradient */}
                <div className="profile-modal-header">
                    <button className="profile-close-btn" onClick={onClose}>×</button>

                    {/* Avatar */}
                    <div className="profile-avatar-container">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                {getInitials(user.name, user.email)}
                            </div>
                        )}
                        <span className="profile-status-indicator" title="En línea"></span>
                    </div>

                    {/* User Info */}
                    <h2 className="profile-name">{user.name || 'Usuario'}</h2>
                    <p className="profile-email">{user.email}</p>
                    <span className="profile-badge">📝 Miembro desde {getMemberSince()}</span>
                </div>

                {/* Stats Section */}
                <div className="profile-stats-section">
                    <h3>📊 Tus Estadísticas</h3>
                    <div className="profile-stats-grid">
                        <div className="profile-stat-card">
                            <span className="profile-stat-icon blue">📋</span>
                            <div className="profile-stat-info">
                                <span className="profile-stat-value">{notesCount}</span>
                                <span className="profile-stat-label">Total Notas</span>
                            </div>
                        </div>
                        <div className="profile-stat-card">
                            <span className="profile-stat-icon green">✅</span>
                            <div className="profile-stat-info">
                                <span className="profile-stat-value">{completedCount}</span>
                                <span className="profile-stat-label">Completadas</span>
                            </div>
                        </div>
                        <div className="profile-stat-card">
                            <span className="profile-stat-icon orange">⏳</span>
                            <div className="profile-stat-info">
                                <span className="profile-stat-value">{pendingCount}</span>
                                <span className="profile-stat-label">Pendientes</span>
                            </div>
                        </div>
                        <div className="profile-stat-card">
                            <span className="profile-stat-icon yellow">⭐</span>
                            <div className="profile-stat-info">
                                <span className="profile-stat-value">{favoritesCount}</span>
                                <span className="profile-stat-label">Favoritas</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="profile-progress-section">
                    <div className="profile-progress-header">
                        <span>Tasa de Completado</span>
                        <span className="profile-progress-value">{completionRate}%</span>
                    </div>
                    <div className="profile-progress-bar">
                        <div
                            className="profile-progress-fill"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                    <p className="profile-progress-text">
                        {completionRate >= 80 ? '🎉 ¡Excelente trabajo!' :
                            completionRate >= 50 ? '💪 ¡Vas muy bien!' :
                                completionRate >= 25 ? '📈 ¡Sigue así!' :
                                    '🚀 ¡Comienza a completar notas!'}
                    </p>
                </div>

                {/* Actions */}
                <div className="profile-actions">
                    {!showLogoutConfirm ? (
                        <button
                            className="btn btn-logout"
                            onClick={() => setShowLogoutConfirm(true)}
                        >
                            🚪 Cerrar Sesión
                        </button>
                    ) : (
                        <div className="logout-confirm">
                            <p>¿Seguro que quieres salir?</p>
                            <div className="logout-confirm-btns">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setShowLogoutConfirm(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleLogout}
                                >
                                    Sí, salir
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
