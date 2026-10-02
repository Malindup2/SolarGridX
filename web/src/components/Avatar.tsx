/*
 * Avatar.tsx
 * The user's photo, or their initials when there is none. `version` changes
 * whenever the photo does, which refetches it.
 */

import { useEffect, useState } from 'react'
import { initialsOf } from '../lib/initials'
import { profileService } from '../services/profileService'

interface AvatarProps {
  name: string | null | undefined
  /** Profile photo version; null or undefined shows initials without a request. */
  version?: string | null
  size?: number
}

export default function Avatar({ name, version, size = 36 }: AvatarProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!version) return
    const controller = new AbortController()
    let objectUrl: string | null = null

    profileService
      .avatarUrl('me', controller.signal)
      .then((value) => {
        objectUrl = value
        setUrl(value)
      })
      .catch(() => setUrl(null))

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [version])

  const style = { width: size, height: size }

  return url ? (
    <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] font-semibold text-[var(--color-primary-hover)]"
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}
