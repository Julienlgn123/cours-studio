import { extname } from 'path'
import { readFileSync } from 'fs'
import { dialog, BrowserWindow } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSZip = require('jszip')

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<text:p[^>]*>/g, '\n')
    .replace(/<text:line-break\s*\/>/g, '\n')
    .replace(/<text:tab\s*\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractOdt(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buffer)
  const contentFile = zip.file('content.xml')
  if (!contentFile) throw new Error('Fichier ODT invalide (content.xml introuvable)')
  const xml = await contentFile.async('string')
  return stripXmlTags(xml)
}

async function extractDocx(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return (result.value as string).trim()
}

async function extractPdf(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath)
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return (result.text as string).trim()
  } finally {
    await parser.destroy()
  }
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase()
  switch (ext) {
    case '.pdf': return extractPdf(filePath)
    case '.docx': return extractDocx(filePath)
    case '.odt': return extractOdt(filePath)
    case '.txt':
    case '.md':
      return readFileSync(filePath, 'utf-8').trim()
    default:
      throw new Error(`Format non supporté : ${ext || 'inconnu'}`)
  }
}

export async function pickAndExtractDocument(
  window: BrowserWindow
): Promise<{ fileName: string; text: string } | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    title: 'Importer un document',
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'docx', 'odt', 'txt', 'md'] },
      { name: 'Tous les fichiers', extensions: ['*'] }
    ]
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const text = await extractTextFromFile(filePath)
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  return { fileName, text }
}
