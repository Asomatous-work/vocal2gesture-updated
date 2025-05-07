import { NextResponse } from "next/server"

export async function GET() {
  // Only return public information, never expose tokens
  return NextResponse.json({
    defaultRepo: "Asomatous-work/vocal2gesture-updated",
    defaultBranch: "main",
  })
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Validate the token without exposing it
    const { token } = data

    if (!token) {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 })
    }

    // Test the token with a simple GitHub API call
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      // Get more detailed error information
      const errorData = await response.json()
      const errorMessage = errorData.message || "Invalid GitHub token"

      return NextResponse.json(
        {
          success: false,
          error: `GitHub API error: ${errorMessage}`,
          status: response.status,
        },
        { status: 401 },
      )
    }

    // Get user information for confirmation
    const userData = await response.json()

    // Return success with user info but without exposing the token
    return NextResponse.json({
      success: true,
      user: {
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
      },
    })
  } catch (error) {
    console.error("Error validating GitHub token:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate GitHub token: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}
