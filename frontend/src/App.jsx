import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, MapPin, LayoutDashboard, Sun, Moon,
  CheckCircle, ChevronDown, ChevronUp,
  Globe, Train
} from 'lucide-react';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import ApiService from './services/ApiService';
import SupabaseService from './services/SupabaseService';
import MapView from './MapView';

/* ─── Fonts ─────────────────────────────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

/* ─── MTA Line Colors ────────────────────────────────────────────────── */
const lineColors = {
  '1':  { bg: 'bg-red-600',     text: 'text-white', group: 'Red',          hex: '#EE352E' },
  '2':  { bg: 'bg-red-600',     text: 'text-white', group: 'Red',          hex: '#EE352E' },
  '3':  { bg: 'bg-red-600',     text: 'text-white', group: 'Red',          hex: '#EE352E' },
  '4':  { bg: 'bg-emerald-800', text: 'text-white', group: 'Dark Green',   hex: '#00933C' },
  '5':  { bg: 'bg-emerald-800', text: 'text-white', group: 'Dark Green',   hex: '#00933C' },
  '6':  { bg: 'bg-emerald-800', text: 'text-white', group: 'Dark Green',   hex: '#00933C' },
  '6X': { bg: 'bg-emerald-800', text: 'text-white', group: 'Dark Green',   hex: '#00933C' },
  '7':  { bg: 'bg-purple-600',  text: 'text-white', group: 'Purple',       hex: '#B933AD' },
  '7X': { bg: 'bg-purple-600',  text: 'text-white', group: 'Purple',       hex: '#B933AD' },
  'A':  { bg: 'bg-sky-700',     text: 'text-white', group: 'Blue',         hex: '#0039A6' },
  'C':  { bg: 'bg-sky-700',     text: 'text-white', group: 'Blue',         hex: '#0039A6' },
  'E':  { bg: 'bg-sky-700',     text: 'text-white', group: 'Blue',         hex: '#0039A6' },
  'B':  { bg: 'bg-orange-500',  text: 'text-white', group: 'Orange',       hex: '#FF6319' },
  'D':  { bg: 'bg-orange-500',  text: 'text-white', group: 'Orange',       hex: '#FF6319' },
  'F':  { bg: 'bg-orange-500',  text: 'text-white', group: 'Orange',       hex: '#FF6319' },
  'M':  { bg: 'bg-orange-500',  text: 'text-white', group: 'Orange',       hex: '#FF6319' },
  'N':  { bg: 'bg-yellow-400',  text: 'text-black', group: 'Yellow',       hex: '#FCCC0A' },
  'Q':  { bg: 'bg-yellow-400',  text: 'text-black', group: 'Yellow',       hex: '#FCCC0A' },
  'R':  { bg: 'bg-yellow-400',  text: 'text-black', group: 'Yellow',       hex: '#FCCC0A' },
  'W':  { bg: 'bg-yellow-400',  text: 'text-black', group: 'Yellow',       hex: '#FCCC0A' },
  'J':  { bg: 'bg-amber-800',   text: 'text-white', group: 'Brown',        hex: '#996633' },
  'Z':  { bg: 'bg-amber-800',   text: 'text-white', group: 'Brown',        hex: '#996633' },
  'G':  { bg: 'bg-emerald-500', text: 'text-white', group: 'Green',        hex: '#00933C' },
  'L':  { bg: 'bg-gray-500',    text: 'text-white', group: 'Gray',         hex: '#A7A9AC' },
  'S':  { bg: 'bg-gray-500',    text: 'text-white', group: 'Gray',         hex: '#A7A9AC' },
  'GS': { bg: 'bg-gray-500',    text: 'text-white', group: 'Gray',         hex: '#A7A9AC' },
  'FS': { bg: 'bg-gray-500',    text: 'text-white', group: 'Gray',         hex: '#A7A9AC' },
  'H':  { bg: 'bg-gray-500',    text: 'text-white', group: 'Gray',         hex: '#A7A9AC' },
  'SI': { bg: 'bg-emerald-700', text: 'text-white', group: 'Staten Island',hex: '#118844' },
};

