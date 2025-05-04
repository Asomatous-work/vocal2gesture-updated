"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Mock sign language images for demonstration
const mockSignImages = [
  "/placeholder.svg?key=9mwjg",
  "/placeholder.svg?key=ngjqh",
  "/placeholder.svg?key=5c5f9",
  "/placeholder.svg?key=hbwht",
  "/placeholder.svg?key=pombk",
]

export function SpeechToSignDemo() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [currentSignIndex, setCurrentSignIndex] = useState(0)
  const [showSigns, setShowSigns] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  // Set up speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join("")

        setTranscript(transcript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error)
        setIsListening(false)
        toast({
          title: "Error",
          description: "There was an error with speech recognition. Please try again.",
          variant: "destructive",
        })
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [toast])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
          setTranscript("")
          setShowSigns(false)
        } catch (error) {
          console.error("Speech recognition error:", error)
          toast({
            title: "Error",
            description: "Could not start speech recognition. Please try again.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Not Supported",
          description: "Speech recognition is not supported in your browser.",
          variant: "destructive",
        })
      }
    }
  }

  const processTranscript = () => {
    if (!transcript.trim()) {
      toast({
        title: "Empty Speech",
        description: "Please speak something before translating.",
        variant: "destructive",
      })
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

    setIsProcessing(true)

    // Simulate processing delay
    setTimeout(() => {
      setShowSigns(true)
      setIsProcessing(false)

      // Start the slideshow
      setCurrentSignIndex(0)
    }, 1500)
  }

  // Handle sign slideshow
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (showSigns) {
      interval = setInterval(() => {
        setCurrentSignIndex((prev) => (prev < mockSignImages.length - 1 ? prev + 1 : prev))
      }, 2000)
    }

    return () => clearInterval(interval)
  }, [showSigns])

  const resetDemo = () => {
    setTranscript("")
    setShowSigns(false)
    setCurrentSignIndex(0)
    setIsProcessing(false)
  }

  return (
    <section id="speech-to-sign" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Speech to Sign Translation</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Speak in Tamil or Tanglish and see the corresponding sign language visuals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
              <CardContent className="p-8">
                <div className="flex flex-col items-center">
                  <Button
                    onClick={toggleListening}
                    size="lg"
                    className={`rounded-full w-20 h-20 mb-6 ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    }`}
                    disabled={isProcessing}
                  >
                    {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                  </Button>

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">{isListening ? "Listening..." : "Tap to Speak"}</h3>
                    <p className="text-muted-foreground text-sm">
                      {isListening
                        ? "Speak clearly in Tamil or Tanglish"
                        : "Press the microphone button and start speaking"}
                    </p>
                  </div>

                  <div className="w-full min-h-[100px] bg-background/80 backdrop-blur-sm rounded-lg p-4 mb-6">
                    <p className="text-lg">{transcript || "Your speech will appear here..."}</p>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={processTranscript}
                      disabled={!transcript || isProcessing || isListening}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Translate to Sign"
                      )}
                    </Button>

                    <Button variant="outline" onClick={resetDemo} disabled={isProcessing && !showSigns && !transcript}>
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center">
              {showSigns ? (
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  {mockSignImages.map((src, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: currentSignIndex === index ? 1 : 0,
                        scale: currentSignIndex === index ? 1 : 0.8,
                      }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <img
                        src={src || "/placeholder.svg"}
                        alt={`Sign language visual ${index + 1}`}
                        className="rounded-lg shadow-lg max-h-full"
                      />
                    </motion.div>
                  ))}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {mockSignImages.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          currentSignIndex === index ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square max-w-md mx-auto bg-muted/50 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground text-center px-8">
                    {isProcessing
                      ? "Processing your speech..."
                      : "Sign language visuals will appear here after you speak and translate"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
