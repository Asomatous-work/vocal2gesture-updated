"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { gestureCategories, getSubcategoriesForCategory, getGesturesForSubcategory } from "@/lib/gesture-categories"

interface GestureReferenceImagesProps {
  selectedGesture?: string
}

export function GestureReferenceImages({ selectedGesture }: GestureReferenceImagesProps) {
  const [activeTab, setActiveTab] = useState("alphabet")
  const [referenceImages, setReferenceImages] = useState<{ [key: string]: string }>({})

  // Generate reference images for gestures
  useEffect(() => {
    const images: { [key: string]: string } = {}

    // Generate images for all categories
    gestureCategories.forEach((category) => {
      const subcategories = getSubcategoriesForCategory(category.id)

      subcategories.forEach((subcategory) => {
        const gestures = getGesturesForSubcategory(subcategory.id)

        gestures.forEach((gesture) => {
          // Generate a placeholder image URL for each gesture
          images[gesture.name] = `/placeholder.svg?height=300&width=300&query=sign language ${gesture.name}`
        })
      })
    })

    setReferenceImages(images)
  }, [])

  // Find the matching reference image for the selected gesture
  const findReferenceImage = (gestureName: string) => {
    // Try exact match first
    if (referenceImages[gestureName]) {
      return referenceImages[gestureName]
    }

    // Try case-insensitive match
    const key = Object.keys(referenceImages).find((k) => k.toLowerCase() === gestureName.toLowerCase())

    if (key) {
      return referenceImages[key]
    }

    // Return a generic placeholder if no match
    return `/placeholder.svg?height=300&width=300&query=sign language hand gesture ${gestureName}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gesture References</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="alphabet" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 grid grid-cols-4">
            <TabsTrigger value="alphabet">Alphabet</TabsTrigger>
            <TabsTrigger value="numbers">Numbers</TabsTrigger>
            <TabsTrigger value="common">Common</TabsTrigger>
            <TabsTrigger value="selected">Selected</TabsTrigger>
          </TabsList>

          <TabsContent value="alphabet" className="h-[300px]">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
                  <div key={letter} className="text-center">
                    <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                      <Image
                        src={`/placeholder.svg?height=100&width=100&query=sign language letter ${letter}`}
                        alt={`Letter ${letter} in sign language`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium mt-1 block">{letter}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="numbers" className="h-[300px]">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 10 }, (_, i) => i).map((number) => (
                  <div key={number} className="text-center">
                    <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                      <Image
                        src={`/placeholder.svg?height=100&width=100&query=sign language number ${number}`}
                        alt={`Number ${number} in sign language`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium mt-1 block">{number}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="common" className="h-[300px]">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["Hello", "Thank You", "Please", "Sorry", "Yes", "No", "Help", "Good", "Bad"].map((word) => (
                  <div key={word} className="text-center">
                    <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                      <Image
                        src={`/placeholder.svg?height=150&width=150&query=sign language ${word}`}
                        alt={`${word} in sign language`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium mt-1 block">{word}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="selected" className="h-[300px]">
            {selectedGesture ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="aspect-square relative bg-muted rounded-md overflow-hidden w-full max-w-[250px]">
                  <Image
                    src={findReferenceImage(selectedGesture) || "/placeholder.svg"}
                    alt={`${selectedGesture} in sign language`}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-lg font-medium mt-3 block">{selectedGesture}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No gesture selected</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
