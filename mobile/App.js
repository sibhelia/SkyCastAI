import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ImageBackground, ScrollView, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  CloudRain, Sun, CloudSnow, CloudLightning, Cloud,
  Droplets, Wind, Gauge, MapPin, BotMessageSquare,
  ArrowRight, ChevronUp, AlertTriangle, AlertCircle,
  CheckCircle2, Info, Thermometer
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const BACKEND_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://192.168.4.209:8000';

const PROVIDERS = [
  { id: 'groq-llama3', name: 'Groq Llama 3' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'ollama-llama3.2', name: 'Ollama Llama 3.2' },
  { id: 'ollama-deepseek-r1:1.5b', name: 'Ollama DeepSeek' },
];

// İlk harf büyük yap
const capitalize = (str) => str
  ? str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1)
  : str;

// advice_type → renk teması
const ADVICE_THEME = {
  danger: { border: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '#ef4444', badge: 'TEHLİKELİ', icon: AlertTriangle },
  warning: { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '#f59e0b', badge: 'DİKKAT', icon: AlertCircle },
  neutral: { border: '#94a3b8', bg: 'rgba(148,163,184,0.10)', label: '#94a3b8', badge: 'NORMAL', icon: Info },
  good: { border: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: '#22c55e', badge: 'İDEAL', icon: CheckCircle2 },
};

// Hava durumu açıklamasına göre büyük ikon
const WeatherIcon = ({ description, size = 80 }) => {
  const sw = 1.5;
  const props = { size, strokeWidth: sw };
  if (!description) return <Cloud {...props} color="#fff" />;
  const d = description.toLowerCase();
  if (d.includes('güneş') || d.includes('açık') || d.includes('clear')) return <Sun  {...props} color="#fbbf24" />;
  if (d.includes('yağ') || d.includes('rain')) return <CloudRain {...props} color="#93c5fd" />;
  if (d.includes('kar') || d.includes('snow')) return <CloudSnow {...props} color="#e2e8f0" />;
  if (d.includes('fırtına') || d.includes('storm') || d.includes('şimşek')) return <CloudLightning {...props} color="#eab308" />;
  if (d.includes('bulut') || d.includes('cloud')) return <Cloud {...props} color="#cbd5e1" />;
  return <Cloud {...props} color="#cbd5e1" />;
};

// Model yanıtını parse et: JSON mu, düz metin mi?
function parseAIResponse(rawText) {
  if (!rawText) return { summary: '', adviceType: 'neutral', iconQuery: null };

  // JSON blok varsa çıkar
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || rawText,
        adviceType: parsed.advice_type || 'neutral',
        iconQuery: parsed.icon_query || null,
      };
    } catch (_) { /* düz metne düş */ }
  }

  // Eski format: [IMG_QUERY: ...] varsa ayıkla
  const imgMatch = rawText.match(/\[IMG_QUERY:\s*(.*?)\]/);
  return {
    summary: rawText.replace(/\[IMG_QUERY:.*?\]/, '').trim(),
    adviceType: 'neutral',
    iconQuery: imgMatch ? imgMatch[1] : null,
  };
}

