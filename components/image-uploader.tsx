"use client"

import type React from "react"

import { useState, useRef, type ChangeEvent } from "react"
import { Upload, X, Check, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { getImageStorageService } from "@/lib/image-storage-service"

export function ImageUploader() {
  const [word, setWord] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageStorageService = useRef(getImageStorageService())

  const handleWordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFile(file)
  }

  const handleFile = (file: File | null) => {
    setError(null)

    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    setSelectedFile(file)

    // Create preview URL
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0] || null
    handleFile(file)
  }

  const handleUpload = async () => {
    if (!word.trim()) {
      setError("Please enter a word")
      return
    }

    if (!selectedFile) {
      setError("Please select an image")
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const result = await imageStorageService.current.uploadImage(word.trim(), selectedFile)

      if (result) {
        setUploadSuccess(true)
        setTimeout(() => {
          setUploadSuccess(false)
          resetForm()
        }, 2000)
      } else {
        throw new Error("Failed to upload image")
      }
    } catch (err) {
      console.error("Error uploading image:", err)
      setError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setWord("")
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Upload Sign Language Images</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Upload images for sign language words to be used in the Speak to Sign feature.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="word">Word or Phrase</Label>
              <Input
                id="word"
                value={word}
                onChange={handleWordChange}
                placeholder="Enter the word or phrase for this sign"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sign Image</Label>
              <div
                className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={previewUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="max-h-48 max-w-full object-contain mb-4"
                    />
                    <p className="text-sm text-gray-500">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                      <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-1">
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={resetForm} disabled={isUploading || (!word && !selectedFile)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !word || !selectedFile} className="relative">
              {isUploading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : uploadSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Uploaded!
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
