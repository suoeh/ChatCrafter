import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// type definitions
interface ChatSession {
  history: Array<{
    role: 'user' | 'model' | 'system';
    parts: string;
  }>;
  id: string;
}

interface ChatMessage {
  message: string;
  type: 'text' | 'audio' | 'image' | 'clear_chat';
  audioUrl?: string;
  audioData?: string; // base64 encoded audio data
  audioBlob?: Blob;
  imageUrl?: string;
  imageData?: string; // base64 encoded image data
  imageBlob?: Blob;
  developerPrompt?: string;
}

interface ChatResponse {
  reply: string;
  type: string;
  transcription?: string;
  imageAnalysis?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// developer system prompt
const SYSTEM_PROMPT =
`You are a helpful AI assistant.
Your responses should be concise, accurate, and focused on providing practical solutions.
When asked about something you are not tasked to answer, say you don't know the answer.
If you don't know something, admit it rather than making up information.
Be friendly and awesome. Don't make your messages long.
If the user asks a broad question, ask to clarify the question.
Don't reply with bold text.
`

export const useGeminiService = () => {
  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (API_KEY) {
      setIsReady(true);
    } else {
      console.error('Gemini API key is not set');
    }
  }, []);

  const createChatSession = useCallback((sessionId: string) => {
    setChatSessions(prev => ({
      ...prev,
      [sessionId]: {
        // initialize system prompt
        history: [
          { role: 'system' as const, parts: SYSTEM_PROMPT }
        ],
        id: sessionId
      }
    }));
    return sessionId;
  }, []);

  // remove chat session
  const removeChatSession = useCallback((sessionId: string) => {
    setChatSessions(prev => {
      const newSessions = { ...prev };
      delete newSessions[sessionId];
      return newSessions;
    });
  }, []);

  // convert audio to text using Gemini Flash
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      console.log('Starting audio transcription with Gemini Flash...');
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Audio blob type:', audioBlob.type);
      
      const base64Audio = await blobToBase64(audioBlob);
      
      // prepare request to Gemini API for transcription
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: "Please transcribe the following audio file accurately. Only return the transcription text without any additional commentary or explanation."
              },
              {
                inline_data: {
                  mime_type: audioBlob.type,
                  data: base64Audio.split(',')[1] // remove data prefix
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };
      
      console.log('Sending request to Gemini API for transcription...');
      
      // API request to Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API transcription error:', errorData);
        throw new Error(`Transcription request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const responseData = await response.json();
      console.log('Gemini transcription response:', responseData);
      
      // extract transcription from response
      if (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) {
        const transcription = responseData.candidates[0].content.parts[0].text.trim();
        console.log('Transcription successful:', transcription);
        return transcription;
      }
      
      // edge case for no transcription results
      console.warn('No transcription results returned from Gemini API');
      return "I received your audio message, but couldn't detect any speech.";
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return "Sorry, I couldn't transcribe your audio message due to a technical error. Please type your message instead.";
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // fetch audio blob from URL
  const fetchAudioBlob = async (audioUrl: string): Promise<Blob | null> => {
    try {
      if (audioUrl.startsWith('blob:')) {
        console.log('Audio URL is already a blob URL, but we need the actual blob');
        return null;
      }
      
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error fetching audio blob:', error);
      return null;
    }
  };

  // process image using Gemini
  const processImage = async (imageUrl: string, prompt: string): Promise<string> => {
    try {
      console.log('Starting image analysis with Gemini Flash...');
      
      // fetch the image data
      let imageBlob: Blob;
      if (imageUrl.startsWith('blob:')) {
        console.log('Fetching image from blob URL:', imageUrl);
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        imageBlob = await response.blob();
      } else {
        throw new Error('Only blob URLs are supported for image processing');
      }
      
      console.log('Image blob size:', imageBlob.size, 'bytes');
      console.log('Image blob type:', imageBlob.type);
      
      // convert image blob to base64
      const base64Image = await blobToBase64(imageBlob);
      
      // orepare request to Gemini API for image analysis
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt || "Please describe this image in detail. What do you see in this image?"
              },
              {
                inline_data: {
                  mime_type: imageBlob.type,
                  data: base64Image.split(',')[1] // remove data prefix
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };
      
      console.log('Sending request to Gemini API for image analysis...');
      
      // make Gemini API request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API image analysis error:', errorData);
        throw new Error(`Image analysis request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const responseData = await response.json();
      console.log('Gemini image analysis response:', responseData);
      
      // Extract analysis from response
      if (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) {
        const analysis = responseData.candidates[0].content.parts[0].text.trim();
        console.log('Image analysis successful:', analysis.substring(0, 100) + '...');
        return analysis;
      }
      
      // If no results were returned but the API call was successful
      console.warn('No image analysis results returned from Gemini API');
      return "I received your image, but couldn't analyze its contents.";
    } catch (error) {
      console.error('Error processing image:', error);
      return "Sorry, I couldn't analyze your image due to a technical error. Please try again or describe the image in text.";
    }
  };

  // Convert base64 to blob
  const base64ToBlob = (base64: string): Blob => {
    // Extract the base64 data part (remove the data:audio/xyz;base64, prefix)
    const base64Data = base64.split(',')[1];
    // Get the content type from the data URL
    const contentType = base64.split(',')[0].split(':')[1].split(';')[0];
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: contentType });
  };

  // process a message using the Gemini API
  const processMessage = useCallback(async (
    sessionId: string, 
    messageData: string | ChatMessage,
    developerPrompt?: string
  ): Promise<ChatResponse> => {
    try {
      // parse the message
      let message: string;
      let messageType: string = 'text';
      let audioUrl: string | undefined;
      let audioData: string | undefined;
      let audioBlob: Blob | undefined;
      let imageUrl: string | undefined;
      let imageData: string | undefined;
      let imageBlob: Blob | undefined;

      if (typeof messageData === 'string') {
        try {
          const parsed = JSON.parse(messageData) as ChatMessage;
          message = parsed.message || '';
          messageType = parsed.type || 'text';
          audioUrl = parsed.audioUrl;
          audioData = parsed.audioData;
          audioBlob = parsed.audioBlob;
          imageUrl = parsed.imageUrl;
          imageData = parsed.imageData;
          imageBlob = parsed.imageBlob;
        } catch {
          message = messageData;
        }
      } else {
        message = messageData.message || '';
        messageType = messageData.type || 'text';
        audioUrl = messageData.audioUrl;
        audioData = messageData.audioData;
        audioBlob = messageData.audioBlob;
        imageUrl = messageData.imageUrl;
        imageData = messageData.imageData;
        imageBlob = messageData.imageBlob;
      }

      console.log(`Received ${messageType}: ${message.substring(0, 50)}...`);

      // create session if it doesn't exist
      if (!chatSessions[sessionId]) {
        createChatSession(sessionId);
      }

      // Use developerPrompt if provided
      console.log(chatSessions[sessionId]?.history[0]["parts"]);
      chatSessions[sessionId].history[0]["parts"] = developerPrompt + " \n\n" + SYSTEM_PROMPT || '';
      
      if (messageType === 'text') {
        // add user message to history
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedHistory = [
            ...session.history,
            { role: 'user' as const, parts: message }
          ];
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: updatedHistory
            }
          };
        });

        const response = await callGeminiAPI(message, chatSessions[sessionId]?.history || []);
        
        // add model response to history
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedHistory = [
            ...session.history,
            { role: 'model' as const, parts: response }
          ];
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: updatedHistory
            }
          };
        });

        return {
          reply: response,
          type: 'text'
        };
      } 
      else if (messageType === 'audio') {
        // process audio message
        let transcription = "Audio message received";
        let transcriptionSuccess = false;
        
        console.log('Processing audio message...');
        
        // get the audio blob
        if (audioBlob) {
          console.log('Using provided audio blob for transcription');
          transcription = await transcribeAudio(audioBlob);
          transcriptionSuccess = !transcription.includes("couldn't transcribe");
        } else if (audioData) {
          // Convert base64 to blob and transcribe
          try {
            console.log('Converting base64 audio data to blob');
            const blob = base64ToBlob(audioData);
            transcription = await transcribeAudio(blob);
            transcriptionSuccess = !transcription.includes("couldn't transcribe");
          } catch (error) {
            console.error('Error processing base64 audio:', error);
            transcription = "I received your audio message but couldn't process the audio data.";
          }
        } else if (audioUrl) {
          try {
            // get the blob from the URL
            console.log('Fetching audio blob from URL:', audioUrl);
            const blob = await fetchAudioBlob(audioUrl);
            if (blob) {
              transcription = await transcribeAudio(blob);
              transcriptionSuccess = !transcription.includes("couldn't transcribe");
            } else {
              transcription = "I received your audio message but couldn't access the audio data for transcription.";
            }
          } catch (error) {
            console.error('Error processing audio:', error);
            transcription = "Sorry, I couldn't process your audio message.";
          }
        }
        
        console.log('Transcription result:', transcription);
        
        // add user message to history with the transcription
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedHistory = [
            ...session.history,
            { 
              role: 'user' as const, 
              parts: transcriptionSuccess 
                ? transcription 
                : "I sent an audio message, but it couldn't be transcribed. " + transcription
            }
          ];
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: updatedHistory
            }
          };
        });
        
        // generate a response based on the transcription
        const responsePrompt = transcriptionSuccess
          ? transcription
          : `The user sent an audio message that couldn't be transcribed properly. ${transcription} Please respond appropriately.`;
        
        const response = await callGeminiAPI(responsePrompt, chatSessions[sessionId]?.history || []);
        
        // add model response to history
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedHistory = [
            ...session.history,
            { role: 'model' as const, parts: response }
          ];
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: updatedHistory
            }
          };
        });
        
        return {
          reply: response,
          type: 'text',
          transcription: transcriptionSuccess ? transcription : undefined
        };
      } 
      else if (messageType === 'image') {
        // process image message
        let imageDescription = "Image received";
        let imageAnalysisSuccess = false;
        
        console.log('Processing image message...');
        
        // try to get the image blob
        if (imageBlob) {
          // use the provided blob directly
          console.log('Using provided image blob for analysis');
          const userPrompt = message ? message : "Please describe this image in detail";
          imageDescription = await processImage('blob:direct-blob', userPrompt);
          imageAnalysisSuccess = !imageDescription.includes("couldn't analyze");
        } else if (imageData) {
          // convert base64 to blob and analyze
          try {
            console.log('Converting base64 image data to blob');
            const blob = base64ToBlob(imageData);
            imageBlob = blob;
            const userPrompt = message ? message : "Please describe this image in detail";

            const tempUrl = URL.createObjectURL(blob);
            imageDescription = await processImage(tempUrl, userPrompt);

            URL.revokeObjectURL(tempUrl);
            imageAnalysisSuccess = !imageDescription.includes("couldn't analyze");
          } catch (error) {
            console.error('Error processing base64 image:', error);
            imageDescription = "I received your image message but couldn't process the image data.";
          }
        } else if (imageUrl) {
          try {
            console.log('Using image URL for analysis:', imageUrl);
            const userPrompt = message ? message : "Please describe this image in detail";
            imageDescription = await processImage(imageUrl, userPrompt);
            imageAnalysisSuccess = !imageDescription.includes("couldn't analyze");
          } catch (error) {
            console.error('Error processing image:', error);
            imageDescription = "Sorry, I couldn't process your image.";
          }
        }
        
        console.log('Image analysis result:', imageDescription.substring(0, 100) + '...');
        
        // add user message to history
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedHistory = [
            ...session.history,
            { 
              role: 'user' as const, 
              parts: imageAnalysisSuccess
                ? `[Image Message]: ${message || "Please describe this image"}`
                : `[Image Message that couldn't be analyzed]: ${message || "Please describe this image"}`
            }
          ];
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: updatedHistory
            }
          };
        });
        
        // generate a response based on the image
        const responsePrompt = imageAnalysisSuccess
          ? `I sent an image. ${imageDescription}. ${message || ""}`
          : `I sent an image that couldn't be analyzed properly. ${imageDescription}. ${message || ""}`;
        
        const response = await callGeminiAPI(responsePrompt, chatSessions[sessionId]?.history || []);
        
        // add model response to history
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedHistory = [
            ...session.history,
            { role: 'model' as const, parts: response }
          ];
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: updatedHistory
            }
          };
        });
        
        return {
          reply: response,
          type: 'text',
          imageAnalysis: imageAnalysisSuccess ? imageDescription : undefined
        };
      } 
      else if (messageType === 'clear_chat') {
        // clear chat history but keep the system prompt
        console.log("Clearing chat history");
        setChatSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          return {
            ...prev,
            [sessionId]: {
              ...session,
              history: [
                { role: 'system' as const, parts: SYSTEM_PROMPT }
              ]
            }
          };
        });
        
        return {
          reply: "Chat history cleared",
          type: 'text'
        };
      }
      
      throw new Error(`Unsupported message type: ${messageType}`);
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        reply: `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'text'
      };
    }
  }, [chatSessions, createChatSession]);
  
  const callGeminiAPI = async (
    message: string, 
    history: Array<{role: 'user' | 'model' | 'system', parts: string}>
  ): Promise<string> => {
    try {
      // format history for the API
      // note: Gemini API doesn't have 'system' role, define as 'user'
      const formattedHistory = history.map(item => {
        const role = item.role === 'system' ? 'user' : item.role;
        const text = item.role === 'system' ? `[System Instruction]: ${item.parts}` : item.parts;
        
        return {
          role: role,
          parts: [{ text }]
        };
      });

      // prepare request body
      const requestBody = {
        contents: formattedHistory.concat({
          role: 'user',
          parts: [{ text: message }]
        }),
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      console.log('API Request:', JSON.stringify(requestBody, null, 2));

      // make API request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', responseData);
        throw new Error(`API request failed with status ${response.status}: ${responseData.error?.message || 'Unknown error'}`);
      }

      // extract text from response
      if (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) {
        return responseData.candidates[0].content.parts[0].text;
      }
      
      console.error('Invalid API Response:', responseData);
      throw new Error('Invalid response format from Gemini API');
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return `Sorry, I couldn't process your request. ${error instanceof Error ? error.message : ''}`;
    }
  };

    // Update system prompt for a specific session
  const updateSystemPrompt = useCallback((sessionId: string, newPrompt: string) => {
    setChatSessions(prev => {
      const session = prev[sessionId];
      if (!session) return prev;
      
      // find the system message in history or add if it doesn't exist
      const hasSystemMessage = session.history.some(msg => msg.role === 'system');
      
      let updatedHistory;
      if (hasSystemMessage) {
        // replace existing system message
        updatedHistory = session.history.map(msg => 
          msg.role === 'system' ? { ...msg, parts: newPrompt } : msg
        );
      } else {
        // add system message at the beginning
        updatedHistory = [
          { role: 'system' as const, parts: newPrompt },
          ...session.history
        ];
      }
      
      return {
        ...prev,
        [sessionId]: {
          ...session,
          history: updatedHistory
        }
      };
    });
  }, []);

  return {
    isReady,
    createChatSession,
    removeChatSession,
    processMessage,
    updateSystemPrompt
  };
};

export default useGeminiService; 