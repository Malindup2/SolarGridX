/*
 * profileRules.ts
 * Quick checks on a chosen photo before uploading. The API checks the file's
 * actual bytes; this only spares the user a pointless upload.
 */

import { AVATAR_TYPES, MAX_AVATAR_BYTES } from '../../services/profileService'

export function checkAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return 'Choose a JPEG or PNG image.'
  if (file.size > MAX_AVATAR_BYTES) return `The photo must be ${MAX_AVATAR_BYTES / 1024 / 1024} MB or smaller.`
  if (file.size === 0) return 'That file is empty.'
  return null
}
