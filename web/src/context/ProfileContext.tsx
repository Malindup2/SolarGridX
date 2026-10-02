/*
 * ProfileContext.tsx
 * The signed-in user's own profile (GET /users/me), shared by the top bar
 * avatar and the Profile page so a new photo shows everywhere at once.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { profileService } from '../services/profileService'
import type { ProfileResponse } from '../types/user'

interface ProfileContextValue {
  profile: ProfileResponse | null
  setProfile: (profile: ProfileResponse) => void
  refresh: () => void
}

const ProfileContext = createContext<ProfileContextValue>({ profile: null, setProfile: () => {}, refresh: () => {} })

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    profileService
      .me(controller.signal)
      .then(setProfile)
      // The shell still works without it: names come from the session, avatars fall back to initials.
      .catch(() => {})
    return () => controller.abort()
  }, [version])

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  return <ProfileContext.Provider value={{ profile, setProfile, refresh }}>{children}</ProfileContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- the hook belongs with its provider
export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext)
}
