import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// API LAYER — change BASE_URL to your backend when deploying
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:4000";

const api = {
  _token: () => localStorage.getItem("xervlink_token"),

  async _req(method, path, body, isFormData = false) {
    const headers = { Authorization: `Bearer ${this._token()}` };
    if (!isFormData) headers["Content-Type"] = "application/json";
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },

  get:    (path)        => api._req("GET",    path),
  post:   (path, body)  => api._req("POST",   path, body),
  put:    (path, body)  => api._req("PUT",    path, body),
  patch:  (path, body)  => api._req("PATCH",  path, body),
  del:    (path)        => api._req("DELETE", path),
  upload: (path, form)  => api._req("POST",   path, form, true),

  // Auth
  login:    (email, password) => api.post("/api/auth/login",    { email, password }),
  register: (name, email, password, role) => api.post("/api/auth/register", { name, email, password, role }),
  me:       ()                => api.get("/api/auth/me"),

  // Profile
  updateProfile: (data)     => api.put("/api/users/me", data),
  uploadAvatar:  (form)     => api.upload("/api/users/me/avatar", form),

  // Notifications
  getNotifPrefs:    ()     => api.get("/api/users/me/notifications"),
  updateNotifPrefs: (data) => api.put("/api/users/me/notifications", data),

  // Payments
  getPaymentPrefs:    ()     => api.get("/api/users/me/payment"),
  updatePaymentPrefs: (data) => api.put("/api/users/me/payment", data),

  // Services
  getServices: () => api.get("/api/services"),

  // Providers
  getProviders:  (service_id, sort) => api.get(`/api/providers?service_id=${service_id}&sort=${sort}`),
  getProvider:   (id)               => api.get(`/api/providers/${id}`),
  getReviews:    (id)               => api.get(`/api/providers/${id}/reviews`),

  // Bookings
  getBookings:    (status) => api.get(`/api/bookings${status ? `?status=${status}` : ""}`),
  createBooking:  (data)   => api.post("/api/bookings", data),
  updateBooking:  (id, status) => api.patch(`/api/bookings/${id}/status`, { status }),

  // Messages
  getConversations: ()     => api.get("/api/conversations"),
  getMessages:      (cid)  => api.get(`/api/conversations/${cid}/messages`),
  startConversation: (provider_id) => api.post("/api/conversations", { provider_id }),
  sendMessage:      (cid, body) => api.post(`/api/conversations/${cid}/messages`, { body }),

  // Admin
  getAdminStats: () => api.get("/api/admin/stats"),
  getAdminUsers: () => api.get("/api/admin/users"),
};

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

const DARK = {
  mode:"dark", bg:"#0A0A0A", surface:"#111111", surfaceHigh:"#181818",
  border:"rgba(255,255,255,0.08)", borderStrong:"rgba(255,255,255,0.14)",
  text:"#EFEFEF", textSub:"#777777", textMuted:"#333333",
  accent:"#EFEFEF", accentText:"#0A0A0A",
  glass:"rgba(15,15,15,0.8)", glassBorder:"rgba(255,255,255,0.06)",
  inputBg:"rgba(255,255,255,0.03)", inputBorder:"rgba(255,255,255,0.09)", inputFocus:"rgba(255,255,255,0.22)",
  navBg:"rgba(10,10,10,0.92)",
  pill:"rgba(255,255,255,0.05)", pillBorder:"rgba(255,255,255,0.09)",
  pillActive:"rgba(255,255,255,0.11)", pillActiveBorder:"rgba(255,255,255,0.28)",
  skeletonA:"#181818", skeletonB:"#222222", shadow:"0 32px 80px rgba(0,0,0,0.7)",
};
const LIGHT = {
  mode:"light", bg:"#F9F8F6", surface:"#FFFFFF", surfaceHigh:"#F2F1EE",
  border:"rgba(0,0,0,0.08)", borderStrong:"rgba(0,0,0,0.15)",
  text:"#111111", textSub:"#555555", textMuted:"#AAAAAA",
  accent:"#111111", accentText:"#FFFFFF",
  glass:"rgba(255,255,255,0.85)", glassBorder:"rgba(0,0,0,0.07)",
  inputBg:"rgba(0,0,0,0.025)", inputBorder:"rgba(0,0,0,0.1)", inputFocus:"rgba(0,0,0,0.22)",
  navBg:"rgba(249,248,246,0.93)",
  pill:"rgba(0,0,0,0.04)", pillBorder:"rgba(0,0,0,0.09)",
  pillActive:"rgba(0,0,0,0.08)", pillActiveBorder:"rgba(0,0,0,0.24)",
  skeletonA:"#EAEAE8", skeletonB:"#F4F4F2", shadow:"0 32px 80px rgba(0,0,0,0.10)",
};

// ─── SERVICE ICONS ────────────────────────────────────────────────────────────
const ICON_MAP = {
  scissors:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  wand:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="21" x2="21" y2="3"/><path d="m9 3 1 4M3 9l4 1M18 14l3 1M14 18l1 3"/></svg>,
  sparkle:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  car:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 17H3a2 2 0 0 1-2-2V9l4-5h12l4 5v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>,
  pen:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/><circle cx="11" cy="11" r="2"/></svg>,
  bolt:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  home:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  tool:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  aperture:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/><line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/><line x1="14.31" y1="16" x2="2.83" y2="16"/><line x1="16.62" y1="12" x2="10.88" y2="21.94"/></svg>,
  book:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
};

const IC = {
  back:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  check:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  chevron:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  send:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  edit:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  bell:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  card:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  shield:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  help:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  phone:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  sun:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  navHome:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  navCal:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  navMsg:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  navUser:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  navGrid:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GS = ({ t }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Geist:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
    html,body{height:100%;background:${t.bg};color:${t.text};font-family:'Geist','Helvetica Neue',sans-serif;}
    input,button,textarea{font-family:'Geist','Helvetica Neue',sans-serif;}
    ::-webkit-scrollbar{display:none;}
    ::placeholder{color:${t.textMuted};}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes slideIn{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:translateX(0)}}
    @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
    @keyframes pulse{0%,100%{opacity:0.15}50%{opacity:0.5}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
    .aFU{animation:fadeUp .42s cubic-bezier(.22,.68,0,1.1) both}
    .aFI{animation:fadeIn .3s ease both}
    .aSI{animation:slideIn .35s cubic-bezier(.22,.68,0,1.1) both}
    .aSC{animation:scaleIn .32s cubic-bezier(.34,1.1,.64,1) both}
    .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}
    .d4{animation-delay:.24s}.d5{animation-delay:.30s}.d6{animation-delay:.36s}
    .d7{animation-delay:.42s}.d8{animation-delay:.48s}.d9{animation-delay:.54s}.d10{animation-delay:.60s}
    .tap{cursor:pointer;transition:opacity .14s ease,transform .14s ease;}
    .tap:active{opacity:.7;transform:scale(0.97)}
    .skel{background:linear-gradient(90deg,${t.skeletonA} 25%,${t.skeletonB} 50%,${t.skeletonA} 75%);background-size:600px 100%;animation:shimmer 1.6s infinite;}
    input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px ${t.inputBg} inset !important;-webkit-text-fill-color:${t.text} !important;}
  `}</style>
);

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Av = ({ name, url, size = 44 }) => {
  const t = useTheme();
  const initials = name ? name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() : "?";
  return url
    ? <img src={`${BASE_URL}${url}`} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1px solid ${t.border}`, flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: t.surfaceHigh, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 500, color: t.textSub, flexShrink: 0, letterSpacing: "0.05em", fontFamily: "'Cormorant Garamond',serif" }}>{initials}</div>;
};

