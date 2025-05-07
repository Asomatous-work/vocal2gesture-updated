"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Upload,
  X,
  ImageIcon,
  RefreshCw,
  Github,
  Save,
  AlertTriangle,
  Key,
  FileUp,
  Search,
  Filter,
  Tag,
  Check,
  Edit,
  Plus,
} from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface UploadedImage {
  id: string
  word: string
  url: string
  timestamp: string
  dataUrl?: string // Base64 data URL for the image
  category?: string
  tags?: string[]
}

interface GitHubSettings {
  owner: string
  repo: string
  branch: string
  token: string
}

interface Category {
  id: string
  name: string
  description?: string
  color?: string
}

export function EnhancedSignImageUploader() {
  const [word, setWord] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [filteredImages, setFilteredImages] = useState<UploadedImage[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [storageQuotaExceeded, setStorageQuotaExceeded] = useState(false)
  const [directUploadToGithub, setDirectUploadToGithub] = useState(false)
  const [showGitHubDialog, setShowGitHubDialog] = useState(false)
  const [githubSettings, setGithubSettings] = useState<GitHubSettings>({
    owner: "",
    repo: "",
    branch: "main",
    token: "",
  })
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [categories, setCategories] = useState<Category[]>([
    { id: "alphabet", name: "Alphabet", color: "blue" },
    { id: "numbers", name: "Numbers", color: "green" },
    { id: "common", name: "Common Phrases", color: "purple" },
    { id: "emotions", name: "Emotions", color: "pink" },
    { id: "actions", name: "Actions", color: "orange" },
    { id: "objects", name: "Objects", color: "red" },
  ])
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: "", description: "", color: "blue" })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([
    "beginner",
    "intermediate",
    "advanced",
    "essential",
    "casual",
    "formal",
    "emergency",
  ])
  const [newTag, setNewTag] = useState("")
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editWord, setEditWord] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load images from localStorage on component mount
  useEffect(() => {
    try {
      // Load images
      const storedImages = JSON.parse(localStorage.getItem("signLanguageImages") || "[]")
      setUploadedImages(storedImages)
      setFilteredImages(storedImages)

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
            owner: config.owner || "",
            repo: config.repo || "",
            branch: config.branch || "main",
            token: config.token || "",
          })
        } catch (e) {
          console.error("Error parsing GitHub settings:", e)
        }
      }

      // Load categories
      const storedCategories = localStorage.getItem("signLanguageCategories")
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories))
      }

      // Load tags
      const storedTags = localStorage.getItem("signLanguageTags")
      if (storedTags) {
        setAvailableTags(JSON.parse(storedTags))
      }
    } catch (error) {
      console.error("Error loading stored images:", error)
    }
  }, [toast])

  // Filter images when search term, category, or tags change
  useEffect(() => {
    let filtered = [...uploadedImages]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((img) => img.word.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((img) => img.category === selectedCategory)
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((img) => selectedTags.every((tag) => img.tags?.includes(tag)))
    }

    setFilteredImages(filtered)
  }, [uploadedImages, searchTerm, selectedCategory, selectedTags])

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

    try {
      const file = fileInputRef.current.files[0]
      const imageId = Date.now().toString()

      // Create form data
      const formData = new FormData()
      formData.append("file", file)
      formData.append("word", word.trim())
      formData.append("id", imageId)

      if (selectedCategory) {
        formData.append("category", selectedCategory)
      }

      if (selectedTags.length > 0) {
        formData.append("tags", JSON.stringify(selectedTags))
      }

      // Simulate upload progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += 5
        if (progress > 90) {
          clearInterval(progressInterval)
        }
        setUploadProgress(progress)
      }, 100)

      // Upload to our API
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const result = await response.json()

      if (result.success) {
        // Add to uploaded images
        const newImage: UploadedImage = {
          id: imageId,
          word: word.trim(),
          url: result.url,
          timestamp: new Date().toISOString(),
          category: selectedCategory,
          tags: selectedTags,
        }

        const updatedImages = [...uploadedImages, newImage]
        setUploadedImages(updatedImages)

        // Try to store in localStorage for persistence
        try {
          localStorage.setItem("signLanguageImages", JSON.stringify(updatedImages))
        } catch (error) {
          console.error("Error saving to localStorage:", error)
          setStorageQuotaExceeded(true)
        }

        // Complete the progress bar
        setUploadProgress(100)
        setTimeout(() => {
          clearInterval(progressInterval)

          // Reset form
          setWord("")
          setPreviewUrl(null)
          setSelectedCategory("")
          setSelectedTags([])
          setUploadProgress(0)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }

          toast({
            title: "Upload Successful",
            description: `Sign image for "${word}" has been uploaded.`,
          })
        }, 500)
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "There was an error uploading your image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Add image to model manager for slideshow
  const addImageToModelManager = (word: string, url: string, category?: string, tags?: string[]) => {
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
            addImageToModelManager(image.word, image.url, image.category, image.tags)
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
          category: img.category,
          tags: img.tags,
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

  const addNewCategory = () => {
    if (!newCategory.name) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for the category.",
        variant: "destructive",
      })
      return
    }

    const categoryId = newCategory.name.toLowerCase().replace(/\s+/g, "-")

    // Check if category already exists
    if (categories.some((c) => c.id === categoryId)) {
      toast({
        title: "Category Exists",
        description: "A category with this name already exists.",
        variant: "destructive",
      })
      return
    }

    const updatedCategories = [
      ...categories,
      {
        id: categoryId,
        name: newCategory.name,
        description: newCategory.description,
        color: newCategory.color,
      },
    ]

    setCategories(updatedCategories)

    // Save to localStorage
    localStorage.setItem("signLanguageCategories", JSON.stringify(updatedCategories))

    // Reset form and close dialog
    setNewCategory({ name: "", description: "", color: "blue" })
    setShowCategoryDialog(false)

    toast({
      title: "Category Added",
      description: `Category "${newCategory.name}" has been added.`,
    })
  }

  const addNewTag = () => {
    if (!newTag) {
      toast({
        title: "Missing Tag",
        description: "Please enter a tag name.",
        variant: "destructive",
      })
      return
    }

    // Check if tag already exists
    if (availableTags.includes(newTag)) {
      toast({
        title: "Tag Exists",
        description: "This tag already exists.",
        variant: "destructive",
      })
      return
    }

    const updatedTags = [...availableTags, newTag]
    setAvailableTags(updatedTags)

    // Save to localStorage
    localStorage.setItem("signLanguageTags", JSON.stringify(updatedTags))

    // Reset form and close dialog
    setNewTag("")
    setShowTagDialog(false)

    toast({
      title: "Tag Added",
      description: `Tag "${newTag}" has been added.`,
    })
  }

  const viewImageDetails = (image: UploadedImage) => {
    setSelectedImage(image)
    setEditWord(image.word)
    setEditCategory(image.category || "")
    setEditTags(image.tags || [])
    setShowImageDialog(true)
  }

  const updateImage = () => {
    if (!selectedImage) return

    if (!editWord.trim()) {
      toast({
        title: "Missing Word",
        description: "Please enter a word or phrase for this sign.",
        variant: "destructive",
      })
      return
    }

    // Update the image
    const updatedImages = uploadedImages.map((img) =>
      img.id === selectedImage.id ? { ...img, word: editWord, category: editCategory, tags: editTags } : img,
    )

    setUploadedImages(updatedImages)

    // Update localStorage
    try {
      localStorage.setItem("signLanguageImages", JSON.stringify(updatedImages))

      // Update in model manager
      const oldGesture = modelManager.getGesture(selectedImage.word)
      if (oldGesture && oldGesture.images) {
        // Remove from old gesture if word changed
        if (selectedImage.word !== editWord) {
          oldGesture.images = oldGesture.images.filter((url) => url !== selectedImage.url)
          modelManager.saveGesture(oldGesture)

          // Add to new gesture
          addImageToModelManager(editWord, selectedImage.url, editCategory, editTags)
        }
      }
    } catch (error) {
      console.error("Error updating localStorage:", error)
    }

    // Close dialog and reset state
    setShowImageDialog(false)
    setSelectedImage(null)
    setEditMode(false)

    toast({
      title: "Image Updated",
      description: "The sign language image has been updated.",
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
        <h2 className="text-2xl md:text-4xl font-bold mb-4">Sign Language Image Manager</h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload, organize, and manage sign language images for speech-to-sign translation.
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
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
                  <Label htmlFor="category">Category (Optional)</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="tags">Tags (Optional)</Label>
                    <Button variant="ghost" size="sm" onClick={() => setShowTagDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-10">
                    {selectedTags.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No tags selected</span>
                    ) : (
                      selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                          />
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableTags
                      .filter((tag) => !selectedTags.includes(tag))
                      .slice(0, 10)
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => setSelectedTags([...selectedTags, tag])}
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
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
        </TabsContent>

        <TabsContent value="gallery">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sign Language Gallery</CardTitle>
                <CardDescription>Browse and manage your collection of sign language images</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveAllImages}
                  disabled={uploadedImages.length === 0 || isSaving || isSavingToGitHub}
                >
                  {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save All"}
                </Button>
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
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search signs..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setSelectedTags([])}>
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                    <span className="text-sm font-medium mr-2">Filtered by:</span>
                    {selectedTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        />
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>
                      Clear All
                    </Button>
                  </div>
                )}

                {isSavingToGitHub ? (
                  // Show skeletons during GitHub saving
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="aspect-square rounded-md" />
                    ))}
                  </div>
                ) : filteredImages.length > 0 ? (
                  // Show actual images
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <div
                          className="aspect-square overflow-hidden rounded-md bg-muted cursor-pointer"
                          onClick={() => viewImageDetails(image)}
                        >
                          <img
                            src={image.url || "/placeholder.svg"}
                            alt={image.word}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          {image.category && (
                            <div className="absolute top-2 left-2">
                              <Badge variant="secondary">
                                {categories.find((c) => c.id === image.category)?.name || image.category}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                          <p className="text-white font-medium text-center px-2 mb-2">{image.word}</p>
                          {image.tags && image.tags.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 px-2">
                              {image.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-white border-white text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {image.tags.length > 3 && (
                                <Badge variant="outline" className="text-white border-white text-xs">
                                  +{image.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
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
                ) : (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-6 mb-4">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Images Found</h3>
                    <p className="text-muted-foreground max-w-sm">
                      {uploadedImages.length > 0
                        ? "No images match your current filters. Try adjusting your search criteria."
                        : "Upload sign language images to build your collection for speech-to-sign translation."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize your sign language images into categories</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowCategoryDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="overflow-hidden">
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <Badge variant="outline">
                            {uploadedImages.filter((img) => img.category === category.id).length} images
                          </Badge>
                        </div>
                        {category.description && <CardDescription>{category.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category.id)
                              setActiveTab("gallery")
                            }}
                          >
                            <Search className="mr-2 h-4 w-4" />
                            View Images
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Tag className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Categories Yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Create categories to organize your sign language images.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>Configure GitHub repository for cross-device storage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                <Button onClick={saveGitHubSettings} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Save GitHub Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category to organize your sign language images.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Greetings, Numbers, Emotions"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="category-description">Description (Optional)</Label>
              <Input
                id="category-description"
                placeholder="Brief description of this category"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="category-color">Color</Label>
              <Select value={newCategory.color} onValueChange={(color) => setNewCategory({ ...newCategory, color })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addNewCategory} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Tag</DialogTitle>
            <DialogDescription>Create a new tag to categorize your sign language images.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                placeholder="e.g., beginner, essential, formal"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
            </div>
            <div className="bg-muted p-4 rounded-md">
              <h4 className="text-sm font-medium mb-2">Available Tags</h4>
              <ScrollArea className="h-32">
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addNewTag} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Details Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Image Details" : "Image Details"}</DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update information for this sign language image"
                : "View details for this sign language image"}
            </DialogDescription>
          </DialogHeader>

          {selectedImage && (
            <div className="grid gap-4 py-4">
              <div className="aspect-square max-h-64 overflow-hidden rounded-md bg-muted mx-auto">
                <img
                  src={selectedImage.url || "/placeholder.svg"}
                  alt={selectedImage.word}
                  className="h-full w-full object-contain"
                />
              </div>

              {editMode ? (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="edit-word">Word or Phrase</Label>
                    <Input id="edit-word" value={editWord} onChange={(e) => setEditWord(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="edit-tags">Tags</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-10">
                      {editTags.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No tags selected</span>
                      ) : (
                        editTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                            />
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableTags
                        .filter((tag) => !editTags.includes(tag))
                        .slice(0, 10)
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setEditTags([...editTags, tag])}
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="font-medium">Word/Phrase:</div>
                    <div className="col-span-2">{selectedImage.word}</div>

                    <div className="font-medium">Category:</div>
                    <div className="col-span-2">
                      {selectedImage.category
                        ? categories.find((c) => c.id === selectedImage.category)?.name || selectedImage.category
                        : "None"}
                    </div>

                    <div className="font-medium">Tags:</div>
                    <div className="col-span-2">
                      {selectedImage.tags && selectedImage.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedImage.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "None"
                      )}
                    </div>

                    <div className="font-medium">Added:</div>
                    <div className="col-span-2">{new Date(selectedImage.timestamp).toLocaleString()}</div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={updateImage}>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowImageDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => setEditMode(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
