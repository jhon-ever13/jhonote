import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FirebaseError } from 'firebase/app'

function getErrorMessage(error: unknown): string {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Email inválido'
            case 'auth/user-disabled':
                return 'Usuario deshabilitado'
            case 'auth/user-not-found':
                return 'Usuario no encontrado'
            case 'auth/wrong-password':
                return 'Contraseña incorrecta'
            case 'auth/invalid-credential':
                return 'Credenciales inválidas'
            case 'auth/popup-closed-by-user':
                return 'Inicio de sesión cancelado'
            default:
                return 'Error al iniciar sesión'
        }
    }
    return 'Error al iniciar sesión'
}

export default function Login() {
    const { login, loginWithGoogle } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setError('')
        setLoading(true)

        try {
            await loginWithGoogle()
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <div className="auth-logo">
                    <img src="/logo.png" alt="JHONOTE" className="auth-logo-img" />
                    <h1>JHONOTE</h1>
                </div>
                <p>Inicia sesión para continuar</p>

                {error && <div className="error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>o continúa con</span>
                </div>

                <button
                    type="button"
                    className="btn btn-google"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <svg className="google-icon" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continuar con Google
                </button>

                <p style={{ marginTop: '20px' }}>
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="link">Regístrate</Link>
                </p>
            </div>
        </div>
    )
}
