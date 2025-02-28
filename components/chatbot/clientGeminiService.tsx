import { useState, useEffect, useCallback, useRef } from 'react';
import { useGeminiService } from './geminiService';

// default message type
interface StoredMessage {
  id: string;
  content: string;
  sender: "user" | "bot";
  type: "text" | "audio" | "image";
  audioUrl?: string;
  imageUrl?: string;
}

// gemini message type
interface GeminiMessage {
  message: string;
  type: "text" | "audio" | "image" | "clear_chat";
  audioUrl?: string;
  audioData?: string; // base64 encoded audio data
  imageUrl?: string;
  imageData?: string; // base64 encoded image data
  developerPrompt?: string; // This gets added if the developerPrompt parameter is provided
}

// check for localStorage availability (browser environment)
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// safe localStorage functions
const safeGetItem = (key: string): string | null => {
  if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }
  return null;
};

const safeSetItem = (key: string, value: string): boolean => {
  if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  }
  return false;
};

const safeRemoveItem = (key: string): boolean => {
  if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
  return false;
};

// hook that provides WebSocket-like functionality for Gemini API use
export const useClientGeminiService = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<StoredMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const messageCallbacksRef = useRef<((message: any) => void)[]>([]);
  const sessionIdRef = useRef<string>(
    // retrieves or makes new session ID from localStorage
    safeGetItem('gemini-session-id') || Math.random().toString(36).substring(2, 15)
  );
  const sessionInitializedRef = useRef<boolean>(false);
  
  const geminiService = useGeminiService();
  
  // save session ID to localStorage whenever it changes
  useEffect(() => {
    safeSetItem('gemini-session-id', sessionIdRef.current);
  }, []);
  
  // load chat history from localStorage
  useEffect(() => {
    if (!geminiService.isReady || sessionInitializedRef.current) return;
    
    try {
      geminiService.createChatSession(sessionIdRef.current);
      
      const savedHistory = safeGetItem('gemini-chat-history');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as StoredMessage[];
        setChatHistory(parsedHistory);
        
        // restore conversation history in Gemini service
        if (parsedHistory.length > 0) {
          console.log('Restoring conversation history with Gemini API...');
          
          // process all user messages in sequence to rebuild the conversation
          const processMessages = async () => {
            for (const msg of parsedHistory) {
              if (msg.sender === 'user') {
                if (msg.type === 'text') {
                  await geminiService.processMessage(sessionIdRef.current, msg.content);
                } else if (msg.type === 'audio' && msg.audioUrl) {
                  await geminiService.processMessage(sessionIdRef.current, {
                    message: msg.content,
                    type: 'audio',
                    audioUrl: msg.audioUrl
                  });
                } else if (msg.type === 'image' && msg.imageUrl) {
                  await geminiService.processMessage(sessionIdRef.current, {
                    message: msg.content,
                    type: 'image',
                    imageUrl: msg.imageUrl
                  });
                }
                console.log(`Restored message: ${msg.content.substring(0, 30)}...`);
              }
            }
            console.log('Conversation history restored successfully');
          };
          
          processMessages();
        }
      }
      
      sessionInitializedRef.current = true;
    } catch (error) {
      console.error('Error loading chat history from localStorage:', error);
    }
  }, [geminiService.isReady, geminiService]);
  
  // save chat history to localStorage whenever it changes
  useEffect(() => {
    safeSetItem('gemini-chat-history', JSON.stringify(chatHistory));
  }, [chatHistory]);
  
  useEffect(() => {
    setIsConnected(geminiService.isReady);
    
    return () => {
      // don't remove the session when component unmounts to preserve conversation context
    };
  }, [geminiService]);
  
  // add message to chat history
  const addMessageToHistory = useCallback((message: StoredMessage) => {
    setChatHistory(prev => [...prev, message]);
  }, []);
  
  // send message to Gemini
  const sendMessage = useCallback(async (message: string) => {
    if (!geminiService.isReady) {
      console.error('Gemini service is not ready');
      return false;
    }
    
    try {
      let parsedMessage: GeminiMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch {
        parsedMessage = { message, type: 'text' };
      }
      
      // handle audio data special case
      if (parsedMessage.type === 'audio' && parsedMessage.audioData) {
        console.log('Audio message with base64 data detected');
        console.log('Base64 data length:', parsedMessage.audioData.length);
        
        // check if the base64 data is valid
        if (!parsedMessage.audioData.startsWith('data:')) {
          console.error('Invalid base64 data format');
          throw new Error('Invalid audio data format');
        }
        
        console.log('Sending audio data to Gemini Flash for transcription');
        
        // log audio format for debugging
        const mimeType = parsedMessage.audioData.split(';')[0].split(':')[1];
        console.log('Audio MIME type:', mimeType);
      }
      
      // handle image data special case
      if (parsedMessage.type === 'image' && parsedMessage.imageData) {
        console.log('Image message with base64 data detected');
        console.log('Base64 data length:', parsedMessage.imageData.length);
        
        // check if the base64 data is valid
        if (!parsedMessage.imageData.startsWith('data:')) {
          console.error('Invalid base64 data format');
          throw new Error('Invalid image data format');
        }
        
        console.log('Sending image data to Gemini Flash for analysis');
        
        // log image format for debugging
        const mimeType = parsedMessage.imageData.split(';')[0].split(':')[1];
        console.log('Image MIME type:', mimeType);
      }
      
      // process message with Gemini
      console.log(`Sending message to Gemini service: ${parsedMessage.type}`);
      const response = await geminiService.processMessage(sessionIdRef.current, parsedMessage, parsedMessage.developerPrompt);
      
      // add message to local state
      setMessages(prev => [...prev, message]);
      
      // notify all callbacks with the response
      messageCallbacksRef.current.forEach(callback => {
        try {
          callback(JSON.stringify(response));
        } catch (error) {
          console.error('Error in message callback:', error);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // notify callbacks about the error
      const errorResponse = {
        reply: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'text'
      };
      
      messageCallbacksRef.current.forEach(callback => {
        try {
          callback(JSON.stringify(errorResponse));
        } catch (callbackError) {
          console.error('Error in error callback:', callbackError);
        }
      });
      
      return false;
    }
  }, [geminiService]);
  
  // register a callback to be notified when a message is received
  const onMessage = useCallback((callback: (message: any) => void) => {
    messageCallbacksRef.current.push(callback);
    
    // return a function to remove the callback
    return () => {
      messageCallbacksRef.current = messageCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);
  
  // clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    
    if (geminiService.isReady) {
      // send clear_chat message to Gemini
      geminiService.processMessage(sessionIdRef.current, JSON.stringify({
        type: 'clear_chat'
      }));
    }
  }, [geminiService]);
  
  // clear chat history (both in state and localStorage)
  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    safeRemoveItem('gemini-chat-history');
    
    // also clear the conversation history in Gemini
    if (geminiService.isReady) {
      // remove the old session and create a new one
      geminiService.removeChatSession(sessionIdRef.current);
      
      // generate a new session ID
      sessionIdRef.current = Math.random().toString(36).substring(2, 15);
      safeSetItem('gemini-session-id', sessionIdRef.current);
      
      // create a new session
      geminiService.createChatSession(sessionIdRef.current);
      sessionInitializedRef.current = true;
    }
  }, [geminiService]);
  
  return {
    messages,
    chatHistory,
    addMessageToHistory,
    sendMessage,
    onMessage,
    isConnected,
    clearMessages,
    clearChatHistory
  };
};

export default useClientGeminiService; 