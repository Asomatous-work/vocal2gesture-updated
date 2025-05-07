import { put } from "@vercel/blob"
import { modelManager } from "./model-manager"

interface UploadResult {
  success: boolean
  url?: string
  error?: string
  githubUrl?: string
}

export async function uploadGestureData(
  gestureData: any,
  options?: {
    filename?: string
    metadata?: Record<string, string>
  },
): Promise<UploadResult> {
  try {
    // Create a JSON blob from the gesture data
    const jsonString = JSON.stringify(gestureData, null, 2)
    const jsonBlob = new Blob([jsonString], { type: "application/json" })

    // Generate a filename if not provided
    const filename = options?.filename || `gesture-data-${Date.now()}.json`

    // Create a File object from the Blob
    const file = new File([jsonBlob], filename, { type: "application/json" })

    // Upload to Vercel Blob (Upstash)
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      metadata: options?.metadata || {
        timestamp: new Date().toISOString(),
        type: "gesture-data",
      },
    })

    // Also save to GitHub if configured
    let githubUrl: string | undefined

    if (modelManager.isGitHubConfigured()) {
      try {
        // Convert to base64 for GitHub API
        const base64Data = btoa(jsonString)

        // Save to GitHub
        const response = await fetch("/api/github/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner: modelManager.getGitHubConfig()?.owner,
            repo: modelManager.getGitHubConfig()?.repo,
            branch: modelManager.getGitHubConfig()?.branch || "main",
            path: `gesture-data/${filename}`,
            content: base64Data,
            message: `Add gesture data: ${filename}`,
            token: modelManager.getGitHubConfig()?.token,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save to GitHub")
        }

        const result = await response.json()
        githubUrl = result.data?.html_url
      } catch (githubError) {
        console.error("GitHub upload failed:", githubError)
        // Continue even if GitHub upload fails
      }
    }

    return {
      success: true,
      url: blob.url,
      githubUrl,
    }
  } catch (error) {
    console.error("Error uploading gesture data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// Helper function to download gesture data as a file
export function downloadGestureData(gestureData: any, filename?: string) {
  try {
    // Convert to JSON string
    const jsonString = JSON.stringify(gestureData, null, 2)

    // Create a blob and download link
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    // Create download link and trigger download
    const a = document.createElement("a")
    a.href = url
    a.download = filename || `gesture-data-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()

    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error("Error downloading gesture data:", error)
    return false
  }
}
