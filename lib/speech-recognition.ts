export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null
  private onEndCallback: (() => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null

  constructor() {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition: SpeechRecognitionStatic =
        window.SpeechRecognition || (window as any).webkitSpeechRecognition
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = "en-US"

      this.recognition.onresult = (event) => {
        if (this.onResultCallback) {
          const lastResult = event.results[event.results.length - 1]
          const transcript = lastResult[0].transcript
          const isFinal = lastResult.isFinal
          this.onResultCallback({ transcript, isFinal })
        }
      }

      this.recognition.onend = () => {
        this.isListening = false
        if (this.onEndCallback) {
          this.onEndCallback()
        }
      }

      this.recognition.onerror = (event) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(event)
        }
      }
    }
  }

  public start(): boolean {
    if (!this.recognition) {
      console.error("Speech recognition not supported in this browser")
      return false
    }

    if (!this.isListening) {
      try {
        this.recognition.start()
        this.isListening = true
        return true
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        return false
      }
    }
    return true
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  public isSupported(): boolean {
    return !!this.recognition
  }

  public onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.onResultCallback = callback
  }

  public onEnd(callback: () => void): void {
    this.onEndCallback = callback
  }

  public onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback
  }

  public isActive(): boolean {
    return this.isListening
  }
}

// Create a singleton instance
let speechRecognitionService: SpeechRecognitionService | null = null

export function getSpeechRecognitionService(): SpeechRecognitionService {
  if (!speechRecognitionService && typeof window !== "undefined") {
    speechRecognitionService = new SpeechRecognitionService()
  }
  return speechRecognitionService as SpeechRecognitionService
}
