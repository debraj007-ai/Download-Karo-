import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, 
  Youtube, 
  Instagram, 
  Sparkles, 
  History, 
  User, 
  LogOut, 
  Check, 
  AlertCircle, 
  Clipboard, 
  ArrowRight, 
  Play, 
  CheckCircle,
  Clock,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  Smartphone,
  Video,
  Music,
  ShieldCheck,
  Zap,
  Lock,
  Globe,
  Sun,
  Moon
} from "lucide-react";
import { 
  auth, 
  signInWithGoogle, 
  getUserProfile, 
  upgradeToPremium, 
  saveDownloadRecord, 
  getDownloadHistory, 
  syncUserProfile 
} from "./firebase";
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { DownloadState, UserProfile, DownloadRecord } from "./types";

export default function App() {
  // Tab states
  const [activeTab, setActiveTab] = useState<"youtube" | "instagram">("youtube");
  
  // URL Input states
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  
  // Format configurations
  const [ytQuality, setYtQuality] = useState("720");
  const [isYtAudio, setIsYtAudio] = useState(false);
  const [igQuality, setIgQuality] = useState("720");
  const [isIgAudio, setIsIgAudio] = useState(false);

  // Authentication states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Premium / Demo Upgrader states
  const [confettiActive, setConfettiActive] = useState(false);

  // Light / Dark Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Download logic states
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    statusText: "",
    error: null,
    downloadUrl: null,
    title: null,
    platform: "unknown",
    quality: "720"
  });

  // History logs
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Auto monitor auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user state & load profile
        await syncUserProfile(currentUser);
        const userProf = await getUserProfile(currentUser.uid);
        setProfile(userProf as UserProfile);
        fetchHistory(currentUser.uid);
      } else {
        setProfile(null);
        setHistory([]);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch download history
  const fetchHistory = async (uid: string) => {
    setHistoryLoading(true);
    try {
      const records = await getDownloadHistory(uid);
      setHistory(records);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper to read clipboard link
  const handlePaste = async (tab: "youtube" | "instagram") => {
    try {
      const text = await navigator.clipboard.readText();
      if (tab === "youtube") {
        setYoutubeUrl(text);
      } else {
        setInstagramUrl(text);
      }
    } catch (err) {
      // Fallback if clipboard permission denied
      alert("Please paste the link manually. Alternatively, long-press/right-click to paste.");
    }
  };

  // Email login/signup
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (isSignUp) {
        if (!authName.trim()) {
          throw new Error("Please enter your name");
        }
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCred.user, { displayName: authName });
        await syncUserProfile(userCred.user, false);
        const prof = await getUserProfile(userCred.user.uid);
        setProfile(prof as UserProfile);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        const prof = await getUserProfile(userCred.user.uid);
        setProfile(prof as UserProfile);
      }
      setShowAuthModal(false);
      // Clean inputs
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Google sign in helper
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || "Google Sign-In failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out helper
  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Stream-piped download with real progress bar tracking!
  const triggerDownload = async (url: string, platform: "youtube" | "instagram") => {
    const isAudio = platform === "youtube" ? isYtAudio : isIgAudio;
    const selectedQuality = platform === "youtube" ? ytQuality : igQuality;

    // Premium checks
    // All premium limits removed! Website is 100% free for everyone.

    setDownloadState({
      isDownloading: true,
      progress: 0,
      statusText: "Analyzing video link and fetching server data...",
      error: null,
      downloadUrl: null,
      title: null,
      platform,
      quality: isAudio ? "audio" : selectedQuality
    });

    try {
     const response = await fetch("/api/download", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url,
    quality: selectedQuality,
    audioOnly: isAudio,
  }),
});

const data = await response.json();

if (!data.success) {
  throw new Error("Failed to start download.");
}

const id = data.id;
let completed = false;

while (!completed) {
  const progressRes = await fetch(`/api/progress/${id}`);

  if (progressRes.ok) {
    const progress = await progressRes.json();

    setDownloadState((prev) => ({
      ...prev,
      progress: progress.progress,
      statusText: progress.status,
    }));

    if (progress.progress >= 100) {
      completed = true;
    }
  }

  await new Promise((r) => setTimeout(r, 500));
}
// Download the completed file
const link = document.createElement("a");
link.href = `/api/file/${id}`;
link.download = "";
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
if (user) {
    if (user) {
  await saveDownloadRecord(
    user.uid,
    url,
    "",
    isAudio ? "audio.mp3" : "video.mp4",
    platform,
    isAudio ? "audio" : selectedQuality
);

    await fetchHistory(user.uid);
}

}
setDownloadState(prev => ({
    ...prev,
    isDownloading: false,
    progress: 100,
    statusText: "Download completed successfully!"
}));


    } catch (err: any) {
      console.error(err);
      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        error: err.message || "An unexpected network interruption occurred."
      }));
    }
  };

  // Demo bypass account login (super smooth guest experience)
  const handleQuickDemoMode = async () => {
    setAuthLoading(true);
    try {
      const demoEmail = "demo-premium@downloadkaro.com";
      const demoPass = "PremiumDemo123";
      
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      } catch (signInErr) {
        // Create it if it doesn't exist
        userCred = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        await updateProfile(userCred.user, { displayName: "Demo Guest" });
      }
      
      await syncUserProfile(userCred.user, true);
      
      const prof = await getUserProfile(userCred.user.uid);
      setProfile(prof as UserProfile);
      setShowAuthModal(false);
      
      // Trigger a nice success blast
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 4000);
    } catch (err: any) {
      setAuthError(err.message || "Failed to launch Demo mode.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen font-sans overflow-x-hidden transition-colors duration-300 ${
      theme === "light" ? "bg-[#f8fafc] text-slate-900" : "bg-[#090d16] text-slate-100"
    }`}>
      
      {/* Dynamic Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] animate-drift-slow transition-colors duration-500 ${
          theme === "light" ? "bg-red-500/5" : "bg-red-600/10"
        }`} />
        <div className={`absolute top-[40%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[130px] animate-drift-slower transition-colors duration-500 ${
          theme === "light" ? "bg-purple-500/5" : "bg-purple-600/10"
        }`} />
        <div className={`absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[100px] animate-drift-slow transition-colors duration-500 ${
          theme === "light" ? "bg-pink-500/3" : "bg-pink-500/5"
        }`} />
      </div>

      {/* Primary Header */}
      <header className={`relative z-10 border-b-2 transition-colors duration-300 backdrop-blur-md ${
        theme === "light" ? "border-slate-200 bg-white/80" : "border-b-2 border-white/10 bg-[#090d16]/85"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#db2777] border-2 transition-colors ${
              theme === "light" ? "bg-white border-slate-900" : "bg-[#090d16] border-white"
            }`}>
              <Download className="h-5 w-5 text-pink-500 animate-pulse" />
            </div>
            <div>
              <span className={`font-display font-black text-3xl sm:text-3.5xl tracking-tighter uppercase block leading-none ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}>
                Download <span className="text-pink-500">karo</span>
              </span>
              <div className={`text-[9px] font-mono font-black tracking-widest uppercase mt-0.5 ${
                theme === "light" ? "text-slate-600" : "text-slate-400"
              }`}>
                100% FREE RETRIEVAL ENGINE
              </div>
            </div>
          </div>

          {/* Header Action / Auth Profile info */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                theme === "light"
                  ? "bg-white border-slate-900 text-slate-800 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)]"
                  : "bg-[#0c101d] border-white/20 text-slate-300 hover:bg-slate-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)]"
              }`}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            {profile ? (
              <div className={`flex items-center gap-2 sm:gap-3 border-2 rounded-2xl py-1.5 pl-2.5 pr-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-colors ${
                theme === "light" ? "bg-white border-slate-300 text-slate-800" : "bg-[#0a0d17] border-white/20 text-slate-100"
              }`}>
                <div className="relative">
                  <img 
                    src={profile.photoURL} 
                    alt="user profile picture" 
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-lg border-2 border-pink-500 object-cover" 
                  />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold max-w-[120px] truncate">{profile.displayName}</div>
                  <div className={`text-[9px] font-mono uppercase tracking-wider ${
                    theme === "light" ? "text-slate-500" : "text-slate-400"
                  }`}>
                    Free Active User
                  </div>
                </div>

                <button 
                  onClick={handleSignOut}
                  title="Sign Out"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    theme === "light" ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className={`text-xs font-bold py-2.5 px-5 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border-2 ${
                  theme === "light"
                    ? "bg-slate-900 text-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.15)] hover:translate-y-[-1px] active:translate-y-[1px]"
                    : "bg-slate-800 text-white border-slate-600 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)] hover:translate-y-[-1px] active:translate-y-[1px]"
                }`}
              >
                <User className="h-4 w-4" />
                <span>Sign In / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 border-2 text-xs font-mono font-bold uppercase tracking-wider mb-6 transition-colors shadow-[3px_3px_0px_0px_rgba(219,39,119,0.2)] ${
              theme === "light" ? "border-pink-600 bg-white text-pink-600" : "border-pink-500 bg-[#090d16] text-pink-400"
            }`}>
              <Zap className="h-4 w-4 fill-pink-500 text-pink-500" /> Fully Responsive High-Res Downloader
            </span>
            <h1 className={`text-5xl sm:text-7.5xl font-display font-black tracking-tighter mb-5 leading-[0.95] uppercase transition-colors ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}>
              Get High Quality Videos in <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-amber-500">Seconds</span>
            </h1>
            <p className={`text-sm sm:text-base font-medium max-w-2xl mx-auto leading-relaxed transition-colors ${
              theme === "light" ? "text-slate-600" : "text-slate-400"
            }`}>
              Download high-definition videos from YouTube & Instagram. Paste your video links, configure format, and enjoy unlimited streaming speeds.
            </p>
          </motion.div>
        </div>

        {/* Floating Downloader Tabs switcher */}
        <div className="flex justify-center mb-12">
          <div className={`p-1.5 border-2 rounded-2xl flex gap-2 relative transition-colors ${
            theme === "light" 
              ? "bg-white border-slate-300 shadow-[6px_6px_0px_0px_rgba(15,23,42,0.05)]" 
              : "bg-[#020617] border-white/20 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)]"
          }`}>
            
            {/* YouTube button */}
            <button 
              onClick={() => setActiveTab("youtube")}
              className={`relative py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 z-10 cursor-pointer border-2 ${
                activeTab === "youtube" 
                  ? theme === "light"
                    ? "bg-red-600 border-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                    : "bg-red-600 border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                  : theme === "light"
                    ? "border-transparent text-slate-500 hover:text-slate-900"
                    : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Youtube className="h-4 w-4" />
              <span>YouTube Channel</span>
            </button>

            {/* Instagram button */}
            <button 
              onClick={() => setActiveTab("instagram")}
              className={`relative py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 z-10 cursor-pointer border-2 ${
                activeTab === "instagram" 
                  ? theme === "light"
                    ? "bg-pink-600 border-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                    : "bg-pink-600 border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                  : theme === "light"
                    ? "border-transparent text-slate-500 hover:text-slate-900"
                    : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Instagram className="h-4 w-4" />
              <span>Instagram Feed</span>
            </button>

          </div>
        </div>

        {/* Dynamic Downloader Panel with AnimatePresence */}
        <div className="mb-12">
          <AnimatePresence mode="wait">
            
            {/* YouTube Section */}
            {activeTab === "youtube" ? (
              <motion.div
                key="youtube-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.3 }}
                className={`rounded-3xl p-6 sm:p-8 relative overflow-hidden border-3 transition-colors duration-300 ${
                  theme === "light"
                    ? "bg-white border-red-500 shadow-[8px_8px_0px_0px_#7f1d1d]"
                    : "bg-[#0f1322] border-red-400 shadow-[8px_8px_0px_0px_#dc2626]"
                }`}
              >
                {/* Visual red glow block inside card */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-2.5 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-400">
                    <Youtube className="h-5 w-5" />
                  </div>
                  <h2 className={`text-xl sm:text-2xl font-display font-black uppercase tracking-tight transition-colors ${
                    theme === "light" ? "text-slate-900" : "text-white"
                  }`}>YouTube HD Downloader</h2>
                </div>

                <div className="space-y-6">
                  {/* URL input field */}
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Paste YouTube Link (e.g., https://youtube.com/watch?v=... or shorts)"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className={`w-full border-2 rounded-xl py-4 pl-4 pr-32 text-xs font-mono font-bold transition-all shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.8)] focus:outline-none focus:ring-0 ${
                        theme === "light"
                          ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-red-500"
                          : "bg-[#030712] border-white/10 text-slate-100 placeholder-slate-600 focus:border-red-500"
                      }`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button 
                        onClick={() => handlePaste("youtube")}
                        type="button"
                        title="Paste from clipboard"
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          theme === "light" ? "text-slate-500 hover:text-slate-900 bg-slate-200/50 hover:bg-slate-200" : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <Clipboard className="h-4 w-4" />
                      </button>
                      {youtubeUrl && (
                        <button 
                          onClick={() => setYoutubeUrl("")}
                          type="button"
                          className={`text-xs font-bold uppercase px-2 py-1 ${
                            theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Format & settings layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Quality config */}
                    <div className={`p-4 border-2 rounded-2xl transition-colors ${
                      theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
                    }`}>
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-3 ${
                        theme === "light" ? "text-red-600" : "text-red-400"
                      }`}>Download Quality</div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "360", label: "360p", desc: "SD" },
                          { value: "720", label: "720p", desc: "HD" },
                          { value: "1080", label: "1080p", desc: "Full HD" },
                          { value: "1440", label: "1440p", desc: "2K" },
                          { value: "2160", label: "4K UHD" },
                        ].map((q) => {
                          return (
                            <button
                              key={q.value}
                              onClick={() => {
                                setIsYtAudio(false);
                                setYtQuality(q.value);
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-tighter flex flex-col items-center justify-center transition-all border-2 cursor-pointer ${
                                ytQuality === q.value && !isYtAudio
                                  ? theme === "light"
                                    ? "bg-red-600 border-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                                    : "bg-red-600 border-white text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                  : theme === "light"
                                    ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                    : "bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                {q.label}
                              </span>
                              <span className="text-[8px] font-mono tracking-normal font-normal opacity-60 mt-0.5">{q.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mode (Video vs Audio Only) */}
                    <div className={`p-4 border-2 rounded-2xl flex flex-col justify-between transition-colors ${
                      theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
                    }`}>
                      <div>
                        <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${
                          theme === "light" ? "text-red-600" : "text-red-400"
                        }`}>Media Output Format</div>
                        <p className={`text-[11px] mb-4 font-medium leading-tight transition-colors ${
                          theme === "light" ? "text-slate-600" : "text-slate-500"
                        }`}>Choose whether to extract high-fidelity MP3 music tracks or grab the full video.</p>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setIsYtAudio(false)}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-2 cursor-pointer ${
                            !isYtAudio 
                              ? theme === "light"
                                ? "bg-red-600 border-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                                : "bg-red-600 border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                              : theme === "light"
                                ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                : "bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-900"
                          }`}
                        >
                          <Video className="h-4.5 w-4.5" />
                          <span>Video (.mp4)</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsYtAudio(true);
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-2 cursor-pointer ${
                            isYtAudio 
                              ? theme === "light"
                                ? "bg-amber-500 border-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                                : "bg-amber-500 border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                              : theme === "light"
                                ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                : "bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-900"
                          }`}
                        >
                          <Music className="h-4.5 w-4.5" />
                          <span className="flex items-center gap-1">
                            Audio (.mp3)
                          </span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Primary Trigger Button */}
                  <button
                    onClick={() => triggerDownload(youtubeUrl, "youtube")}
                    disabled={downloadState.isDownloading || !youtubeUrl.trim()}
                    className={`w-full py-4.5 px-6 rounded-2xl font-display font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer border-2 ${
                      theme === "light"
                        ? "bg-red-600 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                        : "bg-red-600 text-white border-white shadow-[4px_4px_0px_0px_#ffffff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#ffffff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#ffffff]"
                    }`}
                  >
                    {downloadState.isDownloading ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Processing Stream Buffer...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        <span>Start Blazing Fast Free Download</span>
                      </>
                    )}
                  </button>

                </div>
              </motion.div>
            ) : (
              
              /* Instagram Section */
            <motion.div
              key="instagram-tab"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.3 }}
              className={`rounded-3xl p-6 sm:p-8 relative overflow-hidden border-3 transition-colors duration-300 ${
                theme === "light"
                  ? "bg-white border-pink-500 shadow-[8px_8px_0px_0px_#701a75]"
                  : "bg-[#0f1322] border-pink-400 shadow-[8px_8px_0px_0px_#db2777]"
              }`}
            >
              {/* Visual purple glow block inside card */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2.5 mb-6">
                <div className="h-10 w-10 rounded-xl bg-pink-600/20 border-2 border-pink-500 flex items-center justify-center text-pink-400">
                  <Instagram className="h-5 w-5" />
                </div>
                <h2 className={`text-xl sm:text-2xl font-display font-black uppercase tracking-tight transition-colors ${
                  theme === "light" ? "text-slate-900" : "text-white"
                }`}>Instagram Reels Downloader</h2>
              </div>

              <div className="space-y-6">
                {/* URL input field */}
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Paste Instagram Reel / Video link (e.g., https://instagram.com/reel/...)"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className={`w-full border-2 rounded-xl py-4 pl-4 pr-32 text-xs font-mono font-bold transition-all shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.8)] focus:outline-none focus:ring-0 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-pink-500"
                        : "bg-[#030712] border-white/10 text-slate-100 placeholder-slate-600 focus:border-pink-500"
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <button 
                      onClick={() => handlePaste("instagram")}
                      type="button"
                      title="Paste from clipboard"
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        theme === "light" ? "text-slate-500 hover:text-slate-900 bg-slate-200/50 hover:bg-slate-200" : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                    {instagramUrl && (
                      <button 
                        onClick={() => setInstagramUrl("")}
                        type="button"
                        className={`text-xs font-bold uppercase px-2 py-1 ${
                          theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Format & settings layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Quality config */}
                  <div className={`p-4 border-2 rounded-2xl transition-colors ${
                    theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
                  }`}>
                    <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-3 ${
                      theme === "light" ? "text-pink-600" : "text-pink-400"
                    }`}>Download Quality</div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "480", label: "480p", desc: "SD" },
                        { value: "720", label: "720p", desc: "HD" },
                        { value: "1080", label: "1080p", desc: "Full HD" },
                      ].map((q) => {
                        return (
                          <button
                            key={q.value}
                            onClick={() => {
                              setIsIgAudio(false);
                              setIgQuality(q.value);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-tighter flex flex-col items-center justify-center transition-all border-2 cursor-pointer ${
                              igQuality === q.value && !isIgAudio
                                ? theme === "light"
                                  ? "bg-pink-600 border-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                                  : "bg-pink-600 border-white text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                : theme === "light"
                                  ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  : "bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {q.label}
                            </span>
                            <span className="text-[8px] font-mono tracking-normal font-normal opacity-60 mt-0.5">{q.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mode (Video vs Audio Only) */}
                  <div className={`p-4 border-2 rounded-2xl flex flex-col justify-between transition-colors ${
                    theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
                  }`}>
                    <div>
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${
                        theme === "light" ? "text-pink-600" : "text-pink-400"
                      }`}>Media Output Format</div>
                      <p className={`text-[11px] mb-4 font-medium leading-tight transition-colors ${
                        theme === "light" ? "text-slate-600" : "text-slate-500"
                      }`}>Extract the background music or save the entire IG Reel file.</p>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setIsIgAudio(false)}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-2 cursor-pointer ${
                          !isIgAudio 
                            ? theme === "light"
                              ? "bg-pink-600 border-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                              : "bg-pink-600 border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                            : theme === "light"
                              ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                              : "bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <Video className="h-4.5 w-4.5" />
                        <span>Video (.mp4)</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsIgAudio(true);
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-2 cursor-pointer ${
                          isIgAudio 
                            ? theme === "light"
                              ? "bg-amber-500 border-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                              : "bg-amber-500 border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                            : theme === "light"
                              ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                              : "bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <Music className="h-4.5 w-4.5" />
                        <span className="flex items-center gap-1">
                          Audio (.mp3)
                        </span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Primary Trigger Button */}
                <button
                  onClick={() => triggerDownload(instagramUrl, "instagram")}
                  disabled={downloadState.isDownloading || !instagramUrl.trim()}
                  className={`w-full py-4.5 px-6 rounded-2xl font-display font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer border-2 ${
                    theme === "light"
                      ? "bg-pink-600 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      : "bg-pink-600 text-white border-white shadow-[4px_4px_0px_0px_#ffffff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#ffffff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#ffffff]"
                  }`}
                >
                  {downloadState.isDownloading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Fetching Media Buffers...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      <span>Start Blazing Fast Free Download</span>
                    </>
                  )}
                </button>

              </div>
            </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Downloader Real-time Progress Bar Component */}
        <AnimatePresence>
          {downloadState.isDownloading || downloadState.error || downloadState.downloadUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`p-6 rounded-3xl border-3 relative overflow-hidden mb-12 ${
                theme === "light"
                  ? downloadState.platform === "youtube"
                    ? "bg-white border-red-500 shadow-[8px_8px_0px_0px_#7f1d1d]"
                    : downloadState.platform === "instagram"
                    ? "bg-white border-pink-500 shadow-[8px_8px_0px_0px_#701a75]"
                    : "bg-white border-slate-300 shadow-[6px_6px_0px_0px_#1e293b]"
                  : downloadState.platform === "youtube" 
                    ? "bg-[#0f1322] border-red-400 shadow-[8px_8px_0px_0px_#dc2626]" 
                    : downloadState.platform === "instagram"
                    ? "bg-[#131022] border-pink-400 shadow-[8px_8px_0px_0px_#db2777]"
                    : "bg-[#0d1220] border-slate-400 shadow-[6px_6px_0px_0px_#334155]"
              }`}
            >
              {/* Internal abstract visual border lines */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 via-pink-500 to-amber-500" />

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                {/* Media Details */}
                <div className="flex-1">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 border-2 rounded-lg text-[10px] font-mono uppercase tracking-widest font-black mb-3 ${
                    downloadState.platform === "youtube" 
                      ? "border-red-500/30 bg-red-950/40 text-red-400" 
                      : "border-pink-500/30 bg-pink-950/40 text-pink-400"
                  }`}>
                    {downloadState.platform === "youtube" ? <Youtube className="h-3.5 w-3.5" /> : <Instagram className="h-3.5 w-3.5" />}
                    <span>{downloadState.platform} • {downloadState.quality}</span>
                  </span>
                  
                  <h3 className={`text-base sm:text-lg font-display font-black max-w-xl truncate uppercase tracking-tight ${
                    theme === "light" ? "text-slate-900" : "text-white"
                  }`}>
                    {downloadState.title || "Processing Media Stream..."}
                  </h3>
                  
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    {downloadState.error ? (
                      <span className="text-red-400 flex items-center gap-1.5 font-bold uppercase font-mono">
                        <AlertCircle className="h-4 w-4" />
                        Error: {downloadState.error}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-bold uppercase font-mono tracking-wider">
                        Status: <span className="text-pink-400">{downloadState.statusText}</span>
                      </span>
                    )}
                  </p>
                </div>

                {/* Progress bar container */}
                {downloadState.isDownloading && (
                  <div className="w-full md:w-64 flex flex-col items-end gap-1.5">
                    <span className="text-xs font-mono font-black text-pink-500 tracking-wider">{downloadState.progress}% COMPLETE</span>
                    <div className={`w-full h-3.5 border-2 rounded-lg overflow-hidden relative ${
                      theme === "light" ? "bg-slate-100 border-slate-300" : "bg-slate-950 border-white/20"
                    }`}>
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${downloadState.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Fallback & Download trigger links */}
                {downloadState.downloadUrl && !downloadState.isDownloading && (
                  <div className="flex items-center gap-3">
                    <a 
                      href={downloadState.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-2 ${
                        theme === "light"
                          ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)]"
                          : "bg-white text-slate-900 border-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                      }`}
                    >
                      <span>Direct CDN Link</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    
                    <button
                      onClick={() => setDownloadState(prev => ({ ...prev, downloadUrl: null }))}
                      className={`p-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                        theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
              title: "100% Safe & Clean",
              desc: "No aggressive popups, trackers, or hidden system scripts. Clean download pipelines."
            },
            {
              icon: <Zap className="h-5 w-5 text-amber-400" />,
              title: "Lightning Speed Tunneling",
              desc: "Downloads are proxy-streamed to bypass ISP blocks and speed throttles."
            },
            {
              icon: <Globe className="h-5 w-5 text-indigo-400" />,
              title: "Universal Link Handling",
              desc: "Supports YouTube shorts, standard videos, Instagram stories, reels, and posts."
            }
          ].map((item, i) => (
            <div key={i} className={`p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
              theme === "light"
                ? "bg-white border-slate-200 hover:border-pink-500 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.05)] hover:shadow-[4px_4px_0px_0px_rgba(219,39,119,0.2)]"
                : "bg-[#0d1220] border-white/10 hover:border-pink-500/50 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] hover:shadow-[4px_4px_0px_0px_rgba(219,39,119,0.2)]"
            }`}>
              <div className={`h-10 w-10 border-2 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/20"
              }`}>
                {item.icon}
              </div>
              <div>
                <h4 className={`text-xs font-mono font-black uppercase tracking-wider transition-colors ${
                  theme === "light" ? "text-slate-900" : "text-white"
                }`}>{item.title}</h4>
                <p className={`text-xs mt-1.5 leading-relaxed font-medium transition-colors ${
                  theme === "light" ? "text-slate-600" : "text-slate-400"
                }`}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* User Download History Logs Panel (Only shown if logged in) */}
        {profile && (
          <div className="p-6 bg-[#0c101e] rounded-3xl border-2 border-white/20 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <History className="h-5 w-5 text-pink-500" />
                <h3 className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight">Your Download History Logs</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Synced with Cloud Storage</span>
            </div>

            {historyLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-pink-500 border-t-transparent rounded-full" />
                <span className="font-mono font-bold uppercase">Syncing records...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border-2 border-dashed border-white/10 rounded-2xl font-medium">
                <span>No downloads recorded yet. Start downloading to build your custom history logs!</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {history.map((record) => (
                  <div key={record.id} className="p-3 bg-slate-950/60 border-2 border-white/5 hover:border-pink-500/30 rounded-xl transition-all flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 truncate">
                      <div className={`h-9 w-9 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
                        record.platform === "youtube" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-pink-500/10 border-pink-500/30 text-pink-400"
                      }`}>
                        {record.platform === "youtube" ? <Youtube className="h-4.5 w-4.5" /> : <Instagram className="h-4.5 w-4.5" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-100 truncate max-w-[280px] sm:max-w-md uppercase tracking-wide">{record.title}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                          <span className="font-black text-pink-400 uppercase">{record.quality}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(record.downloadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (record.platform === "youtube") {
                            setYoutubeUrl(record.url);
                            setActiveTab("youtube");
                          } else {
                            setInstagramUrl(record.url);
                            setActiveTab("instagram");
                          }
                        }}
                        className="py-1.5 px-3 border border-white/10 hover:border-white/40 text-slate-300 hover:text-white bg-white/5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                      >
                        Reuse URL
                      </button>
                      <a
                        href={record.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-pink-500/40 text-pink-400 hover:text-white hover:bg-pink-600 rounded-lg transition-all cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modern landing page Footer */}
      <footer className={`relative z-10 border-t-2 mt-24 py-16 transition-colors duration-300 ${
        theme === "light" ? "border-slate-200 bg-white" : "border-white/10 bg-[#070b13]"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            
            {/* Branding Column */}
            <div className="space-y-4">
              <span className={`font-display font-black text-2xl uppercase tracking-tighter ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}>
                Download <span className="text-pink-500">karo</span>
              </span>
              <p className={`text-xs leading-relaxed max-w-xs font-medium ${
                theme === "light" ? "text-slate-600" : "text-slate-400"
              }`}>
                Next-generation private video retrieval engine engineered with blazing fast streaming buffers. 100% free and open for everyone.
              </p>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="text-xs font-mono font-black text-pink-500 uppercase tracking-widest mb-4">Supported Media Channels</h4>
              <ul className={`space-y-2 text-xs font-medium ${
                theme === "light" ? "text-slate-600" : "text-slate-400"
              }`}>
                <li className="flex items-center gap-2 hover:text-slate-800 cursor-pointer">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                  YouTube Video & Shorts downloads (Up to 4K UHD)
                </li>
                <li className="flex items-center gap-2 hover:text-slate-800 cursor-pointer">
                  <span className="h-1.5 w-1.5 bg-pink-500 rounded-full" />
                  Instagram Reels, Posts & Carousel galleries
                </li>
                <li className="flex items-center gap-2 hover:text-slate-800 cursor-pointer">
                  <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                  Extract CD-quality MP3 audio files
                </li>
              </ul>
            </div>

            {/* Developer connection widget (Crucial credits requested!) */}
            <div className={`p-5 border-2 rounded-2xl space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.02)] transition-colors ${
              theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#0a0d17] border-white/10"
            }`}>
              <div className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Creator Credentials</div>
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-pink-500 rounded-full bg-slate-950 flex items-center justify-center font-display font-black text-sm text-pink-400">
                  DP
                </div>
                <div>
                  <h4 className={`text-sm font-display font-black uppercase tracking-tight ${
                    theme === "light" ? "text-slate-900" : "text-white"
                  }`}>Debraj Pathak</h4>
                  <p className="text-[10px] font-mono font-bold text-indigo-500 uppercase">CSE 4th Year Student</p>
                  <p className="text-[9px] font-mono text-slate-400 uppercase">Chandigarh University</p>
                </div>
              </div>

              <div className="flex gap-2">
                <a 
                  href="https://www.linkedin.com/in/debraj-pathak-07038628a?utm_source=share_via&utm_content=profile&utm_medium=member_android" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 border-2 border-indigo-500 rounded-lg text-xs font-black uppercase tracking-wider bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(99,102,241,0.2)]"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  <span>LinkedIn Profile</span>
                </a>
                
                <a 
                  href="mailto:debrajpathak12@gmail.com"
                  className={`p-2 border-2 rounded-lg transition-all ${
                    theme === "light" ? "text-slate-500 border-slate-200 bg-white hover:text-slate-900" : "text-slate-400 border-white/10 bg-slate-950 hover:text-white"
                  }`}
                  title="Contact Developer via Email"
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-200/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-slate-500">
            <div>
              © {new Date().getFullYear()} Download karo. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL (Login / Signup) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal Overlay backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10"
            >
              
              {/* Header */}
              <div className="text-center mb-6">
                <span className="font-display font-bold text-2xl tracking-tight text-white block mb-1">
                  Download <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">karo</span> Account
                </span>
                <p className="text-xs text-slate-400">
                  {isSignUp ? "Create an account to save download history & upgrade" : "Sign in to access your premium configuration"}
                </p>
              </div>

              {/* Quick Demo Bypass Banner */}
              <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl mb-5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                  <Sparkles className="h-3.5 w-3.5 fill-yellow-400" />
                  <span>Instant Premium Review Tool</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Want to review premium downloading immediately without using an email? Try our one-click demo guest accounts!
                </p>
                <button
                  type="button"
                  onClick={handleQuickDemoMode}
                  disabled={authLoading}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {authLoading ? (
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                      <span>Launch One-Click Demo Mode</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error box */}
              {authError && (
                <div className="p-3 bg-red-600/10 border border-red-600/20 rounded-xl text-xs text-red-400 flex items-start gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Native credential form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name</label>
                    <input 
                      type="text"
                      placeholder="Jane Doe"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input 
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl font-display font-bold text-xs text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {authLoading ? "Verifying..." : isSignUp ? "Sign Up Free" : "Sign In Account"}
                </button>
              </form>

              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-mono text-slate-500 uppercase">Or Continue With</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Third-Party Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {/* Custom generic Google logo badge */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.414 0-6.19-2.776-6.19-6.19 0-3.414 2.776-6.19 6.19-6.19 1.442 0 2.767.494 3.826 1.319l3.13-3.13C18.995 2.181 15.823 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c6.76 0 11.76-4.76 11.76-11.76 0-.64-.08-1.24-.19-1.84l-11.57-.11z" />
                </svg>
                <span>Google Account Popup</span>
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-pink-500 hover:text-pink-400 font-semibold cursor-pointer"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
