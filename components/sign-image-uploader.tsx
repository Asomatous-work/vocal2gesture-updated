"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Upload, X, ImageIcon, RefreshCw, Github, Save, AlertTriangle, Key, FileUp } from "lucide-react"
import { modelManager } from "@/lib/model-manager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton-loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UploadedImage {
  id: string
  word: string
  url: string
  timestamp: string
  dataUrl?: string // Base64 data URL for the image
}

interface GitHubSettings {
  owner: string
  repo: string
  branch: string
  token: string
}

export function SignImageUploader() {
  const [word, setWord] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [storageQuotaExceeded, setStorageQuotaExceeded] = useState(false)
  const [directUploadToGithub, setDirectUploadToGithub] = useState(false)
  const [showGitHubDialog, setShowGitHubDialog] = useState(false)
  const [githubSettings, setGithubSettings] = useState<GitHubSettings>({
    owner: "Asomatous-work",
    repo: "vocal2gesture-updated",
    branch: "main",
    token: "",
  })
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load images from localStorage on component mount
  useEffect(() => {
    try {
      const storedImages = JSON.parse(localStorage.getItem("signLanguageImages") || "[]")
      setUploadedImages(storedImages)

      // Check if storage quota is exceeded
      setStorageQuotaExceeded(modelManager.isStorageQuotaExceeded())

      // If storage quota is exceeded, recommend direct GitHub upload
      if (modelManager.isStorageQuotaExceeded()) {
        setDirectUploadToGithub(true)
        toast({
          title: "Storage Limit Reached",
          description: "Local storage limit reached. Images will be uploaded directly to GitHub.",
          variant: "warning",
        })
      }

      // Load GitHub settings
      const settings = localStorage.getItem("githubSettings")
      if (settings) {
        try {
          const config = JSON.parse(settings)
          setGithubSettings({
            owner: config.owner || "Asomatous-work",
            repo: config.repo || "vocal2gesture-updated",
            branch: config.branch || "main",
            token: config.token || "",
          })
        } catch (e) {
          console.error("Error parsing GitHub settings:", e)
        }
      }
    } catch (error) {
      console.error("Error loading stored images:", error)
    }
  }, [toast])

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropZone = dropZoneRef.current
    if (!dropZone) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    }

    dropZone.addEventListener("dragover", handleDragOver)
    dropZone.addEventListener("dragleave", handleDragLeave)
    dropZone.addEventListener("drop", handleDrop)

    return () => {
      dropZone.removeEventListener("dragover", handleDragOver)
      dropZone.removeEventListener("dragleave", handleDragLeave)
      dropZone.removeEventListener("drop", handleDrop)
    }
  }, [])

  // Handle dropped or selected files
  const handleFiles = (files: FileList) => {
    const file = files[0]
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

    setIsProcessingImage(true)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
      setIsProcessingImage(false)

      // If we have a file input, update it to reflect the dropped file
      if (fileInputRef.current) {
        // Create a new DataTransfer object
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInputRef.current.files = dataTransfer.files
      }
    }
    reader.onerror = () => {
      toast({
        title: "Error Processing Image",
        description: "There was an error processing your image. Please try a different file.",
        variant: "destructive",
      })
      setIsProcessingImage(false)
    }
    reader.readAsDataURL(file)
  }

  // Update the handleFileChange function to include processing state
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
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

    if (!previewUrl || !fileInputRef.current?.files?.[0]) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const file = fileInputRef.current.files[0]

      // Read file as data URL (base64)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Generate a unique ID for the image
      const imageId = Date.now().toString()

      // Create a URL for the image (using the data URL directly)
      const imageUrl = dataUrl

      // Add to uploaded images
      const newImage: UploadedImage = {
        id: imageId,
        word: word.trim(),
        url: imageUrl,
        dataUrl: dataUrl,
        timestamp: new Date().toISOString(),
      }

      const updatedImages = [...uploadedImages, newImage]
      setUploadedImages(updatedImages)

      // If direct upload to GitHub is enabled, skip localStorage and model manager
      if (directUploadToGithub) {
        // Check if we have GitHub settings
        if (!githubSettings.token) {
          setShowGitHubDialog(true)
          // We'll continue the upload after the dialog is closed
        } else {
          await saveToGitHubDirectly([newImage])
        }
      } else {
        // Try to store in localStorage for persistence
        try {
          localStorage.setItem("signLanguageImages", JSON.stringify(updatedImages))

          // Add to model manager for slideshow
          addImageToModelManager(newImage.word, newImage.url)
        } catch (error) {
          console.error("Error saving to localStorage:", error)
          setStorageQuotaExceeded(true)
          setDirectUploadToGithub(true)

          // Notify user about storage quota
          toast({
            title: "Storage Limit Reached",
            description: "Local storage limit reached. Switching to direct GitHub upload.",
            variant: "warning",
          })

          // Show GitHub settings dialog if token is missing
          if (!githubSettings.token) {
            setShowGitHubDialog(true)
          } else {
            await saveToGitHubDirectly([newImage])
          }
        }
      }

      // Reset form
      setWord("")
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      toast({
        title: "Upload Successful",
        description: `Sign image for "${word}" has been uploaded.`,
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Add image to model manager for slideshow
  const addImageToModelManager = (word: string, url: string) => {
    try {
      // Get existing gesture or create new one
      const gesture = modelManager.getGesture(word)

      if (gesture) {
        // Add image to existing gesture
        gesture.images = [...(gesture.images || []), url]
        modelManager.saveGesture(gesture)
      } else {
        // Create new gesture with this image
        modelManager.saveGesture({
          name: word,
          landmarks: [],
          samples: 0,
          images: [url],
        })
      }

      // Check if storage quota was exceeded
      if (modelManager.isStorageQuotaExceeded()) {
        setStorageQuotaExceeded(true)
        setDirectUploadToGithub(true)
      }
    } catch (error) {
      console.error("Error adding image to model manager:", error)
      setStorageQuotaExceeded(true)
      setDirectUploadToGithub(true)
    }
  }

  const saveAllImages = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No Images",
        description: "There are no images to save.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // If storage quota is exceeded, save directly to GitHub
      if (storageQuotaExceeded || directUploadToGithub) {
        // Check if we have GitHub settings
        if (!githubSettings.token) {
          setShowGitHubDialog(true)
          // We'll continue the save after the dialog is closed
          setIsSaving(false)
          return
        }

        await saveToGitHubDirectly(uploadedImages)
      } else {
        // Try to save to localStorage
        try {
          localStorage.setItem("signLanguageImages", JSON.stringify(uploadedImages))

          // Update model manager with all images
          for (const image of uploadedImages) {
            addImageToModelManager(image.word, image.url)
          }
        } catch (error) {
          console.error("Save error:", error)
          setStorageQuotaExceeded(true)
          setDirectUploadToGithub(true)

          // Show GitHub settings dialog if token is missing
          if (!githubSettings.token) {
            setShowGitHubDialog(true)
            setIsSaving(false)
            return
          } else {
            await saveToGitHubDirectly(uploadedImages)
          }
        }
      }

      toast({
        title: "Images Saved",
        description: "All sign images have been saved successfully.",
      })
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your images.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Save GitHub settings
  const saveGitHubSettings = () => {
    if (!githubSettings.owner || !githubSettings.repo) {
      toast({
        title: "Missing Information",
        description: "Please enter both owner/organization and repository name.",
        variant: "destructive",
      })
      return false
    }

    if (!githubSettings.token) {
      setTokenError("A personal access token is required for GitHub API access")
      return false
    }

    setTokenError(null)

    try {
      // Save GitHub settings
      modelManager.initGitHub(githubSettings)
      setShowGitHubDialog(false)
      return true
    } catch (error) {
      console.error("Error saving GitHub settings:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your GitHub settings.",
        variant: "destructive",
      })
      return false
    }
  }

  // New function to save directly to GitHub using the real API
  const saveToGitHubDirectly = async (images: UploadedImage[]) => {
    setIsSavingToGitHub(true)

    try {
      // Configure GitHub settings if not already set
      if (!githubSettings.token) {
        throw new Error("GitHub token not configured")
      }

      // Initialize GitHub in model manager
      modelManager.initGitHub(githubSettings)

      // Save each image to GitHub
      for (const image of images) {
        // Skip images that don't have a data URL
        if (!image.url.startsWith("data:")) continue

        // Extract the base64 data and determine the file extension
        let fileExtension = "png"
        let base64Data = image.url

        if (image.url.startsWith("data:image/")) {
          const matches = image.url.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/)
          if (matches && matches.length === 3) {
            fileExtension = matches[1]
            base64Data = matches[2]
          } else {
            // If we can't parse the data URL, skip this image
            continue
          }
        }

        // Create a filename based on the word and ID
        const filename = `${image.word.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${image.id}.${fileExtension}`
        const path = `images/${filename}`

        // Save the image to GitHub
        const response = await fetch("/api/github/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner: githubSettings.owner,
            repo: githubSettings.repo,
            branch: githubSettings.branch || "main",
            path,
            content: base64Data,
            message: `Add sign image for ${image.word}`,
            token: githubSettings.token,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`Failed to save image ${filename}:`, errorData.error)
          throw new Error(errorData.error || "Failed to save image to GitHub")
        }
      }

      // Also save the metadata file with all images
      const metadata = {
        images: images.map((img) => ({
          id: img.id,
          word: img.word,
          timestamp: img.timestamp,
        })),
        lastUpdated: new Date().toISOString(),
      }

      const metadataResponse = await fetch("/api/github/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: githubSettings.owner,
          repo: githubSettings.repo,
          branch: githubSettings.branch || "main",
          path: "sign-images-metadata.json",
          content: JSON.stringify(metadata, null, 2),
          message: "Update sign images metadata",
          token: githubSettings.token,
        }),
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        console.error("Failed to save metadata:", errorData.error)
        throw new Error(errorData.error || "Failed to save metadata to GitHub")
      }

      return true
    } catch (error: any) {
      console.error("GitHub direct save error:", error)

      // Check for specific error messages
      if (error.message?.includes("Invalid GitHub token")) {
        setTokenError("Invalid GitHub token. Please check your token and try again.")
        setShowGitHubDialog(true)
      } else {
        toast({
          title: "GitHub Save Error",
          description: error.message || "There was an error saving to GitHub.",
          variant: "destructive",
        })
      }

      throw error
    } finally {
      setIsSavingToGitHub(false)
    }
  }

  const saveToGitHub = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No Images",
        description: "There are no images to save to GitHub.",
        variant: "destructive",
      })
      return
    }

    // Check if we have GitHub settings
    if (!githubSettings.token) {
      setShowGitHubDialog(true)
      return
    }

    setIsSavingToGitHub(true)

    try {
      await saveToGitHubDirectly(uploadedImages)

      toast({
        title: "GitHub Save Successful",
        description: "Your sign images have been saved to GitHub for cross-device usage.",
      })
    } catch (error) {
      console.error("GitHub save error:", error)
      // Error is already handled in saveToGitHubDirectly
    } finally {
      setIsSavingToGitHub(false)
    }
  }

  const removeImage = (id: string) => {
    // Find the image to remove
    const imageToRemove = uploadedImages.find((img) => img.id === id)

    // Remove from uploaded images
    setUploadedImages((prev) => prev.filter((img) => img.id !== id))

    // Update localStorage if not in direct GitHub mode
    if (!directUploadToGithub) {
      try {
        const updatedImages = uploadedImages.filter((img) => img.id !== id)
        localStorage.setItem("signLanguageImages", JSON.stringify(updatedImages))

        // If we found the image, also remove it from the model manager
        if (imageToRemove) {
          try {
            const gesture = modelManager.getGesture(imageToRemove.word)
            if (gesture && gesture.images) {
              // Filter out the image URL
              gesture.images = gesture.images.filter((url) => url !== imageToRemove.url)
              modelManager.saveGesture(gesture)
            }
          } catch (error) {
            console.error("Error removing image from model manager:", error)
          }
        }
      } catch (error) {
        console.error("Error updating localStorage:", error)
      }
    }

    toast({
      title: "Image Removed",
      description: "The sign language image has been removed.",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <h2 className="text-2xl md:text-4xl font-bold mb-4">Sign Language Image Uploader</h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload images for sign language gestures to enhance the speech-to-sign translation.
        </p>
      </motion.div>

      {storageQuotaExceeded && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Storage Limit Reached</AlertTitle>
          <AlertDescription>
            Your browser's storage limit has been reached. Images will be uploaded directly to GitHub instead of being
            stored locally.
          </AlertDescription>
        </Alert>
      )}

      {directUploadToGithub && !storageQuotaExceeded && (
        <Alert className="mb-6">
          <Github className="h-4 w-4" />
          <AlertTitle>Direct GitHub Upload Mode</AlertTitle>
          <AlertDescription>Images will be uploaded directly to GitHub for cross-device usage.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Upload Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader>
              <CardTitle>Upload Sign Image</CardTitle>
              <CardDescription>
                {directUploadToGithub
                  ? "Add new sign language images directly to GitHub"
                  : "Add new sign language images with their corresponding words or phrases"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
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
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center transition-colors ${
                    isDragging
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    Drag and drop an image here, or click the select button above
                  </p>
                </div>

                {previewUrl ? (
                  <div className="relative">
                    <div className="aspect-square max-h-64 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => {
                        setPreviewUrl(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : isProcessingImage ? (
                  <div className="aspect-square max-h-64 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                    <LoadingSpinner text="Processing image..." />
                  </div>
                ) : null}

                <Button
                  onClick={handleUpload}
                  disabled={!previewUrl || !word || isUploading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {directUploadToGithub ? "Uploading to GitHub..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      {directUploadToGithub ? <Github className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                      {directUploadToGithub ? "Upload to GitHub" : "Upload Image"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Uploaded Images */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Uploaded Sign Images</CardTitle>
                <CardDescription>
                  {directUploadToGithub
                    ? "Manage your GitHub collection of sign language images"
                    : "Manage your collection of sign language images"}
                </CardDescription>
              </div>
              <div className="hidden md:flex space-x-2">
                {!directUploadToGithub && (
                  <Button
                    size="sm"
                    onClick={saveAllImages}
                    disabled={uploadedImages.length === 0 || isSaving || isSavingToGitHub}
                  >
                    {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save All"}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={saveToGitHub}
                  disabled={uploadedImages.length === 0 || isSavingToGitHub || isSaving}
                >
                  {isSavingToGitHub ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Github className="mr-2 h-4 w-4" />
                  )}
                  {isSavingToGitHub ? "Saving..." : "Save to GitHub"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {uploadedImages.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {isSavingToGitHub
                      ? // Show skeletons during GitHub saving
                        Array.from({ length: uploadedImages.length }).map((_, index) => (
                          <Skeleton key={index} className="aspect-square rounded-md" />
                        ))
                      : // Show actual images
                        uploadedImages.map((image) => (
                          <div key={image.id} className="relative group">
                            <div className="aspect-square overflow-hidden rounded-md bg-muted">
                              <img
                                src={image.url || "/placeholder.svg"}
                                alt={image.word}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white font-medium text-center px-2">{image.word}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                  </div>
                  <div className="flex flex-col md:hidden space-y-2 mt-4">
                    {!directUploadToGithub && (
                      <Button
                        onClick={saveAllImages}
                        disabled={uploadedImages.length === 0 || isSaving || isSavingToGitHub}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save All
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={saveToGitHub}
                      disabled={uploadedImages.length === 0 || isSavingToGitHub || isSaving}
                      className="w-full"
                    >
                      {isSavingToGitHub ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving to GitHub...
                        </>
                      ) : (
                        <>
                          <Github className="mr-2 h-4 w-4" />
                          Save to GitHub
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Images Yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Upload sign language images to build your collection for speech-to-sign translation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* GitHub Settings Dialog */}
      <Dialog open={showGitHubDialog} onOpenChange={setShowGitHubDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Github className="mr-2 h-5 w-5" />
              GitHub Settings
            </DialogTitle>
            <DialogDescription>Configure your GitHub repository for storing sign language images.</DialogDescription>
          </DialogHeader>

          {tokenError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Token Error</AlertTitle>
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="github-owner">Owner/Organization</Label>
              <Input
                id="github-owner"
                placeholder="e.g., username or organization"
                value={githubSettings.owner}
                onChange={(e) => setGithubSettings({ ...githubSettings, owner: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="github-repo">Repository Name</Label>
              <Input
                id="github-repo"
                placeholder="e.g., vocal2gestures"
                value={githubSettings.repo}
                onChange={(e) => setGithubSettings({ ...githubSettings, repo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="github-branch">Branch</Label>
              <Input
                id="github-branch"
                placeholder="e.g., main"
                value={githubSettings.branch}
                onChange={(e) => setGithubSettings({ ...githubSettings, branch: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="github-token" className="flex items-center">
                <Key className="mr-1 h-4 w-4" />
                Personal Access Token (Required)
              </Label>
              <Input
                id="github-token"
                type="password"
                placeholder="GitHub personal access token with repo scope"
                value={githubSettings.token}
                onChange={(e) => {
                  setGithubSettings({ ...githubSettings, token: e.target.value })
                  setTokenError(null)
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create a token with 'repo' scope at{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  github.com/settings/tokens/new
                </a>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveGitHubSettings} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Settings & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
