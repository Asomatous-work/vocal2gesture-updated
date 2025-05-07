export interface GestureCategory {
  id: string
  name: string
  description: string
  examples: string[]
  imageUrl?: string
}

export interface GestureSubcategory {
  id: string
  parentId: string
  name: string
  description: string
  gestures: GestureSuggestion[]
}

export interface GestureSuggestion {
  id: string
  name: string
  description: string
  imageUrl?: string
  difficulty: "beginner" | "intermediate" | "advanced"
}

// Main gesture categories
export const gestureCategories: GestureCategory[] = [
  {
    id: "alphabet",
    name: "Alphabet",
    description: "Sign language alphabet gestures (A-Z)",
    examples: ["A", "B", "C", "Z"],
    imageUrl: "/placeholder.svg?key=pyg6y",
  },
  {
    id: "numbers",
    name: "Numbers",
    description: "Numeric gestures (0-9)",
    examples: ["1", "2", "3", "9"],
    imageUrl: "/placeholder.svg?key=emu07",
  },
  {
    id: "greetings",
    name: "Greetings",
    description: "Common greeting and conversation gestures",
    examples: ["Hello", "Goodbye", "Thank You", "Please"],
    imageUrl: "/placeholder.svg?key=7tfsl",
  },
  {
    id: "emotions",
    name: "Emotions",
    description: "Gestures expressing feelings and emotions",
    examples: ["Happy", "Sad", "Angry", "Surprised"],
    imageUrl: "/placeholder.svg?key=n0ckj",
  },
  {
    id: "questions",
    name: "Questions",
    description: "Question-related gestures",
    examples: ["What", "Where", "When", "How"],
    imageUrl: "/placeholder.svg?key=yt6og",
  },
  {
    id: "daily",
    name: "Daily Activities",
    description: "Gestures for everyday activities and needs",
    examples: ["Eat", "Drink", "Sleep", "Help"],
    imageUrl: "/placeholder.svg?height=200&width=200&query=sign language daily activities",
  },
  {
    id: "custom",
    name: "Custom Gestures",
    description: "Your own custom defined gestures",
    examples: ["Custom 1", "Custom 2"],
    imageUrl: "/placeholder.svg?height=200&width=200&query=custom hand gestures",
  },
]