/* ─── Translations ───────────────────────────────────────────────────── */
const translations = {
  en: {
    title: 'NYC TRANSIT', subtitle: 'Real-time service status',
    dashboard: 'Status', favorites: 'Saved', map: 'Map', alerts: 'Alerts',
    goodService: 'Good Service', delays: 'Delays', serviceChange: 'Disrupted',
    searchPlaceholder: 'Search lines or stations…',
    addToFavorites: 'Save', removeFromFavorites: 'Unsave',
    signIn: 'Sign In', signOut: 'Sign Out',
    loading: 'Loading…',
    noFavorites: 'No saved lines. Star any line from the Status tab.',
    noAlerts: 'All systems normal.',
    signInToSave: 'Sign in to save lines',
    linesNormal: 'lines normal', disruptions: 'disruptions',
    viewMore: 'View {n} more', collapse: 'Collapse',
  },
  es: {
    title: 'NYC TRÁNSITO', subtitle: 'Estado del servicio en tiempo real',
    dashboard: 'Estado', favorites: 'Guardado', map: 'Mapa', alerts: 'Alertas',
    goodService: 'Buen Servicio', delays: 'Retrasos', serviceChange: 'Interrumpido',
    searchPlaceholder: 'Buscar líneas o estaciones…',
    addToFavorites: 'Guardar', removeFromFavorites: 'Quitar',
    signIn: 'Iniciar Sesión', signOut: 'Cerrar Sesión',
    loading: 'Cargando…',
    noFavorites: 'Sin líneas guardadas.',
    noAlerts: 'Todos los sistemas normales.',
    signInToSave: 'Inicia sesión para guardar',
    linesNormal: 'líneas normales', disruptions: 'interrupciones',
    viewMore: 'Ver {n} más', collapse: 'Contraer',
  },
  zh: {
    title: '纽约地铁', subtitle: '实时服务状态',
    dashboard: '状态', favorites: '收藏', map: '地图', alerts: '警报',
    goodService: '正常服务', delays: '延误', serviceChange: '中断',
    searchPlaceholder: '搜索线路或车站…',
    addToFavorites: '收藏', removeFromFavorites: '取消',
    signIn: '登录', signOut: '退出',
    loading: '加载中…',
    noFavorites: '没有收藏线路。',
    noAlerts: '所有系统正常。',
    signInToSave: '登录以保存线路',
    linesNormal: '条线路正常', disruptions: '条中断',
    viewMore: '查看更多 {n}', collapse: '收起',
  },
};

/* ─── Animation variants ─────────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};
const rowVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } };

/* ─── Status helpers ─────────────────────────────────────────────────── */
const STATUS_BORDER = {
  'good':           'border-l-green-500',
  'delay':          'border-l-amber-400',
  'service-change': 'border-l-red-500',
};
const STATUS_DOT = {
  'good':           'bg-green-500',
  'delay':          'bg-amber-400',
  'service-change': 'bg-red-500',
};
const STATUS_TEXT = {
  'good':           { en: 'Good Service', es: 'Buen Servicio', zh: '正常' },
  'delay':          { en: 'Delays',       es: 'Retrasos',      zh: '延误' },
  'service-change': { en: 'Disrupted',    es: 'Interrumpido',  zh: '中断' },
};

