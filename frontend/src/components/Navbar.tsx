import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import UserProfileModal from './UserProfileModal'

interface NavbarProps {
    notesCount?: number
    completedCount?: number
    pendingCount?: number
    favoritesCount?: number
}

export default function Navbar({
    notesCount = 0,
    completedCount = 0,
    pendingCount = 0,
    favoritesCount = 0
}: NavbarProps) {
    const { user, logout } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const location = useLocation()
    const [showProfile, setShowProfile] = useState(false)
    const [profileModalOpen, setProfileModalOpen] = useState(false)

    const handleLogout = async () => {
        try {
            await logout()
            showToast('👋 Sesión cerrada correctamente')
        } catch (error) {
            showToast('Error al cerrar sesión', 'error')
        }
    }

    const isActive = (path: string) => location.pathname === path

    return (
        <>
            <nav className="top-nav">
                <div className="nav-brand" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="JHONOTE" className="brand-logo" />
                    <span className="brand-text">JHONOTE</span>
                </div>

                <div className="nav-center">
                    <button
                        className={`nav-link ${isActive('/') ? 'active' : ''}`}
                        onClick={() => navigate('/')}
                    >
                        🏠 Dashboard
                    </button>
                    <button
                        className={`nav-link ${isActive('/notas') ? 'active' : ''}`}
                        onClick={() => navigate('/notas')}
                    >
                        📋 Mis Notas
                    </button>
                    <button
                        className={`nav-link ${isActive('/papelera') ? 'active' : ''}`}
                        onClick={() => navigate('/papelera')}
                    >
                        🗑️ Papelera
                    </button>
                </div>

                <div className="nav-profile">
                    <button
                        className="profile-trigger"
                        onClick={() => setShowProfile(!showProfile)}
                    >
                        <div className="profile-avatar">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" />
                            ) : (
                                <span>{user?.name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <span className="profile-name">{user?.name || 'Usuario'}</span>
                        <span className="profile-arrow">▼</span>
                    </button>

                    {showProfile && (
                        <div className="profile-menu">
                            <div className="profile-menu-header">
                                <div className="profile-menu-avatar">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Avatar" />
                                    ) : (
                                        <span>{user?.name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="profile-menu-info">
                                    <span className="profile-menu-name">{user?.name || 'Usuario'}</span>
                                    <span className="profile-menu-email">{user?.email}</span>
                                </div>
                            </div>
                            <div className="profile-menu-divider"></div>
                            <button
                                className="profile-menu-item"
                                onClick={() => { setShowProfile(false); setProfileModalOpen(true); }}
                            >
                                👤 Ver Perfil Completo
                            </button>
                            <button className="profile-menu-item logout" onClick={handleLogout}>
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Profile Modal - accessible from all pages */}
            <UserProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                notesCount={notesCount}
                completedCount={completedCount}
                pendingCount={pendingCount}
                favoritesCount={favoritesCount}
            />
        </>
    )
}
