import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import { join } from "path"
import { auth } from "@/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Require authentication to access uploaded files
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const { path: pathArray } = await params
    const filePath = join(process.cwd(), "uploads", ...pathArray)

    // Security check: Prevent directory traversal
    if (!filePath.startsWith(join(process.cwd(), "uploads"))) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Verify file exists
    await stat(filePath)

    // Read and serve file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    let contentDisposition = 'inline'
    
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'csv': 'text/csv'
    }

    if (ext && mimeTypes[ext]) {
      contentType = mimeTypes[ext]
    }

    // SVG files can contain <script> tags — serve as attachment to prevent XSS
    if (ext === 'svg') {
      contentType = 'image/svg+xml'
      contentDisposition = 'attachment'
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    })
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse("File not found", { status: 404 })
    }
    console.error("Error serving file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
