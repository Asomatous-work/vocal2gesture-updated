import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { owner, repo, path, message, token, sha } = await request.json()

    // Validate required fields
    if (!owner || !repo || !path || !token || !sha) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Construct GitHub API URL
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

    // Make API request to delete the file
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || `Delete ${path}`,
        sha: sha,
      }),
    })

    if (response.ok) {
      return NextResponse.json({ success: true })
    } else {
      const error = await response.json()
      return NextResponse.json({ error: error.message || "GitHub API error" }, { status: response.status })
    }
  } catch (error) {
    console.error("Error in GitHub delete route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
