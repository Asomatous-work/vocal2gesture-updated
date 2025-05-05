"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={36} height={36} />
            <span className="hidden font-bold sm:inline-block">Vocal2Gestures</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/sign-to-speech" className="text-sm font-medium transition-colors hover:text-primary">
            Sign to Speech
          </Link>
          <Link href="/training" className="text-sm font-medium transition-colors hover:text-primary">
            Training
          </Link>
          <Link href="/upload" className="text-sm font-medium transition-colors hover:text-primary">
            Upload Signs
          </Link>
          <Link href="/model-management" className="text-sm font-medium transition-colors hover:text-primary">
            Model Management
          </Link>
          <Link href="/sign-to-speech-phrases" className="text-sm font-medium transition-colors hover:text-primary">
            Phrases
          </Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container py-4 space-y-4">
            <Link
              href="/"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/sign-to-speech"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign to Speech
            </Link>
            <Link
              href="/training"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Training
            </Link>
            <Link
              href="/upload"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Upload Signs
            </Link>
            <Link
              href="/model-management"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Model Management
            </Link>
            <Link
              href="/sign-to-speech-phrases"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Phrases
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
