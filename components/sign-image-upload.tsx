"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Upload, ImageIcon, Loader2, Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { put } from "@vercel/blob"
import { modelManager } from "@/lib/model-manager"

interface SignImageUploadProps {
  onImageUploaded?: (imageData: { word: string; url: string }) => void
}

export function SignImageUpload({ onImageUploaded }: SignImageUploadProps) {
  const [word, setWord] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!word.trim()) {
      toast({
        title: "Missing Word",
        description: "Please enter a word or phrase for this sign.",
        variant: "destructive",
      })
      return
    }

    if (!fileInputRef.current?.files?.[0]) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadComplete(false)

    try {
      const file = fileInputRef.current.files[0]
      const imageId = Date.now().toString()

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      // Upload to Vercel Blob
      const blob = await put(
        `${word.trim().toLowerCase().replace(/\s+/g, "-")}-${imageId}.${file.name.split(".").pop()}`,
        file,
        {
          access: "public",
          addRandomSuffix: false,
          contentType: file.type,
          metadata: {
            word: word.trim(),
            uploadedAt: new Date().toISOString(),
          },
        },
      )

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadComplete(true)

      // Add to model manager for local reference
      modelManager.addSignImage(word.trim(), blob.url, imageId)

      // Also try to upload to GitHub if configured
      try {
        if (modelManager.isGitHubConfigured()) {
          // Convert file to base64
          const base64Data = await fileToBase64(file)

          // Save to GitHub via API
          const response = await fetch("/api/github/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: modelManager.getGitHubConfig()?.owner,
              repo: modelManager.getGitHubConfig()?.repo,
              branch: modelManager.getGitHubConfig()?.branch || "main",
              path: `images/${word.trim().toLowerCase().replace(/\s+/g, "-")}-${imageId}.${file.name.split(".").pop()}`,
              content: base64Data,
              message: `Add sign image for ${word}`,
              token: modelManager.getGitHubConfig()?.token,
            }),
          })

          if (!response.ok) {
            console.error("GitHub upload failed, but Blob upload succeeded")
          }
        }
      } catch (githubError) {
        console.error("GitHub upload error (non-critical):", githubError)
        // Continue even if GitHub upload fails since we already saved to Blob
      }

      // Callback with uploaded image data
      if (onImageUploaded) {
        onImageUploaded({
          word: word.trim(),
          url: blob.url,
        })
      }

      toast({
        title: "Upload Successful",
        description: `Sign image for "${word}" has been uploaded.`,
      })

      // Reset form after a short delay to show success state
      setTimeout(() => {
        setWord("")
        setPreviewUrl(null)
        setUploadProgress(0)
        setUploadComplete(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }, 2000)
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "There was an error uploading your image. Please try again.",
        variant: "destructive",
      })
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  // Helper function to convert File to base64
  const fileToBase64 = async (file: File): Promise<string> => {
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

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader>
        <CardTitle>Upload Sign Image</CardTitle>
        <CardDescription>Add new sign language images with their corresponding words or phrases</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="word">Word or Phrase</Label>
            <Input
              id="word"
              placeholder="Enter the word or phrase (e.g., Hello, Thank You)"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="image">Sign Language Image</Label>
            <div className="flex items-center gap-4">
              <Input
                id="image"
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Image
              </Button>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              previewUrl
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                : "border-gray-300 dark:border-gray-700"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="aspect-square h-40 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Drag and drop an image here, or click to select
                </p>
              </>
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!previewUrl || !word || isUploading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : uploadComplete ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Upload Complete
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
