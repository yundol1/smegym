"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft, X, Copy, CreditCard, History, BookOpen
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
    comments: [],
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
  { id: 1, name: "돌콩님", avatar: "DK", weekly: 2, monthly: 12, yearly: 148, bio: "SME 클럽 관리자 | 헬스 & 테크 🚀" },
  { id: 2, name: "도니 전사", avatar: "DN", weekly: 3, monthly: 15, yearly: 120, bio: "득근에 진심인 전사입니다. 💪" },
  { id: 3, name: "헬스왕", avatar: "HW", weekly: 1, monthly: 10, yearly: 200, bio: "꾸준함이 진리다. 🏋️‍♂️" },
  { id: 4, name: "눈곰", avatar: "NG", weekly: 2, monthly: 11, yearly: 95, bio: "매일 조금씩 성장하기 🐻" },
  { id: 5, name: "돌맹", avatar: "DM", weekly: 3, monthly: 14, yearly: 110, bio: "운동 초보 탈출기!" }
];

const LAST_WEEK_DAYS = [
  { day: '월', status: '인정' },
  { day: '화', status: '인정' },
  { day: '수', status: '미흡' },
  { day: '목', status: '미흡' },
  { day: '금', status: '미흡' },
  { day: '토', status: '인정' },
  { day: '일', status: '미흡' },
];

const MOCK_LEDGER = [
  { id: 1, name: "돌콩님", amount: 4000, date: "24.04.01", status: "납부완료" },
  { id: 2, name: "헬스왕", amount: 6000, date: "24.04.01", status: "미납" },
  { id: 3, name: "눈곰", amount: 2000, date: "24.03.25", status: "납부완료" },
  { id: 4, name: "돌맹", amount: 2000, date: "24.03.25", status: "납부완료" },
];

