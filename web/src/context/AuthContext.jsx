import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    const nic = localStorage.getItem('nic')
    return token ? { token, role, nic } : null
  })

  const login = ({ token, role, nic }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    if (nic) localStorage.setItem('nic', nic)
    setAuth({ token, role, nic })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('nic')
    setAuth(null)
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
