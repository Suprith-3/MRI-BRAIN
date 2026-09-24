import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, AlertTriangle, CheckCircle2, 
  Activity, ShieldAlert, FileDown, History, User, 
  BrainCircuit, ArrowRight, RefreshCw, Info, ChevronRight, Check,
  Sparkles, Play, Pause, Zap, Eye, BarChart3, ShieldCheck, Microscope,
  Layers, Stethoscope, Compass, LogIn, UserPlus, LogOut, Edit3, Save, X, Lock, Mail, Building
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { uploadAndAnalyzeMRI, fetchAnalysisHistory, getReportDownloadUrl, downloadReportFile, setAuthToken, AnalysisResult } from './services/api';
import { supabase, getStoredUser, saveStoredUser, clearStoredUser, UserProfile } from './services/supabaseClient';
import logoImg from './assets/logo.png';

type TabType = 'dashboard' | 'analyze' | 'history' | 'profile' | 'about';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // User State
  const [user, setUser] = useState<UserProfile>(() => getStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Form states for Registration & Login
  const [regTitle, setRegTitle] = useState('Dr.');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regInstitution, setRegInstitution] = useState('');

  // Editable profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user.firstName);
  const [editLastName, setEditLastName] = useState(user.lastName);
  const [editTitle, setEditTitle] = useState(user.title || 'Dr.');
  const [editInstitution, setEditInstitution] = useState(user.institution || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const analysisSteps = [
    { title: "Secure Ingestion", desc: "Verifying binary signature, headers & MIME integrity...", icon: Upload },
    { title: "Image Preprocessing", desc: "Standardizing pixel tensor to 224x224 RGB normalized matrix...", icon: Microscope },
    { title: "Deep Neural Inference", desc: "Evaluating activation maps across 4 intracranial categories...", icon: BrainCircuit },
    { title: "Groq Educational Synthesis", desc: "Constructing rigorous structured medical breakdown...", icon: Sparkles },
    { title: "ReportLab Document Engine", desc: "Compiling vector PDF with diagnostic distribution metrics...", icon: FileDown }
  ];

  useEffect(() => {
    if (user.token) {
      setAuthToken(user.token);
    }
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditTitle(user.title || 'Dr.');
    setEditInstitution(user.institution || '');
  }, [user]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      const data = await fetchAnalysisHistory();
      if (data.records) setHistoryList(data.records);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthError('Please fill in all required fields (Name, Email, Password).');
      setAuthLoading(false);
      return;
    }

    try {
      let createdId = `user-${Date.now()}`;
      let token = 'demo-researcher-token';

      if (supabase) {
        try {
          const { data, error: supError } = await supabase.auth.signUp({
            email: regEmail.trim(),
            password: regPassword,
            options: {
              data: {
                first_name: regFirstName.trim(),
                last_name: regLastName.trim(),
                title: regTitle,
                institution: regInstitution.trim()
              }
            }
          });
          if (supError && !supError.message.includes('already registered')) {
            console.warn('Supabase sign up notice:', supError.message);
          } else if (data?.user) {
            createdId = data.user.id;
            token = data.session?.access_token || token;
          }
        } catch (supErr) {
          console.warn('Supabase network signup fallback:', supErr);
        }
      }

      const newUser: UserProfile = {
        id: createdId,
        email: regEmail.trim(),
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        title: regTitle,
        institution: regInstitution.trim() || 'Clinical Neuro-Oncology Department',
        token: token
      };

      setUser(newUser);
      saveStoredUser(newUser);
      setAuthToken(token);
      setAuthSuccessMsg(`Registration complete! Welcome, ${newUser.title} ${newUser.firstName} ${newUser.lastName}!`);

      setTimeout(() => {
        setAuthModalOpen(false);
        setAuthSuccessMsg(null);
      }, 1200);

    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!regEmail.trim() || !regPassword.trim()) {
      setAuthError('Please enter your email and password.');
      setAuthLoading(false);
      return;
    }

    try {
      let loggedUser: UserProfile = {
        ...user,
        email: regEmail.trim()
      };

      if (supabase) {
        try {
          const { data, error: supErr } = await supabase.auth.signInWithPassword({
            email: regEmail.trim(),
            password: regPassword
          });
          if (data?.user) {
            const meta = data.user.user_metadata || {};
            loggedUser = {
              id: data.user.id,
              email: data.user.email || regEmail.trim(),
              firstName: meta.first_name || user.firstName,
              lastName: meta.last_name || user.lastName,
              title: meta.title || user.title || 'Dr.',
              institution: meta.institution || user.institution,
              token: data.session?.access_token
            };
          }
        } catch (supErr) {
          console.warn('Supabase login notice:', supErr);
        }
      }

      setUser(loggedUser);
      saveStoredUser(loggedUser);
      if (loggedUser.token) setAuthToken(loggedUser.token);
      setAuthSuccessMsg(`Welcome back, ${loggedUser.title} ${loggedUser.firstName} ${loggedUser.lastName}!`);

      setTimeout(() => {
        setAuthModalOpen(false);
        setAuthSuccessMsg(null);
      }, 1000);

    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = () => {
    const updated: UserProfile = {
      ...user,
      firstName: editFirstName.trim() || user.firstName,
      lastName: editLastName.trim() || user.lastName,
      title: editTitle,
      institution: editInstitution.trim() || user.institution
    };
    setUser(updated);
    saveStoredUser(updated);
    setIsEditingProfile(false);
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 3000);
  };

  const handleLogout = () => {
    clearStoredUser();
    const guestUser: UserProfile = {
      id: 'guest-' + Date.now(),
      email: 'guest@neuroscan.ai',
      firstName: 'Guest',
      lastName: 'Researcher',
      title: 'Dr.',
      institution: 'NeuroScan Research Institute'
    };
    setUser(guestUser);
    saveStoredUser(guestUser);
    setActiveTab('dashboard');
  };

  const handleFileChange = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, JPEG, PNG).');
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds 15MB limit.');
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setCurrentStepIndex(0);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 700);

    try {
      const res = await uploadAndAnalyzeMRI(file);
      clearInterval(stepInterval);
      setResult(res);
      setActiveTab('analyze');
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Analysis failed. Make sure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.prediction?.probabilities ? [
    { name: 'Glioma', value: Math.round(result.prediction.probabilities.Glioma * 100), color: '#f43f5e' },
    { name: 'Meningioma', value: Math.round(result.prediction.probabilities.Meningioma * 100), color: '#f59e0b' },
    { name: 'Pituitary', value: Math.round(result.prediction.probabilities.Pituitary * 100), color: '#a855f7' },
    { name: 'No Tumor', value: Math.round(result.prediction.probabilities.None * 100), color: '#10b981' },
  ] : [];

  const fullName = `${user.title || ''} ${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* Background Video Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-25 scale-105 filter blur-[1px]"
        >
          <source src="/background.mp4" type="video/mp4" />
          <source src="http://localhost:5000/api/video/background" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/30 via-transparent to-purple-950/30" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      {/* Ambient Glowing Orbs */}
      <div className="fixed top-1/4 left-10 w-96 h-96 bg-cyan-500/15 rounded-full filter blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-1/4 right-10 w-96 h-96 bg-purple-500/15 rounded-full filter blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="fixed top-2/3 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 glass-panel border-b border-cyan-500/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="relative p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition duration-300">
                <img 
                  src={logoImg} 
                  alt="NeuroScan Logo" 
                  className="h-11 w-11 rounded-2xl object-cover" 
                />
                <div className="absolute inset-0 rounded-2xl bg-cyan-400 filter blur-md opacity-40 group-hover:opacity-75 transition duration-300 -z-10" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-black tracking-tight text-gradient-cyber font-display">
                    NEUROSCAN<span className="text-cyan-400">.AI</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                  Clinical AI Research & Educational Platform
                </p>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center space-x-1.5 ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => { setActiveTab('analyze'); if (!result) setFile(null); }}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center space-x-1.5 ${
                    activeTab === 'analyze'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Activity className="h-4 w-4 text-purple-300" />
                  <span>Analyze MRI</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center space-x-1.5 ${
                    activeTab === 'history'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Scan History</span>
                </button>
              </nav>

              {/* User Account Button with User's Name */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl border transition-all duration-300 ${
                  activeTab === 'profile'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-cyan-500/40 text-slate-200'
                }`}
                title="View & Edit Researcher Profile"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-[11px] font-bold text-slate-950">
                  {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-bold font-display max-w-[140px] truncate">
                  {fullName}
                </span>
              </button>

              {/* Quick Register / Switch Account Button */}
              <button
                onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }}
                className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-slate-800/80 hover:bg-cyan-600 hover:text-white text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all duration-300"
                title="Register New Account"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

          {/* ========================================================
              TAB 1: DASHBOARD / OVERVIEW
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-12">
              
              {/* Hero Banner Seamless Overlay */}
              <div className="relative py-4 sm:py-8">
                <div className="relative z-10 max-w-3xl space-y-6">

                  {/* Personalized Researcher Badge */}
                  <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Active Session: <strong>{fullName}</strong> ({user.institution || 'Medical Research Lab'})</span>
                  </div>

                  <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight font-display">
                    High-Precision <br />
                    <span className="text-gradient-cyber">Brain MRI Analysis</span> & <br />
                    <span className="text-gradient-cyan">Educational Reports</span>
                  </h1>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                    Instantly classify axial, sagittal, and coronal MRI scans across <strong className="text-rose-400">Glioma</strong>, <strong className="text-amber-400">Meningioma</strong>, <strong className="text-purple-400">Pituitary</strong>, and <strong className="text-emerald-400">No Tumor</strong> categories with calibrated probability distributions and automated ReportLab PDF exports.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <button
                      onClick={() => { setActiveTab('analyze'); setResult(null); setFile(null); }}
                      className="group inline-flex items-center px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] transition-all duration-300"
                    >
                      <span>Upload & Analyze Scan</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition duration-300" />
                    </button>

                    <button
                      onClick={() => setActiveTab('history')}
                      className="inline-flex items-center px-6 py-4 rounded-2xl glass-panel hover:bg-slate-800/80 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-cyan-500/40 transition duration-300"
                    >
                      <History className="mr-2 h-4 w-4 text-cyan-400" />
                      <span>View History & Reports</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Tumor Categories Showcase */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white font-display flex items-center">
                      <Microscope className="h-6 w-6 mr-2.5 text-cyan-400" />
                      Target Classification Categories
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Four distinct categories evaluated by the deep neural classifier</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    {
                      name: "Glioma",
                      color: "text-rose-400",
                      border: "border-rose-500/30 hover:border-rose-500/60",
                      glow: "hover:shadow-rose-500/20",
                      bgBadge: "bg-rose-950/60 text-rose-300 border-rose-500/40",
                      desc: "Intra-axial neoplasms arising from glial support cells. Classified across diverse histological vascularities."
                    },
                    {
                      name: "Meningioma",
                      color: "text-amber-400",
                      border: "border-amber-500/30 hover:border-amber-500/60",
                      glow: "hover:shadow-amber-500/20",
                      bgBadge: "bg-amber-950/60 text-amber-300 border-amber-500/40",
                      desc: "Extra-axial lesions developing from arachnoid cap cells within the meningeal membranes covering the brain."
                    },
                    {
                      name: "Pituitary",
                      color: "text-purple-400",
                      border: "border-purple-500/30 hover:border-purple-500/60",
                      glow: "hover:shadow-purple-500/20",
                      bgBadge: "bg-purple-950/60 text-purple-300 border-purple-500/40",
                      desc: "Sellar and parasellar region adenomas influencing endocrine pathways or causing optical chiasm compression."
                    },
                    {
                      name: "None / Clear",
                      color: "text-emerald-400",
                      border: "border-emerald-500/30 hover:border-emerald-500/60",
                      glow: "hover:shadow-emerald-500/20",
                      bgBadge: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40",
                      desc: "Absence of hallmark morphologic features for the three primary tumor categories on the analyzed image."
                    }
                  ].map((cat, idx) => (
                    <div
                      key={idx}
                      className={`p-6 rounded-3xl glass-panel border ${cat.border} transition-all duration-300 glass-card-hover ${cat.glow} flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${cat.bgBadge}`}>
                            Class 0{idx + 1}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        </div>
                        <h3 className={`text-xl font-bold ${cat.color} font-display mb-2`}>{cat.name}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{cat.desc}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Evaluation metric</span>
                        <span className="font-mono text-cyan-400 font-semibold">Softmax Prob</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: ANALYZE MRI SCAN & RESULTS
             ======================================================== */}
          {activeTab === 'analyze' && (
            <div className="space-y-10 max-w-5xl mx-auto">
              
              {!result && (
                <div className="glass-panel-glow p-8 sm:p-12 rounded-3xl cyber-border relative overflow-hidden">
                  <div className="max-w-2xl mx-auto text-center space-y-4 mb-8">
                    <h2 className="text-3xl font-black text-white font-display">
                      Upload Brain MRI Scan
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Upload an axial, sagittal, or coronal T1/T2/FLAIR brain MRI scan. The system validates image features and performs neural classification.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-start space-x-3 text-rose-300 text-xs">
                      <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Image Validation Notice</p>
                        <p className="text-rose-200/90 mt-0.5">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Dropzone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
                      isDragging 
                        ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]' 
                        : previewUrl 
                          ? 'border-cyan-500/40 bg-slate-900/60' 
                          : 'border-slate-700/80 hover:border-cyan-500/40 bg-slate-900/40'
                    }`}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <input
                      id="file-input"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    />

                    {previewUrl ? (
                      <div className="space-y-4">
                        <div className="relative max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 group">
                          <img 
                            src={previewUrl} 
                            alt="MRI Scan Preview" 
                            className="w-full h-64 object-contain bg-black"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                            <span className="text-xs font-bold text-cyan-300">Click to Change Image</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{file?.name} ({(file!.size / (1024 * 1024)).toFixed(2)} MB)</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center mx-auto text-cyan-400">
                          <Upload className="h-8 w-8 animate-bounce" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white font-display">Drag and drop MRI scan image here</p>
                          <p className="text-xs text-slate-400 mt-1">Supports standard JPEG & PNG DICOM-derived slices (up to 15MB)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {file && (
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 hover:scale-[1.02] transition duration-300 flex items-center space-x-2"
                      >
                        <BrainCircuit className="h-5 w-5" />
                        <span>Run Full Neural Diagnosis & Generate PDF</span>
                      </button>
                    </div>
                  )}

                  {/* Loading / Multi-Step Progress Indicator */}
                  {loading && (
                    <div className="mt-8 p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                        <span>Analysis Pipeline in Progress</span>
                        <span>Step {currentStepIndex + 1} of {analysisSteps.length}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 h-2 transition-all duration-500 rounded-full"
                          style={{ width: `${((currentStepIndex + 1) / analysisSteps.length) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center space-x-3 text-slate-200">
                        {React.createElement(analysisSteps[currentStepIndex].icon, { className: "h-5 w-5 text-cyan-400 animate-spin" })}
                        <div>
                          <p className="text-xs font-bold text-white">{analysisSteps[currentStepIndex].title}</p>
                          <p className="text-[11px] text-slate-400">{analysisSteps[currentStepIndex].desc}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Classification Results & Groq Breakdown */}
              {result && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Results Header Card */}
                  <div className="glass-panel-glow p-8 rounded-3xl cyber-border flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-5">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-black shrink-0">
                        <img 
                          src={previewUrl || ''} 
                          alt="Analyzed Scan" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                            Neural Prediction
                          </span>
                          <span className="text-xs text-slate-400">Researcher: {fullName}</span>
                        </div>
                        <h2 className="text-3xl font-black text-white font-display mt-1">
                          {result.prediction.class}
                        </h2>
                        <p className="text-xs text-slate-300 mt-1">
                          Calibrated Probability: <strong className="text-cyan-400 font-mono text-sm">{Math.round(result.prediction.confidence * 100)}%</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {result.report?.download_url && (
                        <button
                          onClick={() => downloadReportFile(result.analysis_id)}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition cursor-pointer"
                        >
                          <FileDown className="h-4 w-4" />
                          <span>Download PDF Report</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setResult(null); setFile(null); setPreviewUrl(null); }}
                        className="px-5 py-3 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition"
                      >
                        <RefreshCw className="h-4 w-4 text-cyan-400" />
                        <span>Analyze Another Scan</span>
                      </button>
                    </div>
                  </div>

                  {/* Distribution Chart & Synthesis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Probabilities Bar Chart */}
                    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                      <h3 className="text-base font-bold text-white font-display flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-cyan-400" />
                        Probability Distribution
                      </h3>
                      <div className="h-60 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                            <YAxis type="category" dataKey="name" stroke="#94a3b8" />
                            <Tooltip formatter={(value: any) => [`${value}%`, 'Confidence']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Groq Medical Synthesis */}
                    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                      <h3 className="text-base font-bold text-white font-display flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
                        LLaMA-3 Clinical Synthesis
                      </h3>
                      <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-60 overflow-y-auto pr-2">
                        <p className="font-semibold text-slate-100">
                          {result.explanation.summary}
                        </p>
                        <p>
                          {result.explanation.educational_explanation}
                        </p>
                        {result.explanation.limitations && (
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
                            <strong className="text-amber-400">Limitations: </strong>
                            {result.explanation.limitations}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 3: SCAN HISTORY
             ======================================================== */}
          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between glass-panel p-6 rounded-3xl border border-cyan-500/20">
                <div>
                  <h2 className="text-2xl font-black text-white font-display">Analysis History & Reports</h2>
                  <p className="text-xs text-slate-400 mt-1">Review past patient scan categorizations attributed to {fullName}.</p>
                </div>
                <button
                  onClick={loadHistory}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-xs font-semibold text-cyan-400 border border-cyan-500/30 flex items-center space-x-1.5 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  <span>Refresh List</span>
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-20 glass-panel border border-slate-800 rounded-3xl space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                    <History className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-200">No Scans Recorded Yet</p>
                    <p className="text-xs text-slate-500">Run an analysis above to populate your research records.</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('analyze'); setResult(null); setFile(null); }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20"
                  >
                    Analyze an MRI Scan
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {historyList.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-3xl glass-panel border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-cyan-400">
                          <BrainCircuit className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-base font-bold text-white font-display">{rec.prediction || 'Analysis Record'}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                              {(rec.confidence * 100).toFixed(0)}% Conf
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {rec.image_filename || 'mri_scan.jpg'} • Analyzed on {new Date(rec.created_at).toLocaleDateString()} at {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => downloadReportFile(rec.id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 transition cursor-pointer"
                        >
                          <FileDown className="h-4 w-4" />
                          <span>PDF Report</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 4: RESEARCHER PROFILE & SETTINGS
             ======================================================== */}
          {activeTab === 'profile' && (
            <div className="max-w-3xl mx-auto glass-panel-glow p-8 sm:p-12 rounded-3xl cyber-border space-y-8 animate-fade-in">
              
              {/* Profile Header */}
              <div className="flex flex-wrap items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-xl shadow-cyan-500/20">
                    <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-cyan-400 font-bold text-2xl">
                      {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display">
                      {fullName}
                    </h2>
                    <p className="text-xs text-slate-400">{user.email} • {user.institution || 'Medical Research Lab'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center space-x-1.5 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Name / Profile</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 transition"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }}
                    className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-xs font-semibold border border-cyan-500/40 flex items-center space-x-1.5 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Register New</span>
                  </button>
                </div>
              </div>

              {profileSaveSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center space-x-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Your researcher name and details have been successfully updated!</span>
                </div>
              )}

              {/* Edit Mode Form */}
              {isEditingProfile ? (
                <div className="space-y-4 p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/30">
                  <h3 className="text-sm font-bold text-white font-display mb-4">Edit Profile Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Prefix / Title</label>
                      <select
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Researcher">Researcher</option>
                        <option value="Student">Student</option>
                        <option value="Clinician">Clinician</option>
                        <option value="">None</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">First Name</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        placeholder="e.g. Supreeth"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        placeholder="e.g. Kumar"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Institution / Department</label>
                    <input
                      type="text"
                      value={editInstitution}
                      onChange={(e) => setEditInstitution(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. Department of Radiology & Clinical AI"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl glass-panel text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                /* Profile Display Specs */
                <div className="space-y-4">
                  {[
                    { label: "Active Researcher", val: fullName },
                    { label: "Registered Email", val: user.email },
                    { label: "Institution", val: user.institution || "NeuroScan Clinical AI Lab" },
                    { label: "Active Inference Model", val: "BrainTumorClassifier v1.0 (PyTorch / Transfer Learning)" },
                    { label: "Preprocessing Matrix", val: "224x224 RGB [Mean: 0.485, Std: 0.229]" },
                    { label: "Educational Synthesis", val: "Groq LLaMA-3 Engine (Strict Non-Diagnostic Guardrails)" },
                    { label: "Storage & RLS Policy", val: "Supabase User-Isolated Private Buckets" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 gap-1">
                      <span className="text-xs font-semibold text-slate-400">{item.label}</span>
                      <span className="text-xs font-mono text-cyan-300 font-medium">{item.val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Log out / Switch User */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500">Want to log in with another account?</p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center space-x-1.5 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out / Switch Account</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================
            REGISTRATION & LOGIN MODAL
           ======================================================== */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md glass-panel-glow p-8 rounded-3xl cyber-border space-y-6">
              
              {/* Close Button */}
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title & Tabs */}
              <div>
                <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                  <BrainCircuit className="h-6 w-6" />
                  <span className="text-xs font-bold tracking-wider uppercase font-mono">Researcher Gateway</span>
                </div>
                <h2 className="text-2xl font-black text-white font-display">
                  {authMode === 'register' ? 'Register New Account' : 'Sign In to NeuroScan'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {authMode === 'register' ? 'Create your profile to personalize analysis and PDF reports.' : 'Access your past research records and model settings.'}
                </p>
              </div>

              {/* Mode Switch Tabs */}
              <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    authMode === 'register' 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register (Sign Up)
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    authMode === 'login' 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-4">
                
                {authMode === 'register' && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Prefix</label>
                        <select
                          value={regTitle}
                          onChange={(e) => setRegTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="Dr.">Dr.</option>
                          <option value="Prof.">Prof.</option>
                          <option value="Researcher">Researcher</option>
                          <option value="Student">Student</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                          placeholder="Vinay"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                          placeholder="B"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Institution / University</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={regInstitution}
                          onChange={(e) => setRegInstitution(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                          placeholder="e.g. Medical AI Research Center"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="vinay@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition duration-300 flex items-center justify-center space-x-2"
                >
                  {authLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : authMode === 'register' ? (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Complete Registration & Enter</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Sign In to Account</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl py-8 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <div className="flex items-center justify-center space-x-2 font-display text-sm font-bold text-slate-300">
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              <span>NEUROSCAN AI MEDICAL RESEARCH PLATFORM</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto leading-relaxed">
              This system is strictly designed for scientific research and educational demonstration. It is not approved as a medical device and must never substitute clinical diagnosis.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
