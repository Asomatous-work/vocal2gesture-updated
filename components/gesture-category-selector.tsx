"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  gestureCategories,
  gestureSubcategories,
  type GestureCategory,
  type GestureSubcategory,
  type GestureSuggestion,
  getSubcategoriesForCategory,
} from "@/lib/gesture-categories"

interface GestureCategorySelectorProps {
  onSelectGesture: (gestureName: string) => void
}

export function GestureCategorySelector({ onSelectGesture }: GestureCategorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<GestureCategory | null>(gestureCategories[0])
  const [selectedSubcategory, setSelectedSubcategory] = useState<GestureSubcategory | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Get subcategories for the selected category
  const subcategories = selectedCategory ? getSubcategoriesForCategory(selectedCategory.id) : []

  // Get gestures for the selected subcategory or filter all gestures by search
  const getFilteredGestures = () => {
    if (searchQuery.trim()) {
      // Search across all gestures
      const allGestures = gestureSubcategories.flatMap((sub) => sub.gestures)
      return allGestures.filter(
        (gesture) =>
          gesture.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          gesture.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    } else if (selectedSubcategory) {
      // Show gestures from selected subcategory
      return selectedSubcategory.gestures
    } else if (selectedCategory && subcategories.length > 0) {
      // Show gestures from first subcategory if none selected
      return subcategories[0].gestures
    }
    return []
  }

  const filteredGestures = getFilteredGestures()

  // Handle category selection
  const handleCategorySelect = (category: GestureCategory) => {
    setSelectedCategory(category)
    const subs = getSubcategoriesForCategory(category.id)
    setSelectedSubcategory(subs.length > 0 ? subs[0] : null)
    setSearchQuery("")
  }

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategory: GestureSubcategory) => {
    setSelectedSubcategory(subcategory)
    setSearchQuery("")
  }

  // Handle gesture selection
  const handleGestureSelect = (gesture: GestureSuggestion) => {
    onSelectGesture(gesture.name)
  }

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "intermediate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "advanced":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gesture Categories</CardTitle>
        <CardDescription>Select from predefined gesture categories or search for specific gestures</CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search gestures..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {searchQuery ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Search Results</h3>
            {filteredGestures.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredGestures.map((gesture) => (
                  <Button
                    key={gesture.id}
                    variant="outline"
                    className="h-auto flex flex-col items-start p-3 text-left"
                    onClick={() => handleGestureSelect(gesture)}
                  >
                    <span className="font-medium">{gesture.name}</span>
                    <Badge className={`mt-1 text-xs ${getDifficultyColor(gesture.difficulty)}`}>
                      {gesture.difficulty}
                    </Badge>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No gestures found matching "{searchQuery}"</p>
            )}
          </div>
        ) : (
          <Tabs defaultValue="categories" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="categories" className="flex-1">
                Categories
              </TabsTrigger>
              <TabsTrigger value="gestures" className="flex-1">
                Gestures
              </TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gestureCategories.map((category) => (
                    <motion.div key={category.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        className={`cursor-pointer overflow-hidden ${
                          selectedCategory?.id === category.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleCategorySelect(category)}
                      >
                        <div className="aspect-video relative">
                          <Image
                            src={category.imageUrl || "/placeholder.svg"}
                            alt={category.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium">{category.name}</h3>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="gestures" className="space-y-4">
              {selectedCategory && (
                <>
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {subcategories.map((subcategory) => (
                      <Button
                        key={subcategory.id}
                        variant={selectedSubcategory?.id === subcategory.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSubcategorySelect(subcategory)}
                        className="whitespace-nowrap"
                      >
                        {subcategory.name}
                      </Button>
                    ))}
                  </div>

                  <ScrollArea className="h-[250px] pr-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredGestures.map((gesture) => (
                        <Button
                          key={gesture.id}
                          variant="outline"
                          className="h-auto flex flex-col items-start p-3 text-left"
                          onClick={() => handleGestureSelect(gesture)}
                        >
                          <span className="font-medium">{gesture.name}</span>
                          <Badge className={`mt-1 text-xs ${getDifficultyColor(gesture.difficulty)}`}>
                            {gesture.difficulty}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">{filteredGestures.length} gestures available</div>
        <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
          Clear
        </Button>
      </CardFooter>
    </Card>
  )
}
