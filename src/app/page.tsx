"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus
} from "lucide-react";

// Mock Data for Social Feed
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

const MOCK_GALLERY = [
  { id: 1, user: "눈곰", imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=500&auto=format&fit=crop" },
  { id: 2, user: "돌맹", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=500&auto=format&fit=crop" },
  { id: 3, user: "목우", imageUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=500&auto=format&fit=crop" },
  { id: 4, user: "돌콩", imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=500&auto=format&fit=crop" },
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
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [showConfetti, setShowConfetti] = useState(false);

  const penalty = Math.max(0, 3 - workoutCount) * 2000;

  useEffect(() => {
    if (isLightMode) document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [isLightMode]);

  const handleCheckIn = () => {
    if (checkedIn) return;
    setCheckedIn(true);
    setWorkoutCount(prev => prev + 1);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const toggleLike = (postId: number) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
          liked: !post.liked
        };
      }
      return post;
    }));
  };

  const addComment = (postId: number) => {
    if (!newComment[postId]) return;
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, { user: "나", text: newComment[postId] }]
        };
      }
      return post;
    }));
    setNewComment(prev => ({ ...prev, [postId]: "" }));
  };

  return (
    <main style={{ padding: "1.5rem 0 7rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* 🔴 Top Sticky Header (Common) */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary)" }}>
            4월 2주차 (6일~12일)
          </h2>
          <RefreshCw size={14} style={{ opacity: 0.5, cursor: "pointer" }} />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div 
            onClick={() => setIsLightMode(!isLightMode)}
            style={{ 
              width: "40px", height: "20px", borderRadius: "10px", 
              background: isLightMode ? "#e2e8f0" : "#334155", 
              position: "relative", cursor: "pointer"
            }}
          >
            <motion.div
              animate={{ x: isLightMode ? 2 : 22 }}
              style={{
                width: "16px", height: "16px", borderRadius: "50%",
                background: "white", position: "absolute", top: "2px",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {isLightMode ? <Sun size={10} color="#f59e0b" /> : <Moon size={10} color="#3b82f6" />}
            </motion.div>
          </div>
          <div style={{ position: "relative" }}>
            <Menu size={24} />
            <div style={{ position: "absolute", top: "-2px", right: "-2px", background: "var(--error)", width: "6px", height: "6px", borderRadius: "50%" }} />
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* User Info & Badge */}
            <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "#ccc", overflow: "hidden", border: "2px solid var(--primary)" }}>
                  <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="pfp" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>돌콩님</h1>
                    <span style={{ fontSize: "0.65rem", background: "var(--primary)", color: "white", padding: "0.1rem 0.4rem", borderRadius: "0.5rem" }}>관리자</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", opacity: 0.5 }}>오늘도 득근하세요! 🔥</p>
                </div>
              </div>
              <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", borderRadius: "2rem" }}> S M E 챌린지 </button>
            </section>

            {/* Notice */}
            <section className="glass" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", border: "1px solid var(--glass-border)" }}>
               <Megaphone size={16} color="var(--accent)" />
               <p style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                [공지] 서비스 속도 개선을 위한 서버 교환 작업...
               </p>
               <ChevronDown size={14} style={{ opacity: 0.4 }} />
            </section>

            {/* Big Stats Cards */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", border: penalty > 0 ? "1px solid var(--warning)" : "1px solid var(--success)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", opacity: 0.6, fontSize: "0.8rem" }}>
                  <Flame size={16} color="var(--warning)" />
                  예상 벌금
                </div>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: penalty > 0 ? "var(--warning)" : "var(--success)" }}>
                  {penalty === 0 ? "벌금 없음 🎉" : `${penalty.toLocaleString()}원`}
                </span>
              </div>
              <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", opacity: 0.6, fontSize: "0.8rem" }}>
                  <Trophy size={16} color="var(--accent)" />
                  주간 목표
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                   <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{workoutCount}</span>
                   <span style={{ fontSize: "1rem", opacity: 0.4 }}>/ 3회</span>
                </div>
              </div>
            </section>

             {/* Mega Check-in Button */}
             <section style={{ textAlign: "center", padding: "1rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleCheckIn}
                  className={`btn-primary ${checkedIn ? 'checked' : ''}`}
                  style={{
                    width: "140px", height: "140px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                    transition: "all 0.5s",
                    boxShadow: checkedIn ? "0 0 30px var(--success)" : "0 8px 25px rgba(56, 189, 248, 0.4)"
                  }}
                >
                  {checkedIn ? <CheckCircle2 size={56} /> : <Dumbbell size={48} />}
                </motion.button>
                <span style={{ fontWeight: 600, opacity: 0.8 }}>
                  {checkedIn ? "운동 인증 완료!" : "터치해서 운동 인증하기"}
                </span>
             </section>

             {/* Weekly Calendar */}
             <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>이번 주 진행 현황</h3>
                 <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600 }}>✅인정 | ⏳대기</span>
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.4rem" }}>
                 {weekDays.map((wd, i) => (
                   <div key={i} style={{ 
                     display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.6rem 0",
                     background: wd.status === 'selected' ? "rgba(56, 189, 248, 0.1)" : "transparent",
                     borderRadius: "0.75rem", border: wd.status === 'selected' ? "1px solid var(--primary)" : "1px solid var(--glass-border)",
                     opacity: wd.status === '인정' || wd.status === 'selected' ? 1 : 0.4
                   }}>
                     <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>{wd.day}</span>
                     {wd.status === '인정' ? <CheckCircle2 size={16} color="var(--success)" /> : <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{wd.date}</span>}
                   </div>
                 ))}
               </div>
             </section>

             {/* Gallery Preview (Seamless Scroll Invitation) */}
             <section style={{ padding: "1rem", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem", background: "rgba(56, 189, 248, 0.03)", borderRadius: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>지금 SME 운동 갤러리 📸</h3>
                   <button onClick={() => setActiveTab("social")} style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>모두 보기 &gt;</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                  {MOCK_GALLERY.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setActiveTab("social")}
                      style={{ aspectRatio: "1/1", borderRadius: "0.5rem", overflow: "hidden", cursor: "pointer" }}
                    >
                      <img src={item.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: "center", opacity: 0.3, fontSize: "0.7rem", marginTop: "0.5rem" }}>
                  ↓ 아래로 스크롤하여 더 많은 이야기를 확인하세요
                </div>
             </section>
          </motion.div>
        )}

        {activeTab === "social" && (
          <motion.div
            key="social"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>소셜 피드</h2>
              <button onClick={() => setShowUpload(true)} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Plus size={16} /> 인증샷 올리기
              </button>
            </div>

            {posts.map(post => (
              <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "2.2rem", height: "2.2rem", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "0.75rem", fontWeight: 700 }}>
                    {post.user.avatar}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700 }}>{post.user.name}</h4>
                    <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>{post.date}</span>
                  </div>
                </div>
                <div style={{ width: "100%", aspectRatio: "4/5", background: "#111" }}>
                  <img src={post.imageUrl} alt="img" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                   <div style={{ display: "flex", gap: "1rem" }}>
                      <motion.button whileTap={{ scale: 0.8 }} onClick={() => toggleLike(post.id)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: post.liked ? "var(--error)" : "inherit" }}>
                        <Heart size={22} fill={post.liked ? "var(--error)" : "none"} />
                        <span style={{ fontWeight: 700 }}>{post.likes}</span>
                      </motion.button>
                      <button style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <MessageCircle size={22} />
                        <span style={{ fontWeight: 700 }}>{post.comments.length}</span>
                      </button>
                      <button style={{ marginLeft: "auto" }}><Share2 size={22} /></button>
                   </div>
                   <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, marginRight: "0.5rem" }}>{post.user.name}</span>
                      {post.content}
                   </p>
                   {/* Mini Comments Area */}
                   {post.comments.length > 0 && (
                     <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", padding: "0.75rem", background: "rgba(0,0,0,0.03)", borderRadius: "0.5rem" }}>
                        {post.comments.map((c, i) => (
                           <div key={i} style={{ fontSize: "0.8rem" }}>
                              <span style={{ fontWeight: 700 }}>{c.user}</span> {c.text}
                           </div>
                        ))}
                     </div>
                   )}
                   <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <input 
                        type="text" placeholder="댓글을 남겨주세요..." 
                        value={newComment[post.id] || ""}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                        style={{ flex: 1, background: "rgba(0,0,0,0.05)", border: "none", padding: "0.6rem 1rem", borderRadius: "1rem", fontSize: "0.85rem", outline: "none" }}
                      />
                      <button onClick={() => addComment(post.id)} style={{ color: "var(--primary)" }}><Send size={20} /></button>
                   </div>
                </div>
              </article>
            ))}
          </motion.div>
        )}

        {activeTab === "my" && (
           <motion.div key="my" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", paddingTop: "4rem" }}>
              <div style={{ width: "6rem", height: "6rem", borderRadius: "50%", background: "var(--primary)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={48} color="white" />
              </div>
              <h2 style={{ marginTop: "1rem", fontSize: "1.5rem", fontWeight: 700 }}>돌콩님</h2>
              <p style={{ opacity: 0.5 }}>SME 운동 관리자</p>
              <div className="card" style={{ marginTop: "2rem", textAlign: "left" }}>
                 <div style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between" }}>
                    <span>누적 운동 횟수</span> <span style={{ fontWeight: 700 }}>48회</span>
                 </div>
                 <div style={{ padding: "0.5rem 0", display: "flex", justifyContent: "space-between" }}>
                    <span>총 절약한 벌금</span> <span style={{ fontWeight: 700, color: "var(--success)" }}>96,000원</span>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 Navigation Bar (Common) */}
      <nav className="glass" style={{ 
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 3rem)", maxWidth: "420px", height: "4.5rem",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        zIndex: 100, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", borderRadius: "2.5rem",
        background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(15, 23, 42, 0.8)"
      }}>
        {[
          { id: "home", icon: <HomeIcon />, label: "홈" },
          { id: "social", icon: <Users />, label: "피드" },
          { id: "my", icon: <User />, label: "마이" }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{ 
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
              color: activeTab === item.id ? "var(--primary)" : "rgba(128,128,128,0.5)",
              transition: "color 0.3s"
            }}
          >
            {item.icon}
            <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Upload Modal (Overlay) */}
      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ width: "100%", maxWidth: "400px", background: "var(--card-bg)" }}>
               <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>운동 인증샷 업로드</h3>
               <div style={{ width: "100%", aspectRatio: "1/1", border: "2px dashed var(--glass-border)", borderRadius: "1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", cursor: "pointer", marginBottom: "1.5rem" }}>
                 <ImageIcon size={48} style={{ opacity: 0.3 }} />
                 <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>사진을 선택해 주세요</span>
               </div>
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "0.8rem", borderRadius: "1rem", background: "rgba(0,0,0,0.05)" }}>취소</button>
                  <button onClick={() => { setWorkoutCount(prev => prev + 1); setShowUpload(false); }} className="btn-primary" style={{ flex: 1, borderRadius: "1rem" }}>업로드 하기</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