const CURRENT_WEEK_DAYS = [
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
  const [rankingPeriod, setRankingPeriod] = useState("monthly");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Menu & Penalty State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<string | null>(null); // 'penalty' or 'ledger'
  const [toast, setToast] = useState<string | null>(null);

  const penalty = Math.max(0, 3 - workoutCount) * 2000;
  const lastWeekWorkoutCount = LAST_WEEK_DAYS.filter(d => d.status === '인정').length;
  const lastWeekPenalty = Math.max(0, 3 - lastWeekWorkoutCount) * 2000;

  useEffect(() => {
    if (isLightMode) document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [isLightMode]);

  // Toast Timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const copyAccount = () => {
    const account = "카카오뱅크 7942-19-81948";
    navigator.clipboard.writeText(account);
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

  const ProfileHeader = ({ name }: { name: string }) => {
    const member = MOCK_MEMBERS.find(m => m.name === name) || MOCK_MEMBERS[0];
    const userPosts = posts.filter(p => p.user.name === name);
    return (
      <div style={{ padding: "0 1.25rem", marginBottom: "1.5rem" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2rem" }}>
            <div style={{ width: "5.5rem", height: "5.5rem", borderRadius: "50%", background: "var(--secondary)", border: "3px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 800, color: "white", overflow: "hidden" }}>
               {name === "돌콩님" ? <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : member.avatar}
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

  return (
    <main style={{ padding: "1.5rem 0 7rem 0", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      
      {/* 🟢 Top Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1.25rem" }}>
        <h1 onClick={() => setActiveTab("home")} style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)", cursor: "pointer" }}>SME CLUB</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
           <div onClick={() => setIsLightMode(!isLightMode)} style={{ width: "40px", height: "20px", borderRadius: "10px", background: isLightMode ? "#e0e7ff" : "#334155", position: "relative", cursor: "pointer" }}>
            <motion.div animate={{ x: isLightMode ? 2 : 22 }} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "white", position: "absolute", top: "2px" }} />
          </div>
          <Menu size={24} style={{ opacity: 0.6, cursor: "pointer" }} onClick={() => setIsMenuOpen(true)} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* --- HOME TAB --- */}
        {activeTab === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", padding: "0 1.25rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}>
                 <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>이번 주 벌금</div>
                 <div style={{ fontSize: "1.5rem", fontWeight: 800, color: penalty > 0 ? "var(--warning)" : "var(--success)" }}>{penalty === 0 ? "0원" : `${penalty.toLocaleString()}원`}</div>
              </div>
              <div className="card" style={{ padding: "1.5rem" }}>
                 <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>달성 횟수</div>
                 <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{workoutCount} / 3</div>
              </div>
            </section>
            
            <section style={{ textAlign: "center" }}>
               <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowUpload(true)} style={{ width: "140px", height: "140px", borderRadius: "70px", background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary), var(--secondary))", color: "white" }}>
                 {checkedIn ? <CheckCircle2 size={50} /> : <Dumbbell size={50} />}
               </motion.button>
               <h3 style={{ marginTop: "1rem" }}>{checkedIn ? "인증 성공!" : "운동 인증하기"}</h3>
            </section>

            <section style={{ padding: "0 1.25rem" }}>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                 {CURRENT_WEEK_DAYS.map((wd, i) => (
                   <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.75rem 0", borderRadius: "1rem", border: "1px solid var(--glass-border)", opacity: wd.status === '인정' || wd.status === 'selected' ? 1 : 0.4 }}>
                     <span style={{ fontSize: "0.6rem" }}>{wd.day}</span>
                     {wd.status === '인정' ? <CheckCircle2 size={16} color="var(--success)" /> : <span style={{ fontWeight: 800 }}>{wd.date}</span>}
                   </div>
                 ))}
               </div>
            </section>

            <section className="card" style={{ margin: "0 1.25rem", padding: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontWeight: 800 }}>SME 열정 랭킹 🏆</h3>
                  <div style={{ display: "flex", gap: "0.4rem", background: "rgba(0,0,0,0.05)", padding: "0.2rem", borderRadius: "8px" }}>
                    {["weekly", "monthly", "yearly"].map(p => (
                      <button key={p} onClick={() => setRankingPeriod(p)} style={{ padding: "0.3rem 0.6rem", borderRadius: "6px", fontSize: "0.6rem", fontWeight: 700, background: rankingPeriod === p ? "white" : "transparent" }}>
                        {p === 'weekly' ? '주간' : p === 'monthly' ? '월간' : '연간'}
                      </button>
                    ))}
                  </div>
               </div>
               {[...MOCK_MEMBERS].sort((a,b) => (b as any)[rankingPeriod] - (a as any)[rankingPeriod]).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                     <span style={{ width: "1.2rem", fontWeight: 800 }}>{i < 3 ? ["🥇","🥈","🥉"][i] : i+1}</span>
                     <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>{m.avatar}</div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                           <span>{m.name}</span><span>{(m as any)[rankingPeriod]}회</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(0,0,0,0.05)", borderRadius: "2px", marginTop: "4px" }}>
                           <div style={{ width: `${Math.min(100, ((m as any)[rankingPeriod] / (rankingPeriod === 'weekly' ? 3 : 15)) * 100)}%`, height: "100%", background: "var(--primary)", borderRadius: "2px" }} />
                        </div>
                     </div>
                  </div>
               ))}
            </section>
          </motion.div>
        )}

        {/* --- SOCIAL FEED TAB --- */}
        {activeTab === "social" && (
           <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h2 style={{ padding: "0 1.25rem", fontSize: "1.5rem", fontWeight: 800 }}>실시간 피드</h2>
              {posts.map(post => (
                <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                  <div onClick={() => { setSelectedProfile(post.user); setActiveTab("profile"); }} style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
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
           <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0 1.25rem", marginBottom: "1rem" }}><ArrowLeft onClick={() => setActiveTab("social")} style={{ cursor: "pointer" }} /></div>
              <ProfileHeader name={selectedProfile?.name} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", borderTop: "1px solid var(--glass-border)" }}>
                 {posts.filter(p => p.user.name === selectedProfile?.name).map(p => (
                    <div key={p.id} style={{ aspectRatio: "1/1", background: "#f0f0f0" }}><img src={p.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                 ))}
              </div>
           </motion.div>
        )}

        {/* --- MY INFO TAB --- */}
        {activeTab === "my" && (
           <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column" }}>
              <ProfileHeader name="돌콩님" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", borderTop: "1px solid var(--glass-border)" }}>
                 {posts.filter(p => p.user.name === "돌콩님").map(p => (
                    <div key={p.id} style={{ aspectRatio: "1/1", background: "#f0f0f0" }}><img src={p.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                 ))}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "300px", background: "var(--card-bg)", zIndex: 1001, padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontWeight: 800 }}>전체 메뉴</h2>
                  <X size={24} style={{ cursor: "pointer" }} onClick={() => setIsMenuOpen(false)} />
               </div>
               <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div onClick={() => { setMenuView("penalty"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "1rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <CreditCard size={20} color="var(--primary)" />
                     <span style={{ fontWeight: 700 }}>벌금 관리</span>
                  </div>
                  <div onClick={() => { setMenuView("ledger"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "1rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <BookOpen size={20} color="var(--secondary)" />
                     <span style={{ fontWeight: 700 }}>장부 (벌금 현황)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", opacity: 0.3 }}>
                     <History size={20} />
                     <span style={{ fontWeight: 700 }}>누적 랭킹 히스토리</span>
                  </div>
               </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🔵 Menu Detail Views (Modals) */}
      <AnimatePresence>
        {menuView === "penalty" && (
           <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2000, padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>지난 주 벌금 정산</h2>
              </div>
              <div className="card" style={{ padding: "1.5rem" }}>
                 <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "1rem" }}>지난 주 운동 기록 (목표 3회)</p>
                 <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                   {LAST_WEEK_DAYS.map((wd, i) => (
                     <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                       <span style={{ fontSize: "0.6rem" }}>{wd.day}</span>
                       <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: wd.status === '인정' ? "var(--success)" : "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                         {wd.status === '인정' ? <Check size={16} color="white" /> : <X size={16} color="var(--error)" />}
                       </div>
                     </div>
                   ))}
                 </div>
                 <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                       <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>납부할 벌금</div>
                       <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--error)" }}>{lastWeekPenalty.toLocaleString()}원</div>
                    </div>
                    <button onClick={copyAccount} className="btn-primary" style={{ padding: "0.75rem 1rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                       <Copy size={16} /> 납부하기
                    </button>
                 </div>
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.5, textAlign: "center", lineHeight: 1.6 }}>
                 계좌번호: 카카오뱅크 7942-19-81948 (김상연)<br/>
                 입금 후 관리자에게 사진을 보내주세요!
              </div>
           </motion.div>
        )}

        {menuView === "ledger" && (
           <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} style={{ position: "fixed", inset: 0, background: "var(--bg-color)", zIndex: 2000, padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>SME 벌금 장부 📖</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                 {MOCK_LEDGER.map((item) => (
                   <div key={item.id} className="card" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                         <div style={{ fontWeight: 800 }}>{item.name}</div>
                         <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{item.date} 정산</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                         <div style={{ fontWeight: 800 }}>{item.amount.toLocaleString()}원</div>
                         <div style={{ fontSize: "0.7rem", color: item.status === '납부완료' ? "var(--success)" : "var(--error)", fontWeight: 700 }}>{item.status}</div>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="card" style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid var(--primary)", padding: "1.5rem", textAlign: "center" }}>
                 <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>총 누적 벌금액</div>
                 <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.5rem" }}>144,000원</div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 100, x: "-50%", opacity: 0 }} style={{ position: "fixed", bottom: "7rem", left: "50%", background: "rgba(0,0,0,0.8)", color: "white", padding: "0.8rem 1.5rem", borderRadius: "2rem", zIndex: 3000, fontWeight: 700, fontSize: "0.9rem", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
             {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 Fixed Bottom Navigation */}
      <nav className="glass" style={{ 
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 2.5rem)", maxWidth: "420px", height: "4.5rem",
        display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, borderRadius: "2.5rem",
        background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(15, 23, 42, 0.8)"
      }}>
        {[
          { id: "home", icon: <HomeIcon size={24} />, label: "홈" },
          { id: "social", icon: <Users size={24} />, label: "피드" },
          { id: "my", icon: <User size={24} />, label: "마이" }
        ].map(it => (
          <button key={it.id} onClick={() => {setActiveTab(it.id); setSelectedProfile(null); window.scrollTo(0,0); setMenuView(null);}} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: (activeTab === it.id || (it.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)" }}>
            {it.icon} <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{it.label}</span>
          </button>
        ))}
      </nav>

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
