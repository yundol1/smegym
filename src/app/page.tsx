"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft, X, Copy, CreditCard, History, BookOpen, 
  Calendar, ShieldCheck, Mail, Lock, LogOut, Bell, AlertCircle, Trash2
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

const INITIAL_ATTENDANCE = [
  { day: '월', date: '6', status: 'approved', imageUrl: '', reason: '' },
  { day: '화', date: '7', status: 'none', imageUrl: '', reason: '' },
  { day: '수', date: '8', status: 'rejected', imageUrl: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?q=80&w=200&auto=format&fit=crop', reason: '운동 사진이 아닌 가구 사진입니다.' },
  { day: '목', date: '9', status: 'pending', imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=200&auto=format&fit=crop', reason: '' },    
  { day: '금', date: '10', status: 'none', imageUrl: '', reason: '' },
  { day: '토', date: '11', status: 'none', imageUrl: '', reason: '' },
  { day: '일', date: '12', status: 'none', imageUrl: '', reason: '' },
];

const MOCK_LEDGER = [
  { id: 1, name: "돌콩님", amount: 4000, date: "24.04.01", status: "납부완료" },
  { id: 2, name: "헬스왕", amount: 6000, date: "24.04.01", status: "미납" },
];

const MOCK_PENDING_LIST = [
  { id: 101, user: "도니 전사", type: "인증샷", date: "4/9", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop" },
  { id: 102, user: "헬스왕", type: "면제", date: "4/10", reason: "지방 출장으로 인해 운동 불가" },
];

export default function Home() {
  const [isLightMode, setIsLightMode] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState("home");
  const [attendance, setAttendance] = useState(INITIAL_ATTENDANCE);
  const [pendingApprovals, setPendingApprovals] = useState(MOCK_PENDING_LIST);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showUpload, setShowUpload] = useState<string | null>(null); // State used to carry the date/day name
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [rankingPeriod, setRankingPeriod] = useState("monthly");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  const workoutCount = attendance.filter(d => d.status === 'approved').length;
  const penalty = Math.max(0, 3 - workoutCount) * 2000;
  const hasRejection = attendance.some(d => d.status === 'rejected');

  useEffect(() => {
    const savedSession = localStorage.getItem("sme_session");
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
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
      if (id === "admin" && pw === "admin9569") {
        const adminUser = { id: "admin", name: "관리자", isAdmin: true };
        setCurrentUser(adminUser);
        if (rememberMe) localStorage.setItem("sme_session", JSON.stringify(adminUser));
        return;
      }
      const mockUser = { id, name: id || "사용자", isAdmin: false };
      setCurrentUser(mockUser);
      if (rememberMe) localStorage.setItem("sme_session", JSON.stringify(mockUser));
    } else {
      const newUser = { id, name: name || id, isAdmin: false };
      setCurrentUser(newUser);
      if (rememberMe) localStorage.setItem("sme_session", JSON.stringify(newUser));
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
    // If we're updating a specific day from the calendar
    if (showUpload && showUpload !== 'today') {
      const updated = attendance.map(d => d.day === showUpload ? { ...d, status: 'pending', imageUrl: 'https://images.unsplash.com/photo-1540206276207-3af25c08abbb?auto=format&fit=crop&q=80&w=400' } : d);
      setAttendance(updated as any);
      setToast(`${showUpload}요일 인증샷이 제출되었습니다! ⏳`);
    } else {
      // General upload (today)
      const todayDay = attendance.find(d => d.date === '9')?.day || '목';
      const updated = attendance.map(d => d.day === todayDay ? { ...d, status: 'pending', imageUrl: 'https://images.unsplash.com/photo-1540206276207-3af25c08abbb?auto=format&fit=crop&q=80&w=400' } : d);
      setAttendance(updated as any);
      setCheckedIn(true);
      setToast("인증샷이 제출되었습니다! 관리자 승인을 기다려주세요. ⏳");
    }
    setShowUpload(null);
    setSelectedDay(null);
  };

  const handleApprove = (id: number) => {
    setPendingApprovals(prev => prev.filter(p => p.id !== id));
    setToast("정상적으로 승인되었습니다! ✅");
  };

  const startReject = (id: number) => {
    setRejectId(id);
    setRejectReasonInput("");
  };

  const confirmReject = () => {
    setPendingApprovals(prev => prev.filter(p => p.id !== rejectId));
    setRejectId(null);
    setToast("반려 처리가 완료되었습니다. ❌");
  };

  const ProfileHeader = ({ name }: { name: string }) => {
    const member = MOCK_MEMBERS.find(m => m.name === name) || MOCK_MEMBERS[0];
    const userPosts = posts.filter(p => p.user.name === name);
    return (
      <div style={{ padding: "0 1.25rem", marginBottom: "1.5rem" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2rem" }}>
            <div style={{ width: "5.5rem", height: "5.5rem", borderRadius: "50%", background: "var(--secondary)", border: "3px solid var(--primary)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 800, color: "white" }}>
               {name === "돌콩님" || name === "관리자" ? <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : member.avatar}
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
               <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{member.monthly}</div><div style={{ fontSize: "0.75rem", opacity: 0.5 }}>운동횟수</div></div>
               <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{userPosts.length}</div><div style={{ fontSize: "0.75rem", opacity: 0.5 }}>게시물</div></div>
            </div>
         </div>
         <div style={{ marginTop: "1rem" }}><div style={{ fontWeight: 800 }}>{name}</div><p style={{ fontSize: "0.85rem", opacity: 0.7 }}>{member.bio}</p></div>
      </div>
    );
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
              {authMode === "login" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0 0.2rem" }}>
                   <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer" }} />
                   <label htmlFor="remember" style={{ fontSize: "0.85rem", fontWeight: 700, opacity: 0.6, cursor: "pointer" }}>로그인 상태 유지</label>
                </div>
              )}
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
              계정 (admin / admin9569)
           </div>
        </motion.div>
      </main>
    );
  }

  // --- APP VIEW ---
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
           <div style={{ position: "relative" }}>
             <Bell size={24} style={{ opacity: 0.4 }} />
             {hasRejection && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "var(--error)", border: "2px solid var(--bg-color)" }} />}
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
               <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowUpload('today')} style={{ width: "130px", height: "130px", borderRadius: "65px", background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary), var(--secondary))", color: "white", boxShadow: "0 10px 40px rgba(56, 189, 248, 0.25)" }}>
                 {checkedIn ? <CheckCircle2 size={50} /> : <Dumbbell size={50} />}
               </motion.button>
               <h3 style={{ marginTop: "1rem", fontWeight: 800 }}>{checkedIn ? "오운완 인증 완료!" : "운동 인증샷 올리기"}</h3>
            </section>

            <section style={{ padding: "0 1.25rem" }}>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                 {attendance.map((day, i) => (
                   <motion.div key={i} whileTap={{ scale: 0.95 }} onClick={() => setSelectedDay(day)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.75rem 0", borderRadius: "1rem", border: day.status === 'rejected' ? "1px solid var(--error)" : "1px solid var(--glass-border)", background: day.status === 'rejected' ? "rgba(239, 68, 68, 0.05)" : "transparent", cursor: "pointer", opacity: day.status === 'none' ? 0.3 : 1 }}>
                     <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{day.day}</span>
                     {day.status === 'approved' ? <CheckCircle2 size={16} color="var(--success)" /> : 
                      day.status === 'rejected' ? <AlertCircle size={16} color="var(--error)" /> : 
                      day.status === 'pending' ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}><RefreshCw size={14} color="var(--primary)" /></motion.div> :
                      <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{day.date}</span>}
                   </motion.div>
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

        {/* --- Social, Profile & My Tabs --- */}
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

        {activeTab === "my" && (
           <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column" }}>
              <ProfileHeader name={currentUser?.isAdmin ? "관리자" : currentUser?.name} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", borderTop: "1px solid var(--glass-border)" }}>
                 {posts.filter(p => p.user.name === (currentUser?.isAdmin ? "관리자" : currentUser?.name)).map(p => (
                    <div key={p.id} style={{ aspectRatio: "1/1", background: "#f0f0f0" }}><img src={p.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                 ))}
                 {posts.filter(p => p.user.name === (currentUser?.isAdmin ? "관리자" : currentUser?.name)).length === 0 && (
                    <div style={{ gridColumn: "span 3", padding: "4rem 2rem", textAlign: "center", opacity: 0.3 }}>
                       <ImageIcon size={48} style={{ marginBottom: "1rem" }} />
                       <p>첫 인증샷을 올려보세요!</p>
                    </div>
                 )}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 Enhanced Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", zIndex: 1000 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "300px", background: "var(--card-bg)", zIndex: 1001, padding: "2.5rem 2rem", display: "flex", flexDirection: "column" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <h2 style={{ fontWeight: 900, fontSize: "1.4rem" }}>전체 메뉴</h2>
                  <X size={26} style={{ cursor: "pointer", opacity: 0.5 }} onClick={() => setIsMenuOpen(false)} />
               </div>
               <nav style={{ display: "flex", flexDirection: "column", gap: "0.8rem", flex: 1 }}>
                  {currentUser?.isAdmin && (
                    <div onClick={() => { setMenuView("admin_approval"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)", cursor: "pointer" }}>
                       <ShieldCheck size={22} color="var(--primary)" /> <span style={{ fontWeight: 800, color: "var(--primary)" }}>관리자 승인 대기물</span>
                    </div>
                  )}
                  <div onClick={() => { setMenuView("penalty"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <CreditCard size={22} color="var(--primary)" /> <span style={{ fontWeight: 800 }}>벌금 관리</span>
                  </div>
                  <div onClick={() => { setMenuView("ledger"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <BookOpen size={22} color="var(--secondary)" /> <span style={{ fontWeight: 800 }}>장부 (벌금 현황)</span>
                  </div>
               </nav>
               <button onClick={handleLogout} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "0.8rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(239, 68, 68, 0.05)", color: "var(--error)", fontWeight: 800, cursor: "pointer", border: "none" }}>
                  <LogOut size={22} /> 로그아웃
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🔵 Menu Detail & Approval Views */}
      <AnimatePresence>
        {menuView === "admin_approval" && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2000, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}><ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} /> <h2 style={{ fontSize: "1.3rem", fontWeight: 900 }}>승인 대기 목록 📥</h2></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
                 {pendingApprovals.map(item => (
                    <div key={item.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                       <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)" }}>
                          <div><span style={{ fontWeight: 900 }}>{item.user}</span> <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>{item.type} ({item.date})</span></div>
                       </div>
                       {item.imageUrl && <img src={item.imageUrl} alt="proof" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />}
                       {item.reason && <div style={{ padding: "1.25rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.02)" }}>{item.reason}</div>}
                       <div style={{ padding: "1rem", display: "flex", gap: "0.8rem" }}>
                          <button onClick={() => startReject(item.id)} style={{ flex: 1, padding: "0.8rem", borderRadius: "0.8rem", border: "1px solid var(--error)", color: "var(--error)", fontWeight: 800, fontSize: "0.85rem" }}>반려하기</button>
                          <button onClick={() => handleApprove(item.id)} style={{ flex: 1, padding: "0.8rem", borderRadius: "0.8rem", background: "var(--primary)", color: "white", fontWeight: 800, fontSize: "0.85rem" }}>승인 완료</button>
                       </div>
                    </div>
                 ))}
                 {pendingApprovals.length === 0 && (
                   <div style={{ textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>
                      <CheckCircle2 size={48} style={{ margin: "0 auto 1rem" }} />
                      <p>모든 승인이 완료되었습니다!</p>
                   </div>
                 )}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 Day Detail Modal (For Re-submission) */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card" style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>{selectedDay.day}요일 인증 현황</h3>
                  <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setSelectedDay(null)} />
               </div>
               
               {selectedDay.status === 'approved' ? (
                 <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ width: "4rem", height: "4rem", borderRadius: "50%", background: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}><Check size={32} color="white" /></div>
                    <p style={{ fontWeight: 800, color: "var(--success)" }}>최종 승인된 기록입니다.</p>
                 </div>
               ) : selectedDay.status === 'rejected' ? (
                 <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ padding: "1.25rem", background: "rgba(239, 68, 68, 0.05)", borderRadius: "1rem", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--error)", marginBottom: "0.5rem" }}><AlertCircle size={18} /> <span style={{ fontWeight: 800 }}>반려 사유</span></div>
                       <p style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.8 }}>{selectedDay.reason}</p>
                    </div>
                    {selectedDay.imageUrl && <img src={selectedDay.imageUrl} alt="rejected" style={{ width: "100%", borderRadius: "1rem", aspectRatio: "16/9", objectFit: "cover", filter: "grayscale(100%) opacity(0.5)" }} />}
                    <button onClick={() => setShowUpload(selectedDay.day)} className="btn-primary" style={{ padding: "1.1rem", borderRadius: "1.25rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}><RefreshCw size={18} /> 사진 재제출하기</button>
                 </div>
               ) : selectedDay.status === 'pending' ? (
                 <div style={{ textAlign: "center", padding: "2rem" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }} style={{ margin: "0 auto 1.5rem" }}><RefreshCw size={40} color="var(--primary)" /></motion.div>
                    <p style={{ fontWeight: 800 }}>관리자가 사진을 검토 중입니다.</p>
                    <p style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: "0.5rem" }}>조금만 기다려 주세요!</p>
                 </div>
               ) : (
                 <div style={{ textAlign: "center", padding: "1rem" }}>
                    <ImageIcon size={40} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                    <p style={{ opacity: 0.5 }}>아직 등록된 기록이 없습니다.</p>
                    <button onClick={() => setShowUpload(selectedDay.day)} className="btn-primary" style={{ padding: "1rem 2rem", borderRadius: "1.25rem", fontWeight: 800, marginTop: "1.5rem" }}>인증샷 올리기</button>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟠 Reject Reason Input Modal (Admin) */}
      <AnimatePresence>
        {rejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div className="card" style={{ width: "100%", maxWidth: "360px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <h3 style={{ fontWeight: 900 }}>반려 사유 입력</h3>
               <textarea value={rejectReasonInput} onChange={(e) => setRejectReasonInput(e.target.value)} placeholder="반려 사유를 상세하게 작성해 주세요 (예: 헬스장 사진이 아님)" style={{ width: "100%", height: "120px", background: "rgba(0,0,0,0.03)", borderRadius: "1rem", padding: "1rem", border: "none" }} />
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setRejectId(null)} style={{ flex: 1, padding: "0.8rem", fontWeight: 800, opacity: 0.5 }}>취소</button>
                  <button onClick={confirmReject} disabled={!rejectReasonInput} style={{ flex: 1, padding: "0.8rem", borderRadius: "1rem", background: "var(--error)", color: "white", fontWeight: 800 }}>반려 확정</button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟠 General Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card" style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>[{showUpload === 'today' ? '오늘' : showUpload + '요일'}] 인증샷 올리기</h3>
               <div style={{ width: "100%", aspectRatio: "1/1", border: "2px dashed var(--glass-border)", borderRadius: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={48} style={{ opacity: 0.3 }} /></div>
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setShowUpload(null)} style={{ flex: 1, padding: "1rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.05)", fontWeight: 800 }}>취소</button>
                  <button onClick={handleUpload} className="btn-primary" style={{ flex: 1, borderRadius: "1.25rem", fontWeight: 800 }}>인증 완료</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast & Nav (Restored & Preserved) */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 100, x: "-50%", opacity: 0 }} style={{ position: "fixed", bottom: "7.5rem", left: "50%", background: "rgba(0,0,0,0.85)", color: "white", padding: "1rem 2rem", borderRadius: "2.5rem", zIndex: 4000, fontWeight: 800, fontSize: "0.95rem" }}>{toast}</motion.div>
        )}
      </AnimatePresence>
      <nav className="glass" style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 2.5rem)", maxWidth: "420px", height: "4.8rem", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, borderRadius: "2.5rem", background: isLightMode ? "rgba(255,255,255,0.92)" : "rgba(15, 23, 42, 0.85)" }}>
        {[ { id: "home", icon: <HomeIcon size={24} />, label: "홈" }, { id: "social", icon: <Users size={24} />, label: "피드" }, { id: "my", icon: <User size={24} />, label: "마이" } ].map(it => (
          <button key={it.id} onClick={() => {setActiveTab(it.id); setSelectedProfile(null); window.scrollTo(0,0); setMenuView(null);}} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: (activeTab === it.id || (it.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)" }}>
            {it.icon} <span style={{ fontSize: "0.65rem", fontWeight: 800 }}>{it.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
