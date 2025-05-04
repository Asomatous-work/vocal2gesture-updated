import { handleUpload } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  const response = await handleUpload({
    request,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return NextResponse.json(response)
}

export const runtime = "nodejs"
