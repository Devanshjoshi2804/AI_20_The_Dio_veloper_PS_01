# AI Avatar Assistant Backend

<div align="center">
  <img src="https://i.imgur.com/VkYYJIw.png" alt="Backend Architecture" width="250px">
  
  <p>
    <b>The intelligent core of the AI Avatar Assistant project.</b>
  </p>
  
  <p>
    <a href="#overview">Overview</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#setup">Setup</a> •
    <a href="#api-documentation">API Docs</a> •
    <a href="#deployment">Deployment</a> •
    <a href="#development">Development</a> •
    <a href="#testing">Testing</a>
  </p>
</div>

## 📋 Overview

The backend component powers all the intelligence behind the AI Avatar Assistant, handling:

- Natural language understanding and response generation
- Voice synthesis and processing
- Avatar animation control
- Knowledge base management
- User session tracking
- Real-time communication

The server is built with Node.js and Express, employing a microservices architecture that connects to various AI services for enhanced capabilities.

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Real-time Communication**: Socket.io
- **AI Integration**: Google Gemini API
- **Voice Synthesis**: ElevenLabs API
- **Avatar Generation**: D-ID API
- **Vector Database**: Pinecone
- **Authentication**: JWT
- **Logging**: Winston
- **Testing**: Jest & Supertest

## 🚀 Setup

### Prerequisites

Before starting, ensure you have:

- Node.js v16 or higher installed
- npm or yarn package manager
- API keys for required services

### Installation

1. Clone the repository and navigate to the backend directory:

```bash
git clone https://github.com/yourusername/ai-avatar-assistant.git
cd ai-avatar-assistant/backend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env` file in the backend directory with the following variables:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
DID_API_KEY=your_did_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX=your_pinecone_index_name
```

4. Start the development server:

```bash
npm run dev
```

The backend will be available at http://localhost:5000.

## 📚 API Documentation

### RESTful Endpoints

#### Chat API

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/chat` | POST | Send a message to the AI | `{ message: string }` | `{ response: string, timestamp: Date }` |
| `/api/chat/history` | GET | Get chat history | N/A | `{ messages: Message[] }` |
| `/api/chat/reset` | POST | Reset conversation | N/A | `{ success: boolean }` |

#### Voice API

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/voice/synthesize` | POST | Convert text to speech | `{ text: string, voice_id?: string }` | Audio stream |
| `/api/voice/transcribe` | POST | Convert speech to text | Audio file | `{ text: string }` |

#### Avatar API

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/avatar/animate` | POST | Generate animation | `{ text: string, avatar_id: string }` | `{ animation_url: string }` |
| `/api/avatar/customize` | POST | Customize avatar | `{ settings: AvatarSettings }` | `{ avatar_id: string }` |

### Socket.io Events

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `connection` | Client → Server | N/A | Establish socket connection |
| `disconnect` | Client → Server | N/A | Terminate socket connection |
| `user-message` | Client → Server | `{ message: string, avatar: boolean }` | Send message from user |
| `ai-response` | Server → Client | `{ text: string }` | Send AI response to client |
| `bot-message` | Server → Client | `{ message: string }` | Trigger avatar to speak |
| `error` | Server → Client | `{ message: string }` | Notify client of error |

## 🌐 Deployment

### Deployment to Railway

<div align="center">
  <img src="https://i.imgur.com/WqXLIGz.png" alt="Railway Deployment" width="80%">
</div>

#### Prerequisites
- A Railway account
- Git repository with this code

#### Steps to Deploy

1. Push this repository to GitHub
2. Log in to your Railway account
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repository
5. Configure the project:
   - Root Directory: backend
   - Start Command: npm start

