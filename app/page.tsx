"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Settings, User } from "lucide-react"
import { motion } from "framer-motion"

import { ChatBot } from "@/components/chatbot/chatbot"

const compressImage = async (file: File, maxWidth = 800, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ratio = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * ratio

        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        resolve(canvas.toDataURL("image/jpeg", quality))
      }
    }
  })
}

export default function ChatbotCustomizer() {
  const [settings, setSettings] = useState({
    name: "My Chatbot",
    description: "A friendly and helpful chatbot",
    profilePhoto: "/profile.jpg",
    developerPrompt: "You are a helpful and friendly chatbot.",
    chatColor: "#95a489",
    accentColor: "#909a7e",
  })
  const [previewMessage, setPreviewMessage] = useState("")
  const [chatMessages, setChatMessages] = useState([{ role: "assistant", content: "Hello! How can I help you today?" }])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [imageStats, setImageStats] = useState<{ original: number; compressed: number } | null>(null)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const handleSettingChange = (key: string, value: string) => {
    setSettings({
      ...settings,
      [key]: value,
    })
  }

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const compressedImage = await compressImage(file)

      // Calculate sizes
      const originalSize = file.size / 1024 // KB
      const compressedSize = (compressedImage.length * 0.75) / 1024 // KB (base64 to binary ratio is ~4:3)

      setImageStats({
        original: Math.round(originalSize),
        compressed: Math.round(compressedSize),
      })

      handleSettingChange("profilePhoto", compressedImage)
    } catch (error) {
      console.error("Error compressing image:", error)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()
    setChatMessages([
      ...chatMessages,
      { role: "user", content: previewMessage },
      { role: "assistant", content: "This is a response to your message." },
    ])
    setPreviewMessage("")
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  return (
    <motion.div
      className="container mx-auto py-10 my-10"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      <motion.h1 className="text-3xl font-bold mb-12 text-center" variants={itemVariants}>
        <p className="text-5xl font-bold mb-12">Chat Crafter</p>
        <p className="text-xl font-normal text-gray-600 text-center">Customize your ideas into a chatbot without <strong>ANY coding experience</strong>.</p>
        <p className="text-xl font-normal text-gray-600 text-center">Try out your creation in the bottom right corner.</p>
      </motion.h1>

      <div className="gap-8 my-10">
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardHeader className="relative z-10 text-white" style={{ backgroundColor: settings.accentColor }}>
              <CardTitle>Chatbot Settings</CardTitle>
              <CardDescription className="text-gray-100">Customize how your chatbot looks and behaves</CardDescription>
            </CardHeader>
            <motion.div variants={containerVariants} className="relative">
              <CardContent className="space-y-6 pt-6">
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => handleSettingChange("name", e.target.value)}
                    className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
                  />
                </motion.div>

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={settings.description}
                    onChange={(e) => handleSettingChange("description", e.target.value)}
                    className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
                  />
                </motion.div>

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="profilePhoto">Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 transition-all duration-300 hover:scale-105">
                      <AvatarImage src={settings.profilePhoto} alt="Profile" />
                      <AvatarFallback>
                        {isCompressing ? <div className="animate-spin">⌛</div> : <User />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="profilePhoto"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="transition-all duration-300"
                        disabled={isCompressing}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="developerPrompt">Developer Prompt</Label>
                  <Textarea
                    id="developerPrompt"
                    value={settings.developerPrompt}
                    onChange={(e) => handleSettingChange("developerPrompt", e.target.value)}
                    placeholder="Instructions for how your chatbot should behave"
                    className="min-h-[100px] transition-all duration-300 focus:ring-2 focus:ring-blue-500"
                  />
                </motion.div>

                <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
                  <div className="space-y-2">
                    <Label htmlFor="chatColor">Chat Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.chatColor}
                        onChange={(e) => handleSettingChange("chatColor", e.target.value)}
                        className="w-12 h-10 p-1 transition-all duration-300 hover:scale-105"
                      />
                      <Input
                        value={settings.chatColor}
                        onChange={(e) => handleSettingChange("chatColor", e.target.value)}
                        className="transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.accentColor}
                        onChange={(e) => handleSettingChange("accentColor", e.target.value)}
                        className="w-12 h-10 p-1 transition-all duration-300 hover:scale-105"
                      />
                      <Input
                        value={settings.accentColor}
                        onChange={(e) => handleSettingChange("accentColor", e.target.value)}
                        className="transition-all duration-300"
                      />
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </motion.div>
          </Card>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8"
          >
            <Button
              className="w-full transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
              style={{ backgroundColor: settings.accentColor }}
              onClick={() => {
                alert("Feature not implemented yet!")
              }}
            >
              Save Chatbot
            </Button>
          </motion.div>
        </motion.div>
      </div>
      <ChatBot 
        name={settings.name}
        description={settings.description}
        profilePhoto={settings.profilePhoto}
        developerPrompt={settings.developerPrompt}
        chatColor={settings.chatColor}
        accentColor={settings.accentColor}
      />
    </motion.div>
  )
}
