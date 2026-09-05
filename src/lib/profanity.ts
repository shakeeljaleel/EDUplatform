// Anti-Profanity Content Moderation Filter
const PROFANITY_LIST = [
  'fuck', 'fucking', 'fucked', 'fucker', 'f*ck', 'f**k', 'fuk', 'fck',
  'shit', 'shitting', 'shitted', 'sh!t', 'sh*t', 'bullshit',
  'bitch', 'bitches', 'b!tch', 'b*tch',
  'ass', 'asshole', 'a$$', 'a**hole', 'a$$hole',
  'bastard', 'crap', 'dick', 'pussy', 'cock', 'cunt', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'idiot', 'stupid', 'dumbass', 'dumb', 'moron', 'jackass'
]

// Create regex to match whole words or obscured variations
const profanityRegexes = PROFANITY_LIST.map(word => {
  const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'gi')
})

export function containsProfanity(text: string): { hasProfanity: boolean; matchedWords: string[] } {
  if (!text || typeof text !== 'string') return { hasProfanity: false, matchedWords: [] }
  
  const lower = text.toLowerCase()
  const matchedWords: string[] = []

  for (const word of PROFANITY_LIST) {
    if (lower.includes(word.toLowerCase())) {
      matchedWords.push(word)
    }
  }

  return {
    hasProfanity: matchedWords.length > 0,
    matchedWords: Array.from(new Set(matchedWords))
  }
}

export function censorProfanity(text: string): string {
  if (!text || typeof text !== 'string') return text
  let sanitized = text
  for (const regex of profanityRegexes) {
    sanitized = sanitized.replace(regex, (match) => '*'.repeat(match.length))
  }
  return sanitized
}
