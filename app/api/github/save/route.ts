import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  try {
    const { owner, repo, branch, path, content, message, token } = await request.json()

    // Validate required fields
    if (!owner || !repo || !path || !content || !token) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, path, content, and token are required" },
        { status: 400 },
      )
    }

    // Initialize Octokit with the provided token
    const octokit = new Octokit({
      auth: token,
    })

    // Check if file already exists to get the SHA (needed for updates)
    let fileSha: string | undefined
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch || "main",
      })

      // If the file exists and it's not a directory, get its SHA
      if (!Array.isArray(fileData) && fileData.type === "file") {
        fileSha = fileData.sha
      }
    } catch (error) {
      // File doesn't exist yet, which is fine for creating new files
      console.log("File doesn't exist yet, will create it")
    }

    // Prepare the content (Base64 encode)
    const contentEncoded = Buffer.from(content).toString("base64")

    // Create or update the file
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: message || `Update ${path}`,
      content: contentEncoded,
      branch: branch || "main",
      sha: fileSha, // Include SHA if updating an existing file
    })

    return NextResponse.json({
      success: true,
      data: {
        sha: response.data.content?.sha,
        url: response.data.content?.html_url,
      },
    })
  } catch (error: any) {
    console.error("GitHub API error:", error)

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
      { error: error.message || "Failed to save file to GitHub" },
      { status: error.status || 500 },
    )
  }
}
