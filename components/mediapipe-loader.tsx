"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface MediaPipeLoaderProps {
  onLoaded: () => void
}

export function MediaPipeLoader({ onLoaded }: MediaPipeLoaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempts, setLoadAttempts] = useState(0)

  useEffect(() => {
    const loadMediaPipeScripts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Check if already loaded
        if (window.Holistic && window.Camera) {
          console.log("MediaPipe already loaded")
          setIsLoading(false)
          onLoaded()
          return
        }

        // Load Holistic script
        const holisticScript = document.createElement("script")
        holisticScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js"
        holisticScript.crossOrigin = "anonymous"

        // Create a promise for the holistic script loading
        const holisticLoaded = new Promise<void>((resolve, reject) => {
          holisticScript.onload = () => {
            console.log("Holistic script loaded")
            resolve()
          }
          holisticScript.onerror = () => {
            reject(new Error("Failed to load Holistic script"))
          }
        })

        // Append holistic script to document
        document.body.appendChild(holisticScript)

        // Wait for holistic to load
        await holisticLoaded

        // Load Camera script
        const cameraScript = document.createElement("script")
        cameraScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js"
        cameraScript.crossOrigin = "anonymous"

        // Create a promise for the camera script loading
        const cameraLoaded = new Promise<void>((resolve, reject) => {
          cameraScript.onload = () => {
            console.log("Camera script loaded")
            resolve()
          }
          cameraScript.onerror = () => {
            reject(new Error("Failed to load Camera script"))
          }
        })

        // Append camera script to document
        document.body.appendChild(cameraScript)

        // Wait for camera to load
        await cameraLoaded

        // Wait a bit to ensure everything is initialized
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Check if objects are available
        if (!window.Holistic || !window.Camera) {
          throw new Error("MediaPipe objects not available after loading scripts")
        }

        console.log("MediaPipe scripts loaded successfully")
        setIsLoading(false)
        onLoaded()
      } catch (err) {
        console.error("Error loading MediaPipe:", err)
        setError(`Failed to load MediaPipe: ${err instanceof Error ? err.message : String(err)}`)
        setIsLoading(false)
      }
    }

    loadMediaPipeScripts()
  }, [onLoaded, loadAttempts])

  const handleRetry = () => {
    setLoadAttempts((prev) => prev + 1)
  }

  if (isLoading) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center">
        <CardContent className="pt-6">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Loading MediaPipe libraries...</p>
            <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-500 mb-2">MediaPipe Loading Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRetry} className="mx-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
