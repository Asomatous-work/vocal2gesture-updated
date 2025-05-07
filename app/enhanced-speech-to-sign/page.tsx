"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Mic, MicOff, Play, RefreshCw, Volume2, VolumeX, History, Loader2 } from "lucide-react"
import { EnhancedSignSlideshow } from "@/components/enhanced-sign-slideshow"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackButton } from "@/components/back-button"

interface TranscriptEntry {
  id: string
  text: string
  timestamp: Date
}

export default function EnhancedSpeechToSignPage() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [processedText, setProcessedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [words, setWords] = useState<string[]>([])
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([])
  const [manualInput, setManualInput] = useState("")
  const [activeTab, setActiveTab] = useState("speech")
  const [isShowingSlideshow, setIsShowingSlideshow] = useState(false)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<TranscriptEntry | null>(null)

  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  // Initialize speech recognition on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
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
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => {
            const newTranscript = prev ? `${prev} ${finalTranscript}` : finalTranscript
            return newTranscript
          })
        } else if (interimTranscript) {
          setTranscript((prev) => {
            const baseTranscript = prev.split(" (")[0] // Remove any previous interim
            return `${baseTranscript} (${interimTranscript})`
          })
        }
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

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start()
        }
      }
    } else {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support speech recognition. Try using Chrome.",
        variant: "destructive",
      })
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [toast])

  // Update recognition state when isListening changes
  useEffect(() => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.start()
      } else {
        recognitionRef.current.stop()
      }
    }
  }, [isListening])

  useEffect(() => {
    if (selectedHistoryEntry) {
      setProcessedText(selectedHistoryEntry.text)

      // Extract words for the slideshow
      const extractedWords = selectedHistoryEntry.text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 0)

      setWords(extractedWords)
      setIsShowingSlideshow(true)

      // Speak the text if speech is enabled
      if (isSpeechEnabled) {
        speakText(selectedHistoryEntry.text)
      }
    }
  }, [selectedHistoryEntry, isSpeechEnabled])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser does not support speech recognition. Try using Chrome.",
        variant: "destructive",
      })
      return
    }

    setIsListening(!isListening)

    if (!isListening) {
      // Starting to listen
      setTranscript("")
      toast({
        title: "Listening Started",
        description: "Speak clearly into your microphone.",
      })
    } else {
      // Stopping listening
      toast({
        title: "Listening Stopped",
        description: "Speech recognition has been paused.",
      })
    }
  }

  const processTranscript = async () => {
    // Clean up transcript by removing interim parts
    const cleanTranscript = transcript.split(" (")[0].trim()

    if (!cleanTranscript) {
      toast({
        title: "Empty Transcript",
        description: "Please speak or type something first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Add to history
      const entry: TranscriptEntry = {
        id: Date.now().toString(),
        text: cleanTranscript,
        timestamp: new Date(),
      }
      setTranscriptHistory((prev) => [entry, ...prev])

      // Process the text
      setProcessedText(cleanTranscript)

      // Extract words for the slideshow
      const extractedWords = cleanTranscript
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 0)

      setWords(extractedWords)
      setIsShowingSlideshow(true)

      // Speak the text if speech is enabled
      if (isSpeechEnabled) {
        speakText(cleanTranscript)
      }
    } catch (error) {
      console.error("Error processing transcript:", error)
      toast({
        title: "Processing Error",
        description: "There was an error processing your speech.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const processManualInput = () => {
    if (!manualInput.trim()) {
      toast({
        title: "Empty Input",
        description: "Please type something first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Add to history
      const entry: TranscriptEntry = {
        id: Date.now().toString(),
        text: manualInput.trim(),
        timestamp: new Date(),
      }
      setTranscriptHistory((prev) => [entry, ...prev])

      // Process the text
      setProcessedText(manualInput.trim())

      // Extract words for the slideshow
      const extractedWords = manualInput
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 0)

      setWords(extractedWords)
      setIsShowingSlideshow(true)

      // Speak the text if speech is enabled
      if (isSpeechEnabled) {
        speakText(manualInput.trim())
      }
    } catch (error) {
      console.error("Error processing manual input:", error)
      toast({
        title: "Processing Error",
        description: "There was an error processing your text.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setManualInput("")
    }
  }

  const speakText = (text: string) => {
    if (!isSpeechEnabled) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
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

    toast({
      title: isSpeechEnabled ? "Speech Disabled" : "Speech Enabled",
      description: isSpeechEnabled ? "Speech output has been turned off." : "Speech output has been turned on.",
    })
  }

  const resetAll = () => {
    setTranscript("")
    setProcessedText("")
    setWords([])
    setIsShowingSlideshow(false)
    setManualInput("")
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
          Speak or type text to see it translated into sign language gestures
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 h-full">
            <CardHeader>
              <CardTitle>Input</CardTitle>
              <CardDescription>Speak or type text to translate into sign language</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="w-full">
                  <TabsTrigger value="speech">Speech Recognition</TabsTrigger>
                  <TabsTrigger value="text">Text Input</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="speech" className="space-y-4">
                  <div className="flex justify-center mb-4">
                    <Button
                      onClick={toggleListening}
                      className={`${
                        isListening
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      } w-full max-w-xs h-16 rounded-full`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="mr-2 h-5 w-5" />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-5 w-5" />
                          Start Listening
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-muted rounded-md p-4 min-h-32">
                    <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
                    {transcript ? (
                      <p className="whitespace-pre-wrap">{transcript}</p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        {isListening ? "Listening... Speak now" : "Press the button and start speaking"}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={resetAll} disabled={!transcript}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button
                      onClick={processTranscript}
                      disabled={!transcript || isProcessing}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Translate to Sign
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="manual-input">Enter text to translate</Label>
                    <Textarea
                      id="manual-input"
                      placeholder="Type your text here..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="min-h-32"
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setManualInput("")} disabled={!manualInput}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      onClick={processManualInput}
                      disabled={!manualInput.trim() || isProcessing}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Translate to Sign
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {transcriptHistory.length > 0 ? (
                    <ScrollArea className="h-64 rounded-md border p-2">
                      <div className="space-y-2">
                        {transcriptHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-3 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                            onClick={() => setSelectedHistoryEntry(entry)}
                          >
                            <p className="font-medium line-clamp-2">{entry.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{entry.timestamp.toLocaleTimeString()}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No history yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Your translated phrases will appear here</p>
                    </div>
                  )}

                  {transcriptHistory.length > 0 && (
                    <Button variant="outline" onClick={() => setTranscriptHistory([])} className="w-full">
                      Clear History
                    </Button>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center">
                  <Button variant="ghost" size="sm" onClick={toggleSpeech} className="h-8">
                    {isSpeechEnabled ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
                    {isSpeechEnabled ? "Mute" : "Unmute"}
                  </Button>
                </div>
                {words.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    <span className="text-xs text-muted-foreground mr-1">Words:</span>
                    {words.slice(0, 5).map((word, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                    {words.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{words.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 h-full">
            <CardHeader>
              <CardTitle>Sign Language Translation</CardTitle>
              <CardDescription>
                {isShowingSlideshow
                  ? `Showing signs for "${processedText}"`
                  : "Your sign language translation will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isShowingSlideshow ? (
                <EnhancedSignSlideshow
                  words={words}
                  autoPlay={true}
                  interval={2000}
                  showControls={true}
                  onComplete={() => {
                    toast({
                      title: "Slideshow Complete",
                      description: "All signs have been displayed.",
                    })
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Translation Yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Speak or type text on the left to see it translated into sign language gestures
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Need to add more sign language images?{" "}
          <a href="/upload" className="text-blue-500 hover:underline">
            Go to the Image Uploader
          </a>
        </p>
      </motion.div>
    </div>
  )
}
