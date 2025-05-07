"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
            <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={30} height={30} />
            <span className="font-bold text-xl">Vocal2Gestures</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          <Link
            href="/speech-to-sign"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/speech-to-sign") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Speech to Sign
          </Link>
          <Link
            href="/enhanced-speech-to-sign"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/enhanced-speech-to-sign") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Enhanced Speech to Sign
          </Link>
          <Link
            href="/sign-to-speech"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/sign-to-speech") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Sign to Speech
          </Link>
          <Link
            href="/training"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/training") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Training
          </Link>
          <Link
            href="/upload"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/upload") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Upload
          </Link>
          <Link
            href="/system-dashboard"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/system-dashboard") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            System Dashboard
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container py-4 space-y-4">
            <Link
              href="/"
              className={`block py-2 text-base font-medium ${isActive("/") ? "text-primary" : "text-foreground"}`}
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link
              href="/speech-to-sign"
              className={`block py-2 text-base font-medium ${
                isActive("/speech-to-sign") ? "text-primary" : "text-foreground"
              }`}
              onClick={closeMenu}
            >
              Speech to Sign
            </Link>
            <Link
              href="/enhanced-speech-to-sign"
              className={`block py-2 text-base font-medium ${
                isActive("/enhanced-speech-to-sign") ? "text-primary" : "text-foreground"
              }`}
              onClick={closeMenu}
            >
              Enhanced Speech to Sign
            </Link>
            <Link
              href="/sign-to-speech"
              className={`block py-2 text-base font-medium ${
                isActive("/sign-to-speech") ? "text-primary" : "text-foreground"
              }`}
              onClick={closeMenu}
            >
              Sign to Speech
            </Link>
            <Link
              href="/training"
              className={`block py-2 text-base font-medium ${
                isActive("/training") ? "text-primary" : "text-foreground"
              }`}
              onClick={closeMenu}
            >
              Training
            </Link>
            <Link
              href="/upload"
              className={`block py-2 text-base font-medium ${isActive("/upload") ? "text-primary" : "text-foreground"}`}
              onClick={closeMenu}
            >
              Upload
            </Link>
            <Link
              href="/system-dashboard"
              className={`block py-2 text-base font-medium ${
                isActive("/system-dashboard") ? "text-primary" : "text-foreground"
              }`}
              onClick={closeMenu}
            >
              System Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
