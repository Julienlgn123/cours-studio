export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Inline markdown → HTML (bold, italic, code, links). Run on already-escaped text.
function inlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
}

// Small block-level Markdown → HTML converter for imported text.
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inList: 'ul' | 'ol' | null = null
  let inCode = false
  const codeBuf: string[] = []

  const closeList = (): void => { if (inList) { out.push(`</${inList}>`); inList = null } }

  for (const raw of lines) {
    const line = raw

    if (line.trim().startsWith('```')) {
      if (inCode) { out.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`); codeBuf.length = 0; inCode = false }
      else { closeList(); inCode = true }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }

    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const level = Math.min(h[1].length, 3)
      out.push(`<h${level}>${inlineMd(esc(h[2].trim()))}</h${level}>`)
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul' }
      out.push(`<li>${inlineMd(esc(line.replace(/^\s*[-*+]\s+/, '')))}</li>`)
      continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol' }
      out.push(`<li>${inlineMd(esc(line.replace(/^\s*\d+\.\s+/, '')))}</li>`)
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      closeList()
      out.push(`<blockquote><p>${inlineMd(esc(line.replace(/^\s*>\s?/, '')))}</p></blockquote>`)
      continue
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { closeList(); out.push('<hr>'); continue }

    if (line.trim() === '') { closeList(); continue }

    closeList()
    out.push(`<p>${inlineMd(esc(line.trim()))}</p>`)
  }
  if (inCode) out.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`)
  closeList()
  return out.join('\n')
}

// Heuristic: does this text look like Markdown?
export function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|\n#{1,6}\s|\*\*[^*]+\*\*|^\s*[-*]\s+.+\n\s*[-*]\s+|\[[^\]]+\]\(https?:/m.test(text)
}
