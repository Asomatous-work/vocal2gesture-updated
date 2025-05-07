"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { SignImageUpload } from "@/components/sign-image-upload"
import { getSignImageForWord } from "@/lib/sign-language-data"
import { modelManager } from "@/lib/model-manager"
import { BackButton } from "@/components/back-button"

export default function EnhancedSpeechToSignPage() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [detectedWord, setDetectedWord] = useState("")
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [signImages, setSignImages] = useState<{ word: string; url: string }[]>([])
  const [activeTab, setActiveTab] = useState("translation")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingImage, setIsLoadingImage] = useState(false)

  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  // Initialize speech recognition and load images
  useEffect(() => {
    const loadImagesFromModelManager = () => {
      const images = modelManager.getSignImages()
      setSignImages(images.map((img) => ({ word: img.word, url: img.url })))
    }

    // Load images from model manager
    loadImagesFromModelManager()

    // Initialize speech recognition if supported
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript

            // Find the last word for sign language lookup
            const words = finalTranscript.trim().split(/\s+/)
            const lastWord = words[words.length - 1].toLowerCase()
            if (lastWord) {
              setDetectedWord(lastWord)
              speakWord(lastWord)
            }
          } else {
            interimTranscript += transcript
          }
        }

        setTranscript(finalTranscript || interimTranscript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error)
        if (event.error === "not-allowed") {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use speech recognition.",
            variant: "destructive",
          })
          setListening(false)
        }
      }
    } else {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support speech recognition. Please try Chrome or Edge.",
        variant: "destructive",
      })
    }

    setIsLoading(false)

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [toast])

  // Toggle speech recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
      setTranscript("")
      setDetectedWord("")
    }
  }

  // Toggle voice feedback
  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled)
  }

  // Speak a word using speech synthesis
  const speakWord = (word: string) => {
    if (!voiceEnabled) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  // Reset the transcript and detected word
  const resetTranscript = () => {
    setTranscript("")
    setDetectedWord("")
  }

  // Find sign image URL for a word
  const findSignImageUrl = (word: string): string => {
    // First check our uploaded images
    const uploadedImage = signImages.find((img) => img.word.toLowerCase() === word.toLowerCase())

    if (uploadedImage) {
      return uploadedImage.url
    }

    // Fall back to default image function
    return getSignImageForWord(word)
  }

  // Handle when a new image is uploaded
  const handleImageUploaded = (imageData: { word: string; url: string }) => {
    setSignImages((prev) => {
      // Replace if word exists, otherwise add
      const exists = prev.findIndex((img) => img.word.toLowerCase() === imageData.word.toLowerCase()) >= 0

      if (exists) {
        return prev.map((img) => (img.word.toLowerCase() === imageData.word.toLowerCase() ? imageData : img))
      } else {
        return [...prev, imageData]
      }
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-4">
        <BackButton />
      </div>

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
          Speak into the microphone and see the corresponding sign language images
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
        <TabsList className="w-full">
          <TabsTrigger value="translation">Translation</TabsTrigger>
          <TabsTrigger value="upload">Upload Signs</TabsTrigger>
        </TabsList>

        <TabsContent value="translation" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Speech Input */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Speech Input</CardTitle>
                  <CardDescription>Speak into your microphone</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={toggleVoice}>
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative bg-background/50 rounded-lg p-4 min-h-[100px] flex flex-col justify-center">
                    {transcript ? (
                      <p className="text-lg">{transcript}</p>
                    ) : (
                      <p className="text-muted-foreground text-center">
                        {listening ? "Listening..." : "Press the microphone button to start speaking"}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-between">
                    <Button
                      onClick={toggleListening}
                      className={`flex-1 ${listening ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"}`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : listening ? (
                        <MicOff className="mr-2 h-4 w-4" />
                      ) : (
                        <Mic className="mr-2 h-4 w-4" />
                      )}
                      {isLoading ? "Loading..." : listening ? "Stop Listening" : "Start Listening"}
                    </Button>
                    <Button variant="outline" onClick={resetTranscript} disabled={!transcript || isLoading}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sign Output */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader>
                <CardTitle>Sign Language</CardTitle>
                <CardDescription>Visual representation of the detected words</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-background/50 rounded-lg p-4 w-full min-h-[200px] flex items-center justify-center">
                    {detectedWord ? (
                      <div className="text-center">
                        <div className="relative w-64 h-64 mx-auto mb-2">
                          <img
                            src={findSignImageUrl(detectedWord) || "/placeholder.svg"}
                            alt={`Sign for ${detectedWord}`}
                            className="object-contain w-full h-full"
                          />
                        </div>
                        <p className="text-xl font-semibold">{detectedWord}</p>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Image
                          src="/placeholder.svg?key=duhzf"
                          alt="Awaiting speech"
                          width={150}
                          height={150}
                          className="mx-auto mb-3 opacity-60"
                        />
                        <p>Speak to see sign language</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="max-w-md mx-auto">
            <SignImageUpload onImageUploaded={handleImageUploaded} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Gallery of Uploaded Signs */}
      {signImages.length > 0 && activeTab === "translation" && (
        <div className="mt-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">Available Sign Images</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {signImages.map((image, index) => (
              <div
                key={`${image.word}-${index}`}
                className="bg-background/50 rounded-lg p-3 text-center cursor-pointer hover:bg-background/80 transition-colors"
                onClick={() => {
                  setDetectedWord(image.word)
                  speakWord(image.word)
                }}
              >
                <div className="aspect-square mb-2 flex items-center justify-center overflow-hidden rounded-md">
                  <img
                    src={image.url || "/placeholder.svg"}
                    alt={`Sign for ${image.word}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium truncate">{image.word}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
