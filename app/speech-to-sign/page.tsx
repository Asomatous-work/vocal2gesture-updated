"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Mic, MicOff, Volume2, VolumeX, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function SpeechToSignPage() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [signImages, setSignImages] = useState<{ word: string; url: string }[]>([])
  const [currentSignIndex, setCurrentSignIndex] = useState(0)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(true)

  const recognitionRef = useRef<any>(null)
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Initialize speech recognition and load sign images
  useEffect(() => {
    // Load sign images from localStorage
    try {
      const storedImages = JSON.parse(localStorage.getItem("signLanguageImages") || "[]")
      setSignImages(storedImages)
    } catch (error) {
      console.error("Error loading sign images:", error)
    }

    // Initialize speech recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore - webkitSpeechRecognition is not in the types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          processTranscript(finalTranscript)
        }

        setTranscript(interimTranscript || finalTranscript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error)
        if (event.error === "not-allowed") {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use speech recognition.",
            variant: "destructive",
          })
          setIsListening(false)
        }
      }
    } else {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support speech recognition.",
        variant: "destructive",
      })
    }

    setIsLoading(false)

    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current)
      }
    }
  }, [toast])

  // Process transcript and find matching signs
  const processTranscript = (text: string) => {
    const words = text.toLowerCase().split(/\s+/)

    // Find matching signs
    const matchingIndices: number[] = []

    words.forEach((word) => {
      const index = signImages.findIndex((sign) => sign.word.toLowerCase() === word)

      if (index !== -1) {
        matchingIndices.push(index)
      }
    })

    // If we found matches, show them
    if (matchingIndices.length > 0) {
      setCurrentSignIndex(matchingIndices[0])

      // If auto-advance is enabled, show each sign for 2 seconds
      if (autoAdvance && matchingIndices.length > 1) {
        let currentIndex = 0

        const advanceSign = () => {
          currentIndex = (currentIndex + 1) % matchingIndices.length
          setCurrentSignIndex(matchingIndices[currentIndex])

          autoAdvanceTimerRef.current = setTimeout(advanceSign, 2000)
        }

        // Start the auto-advance timer
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current)
        }

        autoAdvanceTimerRef.current = setTimeout(advanceSign, 2000)
      }

      // Speak the recognized words if speech is enabled
      if (isSpeechEnabled) {
        const matchedWords = matchingIndices.map((index) => signImages[index].word).join(", ")
        speakText(`Recognized: ${matchedWords}`)
      }
    }
  }

  // Toggle speech recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setTranscript("")

      toast({
        title: "Speech Recognition Stopped",
        description: "No longer listening for speech.",
      })
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)

        toast({
          title: "Speech Recognition Started",
          description: "Listening for speech...",
        })
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        toast({
          title: "Speech Recognition Error",
          description: "Could not start speech recognition.",
          variant: "destructive",
        })
      }
    }
  }

  // Toggle speech output
  const toggleSpeech = () => {
    setIsSpeechEnabled(!isSpeechEnabled)

    // Cancel any ongoing speech when disabled
    if (isSpeechEnabled) {
      window.speechSynthesis.cancel()
    }

    toast({
      title: isSpeechEnabled ? "Speech Disabled" : "Speech Enabled",
      description: isSpeechEnabled ? "Speech output has been turned off." : "Speech output has been turned on.",
    })
  }

  // Speak text using speech synthesis
  const speakText = (text: string) => {
    if (!isSpeechEnabled) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  // Toggle auto-advance
  const toggleAutoAdvance = () => {
    setAutoAdvance(!autoAdvance)

    // Clear any existing timer when toggling
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-2xl md:text-4xl font-bold">Speech to Sign Translator</h2>
        </div>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Speak into your microphone to translate speech into sign language images
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Speech Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-1"
        >
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Speech Input</CardTitle>
                <CardDescription>Speak to translate into sign language</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={toggleSpeech} className="h-8">
                {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              <div className="flex-grow mb-4">
                <div className="p-4 bg-background rounded-lg min-h-[150px] flex items-center justify-center">
                  {isListening ? (
                    transcript ? (
                      <p className="text-lg">{transcript}</p>
                    ) : (
                      <p className="text-muted-foreground">Listening... Speak now</p>
                    )
                  ) : (
                    <p className="text-muted-foreground">Press the microphone button to start</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={toggleListening}
                  className={`${
                    isListening
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  }`}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isListening ? "Stop Listening" : "Start Listening"}
                </Button>

                <div className="flex items-center space-x-2">
                  <Switch id="auto-advance" checked={autoAdvance} onCheckedChange={toggleAutoAdvance} />
                  <Label htmlFor="auto-advance">Auto-advance through signs</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sign Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader>
              <CardTitle>Sign Language Display</CardTitle>
              <CardDescription>
                {signImages.length > 0
                  ? "Showing sign language images for recognized words"
                  : "No sign language images available. Please upload some first."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : signImages.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="aspect-square w-full max-w-md overflow-hidden rounded-lg bg-muted mb-4">
                    <img
                      src={signImages[currentSignIndex]?.url || "/placeholder.svg"}
                      alt={signImages[currentSignIndex]?.word || "Sign"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xl font-medium mb-2">{signImages[currentSignIndex]?.word || "No word"}</p>

                  {signImages.length > 1 && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentSignIndex((prev) => (prev === 0 ? signImages.length - 1 : prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentSignIndex((prev) => (prev === signImages.length - 1 ? 0 : prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Sign Images Available</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Please upload sign language images in the Sign Image Uploader page first.
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
