import Link from "next/link"
import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                Vocal2Gestures
              </span>
            </Link>
            <p className="text-muted-foreground mb-4">
              Breaking communication barriers between spoken and sign languages.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Features</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#speech-to-sign" className="text-muted-foreground hover:text-primary transition-colors">
                  Speech to Sign
                </Link>
              </li>
              <li>
                <Link href="#sign-to-speech" className="text-muted-foreground hover:text-primary transition-colors">
                  Sign to Speech
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Tamil Support
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Tanglish Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  API
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Vocal2Gestures. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm flex items-center mt-4 md:mt-0">
            Made with <Heart className="h-4 w-4 text-red-500 mx-1" /> for accessibility
          </p>
        </div>
      </div>
    </footer>
  )
}
