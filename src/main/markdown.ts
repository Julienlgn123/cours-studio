// Minimal HTML → Markdown converter for the note editor's output.
// TipTap produces a predictable subset of HTML, so a light regex pass is enough
// (no DOM in the main process). Not a general-purpose converter.

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

function inline(html: string): string {
  return decodeEntities(
    html
      .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
      .replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~')
      .replace(/<u>([\s\S]*?)<\/u>/gi, '$1')
      .replace(/<mark>([\s\S]*?)<\/mark>/gi, '==$1==')
      .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<br\s*\/?>/gi, '  \n')
      .replace(/<sub>([\s\S]*?)<\/sub>/gi, '_$1_')
      .replace(/<sup>([\s\S]*?)<\/sup>/gi, '^$1^')
      .replace(/<[^>]+>/g, '')
  ).trim()
}

export function htmlToMarkdown(html: string): string {
  let md = html
  // math nodes rendered by the editor carry the source in data-latex
  md = md.replace(/<[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/[^>]+>/gi, (_m, latex) => `$${decodeEntities(latex)}$`)

  // code blocks
  md = md.replace(/<pre>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_m, code) => `\n\`\`\`\n${decodeEntities(code).replace(/\n$/, '')}\n\`\`\`\n`)

  // headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, t) => `\n# ${inline(t)}\n`)
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, t) => `\n## ${inline(t)}\n`)
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, t) => `\n### ${inline(t)}\n`)

  // blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, t) =>
    '\n' + inline(t).split('\n').map((l) => `> ${l}`).join('\n') + '\n')

  // task lists
  md = md.replace(/<li[^>]*data-checked="true"[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `- [x] ${inline(t)}\n`)
  md = md.replace(/<li[^>]*data-checked="false"[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `- [ ] ${inline(t)}\n`)

  // ordered lists — number the items in sequence
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, body) => {
    let i = 0
    return '\n' + String(body).replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_x: string, t: string) => `${++i}. ${inline(t)}\n`) + '\n'
  })
  // bullet lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, body) =>
    '\n' + String(body).replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_x: string, t: string) => `- ${inline(t)}\n`) + '\n')

  // images
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')

  // horizontal rule
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n')

  // paragraphs and remaining block wrappers
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, t) => `\n${inline(t)}\n`)
  md = md.replace(/<\/(div|section)>/gi, '\n')

  // strip anything left, decode, tidy whitespace
  md = inline(md)
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  return md
}
