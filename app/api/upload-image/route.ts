import { type NextRequest, NextResponse } from "next/server"
import { uploadImage } from "@/lib/image-storage-service"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const word = formData.get("word") as string
    const id = formData.get("id") as string
    const category = formData.get("category") as string
    const tagsString = formData.get("tags") as string
    const tags = tagsString ? JSON.parse(tagsString) : undefined

    if (!file || !word) {
      return NextResponse.json({ success: false, error: "File and word are required" }, { status: 400 })
    }

    const result = await uploadImage(file, {
      word,
      id,
      category,
      tags,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        githubUrl: result.githubUrl,
      })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in upload-image API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