6. Add the following environment variables in the Railway dashboard:
   - `PORT`: 3000 (Railway will override this with its own port)
   - `FRONTEND_URL`: URL of your Vercel frontend (e.g., https://ai-avatar-assistant.vercel.app)
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key
   - `DID_API_KEY`: Your D-ID API key
   - `PINECONE_API_KEY`: Your Pinecone API key
   - `PINECONE_ENVIRONMENT`: Your Pinecone environment
   - `PINECONE_INDEX`: Your Pinecone index name

7. Click "Deploy"

Your backend will be available at the Railway-provided URL. Make sure to update the frontend's environment variables to point to this URL.

## 💻 Development

### Project Structure

```
backend/
├── src/
│   ├── controllers/         # Request handlers
│   │   ├── chatController.js
│   │   ├── voiceController.js
│   │   └── avatarController.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rateLimit.js
│   ├── models/              # Data models
│   │   └── message.js
│   ├── routes/              # API routes
│   │   ├── chatRoutes.js
│   │   ├── voiceRoutes.js
│   │   └── avatarRoutes.js
│   ├── services/            # Business logic
│   │   ├── ai.service.js
│   │   ├── avatar.service.js
│   │   ├── voice.service.js
│   │   └── knowledge.service.js
│   ├── socket/              # Socket.io handlers
│   │   └── socketManager.js
│   ├── utils/               # Utility functions
│   │   ├── logger.js
│   │   └── validators.js
│   └── index.js             # Entry point
├── tests/                   # Test files
├── .env                     # Environment variables
├── .gitignore               # Git ignore file
├── package.json             # Package configuration
└── README.md                # This file
```

### Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot reloading
- `npm test`: Run all tests
- `npm run lint`: Check code style with ESLint
- `npm run lint:fix`: Fix code style issues automatically

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to run the server on | 5000 |
| `FRONTEND_URL` | URL of the frontend application | http://localhost:3000 |
| `GEMINI_API_KEY` | Google Gemini API key | N/A |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | N/A |
| `DID_API_KEY` | D-ID API key | N/A |
| `PINECONE_API_KEY` | Pinecone API key | N/A |
| `PINECONE_ENVIRONMENT` | Pinecone environment | N/A |
| `PINECONE_INDEX` | Pinecone index name | N/A |
| `NODE_ENV` | Node environment | development |
| `LOG_LEVEL` | Winston log level | info |

## 🧪 Testing

The backend uses Jest for testing. To run all tests:

```bash
npm test
```

To run tests with coverage:

```bash
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints and services working together
- **End-to-End Tests**: Test complete flows with mocked external services

Example test file:

```javascript
// tests/controllers/chatController.test.js
const request = require('supertest');
const app = require('../../src/app');
const aiService = require('../../src/services/ai.service');

// Mock AI service
jest.mock('../../src/services/ai.service');

describe('Chat Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return AI response when sending a valid message', async () => {
    // Mock the AI service response
    aiService.generateResponse.mockResolvedValue('Hello, how can I help?');

    // Send request to the endpoint
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hi there' });

    // Assert the response
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('response', 'Hello, how can I help?');
    expect(aiService.generateResponse).toHaveBeenCalledWith('Hi there');
  });
});
```

## 📝 API Integration Guide

### Connecting to Google Gemini API

```javascript
// services/ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Generate a response
async function generateResponse(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
  }
}
```

### Connecting to ElevenLabs API

```javascript
// services/voice.service.js
const axios = require('axios');

// Synthesize speech
async function synthesizeSpeech(text, voiceId = 'default') {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      responseType: 'arraybuffer'
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error synthesizing speech:', error);
    throw new Error('Failed to synthesize speech');
  }
}
```

## 🔒 Security Considerations

- **API Key Protection**: All API keys are stored as environment variables
- **CORS**: Configured to allow only the frontend application
- **Rate Limiting**: Prevents abuse of the API
- **Input Validation**: All user inputs are validated before processing
- **Error Handling**: Proper error handling to prevent information leakage

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [ElevenLabs API Documentation](https://docs.elevenlabs.io/api-reference)
- [D-ID API Documentation](https://docs.d-id.com/)
- [Pinecone Documentation](https://docs.pinecone.io/)

---

<div align="center">
  <p>Part of the AI Avatar Assistant project</p>
  <p>
    <a href="../README.md">Main Documentation</a> •
    <a href="../frontend/README.md">Frontend Documentation</a>
  </p>
</div> 