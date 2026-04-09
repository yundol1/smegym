"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Dumbbell,
  Flame,
  Trophy,
  ChevronRight,
  User,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Home as HomeIcon,
  Users,
  Image as ImageIcon,
  Send
} from "lucide-react";

// Mock Data for Social Feed
const MOCK_POSTS = [
  {
    id: 1,
    user: { name: "도니 전사", avatar: <User size={16} /> },
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
    user: { name: "헬스왕", avatar: <User size={16} /> },
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop",
    content: "단백질 식단 공유합니다. 닭가슴살 샐러드 맛도리네요.",
    date: "2일 전",
    likes: 12,
    comments: [],
    liked: false
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [checkedIn, setCheckedIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [showUpload, setShowUpload] = useState(false);
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});

  const handleCheckIn = () => {
    if (checkedIn) return;
    setCheckedIn(true);
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

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const progress = [true, true, false, true, false, false, false];

  return (
    <main style={{ padding: "1.5rem 0 6rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "0.875rem", opacity: 0.6, fontWeight: 400 }}>좋은 아침입니다,</h2>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>도니 전사님</h1>
        </div>
        <div className="glass" style={{ width: "2.5rem", height: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={20} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* Stats Cards */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
                  <Flame size={18} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>연속 달성</span>
                </div>
                <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>12일</span>
              </div>
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)" }}>
                  <Trophy size={18} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>레벨</span>
                </div>
                <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>실버 III</span>
              </div>
            </section>

            {/* Main Check-in Area */}
            <section className="glass" style={{ padding: "2rem", position: "relative", overflow: "hidden" }}>
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>오늘의 운동 인증</h3>
                  <p style={{ opacity: 0.6, fontSize: "0.875rem" }}>오늘도 운동 완료하셨나요?</p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCheckIn}
                  className={`btn-primary ${checkedIn ? 'checked' : ''}`}
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    background: checkedIn ? "var(--success)" : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                    transition: "background 0.5s ease",
                    boxShadow: checkedIn ? "0 0 30px rgba(34, 197, 94, 0.4)" : "0 8px 25px rgba(56, 189, 248, 0.4)"
                  }}
                >
                  {checkedIn ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                    >
                      <CheckCircle2 size={48} />
                    </motion.div>
                  ) : (
                    <Dumbbell size={40} />
                  )}
                </motion.button>

                <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  {checkedIn ? "오늘 운동 완료!" : "터치해서 인증하기"}
                </div>
              </div>
              <div style={{
                position: "absolute",
                top: "-50%",
                left: "-50%",
                width: "200%",
                height: "200%",
                background: "radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)",
                zIndex: 1
              }} />
            </section>

            {/* Weekly Progress */}
            <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>이번 주 진행 현황</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                  기록 보기 <ChevronRight size={14} />
                </span>
              </div>
              <div className="card" style={{ display: "flex", justifyContent: "space-between", padding: "1.25rem" }}>
                {days.map((day, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", opacity: 0.5, fontWeight: 600 }}>{day}</span>
                    <div style={{
                      width: "2.2rem",
                      height: "2.2rem",
                      borderRadius: "0.75rem",
                      background: progress[i] ? "var(--primary)" : "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: progress[i] ? "white" : "transparent",
                      border: "1px solid",
                      borderColor: progress[i] ? "var(--primary)" : "var(--glass-border)",
                    }}>
                      {progress[i] ? <CheckCircle2 size={16} /> : <ImageIcon size={14} style={{ opacity: 0.2 }} />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Social Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>운동 피드</h3>
              <button 
                onClick={() => setShowUpload(true)}
                className="glass" style={{ padding: "0.5rem 1rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "1rem" }}
              >
                <Plus size={18} />
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>인증하기</span>
              </button>
            </div>

            {/* Posts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {posts.map(post => (
                <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                  <div style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="glass" style={{ width: "2.2rem", height: "2.2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                      {post.user.avatar}
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>{post.user.name}</h4>
                      <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>{post.date}</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", aspectRatio: "1/1", background: "#111", overflow: "hidden" }}>
                    <img src={post.imageUrl} alt="Workout" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>

                  <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", gap: "1.25rem" }}>
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleLike(post.id)}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: post.liked ? "var(--accent)" : "inherit" }}
                      >
                        <Heart size={22} fill={post.liked ? "var(--accent)" : "none"} strokeWidth={post.liked ? 0 : 2} />
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{post.likes}</span>
                      </motion.button>
                      <button style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <MessageCircle size={22} />
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{post.comments.length}</span>
                      </button>
                      <button style={{ marginLeft: "auto" }}>
                        <Share2 size={22} />
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p style={{ fontSize: "0.875rem", lineHeight: "1.5" }}>
                        <span style={{ fontWeight: 700, marginRight: "0.5rem" }}>{post.user.name}</span>
                        {post.content}
                      </p>

                      {/* Comments List */}
                      {post.comments.length > 0 && (
                        <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.75rem" }}>
                          {post.comments.map((comment, i) => (
                            <div key={i} style={{ fontSize: "0.75rem" }}>
                              <span style={{ fontWeight: 700, marginRight: "0.4rem" }}>{comment.user}</span>
                              <span style={{ opacity: 0.8 }}>{comment.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input */}
                      <div style={{ display: "flex", mt: "0.5rem", gap: "0.5rem", alignItems: "center" }}>
                        <input 
                          type="text" 
                          placeholder="댓글 달기..."
                          value={newComment[post.id] || ""}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                          style={{ 
                            flex: 1, 
                            background: "transparent", 
                            border: "none", 
                            borderBottom: "1px solid var(--glass-border)", 
                            color: "white", 
                            fontSize: "0.875rem",
                            padding: "0.4rem 0",
                            outline: "none"
                          }}
                        />
                        <button onClick={() => addComment(post.id)} style={{ color: "var(--primary)" }}>
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="glass" style={{ 
        position: "fixed", 
        bottom: "1.5rem", 
        left: "50%", 
        transform: "translateX(-50%)",
        width: "calc(100% - 3rem)",
        maxWidth: "420px",
        height: "4.5rem",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 50,
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        borderRadius: "2rem"
      }}>
        <button 
          onClick={() => setActiveTab("home")}
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "0.4rem",
            color: activeTab === "home" ? "var(--primary)" : "rgba(255,255,255,0.3)",
            transition: "all 0.3s ease"
          }}
        >
          <HomeIcon size={24} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>홈</span>
        </button>
        <button 
          onClick={() => setActiveTab("social")}
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "0.4rem",
            color: activeTab === "social" ? "var(--primary)" : "rgba(255,255,255,0.3)",
            transition: "all 0.3s ease"
          }}
        >
          <Users size={24} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>피드</span>
        </button>
        <button 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "0.4rem",
            color: "rgba(255,255,255,0.3)"
          }}
        >
          <User size={24} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>마이</span>
        </button>
      </nav>

      {/* Upload Modal (Simple Overlay) */}
      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="card" 
              style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>운동 인증하기</h3>
              <div 
                style={{ 
                  width: "100%", 
                  aspectRatio: "1/1", 
                  border: "2px dashed var(--glass-border)", 
                  borderRadius: "1rem", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  gap: "1rem",
                  cursor: "pointer"
                }}
              >
                <ImageIcon size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: "0.875rem", opacity: 0.6 }}>사진 선택 (최대 1장)</span>
              </div>
              <textarea 
                placeholder="오늘의 운동은 어땠나요?" 
                style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "0.75rem", padding: "1rem", color: "white", resize: "none", height: "100px", fontSize: "0.875rem", outline: "none" }}
              />
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "0.75rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.05)", fontWeight: 600 }}>취소</button>
                <button onClick={() => setShowUpload(false)} className="btn-primary" style={{ flex: 1 }}>업로드</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
