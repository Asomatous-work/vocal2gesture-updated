import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Get GitHub config from environment variables
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const token = process.env.GITHUB_TOKEN
    const branch = process.env.GITHUB_BRANCH || "main"

    if (!owner || !repo || !token) {
      return NextResponse.json({ error: "GitHub configuration is incomplete" }, { status: 400 })
    }

    // Extract the path from the URL
    // Example URL: https://raw.githubusercontent.com/owner/repo/branch/path
    const urlParts = url.split(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`)
    if (urlParts.length !== 2) {
      return NextResponse.json({ error: "Invalid GitHub URL format" }, { status: 400 })
    }

    const path = urlParts[1]

    // Get the file's SHA
    const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        Authorization: `token ${token}`,
      },
    })

    if (!getResponse.ok) {
      throw new Error(`Failed to get file info: ${getResponse.statusText}`)
    }

    const fileInfo = await getResponse.json()

    // Delete the file
    const deleteResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete sign image`,
        sha: fileInfo.sha,
        branch,
      }),
    })

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete file: ${deleteResponse.statusText}`)
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Error deleting image from GitHub:", error)
    return NextResponse.json({ error: "Failed to delete image from GitHub" }, { status: 500 })
  }
}
