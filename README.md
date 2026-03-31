# SkyCast AI: Premium Weather & Analysis Chatbot

<div align="center">
  <img src="https://img.shields.io/badge/React_Native-Expo-000020?style=for-the-badge&logo=react" alt="React Native Expo" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/LangGraph-FF4F00?style=for-the-badge&logo=python&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Ready" />
</div>

<br />

**SkyCast AI** is an intelligent, highly visual, and cross-platform weather chatbot application. Unlike traditional weather apps that just show numbers, SkyCast uses cutting-edge Large Language Models (LLMs) via **LangGraph** to provide human-like, conversational weather advice.

Wrapped in a stunning, premium **glassmorphic design**, the app dynamically adjusts to your context, pulling real tourism landmarks and cityscapes from Wikipedia based on the city you search.

---

## Features

- **Multi-Model AI Engine:** Seamlessly switch between different AI models (`Google Gemini`, `Groq Llama 3`, `Ollama DeepSeek/Llama 3.2`) to get your weather analysis.
- **Premium UI & Animations:** Experience a cinematic splash screen, floating weather particles, and dynamic frosted glass (blur) components tailored for mobile devices.
- **Intelligent Landmark Backgrounds:** The app intelligently scans Wikipedia for tourist attractions and city landmarks based on your query, replacing boring map screenshots with true high-quality imagery.
- **Adaptive Weather Icons:** Accurate Turkish sentiment analysis detects words like "güneşli", "fırtınalı", "sağanak", changing the primary interface icons and metric colors dynamically.
- **Agentic LangGraph Backend:** Uses LangChain's Graph architecture to orchestrate a "Weather Tool" along with the user prompt, ensuring structured JSON output from LLMs regardless of the model provider.
- **Vercel Deployment Ready:** Out-of-the-box configuration (via `vercel.json`) for a Serverless FastAPI backend and Expo Web static deployment.

---

## Technology Stack

**Frontend (Mobile & Web)**
*   **Framework:** React Native (Expo)
*   **Styling:** Native StyleSheet, Expo Blur (`expo-blur`)
*   **Icons:** Lucide React Native
*   **Animations:** React Native Animated API

**Backend (AI & API)**
*   **Framework:** FastAPI, Uvicorn
*   **AI Orchestration:** LangChain, LangGraph
*   **Supported LLMs:** `langchain-google-genai`, `langchain-groq`, `Ollama` 
*   **External APIs:** OpenWeatherMap, Wikipedia Search API

---

## Getting Started

### 1. Prerequisites
- Node.js & npm
- Python 3.9+
- [Expo Go](https://expo.dev/client) app installed on your iOS or Android device.
- API Keys: `OPENWEATHERMAP_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`

### 2. Backend Setup
Navigate to the root directory and install dependencies:
```bash
# Optional but recommended: Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

Create a `.env` file in the root directory:
```env
OPENWEATHERMAP_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

Start the FastAPI server:
```bash
uvicorn api.server:app --reload
```
*The backend runs on `http://localhost:8000` or your local network IP.*

### 3. Frontend Setup
Navigate to the `mobile` folder:
```bash
cd mobile
npm install
```

Start the Expo Development Server:
```bash
npx expo start
```
*Press `c` in the terminal to view the QR code and scan it with the Expo Go app on your phone.*

---

## Vercel Deployment Configuration

SkyCast AI is ready to be deployed to Vercel for free worldwide access:
1. Push this repository to GitHub.
2. Import the project on the Vercel Dashboard.
3. Add your `.env` variables (`GOOGLE_API_KEY`, etc.) in the Vercel Settings.
4. Deploy! Vercel will automatically run the Python backend as Serverless Functions and build the Expo Web app into the `dist` directory.

---

<div align="center">
  <p><i>Hava durumunu hisset.</i></p>
</div>
