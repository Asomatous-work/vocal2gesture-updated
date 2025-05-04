import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { SpeechToSignDemo } from "@/components/speech-to-sign-demo"
import { SignToSpeechDemo } from "@/components/sign-to-speech-demo"
import { HowItWorks } from "@/components/how-it-works"
import { Testimonials } from "@/components/testimonials"
import { Footer } from "@/components/footer"
import { ContactSection } from "@/components/contact-section"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <SpeechToSignDemo />
      <SignToSpeechDemo />
      <Testimonials />
      <ContactSection />
      <Footer />
    </div>
  )
}
