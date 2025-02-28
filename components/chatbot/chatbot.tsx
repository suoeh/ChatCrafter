"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Mic, X, Send, MessageSquare, RotateCcw, ImagePlus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import './chatbot.css'
import useClientGeminiService from './clientGeminiService'

// utility function
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// input parameters
const DEFAULT_AVATAR_BASE64 = "data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/Z"
const chatbot_name = "afds"
const chatbot_description = "fdshjfs"

// button component
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// input component
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// avatar component
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// message datatype
type Message = {
  id: string
  content: string
  sender: "user" | "bot"
  type: "text" | "audio" | "image"
  audioUrl?: string
  imageUrl?: string
}

interface ChatBotProps {
  name?: string;
  description?: string;
  profilePhoto?: string;
  developerPrompt?: string;
  chatColor?: string;
  accentColor?: string;
}

export function ChatBot({name, description, profilePhoto, developerPrompt, chatColor, accentColor}: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [showButton, setShowButton] = useState(true)
  const welcomeMessageShownRef = useRef(false)

  const welcomeMessage: Message = {
    id: "welcome-message",
    content: "👋 Hi there! I'm your AI assistant. How can I help you today?",
    sender: "bot",
    type: "text"
  }
  
  const { 
    sendMessage: wsSendMessage, 
    onMessage, 
    clearMessages: wsClearMessages,
    chatHistory,
    addMessageToHistory,
    clearChatHistory
  } = useClientGeminiService()

  // load chat history on open
  useEffect(() => {
    if (isOpen) {
      if (chatHistory.length > 0) {
        setMessages(chatHistory)
        welcomeMessageShownRef.current = true
      } else if (!welcomeMessageShownRef.current) {
        setMessages([welcomeMessage])
        addMessageToHistory(welcomeMessage)
        welcomeMessageShownRef.current = true
      }
    }
  }, [chatHistory, isOpen, addMessageToHistory])

  // openchat button position for animation
  const updateButtonPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      })
    }
  }

  // autoscroll for new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // clean up possibly existing recording if component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording()
      }
    }
  }, [isRecording])

  // hides openchat button when chat is open
  useEffect(() => {
    if (isOpen) {
      setShowButton(false)
    }
  }, [isOpen])

  // user input handler
  useEffect(() => {
    const removeListener = onMessage((messageStr) => {
      try {
        const data = JSON.parse(messageStr);
        if (data.reply) {
          // audio clip check
          const isAudioResponse = messages.some(msg => 
            msg.type === 'audio' && 
            msg.id === messages[messages.length - 1]?.id
          );
          
          // validate and update transcription from audio clip
          if (isAudioResponse && data.transcription) {
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.type === 'audio') {
                // makes gemini see transcribed audio as last query
                const updatedMessage = {
                  ...lastMessage,
                  content: `Voice message: "${data.transcription}"`
                };
                return [...prev.slice(0, prev.length - 1), updatedMessage];
              }
              return prev;
            });
          }
          
          // image check
          const isImageResponse = messages.some(msg => 
            msg.type === 'image' && 
            msg.id === messages[messages.length - 1]?.id
          );
          
          // validate and update transcription from image
          if (isImageResponse && data.imageAnalysis) {
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.type === 'image') {
                // makes gemini see transcribed image as last query
                const updatedMessage = {
                  ...lastMessage,
                  content: `Image: "${data.imageAnalysis.substring(0, 100)}${data.imageAnalysis.length > 100 ? '...' : ''}"`
                };
                return [...prev.slice(0, prev.length - 1), updatedMessage];
              }
              return prev;
            });
          }
          
          // initialize gemini response as message
          const newMessage: Message = {
            id: Date.now().toString(),
            content: data.reply,
            sender: "bot",
            type: data.type || "text",
          };

          // update messages and history
          setMessages((prev) => [...prev, newMessage]);
          addMessageToHistory(newMessage);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        setIsProcessing(false);
      }
    });
    
    return removeListener;
  }, [onMessage, addMessageToHistory, messages]);

  // image upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      
      // temporary message to indicate processing
      const processingMessage: Message = {
        id: Date.now().toString() + "-processing",
        content: "Analyzing your image with Gemini Flash...",
        sender: "bot",
        type: "text",
      }
      setMessages((prev) => [...prev, processingMessage])
      
      // set user image as message
      const newMessage: Message = {
        id: Date.now().toString(),
        content: "Image",
        sender: "user",
        type: "image",
        imageUrl: url,
      }
      setMessages((prev) => {
        // replace processing indicator with actual image
        return prev.filter(msg => msg.id !== processingMessage.id).concat(newMessage)
      })
      addMessageToHistory(newMessage)
      
      // convert image to base64 to send to gemini
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        console.log(`Image data converted to base64 (${base64Image.length} chars)`);
        
        const prompt = inputMessage.trim() || "Please describe this image";
        
        // send image with prompt
        sendMessageToBot(prompt, "image", base64Image);
      };
    }
    // reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const startRecording = async () => {
    audioChunksRef.current = []
    setAudioURL(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // audio settings
      const options = {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      };
      
      // loading media recorder with parameters
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log('Using audio/webm format for recording');
      } catch (e) {
        console.warn('Preferred format not supported, falling back to browser defaults');
        mediaRecorder = new MediaRecorder(stream);
      }

      // audio data handler
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        console.log(`Recording completed with MIME type: ${mimeType}`);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // temporary message to indicate audio processing
        const transcribingMessage: Message = {
          id: Date.now().toString() + "-transcribing",
          content: "Transcribing your audio with Gemini Flash...",
          sender: "bot",
          type: "text",
        }
        setMessages((prev) => [...prev, transcribingMessage])
        
        // convert blob to base64 for sending via JSON
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          console.log(`Audio data converted to base64 (${base64Audio.length} chars)`);
          
          // add user message
          const newMessage: Message = {
            id: Date.now().toString(),
            content: "Voice message",
            sender: "user",
            type: "audio",
            audioUrl: url,
          }
          setMessages((prev) => {
            // replace the temporary message with the actual audio message
            return prev.filter(msg => msg.id !== transcribingMessage.id).concat(newMessage)
          })
          addMessageToHistory(newMessage)

          // send the audio through WebSocket with the base64 data
          sendMessageToBot("Audio message", "audio", base64Audio)
        };
      }

      // start recording
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
  }

  // listener for audio recording button press
  const handleMouseDown = () => {
    if (!isOpen) {
      updateButtonPosition()
      setIsOpen(true)
      return
    }

    setIsPressed(true)
    startRecording()

    document.addEventListener("mouseup", handleGlobalMouseUp)
  }

  // listener for audio recording button release
  const handleGlobalMouseUp = () => {
    document.removeEventListener("mouseup", handleGlobalMouseUp)

    if (isPressed) {
      setIsPressed(false)
      stopRecording()
    }
  }

  // close chat handler
  const closeChat = () => {
    setIsOpen(false)
    if (isRecording) {
      stopRecording()
    }
    wsClearMessages()
    setMessages([])
    // show recording button after chat closing animation is played
    setTimeout(() => {
      setShowButton(true)
    }, 520)
  }

  const startNewChat = () => {
    // reset chat
    setMessages([])
    setInputMessage("")
    setAudioURL(null)
    if (isRecording) {
      stopRecording()
    }
    wsClearMessages()
    clearChatHistory()
    welcomeMessageShownRef.current = false
    
    // welcome message for new chat
    setMessages([welcomeMessage])
    addMessageToHistory(welcomeMessage)
    welcomeMessageShownRef.current = true
  }

  // send message to gemini
  const sendMessageToBot = (messageContent: string, messageType: "text" | "audio" | "image" = "text", mediaData?: string) => {
    setIsProcessing(true)
    
    if (messageType === "text") {
      wsSendMessage(JSON.stringify({
        message: messageContent,
        type: messageType,
        developerPrompt: developerPrompt
      }))
    } else if (messageType === "audio") {
      wsSendMessage(JSON.stringify({
        message: messageContent,
        type: messageType,
        audioData: mediaData, // base64 encoded audio data
        developerPrompt: developerPrompt
      }))
    } else if (messageType === "image") {
      wsSendMessage(JSON.stringify({
        message: messageContent,
        type: messageType,
        imageData: mediaData, // base64 encoded image data
        developerPrompt: developerPrompt
      }))
    }
  }

  // update handleSendMessage to store messages in history
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (inputMessage.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: inputMessage,
        sender: "user",
        type: "text",
      }
      
      setMessages((prev) => [...prev, newMessage])
      addMessageToHistory(newMessage)
      sendMessageToBot(inputMessage)
      setInputMessage("")
    }
  }

  // listener for audio recording button release
  const handleMicButtonMouseLeave = () => {
    if (isRecording) {
      setIsPressed(false)
      stopRecording()
    }
  }

  // chatbot component
  return (
    <div className="fixed bottom-6 right-6 z-50 chatbot" style={{ background: 'transparent' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.5,
              x: 200,
              y: 200,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.5,
              x: "calc(50%)",
              y: "calc(50%)",
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            style={{
              transformOrigin: `${buttonPosition.x}px ${buttonPosition.y}px`,
            }}
            className="mb-4 w-80 sm:w-96 rounded-lg shadow-lg overflow-hidden bg-white"
          >
            
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profilePhoto} alt="Bot" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{name}</h3>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
              
              <div className="flex gap-2">

                {/* nw chat button */}
                <motion.button
                  onClick={startNewChat}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none"
                  whileHover={{
                    scale: 1.2,
                    rotate: 60,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 10,
                    },
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.button>
                
                {/* close button */}
                <motion.button
                  onClick={closeChat}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none"
                  whileHover={{
                    scale: 1.2,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 10,
                    },
                  }}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* chat container */}
            <div ref={chatContainerRef} className="p-4 h-80 overflow-y-auto flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-2 text-gray-400" />
                  <p>Send a message or hold the microphone button to record</p>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      mass: 0.8
                    }}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.sender === "user"
                          ? message.type === "audio"
                            ? `bg-[${chatColor}]`
                            : message.type === "image"
                              ? "p-0 bg-transparent"
                              : `bg-[${chatColor}] text-gray-800`
                          : "bg-gray-100 text-gray-800"
                      }`}
                      style={{
                        backgroundColor: message.sender === "user"
                          ? message.type === "audio" || message.type !== "image"
                            ? chatColor
                            : "bg-gray-100"
                          : "bg-gray-100"
                      }}
                    >
                      {message.type === "audio" ? (
                        <audio src={message.audioUrl} controls className="max-w-full h-8" />
                      ) : message.type === "image" ? (
                        <img
                          src={message.imageUrl || "/placeholder.svg"}
                          alt="User uploaded"
                          className="max-w-full rounded-lg"
                          style={{ maxHeight: "200px" }}
                        />
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}

              {isProcessing && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <div className="max-w-[80%] rounded-lg px-3 py-2 bg-gray-100 text-gray-800">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* input container */}
            <div className="p-4 border-t flex items-center gap-2">
              <div className="flex items-center gap-5">

                {/* text input */}
                <form onSubmit={handleSendMessage}>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isRecording}
                    className={`flex-1 ${isRecording ? "opacity-50" : ""}`}
                    style={{
                      borderColor: inputMessage ? (chatColor || '#000000') : 'transparent'
                    }}
                  />
                </form>
                
                
                {/* image uploader */}
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none"
                  whileHover={{
                    scale: 1.2,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 10,
                    },
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <ImagePlus className="w-4 h-4" />
                </motion.button>

                {/* audio recorder */}
                <div className="relative">
                  <motion.button
                    ref={buttonRef}
                    type="button"
                    className={`rounded-full flex items-center justify-center focus:outline-none overflow-hidden transition-colors duration-300 w-10 h-10 ${
                      isPressed ? "bg-red-600" : isRecording ? "bg-red-500" : "text-gray-500 hover:text-gray-700"
                    }`}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleGlobalMouseUp}
                    onMouseLeave={handleMicButtonMouseLeave}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleGlobalMouseUp}
                    whileHover={{
                      scale: 1.2,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 10,
                      },
                    }}
                    animate={{
                      scale: isPressed ? 1.15 : isRecording ? 1.1 : 1,
                    }}
                  >
                    <div className="relative flex items-center justify-center w-full h-full">
                      <motion.div
                        animate={{
                          scale: isPressed ? 1.2 : isRecording ? 1.1 : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                      >
                        <Mic className={`w-5 h-5 ${isRecording || isPressed ? "text-white" : ""}`} />
                      </motion.div>

                    </div>
                  </motion.button>
                </div>

                {/* send button */}
                <motion.button
                  className={`p-2 ${(!inputMessage.trim() || isRecording) ? 
                    "bg-gray-400 text-gray-300 cursor-not-allowed" : 
                    "text-white transition-colors duration-300"} rounded-md focus:outline-none`}
                  style={
                    (!inputMessage.trim() || isRecording) 
                      ? {} 
                      : { backgroundColor: chatColor || '#488888' }
                  }
                  whileHover={(inputMessage.trim() && !isRecording) ? {
                    scale: 1.2,
                    backgroundColor: accentColor || '#366666',
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 10,
                    },
                  } : {scale: 1.0}}
                  onClick={handleSendMessage}
                >
                  <Send className="w-4 h-4" />
                </motion.button>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* open chat button */}
      {showButton && (
        <motion.button
          initial={{
            opacity: 0,
            scale: 0.5,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
          }}
          ref={buttonRef}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          className="text-gray-500 hover:text-gray-700 rounded-full w-14 h-14 flex items-center justify-center"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  )
}

