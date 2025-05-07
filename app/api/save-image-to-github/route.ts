import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { word, id, data, fileExtension } = await request.json()

    if (!word || !id || !data) {
      return NextResponse.json({ error: "Word, ID, and data are required" }, { status: 400 })
    }

    // Get GitHub config from environment variables
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const token = process.env.GITHUB_TOKEN
    const branch = process.env.GITHUB_BRANCH || "main"

    if (!owner || !repo || !token) {
      return NextResponse.json({ error: "GitHub configuration is incomplete" }, { status: 400 })
    }

    // Create a filename
    const filename = `images/${word.replace(/\s+/g, "_")}_${id}.${fileExtension || "png"}`

    // Create or update file in GitHub
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add sign image for ${word}`,
        content: data,
        branch,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`GitHub API error: ${JSON.stringify(errorData)}`)
    }

    const responseData = await response.json()

    return NextResponse.json({
      url: responseData.content.download_url,
      success: true,
    })
  } catch (error) {
    console.error("Error saving image to GitHub:", error)
    return NextResponse.json({ error: "Failed to save image to GitHub" }, { status: 500 })
  }
}
