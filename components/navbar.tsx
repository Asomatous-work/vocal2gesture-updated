"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, Home, Mic, Hand, BookOpen, BarChart2, Upload, Settings, Layers, Video } from "lucide-react"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const routes = [
    { name: "Home", path: "/", icon: <Home className="h-5 w-5 mr-2" /> },
    { name: "Speech to Sign", path: "/speech-to-sign", icon: <Mic className="h-5 w-5 mr-2" /> },
    { name: "Sign to Speech", path: "/sign-to-speech", icon: <Hand className="h-5 w-5 mr-2" /> },
    { name: "Sign Phrases", path: "/sign-to-speech-phrases", icon: <BookOpen className="h-5 w-5 mr-2" /> },
    { name: "Training", path: "/training", icon: <BarChart2 className="h-5 w-5 mr-2" /> },
    { name: "Sign Library", path: "/sign-image-library", icon: <Layers className="h-5 w-5 mr-2" /> },
    { name: "Animation Recorder", path: "/animation-recorder", icon: <Video className="h-5 w-5 mr-2" /> },
    { name: "Upload", path: "/upload", icon: <Upload className="h-5 w-5 mr-2" /> },
    { name: "Dashboard", path: "/system-dashboard", icon: <Settings className="h-5 w-5 mr-2" /> },
  ]

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center" onClick={closeMenu}>
                <img className="h-8 w-auto" src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Vocal2Gestures</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {routes.map((route) => (
                <Link
                  key={route.path}
                  href={route.path}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    pathname === route.path
                      ? "border-purple-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-700 dark:hover:text-gray-200",
                  )}
                >
                  {route.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
              onClick={toggleMenu}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? "block" : "hidden"} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {routes.map((route) => (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex items-center pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                pathname === route.path
                  ? "bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-700 dark:text-purple-300"
                  : "border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-800 dark:hover:text-gray-200",
              )}
              onClick={closeMenu}
            >
              {route.icon}
              {route.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
