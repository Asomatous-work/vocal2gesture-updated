export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
}

export interface SpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (result: SpeechRecognitionResult) => void
  onError?: (error: any) => void
  onEnd?: () => void
}

export class SpeechRecognitionService {
  private recognition: any
  private isListening = false
  private options: SpeechRecognitionOptions

  constructor(options: SpeechRecognitionOptions = {}) {
    this.options = {
      language: "en-US",
      continuous: true,
      interimResults: true,
      ...options,
    }

    if (typeof window !== "undefined") {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.lang = this.options.language
        this.recognition.continuous = this.options.continuous
        this.recognition.interimResults = this.options.interimResults

        this.recognition.onresult = (event: any) => {
          const last = event.results.length - 1
          const transcript = event.results[last][0].transcript
          const isFinal = event.results[last].isFinal

          if (this.options.onResult) {
            this.options.onResult({ transcript, isFinal })
          }
        }

        this.recognition.onerror = (event: any) => {
          if (this.options.onError) {
            this.options.onError(event)
          }
        }

        this.recognition.onend = () => {
          if (this.isListening) {
            this.recognition.start()
          } else if (this.options.onEnd) {
            this.options.onEnd()
          }
        }
      }
    }
  }

  public start(): boolean {
    if (!this.recognition) {
      return false
    }

    try {
      this.recognition.start()
      this.isListening = true
      return true
    } catch (error) {
      console.error("Speech recognition error:", error)
      return false
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      this.isListening = false
      this.recognition.stop()
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      // @ts-ignore
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    )
  }
}