const Rule = ({ style }) => { const t = useTheme(); return <div style={{ height: "1px", background: t.border, ...style }} />; };

const Btn = ({ label, onPress, variant = "primary", full = true, disabled, loading }) => {
  const t = useTheme();
  const v = { primary:{ bg:t.accent,color:t.accentText,border:"none" }, secondary:{ bg:"transparent",color:t.text,border:`1px solid ${t.borderStrong}` }, ghost:{ bg:"transparent",color:t.textSub,border:`1px solid ${t.border}` } }[variant];
  return (
    <button className="tap" onClick={disabled || loading ? null : onPress} style={{ height:52, borderRadius:12, border:v.border, background:v.bg, color:v.color, fontSize:14, fontWeight:500, letterSpacing:"0.04em", width:full?"100%":"auto", padding:full?"0":"0 24px", cursor:(disabled||loading)?"not-allowed":"pointer", opacity:(disabled||loading)?0.45:1, transition:"opacity .15s" }}>
      {loading ? "Loading…" : label}
    </button>
  );
};

const Inp = ({ placeholder, value, onChange, type = "text", label, hint }) => {
  const t = useTheme();
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <label style={{ fontSize:11, fontWeight:500, color:t.textSub, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</label>
        {hint && <span style={{ fontSize:11, color:t.textMuted }}>{hint}</span>}
      </div>}
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width:"100%", height:50, borderRadius:10, padding:"0 16px", background:t.inputBg, border:`1px solid ${f?t.inputFocus:t.inputBorder}`, color:t.text, fontSize:15, outline:"none", transition:"border-color .2s" }} />
    </div>
  );
};

const Chip = ({ label, active, onClick }) => {
  const t = useTheme();
  return <div className="tap" onClick={onClick} style={{ padding:"7px 15px", borderRadius:999, whiteSpace:"nowrap", background:active?t.pillActive:t.pill, border:`1px solid ${active?t.pillActiveBorder:t.pillBorder}`, fontSize:12, fontWeight:active?600:400, color:active?t.text:t.textSub, transition:"all .18s", letterSpacing:"0.02em" }}>{label}</div>;
};

const BackBtn = ({ onPress }) => {
  const t = useTheme();
  return <div className="tap" onClick={onPress} style={{ width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:10, border:`1px solid ${t.border}`, background:t.surface, color:t.textSub, flexShrink:0 }}>{IC.back}</div>;
};

const Toggle = ({ on, onToggle }) => {
  const t = useTheme();
  return <div className="tap" onClick={onToggle} style={{ width:46, height:26, borderRadius:13, background:on?t.text:t.surfaceHigh, border:`1px solid ${t.border}`, position:"relative", transition:"background .25s", flexShrink:0 }}><div style={{ width:18, height:18, borderRadius:"50%", background:on?t.accentText:t.textSub, position:"absolute", top:3, left:on?24:4, transition:"left .25s" }} /></div>;
};

const SettingRow = ({ icon, label, onPress, right, sub }) => {
  const t = useTheme();
  return <div className="tap" onClick={onPress} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 0", borderBottom:`1px solid ${t.border}` }}>
    <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:t.surfaceHigh, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:t.textSub }}>{icon}</div>
    <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:400, color:t.text }}>{label}</div>{sub && <div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>{sub}</div>}</div>
    {right !== undefined ? right : <div style={{ color:t.textMuted }}>{IC.chevron}</div>}
  </div>;
};

const ErrMsg = ({ msg }) => { const t = useTheme(); return msg ? <div style={{ fontSize:13, color:"#CC5555", padding:"10px 14px", background:"rgba(204,85,85,0.07)", borderRadius:8, border:"1px solid rgba(204,85,85,0.15)" }}>{msg}</div> : null; };

const SkeletonList = ({ count = 3 }) => {
  const t = useTheme();
  return <>{[...Array(count)].map((_, i) => <div key={i} className="skel" style={{ height:90, borderRadius:14, marginBottom:10 }} />)}</>;
};

// ─── SPLASH ───────────────────────────────────────────────────────────────────
const Splash = () => {
  const t = useTheme();
  return (
    <div className="aFI" style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:42, fontWeight:300, letterSpacing:"0.18em", color:t.text, textTransform:"uppercase" }}>Xervlink</div>
        <div style={{ fontFamily:"'Geist',sans-serif", fontSize:11, fontWeight:400, letterSpacing:"0.22em", color:t.textSub, marginTop:10, textTransform:"uppercase" }}>Service Marketplace</div>
      </div>
      <div style={{ display:"flex", gap:7 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:4, height:4, borderRadius:"50%", background:t.textMuted, animation:`pulse 1.4s ${i*0.22}s infinite` }} />)}
      </div>
    </div>
  );
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const AuthLogin = ({ onLogin, onGo }) => {
  const t = useTheme();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!email || !pw) { setErr("Please complete all fields."); return; }
    setLoading(true); setErr("");
    try {
      const { user, token } = await api.login(email, pw);
      localStorage.setItem("xervlink_token", token);
      onLogin(user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 28px" }}>
      <div className="aFU" style={{ marginBottom:52 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:38, fontWeight:300, letterSpacing:"-0.5px", color:t.text, lineHeight:1.15 }}>Welcome<br /><em>back.</em></div>
        <div style={{ fontSize:14, color:t.textSub, marginTop:12 }}>Sign in to continue to Xervlink</div>
      </div>
      <div className="aFU d1" style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Inp label="Email" placeholder="your@email.com" value={email} onChange={setEmail} />
        <Inp label="Password" placeholder="••••••••" value={pw} onChange={setPw} type="password" hint="Forgot?" />
        <ErrMsg msg={err} />
      </div>
      <div className="aFU d2" style={{ marginTop:32, display:"flex", flexDirection:"column", gap:12 }}>
        <Btn label="Sign In" onPress={submit} loading={loading} />
        <div style={{ textAlign:"center", fontSize:13, color:t.textSub }}>No account? <span className="tap" style={{ color:t.text, fontWeight:500, display:"inline" }} onClick={() => onGo("register")}>Create one</span></div>
      </div>
    </div>
  );
};

