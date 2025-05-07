"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Volume2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getImageStorageService, type ImageMetadata } from "@/lib/image-storage-service"
import { loadSampleSignImages } from "@/lib/sample-sign-images"

export function SignImageLibrary() {
  const [images, setImages] = useState<ImageMetadata[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageMetadata[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load sample images if needed
        await loadSampleSignImages()

        // Get all images from storage
        const imageService = getImageStorageService()
        const allImages = imageService.getImages()

        setImages(allImages)
        setFilteredImages(allImages)

        if (allImages.length > 0) {
          setSelectedImage(allImages[0])
        }
      } catch (err) {
        console.error("Error loading sign images:", err)
        setError(`Failed to load sign images: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadImages()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredImages(images)
    } else {
      const query = searchQuery.toLowerCase().trim()
      const filtered = images.filter((image) => image.word.toLowerCase().includes(query))
      setFilteredImages(filtered)
    }
  }, [searchQuery, images])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const selectImage = (image: ImageMetadata) => {
    setSelectedImage(image)
  }

  const speakWord = (word: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Sign Language Library</h2>
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Search signs..."
                value={searchQuery}
                onChange={handleSearch}
                className="pr-8"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredImages.map((image) => (
                      <div
                        key={image.id}
                        className={`relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                          selectedImage?.id === image.id ? "ring-2 ring-purple-500 shadow-lg" : "hover:shadow-md"
                        }`}
                        onClick={() => selectImage(image)}
                      >
                        <div className="aspect-square bg-white dark:bg-gray-700 flex items-center justify-center">
                          <img
                            src={image.url || "/placeholder.svg"}
                            alt={`Sign for ${image.word}`}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-center truncate">
                          {image.word}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">
                      {searchQuery ? "No signs found matching your search" : "No sign images available"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-96 flex flex-col">
                {selectedImage ? (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold">{selectedImage.word}</h3>
                      {selectedImage.category && (
                        <span className="text-sm text-gray-500">Category: {selectedImage.category}</span>
                      )}
                    </div>

                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                      <img
                        src={selectedImage.url || "/placeholder.svg"}
                        alt={`Sign for ${selectedImage.word}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex justify-center">
                      <Button onClick={() => speakWord(selectedImage.word)} variant="outline" size="sm">
                        <Volume2 className="mr-2 h-4 w-4" />
                        Speak Word
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">Select a sign to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
