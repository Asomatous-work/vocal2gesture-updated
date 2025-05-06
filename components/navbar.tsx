"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Add a loading state for route transitions
  const [isRouteChanging, setIsRouteChanging] = useState(false)
  const pathname = usePathname()

  // Add effect to handle route change animations
  useEffect(() => {
    setIsRouteChanging(true)

    // Simulate a short delay to show loading state
    const timer = setTimeout(() => {
      setIsRouteChanging(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [pathname])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Add loading indicator to the navbar for route changes */}
      {isRouteChanging && (
        <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-progress z-50" />
      )}
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
      {/* Also add a global style for the progress animation */}
      <style jsx global>{`
        @keyframes progress {
          0% {
            width: 0%;
            opacity: 1;
          }
          50% {
            width: 50%;
            opacity: 1;
          }
          90% {
            width: 90%;
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }
        .animate-progress {
          animation: progress 0.8s ease-in-out;
        }
      `}</style>
    </header>
  )
}
