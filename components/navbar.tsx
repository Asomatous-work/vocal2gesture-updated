"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, ImageIcon } from "lucide-react"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <Image
                  src="/images/gesture-logo.png"
                  alt="Vocal2Gestures Logo"
                  width={32}
                  height={32}
                  className="mr-2"
                />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Vocal2Gestures</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Home
              </Link>
              <Link
                href="/speech-to-sign"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Speech to Sign
              </Link>
              <Link
                href="/sign-to-speech"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Sign to Speech
              </Link>
              <Link
                href="/sign-image-library"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Sign Library
              </Link>
              <Link
                href="/system-dashboard"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                System Dashboard
              </Link>
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link
              href="/speech-to-sign"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
              onClick={toggleMenu}
            >
              Speech to Sign
            </Link>
            <Link
              href="/sign-to-speech"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
              onClick={toggleMenu}
            >
              Sign to Speech
            </Link>
            <Link
              href="/sign-image-library"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white flex items-center pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
              onClick={toggleMenu}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Sign Library
            </Link>
            <Link
              href="/system-dashboard"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
              onClick={toggleMenu}
            >
              System Dashboard
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
