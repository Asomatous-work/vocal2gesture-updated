"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Layers } from "lucide-react"
import { modelManager } from "@/lib/model-manager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { AnimationData, AnimationFrame } from "@/lib/animation-data"
import {
  drawLandmarks,
  drawConnectors,
  POSE_CONNECTIONS,
  HAND_CONNECTIONS,
  FACEMESH_TESSELATION,
} from "@/lib/pose-utils"

interface SlideImage {
  word: string
  url: string
  id: string
  category?: string
  tags?: string[]
  animation?: AnimationData
}

interface SlideShowProps {
  words?: string[]
  autoPlay?: boolean
  interval?: number
  showControls?: boolean
  onComplete?: () => void
  showAnimations?: boolean
}

export function EnhancedSignSlideshow({
  words = [],
  autoPlay = false,
  interval = 2000,
  showControls = true,
  onComplete,
  showAnimations = true,
}: SlideShowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isLoading, setIsLoading] = useState(true)
  const [slideImages, setSlideImages] = useState<SlideImage[]>([])
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [progress, setProgress] = useState(0)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showMissingWords, setShowMissingWords] = useState(false)
  const [missingWords, setMissingWords] = useState<string[]>([])
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isShowingAnimations, setIsShowingAnimations] = useState(showAnimations)
  const [isAnimating, setIsAnimating] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  // Load images on component mount or when words change
  useEffect(() => {
    loadImages()
  }, [words])

  // Handle autoplay
  useEffect(() => {
    if (isPlaying && slideImages.length > 0) {
      startSlideshow()
    } else {
      stopSlideshow()
    }

    return () => {
      stopSlideshow()
    }
  }, [isPlaying, currentIndex, slideImages, playbackSpeed])

  // Update progress when current index changes
  useEffect(() => {
    if (slideImages.length > 0) {
      setProgress(((currentIndex + 1) / slideImages.length) * 100)
    }
  }, [currentIndex, slideImages.length])

  // Initialize animation canvas
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        // Draw placeholder text
        ctx.fillStyle = "white"
        ctx.font = "14px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Animation will play here", canvasRef.current.width / 2, canvasRef.current.height / 2)
      }
    }
  }, [])

  // Start animation when current slide changes
  useEffect(() => {
    if (isShowingAnimations && slideImages.length > 0 && currentIndex < slideImages.length) {
      const currentSlide = slideImages[currentIndex]
      if (currentSlide.animation) {
        startAnimation(currentSlide.animation)
      } else {
        stopAnimation()
      }
    }
  }, [currentIndex, isShowingAnimations, slideImages])

  const loadImages = async () => {
    setIsLoading(true)
    setLoadingProgress(0)

    try {
      // Load from model manager
      await modelManager.loadFromLocalStorage()

      // Try to load from GitHub if available
      try {
        await modelManager.loadFromGitHub()
      } catch (error) {
        console.log("Could not load from GitHub, using local data only")
      }

      // Get all sign images
      const allImages = modelManager.getSignImages()
      const allGestures = modelManager.getGestures()
      const allAnimations = modelManager.getAnimations()

      // Extract all available categories
      const categories = new Set<string>()
      allImages.forEach((img) => {
        if (img.category) categories.add(img.category)
      })
      setAvailableCategories(Array.from(categories))

      // If words are provided, filter images for those words
      let filteredImages: SlideImage[] = []
      const missing: string[] = []

      if (words && words.length > 0) {
        // Simulate loading progress
        const progressStep = 100 / words.length
        let currentProgress = 0

        for (const word of words) {
          // Find images for this word
          const wordImages = allImages.filter((img) => img.word.toLowerCase() === word.toLowerCase())

          // Find animations for this word
          const wordAnimation = allAnimations.find((anim) => anim.word.toLowerCase() === word.toLowerCase())

          // If no direct images, check gestures
          if (wordImages.length === 0) {
            const gesture = allGestures.find((g) => g.name.toLowerCase() === word.toLowerCase())
            if (gesture && gesture.images && gesture.images.length > 0) {
              // Add images from gesture
              gesture.images.forEach((url, idx) => {
                filteredImages.push({
                  word,
                  url,
                  id: `${word}-${idx}`,
                  category: "gesture",
                  animation: wordAnimation,
                })
              })
            } else {
              // No images found for this word
              missing.push(word)
            }
          } else {
            // Add direct images with animation if available
            wordImages.forEach((img) => {
              filteredImages.push({
                ...img,
                animation: wordAnimation,
              })
            })
          }

          // Update progress
          currentProgress += progressStep
          setLoadingProgress(Math.min(currentProgress, 95))
        }

        setMissingWords(missing)
        if (missing.length > 0) {
          setShowMissingWords(true)
        }
      } else {
        // If no words provided, use all images
        filteredImages = allImages.map((img) => {
          const animation = allAnimations.find((anim) => anim.word.toLowerCase() === img.word.toLowerCase())
          return {
            ...img,
            animation,
          }
        })
        setLoadingProgress(95)
      }

      // Set the slide images
      setSlideImages(filteredImages)

      // Complete loading
      setTimeout(() => {
        setLoadingProgress(100)
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error("Error loading images:", error)
      toast({
        title: "Loading Error",
        description: "There was an error loading sign language images.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const startSlideshow = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      if (currentIndex < slideImages.length - 1) {
        setCurrentIndex(currentIndex + 1)
        if (isSpeechEnabled) {
          speakWord(slideImages[currentIndex + 1].word)
        }
      } else {
        // End of slideshow
        setIsPlaying(false)
        if (onComplete) {
          onComplete()
        }
      }
    }, interval / playbackSpeed)
  }

  const stopSlideshow = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const goToNextSlide = () => {
    if (currentIndex < slideImages.length - 1) {
      setCurrentIndex(currentIndex + 1)
      if (isSpeechEnabled) {
        speakWord(slideImages[currentIndex + 1].word)
      }
    }
  }

  const goToPrevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      if (isSpeechEnabled) {
        speakWord(slideImages[currentIndex - 1].word)
      }
    }
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying && isSpeechEnabled) {
      speakWord(slideImages[currentIndex].word)
    }
  }

  const resetSlideshow = () => {
    setCurrentIndex(0)
    if (isSpeechEnabled) {
      speakWord(slideImages[0].word)
    }
  }

  const speakWord = (word: string) => {
    if (!isSpeechEnabled) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const toggleSpeech = () => {
    setIsSpeechEnabled(!isSpeechEnabled)

    // Cancel any ongoing speech when disabled
    if (isSpeechEnabled) {
      window.speechSynthesis.cancel()
    }
  }

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0])
  }

  const filterByCategories = () => {
    if (selectedCategories.length === 0) {
      // If no categories selected, reload all images
      loadImages()
    } else {
      // Filter images by selected categories
      const allImages = modelManager.getSignImages()
      const filtered = allImages.filter((img) => img.category && selectedCategories.includes(img.category))
      setSlideImages(filtered)
    }

    setShowSettings(false)
  }

  // Animation functions
  const startAnimation = (animation: AnimationData) => {
    // Stop any existing animation
    stopAnimation()

    if (!isShowingAnimations || !canvasRef.current || !animation.frames || animation.frames.length === 0) return

    setIsAnimating(true)
    animationFrameRef.current = 0

    // Calculate frame time based on animation metadata or default
    const fps = animation.metadata?.fps || 30
    const frameTime = 1000 / fps / playbackSpeed

    // Draw first frame
    drawAnimationFrame(animation.frames[0])

    // Set up animation interval
    animationRef.current = setInterval(() => {
      animationFrameRef.current++

      // Loop back to beginning if we reach the end
      if (animationFrameRef.current >= animation.frames.length) {
        animationFrameRef.current = 0
      }

      // Draw the current frame
      drawAnimationFrame(animation.frames[animationFrameRef.current])
    }, frameTime)
  }

  const stopAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current)
      animationRef.current = null
    }
    setIsAnimating(false)
  }

  const drawAnimationFrame = (frame: AnimationFrame) => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    const width = canvasRef.current.width
    const height = canvasRef.current.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Fill with transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(0, 0, width, height)

    // Draw pose landmarks
    if (frame.pose && frame.pose.length > 0) {
      drawConnectors(ctx, frame.pose, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 2 })
      drawLandmarks(ctx, frame.pose, { color: "#FF0000", radius: 3 })
    }

    // Draw hand landmarks
    if (frame.leftHand && frame.leftHand.length > 0) {
      drawConnectors(ctx, frame.leftHand, HAND_CONNECTIONS, { color: "#0000FF", lineWidth: 2 })
      drawLandmarks(ctx, frame.leftHand, { color: "#00FFFF", radius: 3 })
    }

    if (frame.rightHand && frame.rightHand.length > 0) {
      drawConnectors(ctx, frame.rightHand, HAND_CONNECTIONS, { color: "#FF00FF", lineWidth: 2 })
      drawLandmarks(ctx, frame.rightHand, { color: "#FFFF00", radius: 3 })
    }

    // Draw face mesh (simplified)
    if (frame.face && frame.face.length > 0) {
      drawConnectors(ctx, frame.face, FACEMESH_TESSELATION, { color: "#C0C0C070", lineWidth: 1 })
    }
  }

  // If no images are available
  if (slideImages.length === 0 && !isLoading) {
    return (
      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader>
          <CardTitle>Sign Language Slideshow</CardTitle>
          <CardDescription>No sign language images available</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="text-center mb-4">
            <p className="text-muted-foreground">
              No sign language images were found for the requested words. Please upload images first.
            </p>
          </div>
          <Button onClick={loadImages}>Retry Loading Images</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Sign Language Slideshow</CardTitle>
          <CardDescription>
            {words.length > 0
              ? `Showing signs for ${words.length} words`
              : `Showing ${slideImages.length} sign language images`}
          </CardDescription>
        </div>
        {showControls && (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={toggleSpeech}>
              {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Loading sign language images...</p>
            <div className="w-full max-w-md mt-4">
              <Progress value={loadingProgress} className="h-2" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative aspect-square bg-black">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {slideImages[currentIndex] && (
                    <img
                      src={slideImages[currentIndex].url || "/placeholder.svg"}
                      alt={slideImages[currentIndex].word}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Animation overlay */}
              {isShowingAnimations && slideImages[currentIndex]?.animation && (
                <div className="absolute inset-0 pointer-events-none">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={240}
                    className="absolute bottom-4 right-4 w-1/3 h-1/3 rounded-lg border border-white/20"
                  />
                </div>
              )}

              {/* Word overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 text-white">
                <h3 className="text-xl font-bold text-center">
                  {slideImages[currentIndex] ? slideImages[currentIndex].word : ""}
                </h3>
              </div>

              {/* Navigation arrows */}
              {showControls && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50"
                    onClick={goToPrevSlide}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50"
                    onClick={goToNextSlide}
                    disabled={currentIndex === slideImages.length - 1}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>

            {/* Progress bar */}
            <Progress value={progress} className="h-1 rounded-none" />

            {/* Controls */}
            {showControls && (
              <div className="p-4 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    onClick={togglePlayPause}
                    className={`${
                      isPlaying
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    }`}
                  >
                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button variant="outline" onClick={resetSlideshow}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Speed:</span>
                  <Slider
                    value={[playbackSpeed]}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-32"
                    onValueChange={handleSpeedChange}
                  />
                  <span className="text-sm font-mono w-8">{playbackSpeed.toFixed(1)}x</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Slideshow Settings</DialogTitle>
            <DialogDescription>Customize your sign language slideshow experience</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="speech-enabled" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Speech Narration
              </Label>
              <Switch id="speech-enabled" checked={isSpeechEnabled} onCheckedChange={setIsSpeechEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="animations-enabled" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Show Animations
              </Label>
              <Switch id="animations-enabled" checked={isShowingAnimations} onCheckedChange={setIsShowingAnimations} />
            </div>

            <div className="space-y-2">
              <Label>Playback Speed</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[playbackSpeed]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={handleSpeedChange}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-10">{playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>

            {availableCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Filter by Categories</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {availableCategories.map((category) => (
                      <div key={category} className="flex items-center gap-2">
                        <Switch
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, category])
                            } else {
                              setSelectedCategories(selectedCategories.filter((c) => c !== category))
                            }
                          }}
                        />
                        <Label htmlFor={`category-${category}`}>{category}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={filterByCategories}>Apply Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Words Dialog */}
      <Dialog open={showMissingWords} onOpenChange={setShowMissingWords}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Missing Sign Images</DialogTitle>
            <DialogDescription>Some words don't have corresponding sign language images</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2 text-sm text-muted-foreground">
              The following words don't have sign language images available:
            </p>
            <ScrollArea className="h-40 border rounded-md p-2">
              <div className="space-y-1">
                {missingWords.map((word, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20">
                      {word}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="mt-4 text-sm text-muted-foreground">
              Consider uploading images for these words to improve the slideshow experience.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMissingWords(false)}>Continue Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
