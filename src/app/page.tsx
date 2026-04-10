"use client";
// VERSION: 1.0.1 - Profile Edit & UI Cleanup Update

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft, X, Copy, CreditCard, History, BookOpen, 
  Calendar, ShieldCheck, Mail, Lock, LogOut, Bell, AlertCircle, Trash2,
  FileText, ShieldAlert
} from "lucide-react";

// --- Firebase Imports ---
import { db, storage } from "@/lib/firebase";
import { 
  collection, doc, getDoc, setDoc, updateDoc, query, where, 
  onSnapshot, serverTimestamp, getDocs, addDoc, orderBy, limit 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Date Helpers ---
const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0,0,0,0);
  
  const days = [];
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      날짜: d.toISOString().split('T')[0],
      요일: dayNames[i],
      일: d.getDate().toString()
    });
  }
  return days;
};

export default function Home() {
  const [isLightMode, setIsLightMode] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // App State (Firestore Linked)
  const [activeTab, setActiveTab] = useState("home");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  // UI State
  const [todayActivity, setTodayActivity] = useState<any>(null);
  const [showUpload, setShowUpload] = useState<any>(null); 
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<string | null>(null);
  const [adminApprovalTab, setAdminApprovalTab] = useState<"가입검토" | "사진검토" | "면제검토">("가입검토");
  const [toast, setToast] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [tempProfileImg, setTempProfileImg] = useState<string | null>(null);
  const [tempProfileFile, setTempProfileFile] = useState<File | null>(null);
  const [profileZoom, setProfileZoom] = useState(1);
  const [rankingPeriod, setRankingPeriod] = useState("monthly");
  const [editBgColor, setEditBgColor] = useState("var(--secondary)");
  const [editBorderColor, setEditBorderColor] = useState("var(--primary)");

  const weekInfo = getWeekRange();
  const workoutCount = attendance.filter(d => d.상태 === '승인').length;
  const penalty = Math.max(0, 3 - workoutCount) * 2000;
  const hasRejection = attendance.some(d => d.상태 === '반려');

  // --- Initial Admin Provisioning & Session Check ---
  useEffect(() => {
    const init = async () => {
      // 1. Check Admin Account ensures it exists and is approved
      try {
        const adminRef = doc(db, "멤버", "admin");
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            닉네임: "admin",
            비밀번호: "admin9569",
            관리자여부: true,
            아바타: "AD",
            인사말: "SME 클럽 관리자입니다.",
            승인상태: "승인", // Admin is pre-approved
            운동횟수: 0,
            생성일: serverTimestamp()
          });
        }
      } catch (err) { console.error("Admin init error", err); }

      // 2. Session check with real-time verification
      const savedSession = localStorage.getItem("sme_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        // We do a fresh DB fetch to ensure they haven't been banned/rejected
        const userRef = doc(db, "멤버", parsed.닉네임);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const freshData = userSnap.data();
          if (freshData.승인상태 === "승인") {
            setCurrentUser(freshData);
          } else {
            // They lost approval while logged out
            localStorage.removeItem("sme_session");
          }
        } else {
          localStorage.removeItem("sme_session");
        }
      }
      setIsAuthChecking(false);
    };
    init();
  }, []);

  // --- Real-time Listeners ---
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen for Current Week's Activities (Current User)
    const startDate = weekInfo[0].날짜;
    const endDate = weekInfo[6].날짜;
    const qActivities = query(
      collection(db, "활동"),
      where("닉네임", "==", currentUser.닉네임),
      where("날짜", ">=", startDate),
      where("날짜", "<=", endDate)
    );
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      const dataMap: any = {};
      snap.forEach(doc => { dataMap[doc.data().날짜] = { id: doc.id, ...doc.data() }; });
      
      const combined = weekInfo.map(info => ({
        day: info.요일,
        date: info.일,
        fullDate: info.날짜,
        상태: dataMap[info.날짜]?.상태 || 'none',
        imageUrl: dataMap[info.날짜]?.이미지URL || '',
        reason: dataMap[info.날짜]?.반려사유 || '',
        id: dataMap[info.날짜]?.id
      }));
      setAttendance(combined);
      
      const todayShort = new Date().toISOString().split('T')[0];
      if (dataMap[todayShort]) setTodayActivity(dataMap[todayShort]);
      else setTodayActivity(null);
    });

    // 2. Listen for All Active Members (for Rankings)
    const qMembers = query(collection(db, "멤버"), where("승인상태", "==", "승인"));
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setMembers(list);
    });

    // 3. Listen for Posts (Global Feed)
    const qPosts = query(collection(db, "게시글"), orderBy("생성시간", "desc"), limit(20));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setPosts(list);
    });

    let unsubPendingA: () => void;
    let unsubPendingM: () => void;

    // 4. Admin-only Listeners
    if (currentUser.관리자여부) {
      // Pending Activities
      const qPendingA = query(collection(db, "활동"), where("상태", "==", "대기"));
      unsubPendingA = onSnapshot(qPendingA, (snap) => {
        const list: any[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setPendingApprovals(list);
      });

      // Pending Members (New Registration Approval)
      const qPendingM = query(collection(db, "멤버"), where("승인상태", "==", "대기"));
      unsubPendingM = onSnapshot(qPendingM, (snap) => {
        const list: any[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setPendingMembers(list);
      });
    }

    return () => {
      unsubActivities(); unsubMembers(); unsubPosts();
      if (currentUser.관리자여부) {
        if (unsubPendingA) unsubPendingA();
        if (unsubPendingM) unsubPendingM();
      }
    };
  }, [currentUser]);

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

  // --- Handlers ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nickname = (formData.get("nickname") as string).trim();
    const password = formData.get("password") as string;

    try {
      const userRef = doc(db, "멤버", nickname);
      const userSnap = await getDoc(userRef);

      if (authMode === "login") {
        // Case 1: Nickname doesn't exist
        if (!userSnap.exists()) {
          setToast("존재하지 않는 닉네임입니다. 회원가입을 해주세요. ❌");
          return;
        }

        const userData = userSnap.data();

        // Case 2: Password wrong
        if (userData.비밀번호 !== password) {
          setToast("비밀번호가 틀렸습니다. ❌");
          return;
        }

        // Case 3: Correct credentials but pending approval
        if (userData.승인상태 === "대기") {
          setToast("관리자의 승인이 아직 떨어지기 전입니다. 잠시만 기다려주세요. ⏳");
          return;
        }

        // Case 4: All good — log in
        setCurrentUser(userData);
        if (rememberMe) localStorage.setItem("sme_session", JSON.stringify(userData));

      } else {
        // Signup
        if (userSnap.exists()) {
          setToast("이미 존재하는 닉네임입니다. ⚠️");
          return;
        }
        
        const newUser = {
          닉네임: nickname,
          비밀번호: password,
          이름: nickname, // 이름도 닉네임과 동일하게 저장 (호환성 유지)
          관리자여부: false,
          아바타: nickname.substring(0, 2).toUpperCase(),
          인사말: "득근에 진심입니다! 💪",
          운동횟수: 0,
          승인상태: "대기", // Default to pending — admin must approve
          생성일: serverTimestamp()
        };
        await setDoc(userRef, newUser);
        
        // Do NOT log them in. Show message and return to login view.
        setToast("회원가입이 완료되었습니다! 관리자 승인을 기다려주세요. ⏳");
        setAuthMode("login");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setToast("오류가 발생했습니다. 잠시 후 다시 시도해주세요. 🔧");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("sme_session");
    setIsMenuOpen(false);
    setMenuView(null);
    setToast("로그아웃 되었습니다.");
  };

  const startReject = (id: string) => {
    setRejectId(id);
    setRejectReasonInput("");
  };

  const handleUpload = async (file: File) => {
    if (!currentUser) return;
    const targetDay = showUpload?.fullDate || new Date().toISOString().split('T')[0];
    const targetDayName = showUpload?.day || '목'; 
    
    setToast("업로드 중... ⏳");
    try {
      const storageRef = ref(storage, `활동/${currentUser.닉네임}_${Date.now()}`);
      const uploadSnap = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadSnap.ref);

      const activityId = `${currentUser.닉네임}_${targetDay}`;
      await setDoc(doc(db, "활동", activityId), {
        닉네임: currentUser.닉네임,
        이름: currentUser.이름,
        아바타: currentUser.아바타,
        날짜: targetDay,
        요일: targetDayName,
        상태: "대기",
        유형: "인증샷", 
        이미지URL: downloadURL,
        반려사유: "",
        제출시간: serverTimestamp()
      });

      setToast("인증샷 제출 완료! 관리자 승인을 기다려주세요. ⏳");
      setShowUpload(null);
      setSelectedDay(null);
    } catch (err) {
      console.error(err);
      setToast("업로드 실패 ❌");
    }
  };

  const handleApproveActivity = async (id: string, userNickname: string) => {
    try {
      const activityRef = doc(db, "활동", id);
      const activitySnap = await getDoc(activityRef);
      if (!activitySnap.exists()) return;
      const activityData = activitySnap.data();

      // 1. Update activity status
      await updateDoc(activityRef, { 상태: "승인" });

      // 2. Increment user workout count
      const userRef = doc(db, "멤버", userNickname);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { 운동횟수: (userSnap.data().운동횟수 || 0) + 1 });
      }

      // 3. Add to Public Feed ONLY after approval
      if (activityData.유형 === "인증샷") {
        await addDoc(collection(db, "게시글"), {
          닉네임: activityData.닉네임,
          이름: activityData.이름 || activityData.닉네임,
          아바타: activityData.아바타 || activityData.닉네임.substring(0, 2).toUpperCase(),
          이미지URL: activityData.이미지URL,
          내용: `[${activityData.날짜}] 오늘도 득근! 💪`,
          생성시간: serverTimestamp(),
          좋아요: 0
        });
      }

      setToast("활동이 승인되었습니다! ✅");
    } catch (err) { console.error(err); }
  };

  const handleRejectMember = async (nickname: string) => {
    if (!confirm(`[${nickname}] 사용자의 가입을 반려하고 계정을 삭제하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, "멤버", nickname), { 승인상태: "삭제됨" }); // Optional: mark it first
      // The user requested to delete it entirely
      // However, deleting from doc(db, "멤버", nickname) is sufficient
      const userRef = doc(db, "멤버", nickname);
      // Wait, let's just delete it
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(userRef);
      setToast(`[${nickname}]님의 가입이 반려(삭제)되었습니다.`);
    } catch (err) { console.error(err); }
  };

  const confirmRejectActivity = async () => {
    if (!rejectId) return;
    try {
      await updateDoc(doc(db, "활동", rejectId), { 
        상태: "반려", 
        반려사유: rejectReasonInput 
      });
      setRejectId(null);
      setToast("반려 처리가 완료되었습니다. ❌");
    } catch (err) { console.error(err); }
  };

  const handleApproveMember = async (nickname: string) => {
    try {
      await updateDoc(doc(db, "멤버", nickname), { 승인상태: "승인" });
      setToast(`[${nickname}]님의 가입이 승인되었습니다! 🎉`);
    } catch (err) { console.error(err); }
  };

  const handleUpdateProfile = async (newBio: string, avatarUrl?: string) => {
    if (!currentUser) return;
    try {
      const updateData: any = { 인사말: newBio };
      if (avatarUrl) updateData.아바타 = avatarUrl;
      
      await updateDoc(doc(db, "멤버", currentUser.닉네임), updateData);
      
      const updatedUser = { ...currentUser, ...updateData };
      setCurrentUser(updatedUser);
      localStorage.setItem("sme_session", JSON.stringify(updatedUser));
      
      setIsEditProfileOpen(false);
      setToast("프로필이 업데이트되었습니다! ✨");
    } catch (err) {
      console.error(err);
      setToast("업데이트 실패 ❌");
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    setToast("사진 업로드 중... ⏳");
    try {
      const storageRef = ref(storage, `프로필/${currentUser.닉네임}_${Date.now()}`);
      const uploadSnap = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadSnap.ref);
      handleUpdateProfile(editBio, downloadURL);
    } catch (err) {
      console.error(err);
      setToast("이미지 업로드 실패 ❌");
    }
  };

  const ProfileHeader = ({ name, data }: { name: string, data?: any }) => {
    const member = members.find(m => m.닉네임 === name) || (name === currentUser?.닉네임 ? currentUser : (members[0] || {}));
    const userPosts = posts.filter(p => p.닉네임 === name);
    const isMe = name === currentUser?.닉네임;

    return (
      <div style={{ padding: "0 1.25rem", marginBottom: "1.5rem" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2rem" }}>
            <div style={{ width: "5.5rem", height: "5.5rem", borderRadius: "50%", background: "var(--secondary)", border: "3px solid var(--primary)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 800, color: "white" }}>
               {member.아바타 && member.아바타.startsWith('http') ? 
                 <img src={member.아바타} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : 
                 (name === "admin" ? <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : member.아바타)}
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
               <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{member.운동횟수 || 0}</div><div style={{ fontSize: "0.75rem", opacity: 0.5 }}>운동횟수</div></div>
               <div style={{ textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{userPosts.length}</div><div style={{ fontSize: "0.75rem", opacity: 0.5 }}>게시물</div></div>
            </div>
         </div>
         <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{name}</div>
              <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>{member.인사말}</p>
            </div>
            {isMe && (
              <button 
                onClick={() => { setEditBio(member.인사말 || ""); setIsEditProfileOpen(true); }}
                style={{ padding: "0.5rem 0.8rem", borderRadius: "0.6rem", background: "rgba(0,0,0,0.05)", fontSize: "0.75rem", fontWeight: 800, marginTop: "0.2rem" }}
              >
                수정
              </button>
            )}
         </div>
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
              <div style={{ position: "relative" }}>
                <Users size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} />
                <input name="nickname" type="text" placeholder="닉네임 (ID)" required style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none", fontSize: "16px" }} />
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} />
                <input name="password" type="password" placeholder="비밀번호" required style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none", fontSize: "16px" }} />
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
        </motion.div>
        {/* 로그인 화면 토스트 */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 100, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 100, x: "-50%", opacity: 0 }} style={{ position: "fixed", bottom: "3rem", left: "50%", background: "rgba(0,0,0,0.9)", color: "white", padding: "1rem 1.5rem", borderRadius: "1.25rem", zIndex: 4000, fontWeight: 800, fontSize: "0.88rem", maxWidth: "90vw", textAlign: "center", lineHeight: 1.5, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>{toast}</motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <main style={{ padding: "1.5rem 0 7.5rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Top Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
           <h1 onClick={() => {setActiveTab("home"); setMenuView(null);}} style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--primary)", cursor: "pointer" }}>SME CLUB</h1>
           <span style={{ fontSize: "0.7rem", opacity: 0.5, fontWeight: 700 }}>이번 주 활동 ({weekInfo[0].일}일 ~ {weekInfo[6].일}일)</span>
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
              <div className="card" style={{ padding: "1.5rem" }}><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>활동 승인</div><div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{workoutCount} / 3</div></div>
            </section>
            
            <section style={{ padding: "0 1.25rem", marginTop: "-0.5rem" }}>
               <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem", opacity: 0.8 }}>요일별 활동 현황</h3>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                 {attendance.map((day, i) => (
                   <motion.div key={i} whileTap={{ scale: 0.95 }} onClick={() => setSelectedDay(day)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.75rem 0", borderRadius: "1rem", border: day.상태 === '반려' ? "1px solid var(--error)" : "1px solid var(--glass-border)", background: day.상태 === '반려' ? "rgba(239, 68, 68, 0.05)" : "transparent", cursor: "pointer", opacity: day.상태 === 'none' ? 0.3 : 1 }}>
                     <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>{day.day}</span>
                     {day.상태 === '승인' ? <CheckCircle2 size={16} color="var(--success)" /> : 
                      day.상태 === '반려' ? <AlertCircle size={16} color="var(--error)" /> : 
                      day.상태 === '대기' ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}><RefreshCw size={14} color="var(--primary)" /></motion.div> :
                      <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{day.date}</span>}
                   </motion.div>
                 ))}
               </div>
            </section>

            <section className="card" style={{ margin: "0 1.25rem", padding: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontWeight: 900 }}>SME 활동 랭킹 🏆</h3>
                  <div style={{ display: "flex", gap: "0.4rem", background: "rgba(0,0,0,0.05)", padding: "0.2rem", borderRadius: "0.8rem" }}>
                    {["weekly", "monthly", "yearly"].map(p => (
                      <button key={p} onClick={() => setRankingPeriod(p)} style={{ padding: "0.35rem 0.6rem", borderRadius: "0.6rem", fontSize: "0.6rem", fontWeight: 800, background: rankingPeriod === p ? "white" : "transparent" }}>{p === 'weekly' ? '주간' : p === 'monthly' ? '월간' : '연간'}</button>
                    ))}
                  </div>
               </div>
               {[...members].sort((a,b) => (b.운동횟수 || 0) - (a.운동횟수 || 0)).map((m, i) => (
                  <div key={m.닉네임} style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.2rem" }}>
                     <span style={{ width: "1.2rem", fontWeight: 900 }}>{i < 3 ? ["🥇","🥈","🥉"][i] : i+1}</span>
                     <div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, overflow: "hidden", border: "1.5px solid rgba(0,0,0,0.05)" }}>
                       {m.아바타 && m.아바타.startsWith('http') ? 
                         <img src={m.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : 
                         m.아바타}
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 800 }}><span>{m.닉네임}</span><span>{m.운동횟수 || 0}회</span></div>
                        <div style={{ width: "100%", height: "5px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", marginTop: "5px" }}><div style={{ width: `${Math.min(100, ((m.운동횟수 || 0) / 100) * 100)}%`, height: "100%", background: "var(--primary)", borderRadius: "3px" }} /></div>
                     </div>
                  </div>
               ))}
            </section>
          </motion.div>
        )}

        {/* --- Tabs: 피드, 마이 --- */}
        {activeTab === "social" && (
           <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h2 style={{ padding: "0 1.25rem", fontSize: "1.6rem", fontWeight: 900 }}>활동 피드</h2>
              {posts.map(post => {
                const postMember = members.find(m => m.닉네임.trim() === post.닉네임.trim()) || { 아바타: post.아바타 };
                return (
                  <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                    <div onClick={() => { setSelectedProfile(post); setActiveTab("profile"); }} style={{ padding: "0.8rem 1.25rem", display: "flex", alignItems: "center", gap: "0.8rem", cursor: "pointer" }}>
                      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--secondary)", border: "2px solid var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 900, overflow: "hidden" }}>
                        {postMember.아바타 && postMember.아바타.startsWith('http') ? 
                          <img src={postMember.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : 
                          postMember.아바타}
                      </div>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{post.닉네임}</span>
                    </div>
                    <div style={{ background: isLightMode ? "#f8fafc" : "#0f172a", textAlign: "center", borderBottom: "1px solid var(--glass-border)" }}>
                       <img src={post.이미지URL} alt="feed" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>
                    <div style={{ padding: "1.25rem" }}>
                       <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.7rem" }}><Heart size={24} /> <MessageCircle size={24} /> <Share2 size={24} style={{ marginLeft: "auto" }} /></div>
                       <p style={{ fontSize: "0.95rem", lineHeight: 1.5 }}><span style={{ fontWeight: 900, marginRight: "0.5rem" }}>{post.닉네임}</span>{post.내용}</p>
                    </div>
                  </article>
                );
              })}
           </motion.div>
        )}

        {activeTab === "my" && (
           <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column" }}>
              <ProfileHeader name={currentUser?.닉네임} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", borderTop: "1px solid var(--glass-border)" }}>
                 {posts.filter(p => p.닉네임 === currentUser?.닉네임).map(p => (
                    <div key={p.id} style={{ aspectRatio: "1/1", background: "#f0f0f0" }}><img src={p.이미지URL} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                 ))}
                 {posts.filter(p => p.닉네임 === currentUser?.닉네임).length === 0 && (
                   <div style={{ gridColumn: "span 3", textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>첫 인증을 남겨주세요😊</div>
                 )}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* --- Modals & Overlays --- */}
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
                  {currentUser?.관리자여부 && (
                    <>
                      <div onClick={() => { setMenuView("admin_approval"); setAdminApprovalTab("가입검토"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", cursor: "pointer" }}>
                         <ShieldCheck size={22} color="var(--primary)" /> <span style={{ fontWeight: 800, color: "var(--primary)" }}>관리자 대시보드</span>
                         {(pendingMembers.length > 0 || pendingApprovals.length > 0) && <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "var(--error)" }} />}
                      </div>
                    </>
                  )}
                  <div onClick={() => { setMenuView("penalty"); setIsMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "1.2rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.03)", cursor: "pointer" }}>
                     <CreditCard size={22} color="var(--primary)" /> <span style={{ fontWeight: 800 }}>벌금 관리</span>
                  </div>
               </nav>
               <button onClick={handleLogout} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "0.8rem", padding: "1.25rem", borderRadius: "1.25rem", background: "rgba(239, 68, 68, 0.05)", color: "var(--error)", fontWeight: 800, cursor: "pointer", border: "none" }}>
                  <LogOut size={22} /> 로그아웃
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- 👑 SEGMENTED ADMIN DASHBOARD --- */}
      <AnimatePresence>
        {menuView === "admin_approval" && (
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 30 }}
             style={{
               position: "fixed", inset: 0, zIndex: 2000,
               background: "var(--background)",
               display: "flex", flexDirection: "column",
               maxWidth: "480px", margin: "0 auto"
             }}
           >
              {/* 헤더 */}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.8rem",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--glass-border)",
                background: "var(--background)",
                flexShrink: 0
              }}>
                <ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer", flexShrink: 0 }} />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 900 }}>승인 관리 대시보드</h2>
                {(pendingMembers.length > 0 || pendingApprovals.length > 0) && (
                  <span style={{ marginLeft: "auto", background: "var(--error)", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 800 }}>
                    {pendingMembers.length + pendingApprovals.length}
                  </span>
                )}
              </div>

              {/* 탭 */}
              <div style={{
                display: "flex", background: "var(--background)",
                borderBottom: "1px solid var(--glass-border)",
                flexShrink: 0
              }}>
                {["가입검토", "사진검토", "면제검토"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAdminApprovalTab(tab as any)}
                    style={{
                      flex: 1, padding: "0.8rem 0", fontWeight: 800, fontSize: "0.8rem",
                      color: adminApprovalTab === tab ? "var(--primary)" : "inherit",
                      opacity: adminApprovalTab === tab ? 1 : 0.45,
                      borderBottom: adminApprovalTab === tab ? "2.5px solid var(--primary)" : "2.5px solid transparent",
                      transition: "0.2s", background: "none"
                    }}
                  >
                    {tab}
                    {tab === "가입검토" && pendingMembers.length > 0 && (
                      <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{pendingMembers.length}</span>
                    )}
                    {tab === "사진검토" && pendingApprovals.filter(p => !p.유형 || p.유형 === "인증샷").length > 0 && (
                      <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{pendingApprovals.filter(p => !p.유형 || p.유형 === "인증샷").length}</span>
                    )}
                    {tab === "면제검토" && pendingApprovals.filter(p => p.유형 === "면제").length > 0 && (
                      <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{pendingApprovals.filter(p => p.유형 === "면제").length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 콘텐츠 스크롤 영역 */}
              <div style={{
                flex: 1, overflowY: "scroll",
                WebkitOverflowScrolling: "touch" as any,
                padding: "0.75rem 1rem 2rem 1rem",
                display: "flex", flexDirection: "column", gap: "0.75rem"
              }}>

                {/* 가입검토 탭 */}
                {adminApprovalTab === "가입검토" && (
                  <>
                    {pendingMembers.map(item => (
                      <div key={item.닉네임} className="card" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                          <div style={{ width: "2.6rem", height: "2.6rem", flexShrink: 0, borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem" }}>{item.아바타}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.닉네임}</div>
                            <div style={{ fontSize: "0.72rem", opacity: 0.5 }}>{item.이름}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                          <button
                            onClick={() => handleRejectMember(item.닉네임)}
                            style={{ padding: "0.5rem 0.8rem", borderRadius: "0.7rem", fontWeight: 800, fontSize: "0.75rem", border: "1.5px solid var(--error)", color: "var(--error)" }}
                          >반려</button>
                          <button
                            onClick={() => handleApproveMember(item.닉네임)}
                            className="btn-primary"
                            style={{ padding: "0.5rem 1rem", borderRadius: "0.7rem", fontWeight: 800, fontSize: "0.75rem" }}
                          >승인</button>
                        </div>
                      </div>
                    ))}
                    {pendingMembers.length === 0 && (
                      <div style={{ textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>
                        <ShieldAlert size={40} style={{ margin: "0 auto 0.8rem" }} />
                        <p style={{ fontSize: "0.85rem" }}>대기 중인 신규 회원이 없습니다.</p>
                      </div>
                    )}
                  </>
                )}

                {/* 사진검토 탭 */}
                {adminApprovalTab === "사진검토" && (
                  <>
                    {pendingApprovals.filter(p => !p.유형 || p.유형 === "인증샷").map(item => (
                      <div key={item.id} className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                        {/* 최신 UI 구성: 유저 정보와 버튼을 한 줄에 배치 */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                              {item.아바타 || item.닉네임?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <div style={{ fontWeight: 900, fontSize: "1rem" }}>{item.닉네임}</div>
                               <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{item.요일} · {item.날짜}</div>
                            </div>
                          </div>
                          
                          {/* 절대적으로 보일 수 밖에 없는 우측 버튼 영역 */}
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                             <button
                               onClick={() => startReject(item.id)}
                               style={{ background: "#ef4444", color: "white", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", fontWeight: 900, fontSize: "0.8rem", border: "none" }}
                             >반려</button>
                             <button
                               onClick={() => handleApproveActivity(item.id, item.닉네임)}
                               style={{ background: "#22c55e", color: "white", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", fontWeight: 900, fontSize: "0.8rem", border: "none" }}
                             >승인</button>
                          </div>
                        </div>

                        {/* 이미지 영역 */}
                        <div style={{ borderRadius: "0.8rem", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                          <img
                            src={item.이미지URL}
                            alt="proof"
                            style={{ width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" }}
                          />
                        </div>
                      </div>
                    ))}
                    {pendingApprovals.filter(p => !p.유형 || p.유형 === "인증샷").length === 0 && (
                      <div style={{ textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>
                        <ImageIcon size={40} style={{ margin: "0 auto 0.8rem" }} />
                        <p style={{ fontSize: "0.85rem" }}>대기 중인 인증샷이 없습니다.</p>
                      </div>
                    )}
                  </>
                )}

                {/* 면제검토 탭 */}
                {adminApprovalTab === "면제검토" && (
                  <>
                    {pendingApprovals.filter(p => p.유형 === "면제").map(item => (
                      <div key={item.id} className="card" style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                          <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "var(--secondary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 800, flexShrink: 0 }}>
                            {item.아바타 || item.닉네임?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>{item.닉네임}</span>
                            <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{item.요일} · {item.날짜}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.6rem", color: "var(--primary)", marginBottom: "1.25rem", background: "rgba(56, 189, 248, 0.08)", padding: "1rem", borderRadius: "1rem", alignItems: "flex-start" }}>
                          <FileText size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.85rem", marginBottom: "0.3rem" }}>면제 사유서</div>
                            <p style={{ fontSize: "0.88rem", opacity: 0.8, lineHeight: 1.5, color: "inherit" }}>{item.내용}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.8rem" }}>
                          <button
                            onClick={() => startReject(item.id)}
                            style={{ 
                              flex: 1, padding: "0.85rem", borderRadius: "0.8rem", 
                              background: "#ef4444", color: "white", fontWeight: 900, fontSize: "0.9rem",
                              border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem"
                            }}
                          >
                            <X size={18} /> 면제 거절
                          </button>
                          <button
                            onClick={() => handleApproveActivity(item.id, item.닉네임)}
                            style={{ 
                              flex: 1, padding: "0.85rem", borderRadius: "0.8rem", 
                              background: "#22c55e", color: "white", fontWeight: 900, fontSize: "0.9rem",
                              border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem"
                            }}
                          >
                            <Check size={18} /> 면제 승인
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingApprovals.filter(p => p.유형 === "면제").length === 0 && (
                      <div style={{ textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>
                        <FileText size={40} style={{ margin: "0 auto 0.8rem" }} />
                        <p style={{ fontSize: "0.85rem" }}>대기 중인 면제 신청서가 없습니다.</p>
                      </div>
                    )}
                  </>
                )}

              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card" style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>{selectedDay.day}요일 활동 현황</h3>
                  <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setSelectedDay(null)} />
               </div>
               {selectedDay.상태 === '반려' ? (
                 <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ padding: "1.25rem", background: "rgba(239, 68, 68, 0.05)", borderRadius: "1rem", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--error)", marginBottom: "0.5rem" }}><AlertCircle size={18} /> <span style={{ fontWeight: 800 }}>반려 사유</span></div>
                       <p style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.8 }}>{selectedDay.reason}</p>
                    </div>
                    <button onClick={() => setShowUpload(selectedDay)} className="btn-primary" style={{ padding: "1.1rem", borderRadius: "1.25rem", fontWeight: 800 }}>활동 재제출하기</button>
                 </div>
               ) : selectedDay.상태 === 'none' ? (
                 <div style={{ textAlign: "center", padding: "1rem" }}>
                    <ImageIcon size={40} style={{ opacity: 0.1, marginBottom: "1rem" }} />
                    <p style={{ opacity: 0.5 }}>기록이 없습니다.</p>
                    <button onClick={() => setShowUpload(selectedDay)} className="btn-primary" style={{ padding: "1rem 2rem", borderRadius: "1.25rem", fontWeight: 800, marginTop: "1.5rem" }}>활동 인증하기</button>
                 </div>
               ) : (
                 <div style={{ textAlign: "center", padding: "2rem" }}>
                    <div style={{ width: "4rem", height: "4rem", borderRadius: "50%", background: selectedDay.상태 === '승인' ? "var(--success)" : "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                       {selectedDay.상태 === '승인' ? <Check size={32} color="white" /> : <RefreshCw size={32} color="white" className="animate-spin" />}
                    </div>
                    <p style={{ fontWeight: 800 }}>{selectedDay.상태 === '승인' ? "정상 승인되었습니다." : "관리자 검토 중입니다."}</p>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showUpload && (
        <label style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", cursor: "pointer" }}>
           <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
           <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "380px", textAlign: "center", padding: "3rem 2rem" }}>
              <ImageIcon size={48} style={{ opacity: 0.2, margin: "0 auto 1.5rem" }} />
              <h3 style={{ fontWeight: 900 }}>[{showUpload.day}] 사진 업로드</h3>
              <p style={{ opacity: 0.5, marginTop: "0.5rem", fontSize: "0.9rem" }}>여기를 클릭하여 활동 사진을 선택하세요.</p>
              <button onClick={() => setShowUpload(null)} style={{ marginTop: "2rem", opacity: 0.4 }}>취소</button>
           </div>
        </label>
      )}

      {/* --- Profile Edit Modal --- */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ width: "100%", maxWidth: "380px", padding: "2rem" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontWeight: 900, fontSize: "1.2rem" }}>프로필 수정</h3>
                  <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setIsEditProfileOpen(false)} />
               </div>
               
               <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ textAlign: "center" }}>
                     <label style={{ display: "inline-block", position: "relative", cursor: "pointer" }}>
                        <div style={{ width: "8rem", height: "8rem", borderRadius: "50%", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 800, color: "white", overflow: "hidden", border: "4px solid var(--primary)" }}>
                           {tempProfileImg ? 
                             <img src={tempProfileImg} alt="temp" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${profileZoom})` }} /> : 
                             (currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                               <img src={currentUser.아바타} alt="curr" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : 
                               currentUser.아바타)}
                        </div>
                        <div style={{ position: "absolute", bottom: "0.5rem", right: "0.5rem", background: "var(--primary)", borderRadius: "50%", width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", color: "white", border: "2px solid white", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                           <ImageIcon size={16} />
                        </div>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setTempProfileFile(file);
                            setTempProfileImg(URL.createObjectURL(file));
                            setProfileZoom(1); // 초기화
                          }
                        }} />
                     </label>
                     {tempProfileImg && (
                       <div style={{ marginTop: "1rem" }}>
                         <label style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.5, display: "block", marginBottom: "0.5rem" }}>크기 조절 (Zoom)</label>
                         <input 
                           type="range" min="0.5" max="4" step="0.1" 
                           value={profileZoom} 
                           onChange={(e) => setProfileZoom(parseFloat(e.target.value))}
                           style={{ width: "100%", height: "4px", accentColor: "var(--primary)" }}
                         />
                       </div>
                     )}
                     
                     <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1.5rem", padding: "0 1rem" }}>
                       <div style={{ textAlign: "center" }}>
                         <label style={{ fontSize: "0.7rem", fontWeight: 800, opacity: 0.5, display: "block", marginBottom: "0.5rem" }}>배경색</label>
                         <input type="color" value={editBgColor} onChange={(e) => setEditBgColor(e.target.value)} style={{ width: "2.5rem", height: "2.5rem", padding: 0, border: "none", borderRadius: "50%", overflow: "hidden", cursor: "pointer" }} />
                       </div>
                       <div style={{ textAlign: "center" }}>
                         <label style={{ fontSize: "0.7rem", fontWeight: 800, opacity: 0.5, display: "block", marginBottom: "0.5rem" }}>테두리색</label>
                         <input type="color" value={editBorderColor} onChange={(e) => setEditBorderColor(e.target.value)} style={{ width: "2.5rem", height: "2.5rem", padding: 0, border: "none", borderRadius: "50%", overflow: "hidden", cursor: "pointer" }} />
                       </div>
                     </div>

                     <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.5rem" }}>
                       <button onClick={handleDeleteProfileImage} style={{ flex: 1, padding: "0.8rem", borderRadius: "0.8rem", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontWeight: 800, fontSize: "0.8rem" }}>사진 삭제</button>
                     </div>
                     <p style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "0.8rem" }}>
                        {tempProfileImg ? "슬라이더로 크기를 조절해 보세요!" : "사진을 클릭하여 변경하세요."}
                     </p>
                  </div>

                  <div>
                     <label style={{ fontSize: "0.85rem", fontWeight: 800, opacity: 0.6, display: "block", marginBottom: "0.5rem" }}>한줄 소개</label>
                     <input 
                       value={editBio} 
                       onChange={(e) => setEditBio(e.target.value)} 
                       placeholder="나의 각오를 적어주세요!" 
                       style={{ width: "100%", padding: "1rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none" }}
                     />
                  </div>

                  <button 
                    onClick={() => {
                      if (tempProfileFile) {
                        handleProfileImageUpload(tempProfileFile);
                      } else {
                        handleUpdateProfile(editBio, undefined, editBgColor, editBorderColor);
                      }
                    }}
                    className="btn-primary" 
                    style={{ padding: "1rem", borderRadius: "1rem", fontWeight: 800, width: "100%" }}
                  >
                    {tempProfileFile ? "사진 업로드 및 저장" : "변경사항 저장하기"}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Global UI --- */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 100, x: "-50%", opacity: 0 }} style={{ position: "fixed", bottom: "7.5rem", left: "50%", background: "rgba(0,0,0,0.85)", color: "white", padding: "1rem 2rem", borderRadius: "2.5rem", zIndex: 5000, fontWeight: 800, fontSize: "0.95rem" }}>{toast}</motion.div>
        )}
      </AnimatePresence>
      <nav className="glass" style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 2.5rem)", maxWidth: "420px", height: "4.8rem", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, borderRadius: "2.5rem", background: isLightMode ? "rgba(255,255,255,0.92)" : "rgba(15, 23, 42, 0.85)" }}>
        {[ { id: "home", icon: <HomeIcon size={24} />, label: "홈" }, { id: "social", icon: <Users size={24} />, label: "피드" }, { id: "my", icon: <User size={24} />, label: "마이" } ].map(it => (
          <button key={it.id} onClick={() => {setActiveTab(it.id); setSelectedProfile(null); window.scrollTo(0,0); setMenuView(null);}} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: (activeTab === it.id || (it.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)" }}>
            {it.icon} <span style={{ fontSize: "0.65rem", fontWeight: 800 }}>{it.label}</span>
          </button>
        ))}
      </nav>

      {/* --- Admin Reject UI --- */}
      <AnimatePresence>
        {rejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div className="card" style={{ width: "100%", maxWidth: "360px", padding: "2rem" }}>
               <h3 style={{ fontWeight: 900, marginBottom: "1rem" }}>반려 사유 입력</h3>
               <textarea value={rejectReasonInput} onChange={(e) => setRejectReasonInput(e.target.value)} placeholder="반려 사유를 작성해 주세요." style={{ width: "100%", height: "120px", background: "rgba(0,0,0,0.03)", borderRadius: "1rem", padding: "1rem", border: "none", marginBottom: "1.5rem" }} />
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setRejectId(null)} style={{ flex: 1, opacity: 0.5 }}>취소</button>
                  <button onClick={confirmRejectActivity} disabled={!rejectReasonInput} style={{ flex: 1, padding: "0.8rem", background: "var(--error)", color: "white", borderRadius: "1rem", fontWeight: 800 }}>반려 확정</button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
