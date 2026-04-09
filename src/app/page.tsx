"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft, X, Copy, CreditCard, History, BookOpen, 
  Calendar, ShieldCheck, Mail, Lock, LogOut
} from "lucide-react";

// --- MOCK DATA ---
const MOCK_POSTS = [
  {
    id: 1, user: { name: "도니 전사", avatar: "DN" },
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop",
    content: "오늘 하체 조졌습니다! 스쿼트 100kg 달성 💪",
    date: "어제", likes: 24, comments: [], liked: true
  },
  {
    id: 2, user: { name: "헬스왕", avatar: "HW" },
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop",
    content: "단백질 식단 공유합니다. 닭가슴살 샐러드 맛도리네요.",
    date: "2일 전", likes: 12, comments: [], liked: false
  }
];

const MOCK_MEMBERS = [
  { id: 1, name: "돌콩님", avatar: "DK", weekly: 2, monthly: 12, yearly: 148, bio: "SME 클럽 관리자 | 헬스 & 테크 🚀" },
  { id: 2, name: "도니 전사", avatar: "DN", weekly: 3, monthly: 15, yearly: 120, bio: "득근에 진심인 전사입니다. 💪" },
  { id: 3, name: "헬스왕", avatar: "HW", weekly: 1, monthly: 10, yearly: 200, bio: "꾸준함이 진리다. 🏋️‍♂️" },
  { id: 4, name: "눈곰", avatar: "NG", weekly: 2, monthly: 11, yearly: 95, bio: "매일 조금씩 성장하기 🐻" },
  { id: 5, name: "돌맹", avatar: "DM", weekly: 3, monthly: 14, yearly: 110, bio: "운동 초보 탈출기!" }
];

const LAST_WEEK_DAYS = [
  { day: '월', status: '인정' }, { day: '화', status: '인정' }, { day: '수', status: '미흡' },
  { day: '목', status: '미흡' }, { day: '금', status: '미흡' }, { day: '토', status: '인정' }, { day: '일', status: '미흡' },
];

const MOCK_LEDGER = [
  { id: 1, name: "돌콩님", amount: 4000, date: "24.04.01", status: "납부완료" },
  { id: 2, name: "헬스왕", amount: 6000, date: "24.04.01", status: "미납" },
];

const CURRENT_WEEK_DAYS = [
  { day: '월', date: '6', status: '인정' }, { day: '화', date: '7', status: '대기' },
  { day: '수', date: '8', status: '인정' }, { day: '목', date: '9', status: 'selected' },    
  { day: '금', date: '10', status: '대기' }, { day: '토', date: '11', status: '대기' }, { day: '일', date: '12', status: '대기' },
];

