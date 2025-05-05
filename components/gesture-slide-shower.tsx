"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { modelManager, type GestureData } from "@/lib/model-manager"
import { ChevronLeft, ChevronRight, Play, Pause, RefreshCw } from "lucide-react"
import Image from "next/image"

interface GestureSlideShowerProps {
  gestureName?: string
  autoPlay?: boolean
  interval?: number
}

export function GestureSlideShower({ gestureName, autoPlay = false, interval = 2000 }: GestureSlideShowerProps) {
  const [gestures, setGestures] = useState<GestureData[]>([])
  const [currentGestureIndex, setCurrentGestureIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isLoading, setIsLoading] = useState(true)

  // Load gestures
  useEffect(() => {
    const loadGestures = async () => {
      setIsLoading(true)

      // Ensure model manager is loaded
      await modelManager.loadFromLocalStorage()

      // Try to load from GitHub if available
      try {
        await modelManager.loadFromGitHub()
      } catch (error) {
        console.error("Error loading from GitHub:", error)
      }

      // If a specific gesture name is provided, load only that gesture
      if (gestureName) {
        const gesture = modelManager.getGesture(gestureName)
        if (gesture) {
          setGestures([gesture])
        } else {
          setGestures([])
        }
      } else {
        // Otherwise load all gestures that have images
        const allGestures = modelManager.getAllGestures()
        const gesturesWithImages = allGestures.filter((g) => g.images && g.images.length > 0)
        setGestures(gesturesWithImages)
      }

      setIsLoading(false)
    }

    loadGestures()
  }, [gestureName])

  // Handle auto-play
  useEffect(() => {
    if (!isPlaying || gestures.length === 0) return

    const timer = setInterval(() => {
      // If we're at the last image of the current gesture
      const currentGesture = gestures[currentGestureIndex]
      const hasImages = currentGesture?.images && currentGesture.images.length > 0

      if (hasImages && currentImageIndex >= currentGesture.images.length - 1) {
        // Move to the next gesture
        setCurrentGestureIndex((prev) => (prev + 1) % gestures.length)
        setCurrentImageIndex(0)
      } else if (hasImages) {
        // Move to the next image of the current gesture
        setCurrentImageIndex((prev) => prev + 1)
      } else {
        // No images, just move to the next gesture
        setCurrentGestureIndex((prev) => (prev + 1) % gestures.length)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, gestures, currentGestureIndex, currentImageIndex, interval])

  // Navigate to previous gesture
  const prevGesture = () => {
    setCurrentImageIndex(0)
    setCurrentGestureIndex((prev) => (prev === 0 ? gestures.length - 1 : prev - 1))
  }

  // Navigate to next gesture
  const nextGesture = () => {
    setCurrentImageIndex(0)
    setCurrentGestureIndex((prev) => (prev + 1) % gestures.length)
  }

  // Toggle play/pause
  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  // Get current gesture
  const currentGesture = gestures[currentGestureIndex]

  // Get current image URL
  const getCurrentImageUrl = () => {
    if (!currentGesture) return "/placeholder.svg?key=ng1w6"

    if (currentGesture.images && currentGesture.images.length > 0) {
      return currentGesture.images[currentImageIndex]
    }

    // Fallback to placeholder with gesture name
    return `/placeholder.svg?height=300&width=300&query=hand+gesture+for+${currentGesture.name}`
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader>
        <CardTitle>Gesture Slideshow</CardTitle>
        <CardDescription>
          {gestureName ? `Viewing images for "${gestureName}"` : "Browse through all gesture images"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : gestures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">No gestures found</p>
            <p className="text-sm text-muted-foreground">
              {gestureName ? `No gesture found with name "${gestureName}"` : "Try uploading some sign images first"}
            </p>
          </div>
        ) : (
          <>
            <div className="relative aspect-square max-w-md mx-auto mb-4 bg-muted rounded-lg overflow-hidden">
              <Image
                src={getCurrentImageUrl() || "/placeholder.svg"}
                alt={currentGesture?.name || "Gesture"}
                fill
                className="object-contain"
              />

              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-center">
                <p className="font-bold">{currentGesture?.name || "Unknown Gesture"}</p>
                {currentGesture?.images && currentGesture.images.length > 0 && (
                  <p className="text-xs">
                    Image {currentImageIndex + 1} of {currentGesture.images.length}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" size="icon" onClick={prevGesture}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button variant="outline" size="icon" onClick={nextGesture}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex justify-center gap-2 flex-wrap">
                {gestures.map((gesture, index) => (
                  <Button
                    key={gesture.name}
                    variant={index === currentGestureIndex ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setCurrentGestureIndex(index)
                      setCurrentImageIndex(0)
                    }}
                  >
                    {gesture.name}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
