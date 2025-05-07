import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { owner, repo, branch, path, content, message, token } = await request.json()

    // Validate required parameters
    if (!owner || !repo || !path || !content || !token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Check if file exists first to determine if we need to create or update
    const checkResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || "main"}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    )

    let sha = null
    if (checkResponse.status === 200) {
      const fileData = await checkResponse.json()
      sha = fileData.sha
    } else if (checkResponse.status !== 404) {
      // If status is not 404 (not found) or 200 (found), there's an error
      const errorData = await checkResponse.json()
      return NextResponse.json(
        { success: false, error: `GitHub API error: ${errorData.message}` },
        { status: checkResponse.status },
      )
    }

    // Prepare the request body
    const requestBody: any = {
      message: message || `Update ${path}`,
      content:
        typeof content === "string" && content.startsWith("data:")
          ? content.split(",")[1] // Extract base64 part if it's a data URL
          : btoa(content), // Otherwise, encode to base64
      branch: branch || "main",
    }

    // Add sha if file exists (update)
    if (sha) {
      requestBody.sha = sha
    }

    // Make the GitHub API request
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { success: false, error: `GitHub API error: ${errorData.message}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving to GitHub:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
