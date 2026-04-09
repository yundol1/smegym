"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft
} from "lucide-react";

// --- MOCK DATA ---
const MOCK_POSTS = [
  {
    id: 1,
    user: { name: "도니 전사", avatar: "DN" },
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop",
    content: "오늘 하체 조졌습니다! 스쿼트 100kg 달성 💪",
    date: "어제",
    likes: 24,
    comments: [
      { user: "헬스초보", text: "대단하시네요! 저도 열심히 해야겠어요." },
      { user: "근성왕", text: "득근하세요!" }
    ],
    liked: true
  },
  {
    id: 2,
    user: { name: "헬스왕", avatar: "HW" },
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop",
    content: "단백질 식단 공유합니다. 닭가슴살 샐러드 맛도리네요.",
    date: "2일 전",
    likes: 12,
    comments: [],
    liked: false
  }
];

const MOCK_MEMBERS = [
  { id: 1, name: "돌콩님", avatar: "DK", weekly: 2, monthly: 12, yearly: 148 },
  { id: 2, name: "도니 전사", avatar: "DN", weekly: 3, monthly: 15, yearly: 120 },
  { id: 3, name: "헬스왕", avatar: "HW", weekly: 1, monthly: 10, yearly: 200 },
  { id: 4, name: "눈곰", avatar: "NG", weekly: 2, monthly: 11, yearly: 95 },
  { id: 5, name: "돌맹", avatar: "DM", weekly: 3, monthly: 14, yearly: 110 }
];

const weekDays = [
  { day: '월', date: '6', status: '인정' },
  { day: '화', date: '7', status: '대기' },
  { day: '수', date: '8', status: '인정' },
  { day: '목', date: '9', status: 'selected' },    
  { day: '금', date: '10', status: '대기' },
  { day: '토', date: '11', status: '대기' },
  { day: '일', date: '12', status: '대기' },
];

