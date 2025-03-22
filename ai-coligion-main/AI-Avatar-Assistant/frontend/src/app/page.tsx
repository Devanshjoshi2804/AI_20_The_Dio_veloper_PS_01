'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

// Import components
import MessageBubble from '../components/MessageBubble';
import VoiceInput from '../components/VoiceInput';
import BackgroundEffects from '../components/BackgroundEffects';

// Import animation variants
import { fadeIn, slideUp, staggerContainer } from '../utils/animations';

// Custom types
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Add DID SDK type definition
declare global {
  interface Window {
    DID?: any;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Check D-ID SDK availability
if (typeof window !== 'undefined') {
  console.log('Checking D-ID SDK availability');
  // Log when the DID global object is set
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (prop === 'DID' && obj === window) {
      console.log('D-ID SDK being set on window object');
    }
    return originalDefineProperty(obj, prop, descriptor);
  };
  
  // Check if DID is already available
  setTimeout(() => {
    console.log('D-ID SDK after timeout:', window.DID ? 'Available' : 'Not available');
    if (window.DID) {
      console.log('D-ID SDK properties:', Object.keys(window.DID));
    }
  }, 5000);
}

export default function Home() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [agentContainerVisible, setAgentContainerVisible] = useState(true);
  const [isProcessingVoiceInput, setIsProcessingVoiceInput] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Initializing');
  const [avatarMood, setAvatarMood] = useState('neutral');
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const didAgentRef = useRef<HTMLDivElement>(null);

  // Initialize D-ID Agent 
  useEffect(() => {
    // Set initial loading stage
    setLoadingStage('Initializing systems');
    
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        
        // Update loading stage based on progress
        if (prev === 10) setLoadingStage('Loading neural pathways');
        if (prev === 30) setLoadingStage('Connecting to backend services');
        if (prev === 50) setLoadingStage('Activating avatar systems');
        if (prev === 70) setLoadingStage('Synchronizing voice patterns');
        if (prev === 90) setLoadingStage('Finalizing connection');
        
        return prev + 1;
      });
    }, 100);
    
    // Hide loading overlay when D-ID agent is loaded
    const hideLoadingOverlay = () => {
      const loadingOverlay = document.getElementById('agent-loading-overlay');
      const didAgent = document.querySelector('[data-component="did-agent"]');
      
      if (loadingOverlay && didAgent) {
        // Check if D-ID agent has loaded
        if (typeof window !== 'undefined' && window.DID && window.DID.isLoaded) {
          // Set progress to 100% when loaded
          setLoadingProgress(100);
          setLoadingStage('Connection established');
          
          // Fade out the overlay after a short delay
          setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
              loadingOverlay.style.display = 'none';
            }, 500);
          }, 1000);
          
          console.log('D-ID agent loaded successfully');
        } else {
          // Try again in 1 second
          setTimeout(hideLoadingOverlay, 1000);
        }
      }
    };
    
    // Check initially and start checking for agent load
    hideLoadingOverlay();
    
    // Handle D-ID specific errors in Vercel
    const checkVercelDIDIssues = () => {
      if (typeof window !== 'undefined') {
        // Check for Vercel-specific issues
        const isVercel = window.location.hostname.includes('vercel.app');
        if (isVercel) {
          console.log('Running on Vercel deployment, checking for D-ID agent');
          
          // Check if D-ID agent script loaded
          const didScript = document.querySelector('script[src*="d-id.com"]');
          if (!didScript) {
            console.error('D-ID script tag not found in document');
            const errorEl = document.getElementById('did-error');
            if (errorEl) errorEl.textContent = 'D-ID script tag not found';
          }
          
          // Add extra debugging info
          window.addEventListener('error', (event) => {
            console.error('Caught error:', event.message);
            const errorEl = document.getElementById('did-error');
            if (errorEl) errorEl.textContent = event.message;
          });
        }
      }
    };
    
    checkVercelDIDIssues();
    
    return () => {
      clearInterval(progressInterval);
    };
  }, []);

  // Setup theme detection
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);

    // Listen for changes in theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Connect to Socket.io server
  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
      setError(`Connection error: ${err.message}`);
    });

    // Handle AI responses
    newSocket.on('ai-response', (data) => {
      console.log('Received AI response:', data);
      setIsLoading(false);

      // Extract text from response
      let responseText = '';
      if (typeof data === 'string') {
        responseText = data;
      } else if (data && typeof data === 'object') {
        responseText = data.text || data.answer || data.response || data.content || '';
      }

      if (responseText) {
        addMessage(responseText, false);
      }
    });

    // Handle errors
    newSocket.on('error', (error) => {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
      console.error('Server error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    });

    // Add this inside the bot-message handler:
    // Trigger D-ID agent to speak if SDK is loaded and message has content
    newSocket.on('bot-message', (data) => {
      if (typeof window !== 'undefined' && window.DID && window.DID.speak && data.message) {
        try {
          window.DID.speak({
            text: data.message,
            provider: { type: 'microsoft' },
            config: { 
              fluent: true,
              pad_audio: 0,
              stitch: true
            }
          });
        } catch (error) {
          console.error('Error making D-ID agent speak:', error);
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Add a message to the chat
  const addMessage = useCallback((text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(), 100);
  }, []);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message to server
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    // Add user message to chat
    addMessage(text, true);
    setInputValue('');
    setIsLoading(true);

    // Send to server if connected
    if (socket && socket.connected) {
      socket.emit('user-message', {
        message: text,
        // Disable built-in avatar since we're using D-ID
        avatar: false
      });
    } else {
      setError('Server connection not available. Please try again later.');
      setIsLoading(false);
    }
  }, [socket, addMessage]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle voice input - improve this function to ensure messages are sent
  const handleVoiceInput = (text: string) => {
    console.log("Voice input received:", text); // Debug log
    
    if (!text.trim()) {
      console.log("Empty text, not sending"); 
      return;
    }
    
    // Remove filler words and clean up text
    const cleanedText = text.trim()
      .replace(/^(um|uh|like|so|well|you know|basically)\s+/gi, '')
      .replace(/\s+(um|uh)\s+/gi, ' ')
      .replace(/[.!?]$/g, '');
    
    console.log("Cleaned text:", cleanedText); // Debug log
    
    // Only process if we have meaningful text after cleaning
    if (cleanedText && cleanedText.length > 1) {
      // Force UI update before sending
      setIsProcessingVoiceInput(true);
      
      // Small delay to ensure the UI is updated
      setTimeout(() => {
        // Use the existing sendMessage function with force parameter
        sendMessage(cleanedText);
        
        // Clear processing state after sending
        setTimeout(() => {
          setIsProcessingVoiceInput(false);
        }, 500);
      }, 100);
    } else {
      console.log("Text too short after cleaning, not sending");
      setIsProcessingVoiceInput(false);
    }
  };

  // Add this function to handle listening state changes 
  const handleVoiceListeningChange = (isListening: boolean) => {
    setIsListening(isListening);
    
    // Trigger D-ID agent speaking animation on listening
    if (typeof window !== 'undefined' && window.DID) {
      try {
        // When user starts listening, show agent is attentive
        if (isListening) {
          // Trigger a subtle "listening" animation if DID SDK supports it
          if (window.DID.setIntent) {
            window.DID.setIntent('listening');
          }
        } else {
          // When user stops listening, reset agent intent
          if (window.DID.setIntent) {
            window.DID.setIntent('neutral');
          }
        }
      } catch (error) {
        console.error('Error communicating with D-ID agent:', error);
      }
    }
  };

  // Toggle agent container visibility (mobile-friendly)
  const toggleAgentContainer = () => {
    setAgentContainerVisible(prev => !prev);
  };

  // Toggle debug panel
  const toggleDebugPanel = () => {
    setIsDebugExpanded(prev => !prev);
  };

  // Suggested queries
  const suggestedQueries = [
    "What is the IDMS ERP system?",
    "Explain the Sales Module",
    "How does IDMS help with GST compliance?",
  ];

  // Check for D-ID element existence
  useEffect(() => {
    // Update D-ID element status
    const updateDIDElementStatus = () => {
      const statusElement = document.getElementById('did-element-status');
      const didElement = document.querySelector('did-agent');
      
      if (statusElement) {
        if (didElement) {
          statusElement.textContent = 'Found';
          statusElement.className = 'text-green-400';
          console.log('D-ID agent element found in DOM');
        } else {
          statusElement.textContent = 'Not found';
          statusElement.className = 'text-red-400';
          console.log('D-ID agent element NOT found in DOM');
        }
      }
    };

    // Check initially and then periodically
    updateDIDElementStatus();
    const checkInterval = setInterval(updateDIDElementStatus, 5000);
    
    // Special handling for Vercel environment
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      console.log('Vercel environment detected, applying special D-ID handling');
      
      // Ensure did-agent element exists
      setTimeout(() => {
        const didContainer = document.getElementById('did-container');
        if (didContainer && !document.querySelector('did-agent')) {
          console.log('Forcing creation of did-agent element on Vercel');
          didContainer.innerHTML = '<did-agent></did-agent>';
        }
      }, 3000);
    }
    
    return () => clearInterval(checkInterval);
  }, []);

  // Add useEffect for sound wave animation
  useEffect(() => {
    if (!isListening) return;
    
    // Update the sound wave heights based on volume
    const updateSoundWaves = () => {
      const waves = document.querySelectorAll('.sound-wave-bar');
      
      waves.forEach((wave, i) => {
        const element = wave as HTMLElement;
        const height = Math.max(15, Math.min(80, 
          20 + Math.sin(Date.now() / (500 + i * 50)) * 20 + (volume * 60)
        ));
        
        if (element) {
          element.style.height = `${height}%`;
        }
      });
      
      if (isListening) {
        requestAnimationFrame(updateSoundWaves);
      }
    };
    
    // Start the animation
    const animationId = requestAnimationFrame(updateSoundWaves);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isListening, volume]);

  // Function to change avatar mood
  const changeAvatarMood = (mood: string) => {
    setAvatarMood(mood);
    
    // Update D-ID agent mood if SDK available
    if (typeof window !== 'undefined' && window.DID && window.DID.setIntent) {
      try {
        window.DID.setIntent(mood);
      } catch (error) {
        console.error('Error setting D-ID mood:', error);
      }
    }
  };

  // Function to toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    // Update D-ID agent if SDK available
    if (typeof window !== 'undefined' && window.DID) {
      try {
        if (!isMuted) {
          // Mute
          if (window.DID.setVolume) window.DID.setVolume(0);
        } else {
          // Unmute
          if (window.DID.setVolume) window.DID.setVolume(1);
        }
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950 text-gray-900 dark:text-gray-100">
      {/* Background particles */}
      <BackgroundEffects particleCount={20} isDarkMode={isDarkMode} />

      {/* Main container */}
      <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* App header */}
        <motion.header 
          className="mb-8 text-center"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
            AI Avatar Assistant
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            Interact with your intelligent assistant
          </p>
        </motion.header>

        {/* Main content area - Modified for better horizontal stretching */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          {/* Interactive 3D Visualization - Made wider */}
          <motion.div 
            className={`relative w-full lg:flex-1 bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900 rounded-3xl shadow-2xl overflow-hidden ${
              agentContainerVisible ? 'block' : 'hidden lg:block'
            }`}
            variants={slideUp}
            initial="initial"
            animate="animate"
          >
            {/* Interactive visualization container - More adaptive sizing */}
            <div className="relative w-full h-[650px] p-6 sm:p-8 flex flex-col">
              {/* Subtle mesh background for depth */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2px, transparent 0), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.15) 2px, transparent 0)',
                  backgroundSize: '100px 100px'
                }}></div>
              </div>
              
              <div className="text-white text-xl sm:text-2xl font-medium mb-5 flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-100">AI Avatar Assistant</span>
                <div className="ml-auto bg-indigo-900/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs text-white/90 font-medium">Ready</span>
                </div>
              </div>
              
              {/* 3D Particle Visualization - Made full height for better fit */}
              <div className="flex-grow relative overflow-hidden rounded-2xl bg-gradient-to-b from-black/50 to-indigo-950/50 backdrop-blur-md border border-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.15)]">
                {/* Project-specific AI capabilities - Repositioned for better layout */}
                <div className="absolute top-6 left-0 right-0 flex justify-center z-30">
                  <div className="flex items-center justify-center px-3 py-1.5 bg-indigo-950/70 backdrop-blur-md rounded-full shadow-lg">
                    {[
                      { name: 'Vision', active: true },
                      { name: 'Voice', active: true },
                      { name: 'Chat', active: true },
                      { name: 'Memory', active: false }
                    ].map((capability, index) => (
                      <React.Fragment key={capability.name}>
                        {index > 0 && <div className="mx-2 w-px h-4 bg-indigo-400/20"></div>}
                        <span 
                          className={`px-3 py-1.5 text-xs text-white rounded-full flex items-center space-x-1.5 ${
                            capability.active ? 'bg-indigo-600/70' : 'bg-gray-800/70'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            capability.active ? 'bg-blue-300 animate-pulse' : 'bg-gray-500'
                          }`}></span>
                          <span>{capability.name}</span>
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Processing indicator above avatar - Positioned better */}
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-indigo-500/40 backdrop-blur-md px-4 py-2 rounded-full shadow-lg z-30">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-xs font-medium">Processing:</span>
                    <div className="w-20 h-1.5 bg-indigo-900/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                        style={{ width: `45%` }}
                      ></div>
                    </div>
                    <span className="text-white/90 text-xs font-medium">45%</span>
                  </div>
                </div>

                {/* Abstract AI Avatar Face - Ensured proper centering */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-indigo-500/30 via-indigo-600/20 to-purple-600/30 backdrop-blur-sm flex items-center justify-center relative">
                    {/* Processing indicator around the avatar */}
                    <div className="absolute inset-0 rounded-full">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(129, 140, 248, 0.6)" />
                            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.6)" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="rgba(99, 102, 241, 0.1)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="3"
                          strokeDasharray="289"
                          strokeDashoffset={`${289 - (289 * 0.45)}`}
                          transform="rotate(-90 50 50)"
                          strokeLinecap="round"
                        >
                          <animate 
                            attributeName="stroke-dashoffset" 
                            from={289 - (289 * 0.4)} 
                            to={289 - (289 * 0.5)} 
                            dur="5s" 
                            repeatCount="indefinite" 
                            values={`${289 - (289 * 0.4)};${289 - (289 * 0.5)};${289 - (289 * 0.45)};${289 - (289 * 0.4)}`}
                            keyTimes="0;0.33;0.66;1"
                          />
                        </circle>
                      </svg>
                    </div>
                    
                    {/* Pulse effect behind the face */}
                    <div className="absolute w-40 h-40 rounded-full bg-indigo-600/5 animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute w-36 h-36 rounded-full bg-indigo-600/10 animate-ping" style={{ animationDuration: '4s' }}></div>
                    
                    {/* Stylized AI Face */}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 backdrop-blur-md flex items-center justify-center">
                      {/* Eyes - softer happy eyes */}
                      <div className="absolute top-[35%] left-[25%] w-8 sm:w-9 h-2 sm:h-2.5 rounded-full bg-white/90 transform rotate-[-10deg]"></div>
                      <div className="absolute top-[35%] right-[25%] w-8 sm:w-9 h-2 sm:h-2.5 rounded-full bg-white/90 transform rotate-[10deg]"></div>
                      
                      {/* Happy mouth - curved upward */}
                      <div className="absolute bottom-[32%] left-1/2 transform -translate-x-1/2 w-14 sm:w-16 h-6 sm:h-7 overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 h-14 sm:h-16 rounded-full bg-white/90"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Better particle system */}
                <div className="particles-container absolute inset-0">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div 
                      key={i}
                      className="particle absolute"
                      style={{
                        width: `${Math.random() * 5 + 1}px`,
                        height: `${Math.random() * 5 + 1}px`,
                        backgroundColor: `hsl(${250 + Math.random() * 40}, 80%, ${75 + Math.random() * 15}%)`,
                        borderRadius: '50%',
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        opacity: Math.random() * 0.6 + 0.2,
                        animation: `float ${Math.random() * 10 + 8}s linear infinite`,
                        animationDelay: `${Math.random() * 5}s`,
                        boxShadow: `0 0 ${Math.random() * 6 + 3}px rgba(124, 58, 237, 0.6)`,
                      }}
                    />
                  ))}
                </div>
                
                {/* Better metrics display - Improved positioning */}
                <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 w-full max-w-md grid grid-cols-2 gap-3 z-20 px-4">
                  <div className="bg-indigo-500/30 backdrop-blur-md rounded-lg p-3 border border-indigo-500/20 shadow-lg">
                    <div className="text-indigo-200 text-xs font-medium mb-1 opacity-80">Response Time</div>
                    <div className="text-white text-lg font-semibold flex items-center">
                      <span>81</span>
                      <span className="text-xs ml-1 opacity-70">ms</span>
                    </div>
                  </div>
                  <div className="bg-indigo-500/30 backdrop-blur-md rounded-lg p-3 border border-indigo-500/20 shadow-lg">
                    <div className="text-indigo-200 text-xs font-medium mb-1 opacity-80">Accuracy</div>
                    <div className="text-white text-lg font-semibold flex items-center">
                      <span>97</span>
                      <span className="text-xs ml-1 opacity-70">%</span>
                    </div>
                  </div>
                  <div className="bg-indigo-500/30 backdrop-blur-md rounded-lg p-3 border border-indigo-500/20 shadow-lg">
                    <div className="text-indigo-200 text-xs font-medium mb-1 opacity-80">Memory Usage</div>
                    <div className="text-white text-lg font-semibold flex items-center">
                      <span>198</span>
                      <span className="text-xs ml-1 opacity-70">MB</span>
                    </div>
                  </div>
                  <div className="bg-indigo-500/30 backdrop-blur-md rounded-lg p-3 border border-indigo-500/20 shadow-lg">
                    <div className="text-indigo-200 text-xs font-medium mb-1 opacity-80">Tasks</div>
                    <div className="text-white text-lg font-semibold">
                      3
                    </div>
                  </div>
                </div>

                {/* Improved audio visualizer - Better positioning */}
                <div className="absolute bottom-0 left-0 right-0 h-36 z-10 opacity-80">
                  <div className="w-full h-full flex items-end justify-center">
                    {Array.from({ length: 50 }).map((_, i) => {
                      // Create a more natural-looking waveform
                      const height = 5 + Math.abs(Math.sin(i * 0.15) * 20) + Math.abs(Math.sin(i * 0.3 + 2) * 10);
                      return (
                        <div
                          key={i}
                          className="mx-[1px] bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t"
                          style={{
                            height: `${height}%`,
                            width: '2px',
                            opacity: 0.7 + (height / 100) * 0.3,
                            transition: 'height 200ms ease-in-out'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Improved Assistant Controls */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-4 border border-indigo-500/20 shadow-lg">
                  <div className="text-indigo-200 text-xs font-medium mb-2.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Assistant Mode
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 bg-indigo-600/80 hover:bg-indigo-500/80 text-white shadow-md"
                      onClick={() => changeAvatarMood('neutral')}
                    >
                      Professional
                    </button>
                    <button 
                      className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 bg-indigo-800/50 hover:bg-indigo-700/50 text-white/80 hover:text-white shadow-md"
                      onClick={() => changeAvatarMood('thinking')}
                    >
                      Creative
                    </button>
                  </div>
                </div>
                
                <div className="bg-indigo-900/50 backdrop-blur-md rounded-xl p-4 border border-indigo-500/20 shadow-lg">
                  <div className="text-indigo-200 text-xs font-medium mb-2.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Voice Status
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center px-3 py-1.5 bg-indigo-800/30 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></div>
                      <span className="text-xs text-white/80">Standby</span>
                    </div>
                    <button 
                      className="ml-auto px-4 py-2 text-xs font-medium bg-indigo-600/80 hover:bg-indigo-500/80 rounded-lg text-white transition-all duration-300 shadow-md"
                      onClick={toggleMute}
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Chat container */}
          <motion.div 
            className={`w-full lg:flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col ${
              !agentContainerVisible ? 'block' : 'hidden lg:block'
            }`}
            variants={slideUp}
            initial="initial"
            animate="animate"
          >
            {/* Chat header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">AI Assistant</h3>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div 
              className="flex-1 p-6 overflow-y-auto h-[480px]"
              ref={chatContainerRef}
            >
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div 
                    className="h-full flex flex-col items-center justify-center text-center p-6"
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-gray-100 mb-2">How can I help you today?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8 max-w-md">
                      Ask me any questions about the IDMS ERP system. I'm here to assist you!
                    </p>

                    {/* Suggestion chips */}
                    <div className="mt-4 grid grid-cols-1 gap-3 w-full max-w-md">
                      {suggestedQueries.map((query, index) => (
                        <motion.button
                          key={query}
                          onClick={() => sendMessage(query)}
                          className="p-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 text-left shadow-sm border border-gray-100 dark:border-gray-600 transition-all duration-200"
                          whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            transition: { delay: 0.2 + index * 0.1 } 
                          }}
                        >
                          {query}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message.text}
                        isUser={message.isUser}
                        timestamp={message.timestamp}
                      />
                    ))}
                    {isLoading && (
                      <div className="self-start bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl px-4 py-3 max-w-[85%]">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Error message */}
            {error && (
              <div className="px-6 py-3 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 text-sm font-medium">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Input area */}
            <div 
              className="p-6 border-t border-gray-100 dark:border-gray-700"
            >
              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white shadow-sm"
                    disabled={isLoading}
                  />
                </div>
                <VoiceInput
                  onSpeechResult={handleVoiceInput}
                  onListeningChange={handleVoiceListeningChange}
                  onVolumeChange={setVolume}
                  buttonSize="md"
                  language="en-US"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-md disabled:opacity-60 disabled:pointer-events-none"
                  disabled={!inputValue.trim() || isLoading || isListening}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>

              {/* Suggestion chips - shown when chat is not empty */}
              {messages.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestedQueries.map((query) => (
                    <button
                      key={query}
                      onClick={() => sendMessage(query)}
                      disabled={isLoading}
                      className="text-xs px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 shadow-sm border border-gray-200 dark:border-gray-600"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile toggle button - for responsive design */}
            <button 
              className="md:hidden absolute bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg z-30"
              onClick={toggleAgentContainer}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Voice active indicator - enhanced style */}
      {isListening && (
        <>
          <div className="fixed top-6 right-6 flex items-center gap-2 bg-blue-600/90 backdrop-blur-md px-4 py-2 rounded-full z-40 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
            <span className="text-sm text-white font-medium">Listening...</span>
          </div>
          
          {/* Sound wave visualization around the avatar - enhanced */}
          <div className="fixed inset-0 z-30 pointer-events-none">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full border-4 border-blue-500/20 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute w-48 h-48 rounded-full border-4 border-blue-400/30 animate-ping" style={{ animationDuration: '2s' }}></div>
              <div className="absolute w-32 h-32 rounded-full border-4 border-blue-300/40 animate-ping" style={{ animationDuration: '1.5s' }}></div>
            </div>
            
            {/* Voice level indicator - enhanced */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <div className="mb-6 text-sm text-white/90 backdrop-blur-md bg-blue-900/40 px-4 py-2 rounded-full shadow-lg">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Volume: {Math.round((volume || 0) * 100)}%
                </div>
              </div>
              
              <div className="w-80 h-32 flex items-end justify-center space-x-1 bg-blue-900/20 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                {Array.from({ length: 30 }).map((_, i) => {
                  const dynamicHeight = Math.max(
                    10, 
                    Math.min(100, 
                      20 + Math.sin((Date.now() / (300 + i * 40)) + i * 0.5) * 30 + (volume * 70)
                    )
                  );
                  
                  return (
                    <div 
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-blue-500 to-indigo-300 rounded-t"
                      style={{ 
                        height: `${dynamicHeight}%`,
                        opacity: 0.7 + (dynamicHeight / 200),
                        transition: 'height 100ms ease-out'
                      }}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Interactive AI status bubbles - enhanced */}
      <div className="fixed right-6 bottom-6 z-40">
        <div className="flex flex-col items-end space-y-3">
          {/* Connection status */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg ${isConnected ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-white/80'}`}></div>
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          
          {/* AI state - changes based on activity */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg
            ${isListening ? 'bg-blue-600/90 text-white' : 
            isLoading ? 'bg-amber-500/90 text-white' : 'bg-indigo-600/90 text-white'}`}>
            <div className={`w-2 h-2 rounded-full bg-white/80 ${
              isListening || isLoading ? 'animate-pulse' : ''}`}></div>
            <span>{isListening ? 'Listening' : isLoading ? 'Processing' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
        <p>© {new Date().getFullYear()} AI Avatar Assistant - Crafted with care</p>
      </footer>

      {/* Add CSS for enhanced animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(0) translateX(10px); }
          75% { transform: translateY(10px) translateX(5px); }
        }
        
        .sound-wave-bar {
          animation: sound-wave 1.5s ease-in-out infinite;
        }
        
        @keyframes sound-wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
} 