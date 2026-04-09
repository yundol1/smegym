"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft
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
  },
  {
    id: 3,
    user: { name: "눈곰", avatar: "NG" },
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop",
    content: "오운완! 상체 위주로 털어봤습니다.",
    date: "3일 전",
    likes: 18,
    comments: [],
    liked: false
  }
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
  
  // Profile Search State
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const penalty = Math.max(0, 3 - workoutCount) * 2000;

  useEffect(() => {
    if (isLightMode) document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [isLightMode]);

  const handleUpload = () => {
    if (checkedIn) {
      setShowUpload(false);
      return;
    }
    
    // Create new post
    const newPost = {
      id: posts.length + 1,
      user: { name: "돌콩님", avatar: "DK" },
      imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop",
      content: "오늘 운동 드디어 성공! 사진으로 인증합니다. 💪",
      date: "방금 전",
      likes: 0,
      comments: [],
      liked: false
    };

    setPosts([newPost, ...posts]);
    setCheckedIn(true);
    setWorkoutCount(prev => prev + 1);
    setShowUpload(false);
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

  const openProfile = (user: any) => {
    setSelectedProfile(user);
    setActiveTab("profile");
  };

  // Helper to render user gallery grid
  const renderGalleryGrid = (userName: string) => {
    const userPosts = posts.filter(p => p.user.name === userName);
    if (userPosts.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "4rem 2rem", opacity: 0.3 }}>
           <ImageIcon size={48} style={{ margin: "0 auto 1rem auto" }} />
           <p>아직 업로드된 사진이 없습니다.</p>
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px", marginTop: "1rem" }}>
        {userPosts.map(post => (
          <div key={post.id} style={{ aspectRatio: "1/1", overflow: "hidden", background: "#eee" }}>
            <img src={post.imageUrl} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
        {/* Fillers for UI consistency if needed */}
        {userPosts.length < 9 && Array(9 - userPosts.length).fill(0).map((_, i) => (
           <div key={`fill-${i}`} style={{ aspectRatio: "1/1", background: "rgba(128,128,128,0.05)" }} />
        ))}
      </div>
    );
  };

  return (
    <main style={{ padding: "1.5rem 0 7rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* 🟢 Fixed Top Branding & Theme Toggle */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>SME GYM</h1>
          <span style={{ fontSize: "0.8rem", opacity: 0.4 }}>4월 2주차</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
           <div 
            onClick={() => setIsLightMode(!isLightMode)}
            style={{ 
              width: "40px", height: "20px", borderRadius: "10px", 
              background: isLightMode ? "#cbd5e1" : "#334155", 
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
          <Menu size={22} style={{ opacity: 0.6 }} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* --- HOME TAB --- */}
        {activeTab === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* Profile Brief */}
            <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                 <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", background: "#ccc", overflow: "hidden", border: "2px solid var(--primary)" }}>
                   <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="me" />
                 </div>
                 <div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>반가워요, 돌콩님 👋</h2>
                    <p style={{ fontSize: "0.8rem", opacity: 0.5 }}>오늘의 활기찬 운동을 시작해볼까요?</p>
                 </div>
              </div>
            </section>

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

            {/* Central Giant Upload/Check-in Button */}
            <section style={{ textAlign: "center", padding: "1rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setShowUpload(true)}
                 style={{
                   width: "160px", height: "160px", borderRadius: "80px",
                   background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                   color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                   boxShadow: checkedIn ? "0 0 30px var(--success)" : "0 10px 30px rgba(56, 189, 248, 0.3)",
                   transition: "all 0.5s ease"
                 }}
               >
                 {checkedIn ? <CheckCircle2 size={70} /> : <Dumbbell size={60} />}
               </motion.button>
               <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{checkedIn ? "운동 인증을 완료했습니다!" : "사진으로 운동 인증하기"}</h3>
                  <p style={{ fontSize: "0.85rem", opacity: 0.5, marginTop: "0.4rem" }}>
                    오운완 사진을 업로드하면 벌금이 즉시 차감됩니다
                  </p>
               </div>
            </section>

            {/* Weekly Progress Bar */}
            <section style={{ background: "rgba(56, 189, 248, 0.05)", padding: "1.25rem", borderRadius: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.85rem", fontWeight: 700 }}>
                  <span>주간 목표 달성률</span>
                  <span style={{ color: "var(--primary)" }}>{Math.round((workoutCount / 3) * 100)}%</span>
               </div>
               <div style={{ width: "100%", height: "8px", background: "var(--glass-border)", borderRadius: "4px", overflow: "hidden" }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (workoutCount / 3) * 100)}%` }}
                    style={{ height: "100%", background: "var(--primary)" }}
                  />
               </div>
            </section>
          </motion.div>
        )}

        {/* --- SOCIAL FEED TAB --- */}
        {activeTab === "social" && (
          <motion.div
            key="social"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>소셜 피드</h2>
               <Plus size={24} onClick={() => setShowUpload(true)} style={{ cursor: "pointer" }} />
            </div>

            {posts.map(post => (
              <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                 {/* Feed User Info (Clickable) */}
                 <div 
                  onClick={() => openProfile(post.user)}
                  style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>
                      {post.user.avatar}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{post.user.name}</div>
                    <span style={{ marginLeft: "auto", fontSize: "0.75rem", opacity: 0.4 }}>{post.date}</span>
                 </div>
                 
                 <div style={{ width: "100%", aspectRatio: "1/1", background: "#f0f0f0" }}>
                   <img src={post.imageUrl} alt="img" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                 </div>

                 <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "1.25rem" }}>
                       <button onClick={() => toggleLike(post.id)} style={{ color: post.liked ? "var(--error)" : "inherit" }}>
                         <Heart size={24} fill={post.liked ? "var(--error)" : "none"} />
                       </button>
                       <MessageCircle size={24} />
                       <Share2 size={24} style={{ marginLeft: "auto" }} />
                    </div>
                    <div>
                       <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--error)" }}>좋아요 {post.likes}개</span>
                    </div>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                       <span style={{ fontWeight: 800, marginRight: "0.5rem" }}>{post.user.name}</span>
                       {post.content}
                    </p>
                    {post.comments.length > 0 && (
                       <div style={{ fontSize: "0.8rem", opacity: 0.6, cursor: "pointer" }}>
                         댓글 {post.comments.length}개 모두 보기
                       </div>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <input 
                        type="text" placeholder="댓글 달기..."
                        value={newComment[post.id] || ""}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                        style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--glass-border)", padding: "0.25rem 0", fontSize: "0.85rem", outline: "none", color: "var(--foreground)" }}
                      />
                      <Send size={18} onClick={() => addComment(post.id)} style={{ opacity: 0.5 }} />
                    </div>
                 </div>
              </article>
            ))}
          </motion.div>
        )}

        {/* --- USER PROFILE VIEW TAB --- */}
        {activeTab === "profile" && (
           <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ display: "flex", flexDirection: "column" }}
           >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                 <ArrowLeft onClick={() => setActiveTab("social")} style={{ cursor: "pointer" }} />
                 <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{selectedProfile?.name}님의 프로필</h2>
              </div>
              
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", padding: "0 1rem" }}>
                 <div style={{ width: "5rem", height: "5rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800 }}>
                   {selectedProfile?.avatar}
                 </div>
                 <div style={{ display: "flex", gap: "1.5rem" }}>
                    <div style={{ textAlign: "center" }}>
                       <div style={{ fontWeight: 800 }}>{posts.filter(p => p.user.name === selectedProfile?.name).length}</div>
                       <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>게시물</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                       <div style={{ fontWeight: 800 }}>128</div>
                       <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>팔로워</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                       <div style={{ fontWeight: 800 }}>156</div>
                       <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>팔로잉</div>
                    </div>
                 </div>
              </div>

              <div style={{ marginTop: "1.5rem", padding: "0 1rem" }}>
                 <div style={{ fontWeight: 800 }}>{selectedProfile?.name}</div>
                 <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>SME 운동 멤버 | 꾸준함이 정답이다 🔥</div>
              </div>

              <div style={{ marginTop: "2rem", borderTop: "1px solid var(--glass-border)" }}>
                 {renderGalleryGrid(selectedProfile?.name)}
              </div>
           </motion.div>
        )}

        {/* --- MY TAB --- */}
        {activeTab === "my" && (
           <motion.div
            key="my"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: "flex", flexDirection: "column" }}
           >
              <div style={{ padding: "0 1rem", marginBottom: "2.5rem" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <div style={{ width: "5rem", height: "5rem", borderRadius: "50%", border: "3px solid var(--primary)", overflow: "hidden" }}>
                       <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="me" />
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", paddingTop: "1rem" }}>
                        <div style={{ textAlign: "center" }}>
                           <div style={{ fontWeight: 800 }}>{posts.filter(p => p.user.name === "돌콩님").length}</div>
                           <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>인증</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                           <div style={{ fontWeight: 800 }}>48</div>
                           <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>누적</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                           <div style={{ fontWeight: 800, color: "var(--success)" }}>9.6만</div>
                           <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>절약</div>
                        </div>
                    </div>
                 </div>
                 <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>돌콩님</div>
                 <div style={{ fontSize: "0.85rem", marginTop: "0.25rem", opacity: 0.7 }}>SME GYM 공식 관리자 | 주 3회 운동 가즈아! 🚀</div>
                 
                 <button style={{ width: "100%", marginTop: "1.5rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--glass-border)", fontWeight: 700, fontSize: "0.85rem" }}>
                   프로필 편집
                 </button>
              </div>

              <div style={{ borderTop: "1px solid var(--glass-border)" }}>
                 <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem 0", borderBottom: "2px solid var(--foreground)" }}>
                    <ImageIcon size={20} />
                 </div>
                 {renderGalleryGrid("돌콩님")}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 Common Navigation Bar */}
      <nav className="glass" style={{ 
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 3rem)", maxWidth: "420px", height: "4.5rem",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        zIndex: 50, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", borderRadius: "2rem",
        background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15, 23, 42, 0.9)"
      }}>
        {[
          { id: "home", icon: <HomeIcon size={24} />, label: "홈" },
          { id: "social", icon: <Users size={24} />, label: "피드" },
          { id: "my", icon: <User size={24} />, label: "마이" }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSelectedProfile(null); }}
            style={{ 
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
              color: (activeTab === item.id || (item.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)",
              transition: "all 0.3s ease"
            }}
          >
            {item.icon}
            <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 🔴 Global Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="card" 
              style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem", background: "var(--card-bg)" }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{checkedIn ? "운동 인증샷 추가" : "운동 인증샷 업로드"}</h3>
              <div 
                style={{ 
                  width: "100%", aspectRatio: "1/1", border: "2px dashed var(--glass-border)", 
                  borderRadius: "1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem"
                }}
              >
                <ImageIcon size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: "0.85rem", opacity: 0.5 }}>사진을 선택해 주세요 (필수)</span>
              </div>
              <textarea 
                placeholder="오늘의 운동 소감을 남겨주세요..."
                style={{ width: "100%", height: "80px", background: "rgba(128,128,128,0.05)", border: "none", borderRadius: "12px", padding: "1rem", color: "var(--foreground)", resize: "none", outline: "none", fontSize: "0.85rem" }}
              />
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "0.8rem", borderRadius: "12px", background: "rgba(128,128,128,0.1)", fontWeight: 700 }}>취소</button>
                <button onClick={handleUpload} className="btn-primary" style={{ flex: 1, borderRadius: "12px" }}>
                  {checkedIn ? "추가 업로드" : "인증 완료하기"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
