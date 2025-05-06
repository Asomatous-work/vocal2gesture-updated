import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, path, branch, token } = await request.json()

    // Validate required fields
    if (!owner || !repo || !path || !token) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, path, and token are required" },
        { status: 400 },
      )
    }

    // Initialize Octokit with the provided token
    const octokit = new Octokit({
      auth: token,
    })

    // Get the file content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch || "main",
    })

    // If we got an array, it means the path is a directory, not a file
    if (Array.isArray(data)) {
      return NextResponse.json({ error: "The specified path is a directory, not a file" }, { status: 400 })
    }

    // Get the content
    let content = ""
    if (data.content) {
      // GitHub API returns base64 encoded content
      content = Buffer.from(data.content, "base64").toString("utf-8")
    }

    return NextResponse.json({
      success: true,
      data: {
        content,
        sha: data.sha,
        size: data.size,
        url: data.html_url,
      },
    })
  } catch (error: any) {
    console.error("Error fetching from GitHub:", error)

    // Handle 404 specifically
    if (error.status === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Handle authentication errors
    if (error.message?.includes("Bad credentials")) {
      return NextResponse.json(
        { error: "Invalid GitHub token. Please check your token and try again." },
        { status: 401 },
      )
    }

    return NextResponse.json({ error: `Error fetching from GitHub: ${error.message}` }, { status: 500 })
  }
}
