import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { owner, repo, branch, path, token } = await request.json()

    // Validate required parameters
    if (!owner || !repo || !path || !token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Make the GitHub API request
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || "main"}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    )

    if (response.status === 404) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { success: false, error: `GitHub API error: ${errorData.message}` },
        { status: response.status },
      )
    }

    const data = await response.json()

    // If it's a file, decode the content
    if (data.type === "file" && data.content) {
      // GitHub returns base64 encoded content with newlines
      const content = atob(data.content.replace(/\n/g, ""))
      data.content = content
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching from GitHub:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
