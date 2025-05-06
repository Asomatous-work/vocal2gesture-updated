import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  try {
    const { owner, repo, branch, path, token } = await request.json()

    // Validate required fields
    if (!owner || !repo || !token) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, and token are required" },
        { status: 400 },
      )
    }

    // Initialize Octokit with the provided token
    const octokit = new Octokit({
      auth: token,
    })

    // Fetch the directory content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: path || "",
      ref: branch || "main",
    })

    // If it's a single file, return it as an array
    if (!Array.isArray(data)) {
      return NextResponse.json({
        success: true,
        data: [data],
      })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("GitHub API error:", error)

    // Handle directory not found
    if (error.status === 404) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 })
    }

    // Handle rate limiting
    if (error.status === 403 && error.response?.headers?.["x-ratelimit-remaining"] === "0") {
      return NextResponse.json(
        {
          error: "GitHub API rate limit exceeded",
          resetAt: new Date(Number.parseInt(error.response.headers["x-ratelimit-reset"]) * 1000).toISOString(),
        },
        { status: 429 },
      )
    }

    // Handle authentication errors
    if (error.status === 401) {
      return NextResponse.json({ error: "Invalid GitHub token" }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || "Failed to list files from GitHub" },
      { status: error.status || 500 },
    )
  }
}
