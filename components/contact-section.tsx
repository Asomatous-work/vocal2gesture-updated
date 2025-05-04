"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Mail, MessageSquare, Phone } from "lucide-react"

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Message Sent!",
        description: "Thank you for reaching out. We'll get back to you soon.",
      })
      setFormData({ name: "", email: "", message: "" })
    }, 1500)
  }

  return (
    <section
      id="contact"
      className="py-20 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-background dark:to-gray-900"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Get In Touch</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-8">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>

              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email Us</h4>
                  <p className="text-muted-foreground">info@vocal2gestures.com</p>
                  <p className="text-muted-foreground">support@vocal2gestures.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-full">
                  <Phone className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Call Us</h4>
                  <p className="text-muted-foreground">+91 98765 43210</p>
                  <p className="text-muted-foreground">Mon-Fri, 9am-5pm IST</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Social Media</h4>
                  <div className="flex space-x-4 mt-2">
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      Twitter
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      Facebook
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      Instagram
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6 bg-background p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-6">Send a Message</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Your Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Your Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows={5}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
