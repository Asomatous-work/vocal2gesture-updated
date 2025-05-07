import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const word = formData.get("word") as string

    if (!file || !word) {
      return NextResponse.json({ error: "File and word are required" }, { status: 400 })
    }

    // Generate a unique filename
    const filename = `${word.replace(/\s+/g, "_")}_${Date.now()}.${file.name.split(".").pop()}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
      success: true,
    })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