/* ─── Line status card (compact row) ─────────────────────────────────── */
function LineCard({ service, isFav, onToggleFav, language, isExpanded, onToggleExpand, isSignedIn, t }) {
  const colors   = lineColors[service.id] || { bg: 'bg-gray-600', text: 'text-white', hex: '#888' };
  const messages = service.messages || [];
  const hasExtra = messages.length > 1;
  const statusLabel = STATUS_TEXT[service.status]?.[language] || service.status;

  return (
    <motion.div
      variants={rowVariants}
      layout
      className={`border-l-[3px] ${STATUS_BORDER[service.status] || 'border-l-gray-600'} rounded-r-lg transition-colors duration-150 cursor-default group`}
      style={{ background: 'var(--bg-card)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
        {/* MTA badge */}
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 select-none"
          style={{
            backgroundColor: colors.hex,
            color: colors.text?.includes('black') ? '#000' : '#fff',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          {service.id}
        </span>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate"
             style={{ color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
            {service.name}
          </p>
          {service.status !== 'good' && messages[0] && (
            <p className="text-xs truncate mt-0.5"
               style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
              {messages[0].header || messages[0].text}
            </p>
          )}
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[service.status]}`} />
          <span className="text-xs font-medium hidden sm:block"
                style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
            {statusLabel}
          </span>
        </div>

        {/* Actions — always visible */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasExtra && (
            <button
              onClick={() => onToggleExpand(service.id)}
              className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {isSignedIn && (
            <button
              onClick={() => onToggleFav(service.id, service.type)}
              className="p-1 rounded transition-colors"
              title={isFav ? t.removeFromFavorites : t.addToFavorites}
            >
              <Star
                className="w-3.5 h-3.5 transition-colors"
                style={{ color: isFav ? '#FCCC0A' : 'var(--text-subtle)', fill: isFav ? '#FCCC0A' : 'none' }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded alert messages */}
      <AnimatePresence>
        {isExpanded && hasExtra && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2 ml-11">
              {messages.map((msg, i) => (
                <div key={i} className="text-xs pl-3 py-0.5" style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}>
                  {msg.header && <p className="font-medium mb-0.5" style={{ color: 'var(--text)' }}>{msg.header}</p>}
                  {msg.description && <p>{msg.description}</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Summary bar ────────────────────────────────────────────────────── */
function SummaryBar({ serviceStatus, t }) {
  const good      = serviceStatus.filter(s => s.status === 'good').length;
  const delays    = serviceStatus.filter(s => s.status === 'delay').length;
  const disrupted = serviceStatus.filter(s => s.status === 'service-change').length;

  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible"
      className="flex items-center gap-6 px-1 py-3 mb-4"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {[
        { count: good,      label: t.linesNormal, dot: 'bg-green-500' },
        { count: delays,    label: t.delays,      dot: 'bg-amber-400' },
        { count: disrupted, label: t.disruptions, dot: 'bg-red-500'   },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${item.dot} flex-shrink-0`} />
          <span className="font-medium tabular-nums"
                style={{ color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: '0.8rem' }}>
            {item.count}
          </span>
          <span className="text-xs"
                style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            {item.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, message }) {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible"
      className="flex flex-col items-center justify-center py-24 gap-3">
      <Icon className="w-10 h-10 text-white/10" />
      <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)' }}>
        {message}
      </p>
    </motion.div>
  );
}

/* ─── Loading screen ─────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <style>{FONTS}</style>
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing subway circle stack */}
        <div className="relative w-16 h-16">
          {['#EE352E','#0039A6','#FF6319','#FCCC0A','#00933C'].map((color, i) => (
            <motion.div key={color}
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: color, scale: 1 + i * 0.18, opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <Train className="w-6 h-6 text-white/60" />
          </div>
        </div>
        <p className="text-white/30 text-xs tracking-[0.25em] uppercase"
           style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading service data…
        </p>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const { user, isSignedIn } = useUser();

  const [language,       setLanguage]       = useState(() => { try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; } });
  const [theme,          setTheme]          = useState(() => { try { return localStorage.getItem('theme') || 'dark'; } catch { return 'dark'; } });
  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [menuOpen,       setMenuOpen]       = useState(false);

  // Seed from localStorage cache so refresh never shows an empty dashboard
  const [serviceStatus,  setServiceStatus]  = useState(() => {
    try { const c = localStorage.getItem('cache_status'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [stations,       setStations]       = useState(() => {
    try { const c = localStorage.getItem('cache_stations'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [routePolylines, setRoutePolylines] = useState([]);
  const [favorites,      setFavorites]      = useState([]);
  // Only show the full loading screen if we have no cached data at all
  const [loading,        setLoading]        = useState(() => {
    try { return !localStorage.getItem('cache_status'); } catch { return true; }
  });

  const t = translations[language] || translations.en;

  /* Persist preferences */
  useEffect(() => {
    try { localStorage.setItem('lang',  language); } catch {}
  }, [language]);
  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch {}
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  /* Load MTA data on mount */
  useEffect(() => {
    const fetchStatus = ApiService.getServiceStatus().then(r => {
      if (r.success) {
        setServiceStatus(r.data);
        try { localStorage.setItem('cache_status', JSON.stringify(r.data)); } catch {}
      }
    }).catch(() => {});

    const fetchStations = ApiService.getStations().then(r => {
      if (r.success) {
        setStations(r.data);
        try { localStorage.setItem('cache_stations', JSON.stringify(r.data)); } catch {}
      }
    }).catch(() => {});

    const fetchPolylines = ApiService.getRoutePolylines().then(r => {
      if (r.success) setRoutePolylines(r.routes || []);
    }).catch(() => {});

    Promise.all([fetchStatus, fetchStations, fetchPolylines])
      .finally(() => setLoading(false));
  }, []);

  /* Load user favorites when signed in */
  useEffect(() => {
    if (!isSignedIn || !user) { setFavorites([]); return; }
    SupabaseService.getFavorites(user.id).then(setFavorites).catch(console.error);
  }, [isSignedIn, user?.id]);

  /* Arrivals handler for MapView */
  const getArrivals = useCallback(stationId => ApiService.getArrivals(stationId), []);

  /* Favorites toggle */
  const toggleFavorite = useCallback(async (routeId, routeType) => {
    if (!isSignedIn || !user) return;
    try {
      const existing = favorites.find(f => f.route_id === routeId);
      if (existing) {
        await SupabaseService.deleteFavorite(existing.id);
        setFavorites(prev => prev.filter(f => f.id !== existing.id));
      } else {
        const newFav = await SupabaseService.addFavorite(user.id, routeId, routeType);
        if (newFav) setFavorites(prev => [newFav, ...prev]);
      }
    } catch (err) {
      console.error('[Favorites] Error:', err.message);
    }
  }, [isSignedIn, favorites, user]);

  const isFavorite = id => favorites.some(f => f.route_id === id);

  const toggleExpand = id => setExpandedAlerts(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  /* Filtered lists */
  const q = searchQuery.toLowerCase();
  const filteredStatus = serviceStatus.filter(s =>
    !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );
  const favServices = filteredStatus.filter(s => isFavorite(s.id));
  const alertServices = filteredStatus.filter(s => s.status !== 'good');

  if (loading) return <LoadingScreen />;

  /* Tab config */
  const TABS = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'favorites', label: t.favorites, icon: Star },
    { id: 'map',       label: t.map,       icon: MapPin },
  ];

  const isDark = theme === 'dark';

  // CSS variables for light/dark — avoids hardcoded dark classes everywhere
  const themeVars = isDark ? {
    '--bg':          '#0a0a0f',
    '--bg-card':     'rgba(255,255,255,0.03)',
    '--bg-hover':    'rgba(255,255,255,0.06)',
    '--bg-input':    'rgba(255,255,255,0.04)',
    '--border':      'rgba(255,255,255,0.07)',
    '--border-input':'rgba(255,255,255,0.08)',
    '--text':        '#ffffff',
    '--text-muted':  'rgba(255,255,255,0.4)',
    '--text-subtle': 'rgba(255,255,255,0.25)',
    '--header-bg':   '#0a0a0f',
  } : {
    '--bg':          '#f4f4f0',
    '--bg-card':     'rgba(0,0,0,0.03)',
    '--bg-hover':    'rgba(0,0,0,0.06)',
    '--bg-input':    'rgba(0,0,0,0.04)',
    '--border':      'rgba(0,0,0,0.08)',
    '--border-input':'rgba(0,0,0,0.1)',
    '--text':        '#0a0a0f',
    '--text-muted':  'rgba(0,0,0,0.45)',
    '--text-subtle': 'rgba(0,0,0,0.25)',
    '--header-bg':   '#1a1a1f',
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <style>{FONTS}</style>

      <div className="min-h-screen" style={{ ...themeVars, background: 'var(--bg)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <header style={{ background: 'var(--header-bg)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="max-w-5xl mx-auto px-4">

            {/* Top row */}
            <div className="flex items-center justify-between py-4">
              {/* Wordmark */}
              <div>
                <h1 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
                  letterSpacing: '0.06em',
                  color: '#fff',
                  lineHeight: 1,
                }}>
                  {t.title}
                </h1>
                <p style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.62rem',
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}>
                  {t.subtitle}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Language */}
                <div className="flex items-center gap-0.5 rounded-md overflow-hidden"
                     style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  {[['en','EN'],['es','ES'],['zh','中']].map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => setLanguage(code)}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.7rem',
                        fontWeight: language === code ? 600 : 400,
                        padding: '4px 8px',
                        background: language === code ? '#EE352E' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Theme toggle */}
                <button
                  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/10
                             text-white/50 hover:text-white/80 transition-all duration-150"
                >
                  {theme === 'dark'
                    ? <Sun className="w-4 h-4" />
                    : <Moon className="w-4 h-4" />}
                </button>

                {/* Auth */}
                {isSignedIn ? (
                  <UserButton afterSignOutUrl="/" appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8 ring-1 ring-white/20 hover:ring-white/40 transition-all',
                    }
                  }} />
                ) : (
                  <SignInButton mode="modal">
                    <button
                      className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150"
                      style={{
                        background: '#EE352E',
                        color: '#fff',
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: '0.03em',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#d42f28'}
                      onMouseLeave={e => e.currentTarget.style.background = '#EE352E'}
                    >
                      {t.signIn}
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <nav className="flex gap-0">
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                    className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium
                               transition-colors duration-150"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.badge && (
                      <span className="ml-0.5 text-[10px] font-bold bg-red-500 text-white
                                       w-4 h-4 rounded-full flex items-center justify-center leading-none">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                    {active && (
                      <motion.div
                        layoutId="tabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ background: '#EE352E' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main className="max-w-5xl mx-auto px-4 py-6">

          {/* Search (all tabs except map) */}
          {activeTab !== 'map' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative mb-5"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </motion.div>
          )}

          {/* ── Dashboard ────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <SummaryBar serviceStatus={serviceStatus} t={t} />
                <motion.div
                  variants={containerVariants} initial="hidden" animate="visible"
                  className="space-y-1"
                >
                  {filteredStatus.map(service => (
                    <LineCard
                      key={service.id}
                      service={service}
                      isFav={isFavorite(service.id)}
                      onToggleFav={toggleFavorite}
                      language={language}
                      isExpanded={expandedAlerts.has(service.id)}
                      onToggleExpand={toggleExpand}
                      isSignedIn={isSignedIn}
                      t={t}
                    />
                  ))}
                  {filteredStatus.length === 0 && (
                    <EmptyState icon={Search} message="No lines match your search." />
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ── Favorites ────────────────────────────────────── */}
            {activeTab === 'favorites' && (
              <motion.div key="favorites"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                {!isSignedIn ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Star className="w-10 h-10 text-white/10" />
                    <p className="text-white/30 text-sm">{t.signInToSave}</p>
                    <SignInButton mode="modal">
                      <button className="text-xs font-semibold px-4 py-2 rounded-md"
                        style={{ background: '#EE352E', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                        {t.signIn}
                      </button>
                    </SignInButton>
                  </div>
                ) : favServices.length === 0 ? (
                  <EmptyState icon={Star} message={t.noFavorites} />
                ) : (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-1">
                    {favServices.map(service => (
                      <LineCard
                        key={service.id}
                        service={service}
                        isFav={true}
                        onToggleFav={toggleFavorite}
                        language={language}
                        isExpanded={expandedAlerts.has(service.id)}
                        onToggleExpand={toggleExpand}
                        isSignedIn={isSignedIn}
                        t={t}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Map ──────────────────────────────────────────── */}
            {activeTab === 'map' && (
              <motion.div key="map"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <MapView
                  stations={stations}
                  serviceStatus={serviceStatus}
                  lineColors={lineColors}
                  routePolylines={routePolylines}
                  onGetArrivals={getArrivals}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
