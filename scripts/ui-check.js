const fs = require('fs')
const path = require('path')

console.log('🔍 Running automated UI consistency checker...')

const srcDir = path.join(__dirname, '..', 'src')
let errors = []
let warnings = []

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      walkDir(filePath, callback)
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      callback(filePath)
    }
  })
}

walkDir(srcDir, filePath => {
  const content = fs.readFileSync(filePath, 'utf8')
  const relativePath = path.relative(path.join(__dirname, '..'), filePath)

  // 1. Check ALL CAPS button labels in JSX string literals
  const allCapsBtnRegex = /<button[^>]*>\s*([A-Z\s]{4,})\s*<\/button>/g
  let match
  while ((match = allCapsBtnRegex.exec(content)) !== null) {
    const text = match[1].trim()
    if (text !== 'CANCEL' && text !== 'X' && !text.startsWith('{')) {
      errors.push(`[ALL_CAPS_BUTTON] ${relativePath}: Button contains ALL CAPS text "${text}". Use sentence case instead.`)
    }
  }

  // 2. Check inline linear-gradient on buttons
  const buttonGradientRegex = /<button[^>]*style=\{\{[^}]*linear-gradient[^}]*\}\}/g
  if (buttonGradientRegex.test(content)) {
    errors.push(`[BUTTON_GRADIENT] ${relativePath}: Button uses linear-gradient background. Use solid fill.`)
  }

  // 3. Check greeting header outside Overview pages
  const isOverviewPage = relativePath.endsWith('super-admin/page.tsx') ||
                         relativePath.endsWith('teacher/page.tsx') ||
                         relativePath.endsWith('student/page.tsx') ||
                         relativePath.endsWith('parent/page.tsx') ||
                         relativePath.endsWith('assistant/page.tsx') ||
                         relativePath.endsWith('login/page.tsx')

  if (!isOverviewPage && content.includes('Welcome back,')) {
    errors.push(`[DUPLICATE_GREETING] ${relativePath}: "Welcome back" greeting found on inner page. Greeting headers are allowed only on main Overview pages.`)
  }
})

console.log(`\nUI Check Summary: ${errors.length} error(s), ${warnings.length} warning(s).`)

if (errors.length > 0) {
  console.error('\n❌ UI Consistency Gate Failed:')
  errors.forEach(err => console.error(`  - ${err}`))
  process.exit(1)
} else {
  console.log('✅ UI Consistency Gate Passed cleanly!')
}