const AuthRegister = ({ onLogin, onGo }) => {
  const t = useTheme();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");

  const submit = async () => {
    if (!name || !email || !pw) { setErr("Please complete all fields."); return; }
    setLoading(true); setErr("");
    try {
      const { user, token } = await api.register(name, email, pw, role);
      localStorage.setItem("xervlink_token", token);
      onLogin(user);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 28px" }}>
      <div className="aFU" style={{ marginBottom:48 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:38, fontWeight:300, letterSpacing:"-0.5px", color:t.text, lineHeight:1.15 }}>Create<br /><em>account.</em></div>
        <div style={{ fontSize:14, color:t.textSub, marginTop:12 }}>Join Xervlink today</div>
      </div>
      <div className="aFU d1" style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Inp label="Full Name" placeholder="Your name" value={name} onChange={setName} />
        <Inp label="Email" placeholder="your@email.com" value={email} onChange={setEmail} />
        <Inp label="Password" placeholder="••••••••" value={pw} onChange={setPw} type="password" />
        <ErrMsg msg={err} />
      </div>
      <div className="aFU d2" style={{ marginTop:22 }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:12 }}>I want to</div>
        <div style={{ display:"flex", gap:10 }}>
          {[["USER","Book Services"],["PROVIDER","Offer Services"]].map(([r, l]) => (
            <div key={r} className="tap" onClick={() => setRole(r)} style={{ flex:1, padding:"13px 0", textAlign:"center", borderRadius:10, border:`1px solid ${role===r?t.borderStrong:t.border}`, background:role===r?t.surfaceHigh:"transparent", fontSize:13, fontWeight:role===r?600:400, color:role===r?t.text:t.textSub, transition:"all .2s" }}>{l}</div>
          ))}
        </div>
      </div>
      <div className="aFU d3" style={{ marginTop:28, display:"flex", flexDirection:"column", gap:12 }}>
        <Btn label="Create Account" onPress={submit} loading={loading} />
        <div style={{ textAlign:"center", fontSize:13, color:t.textSub }}>Have an account? <span className="tap" style={{ color:t.text, fontWeight:500, display:"inline" }} onClick={() => onGo("login")}>Sign in</span></div>
      </div>
    </div>
  );
};

// ─── HOME ─────────────────────────────────────────────────────────────────────
const HomeScreen = ({ user, onNav }) => {
  const t = useTheme();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getServices().then(d => setServices(d.services)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding:"36px 24px 24px" }}>
      <div className="aFU" style={{ marginBottom:40 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:300, letterSpacing:"-0.3px", color:t.text, lineHeight:1.2 }}>Hello, <em>{user.name.split(" ")[0]}</em></div>
        <div style={{ fontSize:14, color:t.textSub, marginTop:8 }}>What do you need today?</div>
      </div>

      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[...Array(10)].map((_, i) => <div key={i} className="skel" style={{ height:74, borderRadius:14 }} />)}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {services.map((s, i) => (
            <div key={s.id} className={`aFU d${Math.min(i+1,10)} tap`} onClick={() => onNav("serviceList", s)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, transition:"border-color .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = t.borderStrong}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
            >
              <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:t.surfaceHigh, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:t.textSub }}>
                {ICON_MAP[s.icon] || ICON_MAP.book}
              </div>
              <div style={{ overflow:"hidden" }}>
                <div style={{ fontSize:14, fontWeight:500, color:t.text }}>{s.name}</div>
                <div style={{ fontSize:11, color:t.textSub, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.sub || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── SERVICE LIST ─────────────────────────────────────────────────────────────
const ServiceListScreen = ({ service, onBack, onNav }) => {
  const t = useTheme();
  const [sort, setSort] = useState("toprated");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true); setErr("");
    api.getProviders(service?.id, sort)
      .then(d => setProviders(d.providers))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [service?.id, sort]);

  return (
    <div className="aSI">
      <div style={{ padding:"24px 24px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
          <BackBtn onPress={onBack} />
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:400, color:t.text }}>{service?.name}</div>
            <div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>{loading ? "Loading…" : `${providers.length} providers near you`}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, paddingBottom:20, overflowX:"auto" }}>
          {[["toprated","Top Rated"],["nearest","Nearest"],["available","Available"]].map(([k, l]) => (
            <Chip key={k} label={l} active={sort===k} onClick={() => setSort(k)} />
          ))}
        </div>
      </div>
      <Rule />
      <div style={{ padding:"20px 24px" }}>
        {loading ? <SkeletonList /> : err ? <ErrMsg msg={err} /> : providers.length === 0 ? (
          <div style={{ padding:"60px 0", textAlign:"center" }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:t.textSub, marginBottom:8 }}>No providers yet</div>
            <div style={{ fontSize:13, color:t.textMuted }}>Be the first to offer this service in your area.</div>
          </div>
        ) : providers.map((p, i) => (
          <div key={p.id} className={`aFU d${Math.min(i+1,6)} tap`} onClick={() => onNav("provider", p)}
            style={{ background:t.surface, borderRadius:16, padding:"16px", border:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
            <Av name={p.name} url={p.avatar_url} size={52} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:15, fontWeight:600, color:t.text }}>{p.name}</span>
                {p.verified && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textSub} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{ fontSize:12, color:t.textSub }}>{parseFloat(p.rating)>0 ? `${"★".repeat(Math.round(p.rating))} ${p.rating} (${p.review_count})` : "No reviews yet"}</div>
              <div style={{ fontSize:11, color:p.available?t.textSub:t.textMuted, marginTop:4 }}>
                <span style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background:p.available?t.textSub:t.textMuted, marginRight:5, verticalAlign:"middle" }} />
                {p.available ? "Available" : "Unavailable"}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, color:t.text }}>Ksh {parseFloat(p.price).toLocaleString()}</div>
              <div style={{ fontSize:11, color:t.textSub }}>from</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PROVIDER PROFILE ─────────────────────────────────────────────────────────
