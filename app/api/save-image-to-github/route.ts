import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { word, url } = await request.json()

    if (!word || !url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get existing images from localStorage
    let signImages = []
    if (typeof window !== "undefined") {
      try {
        const storedImages = localStorage.getItem("signLanguageImages")
        if (storedImages) {
          signImages = JSON.parse(storedImages)
        }
      } catch (error) {
        console.error("Error loading stored images:", error)
      }
    }

    // Add the new image
    signImages.push({ word, url, id: Date.now().toString() })

    // Save back to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("signLanguageImages", JSON.stringify(signImages))
    }

    // In a real implementation, we would use the GitHub API to save the image
    // For now, we'll just simulate success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving image to GitHub:", error)
    return NextResponse.json({ error: "Failed to save image to GitHub" }, { status: 500 })
  }
}
