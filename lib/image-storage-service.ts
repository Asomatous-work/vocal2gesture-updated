import { v4 as uuidv4 } from "uuid"

export interface StorageOptions {
  useLocalStorage?: boolean
  useVercelBlob?: boolean
  useGitHub?: boolean
}

export interface ImageMetadata {
  id: string
  word: string
  url: string
  storageType: "local" | "blob" | "github"
  createdAt: string
  category?: string
  tags?: string[]
}

export class ImageStorageService {
  private options: StorageOptions = {
    useLocalStorage: true,
    useVercelBlob: true,
    useGitHub: false,
  }

  constructor(options?: StorageOptions) {
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  public async uploadImage(
    word: string,
    file: File | Blob | string,
    metadata?: { category?: string; tags?: string[] },
  ): Promise<ImageMetadata | null> {
    try {
      const id = uuidv4()
      const createdAt = new Date().toISOString()
      let url = ""
      let storageType: "local" | "blob" | "github" = "local"

      // Convert file to base64 if it's a File or Blob
      if (typeof file !== "string") {
        url = await this.fileToDataURL(file)
      } else {
        // Assume it's already a data URL
        url = file
      }

      // Store in Vercel Blob if enabled
      if (this.options.useVercelBlob) {
        try {
          const blobUrl = await this.uploadToVercelBlob(word, url, id)
          if (blobUrl) {
            url = blobUrl
            storageType = "blob"
          }
        } catch (error) {
          console.error("Error uploading to Vercel Blob:", error)
          // Continue with local storage
        }
      }

      // Store in GitHub if enabled
      if (this.options.useGitHub && storageType !== "github") {
        try {
          const githubUrl = await this.uploadToGitHub(word, url, id)
          if (githubUrl) {
            url = githubUrl
            storageType = "github"
          }
        } catch (error) {
          console.error("Error uploading to GitHub:", error)
          // Continue with current storage
        }
      }

      // Store metadata in localStorage
      const imageMetadata: ImageMetadata = {
        id,
        word,
        url,
        storageType,
        createdAt,
        ...metadata,
      }

      if (this.options.useLocalStorage) {
        this.saveMetadataToLocalStorage(imageMetadata)
      }

      return imageMetadata
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    }
  }

  public async deleteImage(id: string): Promise<boolean> {
    try {
      // Get the image metadata
      const metadata = this.getImageMetadata(id)
      if (!metadata) {
        return false
      }

      // Delete from Vercel Blob if it's stored there
      if (metadata.storageType === "blob") {
        try {
          await this.deleteFromVercelBlob(metadata.url)
        } catch (error) {
          console.error("Error deleting from Vercel Blob:", error)
        }
      }

      // Delete from GitHub if it's stored there
      if (metadata.storageType === "github") {
        try {
          await this.deleteFromGitHub(metadata.url)
        } catch (error) {
          console.error("Error deleting from GitHub:", error)
        }
      }

      // Remove metadata from localStorage
      if (this.options.useLocalStorage) {
        this.removeMetadataFromLocalStorage(id)
      }

      return true
    } catch (error) {
      console.error("Error deleting image:", error)
      return false
    }
  }

  public getImages(): ImageMetadata[] {
    try {
      const imagesJson = localStorage.getItem("signLanguageImages")
      if (!imagesJson) return []
      return JSON.parse(imagesJson)
    } catch (error) {
      console.error("Error getting images:", error)
      return []
    }
  }

  public getImagesByWord(word: string): ImageMetadata[] {
    return this.getImages().filter((img) => img.word.toLowerCase() === word.toLowerCase())
  }

  public getImageMetadata(id: string): ImageMetadata | null {
    const images = this.getImages()
    return images.find((img) => img.id === id) || null
  }

  private async fileToDataURL(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private async uploadToVercelBlob(word: string, dataUrl: string, id: string): Promise<string | null> {
    try {
      // Extract the base64 data and determine the file extension
      let fileExtension = "png"
      let base64Data = dataUrl

      if (dataUrl.startsWith("data:image/")) {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          fileExtension = matches[1]
          base64Data = matches[2]
        }
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data)
      const byteArrays = []
      for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512)
        const byteNumbers = new Array(slice.length)
        for (let j = 0; j < slice.length; j++) {
          byteNumbers[j] = slice.charCodeAt(j)
        }
        const byteArray = new Uint8Array(byteNumbers)
        byteArrays.push(byteArray)
      }
      const blob = new Blob(byteArrays, { type: `image/${fileExtension}` })

      // Create form data
      const formData = new FormData()
      formData.append("file", blob, `${word.replace(/\s+/g, "_")}_${id}.${fileExtension}`)
      formData.append("word", word)

      // Upload to Vercel Blob via API route
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload to Vercel Blob: ${response.statusText}`)
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Error uploading to Vercel Blob:", error)
      return null
    }
  }

  private async deleteFromVercelBlob(url: string): Promise<boolean> {
    try {
      const response = await fetch("/api/delete-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete from Vercel Blob: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error("Error deleting from Vercel Blob:", error)
      return false
    }
  }

  private async uploadToGitHub(word: string, dataUrl: string, id: string): Promise<string | null> {
    try {
      // Extract the base64 data and determine the file extension
      let fileExtension = "png"
      let base64Data = dataUrl

      if (dataUrl.startsWith("data:image/")) {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          fileExtension = matches[1]
          base64Data = matches[2]
        }
      }

      // Upload to GitHub via API route
      const response = await fetch("/api/save-image-to-github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word,
          id,
          data: base64Data,
          fileExtension,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to upload to GitHub: ${response.statusText}`)
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Error uploading to GitHub:", error)
      return null
    }
  }

  private async deleteFromGitHub(url: string): Promise<boolean> {
    try {
      const response = await fetch("/api/delete-image-from-github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete from GitHub: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error("Error deleting from GitHub:", error)
      return false
    }
  }

  private saveMetadataToLocalStorage(metadata: ImageMetadata): void {
    try {
      const images = this.getImages()
      const existingIndex = images.findIndex((img) => img.id === metadata.id)

      if (existingIndex >= 0) {
        images[existingIndex] = metadata
      } else {
        images.push(metadata)
      }

      localStorage.setItem("signLanguageImages", JSON.stringify(images))
    } catch (error) {
      console.error("Error saving metadata to localStorage:", error)
    }
  }

  private removeMetadataFromLocalStorage(id: string): void {
    try {
      const images = this.getImages()
      const updatedImages = images.filter((img) => img.id !== id)
      localStorage.setItem("signLanguageImages", JSON.stringify(updatedImages))
    } catch (error) {
      console.error("Error removing metadata from localStorage:", error)
    }
  }
}

// Create a singleton instance
let imageStorageService: ImageStorageService | null = null

export function getImageStorageService(options?: StorageOptions): ImageStorageService {
  if (!imageStorageService && typeof window !== "undefined") {
    imageStorageService = new ImageStorageService(options)
  }
  return imageStorageService as ImageStorageService
}
