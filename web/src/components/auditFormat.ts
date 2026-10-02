/*
 * auditFormat.ts
 * Turns audit event names into readable text.
 */

/** "ReservationApproved" -> "Reservation approved" */
export function eventLabel(event: string): string {
  const words = event.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