export default function Home() {
  const [isLightMode, setIsLightMode] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [workoutCount, setWorkoutCount] = useState(2);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [rankingPeriod, setRankingPeriod] = useState("monthly"); // Default to monthly
  
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const penalty = Math.max(0, 3 - workoutCount) * 2000;

  useEffect(() => {
    if (isLightMode) document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [isLightMode]);

  // Seamless Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      if (activeTab !== "home") return;
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 50; 
      
      if (scrollPosition >= threshold) {
        // Natural transition to Social/Feed
        setTimeout(() => setActiveTab("social"), 100);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab]);

  const handleUpload = () => {
    if (checkedIn) {
      setShowUpload(false);
      return;
    }
    const newPost = {
      id: posts.length + 1,
      user: { name: "돌콩님", avatar: "DK" },
      imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop",
      content: "오늘 운동 인증샷! 모두 득근하세요 🔥",
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

  const getSortedRankings = () => {
    return [...MOCK_MEMBERS].sort((a: any, b: any) => b[rankingPeriod] - a[rankingPeriod]);
  };

  const getGaugeColor = (value: number, period: string) => {
    const max = period === "weekly" ? 3 : period === "monthly" ? 12 : 150;
    const percent = (value / max) * 100;
    if (percent >= 100) return "var(--success)";
    if (percent >= 50) return "var(--warning)";
    return "var(--primary)";
  };

  return (
    <main style={{ padding: "1.5rem 0 7rem 0", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      
      {/* 🔴 Top Sticky Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>SME CLUB</h1>
          <span style={{ fontSize: "0.75rem", opacity: 0.4 }}>4월 2주차</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
           <div onClick={() => setIsLightMode(!isLightMode)} style={{ width: "40px", height: "20px", borderRadius: "10px", background: isLightMode ? "#e0e7ff" : "#334155", position: "relative", cursor: "pointer" }}>
            <motion.div animate={{ x: isLightMode ? 2 : 22 }} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isLightMode ? <Sun size={10} color="#f59e0b" /> : <Moon size={10} color="#3b82f6" />}
            </motion.div>
          </div>
          <Menu size={22} style={{ opacity: 0.6 }} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* --- HOME TAB --- */}
        {activeTab === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            
            {/* Dashboard Stats */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="card" style={{ padding: "1.5rem", border: penalty > 0 ? "1px solid var(--warning)" : "1px solid var(--success)" }}>
                 <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.5rem" }}>이번 주 벌금</div>
                 <div style={{ fontSize: "1.5rem", fontWeight: 800, color: penalty > 0 ? "var(--warning)" : "var(--success)" }}>
                   {penalty === 0 ? "0원 🎉" : `${penalty.toLocaleString()}원`}
                 </div>
              </div>
              <div className="card" style={{ padding: "1.5rem" }}>
                 <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.5rem" }}>현재 달성 횟수</div>
                 <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                   {workoutCount}<span style={{ fontSize: "1rem", opacity: 0.3 }}> / 3회</span>
                 </div>
              </div>
            </section>

            {/* Central Check-in Button */}
            <section style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
               <motion.button
                 whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                 onClick={() => setShowUpload(true)}
                 style={{
                   width: "150px", height: "150px", borderRadius: "75px",
                   background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                   color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                   boxShadow: checkedIn ? "0 0 30px var(--success)" : "0 8px 30px rgba(56, 189, 248, 0.3)",
                   transition: "all 0.5s ease"
                 }}
               >
                 {checkedIn ? <CheckCircle2 size={60} /> : <Dumbbell size={50} />}
               </motion.button>
               <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{checkedIn ? "운동 인증을 완료했습니다!" : "사진으로 운동 인증하기"}</h3>
            </section>

            {/* Weekly Calendar Section */}
            <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>이번 주 진행 현황 <Check size={16} color="var(--primary)" /></h3>
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                 {weekDays.map((wd, i) => (
                   <div key={i} style={{ 
                     display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.75rem 0",
                     background: wd.status === 'selected' ? "rgba(56, 189, 248, 0.08)" : "var(--card-bg)",
                     borderRadius: "1rem", border: wd.status === 'selected' ? "1px solid var(--primary)" : "1px solid var(--glass-border)",
                     opacity: wd.status === '인정' || wd.status === 'selected' ? 1 : 0.4
                   }}>
                     <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{wd.day}</span>
                     {wd.status === '인정' ? <CheckCircle2 size={16} color="var(--success)" /> : <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>{wd.date}</span>}
                   </div>
                 ))}
               </div>
            </section>

            {/* SME MEMBER RANKING (Leaderboard) */}
            <section className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>SME 열정 랭킹 🏆</h3>
                  {/* Period Selector Tabs */}
                  <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", padding: "0.2rem", borderRadius: "10px" }}>
                    {["weekly", "monthly", "yearly"].map(p => (
                      <button 
                        key={p} onClick={() => setRankingPeriod(p)}
                        style={{ padding: "0.3rem 0.6rem", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 700, background: rankingPeriod === p ? "white" : "transparent", color: rankingPeriod === p ? "var(--primary)" : "inherit", transition: "0.2s" }}
                      >
                        {p === 'weekly' ? '주간' : p === 'monthly' ? '월간' : '연간'}
                      </button>
                    ))}
                  </div>
               </div>

               <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {getSortedRankings().map((member: any, i) => (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                       {/* Rank Number */}
                       <div style={{ width: "1.5rem", fontWeight: 800, fontSize: "1.1rem", color: i < 3 ? "var(--accent)" : "inherit", textAlign: "center" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                       </div>
                       <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 800 }}>
                         {member.avatar}
                       </div>
                       <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{member.name}</span>
                             <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>{member[rankingPeriod]}회</span>
                          </div>
                          {/* Gauge Bar */}
                          <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, (member[rankingPeriod] / (rankingPeriod === 'weekly' ? 3 : rankingPeriod === 'monthly' ? 12 : 150)) * 100)}%` }}
                               style={{ height: "100%", background: getGaugeColor(member[rankingPeriod], rankingPeriod) }}
                             />
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* Bottom Invitation */}
            <div style={{ textAlign: "center", paddingBottom: "2rem", opacity: 0.3, fontSize: "0.8rem" }}>
               ↓ 아래로 더 스크롤하여 팀원들의 인증샷 확인
            </div>
          </motion.div>
        )}

        {/* --- SOCIAL FEED TAB --- */}
        {activeTab === "social" && (
           <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>실시간 피드</h2>
                 <Plus size={24} onClick={() => setShowUpload(true)} />
              </div>
              {posts.map(post => (
                <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                  <div 
                    onClick={() => { setSelectedProfile(post.user); setActiveTab("profile"); }}
                    style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
                  >
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>{post.user.avatar}</div>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{post.user.name}</span>
                  </div>
                  <img src={post.imageUrl} alt="feed" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
                  <div style={{ padding: "1rem" }}>
                     <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}><Heart size={24} /> <MessageCircle size={24} /> <Share2 size={24} style={{ marginLeft: "auto" }} /></div>
                     <p style={{ fontSize: "0.9rem" }}><span style={{ fontWeight: 800, marginRight: "0.5rem" }}>{post.user.name}</span>{post.content}</p>
                  </div>
                </article>
              ))}
           </motion.div>
        )}

        {/* --- PROFILE DETAIL VIEW --- */}
        {activeTab === "profile" && (
           <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                 <ArrowLeft onClick={() => setActiveTab("social")} style={{ cursor: "pointer" }} />
                 <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{selectedProfile?.name} 갤러리</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px" }}>
                 {posts.filter(p => p.user.name === selectedProfile?.name).map(p => (
                    <div key={p.id} style={{ aspectRatio: "1/1", background: "#f0f0f0" }}>
                       <img src={p.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                 ))}
              </div>
           </motion.div>
        )}

        {/* --- MY INFO TAB --- */}
        {activeTab === "my" && (
           <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0 1rem", marginBottom: "2rem" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div style={{ width: "5rem", height: "5rem", borderRadius: "50%", border: "2px solid var(--primary)", overflow: "hidden" }}>
                       <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="me" />
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem" }}>
                       <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800 }}>{posts.filter(p => p.user.name === "돌콩님").length}</div><div style={{ fontSize: "0.7rem", opacity: 0.5 }}>인증</div></div>
                       <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800 }}>48</div><div style={{ fontSize: "0.7rem", opacity: 0.5 }}>누적</div></div>
                    </div>
                 </div>
                 <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>돌콩님</h2>
                 <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>SME 클럽 관리자 | 헬스 & 테크</p>
              </div>
              <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px" }}>
                    {posts.filter(p => p.user.name === "돌콩님").map(p => (
                       <div key={p.id} style={{ aspectRatio: "1/1", background: "#f0f0f0" }}>
                          <img src={p.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       </div>
                    ))}
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 Fixed Bottom Navigation */}
      <nav className="glass" style={{ 
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 3rem)", maxWidth: "420px", height: "4.5rem",
        display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, borderRadius: "2.5rem",
        background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(15, 23, 42, 0.8)"
      }}>
        {[
          { id: "home", icon: <HomeIcon size={24} />, label: "홈" },
          { id: "social", icon: <Users size={24} />, label: "피드" },
          { id: "my", icon: <User size={24} />, label: "마이" }
        ].map(it => (
          <button key={it.id} onClick={() => {setActiveTab(it.id); setSelectedProfile(null); window.scrollTo(0,0);}} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", color: (activeTab === it.id || (it.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)" }}>
            {it.icon} <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{it.label}</span>
          </button>
        ))}
      </nav>

      {/* Global Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>운동 인증샷 올리기</h3>
               <div style={{ width: "100%", aspectRatio: "1/1", border: "2px dashed var(--glass-border)", borderRadius: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={48} style={{ opacity: 0.3 }} /></div>
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "0.8rem", borderRadius: "1rem", background: "rgba(0,0,0,0.05)" }}>취소</button>
                  <button onClick={handleUpload} className="btn-primary" style={{ flex: 1, borderRadius: "1rem" }}>인증 완료</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
