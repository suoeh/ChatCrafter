"use client"

import type React from "react"
import { useState } from "react"

import { motion } from "framer-motion"

import Home, { isLoaded, containerVariants } from "@/components/home"
import Footer from "@/components/footer"
import { ChatBot } from "@/components/chatbot/chatbot"

export default function ChatbotCustomizer() {
  const [settings, setSettings] = useState({
    name: "My Chatbot",
    description: "A friendly and helpful chatbot",
    profilePhoto: "",
    developerPrompt: "You are a helpful and friendly chatbot.",
    chatColor: "#95a489",
    accentColor: "#cad1bd",
  });

  return (
    <motion.div
      className="container mx-auto py-10 my-10"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      <Home settings={settings} setSettings={setSettings} />
      <Footer />
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