// Subcategories with specific gesture suggestions
export const gestureSubcategories: GestureSubcategory[] = [
  // Alphabet subcategories
  {
    id: "alphabet-az",
    parentId: "alphabet",
    name: "A-Z Letters",
    description: "Complete alphabet in sign language",
    gestures: [
      { id: "a", name: "A", description: "Letter A in sign language", difficulty: "beginner" },
      { id: "b", name: "B", description: "Letter B in sign language", difficulty: "beginner" },
      { id: "c", name: "C", description: "Letter C in sign language", difficulty: "beginner" },
      { id: "d", name: "D", description: "Letter D in sign language", difficulty: "beginner" },
      { id: "e", name: "E", description: "Letter E in sign language", difficulty: "beginner" },
      { id: "f", name: "F", description: "Letter F in sign language", difficulty: "beginner" },
      { id: "g", name: "G", description: "Letter G in sign language", difficulty: "beginner" },
      { id: "h", name: "H", description: "Letter H in sign language", difficulty: "beginner" },
      { id: "i", name: "I", description: "Letter I in sign language", difficulty: "beginner" },
      { id: "j", name: "J", description: "Letter J in sign language", difficulty: "intermediate" },
      { id: "k", name: "K", description: "Letter K in sign language", difficulty: "beginner" },
      { id: "l", name: "L", description: "Letter L in sign language", difficulty: "beginner" },
      { id: "m", name: "M", description: "Letter M in sign language", difficulty: "beginner" },
      { id: "n", name: "N", description: "Letter N in sign language", difficulty: "beginner" },
      { id: "o", name: "O", description: "Letter O in sign language", difficulty: "beginner" },
      { id: "p", name: "P", description: "Letter P in sign language", difficulty: "beginner" },
      { id: "q", name: "Q", description: "Letter Q in sign language", difficulty: "intermediate" },
      { id: "r", name: "R", description: "Letter R in sign language", difficulty: "beginner" },
      { id: "s", name: "S", description: "Letter S in sign language", difficulty: "beginner" },
      { id: "t", name: "T", description: "Letter T in sign language", difficulty: "beginner" },
      { id: "u", name: "U", description: "Letter U in sign language", difficulty: "beginner" },
      { id: "v", name: "V", description: "Letter V in sign language", difficulty: "beginner" },
      { id: "w", name: "W", description: "Letter W in sign language", difficulty: "beginner" },
      { id: "x", name: "X", description: "Letter X in sign language", difficulty: "intermediate" },
      { id: "y", name: "Y", description: "Letter Y in sign language", difficulty: "beginner" },
      { id: "z", name: "Z", description: "Letter Z in sign language", difficulty: "intermediate" },
    ],
  },

  // Numbers subcategories
  {
    id: "numbers-basic",
    parentId: "numbers",
    name: "Basic Numbers (0-9)",
    description: "Single digit numbers in sign language",
    gestures: [
      { id: "num-0", name: "0", description: "Number 0 in sign language", difficulty: "beginner" },
      { id: "num-1", name: "1", description: "Number 1 in sign language", difficulty: "beginner" },
      { id: "num-2", name: "2", description: "Number 2 in sign language", difficulty: "beginner" },
      { id: "num-3", name: "3", description: "Number 3 in sign language", difficulty: "beginner" },
      { id: "num-4", name: "4", description: "Number 4 in sign language", difficulty: "beginner" },
      { id: "num-5", name: "5", description: "Number 5 in sign language", difficulty: "beginner" },
      { id: "num-6", name: "6", description: "Number 6 in sign language", difficulty: "beginner" },
      { id: "num-7", name: "7", description: "Number 7 in sign language", difficulty: "beginner" },
      { id: "num-8", name: "8", description: "Number 8 in sign language", difficulty: "beginner" },
      { id: "num-9", name: "9", description: "Number 9 in sign language", difficulty: "beginner" },
    ],
  },
  {
    id: "numbers-advanced",
    parentId: "numbers",
    name: "Advanced Numbers (10+)",
    description: "Double digit and larger numbers",
    gestures: [
      { id: "num-10", name: "10", description: "Number 10 in sign language", difficulty: "intermediate" },
      { id: "num-20", name: "20", description: "Number 20 in sign language", difficulty: "intermediate" },
      { id: "num-30", name: "30", description: "Number 30 in sign language", difficulty: "intermediate" },
      { id: "num-100", name: "100", description: "Number 100 in sign language", difficulty: "advanced" },
    ],
  },

  // Greetings subcategories
  {
    id: "greetings-basic",
    parentId: "greetings",
    name: "Basic Greetings",
    description: "Essential greeting gestures",
    gestures: [
      { id: "hello", name: "Hello", description: "Greeting someone", difficulty: "beginner" },
      { id: "goodbye", name: "Goodbye", description: "Saying farewell", difficulty: "beginner" },
      { id: "thank-you", name: "Thank You", description: "Expressing gratitude", difficulty: "beginner" },
      { id: "please", name: "Please", description: "Making a polite request", difficulty: "beginner" },
      { id: "sorry", name: "Sorry", description: "Apologizing", difficulty: "beginner" },
      {
        id: "nice-to-meet-you",
        name: "Nice to meet you",
        description: "Greeting someone new",
        difficulty: "intermediate",
      },
    ],
  },
  {
    id: "greetings-conversation",
    parentId: "greetings",
    name: "Conversation Starters",
    description: "Gestures to begin and maintain conversations",
    gestures: [
      { id: "how-are-you", name: "How are you?", description: "Asking about wellbeing", difficulty: "intermediate" },
      { id: "im-fine", name: "I'm fine", description: "Responding positively", difficulty: "intermediate" },
      { id: "my-name-is", name: "My name is...", description: "Introducing yourself", difficulty: "intermediate" },
      {
        id: "whats-your-name",
        name: "What's your name?",
        description: "Asking for someone's name",
        difficulty: "intermediate",
      },
    ],
  },

  // Emotions subcategories
  {
    id: "emotions-basic",
    parentId: "emotions",
    name: "Basic Emotions",
    description: "Fundamental emotional expressions",
    gestures: [
      { id: "happy", name: "Happy", description: "Expressing joy", difficulty: "beginner" },
      { id: "sad", name: "Sad", description: "Expressing sadness", difficulty: "beginner" },
      { id: "angry", name: "Angry", description: "Expressing anger", difficulty: "beginner" },
      { id: "scared", name: "Scared", description: "Expressing fear", difficulty: "beginner" },
      { id: "surprised", name: "Surprised", description: "Expressing surprise", difficulty: "beginner" },
      { id: "tired", name: "Tired", description: "Expressing fatigue", difficulty: "beginner" },
    ],
  },
  {
    id: "emotions-complex",
    parentId: "emotions",
    name: "Complex Emotions",
    description: "More nuanced emotional expressions",
    gestures: [
      { id: "proud", name: "Proud", description: "Expressing pride", difficulty: "intermediate" },
      { id: "confused", name: "Confused", description: "Expressing confusion", difficulty: "intermediate" },
      { id: "excited", name: "Excited", description: "Expressing excitement", difficulty: "intermediate" },
      { id: "bored", name: "Bored", description: "Expressing boredom", difficulty: "intermediate" },
      { id: "worried", name: "Worried", description: "Expressing concern", difficulty: "intermediate" },
    ],
  },

  // Questions subcategories
  {
    id: "questions-basic",
    parentId: "questions",
    name: "Basic Questions",
    description: "Common question words and phrases",
    gestures: [
      { id: "what", name: "What?", description: "Asking what", difficulty: "beginner" },
      { id: "where", name: "Where?", description: "Asking where", difficulty: "beginner" },
      { id: "when", name: "When?", description: "Asking when", difficulty: "beginner" },
      { id: "who", name: "Who?", description: "Asking who", difficulty: "beginner" },
      { id: "why", name: "Why?", description: "Asking why", difficulty: "beginner" },
      { id: "how", name: "How?", description: "Asking how", difficulty: "beginner" },
    ],
  },
  {
    id: "questions-complex",
    parentId: "questions",
    name: "Complex Questions",
    description: "More detailed question phrases",
    gestures: [
      { id: "how-much", name: "How much?", description: "Asking about price/quantity", difficulty: "intermediate" },
      { id: "how-many", name: "How many?", description: "Asking about quantity", difficulty: "intermediate" },
      { id: "which-one", name: "Which one?", description: "Asking for a selection", difficulty: "intermediate" },
      { id: "can-you", name: "Can you?", description: "Asking about ability", difficulty: "intermediate" },
    ],
  },

  // Daily Activities subcategories
  {
    id: "daily-needs",
    parentId: "daily",
    name: "Basic Needs",
    description: "Gestures for essential daily needs",
    gestures: [
      { id: "eat", name: "Eat", description: "Expressing hunger/eating", difficulty: "beginner" },
      { id: "drink", name: "Drink", description: "Expressing thirst/drinking", difficulty: "beginner" },
      { id: "sleep", name: "Sleep", description: "Expressing tiredness/sleeping", difficulty: "beginner" },
      { id: "bathroom", name: "Bathroom", description: "Needing the bathroom", difficulty: "beginner" },
      { id: "help", name: "Help", description: "Requesting assistance", difficulty: "beginner" },
    ],
  },
  {
    id: "daily-activities",
    parentId: "daily",
    name: "Activities",
    description: "Gestures for common activities",
    gestures: [
      { id: "work", name: "Work", description: "Working activity", difficulty: "intermediate" },
      { id: "study", name: "Study", description: "Studying activity", difficulty: "intermediate" },
      { id: "play", name: "Play", description: "Playing/recreation", difficulty: "beginner" },
      { id: "shop", name: "Shop", description: "Shopping activity", difficulty: "intermediate" },
      { id: "cook", name: "Cook", description: "Cooking activity", difficulty: "intermediate" },
      { id: "clean", name: "Clean", description: "Cleaning activity", difficulty: "intermediate" },
    ],
  },

  // Custom gestures subcategory
  {
    id: "custom-personal",
    parentId: "custom",
    name: "Personal Gestures",
    description: "Your own custom defined gestures",
    gestures: [
      { id: "custom-1", name: "Custom 1", description: "Your first custom gesture", difficulty: "beginner" },
      { id: "custom-2", name: "Custom 2", description: "Your second custom gesture", difficulty: "beginner" },
    ],
  },
]

// Helper function to get all gestures from all subcategories
export function getAllGestureSuggestions(): GestureSuggestion[] {
  return gestureSubcategories.flatMap((subcategory) => subcategory.gestures)
}

// Helper function to get subcategories for a specific category
export function getSubcategoriesForCategory(categoryId: string): GestureSubcategory[] {
  return gestureSubcategories.filter((subcategory) => subcategory.parentId === categoryId)
}

// Helper function to get gestures for a specific subcategory
export function getGesturesForSubcategory(subcategoryId: string): GestureSuggestion[] {
  const subcategory = gestureSubcategories.find((sub) => sub.id === subcategoryId)
  return subcategory ? subcategory.gestures : []
}

// Helper function to get a specific gesture by ID
export function getGestureById(gestureId: string): GestureSuggestion | undefined {
  return getAllGestureSuggestions().find((gesture) => gesture.id === gestureId)
}
