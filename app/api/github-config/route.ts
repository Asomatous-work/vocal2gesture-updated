import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    // Validate token
    if (!token) {
      return NextResponse.json({ success: false, error: "GitHub token is required" }, { status: 400 })
    }

    // Test the token with a simple GitHub API call
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { success: false, error: `GitHub API error: ${errorData.message}` },
        { status: response.status },
      )
    }

    const userData = await response.json()
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
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
