import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  try {
    const { owner, repo, branch, path, token } = await request.json()

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

    // Fetch the file content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch || "main",
    })

    // Handle different response types
    if (Array.isArray(data)) {
      // This is a directory, not a file
      return NextResponse.json({ error: "The specified path is a directory, not a file" }, { status: 400 })
    }

    if (data.type !== "file") {
      return NextResponse.json({ error: `The specified path is a ${data.type}, not a file` }, { status: 400 })
    }

    // Decode the content if it's base64 encoded
    let content = data.content
    if (data.encoding === "base64") {
      content = Buffer.from(content, "base64").toString("utf-8")
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
    console.error("GitHub API error:", error)

    // Handle file not found
    if (error.status === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
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
      { error: error.message || "Failed to fetch file from GitHub" },
      { status: error.status || 500 },
    )
  }
}