export default function Home() {
  const [isLightMode, setIsLightMode] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState("home");
  const [workoutCount, setWorkoutCount] = useState(2);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [rankingPeriod, setRankingPeriod] = useState("monthly");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auth Logic
  useEffect(() => {
    const savedSession = localStorage.getItem("sme_session");
    if (savedSession) {
      setCurrentUser(JSON.parse(savedSession));
    }
    setIsAuthChecking(false);
  }, []);

  useEffect(() => {
    if (isLightMode) document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [isLightMode]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = formData.get("userId") as string;
    const pw = formData.get("password") as string;
    const name = formData.get("userName") as string;

    if (authMode === "login") {
      // Admin Check
      if (id === "admin" && pw === "admin9569") {
        const adminUser = { id: "admin", name: "관리자", isAdmin: true };
        setCurrentUser(adminUser);
        localStorage.setItem("sme_session", JSON.stringify(adminUser));
        return;
      }
      // General User Check (Mock)
      const mockUser = { id, name: id || "사용자", isAdmin: false };
      setCurrentUser(mockUser);
      localStorage.setItem("sme_session", JSON.stringify(mockUser));
    } else {
      // Signup Mock
      const newUser = { id, name: name || id, isAdmin: false };
      setCurrentUser(newUser);
      localStorage.setItem("sme_session", JSON.stringify(newUser));
      setToast("회원가입을 환영합니다! 🎉");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("sme_session");
    setIsMenuOpen(false);
    setMenuView(null);
    setToast("로그아웃 되었습니다.");
  };

  const copyAccount = () => {
    navigator.clipboard.writeText("카카오뱅크 7942-19-81948");
    setToast("계좌번호가 복사되었습니다! 💳");
  };

  const handleUpload = () => {
    if (checkedIn) {
      setShowUpload(false);
      return;
    }
    const newPost = {
      id: posts.length + 1,
      user: { name: "돌콩님", avatar: "DK" },
      imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop",
      content: "오늘도 득근! 💪",
      date: "방금 전",
      likes: 0,
      comments: [],
      liked: false
    };
    setPosts([newPost, ...posts]);
    setCheckedIn(true);
    setWorkoutCount(prev => prev + 1);
    setShowUpload(false);
  };

  if (isAuthChecking) return null;

  // --- AUTH VIEW ---
  if (!currentUser) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem" }}>
           <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--primary)" }}>SME CLUB</h1>
              <p style={{ fontSize: "0.85rem", opacity: 0.5, marginTop: "0.5rem" }}>운동 관리의 시작, 에스엠이 클럽</p>
           </div>
           <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {authMode === "signup" && (
                <div style={{ position: "relative" }}>
                   <User size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} />
                   <input name="userName" type="text" placeholder="이름" required style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none" }} />
                </div>
              )}
              <div style={{ position: "relative" }}>
                <Users size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} />
                <input name="userId" type="text" placeholder="아이디" required style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none" }} />
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} />
                <input name="password" type="password" placeholder="비밀번호" required style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none" }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: "1.1rem", borderRadius: "1.2rem", fontWeight: 800, fontSize: "1rem", marginTop: "1rem" }}>
                {authMode === "login" ? "로그인" : "회원가입"}
              </button>
           </form>
           <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} style={{ fontSize: "0.85rem", fontWeight: 700, opacity: 0.6 }}>
                 {authMode === "login" ? "아직 회원이 아니신가요? 회원가입" : "이미 회원이신가요? 로그인"}
              </button>
           </div>
           <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid var(--glass-border)", textAlign: "center", fontSize: "0.75rem", opacity: 0.3 }}>
              관리 계정 (admin / admin9569)
           </div>
        </motion.div>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 50, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 50, x: "-50%", opacity: 0 }} style={{ position: "fixed", bottom: "3rem", left: "50%", background: "black", color: "white", padding: "0.8rem 1.5rem", borderRadius: "2rem", zIndex: 3000, fontWeight: 700 }}>{toast}</motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  // --- APP VIEW ---
  const penalty = Math.max(0, 3 - workoutCount) * 2000;
  const lastWeekPenalty = Math.max(0, 3 - LAST_WEEK_DAYS.filter(d => d.status === '인정').length) * 2000;

  return (
    <main style={{ padding: "1.5rem 0 7.5rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Top Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
           <h1 onClick={() => {setActiveTab("home"); setMenuView(null);}} style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--primary)", cursor: "pointer" }}>SME CLUB</h1>
           <span style={{ fontSize: "0.7rem", opacity: 0.5, fontWeight: 700 }}>4월 2주차 (4/6 ~ 4/12)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
           <div onClick={() => setIsLightMode(!isLightMode)} style={{ width: "36px", height: "18px", borderRadius: "9px", background: isLightMode ? "#e0e7ff" : "#334155", position: "relative", cursor: "pointer" }}>
              <motion.div animate={{ x: isLightMode ? 2 : 20 }} style={{ width: "14px", height: "14px", borderRadius: "50%", background: "white", position: "absolute", top: "2px" }} />
           </div>
           <Menu size={24} style={{ opacity: 0.6, cursor: "pointer" }} onClick={() => setIsMenuOpen(true)} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <section style={{ padding: "0 1.25rem" }}>
               <div onClick={() => setIsNoticeOpen(!isNoticeOpen)} style={{ padding: "1rem 1.25rem", borderRadius: "1rem", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.1)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><Megaphone size={16} color="var(--primary)" /><span style={{ fontSize: "0.8rem", fontWeight: 800 }}>[공지] 이번 주 활동 우수자 발표</span></div>
                     <ChevronDown size={16} style={{ transform: isNoticeOpen ? "rotate(180deg)" : "none", transition: "0.3s" }} />
                  </div>
                  <AnimatePresence>{isNoticeOpen && (<motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.8rem", lineHeight: 1.5 }}>꾸준히 3회 이상을 지켜주신 멤버분들께 감사의 말씀을 전합니다. 카페 기프티콘이 발송될 예정입니다! 🎁</motion.p>)}</AnimatePresence>
               </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", padding: "0 1.25rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>이번 주 벌금</div><div style={{ fontSize: "1.5rem", fontWeight: 900, color: penalty > 0 ? "var(--warning)" : "var(--success)" }}>{penalty === 0 ? "0원" : `${penalty.toLocaleString()}원`}</div></div>
              <div className="card" style={{ padding: "1.5rem" }}><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>현재 횟수</div><div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{workoutCount} / 3</div></div>
            </section>
            
            <section style={{ textAlign: "center" }}>
               <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowUpload(true)} style={{ width: "130px", height: "130px", borderRadius: "65px", background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary), var(--secondary))", color: "white", boxShadow: "0 10px 40px rgba(56, 189, 248, 0.25)" }}>
                 {checkedIn ? <CheckCircle2 size={50} /> : <Dumbbell size={50} />}
               </motion.button>
               <h3 style={{ marginTop: "1rem", fontWeight: 800 }}>{checkedIn ? "오운완 인증 완료!" : "운동 인증샷 올리기"}</h3>
            </section>

            <section style={{ padding: "0 1.25rem" }}>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                 {CURRENT_WEEK_DAYS.map((wd, i) => (
                   <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.75rem 0", borderRadius: "1rem", border: "1px solid var(--glass-border)", opacity: (wd.status === '인정' || wd.status === 'selected') ? 1 : 0.4 }}>
                     <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{wd.day}</span>
                     {wd.status === '인정' ? <CheckCircle2 size={16} color="var(--success)" /> : <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{wd.date}</span>}
                   </div>
                 ))}
               </div>
            </section>

            <section className="card" style={{ margin: "0 1.25rem", padding: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontWeight: 900 }}>SME 열정 랭킹 🏆</h3>
                  <div style={{ display: "flex", gap: "0.4rem", background: "rgba(0,0,0,0.05)", padding: "0.2rem", borderRadius: "0.8rem" }}>
                    {["weekly", "monthly", "yearly"].map(p => (
                      <button key={p} onClick={() => setRankingPeriod(p)} style={{ padding: "0.35rem 0.6rem", borderRadius: "0.6rem", fontSize: "0.6rem", fontWeight: 800, background: rankingPeriod === p ? "white" : "transparent" }}>{p === 'weekly' ? '주간' : p === 'monthly' ? '월간' : '연간'}</button>
                    ))}
                  </div>
               </div>
               {[...MOCK_MEMBERS].sort((a,b) => (b as any)[rankingPeriod] - (a as any)[rankingPeriod]).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.2rem" }}>
                     <span style={{ width: "1.2rem", fontWeight: 900 }}>{i < 3 ? ["🥇","🥈","🥉"][i] : i+1}</span>
                     <div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>{m.avatar}</div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 800 }}><span>{m.name}</span><span>{(m as any)[rankingPeriod]}회</span></div>
                        <div style={{ width: "100%", height: "5px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", marginTop: "5px" }}><div style={{ width: `${Math.min(100, ((m as any)[rankingPeriod] / (rankingPeriod === 'weekly' ? 3 : rankingPeriod === 'monthly' ? 12 : 150)) * 100)}%`, height: "100%", background: "var(--primary)", borderRadius: "3px" }} /></div>
                     </div>
                  </div>
               ))}
            </section>
          </motion.div>
        )}

        {/* ... (Existing Tabs: social, profile, my) ... */}
        {activeTab === "social" && (
          <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
             <h2 style={{ padding: "0 1.25rem", fontSize: "1.6rem", fontWeight: 900 }}>실시간 피드</h2>
             {posts.map(post => (
               <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                 <div onClick={() => { setSelectedProfile(post.user); setActiveTab("profile"); }} style={{ padding: "0.8rem 1.25rem", display: "flex", alignItems: "center", gap: "0.8rem", cursor: "pointer" }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 900 }}>{post.user.avatar}</div>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{post.user.name}</span>
                 </div>
                 <img src={post.imageUrl} alt="feed" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
                 <div style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.7rem" }}><Heart size={24} /> <MessageCircle size={24} /> <Share2 size={24} style={{ marginLeft: "auto" }} /></div>
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.5 }}><span style={{ fontWeight: 900, marginRight: "0.5rem" }}>{post.user.name}</span>{post.content}</p>
                 </div>
               </article>
             ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 Enhanced Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", zIndex: 1000 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "300px", background: "var(--card-bg)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", zIndex: 1001, padding: "2.5rem 2rem", display: "flex", flexDirection: "column" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <h2 style={{ fontWeight: 900, fontSize: "1.4rem" }}>전체 메뉴</h2>
                  <X size={26} style={{ cursor: "pointer", opacity: 0.5 }} onClick={() => setIsMenuOpen(false)} />
               </div>
               <nav style={{ display: "flex", flexDirection: "column", gap: "0.8rem", flex: 1 }}>
                  <div onClick={() => { setMenuView("penalty"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <CreditCard size={22} color="var(--primary)" /> <span style={{ fontWeight: 800 }}>벌금 관리</span>
                  </div>
                  <div onClick={() => { setMenuView("ledger"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <BookOpen size={22} color="var(--secondary)" /> <span style={{ fontWeight: 800 }}>장부 (벌금 현황)</span>
                  </div>
                  <div onClick={() => { setMenuView("exemption"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <ShieldCheck size={22} color="var(--success)" /> <span style={{ fontWeight: 800 }}>면제 신청</span>
                  </div>
               </nav>
               <button onClick={handleLogout} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "0.8rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(239, 68, 68, 0.05)", color: "var(--error)", fontWeight: 800, cursor: "pointer", border: "none" }}>
                  <LogOut size={22} /> 로그아웃
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🔵 Menu Detail Views */}
      <AnimatePresence>
        {menuView === "penalty" && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2000, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}><ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} /> <h2 style={{ fontSize: "1.3rem", fontWeight: 900 }}>지난 주 벌금 정산</h2></div>
              <div className="card" style={{ padding: "1.5rem" }}>
                 <p style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: "1.2rem", fontWeight: 700 }}>지난 주 운동 기록 (목표 3회)</p>
                 <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                   {LAST_WEEK_DAYS.map((wd, i) => (
                     <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                       <span style={{ fontSize: "0.6rem", fontWeight: 800 }}>{wd.day}</span>
                       <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: wd.status === '인정' ? "var(--success)" : "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                         {wd.status === '인정' ? <Check size={18} color="white" /> : <X size={18} color="var(--error)" />}
                       </div>
                     </div>
                   ))}
                 </div>
                 <div style={{ marginTop: "2rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 700 }}>정산 금액</div><div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--error)" }}>{lastWeekPenalty.toLocaleString()}원</div></div>
                    <button onClick={copyAccount} className="btn-primary" style={{ padding: "0.8rem 1.25rem", borderRadius: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Copy size={18} /> 계좌 복사</button>
                 </div>
              </div>
           </motion.div>
        )}
        {menuView === "ledger" && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2000, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}><ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} /> <h2 style={{ fontSize: "1.3rem", fontWeight: 900 }}>SME 벌금 장부 📖</h2></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                 {MOCK_LEDGER.map((item) => (
                   <div key={item.id} className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontWeight: 800 }}>{item.name}</div><div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{item.date} 정산</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontWeight: 900 }}>{item.amount.toLocaleString()}원</div><div style={{ fontSize: "0.7rem", color: item.status === '납부완료' ? "var(--success)" : "var(--error)", fontWeight: 800 }}>{item.status}</div></div>
                   </div>
                 ))}
              </div>
           </motion.div>
        )}
        {menuView === "exemption" && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2000, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}><ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} /> <h2 style={{ fontSize: "1.3rem", fontWeight: 900 }}>운동 면제 신청 🛡️</h2></div>
              <div className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                 <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}><Mail size={20} color="var(--primary)" /><div><div style={{ fontWeight: 800, fontSize: "0.95rem" }}>면제 사유 입력</div></div></div>
                 <textarea placeholder="면제가 필요한 사유를 적어주세요. 관리자 승인 후 벌금 제외 처리가 됩니다." style={{ width: "100%", height: "150px", background: "rgba(0,0,0,0.03)", border: "none", borderRadius: "1rem", padding: "1.25rem", resize: "none" }} />
                 <button onClick={() => { setToast("면제 신청이 접수되었습니다! 🛡️"); setMenuView(null); }} className="btn-primary" style={{ width: "100%", padding: "1.1rem", borderRadius: "1.25rem", fontWeight: 800 }}>신청서 제출하기</button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 100, x: "-50%", opacity: 0 }} style={{ position: "fixed", bottom: "7.5rem", left: "50%", background: "rgba(0,0,0,0.85)", color: "white", padding: "1rem 2rem", borderRadius: "2.5rem", zIndex: 3000, fontWeight: 800, fontSize: "0.95rem" }}>{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 Fixed Bottom Navigation */}
      <nav className="glass" style={{ 
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 2.5rem)", maxWidth: "420px", height: "4.8rem",
        display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, borderRadius: "2.5rem",
        background: isLightMode ? "rgba(255,255,255,0.92)" : "rgba(15, 23, 42, 0.85)"
      }}>
        {[
          { id: "home", icon: <HomeIcon size={24} />, label: "홈" },
          { id: "social", icon: <Users size={24} />, label: "피드" },
          { id: "my", icon: <User size={24} />, label: "마이" }
        ].map(it => (
          <button key={it.id} onClick={() => {setActiveTab(it.id); setSelectedProfile(null); window.scrollTo(0,0); setMenuView(null);}} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: (activeTab === it.id || (it.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)" }}>
            {it.icon} <span style={{ fontSize: "0.65rem", fontWeight: 800 }}>{it.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card" style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>운동 인증샷 올리기</h3>
               <div style={{ width: "100%", aspectRatio: "1/1", border: "2px dashed var(--glass-border)", borderRadius: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={48} style={{ opacity: 0.3 }} /></div>
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "1rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.05)", fontWeight: 800 }}>취소</button>
                  <button onClick={handleUpload} className="btn-primary" style={{ flex: 1, borderRadius: "1.25rem", fontWeight: 800 }}>인증 완료</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
