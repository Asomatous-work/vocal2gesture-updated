export interface SignImage {
  id: string
  word: string
  url: string
  category?: string
  tags?: string[]
}

export interface AnimationFrame {
  pose: any
  faceLandmarks: any
  leftHandLandmarks: any
  rightHandLandmarks: any
  timestamp: number
}

export interface Animation {
  id: string
  word: string
  frames: AnimationFrame[]
  duration: number
  createdAt: string
}

export interface SignLanguageImage {
  id: string
  word: string
  imageUrl: string
}

// Mock data for sign language images
export const signLanguageImages: SignLanguageImage[] = [
  {
    id: "hello",
    word: "Hello",
    imageUrl: "/placeholder.svg?key=fsdpj",
  },
  {
    id: "thank-you",
    word: "Thank you",
    imageUrl: "/placeholder.svg?key=fpbvy",
  },
  {
    id: "please",
    word: "Please",
    imageUrl: "/placeholder.svg?key=wry33",
  },
  {
    id: "yes",
    word: "Yes",
    imageUrl: "/placeholder.svg?key=fepal",
  },
  {
    id: "no",
    word: "No",
    imageUrl: "/placeholder.svg?key=mu0gu",
  },
  {
    id: "help",
    word: "Help",
    imageUrl: "/placeholder.svg?key=k8g81",
  },
  {
    id: "good",
    word: "Good",
    imageUrl: "/placeholder.svg?key=9bbrm",
  },
  {
    id: "bad",
    word: "Bad",
    imageUrl: "/placeholder.svg?key=ltnlc",
  },
  {
    id: "how-are-you",
    word: "How are you",
    imageUrl: "/placeholder.svg?key=snpcy",
  },
  {
    id: "fine",
    word: "Fine",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for fine",
  },
  {
    id: "sorry",
    word: "Sorry",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for sorry",
  },
  {
    id: "excuse-me",
    word: "Excuse me",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for excuse me",
  },
  {
    id: "goodbye",
    word: "Goodbye",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for goodbye",
  },
  {
    id: "morning",
    word: "Morning",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for morning",
  },
  {
    id: "evening",
    word: "Evening",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for evening",
  },
]

export function getSignImageForWord(word: string): string {
  const sign = signLanguageImages.find((sign) => sign.word.toLowerCase() === word.toLowerCase())

  if (sign) {
    return sign.imageUrl
  }

  // If no exact match, generate a placeholder for this specific word
  return `/placeholder.svg?height=300&width=300&query=hand sign for ${encodeURIComponent(word)}`
}

export function getRandomSignImages(count = 5): SignLanguageImage[] {
  const shuffled = [...signLanguageImages].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

class SignLanguageDataService {
  private signImages: SignImage[] = []
  private animations: Animation[] = []
  private isInitialized = false

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromLocalStorage()
    }
  }

  private loadFromLocalStorage() {
    try {
      const signImagesData = localStorage.getItem("signImages")
      if (signImagesData) {
        this.signImages = JSON.parse(signImagesData)
      }

      const animationsData = localStorage.getItem("signAnimations")
      if (animationsData) {
        this.animations = JSON.parse(animationsData)
      }

      this.isInitialized = true
    } catch (error) {
      console.error("Error loading sign language data:", error)
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem("signImages", JSON.stringify(this.signImages))
      localStorage.setItem("signAnimations", JSON.stringify(this.animations))
    } catch (error) {
      console.error("Error saving sign language data:", error)
    }
  }

  // Sign Images methods
  public getSignImages(): SignImage[] {
    return [...this.signImages]
  }

  public getSignImagesByWord(word: string): SignImage[] {
    return this.signImages.filter((image) => image.word.toLowerCase() === word.toLowerCase())
  }

  public addSignImage(image: SignImage): boolean {
    try {
      // Check if image with same ID already exists
      const existingIndex = this.signImages.findIndex((img) => img.id === image.id)

      if (existingIndex >= 0) {
        // Update existing image
        this.signImages[existingIndex] = image
      } else {
        // Add new image
        this.signImages.push(image)
      }

      this.saveToLocalStorage()
      return true
    } catch (error) {
      console.error("Error adding sign image:", error)
      return false
    }
  }

  public removeSignImage(id: string): boolean {
    try {
      const initialLength = this.signImages.length
      this.signImages = this.signImages.filter((image) => image.id !== id)

      if (this.signImages.length !== initialLength) {
        this.saveToLocalStorage()
        return true
      }

      return false
    } catch (error) {
      console.error("Error removing sign image:", error)
      return false
    }
  }

  // Animation methods
  public getAnimations(): Animation[] {
    return [...this.animations]
  }

  public getAnimationByWord(word: string): Animation | null {
    return this.animations.find((animation) => animation.word.toLowerCase() === word.toLowerCase()) || null
  }

  public addAnimation(animation: Animation): boolean {
    try {
      // Check if animation with same ID already exists
      const existingIndex = this.animations.findIndex((anim) => anim.id === animation.id)

      if (existingIndex >= 0) {
        // Update existing animation
        this.animations[existingIndex] = animation
      } else {
        // Add new animation
        this.animations.push(animation)
      }

      this.saveToLocalStorage()
      return true
    } catch (error) {
      console.error("Error adding animation:", error)
      return false
    }
  }

  public removeAnimation(id: string): boolean {
    try {
      const initialLength = this.animations.length
      this.animations = this.animations.filter((animation) => animation.id !== id)

      if (this.animations.length !== initialLength) {
        this.saveToLocalStorage()
        return true
      }

      return false
    } catch (error) {
      console.error("Error removing animation:", error)
      return false
    }
  }

  // Utility methods
  public isDataInitialized(): boolean {
    return this.isInitialized
  }

  public clearAllData(): boolean {
    try {
      this.signImages = []
      this.animations = []
      this.saveToLocalStorage()
      return true
    } catch (error) {
      console.error("Error clearing sign language data:", error)
      return false
    }
  }
}

// Create a singleton instance
let signLanguageDataService: SignLanguageDataService | null = null

export function getSignLanguageDataService(): SignLanguageDataService {
  if (!signLanguageDataService && typeof window !== "undefined") {
    signLanguageDataService = new SignLanguageDataService()
  }
  return signLanguageDataService as SignLanguageDataService
}
