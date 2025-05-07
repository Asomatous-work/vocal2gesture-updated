import { put } from "@vercel/blob"
import { modelManager } from "./model-manager"

interface UploadResult {
  success: boolean
  url?: string
  error?: string
  githubUrl?: string
}

export async function uploadImage(
  file: File,
  metadata: {
    word: string
    id?: string
    category?: string
    tags?: string[]
  },
): Promise<UploadResult> {
  try {
    // Generate a unique ID if not provided
    const imageId = metadata.id || Date.now().toString()

    // Create a filename based on the word and ID
    const filename = `${metadata.word.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${imageId}.${file.name.split(".").pop()}`

    // Step 1: Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      metadata: {
        word: metadata.word,
        category: metadata.category || "",
        tags: metadata.tags ? JSON.stringify(metadata.tags) : "",
        uploadedAt: new Date().toISOString(),
      },
    })

    // Step 2: Also save to GitHub if configured
    let githubUrl: string | undefined

    try {
      if (modelManager.isGitHubConfigured()) {
        // Convert file to base64 for GitHub API
        const base64Data = await fileToBase64(file)

        // Save to GitHub
        const githubResult = await saveToGitHub(filename, base64Data, metadata.word)
        if (githubResult.success) {
          githubUrl = githubResult.url
        }
      }
    } catch (githubError) {
      console.error("GitHub upload failed, but Blob upload succeeded:", githubError)
      // We continue even if GitHub upload fails
    }

    // Step 3: Add to model manager for local reference
    modelManager.addSignImage(metadata.word, blob.url, imageId, metadata.category, metadata.tags)

    return {
      success: true,
      url: blob.url,
      githubUrl,
    }
  } catch (error) {
    console.error("Error uploading image:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// Helper function to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Extract the base64 part (remove the data:image/xxx;base64, prefix)
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
  })
}

// Helper function to save to GitHub
async function saveToGitHub(
  filename: string,
  base64Content: string,
  word: string,
): Promise<{ success: boolean; url?: string }> {
  try {
    const path = `images/${filename}`

    const response = await fetch("/api/github/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: modelManager.getGitHubConfig()?.owner,
        repo: modelManager.getGitHubConfig()?.repo,
        branch: modelManager.getGitHubConfig()?.branch || "main",
        path,
        content: base64Content,
        message: `Add sign image for ${word}`,
        token: modelManager.getGitHubConfig()?.token,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to save to GitHub")
    }

    const result = await response.json()
    return {
      success: true,
      url: result.data?.url,
    }
  } catch (error) {
    console.error("GitHub save error:", error)
    throw error
  }
}
