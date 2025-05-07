"use client"

import { useState, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

interface SignImageUploadProps {
  onImageUploaded?: (imageUrl: string, word: string) => void
  className?: string
}

export function SignImageUpload({ onImageUploaded, className }: SignImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [word, setWord] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0]
        setFile(selectedFile)

        // Create preview
        const objectUrl = URL.createObjectURL(selectedFile)
        setPreview(objectUrl)

        // Try to extract word from filename
        const filename = selectedFile.name.split(".")[0]
        if (filename && !word) {
          setWord(filename)
        }

        setError(null)
      }
    },
    [word],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an image to upload")
      return
    }

    if (!word.trim()) {
      setError("Please enter a word for this sign")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("word", word.trim().toLowerCase())

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload image")
      }

      const data = await response.json()
      setSuccess(`Successfully uploaded image for "${word}"`)

      // Reset form
      setFile(null)
      setWord("")
      setPreview(null)

      // Notify parent component
      if (onImageUploaded) {
        onImageUploaded(data.url, word.trim().toLowerCase())
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading the image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-center">Upload Sign Image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
            preview ? "border-primary/70" : "",
          )}
        >
          <input {...getInputProps()} ref={fileInputRef} />

          {preview ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={preview || "/placeholder.svg"}
                alt="Preview"
                className="max-h-48 max-w-full object-contain rounded-md"
              />
              <p className="text-sm text-gray-500">Click or drag to change image</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                {isDragActive ? "Drop the image here..." : "Drag and drop an image, or click to select"}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="word" className="block text-sm font-medium text-gray-700 mb-1">
            Sign Word
          </label>
          <Input
            id="word"
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Enter the word for this sign"
            className="w-full"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleClear} disabled={isUploading || (!file && !preview)}>
          Clear
        </Button>
        <Button onClick={handleUpload} disabled={isUploading || !file || !word.trim()}>
          {isUploading ? <LoadingSpinner className="mr-2" size="sm" /> : null}
          {isUploading ? "Uploading..." : "Upload Sign Image"}
        </Button>
      </CardFooter>
    </Card>
  )
}
