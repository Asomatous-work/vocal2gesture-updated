import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, path, content, message, branch, token } = await request.json()

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

    // Check if the file already exists to determine if we need to create or update
    let sha: string | undefined
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch || "main",
      })

      // If the file exists, get its SHA
      if (!Array.isArray(fileData)) {
        sha = fileData.sha
      }
    } catch (error: any) {
      // If the file doesn't exist (404), that's fine - we'll create it
      if (error.status !== 404) {
        console.error("Error checking if file exists:", error)
        return NextResponse.json({ error: `Error checking if file exists: ${error.message}` }, { status: 500 })
      }
    }

    // Create or update the file
    const result = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: message || `Update ${path}`,
      content: content,
      branch: branch || "main",
      sha,
    })

    return NextResponse.json({
      success: true,
      data: {
        sha: result.data.content?.sha,
        url: result.data.content?.html_url,
      },
    })
  } catch (error: any) {
    console.error("Error saving to GitHub:", error)

    // Handle specific error cases
    if (error.message?.includes("Bad credentials")) {
      return NextResponse.json(
        { error: "Invalid GitHub token. Please check your token and try again." },
        { status: 401 },
      )
    }

    return NextResponse.json({ error: `Error saving to GitHub: ${error.message}` }, { status: 500 })
  }
}
