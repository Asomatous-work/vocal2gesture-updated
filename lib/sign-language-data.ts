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
    imageUrl: "/placeholder.svg?key=7xnxv",
  },
  {
    id: "thank-you",
    word: "Thank you",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for thank you",
  },
  {
    id: "please",
    word: "Please",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for please",
  },
  {
    id: "yes",
    word: "Yes",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for yes",
  },
  {
    id: "no",
    word: "No",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for no",
  },
  {
    id: "help",
    word: "Help",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for help",
  },
  {
    id: "good",
    word: "Good",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for good",
  },
  {
    id: "bad",
    word: "Bad",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for bad",
  },
  {
    id: "how-are-you",
    word: "How are you",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for how are you",
  },
  {
    id: "fine",
    word: "Fine",
    imageUrl: "/placeholder.svg?height=300&width=300&query=hand sign for fine",
  },
]

export function getSignImageForWord(word: string): string {
  const sign = signLanguageImages.find((sign) => sign.word.toLowerCase() === word.toLowerCase())

  return sign?.imageUrl || "/placeholder.svg?height=300&width=300&query=generic hand sign"
}

export function getRandomSignImages(count = 5): SignLanguageImage[] {
  const shuffled = [...signLanguageImages].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}
