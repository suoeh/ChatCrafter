"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Mic, X, Send, MessageSquare, RotateCcw, ImagePlus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
  }, [chatHistory, isOpen, addMessageToHistory, welcomeMessage])

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
        console.warn('Preferred format not supported, falling back to browser defaults', e);
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
        console.log(`Recording completed with MIME type: ${mimeType} with audioUrl: ${audioURL}`);
        
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

  const handleOpenChat = () => {
    // Immediately hide the button through direct DOM manipulation
    if (buttonRef.current) {
      buttonRef.current.style.display = 'none';
    }
    
    // Then update state (this happens asynchronously)
    setIsOpen(true);
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
            <div className="flex items-center justify-between p-4 border-b"
            style={{
              backgroundColor: accentColor,
            }}
            >
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-8 rounded-full overflow-hidden flex items-center justify-center">
                  <img 
                    src={profilePhoto} 
                    alt="Bot"
                    className="h-full w-full object-cover"
                  />
                  {/* fallback */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {!profilePhoto && <img src="favicon.ico" alt="Bot" className="h-full w-full object-cover bg-gray-100" />}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">{name}</h3>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
              
              <div className="flex gap-2">

                {/* new chat button */}
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
                    className={`flex-1 transition-all duration-300 ${isRecording ? "opacity-50" : ""}`}
                    style={{
                      borderColor: "#DDDDDD",
                      outline: "none",
                      boxShadow: inputMessage ? `0 0 0 1px ${chatColor}` : 'none',
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
                    "text-gray-300 cursor-not-allowed" : 
                    "text-white transition-colors duration-300"} rounded-md focus:outline-none`}
                  style={
                    { backgroundColor: chatColor || '#488888' }
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
          onClick={handleOpenChat}
          style={{ 
            transition: 'none',
            animation: 'none'
          }}
        >
          <MessageSquare className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  )
}