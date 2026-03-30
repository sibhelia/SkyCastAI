import React, { useState } from 'react';
import './index.css';

const cloudProviders = [
  { id: 'gemini', name: 'Google Gemini 2.5', icon: '✨' },
  { id: 'openai-gpt4o', name: 'OpenAI GPT-4o', icon: '🧠' },
  { id: 'openai-gpt3.5', name: 'OpenAI GPT-3.5', icon: '🤖' },
  { id: 'anthropic-claude3', name: 'Claude 3 Haiku', icon: '🎭' },
  { id: 'groq-llama3', name: 'Groq (Llama 3)', icon: '⚡' }
];

const localProviders = [
  { id: 'ollama-llama3.2', name: 'Ollama Llama 3.2', icon: '🏠' },
  { id: 'ollama-mistral', name: 'Ollama Mistral', icon: '🌪️' },
  { id: 'ollama-phi3', name: 'Ollama Phi-3', icon: '🔬' }
];

// Hava durumuna göre dev emoji seçimi
const getWeatherIcon = (description) => {
  if (!description) return '⛅';
  const desc = description.toLowerCase();
  if (desc.includes('bulut') || desc.includes('cloud')) return '☁️';
  if (desc.includes('güneş') || desc.includes('açık') || desc.includes('clear')) return '☀️';
  if (desc.includes('yağ') || desc.includes('rain')) return '🌧️';
  if (desc.includes('kar') || desc.includes('snow')) return '❄️';
  if (desc.includes('fırtına') || desc.includes('şimşek') || desc.includes('storm')) return '⛈️';
  return '⛅';
};

function App() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
  
  // Sadece anlık aktif durumu (Tek Ekran - Mobile Widget Mantığı) tutuyoruz
  const [weatherDetails, setWeatherDetails] = useState(null);
  const [assistantMessage, setAssistantMessage] = useState("Merhaba! Hangi şehrin hava durumunu öğrenmek istiyorsun?");

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    const userQuery = input;
    setInput('');

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          provider: provider,
          history: [] // Geçmişi yollamıyoruz, her soru sıfırdan başlıyor (Resetleniyor)
        })
      });

      const data = await response.json();
      
      if (data.image_url) {
        setBgImage(data.image_url);
      }

      setAssistantMessage(data.response);
      setWeatherDetails(data.weather_details);

    } catch (error) {
      console.error("Chat error:", error);
      setAssistantMessage("Sunucuyla bağlantı kurulamadı. API'lerin çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ backgroundImage: `url(${bgImage})` }}>
      {/* Ana Mobil Uygulama Widget'ı */}
      <main className="mobile-view-wrapper">
        <div className="mobile-phone-frame">
          <div className="phone-header">
            <div className="location-name">
              📍 {weatherDetails?.location || "Konum Bekleniyor..."}
            </div>
          </div>

          <div className="weather-hero">
            <div className="main-icon">
              {getWeatherIcon(weatherDetails?.description)}
            </div>
            <div className="temperature">
              {weatherDetails ? weatherDetails.temp.replace('°C', '') : '--'}°
            </div>
            <div className="weather-desc">
              {weatherDetails?.description?.toUpperCase() || "BİLGİ YOK"}
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-box">
              <span className="icon">💧</span>
              <span className="label">Nem</span>
              <span className="value">{weatherDetails?.humidity || '--'}</span>
            </div>
            <div className="metric-box">
              <span className="icon">🌬️</span>
              <span className="label">Rüzgar</span>
              <span className="value">{weatherDetails?.wind || '--'}</span>
            </div>
            <div className="metric-box">
              <span className="icon">⏲️</span>
              <span className="label">Basınç</span>
              <span className="value">{weatherDetails?.pressure || '--'}</span>
            </div>
          </div>

          <div className="ai-insight-glass">
            <div className="ai-label">🤖 Yapay Zeka Asistanı:</div>
            <p>{loading ? "Veriler alınıp analiz ediliyor..." : assistantMessage}</p>
          </div>

          <div className="mobile-input-area">
            <select 
              className="provider-dropdown" 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
            >
              <optgroup label="☁️ Bulut Servisleri">
                {cloudProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </optgroup>
              <optgroup label="💻 Yerel Modeller">
                {localProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </optgroup>
            </select>
            
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Başka bir şehir? (Örn: Ankara)" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button className="send-btn" onClick={handleSend} disabled={loading}>
                {loading ? '...' : 'Bul'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
