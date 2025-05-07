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
