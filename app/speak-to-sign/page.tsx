"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Play, Pause, Settings, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageContainer } from "@/components/page-container"
import { SignImageLibrary } from "@/components/sign-image-library"
import { getSpeechRecognitionService, type SpeechRecognitionResult } from "@/lib/speech-recognition"
import { getImageStorageService } from "@/lib/image-storage-service"
import { loadSampleSignImages } from "@/lib/sample-sign-images"

export default function SpeakToSignPage() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [finalTranscript, setFinalTranscript] = useState("")
  const [words, setWords] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showAnimation, setShowAnimation] = useState(true)
  const [showImages, setShowImages] = useState(true)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("speech")

  const speechService = useRef(getSpeechRecognitionService())
  const imageService = useRef(getImageStorageService())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load sample images if needed
    loadSampleSignImages()

    // Initialize speech recognition
    if (!speechService.current.isSupported()) {
      setError("Speech recognition is not supported in this browser")
      return
    }

    speechService.current.onResult((result: SpeechRecognitionResult) => {
      setTranscript(result.transcript)

      if (result.isFinal) {
        setFinalTranscript((prev) => {
          const newTranscript = prev ? `${prev} ${result.transcript}` : result.transcript
          processTranscript(newTranscript)
          return newTranscript
        })
      }
    })

    speechService.current.onEnd(() => {
      setIsListening(false)
    })

    speechService.current.onError((error) => {
      console.error("Speech recognition error:", error)
      setError("Speech recognition error. Please try again.")
      setIsListening(false)
    })

    return () => {
      stopListening()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const startListening = () => {
    setError(null)
    const success = speechService.current.start()
    if (success) {
      setIsListening(true)
    } else {
      setError("Failed to start speech recognition")
    }
  }

  const stopListening = () => {
    speechService.current.stop()
    setIsListening(false)
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const processTranscript = (text: string) => {
    // Split text into words, removing punctuation and converting to lowercase
    const processedWords = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 0)

    setWords(processedWords)
    setCurrentWordIndex(0)

    if (processedWords.length > 0 && !isPlaying) {
      setIsPlaying(true)
    }
  }

  const playSlideshow = () => {
    setIsPlaying(true)
  }

  const pauseSlideshow = () => {
    setIsPlaying(false)
  }

  const resetSlideshow = () => {
    setCurrentWordIndex(0)
    setIsPlaying(false)
  }

  const speakWord = (word: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      window.speechSynthesis.speak(utterance)
    }
  }

  useEffect(() => {
    if (isPlaying && words.length > 0) {
      if (currentWordIndex < words.length) {
        // Update current image
        updateCurrentImage(words[currentWordIndex])

        // If autoSpeak is enabled, speak the current word
        if (autoSpeak) {
          speakWord(words[currentWordIndex])
        }

        // Move to the next word after a delay based on speed
        timerRef.current = setTimeout(() => {
          setCurrentWordIndex((prev) => prev + 1)
        }, 2000 / speed)
      } else {
        // End of slideshow
        setIsPlaying(false)
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isPlaying, currentWordIndex, words, speed, autoSpeak])

  const updateCurrentImage = (word: string) => {
    if (!word) {
      setCurrentImage(null)
      return
    }

    // Find images for this word
    const images = imageService.current.getImagesByWord(word)

    if (images.length > 0) {
      setCurrentImage(images[0].url)
    } else {
      // Use a placeholder if no image is found
      setCurrentImage(`/placeholder.svg?height=300&width=300&query=sign language ${encodeURIComponent(word)} gesture`)
    }
  }

  const currentWord = words[currentWordIndex] || ""

  return (
    <PageContainer title="Speak to Sign" subtitle="Speak and see the sign language translation">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="speech">Speech to Sign</TabsTrigger>
          <TabsTrigger value="library">Sign Library</TabsTrigger>
        </TabsList>

        <TabsContent value="speech" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Speech Recognition</h2>
                    <Button
                      onClick={toggleListening}
                      variant={isListening ? "destructive" : "default"}
                      size="icon"
                      className="rounded-full h-12 w-12"
                    >
                      {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>
                  </div>

                  {error && (
                    <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="min-h-24 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                    {transcript ? (
                      <p className="text-lg">{transcript}</p>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        {isListening ? "Listening..." : "Click the microphone button to start speaking"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex space-x-2">
                      <Button
                        onClick={isPlaying ? pauseSlideshow : playSlideshow}
                        variant="outline"
                        disabled={words.length === 0}
                      >
                        {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {isPlaying ? "Pause" : "Play"}
                      </Button>
                      <Button
                        onClick={resetSlideshow}
                        variant="outline"
                        disabled={words.length === 0 || currentWordIndex === 0}
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Volume2 className="h-4 w-4 text-gray-500" />
                      <div className="flex items-center space-x-2">
                        <Switch id="auto-speak" checked={autoSpeak} onCheckedChange={setAutoSpeak} />
                        <Label htmlFor="auto-speak">Auto-speak</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">Slow</span>
                    <Slider
                      value={[speed]}
                      min={0.5}
                      max={2}
                      step={0.1}
                      onValueChange={(value) => setSpeed(value[0])}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">Fast</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Display Options</h2>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-animation">Show Animation</Label>
                    <Switch id="show-animation" checked={showAnimation} onCheckedChange={setShowAnimation} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-images">Show Images</Label>
                    <Switch id="show-images" checked={showImages} onCheckedChange={setShowImages} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Tabs defaultValue="slideshow" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="slideshow">Sign Images</TabsTrigger>
                <TabsTrigger value="animation">Animation</TabsTrigger>
              </TabsList>

              <TabsContent value="slideshow" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center">
                      <div className="text-center mb-4">
                        <h3 className="text-2xl font-bold">{currentWord || "No word selected"}</h3>
                        <p className="text-gray-500">
                          {words.length > 0
                            ? `Word ${currentWordIndex + 1} of ${words.length}`
                            : "Speak to see sign language images"}
                        </p>
                      </div>

                      <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        {currentWord && currentImage ? (
                          <img
                            src={currentImage || "/placeholder.svg"}
                            alt={`Sign for ${currentWord}`}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <p className="text-gray-500">
                              {currentWord
                                ? `No sign image available for "${currentWord}"`
                                : "Speak or type to see sign language images"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="animation" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center">
                      <div className="text-center mb-4">
                        <h3 className="text-2xl font-bold">{currentWord || "No word selected"}</h3>
                        <p className="text-gray-500">
                          {words.length > 0
                            ? `Word ${currentWordIndex + 1} of ${words.length}`
                            : "Speak to see sign language animations"}
                        </p>
                      </div>

                      <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                        {currentWord ? (
                          <div className="text-center">
                            <p>Animation for "{currentWord}" would play here</p>
                            {/* Animation component would go here */}
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <p className="text-gray-500">Speak or type to see sign language animations</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <SignImageLibrary />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
