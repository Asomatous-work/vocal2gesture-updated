"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X, Save, ArrowUpDown, Edit, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton-loader"

export interface Phrase {
  id: string
  name: string
  gestures: string[]
  translation: string
}

interface PhraseManagerProps {
  availableGestures: string[]
  onSavePhrases: (phrases: Phrase[]) => void
  initialPhrases?: Phrase[]
}

export function PhraseManager({ availableGestures, onSavePhrases, initialPhrases = [] }: PhraseManagerProps) {
  const [phrases, setPhrases] = useState<Phrase[]>(initialPhrases)
  const [newPhraseName, setNewPhraseName] = useState("")
  const [newPhraseTranslation, setNewPhraseTranslation] = useState("")
  const [selectedGestures, setSelectedGestures] = useState<string[]>([])
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null)
  const { toast } = useToast()

  // Add loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Update useEffect to include loading state
  useEffect(() => {
    setIsLoading(true)
    setPhrases(initialPhrases || [])
    setTimeout(() => setIsLoading(false), 500) // Short timeout for UX
  }, [initialPhrases])

  const resetForm = () => {
    setNewPhraseName("")
    setNewPhraseTranslation("")
    setSelectedGestures([])
    setEditingPhraseId(null)
  }

  const handleAddGesture = (gesture: string) => {
    if (!selectedGestures.includes(gesture)) {
      setSelectedGestures([...selectedGestures, gesture])
    }
  }

  const handleRemoveGesture = (index: number) => {
    const newGestures = [...selectedGestures]
    newGestures.splice(index, 1)
    setSelectedGestures(newGestures)
  }

  const handleMoveGesture = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === selectedGestures.length - 1)) {
      return
    }

    const newGestures = [...selectedGestures]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const temp = newGestures[index]
    newGestures[index] = newGestures[targetIndex]
    newGestures[targetIndex] = temp
    setSelectedGestures(newGestures)
  }

  const handleSavePhrase = () => {
    if (!newPhraseName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for the phrase.",
        variant: "destructive",
      })
      return
    }

    if (selectedGestures.length === 0) {
      toast({
        title: "No Gestures Selected",
        description: "Please select at least one gesture for the phrase.",
        variant: "destructive",
      })
      return
    }

    const translation = newPhraseTranslation.trim() || newPhraseName.trim()

    if (editingPhraseId) {
      // Update existing phrase
      const updatedPhrases = phrases.map((phrase) =>
        phrase.id === editingPhraseId
          ? {
              ...phrase,
              name: newPhraseName,
              gestures: selectedGestures,
              translation,
            }
          : phrase,
      )
      setPhrases(updatedPhrases)
      onSavePhrases(updatedPhrases)
      toast({
        title: "Phrase Updated",
        description: `"${newPhraseName}" has been updated.`,
      })
    } else {
      // Add new phrase
      const newPhrase: Phrase = {
        id: `phrase-${Date.now()}`,
        name: newPhraseName,
        gestures: selectedGestures,
        translation,
      }
      const updatedPhrases = [...phrases, newPhrase]
      setPhrases(updatedPhrases)
      onSavePhrases(updatedPhrases)
      toast({
        title: "Phrase Added",
        description: `"${newPhraseName}" has been added.`,
      })
    }

    resetForm()
  }

  const handleEditPhrase = (phrase: Phrase) => {
    setNewPhraseName(phrase.name)
    setNewPhraseTranslation(phrase.translation)
    setSelectedGestures([...phrase.gestures])
    setEditingPhraseId(phrase.id)
  }

  const handleDeletePhrase = (id: string) => {
    const updatedPhrases = phrases.filter((phrase) => phrase.id !== id)
    setPhrases(updatedPhrases)
    onSavePhrases(updatedPhrases)
    toast({
      title: "Phrase Deleted",
      description: "The phrase has been deleted.",
    })
  }

  const handleSave = () => {
    setIsSaving(true)
    // Simulate a small delay for better UX
    setTimeout(() => {
      onSavePhrases(phrases)
      setIsSaving(false)
    }, 800)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Phrase Editor */}
      <Card>
        <CardHeader>
          <CardTitle>{editingPhraseId ? "Edit Phrase" : "Create New Phrase"}</CardTitle>
          <CardDescription>
            {editingPhraseId ? "Modify the selected phrase" : "Define a sequence of gestures that form a phrase"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phrase-name">Phrase Name</Label>
            <Input
              id="phrase-name"
              value={newPhraseName}
              onChange={(e) => setNewPhraseName(e.target.value)}
              placeholder="Enter phrase name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="phrase-translation">Translation (Optional)</Label>
            <Input
              id="phrase-translation"
              value={newPhraseTranslation}
              onChange={(e) => setNewPhraseTranslation(e.target.value)}
              placeholder="Enter custom translation (defaults to name)"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If left empty, the phrase name will be used as the translation
            </p>
          </div>

          <div>
            <Label>Available Gestures</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {availableGestures.map((gesture) => (
                <Button
                  key={gesture}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddGesture(gesture)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {gesture}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Selected Gesture Sequence</Label>
            {selectedGestures.length > 0 ? (
              <div className="space-y-2 mt-1">
                {selectedGestures.map((gesture, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <div className="flex items-center">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                        {index + 1}
                      </span>
                      <span>{gesture}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMoveGesture(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUpDown className="h-4 w-4 rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMoveGesture(index, "down")}
                        disabled={index === selectedGestures.length - 1}
                      >
                        <ArrowUpDown className="h-4 w-4 -rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveGesture(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No gestures selected yet</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSavePhrase} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {editingPhraseId ? "Update Phrase" : "Save Phrase"}
            </Button>
            {editingPhraseId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Phrases */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Phrases</CardTitle>
          <CardDescription>Manage your saved gesture sequences</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-2/3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-md" />
                ))}
              </div>
            </div>
          ) : phrases.length > 0 ? (
            <div className="space-y-3">
              {phrases.map((phrase) => (
                <Card key={phrase.id} className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{phrase.name}</h4>
                        <p className="text-sm text-muted-foreground">{phrase.translation}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditPhrase(phrase)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePhrase(phrase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {phrase.gestures.map((gesture, index) => (
                        <div key={index} className="bg-background text-xs px-2 py-1 rounded-md flex items-center">
                          <span className="bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center text-[10px] mr-1">
                            {index + 1}
                          </span>
                          {gesture}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No phrases saved yet</p>
              <p className="text-sm mt-1">Create a new phrase to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Button onClick={handleSave} className="w-full mt-4" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving Phrases...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Phrases
          </>
        )}
      </Button>
    </div>
  )
}
