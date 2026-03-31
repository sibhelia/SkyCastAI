import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Cloud, Wind, Droplets } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';

// İşletim sisteminin kendi splash ekranını biz "Gizle" diyene kadar ekranda tutmasını söylüyoruz.
// Böylece uygulama yüklenirken asla beyaz bir ekran saniyesi yaşanmaz.
SplashScreen.preventAutoHideAsync().catch(() => {});

const { width, height } = Dimensions.get('window');

const isWeb = Platform.OS === 'web';
const APP_WIDTH = isWeb ? 390 : width;
const APP_HEIGHT = isWeb ? 820 : height; // Telefon alanı tahmini

// Tek bir yüzen parçacık (küçük hava ikonu)
function FloatingParticle({ icon: Icon, delay, startX, size, color, duration }) {
  const translateY = useRef(new Animated.Value(APP_HEIGHT * 0.1)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -APP_HEIGHT * 0.15,
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, scale, translateY]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        bottom: '15%',
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Icon size={size} color={color} strokeWidth={1.2} />
    </Animated.View>
  );
}

export default function AppSplash({ onFinish }) {
  // Ana animasyon değerleri
  const logoScale    = useRef(new Animated.Value(0.6)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(16)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const barWidth     = useRef(new Animated.Value(0)).current;
  const barOpacity   = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Logo arka hale (glow) pulse
  const glowScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    // 0. Uygulama sahnemiz (AppSplash) çizildiğine göre artık işletim 
    // sisteminin arkadaki statik splash ekranını indirebiliriz. Pürüzsüz geçiş başlasın!
    SplashScreen.hideAsync().catch(() => {});

    // Glow pulse (sürekli nefes alır gibi)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 1.25, duration: 1400, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.30, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 1.00, duration: 1400, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.12, duration: 1400, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();

    // Ana sekans
    Animated.sequence([
      // 1. Logo belir
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 2. Başlık kayarak gelsin
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(titleY,       { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),

      // 3. Tagline
      Animated.delay(100),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),

      // 4. Progress bar belir + dolu
      Animated.delay(150),
      Animated.timing(barOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(barWidth, {
        toValue: 1,   // 0→1 arası, genişlik hesabı aşağıda
        duration: 1100,
        useNativeDriver: false, // width animasyonu native desteklemez
      }),

      // 5. Kısa bekleme sonra ekran solar
      Animated.delay(300),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start(() => {
      pulse.stop();
      onFinish?.();
    });
  }, [barOpacity, barWidth, glowOpacity, glowScale, logoOpacity, logoScale, onFinish, screenOpacity, tagOpacity, titleOpacity, titleY]);

  const particles = [
    { icon: Cloud,    delay: 400,  startX: APP_WIDTH * 0.12, size: 28, color: '#94a3b8', duration: 2200 },
    { icon: Droplets, delay: 700,  startX: APP_WIDTH * 0.72, size: 20, color: '#60a5fa', duration: 2600 },
    { icon: Wind,     delay: 950,  startX: APP_WIDTH * 0.45, size: 22, color: '#cbd5e1', duration: 2000 },
    { icon: Cloud,    delay: 1200, startX: APP_WIDTH * 0.82, size: 16, color: '#64748b', duration: 2400 },
    { icon: Droplets, delay: 300,  startX: APP_WIDTH * 0.30, size: 14, color: '#38bdf8', duration: 2800 },
  ];

  const barWidthInterp = barWidth.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 220],
  });

  return (
    <Animated.View style={[styles.wrapper, { opacity: screenOpacity }]}>
      {/* Arka plan degradesi */}
      <View style={styles.bg} />
      <View style={styles.bgGradientTop} />
      <View style={styles.bgGradientBottom} />

      {/* Yüzen parçacıklar */}
      {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}

      {/* Merkez içerik */}
      <View style={styles.center}>

        {/* Logo alanı */}
        <View style={styles.logoWrap}>
          {/* Glow hale */}
          <Animated.View
            style={[
              styles.glow,
              { transform: [{ scale: glowScale }], opacity: glowOpacity }
            ]}
          />

          {/* Cam efektli ikon kutu */}
          <Animated.View
            style={[
              styles.logoBox,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] }
            ]}
          >
            <BlurView intensity={60} tint="dark" style={styles.logoBlur}>
              <Cloud size={44} color="#fff" strokeWidth={1.2} />
              {/* Küçük aksan ikonları */}
              <View style={styles.accentWind}>
                <Wind size={14} color="#38bdf8" strokeWidth={2} />
              </View>
              <View style={styles.accentDrop}>
                <Droplets size={12} color="#60a5fa" strokeWidth={2} />
              </View>
            </BlurView>
          </Animated.View>
        </View>

        {/* Başlık */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
          <Text style={styles.title}>
            Sky<Text style={styles.titleAccent}>Cast</Text>
            <Text style={styles.titleAI}> AI</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Hava durumunu hisset
        </Animated.Text>

        {/* Progress bar */}
        <Animated.View style={[styles.barTrack, { opacity: barOpacity }]}>
          <Animated.View style={[styles.barFill, { width: barWidthInterp }]} />
        </Animated.View>

      </View>

      {/* Alt versiyon notu */}
      <Animated.Text style={[styles.version, { opacity: tagOpacity }]}>
        v1.0.0
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9991, // En üstte kalması için
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080c14',
  },
  bgGradientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: APP_HEIGHT * 0.45,
    backgroundColor: 'rgba(14, 30, 60, 0.7)',
  },
  bgGradientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: APP_HEIGHT * 0.35,
    backgroundColor: 'rgba(2, 8, 20, 0.85)',
  },

  center: { alignItems: 'center', gap: 14 },

  // Logo
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  glow: {
    position: 'absolute',
    width: 130, height: 130,
    borderRadius: 65,
    backgroundColor: '#1e40af',
  },
  logoBox: {
    width: 96, height: 96,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  logoBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentWind: {
    position: 'absolute',
    bottom: 10, right: 10,
  },
  accentDrop: {
    position: 'absolute',
    top: 10, left: 10,
  },

  // Yazılar
  title: {
    fontSize: 38,
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleAccent: {
    color: '#fff',
    fontWeight: '700',
  },
  titleAI: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 32,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.8)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontWeight: '400',
    marginTop: -4,
  },

  // Progress bar
  barTrack: {
    width: 220,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 20,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 2,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },

  version: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(100,116,139,0.6)',
    fontSize: 11,
    letterSpacing: 1,
  },
});
