"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronLeft, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check
} from "lucide-react";

// Mock Data for Gallery
const MOCK_GALLERY = [
  { id: 1, user: "눈곰", imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop" },
  { id: 2, user: "돌맹", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop" },
  { id: 3, user: "목우", imageUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop" },
  { id: 4, user: "돌콩", imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop" },
  { id: 5, user: "팔럽", imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop" },
  { id: 6, user: "라연", imageUrl: "https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=1000&auto=format&fit=crop" },
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
  const [isLightMode, setIsLightMode] = useState(true); // Default to light mode (user preference from screenshot)
  const [workoutCount, setWorkoutCount] = useState(2);
  const penalty = Math.max(0, 3 - workoutCount) * 2000;
  const [showUpload, setShowUpload] = useState(false);
  const [gallery, setGallery] = useState(MOCK_GALLERY);

  // Apply theme to body
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  }, [isLightMode]);

  const handleUpload = () => {
    setShowUpload(false);
    setWorkoutCount(prev => prev + 1);
  };

  return (
    <main style={{ padding: "1.5rem 0 6rem 0", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. Top Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--secondary)" }}>
            2026년 4월 2주차 (6일~12일)
          </h2>
          <RefreshCw size={16} style={{ color: "var(--foreground)", opacity: 0.5, cursor: "pointer" }} />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Theme Toggle */}
          <div 
            onClick={() => setIsLightMode(!isLightMode)}
            style={{ 
              width: "44px", height: "24px", borderRadius: "12px", 
              background: isLightMode ? "#e2e8f0" : "#1e293b", 
              position: "relative", cursor: "pointer",
              transition: "background 0.3s"
            }}
          >
            <motion.div
              initial={false}
              animate={{ x: isLightMode ? 2 : 22 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: "white", position: "absolute", top: "2px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              {isLightMode ? <Sun size={12} color="#f59e0b" /> : <Moon size={12} color="#3b82f6" />}
            </motion.div>
          </div>
          
          {/* Hamburger Menu */}
          <div style={{ position: "relative", cursor: "pointer" }}>
            <Menu size={24} />
            <div style={{
              position: "absolute", top: "-4px", right: "-4px",
              background: "var(--error)", color: "white", fontSize: "0.6rem",
              width: "16px", height: "16px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700
            }}>
              2
            </div>
          </div>
        </div>
      </header>

      {/* 2. User Profile Area */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "#ccc", overflow: "hidden" }}>
            <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>돌콩님</h1>
              <span style={{ background: "var(--primary)", color: "white", padding: "0.1rem 0.5rem", borderRadius: "0.5rem", fontSize: "0.7rem", fontWeight: 600 }}>관리자</span>
            </div>
            <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>여기를 눌러 응원 한마디! 💬</p>
          </div>
        </div>
        
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "2rem", fontSize: "0.875rem" }}>
          <span>🏃</span> SME 챌린지
        </button>
      </section>

      {/* 3. Notice Banner */}
      <section className="glass" style={{
        display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem",
        borderRadius: "0.75rem", fontSize: "0.85rem", cursor: "pointer", border: "1px solid var(--primary)",
        color: "var(--foreground)", position: "relative", overflow: "hidden"
      }}>
        {/* Subtle primary tint for light mode banner background */}
        <div style={{ position: "absolute", inset: 0, background: "var(--primary)", opacity: isLightMode ? 0.05 : 0.1, zIndex: -1 }} />
        <Megaphone size={16} color="var(--accent)" />
        <span style={{ background: "var(--error)", color: "white", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.6rem", fontWeight: 700 }}>N</span>
        <p style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
          "[공지] 서비스 속도 개선을 위한 서버 교체 및 사이트 주..."
        </p>
        <ChevronDown size={16} style={{ opacity: 0.5 }} />
      </section>

      {/* 4. Core Dashboard Card */}
      <section className="card" style={{ padding: "1.25rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
        
        {/* Weekly Count */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderRight: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", opacity: 0.6, fontSize: "0.75rem" }}>
            금주 운동 횟수 ⓘ
          </div>
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {workoutCount}/<span style={{ opacity: 0.5 }}>3</span>
          </span>
        </div>

        {/* Expected Penalty */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderRight: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", opacity: 0.6, fontSize: "0.75rem" }}>
            금주 예상 벌금 ⓘ
          </div>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: penalty > 0 ? "var(--warning)" : "var(--success)" }}>
            {penalty === 0 ? "0원" : `${penalty.toLocaleString()}원`}
          </span>
        </div>

        {/* My Rank */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", opacity: 0.6, fontSize: "0.75rem" }}>
            현재 내 순위
          </div>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)" }}>
            2위
          </span>
          <span style={{ fontSize: "0.6rem", opacity: 0.5, marginTop: "-0.2rem" }}>터치하여 전체보기 &gt;</span>
        </div>

      </section>

      {/* 5. Weekly Calendar */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>이번 주</h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", opacity: 0.7 }}>
            <span style={{ display: "flex", alignItems: "center" }}>⏳대기</span>
            <span style={{ display: "flex", alignItems: "center", color: "var(--success)" }}>✅인정</span>
            <span style={{ display: "flex", alignItems: "center", color: "var(--error)" }}>❌반려</span>
            <span style={{ display: "flex", alignItems: "center", color: "var(--warning)" }}>⭐면제</span>
            <div style={{ display: "flex", gap: "0.2rem", marginLeft: "0.5rem" }}>
              <ChevronLeft size={16} /> <ChevronRight size={16} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.3rem" }}>
          {weekDays.map((wd, i) => (
            <div 
              key={i} 
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "0.5rem 0", gap: "0.25rem", borderRadius: "0.5rem",
                border: wd.status === 'selected' ? "2px solid var(--primary)" : "1px dashed var(--glass-border)",
                background: wd.status === 'selected' ? (isLightMode ? "rgba(14, 165, 233, 0.05)" : "rgba(14, 165, 233, 0.1)") : "transparent",
                opacity: wd.status === '인정' || wd.status === 'selected' ? 1 : 0.4
              }}
            >
              <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>{wd.day}</span>
              {wd.status === '인정' ? (
                <div style={{ background: "var(--success)", color: "white", width: "1.2rem", height: "1.2rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={12} strokeWidth={3} />
                </div>
              ) : (
                <span style={{ fontSize: "1rem", fontWeight: 700, color: wd.status === 'selected' ? "var(--primary)" : "inherit" }}>
                  {wd.date}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. Check-in Section */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.6 }}>인증할 요일 (클릭)</span>
          <span style={{ fontSize: "0.65rem", opacity: 0.6, textAlign: "right" }}>
            <span style={{ color: "var(--primary)", fontWeight: 700 }}>※SME전용 타임스탬프</span>로<br/>
            자동 기록됩니다.
          </span>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div className="card" style={{ flex: 1, padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontWeight: 600 }}>목요일</span>
            <ChevronDown size={16} style={{ opacity: 0.5 }} />
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowUpload(true)}
            style={{ width: "40%", borderRadius: "1rem", fontSize: "1rem" }}
          >
            사진 업로드
          </button>
        </div>
      </section>

      {/* 7. Gallery Section */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
          👀 SME 운동 갤러리
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          {gallery.map(item => (
            <div key={item.id} style={{ width: "100%", aspectRatio: "1/1", borderRadius: "0.5rem", overflow: "hidden", position: "relative" }}>
              <img src={item.imageUrl} alt={item.user} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {/* Overlay Name */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", padding: "1rem 0.5rem 0.3rem 0.5rem", display: "flex", justifyContent: "center" }}>
                <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 700 }}>{item.user}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upload Modal (Overlay) */}
      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="card" 
              style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>운동 인증하기</h3>
              <div 
                style={{ 
                  width: "100%", aspectRatio: "1/1", border: "2px dashed var(--glass-border)", 
                  borderRadius: "1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", cursor: "pointer"
                }}
              >
                <ImageIcon size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: "0.875rem", opacity: 0.6 }}>사진 선택 (최대 1장)</span>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={() => setShowUpload(false)} style={{ flex: 1, padding: "0.75rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.05)", fontWeight: 600 }}>취소</button>
                <button onClick={handleUpload} className="btn-primary" style={{ flex: 1 }}>업로드</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="glass" style={{ 
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 3rem)", maxWidth: "420px", height: "4.5rem",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        zIndex: 50, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", borderRadius: "2rem",
        background: isLightMode ? "rgba(255,255,255,0.95)" : "var(--glass-bg)"
      }}>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", color: "var(--primary)" }}>
          <HomeIcon size={24} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>홈</span>
        </button>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", color: isLightMode ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>
          <Users size={24} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>피드</span>
        </button>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", color: isLightMode ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>
          <User size={24} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>마이</span>
        </button>
      </nav>

    </main>
  );
}
