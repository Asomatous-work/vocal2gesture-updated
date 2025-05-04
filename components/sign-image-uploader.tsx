"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Upload, X, ImageIcon, RefreshCw } from "lucide-react"
import { upload } from "@vercel/blob/client"

interface UploadedImage {
  id: string
  word: string
  url: string
}

export function SignImageUploader() {
  const [word, setWord] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
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
      const fileName = `sign-${word.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${file.name.split(".").pop()}`

      // Upload to Vercel Blob
      const { url } = await upload(fileName, file, { access: "public" })

      // Add to uploaded images
      const newImage: UploadedImage = {
        id: Date.now().toString(),
        word: word.trim(),
        url,
      }

      setUploadedImages((prev) => [...prev, newImage])

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

      // Store in localStorage for persistence
      const storedImages = JSON.parse(localStorage.getItem("signLanguageImages") || "[]")
      localStorage.setItem("signLanguageImages", JSON.stringify([...storedImages, newImage]))
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your image.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id))

    // Update localStorage
    const storedImages = JSON.parse(localStorage.getItem("signLanguageImages") || "[]")
    localStorage.setItem(
      "signLanguageImages",
      JSON.stringify(storedImages.filter((img: UploadedImage) => img.id !== id)),
    )

    toast({
      title: "Image Removed",
      description: "The sign language image has been removed.",
    })
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Sign Language Image Uploader</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload images for sign language gestures to enhance the speech-to-sign translation.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader>
              <CardTitle>Upload Sign Image</CardTitle>
              <CardDescription>Add new sign language images with their corresponding words or phrases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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

                {previewUrl && (
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
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!previewUrl || !word || isUploading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Sign Image
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
            <CardHeader>
              <CardTitle>Uploaded Sign Images</CardTitle>
              <CardDescription>Manage your collection of sign language images</CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((image) => (
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
    </div>
  )
}