const ProviderProfile = ({ provider: initial, onBack, onNav }) => {
  const t = useTheme();
  const [p, setP] = useState(initial);
  const [tab, setTab] = useState("about");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial?.id) {
      api.getProvider(initial.id).then(d => setP(d.provider)).catch(() => {});
      api.getReviews(initial.id).then(d => setReviews(d.reviews)).catch(() => {});
    }
  }, [initial?.id]);

  return (
    <div className="aSI" style={{ paddingBottom:110 }}>
      <div style={{ height:120, background:t.surfaceHigh, borderBottom:`1px solid ${t.border}`, position:"relative" }}>
        <div className="tap" onClick={onBack} style={{ position:"absolute", top:18, left:20, width:36, height:36, borderRadius:10, background:t.glass, border:`1px solid ${t.glassBorder}`, backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", color:t.textSub }}>{IC.back}</div>
        <div style={{ position:"absolute", bottom:-28, left:24 }}><Av name={p?.name} url={p?.avatar_url} size={58} /></div>
      </div>
      <div style={{ padding:"40px 24px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>{p?.name}</span>
              {p?.verified && <span style={{ fontSize:10, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:t.textSub, border:`1px solid ${t.borderStrong}`, borderRadius:5, padding:"2px 7px" }}>Verified</span>}
            </div>
            <div style={{ fontSize:12, color:t.textSub, marginTop:6 }}>{p?.service_name}</div>
            {parseFloat(p?.rating)>0 && <div style={{ fontSize:12, color:t.textSub, marginTop:4 }}>{"★".repeat(Math.round(p.rating))} {p.rating} ({p.review_count} reviews)</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>Ksh {parseFloat(p?.price || 0).toLocaleString()}</div>
            <div style={{ fontSize:11, color:t.textSub }}>from</div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", padding:"24px 24px 0", borderBottom:`1px solid ${t.border}`, marginTop:20 }}>
        {["about","schedule","reviews"].map(tb => (
          <div key={tb} className="tap" onClick={() => setTab(tb)} style={{ flex:1, textAlign:"center", paddingBottom:12, fontSize:12, fontWeight:500, textTransform:"capitalize", letterSpacing:"0.06em", color:tab===tb?t.text:t.textSub, borderBottom:`1.5px solid ${tab===tb?t.text:"transparent"}`, transition:"all .2s" }}>{tb}</div>
        ))}
      </div>

      <div style={{ padding:"24px", minHeight:160 }} className="aFI">
        {tab === "about" && <div style={{ fontSize:14, color:t.textSub, lineHeight:1.75 }}>{p?.bio || "No bio provided."}</div>}
        {tab === "schedule" && (
          <div>
            <div style={{ fontSize:13, color:t.textSub, marginBottom:14 }}>{p?.available ? "Currently accepting bookings." : "Not currently available."}</div>
            <div style={{ fontSize:13, color:t.textSub }}>Contact the provider for availability details.</div>
          </div>
        )}
        {tab === "reviews" && (
          reviews.length === 0
            ? <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, color:t.textSub }}>No reviews yet</div>
            : reviews.map(r => (
              <div key={r.id} style={{ padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{r.reviewer_name}</span>
                  <span style={{ fontSize:12, color:t.textSub }}>{"★".repeat(r.rating)}</span>
                </div>
                <div style={{ fontSize:13, color:t.textSub, lineHeight:1.65 }}>{r.comment}</div>
              </div>
            ))
        )}
      </div>

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, padding:"14px 24px 28px", background:t.navBg, borderTop:`1px solid ${t.border}`, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
        <Btn label="Book Now" onPress={() => onNav("booking", p)} />
        <div style={{ fontSize:11, color:t.textSub, textAlign:"center", marginTop:10 }}>Free cancellation up to 2 hours before</div>
      </div>
    </div>
  );
};

// ─── BOOKING FLOW ─────────────────────────────────────────────────────────────
const BookingScreen = ({ provider: p, onBack }) => {
  const t = useTheme();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState(false);

  const DATES = ["Today","Tomorrow","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() + i);
    return { label: i < 2 ? d : dt.toLocaleDateString("en-GB", { weekday:"short", month:"short", day:"numeric" }), value: dt.toISOString().slice(0,10) };
  });
  const TIMES = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];

  const confirm = async () => {
    setLoading(true); setErr("");
    try {
      await api.createBooking({ provider_id: p.id, service_id: p.service_id, date, time, address });
      setDone(true);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="aSC" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", padding:"40px 28px", textAlign:"center" }}>
      <div style={{ width:60, height:60, borderRadius:"50%", border:`1.5px solid ${t.text}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:32, color:t.text }}>{IC.check}</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:t.text, marginBottom:10 }}>Booking Confirmed</div>
      <div style={{ fontSize:14, color:t.textSub, lineHeight:1.7, marginBottom:44, maxWidth:260 }}>Your appointment with {p?.name} on {date} at {time} is confirmed.</div>
      <Btn label="Done" onPress={() => { onBack(); onBack(); onBack(); }} />
    </div>
  );

  return (
    <div className="aSI">
      <div style={{ padding:"24px 24px 0", display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <BackBtn onPress={step===1?onBack:()=>setStep(s=>s-1)} />
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, color:t.text }}>Book {p?.name}</div>
          <div style={{ fontSize:11, color:t.textSub, letterSpacing:"0.08em", textTransform:"uppercase", marginTop:2 }}>Step {step} of 3</div>
        </div>
      </div>
      <div style={{ margin:"0 24px 28px" }}>
        <div style={{ height:1, background:t.border }}><div style={{ height:"100%", background:t.text, width:`${(step/3)*100}%`, transition:"width .45s cubic-bezier(.4,0,.2,1)" }} /></div>
      </div>
      <div style={{ padding:"0 24px" }} className="aFI">
        {step===1 && <>
          <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:t.textSub, marginBottom:16 }}>Select a date</div>
          {DATES.map(d => <div key={d.value} className="tap" onClick={()=>setDate(d.value)} style={{ padding:"15px 18px", borderRadius:10, border:`1px solid ${date===d.value?t.borderStrong:t.border}`, background:date===d.value?t.surfaceHigh:t.surface, fontSize:14, fontWeight:date===d.value?500:400, color:date===d.value?t.text:t.textSub, transition:"all .18s", marginBottom:8 }}>{d.label}</div>)}
        </>}
        {step===2 && <>
          <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:t.textSub, marginBottom:16 }}>Select a time</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {TIMES.map(ti => <div key={ti} className="tap" onClick={()=>setTime(ti)} style={{ padding:"14px 0", textAlign:"center", borderRadius:10, border:`1px solid ${time===ti?t.borderStrong:t.border}`, background:time===ti?t.surfaceHigh:t.surface, fontSize:14, fontWeight:time===ti?500:400, color:time===ti?t.text:t.textSub, transition:"all .18s" }}>{ti}</div>)}
          </div>
        </>}
        {step===3 && <>
          <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:t.textSub, marginBottom:16 }}>Your location</div>
          <Inp placeholder="Enter your address" value={address} onChange={setAddress} />
          <div style={{ marginTop:24, background:t.surface, borderRadius:12, border:`1px solid ${t.border}`, overflow:"hidden" }}>
            <div style={{ padding:"12px 18px", borderBottom:`1px solid ${t.border}`, fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub }}>Summary</div>
            {[["Provider",p?.name],["Date",date],["Time",time],["Starting price",`Ksh ${parseFloat(p?.price||0).toLocaleString()}`]].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"13px 18px", borderBottom:`1px solid ${t.border}` }}>
                <span style={{ fontSize:12, color:t.textSub, letterSpacing:"0.06em", textTransform:"uppercase" }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:500, color:t.text }}>{v}</span>
              </div>
            ))}
          </div>
          {err && <div style={{ marginTop:14 }}><ErrMsg msg={err} /></div>}
        </>}
      </div>
      <div style={{ padding:"28px 24px" }}>
        <Btn label={step===3?"Confirm Booking":"Continue"} loading={loading} onPress={()=>step<3?setStep(s=>s+1):confirm()} disabled={(step===1&&!date)||(step===2&&!time)} />
      </div>
    </div>
  );
};

// ─── BOOKINGS TAB ─────────────────────────────────────────────────────────────
const BookingsTab = () => {
  const t = useTheme();
  const [filter, setFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.getBookings(filter === "all" ? null : filter).then(d => setBookings(d.bookings)).catch(()=>{}).finally(()=>setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const statusColor = { pending: t.textSub, confirmed: t.text, completed: t.textMuted, cancelled: "#CC5555" };

  return (
    <div style={{ padding:"36px 24px" }}>
      <div className="aFU" style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:300, color:t.text }}>Bookings</div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:28, overflowX:"auto" }}>
        {[["all","All"],["pending","Pending"],["confirmed","Confirmed"],["completed","Done"],["cancelled","Cancelled"]].map(([k, l]) => (
          <Chip key={k} label={l} active={filter===k} onClick={()=>setFilter(k)} />
        ))}
      </div>
      <Rule />
      {loading ? <SkeletonList /> : bookings.length === 0 ? (
        <div style={{ padding:"60px 0", textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:t.textSub, marginBottom:8 }}>No bookings yet</div>
          <div style={{ fontSize:13, color:t.textMuted }}>Your bookings will appear here.</div>
        </div>
      ) : bookings.map((b, i) => (
        <div key={b.id} className={`aFU d${Math.min(i+1,6)}`} style={{ background:t.surface, borderRadius:14, padding:"16px 18px", border:`1px solid ${t.border}`, marginBottom:10 }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <Av name={b.provider_name || b.client_name} size={44} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, color:t.text, marginBottom:3 }}>{b.provider_name || b.client_name}</div>
              <div style={{ fontSize:13, color:t.textSub }}>{b.service_name}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:400, color:t.text }}>Ksh {parseFloat(b.price||0).toLocaleString()}</div>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginTop:4, color:statusColor[b.status] }}>{b.status}</div>
            </div>
          </div>
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${t.border}`, fontSize:13, color:t.textSub }}>
            {new Date(b.date).toLocaleDateString("en-GB", { weekday:"short", year:"numeric", month:"short", day:"numeric" })} · {b.time?.slice(0,5)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── MESSAGES TAB ─────────────────────────────────────────────────────────────
const MessagesTab = ({ onNav }) => {
  const t = useTheme();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConversations().then(d => setConvos(d.conversations)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  return (
    <div style={{ padding:"36px 24px" }}>
      <div className="aFU" style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:300, color:t.text }}>Messages</div>
      </div>
      <Rule />
      {loading ? <SkeletonList count={2} /> : convos.length === 0 ? (
        <div style={{ padding:"60px 0", textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:t.textSub, marginBottom:8 }}>No messages yet</div>
          <div style={{ fontSize:13, color:t.textMuted }}>Conversations with providers will appear here.</div>
        </div>
      ) : convos.map((c, i) => (
        <div key={c.id} className={`aFU d${Math.min(i+1,6)} tap`} onClick={() => onNav("chat", c)}
          style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
          <div style={{ position:"relative" }}>
            <Av name={c.other_name} size={48} />
            {c.unread > 0 && <div style={{ position:"absolute", top:-2, right:-2, width:18, height:18, background:t.accent, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:t.accentText }}>{c.unread}</div>}
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>
            <div style={{ fontSize:15, fontWeight:600, color:t.text, marginBottom:3 }}>{c.other_name}</div>
            <div style={{ fontSize:13, color:t.textSub, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.last_message || "No messages yet"}</div>
          </div>
          <div style={{ fontSize:11, color:t.textMuted, flexShrink:0 }}>{c.last_at ? new Date(c.last_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""}</div>
        </div>
      ))}
    </div>
  );
};

const ChatScreen = ({ conversation, onBack }) => {
  const t = useTheme();
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef();
  const me = JSON.parse(localStorage.getItem("xervlink_user") || "{}");

  useEffect(() => {
    if (!conversation?.id) return;
    api.getMessages(conversation.id).then(d => { setMsgs(d.messages); setLoading(false); }).catch(()=>setLoading(false));
  }, [conversation?.id]);

  const send = async () => {
    if (!inp.trim() || sending) return;
    setSending(true);
    try {
      const { message } = await api.sendMessage(conversation.id, inp.trim());
      setMsgs(m => [...m, message]);
      setInp("");
      setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
    } catch(_) {}
    finally { setSending(false); }
  };

  return (
    <div className="aSI" style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"18px 20px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        <BackBtn onPress={onBack} />
        <Av name={conversation?.other_name} size={36} />
        <div>
          <div style={{ fontSize:15, fontWeight:500, color:t.text }}>{conversation?.other_name}</div>
          <div style={{ fontSize:11, color:t.textSub, marginTop:1 }}>Provider</div>
        </div>
      </div>
      <div style={{ flex:1, overflow:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:10 }}>
        {loading ? <div style={{ margin:"auto" }}><div className="skel" style={{ width:120, height:20 }} /></div>
        : msgs.length === 0 ? <div style={{ margin:"auto", fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, color:t.textSub }}>Start the conversation</div>
        : msgs.map(m => {
          const isMe = m.sender_id === me.id;
          return (
            <div key={m.id} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"75%", padding:"11px 15px", borderRadius:isMe?"14px 14px 3px 14px":"14px 14px 14px 3px", background:isMe?t.accent:t.surface, border:isMe?"none":`1px solid ${t.border}`, color:isMe?t.accentText:t.text, fontSize:14, lineHeight:1.5 }}>
                {m.body}
                <div style={{ fontSize:10, marginTop:5, opacity:.45, textAlign:"right" }}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div style={{ padding:"12px 16px 28px", borderTop:`1px solid ${t.border}`, display:"flex", gap:10, flexShrink:0 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", background:t.inputBg, borderRadius:24, border:`1px solid ${t.inputBorder}`, padding:"0 18px", height:48 }}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Message…" style={{ flex:1, background:"none", border:"none", outline:"none", color:t.text, fontSize:14 }} />
        </div>
        <div className="tap" onClick={send} style={{ width:48, height:48, borderRadius:"50%", background:t.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:t.accentText, opacity:sending?.5:1 }}>{IC.send}</div>
      </div>
    </div>
  );
};

// ─── PROFILE SUB-SCREENS ──────────────────────────────────────────────────────
const EditProfileScreen = ({ user, onBack, onUserUpdate }) => {
  const t = useTheme();
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [location, setLocation] = useState(user.location || "");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [saved, setSaved] = useState(false);

  const save = async () => {
    setLoading(true); setErr("");
    try {
      const { user: updated } = await api.updateProfile({ name, phone, location });
      localStorage.setItem("xervlink_user", JSON.stringify({ ...user, ...updated }));
      onUserUpdate({ ...user, ...updated });
      setSaved(true);
      setTimeout(() => { setSaved(false); onBack(); }, 1200);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="aSI">
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"24px" }}>
        <BackBtn onPress={onBack} />
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>Edit Profile</div>
      </div>
      <Rule />
      <div style={{ padding:"28px 24px", display:"flex", flexDirection:"column", gap:20 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
          <Av name={user.name} url={user.avatar_url} size={72} />
        </div>
        <Inp label="Full Name" placeholder="Your name" value={name} onChange={setName} />
        <Inp label="Phone Number" placeholder="+254 700 000 000" value={phone} onChange={setPhone} />
        <Inp label="Location" placeholder="Nairobi, Kenya" value={location} onChange={setLocation} />
        <ErrMsg msg={err} />
        {saved
          ? <div style={{ height:52, borderRadius:12, background:t.surfaceHigh, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", gap:10, color:t.textSub, fontSize:14 }}>{IC.check} Saved</div>
          : <Btn label="Save Changes" onPress={save} loading={loading} />
        }
      </div>
    </div>
  );
};

const NotificationsScreen = ({ onBack }) => {
  const t = useTheme();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getNotifPrefs().then(d => setPrefs(d.prefs)).catch(()=>{}); }, []);

  const toggle = async (key) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try { await api.updateNotifPrefs({ [key]: !prefs[key] }); } catch(_) {}
    finally { setSaving(false); }
  };

  const items = [["Booking Confirmed","When a booking is accepted","booking_confirmed"],["Booking Reminder","2 hours before your appointment","booking_reminder"],["New Messages","When a provider messages you","new_message"],["Provider Updates","Status changes from your providers","provider_updates"],["Promotions","Deals and offers from Xervlink","promotions"],["App Updates","New features and announcements","app_updates"]];

  return (
    <div className="aSI">
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"24px" }}>
        <BackBtn onPress={onBack} />
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>Notifications</div>
      </div>
      <Rule />
      <div style={{ padding:"20px 24px" }}>
        {!prefs ? <SkeletonList count={4} /> : items.map(([label, sub, key]) => (
          <SettingRow key={key} icon={IC.bell} label={label} sub={sub} onPress={()=>toggle(key)} right={<Toggle on={!!prefs[key]} onToggle={()=>toggle(key)} />} />
        ))}
      </div>
    </div>
  );
};

const PaymentScreen = ({ onBack }) => {
  const t = useTheme();
  const [prefs, setPrefs] = useState({ method:"cash", mpesa_phone:"" });
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");

  useEffect(() => { api.getPaymentPrefs().then(d => setPrefs(d.prefs)).catch(()=>{}); }, []);

  const save = async () => {
    setLoading(true); setErr("");
    try { await api.updatePaymentPrefs(prefs); onBack(); }
    catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="aSI">
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"24px" }}>
        <BackBtn onPress={onBack} />
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>Payment Methods</div>
      </div>
      <Rule />
      <div style={{ padding:"24px" }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:14 }}>Payment Options</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
          {[["mpesa","M-Pesa","Pay via Safaricom M-Pesa"],["cash","Cash","Pay the provider directly in cash"]].map(([id, l, sub]) => (
            <div key={id} className="tap" onClick={()=>setPrefs(p=>({...p,method:id}))} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:12, border:`1px solid ${prefs.method===id?t.borderStrong:t.border}`, background:prefs.method===id?t.surfaceHigh:t.surface, transition:"all .2s" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", border:`1.5px solid ${prefs.method===id?t.text:t.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {prefs.method===id && <div style={{ width:10, height:10, borderRadius:"50%", background:t.text }} />}
              </div>
              <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:500, color:t.text }}>{l}</div><div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>{sub}</div></div>
            </div>
          ))}
        </div>
        {prefs.method==="mpesa" && (
          <div className="aFU" style={{ marginBottom:24 }}>
            <Inp label="M-Pesa Number" placeholder="e.g. 0712 345 678" value={prefs.mpesa_phone||""} onChange={v=>setPrefs(p=>({...p,mpesa_phone:v}))} hint="Safaricom registered" />
            <div style={{ marginTop:10, padding:"12px 16px", background:t.surfaceHigh, borderRadius:10, border:`1px solid ${t.border}` }}>
              <div style={{ fontSize:12, color:t.textSub, lineHeight:1.6 }}>You will receive an M-Pesa STK push to confirm payment when booking. Standard M-Pesa rates apply.</div>
            </div>
          </div>
        )}
        {prefs.method==="cash" && (
          <div className="aFU" style={{ padding:"14px 16px", background:t.surfaceHigh, borderRadius:10, border:`1px solid ${t.border}`, marginBottom:24 }}>
            <div style={{ fontSize:12, color:t.textSub, lineHeight:1.6 }}>Agree on the amount with your provider before the appointment. Xervlink is not responsible for cash transactions.</div>
          </div>
        )}
        <ErrMsg msg={err} />
        <div style={{ marginTop:16 }}><Btn label="Save Payment Preference" onPress={save} loading={loading} /></div>
      </div>
    </div>
  );
};

const PrivacyScreen = ({ onBack }) => {
  const t = useTheme();
  const sections = [["Data Collection","Xervlink collects only the information necessary to provide our services: name, email address, phone number, and location when actively using the app. We do not sell your personal data to third parties."],["Data Storage & Security","All personal data is encrypted in transit using TLS 1.3 and at rest using AES-256. We maintain secure servers with regular audits. Access to your data is strictly limited to authorised personnel."],["Location Data","Location is used only to connect you with nearby providers. It is not stored beyond your active session unless you explicitly save an address. You may revoke location permissions at any time in your device settings."],["Payments","Xervlink does not store card or M-Pesa credentials. All payment processing is handled by regulated payment processors. We comply with PCI-DSS standards."],["Your Rights","You have the right to access, correct, or delete your personal data at any time. To submit a request, contact us at privacy@xervlink.com. We will respond within 30 days in accordance with applicable data protection law."],["Third-Party Services","We use limited third-party services (analytics, cloud hosting) that are GDPR-compliant. These services do not have access to personally identifiable information beyond what is strictly necessary."],["Children's Privacy","Xervlink is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us data, contact us immediately."],["Cookies & Tracking","We use minimal, essential cookies only — no advertising or cross-site tracking cookies. You may clear cookies at any time through your browser or device settings."],["Policy Changes","We will notify you of material changes to this policy by in-app notification and email at least 14 days before they take effect. Continued use constitutes acceptance."],["Contact","For all privacy-related enquiries: privacy@xervlink.com\nXervlink Ltd, Nairobi, Kenya."]];
  return (
    <div className="aSI">
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"24px" }}>
        <BackBtn onPress={onBack} />
        <div><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>Privacy & Security</div><div style={{ fontSize:11, color:t.textSub, marginTop:2 }}>Last updated: February 2026</div></div>
      </div>
      <Rule />
      <div style={{ padding:"24px 24px 60px", display:"flex", flexDirection:"column", gap:28 }}>
        {sections.map(([title, body], i) => (
          <div key={i}><div style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:8 }}>{title}</div><div style={{ fontSize:13, color:t.textSub, lineHeight:1.75, whiteSpace:"pre-line" }}>{body}</div></div>
        ))}
      </div>
    </div>
  );
};

