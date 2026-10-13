/**
 * Date and timezone helper utilities for quiz due dates and calendar inputs.
 */

/**
 * Formats a Date object or ISO string into a 'YYYY-MM-DDTHH:mm' string in the user's local timezone.
 * Essential for <input type="datetime-local" /> to display the exact entered local time without UTC shifting.
 */
export function toLocalDatetimeInput(dateStrOrObj: string | Date | null | undefined): string {
  if (!dateStrOrObj) return ''
  const d = new Date(dateStrOrObj)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Parses a datetime-local input value ('YYYY-MM-DDTHH:mm') into an ISO UTC string.
 */
export function parseLocalDatetimeToISO(datetimeLocalVal: string | null | undefined): string | null {
  if (!datetimeLocalVal) return null
  const d = new Date(datetimeLocalVal)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}
