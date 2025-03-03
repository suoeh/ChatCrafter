import type React from "react"

import imageCompression from 'browser-image-compression';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { motion } from "framer-motion"

interface HomeProps {
  settings: {
    name: string;
    description: string;
    profilePhoto: string;
    developerPrompt: string;
    chatColor: string;
    accentColor: string;
  };
  setSettings: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    profilePhoto: string;
    developerPrompt: string;
    chatColor: string;
    accentColor: string;
  }>>;
}

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

export const isLoaded = true;

export default function Home({ settings, setSettings }: HomeProps) {
  
  const handleSettingChange = (key: string, value: string) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 128,
      useWebWorker: true
    }

    try {
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader()
      reader.readAsDataURL(compressedFile)
      reader.onload = () => {
        handleSettingChange("profilePhoto", reader.result as string);
      }
    } catch (error) {
      console.log(error);
    }
  }

  // animation variants
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
        <p className="text-xl font-normal text-gray-600 text-center">Test your creation by clicking the icon in the bottom right corner.</p>
      </motion.h1>

      <div className="gap-8 my-10">
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardHeader className="relative z-10" style={{ backgroundColor: settings.accentColor }}>
              <CardTitle>Chatbot Settings</CardTitle>
              <CardDescription className="text-black">Customize how your chatbot looks and behaves</CardDescription>
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
                    <Avatar className="w-16 h-16 transition-all duration-300 hover:scale-105 bg-gray-100">
                      <AvatarImage 
                        src={settings.profilePhoto} 
                        alt="Profile" 
                        style={{
                          objectFit: "cover",
                          backgroundColor: "transparent"
                        }}
                      />
                      <AvatarFallback>
                        <User />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="profilePhoto"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="transition-all duration-300"
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
          </motion.div>
        </motion.div>
      </div>

      
    </motion.div>
  )
}
