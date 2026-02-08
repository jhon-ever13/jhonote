import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { auth } from '../firebase'

interface User {
    id: string
    email: string
    name: string | null
    photoURL?: string | null
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    register: (email: string, password: string, name?: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const googleProvider = new GoogleAuthProvider()

function mapFirebaseUser(fbUser: FirebaseUser): User {
    return {
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName,
        photoURL: fbUser.photoURL
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
            if (fbUser) {
                setUser(mapFirebaseUser(fbUser))
            } else {
                setUser(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const login = async (email: string, password: string) => {
        const result = await signInWithEmailAndPassword(auth, email, password)
        setUser(mapFirebaseUser(result.user))
    }

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider)
        setUser(mapFirebaseUser(result.user))
    }

    const register = async (email: string, password: string, name?: string) => {
        const result = await createUserWithEmailAndPassword(auth, email, password)

        if (name) {
            await updateProfile(result.user, { displayName: name })
        }

        setUser({
            id: result.user.uid,
            email: result.user.email || '',
            name: name || null
        })
    }

    const logout = async () => {
        await signOut(auth)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