// Wikipedia'dan arka plan görseli çek
async function fetchWikipediaImage(query) {
  const search = async (lang) => {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=1080&origin=*`;
    const resp = await fetch(url);
    const data = await resp.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    return first?.thumbnail?.source || null;
  };

  try {
    return (await search('tr')) || (await search('en')) ||
      'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1080&q=80';
  } catch {
    return null;
  }
}

// Sıcaklıktan basit advice_type tahmini (AI dönmezse fallback)
function guessAdviceType(temp) {
  if (!temp) return 'neutral';
  const t = parseFloat(temp);
  if (t <= 2 || t >= 38) return 'danger';
  if (t <= 10 || t >= 33) return 'warning';
  if (t >= 20 && t <= 30) return 'good';
  return 'neutral';
}

export default function App() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('ollama-llama3.2');
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80');
  const [weatherDetails, setWeatherDetails] = useState(null);
  const [displayLocation, setDisplayLocation] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('Merhaba! Hangi şehrin hava durumunu öğrenmek istiyorsun?');
  const [adviceType, setAdviceType] = useState('neutral');
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
        body: JSON.stringify({ message: userQuery, provider, history: [] }),
      });

      const data = await response.json();
      const { summary, adviceType: aType, iconQuery } = parseAIResponse(data.response);

      // Arka plan: önce ikonik mekan, yoksa şehir adı
      const imageTarget = iconQuery || data.weather_details?.location || userQuery;
      fetchWikipediaImage(imageTarget).then(url => { if (url) setBgImage(url); });

      // Tavsiye tipini belirle (AI verirse AI'nın, yoksa sıcaklıktan tahmin)
      const resolvedType = (aType && aType !== 'neutral')
        ? aType
        : guessAdviceType(data.weather_details?.temp);

      setAssistantMessage(summary || data.response);
      setAdviceType(resolvedType);
      setWeatherDetails(data.weather_details);

      if (data.weather_details?.location) {
        setDisplayLocation(capitalize(data.weather_details.location));
      }
    } catch (err) {
      console.error(err);
      setAssistantMessage('Sunucuyla bağlantı kurulamadı. Backend açık mı?');
      setAdviceType('danger');
    } finally {
      setLoading(false);
    }
  };

  const theme = ADVICE_THEME[adviceType] || ADVICE_THEME.neutral;
  const AdviceIcon = theme.icon;
  const selectedName = PROVIDERS.find(p => p.id === provider)?.name;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={{ uri: bgImage }} style={styles.fullBg} blurRadius={2}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {showProviders && (
            <TouchableOpacity
              activeOpacity={1} style={styles.backdrop}
              onPress={() => setShowProviders(false)}
            />
          )}

          <View style={styles.header}>
            <View style={styles.locationRow}>
              <MapPin size={18} color="#f87171" />
              <Text style={styles.locationText}>
                {displayLocation || 'Nereyi keşfediyoruz?'}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Hero kart */}
            <BlurView intensity={60} tint="dark" style={styles.heroCard}>
              <ImageBackground
                source={{ uri: bgImage }}
                style={styles.heroBg}
                imageStyle={{ opacity: 0.55 }}
              >
                <View style={styles.heroInner}>
                  <WeatherIcon description={weatherDetails?.description} />
                  <Text style={styles.tempText}>
                    {weatherDetails ? weatherDetails.temp.replace('°C', '') : '--'}°
                  </Text>
                  {weatherDetails?.feels_like && (
                    <View style={styles.feelsRow}>
                      <Thermometer size={13} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.feelsText}>
                        Hissedilen {weatherDetails.feels_like}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.descText}>
                    {weatherDetails?.description?.toUpperCase() || 'BİLGİ YOK'}
                  </Text>
                </View>
              </ImageBackground>
            </BlurView>

            {/* Metrik kutuları */}
            <View style={styles.metrics}>
              <BlurView intensity={30} tint="dark" style={styles.metricBox}>
                <Droplets size={20} color="#60a5fa" />
                <Text style={styles.metricLabel}>Nem</Text>
                <Text style={styles.metricValue}>{weatherDetails?.humidity || '--'}</Text>
              </BlurView>
              <BlurView intensity={30} tint="dark" style={styles.metricBox}>
                <Wind size={20} color="#cbd5e1" />
                <Text style={styles.metricLabel}>Rüzgar</Text>
                <Text style={styles.metricValue}>{weatherDetails?.wind || '--'}</Text>
              </BlurView>
              <BlurView intensity={30} tint="dark" style={styles.metricBox}>
                <Gauge size={20} color="#f87171" />
                <Text style={styles.metricLabel}>Basınç</Text>
                <Text style={styles.metricValue}>{weatherDetails?.pressure || '--'}</Text>
              </BlurView>
            </View>

            {/* Akıllı Tavsiye Kartı */}
            <BlurView intensity={50} tint="dark" style={[styles.adviceCard, { borderColor: theme.border }]}>
              {/* Renk çizgisi (sol kenar) */}
              <View style={[styles.adviceStripe, { backgroundColor: theme.border }]} />

              <View style={styles.adviceBody}>
                {/* Başlık satırı */}
                <View style={styles.adviceHeader}>
                  <View style={styles.adviceHeaderLeft}>
                    <BotMessageSquare size={15} color={theme.label} />
                    <Text style={[styles.adviceLabel, { color: theme.label }]}>
                      SKYCAST AI
                    </Text>
                  </View>
                  {/* Durum rozeti */}
                  <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <AdviceIcon size={11} color={theme.label} />
                    <Text style={[styles.badgeText, { color: theme.label }]}>
                      {theme.badge}
                    </Text>
                  </View>
                </View>

                {/* Mesaj */}
                <Text style={styles.adviceText}>
                  {loading ? 'Hava durumu analiz ediliyor...' : assistantMessage}
                </Text>
              </View>
            </BlurView>

          </ScrollView>

          {/* Provider seçici popover */}
          {showProviders && (
            <View style={styles.popover}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 6 }}>
                {PROVIDERS.map(p => {
                  const active = provider === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setProvider(p.id); setShowProviders(false); }}
                      style={[styles.popoverItem, active && styles.popoverItemActive]}
                    >
                      <Text style={[styles.popoverText, active && styles.popoverTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Input alanı */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputField}
              placeholder={displayLocation ? `${capitalize(displayLocation)} nasıl?` : "Bir şehir keşfet..."}
              placeholderTextColor="#555"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.providerBtn} onPress={() => setShowProviders(!showProviders)}>
                <ChevronUp size={14} color="#666" />
                <Text style={styles.providerBtnText}>{selectedName}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <ArrowRight size={18} color="#fff" />}
              </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBg: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: Platform.OS === 'web' ? 390 : '100%',
    height: Platform.OS === 'web' ? '88%' : '100%',
    maxHeight: Platform.OS === 'web' ? 820 : '100%',
    maxWidth: Platform.OS === 'web' ? 390 : width,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: Platform.OS === 'web' ? 40 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  header: { alignItems: 'center', marginTop: 18, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' },
  locationText: {
    color: '#fff', fontSize: 20, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scroll: { paddingBottom: 16 },

  // Hero
  heroCard: {
    borderRadius: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    marginVertical: 16, minHeight: 230,
  },
  heroBg: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  heroInner: { padding: 36, alignItems: 'center', gap: 6 },
  tempText: { fontSize: 76, color: '#fff', fontWeight: '200', marginLeft: 12 },
  feelsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feelsText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '400' },
  descText: { fontSize: 14, color: '#fff', letterSpacing: 3, fontWeight: '500' },

  // Metrikler
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricBox: {
    flex: 1, borderRadius: 20, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  metricLabel: { color: '#94a3b8', fontSize: 11, marginTop: 5 },
  metricValue: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 },

  // Tavsiye kartı
  adviceCard: {
    borderRadius: 22, borderWidth: 1,
    overflow: 'hidden', flexDirection: 'row',
    minHeight: 100,
  },
  adviceStripe: { width: 4 },
  adviceBody: { flex: 1, padding: 16 },
  adviceHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  adviceHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adviceLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  adviceText: { color: '#e2e8f0', fontSize: 14, lineHeight: 22, fontWeight: '400' },

  // Provider popover
  popover: {
    position: 'absolute', bottom: 95, left: 16,
    width: 270, maxHeight: 280,
    backgroundColor: '#1a1a1a',
    borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a',
    zIndex: 1000,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7, shadowRadius: 16, elevation: 15,
  },
  popoverItem: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 6 },
  popoverItemActive: { backgroundColor: 'rgba(56,189,248,0.1)' },
  popoverText: { color: '#777', fontSize: 13 },
  popoverTextActive: { color: '#38bdf8', fontWeight: '600' },

  // Input
  inputWrapper: {
    backgroundColor: '#161616',
    borderRadius: 16, borderWidth: 1, borderColor: '#2a2a2a',
    padding: 10, marginTop: 'auto',
  },
  inputField: {
    color: '#fff', paddingHorizontal: 8, paddingVertical: 10, fontSize: 15,
  },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 4,
  },
  providerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6 },
  providerBtnText: { color: '#666', fontSize: 12, fontWeight: '600' },
  sendBtn: {
    backgroundColor: '#2a2a2a', width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute', top: -200, left: -100, right: -100, bottom: -100, zIndex: 999,
  },
});