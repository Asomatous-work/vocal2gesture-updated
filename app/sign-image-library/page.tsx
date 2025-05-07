"use client"

import { useEffect, useState } from "react"
import { SignImageUpload } from "@/components/sign-image-upload"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackButton } from "@/components/back-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Trash2, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { modelManager } from "@/lib/model-manager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/use-toast"

interface SignImage {
  word: string
  url: string
  id?: string
}

export default function SignImageLibraryPage() {
  const [signImages, setSignImages] = useState<SignImage[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("gallery")
  const [selectedImage, setSelectedImage] = useState<SignImage | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    setIsLoading(true)
    try {
      // First, try to load from model manager
      const localImages = modelManager.getSignImages()

      if (localImages && localImages.length > 0) {
        setSignImages(localImages)
      }

      // Also try to load from GitHub if configured
      if (modelManager.isGitHubConfigured()) {
        try {
          const response = await fetch("/api/github/list", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: modelManager.getGitHubConfig()?.owner,
              repo: modelManager.getGitHubConfig()?.repo,
              path: "images",
              token: modelManager.getGitHubConfig()?.token,
            }),
          })

          if (response.ok) {
            const data = await response.json()

            // Process GitHub images
            if (data.files && Array.isArray(data.files)) {
              const githubImages = data.files
                .filter(
                  (file: any) =>
                    file.path.endsWith(".jpg") ||
                    file.path.endsWith(".jpeg") ||
                    file.path.endsWith(".png") ||
                    file.path.endsWith(".gif"),
                )
                .map((file: any) => {
                  // Extract word from filename
                  const filename = file.path.split("/").pop() || ""
                  const wordMatch = filename.match(/^([a-z0-9-]+)-\d+\.[a-z]+$/)
                  const word = wordMatch ? wordMatch[1].replace(/-/g, " ") : filename

                  return {
                    word: word,
                    url: file.download_url,
                    id: file.sha,
                  }
                })

              // Merge with local images, giving priority to local versions
              const mergedImages = [...localImages]

              for (const githubImage of githubImages) {
                if (!mergedImages.some((img) => img.url === githubImage.url)) {
                  mergedImages.push(githubImage)
                }
              }

              setSignImages(mergedImages)

              // Also update model manager with any new images
              for (const image of githubImages) {
                if (!localImages.some((img) => img.url === image.url)) {
                  modelManager.addSignImage(image.word, image.url, image.id)
                }
              }
            }
          }
        } catch (githubError) {
          console.error("Error loading images from GitHub:", githubError)
          // Continue with local images if GitHub fails
        }
      }
    } catch (error) {
      console.error("Error loading sign images:", error)
      toast({
        title: "Error Loading Images",
        description: "There was a problem loading your sign images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUploaded = (imageData: SignImage) => {
    setSignImages((prev) => [imageData, ...prev])
    setSelectedTab("gallery")
  }

  const handleDeleteImage = async (image: SignImage) => {
    if (!confirm(`Are you sure you want to delete the sign image for "${image.word}"?`)) {
      return
    }

    try {
      // Remove from local storage via model manager
      modelManager.removeSignImage(image.word, image.url)

      // Also try to remove from GitHub if configured
      if (modelManager.isGitHubConfigured() && image.id) {
        try {
          const response = await fetch("/api/github/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: modelManager.getGitHubConfig()?.owner,
              repo: modelManager.getGitHubConfig()?.repo,
              path: `images/${image.word.replace(/\s+/g, "-")}.jpg`, // Approximate path
              message: `Delete sign image for ${image.word}`,
              token: modelManager.getGitHubConfig()?.token,
              sha: image.id,
            }),
          })

          if (!response.ok) {
            console.error("GitHub deletion failed, but local deletion succeeded")
          }
        } catch (githubError) {
          console.error("GitHub deletion error (non-critical):", githubError)
        }
      }

      // Update UI
      setSignImages((prev) => prev.filter((img) => img.url !== image.url))
      if (selectedImage?.url === image.url) {
        setSelectedImage(null)
      }

      toast({
        title: "Image Deleted",
        description: `Sign image for "${image.word}" has been removed.`,
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        title: "Deletion Failed",
        description: "There was an error deleting the image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredImages = signImages.filter((image) => image.word.toLowerCase().includes(searchQuery.toLowerCase()))

  const speakWord = (word: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <main className="container mx-auto py-6 px-4 md:py-8 max-w-6xl">
      <BackButton />
      <h1 className="text-3xl font-bold mb-6 text-center">Sign Image Library</h1>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="gallery">Image Gallery</TabsTrigger>
          <TabsTrigger value="upload">Upload New Sign</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sign Images</CardTitle>
                  <CardDescription>Browse your collection of sign language images</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search signs..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={loadImages}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] md:h-[600px]">
                      {filteredImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 pr-2">
                          {filteredImages.map((image, index) => (
                            <div
                              key={index}
                              className={`cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
                                selectedImage?.url === image.url
                                  ? "border-purple-500 scale-105 shadow-md"
                                  : "border-transparent hover:border-gray-300"
                              }`}
                              onClick={() => {
                                setSelectedImage(image)
                                speakWord(image.word)
                              }}
                            >
                              <div className="aspect-square relative">
                                <img
                                  src={image.url || "/placeholder.svg"}
                                  alt={`Sign for ${image.word}`}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <div className="p-1 text-xs md:text-sm truncate text-center bg-gray-100 dark:bg-gray-800">
                                {image.word}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          {searchQuery ? "No matching sign images found" : "No sign images yet. Upload some!"}
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="w-full md:w-2/3">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>{selectedImage ? `Sign for "${selectedImage.word}"` : "Preview"}</CardTitle>
                  <CardDescription>
                    {selectedImage
                      ? "View and manage this sign image"
                      : "Select a sign from the gallery to preview it here"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center">
                  {selectedImage ? (
                    <div className="flex flex-col items-center space-y-4 w-full">
                      <div className="relative max-h-[400px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <img
                          src={selectedImage.url || "/placeholder.svg"}
                          alt={`Sign for ${selectedImage.word}`}
                          className="max-h-[400px] object-contain"
                        />
                      </div>

                      <div className="text-2xl font-bold mt-4 text-center">{selectedImage.word}</div>

                      <div className="flex gap-2 mt-4">
                        <Button variant="default" onClick={() => speakWord(selectedImage.word)}>
                          Speak Word
                        </Button>
                        <Button variant="destructive" onClick={() => handleDeleteImage(selectedImage)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground p-12">
                      Select a sign image from the gallery to preview
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <SignImageUpload onImageUploaded={handleImageUploaded} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
