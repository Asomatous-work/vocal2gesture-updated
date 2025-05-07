import { getImageStorageService } from "./image-storage-service"
import { getSignLanguageDataService } from "./sign-language-data"

// Sample sign language images with their corresponding words
const sampleImages = [
  {
    word: "Hello",
    url: "/placeholder.svg?key=lib4i",
  },
  {
    word: "Thank you",
    url: "/placeholder.svg?key=3bf89",
  },
  {
    word: "Please",
    url: "/placeholder.svg?key=hztzd",
  },
  {
    word: "Yes",
    url: "/placeholder.svg?key=203m4",
  },
  {
    word: "No",
    url: "/placeholder.svg?key=vl1ob",
  },
  {
    word: "Help",
    url: "/placeholder.svg?height=300&width=300&query=sign language help gesture",
  },
  {
    word: "Sorry",
    url: "/placeholder.svg?height=300&width=300&query=sign language sorry gesture",
  },
  {
    word: "Good",
    url: "/placeholder.svg?height=300&width=300&query=sign language good gesture",
  },
  {
    word: "Bad",
    url: "/placeholder.svg?height=300&width=300&query=sign language bad gesture",
  },
  {
    word: "Love",
    url: "/placeholder.svg?height=300&width=300&query=sign language love gesture",
  },
  {
    word: "Friend",
    url: "/placeholder.svg?height=300&width=300&query=sign language friend gesture",
  },
  {
    word: "Family",
    url: "/placeholder.svg?height=300&width=300&query=sign language family gesture",
  },
  {
    word: "Eat",
    url: "/placeholder.svg?height=300&width=300&query=sign language eat gesture",
  },
  {
    word: "Drink",
    url: "/placeholder.svg?height=300&width=300&query=sign language drink gesture",
  },
  {
    word: "Sleep",
    url: "/placeholder.svg?height=300&width=300&query=sign language sleep gesture",
  },
  {
    word: "Work",
    url: "/placeholder.svg?height=300&width=300&query=sign language work gesture",
  },
  {
    word: "Play",
    url: "/placeholder.svg?height=300&width=300&query=sign language play gesture",
  },
  {
    word: "Learn",
    url: "/placeholder.svg?height=300&width=300&query=sign language learn gesture",
  },
  {
    word: "Understand",
    url: "/placeholder.svg?height=300&width=300&query=sign language understand gesture",
  },
  {
    word: "Time",
    url: "/placeholder.svg?height=300&width=300&query=sign language time gesture",
  },
]

/**
 * Loads sample sign images into the application
 * @returns Promise that resolves when all images are loaded
 */
export async function loadSampleSignImages(): Promise<boolean> {
  try {
    const imageService = getImageStorageService()
    const signLanguageService = getSignLanguageDataService()

    // Check if we already have images
    const existingImages = imageService.getImages()
    if (existingImages.length > 0) {
      console.log("Sample images already loaded, skipping...")
      return true
    }

    console.log("Loading sample sign images...")

    // Load each sample image
    for (const sample of sampleImages) {
      // Create a fetch request to get the image
      const response = await fetch(sample.url)
      const blob = await response.blob()

      // Upload the image
      await imageService.uploadImage(sample.word, blob, {
        category: "Sample",
        tags: ["sample", "basic"],
      })
    }

    console.log("Sample sign images loaded successfully")
    return true
  } catch (error) {
    console.error("Error loading sample sign images:", error)
    return false
  }
}
