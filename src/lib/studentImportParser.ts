import { parse } from 'csv-parse/sync'
import { PDFParse } from 'pdf-parse'

export interface ParsedStudent {
  name: string
  email: string
  password?: string
  phone?: string
  address?: string
}

export async function parseStudentImportFile(file: File): Promise<ParsedStudent[]> {
  const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf'
  const buffer = Buffer.from(await file.arrayBuffer())

  let rawText = ''

  if (isPdf) {
    try {
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      rawText = result?.text || ''
    } catch (err) {
      console.error('PDF parsing error:', err)
      throw new Error('Could not parse PDF text content. Please ensure it is a text-readable PDF file.')
    }
  } else {
    rawText = buffer.toString('utf-8')
  }

  return parseStudentText(rawText)
}

export function parseStudentText(rawText: string): ParsedStudent[] {
  const results: ParsedStudent[] = []

  // First try standard CSV parsing if header exists
  if (rawText.toLowerCase().includes('email') && rawText.includes(',')) {
    try {
      const records = parse(rawText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      }) as any[]

      for (const rec of records) {
        const emailKey = Object.keys(rec).find(k => k.toLowerCase().includes('email'))
        const nameKey = Object.keys(rec).find(k => k.toLowerCase().includes('name'))
        const passKey = Object.keys(rec).find(k => k.toLowerCase().includes('password') || k.toLowerCase().includes('pass'))
        const phoneKey = Object.keys(rec).find(k => k.toLowerCase().includes('phone'))
        const addrKey = Object.keys(rec).find(k => k.toLowerCase().includes('address'))

        const email = emailKey ? rec[emailKey]?.trim() : ''
        const name = nameKey ? rec[nameKey]?.trim() : ''

        if (email && email.includes('@')) {
          results.push({
            name: name || email.split('@')[0],
            email,
            password: (passKey && rec[passKey]?.trim()) || 'Student2026!',
            phone: phoneKey ? rec[phoneKey]?.trim() : '',
            address: addrKey ? rec[addrKey]?.trim() : '',
          })
        }
      }

      if (results.length > 0) return results
    } catch {
      // Fallback to line-by-line regex parsing if CSV parse fails
    }
  }

  // Fallback: Parse line by line (works for unstructured PDF text, plain text, and custom formats)
  const lines = rawText.split(/\r?\n/)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    const emails = line.match(emailRegex)
    if (!emails || emails.length === 0) continue

    const email = emails[0]

    // Check for key-value format: Name: John | Email: john@test.com
    const nameKvMatch = line.match(/name[:=\-\s]+([^,|\t;\n]+)/i)
    const passKvMatch = line.match(/(?:pass|password)[:=\-\s]+([^,|\t;\n]+)/i)
    const phoneKvMatch = line.match(/phone[:=\-\s]+([^,|\t;\n]+)/i)
    const addrKvMatch = line.match(/address[:=\-\s]+([^,|\t;\n]+)/i)

    let name = nameKvMatch ? nameKvMatch[1].trim() : ''
    let password = passKvMatch ? passKvMatch[1].trim() : 'Student2026!'
    let phone = phoneKvMatch ? phoneKvMatch[1].trim() : ''
    let address = addrKvMatch ? addrKvMatch[1].trim() : ''

    // If key-value didn't match, split by common delimiters (, | \t ;)
    if (!name) {
      const parts = line.split(/[,|\t;]+/).map(p => p.trim()).filter(Boolean)
      const emailIdx = parts.findIndex(p => p.includes(email))

      if (parts.length >= 2) {
        // Name is usually the part preceding or adjacent to email
        const nonEmailParts = parts.filter((_, idx) => idx !== emailIdx)
        name = nonEmailParts[0] || email.split('@')[0]
        if (nonEmailParts[1]) password = nonEmailParts[1]
        if (nonEmailParts[2]) phone = nonEmailParts[2]
        if (nonEmailParts[3]) address = nonEmailParts[3]
      } else {
        // Line format: "John Doe john@domain.com"
        const beforeEmail = line.substring(0, line.indexOf(email)).trim()
        name = beforeEmail || email.split('@')[0]
      }
    }

    // Clean up name
    name = name.replace(/^(name|student|user|email)[:\s-]*/i, '').trim()
    if (!name) name = email.split('@')[0]

    // Ensure email unique in results
    if (!results.some(r => r.email.toLowerCase() === email.toLowerCase())) {
      results.push({
        name,
        email,
        password: password || 'Student2026!',
        phone,
        address
      })
    }
  }

  return results
}
