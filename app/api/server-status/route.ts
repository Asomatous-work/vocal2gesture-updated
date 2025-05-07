import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const services = [
      { name: "Vercel Blob", status: "unknown" },
      { name: "GitHub", status: "unknown" },
      { name: "Upstash", status: "unknown" },
    ]

    // Check Vercel Blob status
    try {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN
      if (blobToken) {
        services[0].status = "available"
      } else {
        services[0].status = "not configured"
      }
    } catch (error) {
      services[0].status = "error"
    }

    // Check GitHub status
    try {
      const githubToken = process.env.GITHUB_TOKEN
      const githubOwner = process.env.GITHUB_OWNER
      const githubRepo = process.env.GITHUB_REPO

      if (githubToken && githubOwner && githubRepo) {
        // Test GitHub API
        const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}`, {
          headers: {
            Authorization: `token ${githubToken}`,
          },
        })

        if (response.ok) {
          services[1].status = "available"
        } else {
          services[1].status = "error"
        }
      } else {
        services[1].status = "not configured"
      }
    } catch (error) {
      services[1].status = "error"
    }

    // Check Upstash status (if you have Upstash integration)
    try {
      const upstashUrl = process.env.UPSTASH_URL
      const upstashToken = process.env.UPSTASH_TOKEN

      if (upstashUrl && upstashToken) {
        services[2].status = "available"
      } else {
        services[2].status = "not configured"
      }
    } catch (error) {
      services[2].status = "error"
    }

    return NextResponse.json({
      services,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error checking server status:", error)
    return NextResponse.json({ error: "Failed to check server status" }, { status: 500 })
  }
}