const HelpScreen = ({ onBack }) => {
  const t = useTheme();
  const [open, setOpen] = useState(null);
  const faqs = [["How do I book a provider?","Browse services from the home screen, select a provider, and tap Book Now. Choose your date, time, and location to confirm."],["Can I cancel a booking?","Yes — cancellations are free up to 2 hours before your appointment. Navigate to Bookings, select the booking, and tap Cancel."],["How do I pay?","You can pay via M-Pesa or cash. Set your preferred method in Profile > Payment Methods."],["How are providers verified?","All verified providers have submitted government-issued ID and undergone a background review by the Xervlink team."],["What if I have a problem with a provider?","Contact our support team immediately. We take complaints seriously and will investigate within 24 hours."]];
  return (
    <div className="aSI">
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"24px" }}>
        <BackBtn onPress={onBack} />
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:t.text }}>Help & Support</div>
      </div>
      <Rule />
      <div style={{ padding:"24px" }}>
        <div style={{ padding:"20px", background:t.surface, borderRadius:14, border:`1px solid ${t.border}`, marginBottom:28 }}>
          <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:14 }}>Contact Support</div>
          <a href="tel:0117977749" style={{ display:"flex", alignItems:"center", gap:14, textDecoration:"none", marginBottom:14 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:t.surfaceHigh, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:t.textSub, flexShrink:0 }}>{IC.phone}</div>
            <div><div style={{ fontSize:14, fontWeight:500, color:t.text }}>Call or WhatsApp</div><div style={{ fontSize:13, color:t.textSub, marginTop:2 }}>0117 977 749</div></div>
          </a>
          <Rule style={{ marginBottom:14 }} />
          <a href="mailto:support@xervlink.com" style={{ display:"flex", alignItems:"center", gap:14, textDecoration:"none" }}>
            <div style={{ width:34, height:34, borderRadius:9, background:t.surfaceHigh, border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:t.textSub, flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div><div style={{ fontSize:14, fontWeight:500, color:t.text }}>Email</div><div style={{ fontSize:13, color:t.textSub, marginTop:2 }}>support@xervlink.com</div></div>
          </a>
        </div>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:14 }}>Frequently Asked</div>
        {faqs.map(([q, a], i) => (
          <div key={i} style={{ borderBottom:`1px solid ${t.border}` }}>
            <div className="tap" onClick={()=>setOpen(open===i?null:i)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0" }}>
              <span style={{ fontSize:14, color:t.text, flex:1, paddingRight:12 }}>{q}</span>
              <div style={{ color:t.textSub, transform:open===i?"rotate(90deg)":"none", transition:"transform .2s", flexShrink:0 }}>{IC.chevron}</div>
            </div>
            {open===i && <div className="aFU" style={{ fontSize:13, color:t.textSub, lineHeight:1.75, paddingBottom:16 }}>{a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
const ProfileTab = ({ user, onLogout, darkMode, setDarkMode, onNav }) => {
  const t = useTheme();
  return (
    <div style={{ padding:"36px 24px 100px" }}>
      <div className="aFU" style={{ display:"flex", alignItems:"center", gap:18, marginBottom:36 }}>
        <Av name={user.name} url={user.avatar_url} size={62} />
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, color:t.text }}>{user.name}</div>
          <div style={{ fontSize:13, color:t.textSub, marginTop:4 }}>{user.email}</div>
          <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:t.textMuted, marginTop:6 }}>{user.role}</div>
        </div>
      </div>
      <Rule style={{ marginBottom:4 }} />
      <SettingRow icon={IC.edit}   label="Edit Profile"         onPress={()=>onNav("editProfile")} />
      <SettingRow icon={IC.bell}   label="Notifications"        onPress={()=>onNav("notifications")} />
      <SettingRow icon={IC.card}   label="Payment Methods"      sub="M-Pesa · Cash" onPress={()=>onNav("payment")} />
      <SettingRow icon={IC.shield} label="Privacy & Security"   onPress={()=>onNav("privacy")} />
      <SettingRow icon={IC.help}   label="Help & Support"       onPress={()=>onNav("help")} />
      <SettingRow icon={darkMode?IC.sun:IC.moon} label={darkMode?"Light Mode":"Dark Mode"} onPress={()=>setDarkMode(!darkMode)} right={<Toggle on={darkMode} onToggle={()=>setDarkMode(!darkMode)} />} />
      <div style={{ marginTop:32 }}><Btn label="Sign Out" onPress={onLogout} variant="ghost" /></div>
      <div style={{ marginTop:28, textAlign:"center" }}><div style={{ fontSize:11, color:t.textMuted, letterSpacing:"0.06em" }}>Xervlink v1.0.0</div></div>
    </div>
  );
};

// ─── PROVIDER DASHBOARD ───────────────────────────────────────────────────────
const ProviderDashboard = ({ user, onNav }) => {
  const t = useTheme();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBookings().then(d => setBookings(d.bookings)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().slice(0,10);
  const todayJobs = bookings.filter(b => b.date?.slice(0,10) === todayStr && b.status !== "cancelled");
  const upcoming  = bookings.filter(b => b.date?.slice(0,10) > todayStr);
  const earnings  = bookings.filter(b => b.status === "completed").reduce((s, b) => s + parseFloat(b.price||0), 0);

  return (
    <div style={{ padding:"36px 24px 100px" }}>
      <div className="aFU" style={{ marginBottom:32 }}>
        <div style={{ fontSize:12, color:t.textSub, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Provider</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:t.text, lineHeight:1.2 }}>Good morning,<br /><em>{user.name.split(" ")[0]}</em></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:32 }}>
        {[[todayJobs.length,"Today"],[upcoming.length,"Upcoming"],[`Ksh ${earnings.toLocaleString()}`,"Earnings"],["—","Rating"]].map(([v, l]) => (
          <div key={l} style={{ background:t.surface, borderRadius:14, padding:"20px 18px", border:`1px solid ${t.border}` }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, color:t.text }}>{v}</div>
            <div style={{ fontSize:11, color:t.textSub, marginTop:6, letterSpacing:"0.04em" }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:14 }}>Today's Schedule</div>
      <Rule style={{ marginBottom:12 }} />
      {loading ? <SkeletonList count={2} /> : todayJobs.length === 0 ? (
        <div style={{ padding:"30px 0", textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, color:t.textSub }}>No bookings today</div>
        </div>
      ) : todayJobs.map((b, i) => (
        <div key={b.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
          <Av name={b.client_name} size={40} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{b.client_name}</div>
            <div style={{ fontSize:12, color:t.textSub }}>{b.service_name}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:14, fontWeight:500, color:t.text }}>{b.time?.slice(0,5)}</div>
            <div style={{ fontSize:11, color:t.textSub }}>Ksh {parseFloat(b.price||0).toLocaleString()}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:14 }}>Manage</div>
        {["Edit Services","Update Pricing","Manage Availability","View Reviews"].map(l => (
          <div key={l} className="tap" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0", borderBottom:`1px solid ${t.border}` }}>
            <span style={{ fontSize:14, color:t.text }}>{l}</span>
            <span style={{ color:t.textMuted }}>{IC.chevron}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const t = useTheme();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getAdminStats().then(d => setStats(d.stats)).catch(()=>{});
    api.getAdminUsers().then(d => setUsers(d.users)).catch(()=>{});
  }, []);

  return (
    <div style={{ padding:"36px 24px" }}>
      <div className="aFU" style={{ marginBottom:32 }}>
        <div style={{ fontSize:12, color:t.textSub, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Administration</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:t.text }}>Overview</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:32 }}>
        {[["Users",stats?.users],["Providers",stats?.providers],["Bookings",stats?.bookings],["Revenue",`Ksh ${(stats?.revenue||0).toLocaleString()}`]].map(([l, v]) => (
          <div key={l} style={{ background:t.surface, borderRadius:14, padding:"20px 18px", border:`1px solid ${t.border}` }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, color:t.text }}>{v ?? "—"}</div>
            <div style={{ fontSize:11, color:t.textSub, marginTop:6 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:t.textSub, marginBottom:14 }}>Recent Users</div>
      {users.slice(0,5).map(u => (
        <div key={u.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${t.border}` }}>
          <Av name={u.name} size={36} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:500, color:t.text }}>{u.name}</div>
            <div style={{ fontSize:11, color:t.textSub }}>{u.email}</div>
          </div>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:t.textMuted }}>{u.role}</div>
        </div>
      ))}
    </div>
  );
};

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const NavBar = ({ tab, setTab, role }) => {
  const t = useTheme();
  const userTabs = [{ id:"home",label:"Home",icon:IC.navHome },{ id:"bookings",label:"Bookings",icon:IC.navCal },{ id:"messages",label:"Messages",icon:IC.navMsg },{ id:"profile",label:"Profile",icon:IC.navUser }];
  const providerTabs = [{ id:"dashboard",label:"Dashboard",icon:IC.navGrid },{ id:"bookings",label:"Jobs",icon:IC.navCal },{ id:"messages",label:"Messages",icon:IC.navMsg },{ id:"profile",label:"Profile",icon:IC.navUser }];
  const tabs = role === "PROVIDER" ? providerTabs : userTabs;
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:t.navBg, borderTop:`1px solid ${t.border}`, display:"flex", zIndex:200, backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)", paddingBottom:"env(safe-area-inset-bottom, 6px)" }}>
      {tabs.map(tb => (
        <div key={tb.id} className="tap" onClick={()=>setTab(tb.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"12px 0 10px", gap:5, color:tab===tb.id?t.text:t.textMuted, transition:"color .2s" }}>
          {tb.icon}
          <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.05em" }}>{tb.label}</div>
          {tab===tb.id && <div style={{ width:3, height:3, borderRadius:"50%", background:t.text }} />}
        </div>
      ))}
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("xervlink_dark") !== "false");
  const t = darkMode ? DARK : LIGHT;

  const [splash, setSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [authScreen, setAuthScreen] = useState("login");
  const [tab, setTab] = useState("home");
  const [stack, setStack] = useState([]);

  useEffect(() => {
    localStorage.setItem("xervlink_dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem("xervlink_token");
    const cached = localStorage.getItem("xervlink_user");
    if (token && cached) {
      try { setUser(JSON.parse(cached)); } catch(_) {}
      // Verify token with backend
      api.me().then(d => {
        setUser(d.user);
        localStorage.setItem("xervlink_user", JSON.stringify(d.user));
      }).catch(() => {
        localStorage.removeItem("xervlink_token");
        localStorage.removeItem("xervlink_user");
        setUser(null);
      });
    }
    setTimeout(() => setSplash(false), 1100);
  }, []);

  const login = (u) => {
    localStorage.setItem("xervlink_user", JSON.stringify(u));
    setUser(u);
    setTab(u.role === "PROVIDER" ? "dashboard" : "home");
  };

  const logout = () => {
    localStorage.removeItem("xervlink_token");
    localStorage.removeItem("xervlink_user");
    setUser(null); setStack([]);
  };

  const updateUser = (u) => { setUser(u); localStorage.setItem("xervlink_user", JSON.stringify(u)); };

  const push = (name, data) => setStack(s => [...s, { name, data }]);
  const pop  = () => setStack(s => s.slice(0, -1));
  const cur  = stack[stack.length - 1];

  const renderOverlay = () => {
    if (!cur) return null;
    const { name, data } = cur;
    switch(name) {
      case "serviceList":   return <ServiceListScreen service={data} onBack={pop} onNav={push} />;
      case "provider":      return <ProviderProfile provider={data} onBack={pop} onNav={push} />;
      case "booking":       return <BookingScreen provider={data} onBack={pop} />;
      case "chat":          return <ChatScreen conversation={data} onBack={pop} />;
      case "editProfile":   return <EditProfileScreen user={user} onBack={pop} onUserUpdate={updateUser} />;
      case "notifications": return <NotificationsScreen onBack={pop} />;
      case "payment":       return <PaymentScreen onBack={pop} />;
      case "privacy":       return <PrivacyScreen onBack={pop} />;
      case "help":          return <HelpScreen onBack={pop} />;
      default: return null;
    }
  };

  const renderTab = () => {
    if (!user) return null;
    if (user.role === "ADMIN")    return tab === "profile" ? <ProfileTab user={user} onLogout={logout} darkMode={darkMode} setDarkMode={setDarkMode} onNav={push} /> : <AdminDashboard />;
    if (user.role === "PROVIDER") {
      if (tab === "dashboard") return <ProviderDashboard user={user} onNav={push} />;
      if (tab === "bookings")  return <BookingsTab />;
      if (tab === "messages")  return <MessagesTab onNav={push} />;
      return <ProfileTab user={user} onLogout={logout} darkMode={darkMode} setDarkMode={setDarkMode} onNav={push} />;
    }
    if (tab === "home")      return <HomeScreen user={user} onNav={push} />;
    if (tab === "bookings")  return <BookingsTab />;
    if (tab === "messages")  return <MessagesTab onNav={push} />;
    return <ProfileTab user={user} onLogout={logout} darkMode={darkMode} setDarkMode={setDarkMode} onNav={push} />;
  };

  return (
    <ThemeCtx.Provider value={t}>
      <GS t={t} />
      <div style={{ minHeight:"100vh", background:darkMode?"#060606":"#E8E6E0", display:"flex", justifyContent:"center", transition:"background .5s" }}>
        <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", background:t.bg, position:"relative", overflow:"hidden", boxShadow:t.shadow, transition:"background .4s" }}>

          {splash && <div style={{ height:"100vh" }}><Splash /></div>}

          {!splash && !user && (
            <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
              <div style={{ padding:"52px 28px 12px" }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, letterSpacing:"0.14em", textTransform:"uppercase", color:t.textSub }}>Xervlink</div>
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                {authScreen === "login" ? <AuthLogin onLogin={login} onGo={setAuthScreen} /> : <AuthRegister onLogin={login} onGo={setAuthScreen} />}
              </div>
            </div>
          )}

          {!splash && user && (
            <>
              <div style={{ height:"100vh", overflowY:"auto", paddingBottom:80 }}>{renderTab()}</div>
              {stack.map((_, i) => (
                <div key={i} style={{ position:"absolute", inset:0, background:t.bg, zIndex:10+i, overflowY:"auto" }}>
                  {i === stack.length - 1 && renderOverlay()}
                </div>
              ))}
              {stack.length === 0 && <NavBar tab={tab} setTab={id=>{ setTab(id); setStack([]); }} role={user?.role} />}
            </>
          )}

        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
