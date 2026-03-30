import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ImageBackground, 
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { 
  CloudRain, 
  Sun, 
  CloudSnow, 
  CloudLightning, 
  Cloud, 
  Droplets, 
  Wind, 
  Gauge, 
  MapPin, 
  BotMessageSquare,
  ArrowRight,
  ChevronUp
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Backend IP (Tebrikler! ipconfig ile bulmuştuk)
// Backend IP ve Localhost Ayarı (Hem Web hem Telefon için)
const BACKEND_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://192.168.5.21:8000';

const providersList = [
  { id: 'gemini-lite', name: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini', name: 'Gemini 1.5 Flash' },
  { id: 'anthropic-claude3', name: 'Claude 3 Haiku' },
  { id: 'openai-gpt4o-mini', name: 'GPT-4o Mini' },
  { id: 'groq-llama3', name: 'Llama 3 (Groq)' },
  { id: 'groq-mixtral', name: 'Mixtral 8x7b' },
  { id: 'ollama-llama3.2', name: 'Ollama Llama 3.2' },
  { id: 'ollama-mistral', name: 'Ollama Mistral' },
  { id: 'ollama-phi3', name: 'Ollama Phi-3' }
];

const getWeatherIcon = (description) => {
  const size = 80;
  const strokeWidth = 1.5;
  if (!description) return <Cloud size={size} strokeWidth={strokeWidth} color="#fff" />;
  const desc = description.toLowerCase();
  
  if (desc.includes('bulut') || desc.includes('cloud')) return <Cloud size={size} strokeWidth={strokeWidth} color="#cbd5e1" />;
  if (desc.includes('güneş') || desc.includes('açık') || desc.includes('clear')) return <Sun size={size} strokeWidth={strokeWidth} color="#fbbf24" />;
  if (desc.includes('yağ') || desc.includes('rain')) return <CloudRain size={size} strokeWidth={strokeWidth} color="#93c5fd" />;
  if (desc.includes('kar') || desc.includes('snow')) return <CloudSnow size={size} strokeWidth={strokeWidth} color="#fff" />;
  if (desc.includes('fırtına') || desc.includes('şimşek') || desc.includes('storm')) return <CloudLightning size={size} strokeWidth={strokeWidth} color="#eab308" />;
  
  return <Cloud size={size} strokeWidth={strokeWidth} color="#cbd5e1" />;
};

export default function App() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('ollama-llama3.2');
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80');
  const [weatherDetails, setWeatherDetails] = useState(null);
  const [displayLocation, setDisplayLocation] = useState('');
  const [assistantMessage, setAssistantMessage] = useState("Merhaba! Hangi şehrin hava durumunu öğrenmek istiyorsun?");
  const [showProviders, setShowProviders] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    const userQuery = input;
    setInput('');
    setShowProviders(false);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          provider: provider,
          history: [] 
        })
      });

      const data = await response.json();
      
      if (data.image_url) setBgImage(data.image_url);
      setAssistantMessage(data.response);
      setWeatherDetails(data.weather_details);
      
      // Konum bilgisini güncelle
      if (data.weather_details?.location) {
        setDisplayLocation(data.weather_details.location);
      } else if (userQuery.length > 2) {
        setDisplayLocation(userQuery.charAt(0).toUpperCase() + userQuery.slice(1));
      }

    } catch (error) {
      console.error("Chat error:", error);
      setAssistantMessage("Sunucuyla bağlantı kurulamadı. IP adresinizin ve sunucunun açık olduğundan emin olun.");
    } finally {
      setLoading(false);
    }
  };

  const allProviders = providersList;
  const selectedProviderName = allProviders.find(p => p.id === provider)?.name;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={{ uri: bgImage }} style={styles.fullBg} blurRadius={2}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          {showProviders && (
            <TouchableOpacity 
              activeOpacity={1} 
              style={styles.backdrop} 
              onPress={() => setShowProviders(false)} 
            />
          )}
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.locationContainer}>
              <MapPin size={20} color="#f87171" style={styles.shadow} />
              <Text style={styles.locationText}>
                {displayLocation || "Konum Bekleniyor..."}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Main Weather Hero */}
            <BlurView intensity={60} tint="dark" style={styles.heroCard}>
              <ImageBackground 
                source={{ uri: bgImage }} 
                style={styles.heroImageBg}
                imageStyle={{ opacity: 0.6 }}
              >
                <View style={styles.heroInner}>
                  {getWeatherIcon(weatherDetails?.description)}
                  <Text style={styles.tempText}>
                    {weatherDetails ? weatherDetails.temp.replace('°C', '') : '--'}°
                  </Text>
                  <Text style={styles.descText}>
                    {weatherDetails?.description?.toUpperCase() || "BİLGİ YOK"}
                  </Text>
                </View>
              </ImageBackground>
            </BlurView>

            {/* Metrics */}
            <View style={styles.metricsGrid}>
              <BlurView intensity={30} tint="dark" style={styles.metricBox}>
                <Droplets size={22} color="#60a5fa" />
                <Text style={styles.metricLabel}>Nem</Text>
                <Text style={styles.metricValue}>{weatherDetails?.humidity || '--'}</Text>
              </BlurView>
              <BlurView intensity={30} tint="dark" style={styles.metricBox}>
                <Wind size={22} color="#cbd5e1" />
                <Text style={styles.metricLabel}>Rüzgar</Text>
                <Text style={styles.metricValue}>{weatherDetails?.wind || '--'}</Text>
              </BlurView>
              <BlurView intensity={30} tint="dark" style={styles.metricBox}>
                <Gauge size={22} color="#f87171" />
                <Text style={styles.metricLabel}>Basınç</Text>
                <Text style={styles.metricValue}>{weatherDetails?.pressure || '--'}</Text>
              </BlurView>
            </View>

            {/* AI Insight */}
            <BlurView intensity={50} tint="dark" style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <BotMessageSquare size={18} color="#38bdf8" />
                <Text style={styles.aiLabel}>YAPAY ZEKA ÖZETİ</Text>
              </View>
              <Text style={styles.aiText}>
                {loading ? "Veriler analiz ediliyor..." : assistantMessage}
              </Text>
            </BlurView>
          </ScrollView>

          {/* Provider Selector Popover (VS Code Theme) */}
          {showProviders && (
            <View style={styles.providerPopover}>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{ width: '100%' }}
                contentContainerStyle={{ padding: 8 }}
              >
                {allProviders.map(p => {
                  const isActive = provider === p.id;
                  return (
                    <TouchableOpacity 
                      key={p.id} 
                      onPress={() => {setProvider(p.id); setShowProviders(false);}} 
                      style={[styles.popoverItem, isActive && styles.popoverItemActive]}
                    >
                      <View style={styles.popoverItemRow}>
                        <Text style={[styles.popoverText, isActive && styles.activeText]}>
                          {p.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Custom Input Bar (Sizin görseldeki gibi) */}
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.inputField}
              placeholder="Şehir adı girin..."
              placeholderTextColor="#666"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />
            <View style={styles.toolbar}>
              <View style={styles.toolbarLeft}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setShowProviders(!showProviders)}>
                  <ChevronUp size={16} color="#888" />
                  <Text style={styles.toolBtnText}>{selectedProviderName}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolbarRight}>
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <ArrowRight size={20} color="#fff"/>}
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center', // Web'de ortalamak için
    justifyContent: 'center',
  },
  fullBg: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: Platform.OS === 'web' ? 420 : '100%', // Web'de telefon boyutunda kalsın
    height: Platform.OS === 'web' ? 850 : '100%',
    maxWidth: width,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Platform.OS === 'web' ? 40 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginTop: Platform.OS === 'web' ? 20 : 0,
    marginBottom: Platform.OS === 'web' ? 20 : 0,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    // Web uyarısını gidermek için textShadow standardı
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroCard: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginVertical: 20,
    minHeight: 250,
  },
  heroImageBg: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInner: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  tempText: {
    fontSize: 80,
    color: '#fff',
    fontWeight: '200',
    marginLeft: 15,
  },
  descText: {
    fontSize: 16,
    color: '#fff',
    letterSpacing: 3,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 5,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  aiCard: {
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    minHeight: 120,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aiLabel: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  aiText: {
    color: '#e5e5e5',
    lineHeight: 22,
    fontSize: 15,
  },
  inputWrapper: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    padding: 10,
    marginTop: 'auto',
  },
  inputField: {
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 16,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 5,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 5,
  },
  toolBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: '#333',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerPopover: {
    position: 'absolute',
    bottom: 95,
    left: 20, // Sola yaslandı
    width: 280,
    maxHeight: 350,
    backgroundColor: '#1e1e1e', // VS Code arka planı gibi
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  popoverItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
    width: '100%',
  },
  popoverItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#007ACC', // VS Code mavi seçim sınırı (görseldeki gibi)
  },
  popoverItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  popoverText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  activeText: {
    color: '#ffffff', // Seçiliyken daha beyaz
  },
  badgePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
  },
  badgeText: {
    color: '#a3a3a3',
    fontSize: 10,
    fontWeight: '700',
  },
  warningIcon: {
    fontSize: 12,
  },
  backdrop: {
    position: 'absolute',
    top: -100, // Safe area ve header'ı da kapsasın
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 999,
  },
  shadow: {
    // Shadow props are for iOS, elevation is for Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  }
});
