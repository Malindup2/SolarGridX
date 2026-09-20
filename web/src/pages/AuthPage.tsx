import { useState, useId, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import type { ApiErrorResponse } from '../types/auth'
import herovideo from '../assets/herovideo.mp4'

interface AuthPageProps {
  initialTab?: 'login' | 'register'
}

export default function AuthPage({ initialTab = 'login' }: AuthPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  // Tab: 'login' | 'register'
  const isRegisterParam = searchParams.get('mode') === 'register' || initialTab === 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(isRegisterParam ? 'register' : 'login')

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Login Form states
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Registration Form states
  const [regNic, setRegNic] = useState('')
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)

  const nicInputId = useId()
  const fullNameInputId = useId()
  const emailInputId = useId()
  const phoneInputId = useId()
  const addressInputId = useId()
  const passwordInputId = useId()
  const confirmPasswordInputId = useId()

  const handleTabSwitch = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setSearchParams(tab === 'register' ? { mode: 'register' } : {})
  }

  // Validate Sri Lankan NIC (old: 9 digits + V/X, new: 12 digits)
  const validateNic = (nic: string) => /^([0-9]{9}[vVxX]|[0-9]{12})$/.test(nic.trim())

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!loginEmail.trim() || !password) {
      toast.error('Please enter both your email and password.')
      return
    }

    setIsLoading(true)
    try {
      const data = await authService.login({
        email: loginEmail.trim(),
        password,
      })

      login({
        token: data.token,
        role: data.role,
        nic: data.nic,
        displayName: data.displayName,
        homeRoute: data.homeRoute,
        status: data.status,
      })

      toast.success(`Welcome back, ${data.displayName}!`)
      navigate(data.homeRoute || '/')
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        const resp = err.response?.data
        if (resp?.code === 'INVALID_CREDENTIALS') {
          toast.error('Invalid email or password. Please verify your credentials.')
        } else if (resp?.details && resp.details.length > 0) {
          resp.details.forEach((d) => toast.error(d))
        } else {
          toast.error(resp?.message || 'Authentication failed. Please check your credentials.')
        }
      } else {
        toast.error('An unexpected error occurred during authentication.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const errors: string[] = []
    if (!validateNic(regNic)) {
      errors.push('NIC must be in a valid format (9 digits + V/X or 12 digits).')
    }
    if (!regFullName.trim()) {
      errors.push('Full Name is required.')
    }
    if (!regEmail.trim()) {
      errors.push('Email is required.')
    }
    if (regPassword.length < 8) {
      errors.push('Password must be at least 8 characters long.')
    }
    if (regPassword !== regConfirmPassword) {
      errors.push('Passwords do not match.')
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err))
      return
    }

    setIsLoading(true)
    try {
      await authService.register({
        nic: regNic.toUpperCase(),
        fullName: regFullName,
        email: regEmail,
        phone: regPhone || null,
        address: regAddress || null,
        password: regPassword,
      })

      toast.success('Registration submitted successfully!')

      setRegNic('')
      setRegFullName('')
      setRegEmail('')
      setRegPhone('')
      setRegAddress('')
      setRegPassword('')
      setRegConfirmPassword('')

      setTimeout(() => {
        setActiveTab('login')
      }, 1500)
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        const resp = err.response?.data
        if (resp?.code === 'NIC_ALREADY_REGISTERED') {
          toast.error('This NIC is already registered in the system. Please sign in instead.')
        } else if (resp?.code === 'EMAIL_ALREADY_REGISTERED') {
          toast.error('This email is already registered. Please sign in instead.')
        } else if (resp?.details && resp.details.length > 0) {
          resp.details.forEach((d) => toast.error(d))
        } else {
          toast.error(resp?.message || 'Registration failed. Please verify your inputs.')
        }
      } else {
        toast.error('Registration request failed. Please verify your connection.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] overflow-hidden">
        
        {/* Left Column: Brand & Hero Showcase */}
        <div className="lg:col-span-5 bg-black p-8 sm:p-10 text-white flex flex-col justify-center relative overflow-hidden">
          {/* Background Video with Dark Mid-Fade */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-65"
            src={herovideo}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/75 pointer-events-none" />

          {/* Top Title Showcase (No logo as requested) */}
          <div className="relative z-10 space-y-4">
            <div className="mb-4">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight flex items-center">
                <span className="text-[#49b02d]">SolarGrid</span>
                <span className="text-black bg-white px-2 py-0.5 rounded-lg ml-1.5 font-black inline-block text-lg shadow">X</span>
              </h1>
            </div>

            <h2 className="text-2xl font-bold leading-snug text-white">
              {activeTab === 'login' ? 'Microgrid Command & Operations' : 'Register as Solar Prosumer'}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {activeTab === 'login'
                ? 'Authorized access point for Backoffice Administrators and Grid Operations personnel.'
                : 'Connect your rooftop solar system to trade clean energy peer-to-peer at fair local tariffs.'}
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Forms */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-[var(--color-surface)]">
          {/* Mobile Brand Header (No logo as requested) */}
          <div className="lg:hidden mb-6 pb-4 border-b border-[var(--color-border)]">
            <span className="text-xl font-black text-[var(--color-ink)] flex items-center">
              <span className="text-[#49b02d]">SolarGrid</span>
              <span className="text-black ml-0.5">X</span>
            </span>
          </div>

          {/* Segmented Switch: Login vs Sign Up with Framer Motion layoutId pill */}
          <div className="relative p-1 mb-6 rounded-[var(--radius-md)] bg-[var(--color-background)] border border-[var(--color-border)] grid grid-cols-2">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`relative py-2 text-button rounded-[var(--radius-sm)] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                activeTab === 'login'
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {activeTab === 'login' && (
                <motion.div
                  layoutId="authTabPill"
                  className="absolute inset-0 bg-[var(--color-surface)] rounded-[var(--radius-sm)] shadow-[var(--shadow-card)] -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`relative py-2 text-button rounded-[var(--radius-sm)] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                activeTab === 'register'
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {activeTab === 'register' && (
                <motion.div
                  layoutId="authTabPill"
                  className="absolute inset-0 bg-[var(--color-surface)] rounded-[var(--radius-sm)] shadow-[var(--shadow-card)] -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Sign Up
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-ink)]">
              {activeTab === 'login' ? 'Sign In to Your Account' : 'Create Prosumer Account'}
            </h2>
          </div>

          {/* Form container with AnimatePresence for smooth slide/fade between Login and Register */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              /* ================= LOGIN FORM ================= */
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-button font-medium text-[var(--color-ink)] mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-body rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-[var(--color-surface)]"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1">
                    Enter the email address registered to your account.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-button font-medium text-[var(--color-ink)]">
                      Password
                    </label>
                    <a
                      href="#support"
                      onClick={(e) => {
                        e.preventDefault()
                        alert('For credential reset or account recovery, please contact the Backoffice Operations Desk.')
                      }}
                      className="text-caption font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Need Help?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 text-body rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-[var(--color-surface)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-[var(--radius-md)] text-button font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all duration-150 shadow-[var(--shadow-card)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In to Microgrid System
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              /* ================= SIGN UP (PROSUMER) FORM ================= */
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-3.5"
              >

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* NIC */}
                  <div>
                    <label htmlFor={nicInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      National ID (NIC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={nicInputId}
                      type="text"
                      required
                      value={regNic}
                      onChange={(e) => setRegNic(e.target.value.toUpperCase())}
                      placeholder="e.g. 199812345678 or 981234567V"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label htmlFor={fullNameInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={fullNameInputId}
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Priyantha Silva"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor={emailInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={emailInputId}
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor={phoneInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Phone Number
                    </label>
                    <input
                      id={phoneInputId}
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Service Address */}
                <div>
                  <label htmlFor={addressInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                    Grid Premises / Service Address
                  </label>
                  <input
                    id={addressInputId}
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. No 15, Station Road, Galle"
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={passwordInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Password (min. 8) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id={passwordInputId}
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-8 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showRegPassword ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={confirmPasswordInputId} className="block text-caption font-semibold text-[var(--color-ink)] mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={confirmPasswordInputId}
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-[var(--radius-md)] text-button font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all duration-150 shadow-[var(--shadow-card)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Registration...
                    </>
                  ) : (
                    <>
                      Complete Prosumer Registration
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  )
}
