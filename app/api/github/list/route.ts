import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, path, branch, token } = await request.json()

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

    // Get the directory content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: path || "",
      ref: branch || "main",
    })

    // If we got a single file, not an array, return it as a single-item array
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
    console.error("Error listing GitHub directory:", error)

    // Handle 404 specifically
    if (error.status === 404) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 })
    }

    // Handle authentication errors
    if (error.message?.includes("Bad credentials")) {
      return NextResponse.json(
        { error: "Invalid GitHub token. Please check your token and try again." },
        { status: 401 },
      )
    }

    return NextResponse.json({ error: `Error listing GitHub directory: ${error.message}` }, { status: 500 })
  }
}
