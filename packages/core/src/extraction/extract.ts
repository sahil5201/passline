import mammoth from "mammoth"
import { extractText as extractPdfText } from "unpdf"
import type { ResumeFileType } from "@passline/db"
import { LIMITS } from "../limits"

export type ExtractionResult = {
  text: string
  warning?: string
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExtractionError"
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes)
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function extractFromPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  const { text } = await extractPdfText(bytes, { mergePages: true })
  const merged = Array.isArray(text) ? text.join("\n\n") : text
  return { text: normalizeExtractedText(merged) }
}

async function extractFromDocx(bytes: Uint8Array): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
  const warning =
    result.messages.length > 0
      ? result.messages.map((m) => m.message).join("; ")
      : undefined
  return { text: normalizeExtractedText(result.value), warning }
}

/**
 * Legacy .doc is poorly supported in pure JS. We attempt a UTF-8 decode and
 * surface a convert-to-DOCX/PDF hint when the text looks empty or binary.
 */
function extractFromLegacyDoc(bytes: Uint8Array): ExtractionResult {
  const raw = decodeUtf8(bytes)
  // Strip NULs and other control chars common in OLE binary
  const cleaned = normalizeExtractedText(
    raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " "),
  )
  const printableRatio =
    cleaned.length === 0
      ? 0
      : cleaned.replace(/\s/g, "").replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "")
          .length / Math.max(cleaned.replace(/\s/g, "").length, 1)

  if (cleaned.length < 40 || printableRatio < 0.7) {
    return {
      text: cleaned,
      warning:
        "Legacy .doc extraction is unreliable. Convert to DOCX or PDF if the text looks wrong.",
    }
  }

  return {
    text: cleaned,
    warning:
      "Legacy .doc support is limited. Convert to DOCX or PDF if the text looks wrong.",
  }
}

function extractFromPlainText(bytes: Uint8Array): ExtractionResult {
  return { text: normalizeExtractedText(decodeUtf8(bytes)) }
}

/**
 * Extract clean text/Markdown from an uploaded resume file.
 * Pasted text should call this with fileType "paste" or "txt"/"md" and UTF-8 bytes,
 * or use `normalizePastedText` directly.
 */
function toUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}

export async function extractResumeText(
  input: Uint8Array | ArrayBuffer,
  fileType: ResumeFileType,
): Promise<ExtractionResult> {
  const bytes = toUint8Array(input)

  if (bytes.byteLength > LIMITS.maxResumeFileBytes) {
    throw new ExtractionError(
      `File exceeds max size of ${LIMITS.maxResumeFileBytes} bytes`,
    )
  }

  switch (fileType) {
    case "pdf":
      return extractFromPdf(bytes)
    case "docx":
      return extractFromDocx(bytes)
    case "doc":
      return extractFromLegacyDoc(bytes)
    case "md":
    case "txt":
    case "paste":
      return extractFromPlainText(bytes)
    default: {
      const _exhaustive: never = fileType
      throw new ExtractionError(`Unsupported file type: ${_exhaustive}`)
    }
  }
}

export function normalizePastedText(text: string): ExtractionResult {
  return { text: normalizeExtractedText(text) }
}

export function extensionToFileType(
  filename: string,
): Exclude<ResumeFileType, "paste"> | null {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "pdf":
      return "pdf"
    case "doc":
      return "doc"
    case "docx":
      return "docx"
    case "md":
    case "markdown":
      return "md"
    case "txt":
      return "txt"
    default:
      return null
  }
}
