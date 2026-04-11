"use client";
// VERSION: 1.0.1 - Profile Edit & UI Cleanup Update

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import {
  RefreshCw, Menu, Moon, Sun, User, Megaphone, ChevronDown, Trophy,
  Flame, CheckCircle2, ChevronRight, Image as ImageIcon,
  Home as HomeIcon, Users, Check, Heart, MessageCircle, Share2, Send,
  Dumbbell, Plus, ArrowLeft, X, Copy, CreditCard, History, BookOpen, 
  Calendar, ShieldCheck, Mail, Lock, LogOut, Bell, AlertCircle, Trash2,
  FileText, ShieldAlert, FastForward, RotateCcw
} from "lucide-react";

// --- Firebase Imports ---
import { db, storage } from "@/lib/firebase";
import { 
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, 
  onSnapshot, serverTimestamp, getDocs, addDoc, orderBy, limit 
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Date Helpers ---
const getWeekRange = (targetDate: Date = new Date()) => {
  const now = new Date(targetDate);
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

const getLastWeekRange = (targetDate: Date = new Date()) => {
  const currentWeek = getWeekRange(targetDate);
  const firstDayStr = currentWeek[0].날짜;
  const firstDay = new Date(firstDayStr);
  const lastMon = new Date(firstDay);
  lastMon.setDate(firstDay.getDate() - 7);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMon);
    d.setDate(lastMon.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days; // Array of 7 date strings
};

const getPassionLevel = (count: number) => {
  if (count >= 151) return { lv: "MAX", label: "고고보이", color: "#f59e0b" };
  if (count >= 101) return { lv: "6", label: "퀸", color: "#3b82f6" };
  if (count >= 61) return { lv: "5", label: "역대", color: "#ef4444" };
  if (count >= 31) return { lv: "4", label: "훈훈", color: "#fbbf24" };
  if (count >= 16) return { lv: "3", label: "평범", color: "#10b981" };
  if (count >= 6) return { lv: "2", label: "그냥못", color: "#64748b" };
  return { lv: "1", label: "존못", color: "#94a3b8" };
};

const getMonthDays = (targetDate: Date = new Date()) => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Padding for the first week (start from Monday)
  let startDay = firstDay.getDay(); // 0: Sun, 1: Mon...
  const paddingStart = startDay === 0 ? 6 : startDay - 1;
  
  const days = [];
  // Calculate the first Monday display date
  const firstMon = new Date(firstDay);
  firstMon.setDate(firstDay.getDate() - paddingStart);

  for (let i = 0; i < 35; i++) { // Show 5 weeks fixed
    const d = new Date(firstMon);
    d.setDate(firstMon.getDate() + i);
    days.push({
      날짜: d.toISOString().split('T')[0],
      일: d.getDate().toString(),
      이달인가: d.getMonth() === month
    });
  }
  return days;
};

const getLastWeekRangeInfo = (targetDate: Date = new Date()) => {
  const currentWeek = getWeekRange(targetDate);
  const firstDayStr = currentWeek[0].날짜;
  const firstDay = new Date(firstDayStr);
  const lastMon = new Date(firstDay);
  lastMon.setDate(firstDay.getDate() - 7);
  
  const days = [];
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMon);
    d.setDate(lastMon.getDate() + i);
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
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<string | null>(null);
  const [adminApprovalTab, setAdminApprovalTab] = useState<"가입검토" | "사진검토" | "면제검토" | "벌금확인" | "멤버관리">("가입검토");
  const [penalties, setPenalties] = useState<any[]>([]);
  const [lastWeekWorkoutCount, setLastWeekWorkoutCount] = useState(0);
  const [allMembersLastWeekCounts, setAllMembersLastWeekCounts] = useState<any>({});
  const [lastWeekAttendance, setLastWeekAttendance] = useState<any[]>([]);
  const [adminViewUserCalendar, setAdminViewUserCalendar] = useState<any>(null);
  const [adminViewUserAttendance, setAdminViewUserAttendance] = useState<any[]>([]);

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
  
  const [uploadText, setUploadText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<any>(null);
  const [commentInput, setCommentInput] = useState("");
  const [inlineInputs, setInlineInputs] = useState<any>({});
  
  // Notice System State
  const [notices, setNotices] = useState<any[]>([]);
  const [isNoticeRegOpen, setIsNoticeRegOpen] = useState(false);
  const [isNoticeHistoryOpen, setIsNoticeHistoryOpen] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeContent, setNewNoticeContent] = useState("");

  const [isGradeTableOpen, setIsGradeTableOpen] = useState(false);

  const [isNavVisible, setIsNavVisible] = useState(true);
  const [globalBaseDate, setGlobalBaseDate] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<any>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive mockNow from globalBaseDate or actual time
  const getSimulatedNow = () => {
    if (globalBaseDate) {
      const [y, m, d] = globalBaseDate.split('-').map(Number);
      return new Date(y, m - 1, d); // Use local segments to avoid TZ shifts
    }
    return new Date();
  };

  const mockNow = getSimulatedNow();
  const weekInfo = getWeekRange(mockNow);
  const monthInfo = getMonthDays(mockNow);

  useEffect(() => {
    const handleScroll = () => {
      setIsNavVisible(false);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => setIsNavVisible(true), 1200);
    };
    // Listen on both window and document to catch all scroll containers
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

   const weekDates = weekInfo.map(w => w.날짜);
   const workoutCount = attendance.filter(d => d.상태 === '승인' && weekDates.includes(d.fullDate)).length;
   const penalty = Math.max(0, 3 - workoutCount) * 2000;
   const hasRejection = attendance.some(d => d.상태 === '반려' && weekDates.includes(d.fullDate));

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
            인사말: "SME GYM 관리자입니다.",
            승인상태: "승인", // Admin is pre-approved
            운동횟수: 0,
            생성일: serverTimestamp()
          });
        }
      } catch (err) { console.error("Admin init error", err); }

      // 2. Session check with real-time verification
      const savedSession = localStorage.getItem("sme_session");
      if (savedSession) {
        try {
          const user = JSON.parse(savedSession);
          const userRef = doc(db, "멤버", user.닉네임);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.승인상태 === "승인") {
              setCurrentUser(userData);
            } else if (userData.승인상태 === "탈퇴") {
              localStorage.removeItem("sme_session");
              setToast("탈퇴 처리된 사용자입니다. ❌");
            } else {
              localStorage.removeItem("sme_session");
              setToast("승인이 취소되었거나 대기 중인 계정입니다. ⏳");
            }
          } else {
            localStorage.removeItem("sme_session");
          }
        } catch (err) { 
          console.error("Session restore error", err);
          localStorage.removeItem("sme_session");
        }
      }

      // 3. System State Initialization (First time only)
      try {
        const sysRef = doc(db, "시스템", "상태");
        const sysSnap = await getDoc(sysRef);
        if (!sysSnap.exists()) {
          await setDoc(sysRef, {
            기준일: "2026-04-06",
            최종집계시간: null
          });
        }
      } catch (err) { console.error("System init error", err); }

      setIsAuthChecking(false);
    };
    init();
  }, []);

  // --- Real-time Listeners (Global & User) ---
  useEffect(() => {
    // 0. Listen for Global System State
    const unsubSystem = onSnapshot(doc(db, "시스템", "상태"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalBaseDate(data.기준일);
        setLastBackupTime(data.최종집계시간);
      }
    });

    if (!currentUser) return () => unsubSystem();

    // 0.5. Listen for Current User's latest data (for immediate logout if withdrawn)
    const unsubCurrentUser = onSnapshot(doc(db, "멤버", currentUser.닉네임), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.승인상태 === "탈퇴") {
           setCurrentUser(null);
           localStorage.removeItem("sme_session");
           setToast("탈퇴 처리된 사용자입니다. 로그아웃됩니다. 🚫");
        } else if (data.승인상태 === "대기") {
           setCurrentUser(null);
           localStorage.removeItem("sme_session");
           setToast("승인 대기 상태로 변경되었습니다. 로그아웃됩니다. ⏳");
        }
      }
    });

    // 1. Listen for Monthly Activities (For Calendar)
    const year = mockNow.getFullYear();
    const month = mockNow.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const qActivities = query(
      collection(db, "활동"),
      where("닉네임", "==", currentUser.닉네임),
      where("날짜", ">=", startDate),
      where("날짜", "<=", endDate)
    );

    const unsubActivities = onSnapshot(qActivities, (snap) => {
      const dataMap: any = {};
      snap.forEach(doc => { dataMap[doc.data().날짜] = { id: doc.id, ...doc.data() }; });
      
      const combined = monthInfo.map(info => ({
        fullDate: info.날짜,
        date: info.일,
        isCurrentMonth: info.이달인가,
        상태: dataMap[info.날짜]?.상태 || 'none',
        imageUrl: dataMap[info.날짜]?.이미지URL || '',
        reason: dataMap[info.날짜]?.반려사유 || '',
        id: dataMap[info.날짜]?.id
      }));
      setAttendance(combined);
      
      const todayShort = mockNow.toISOString().split('T')[0];
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
      const qPendingA = query(collection(db, "활동"), where("상태", "==", "대기"));
      unsubPendingA = onSnapshot(qPendingA, (snap) => {
        const list: any[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setPendingApprovals(list);
      });

      const qPendingM = query(collection(db, "멤버"), where("승인상태", "==", "대기"));
      unsubPendingM = onSnapshot(qPendingM, (snap) => {
        const list: any[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setPendingMembers(list);
      });
    }

    // 5. Listen for All Penalties
    const unsubPenalties = onSnapshot(collection(db, "벌금"), (snap) => {
      setPenalties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 6. Listen for Announcements (공지)
    const qNotices = query(collection(db, "공지"), orderBy("생성시간", "desc"));
    const unsubNotices = onSnapshot(qNotices, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setNotices(list);
    });

    return () => {
      unsubSystem();
      unsubCurrentUser();
      unsubActivities(); unsubMembers(); unsubPosts(); unsubPenalties(); unsubNotices();
      if (currentUser.관리자여부) {
        if (unsubPendingA) unsubPendingA();
        if (unsubPendingM) unsubPendingM();
      }
    };
  }, [currentUser, globalBaseDate]);


  // Fetch Last Week workout counts (Admin real-time snapshot)
  useEffect(() => {
    if (!currentUser || !globalBaseDate) return;
    const baseDate = new Date(globalBaseDate);
    const lastWeekDaysInfo = getLastWeekRangeInfo(baseDate);
    const lastWeekStart = lastWeekDaysInfo[0].날짜;
    const lastWeekEnd = lastWeekDaysInfo[6].날짜;
    
    let unsubAdminCounts: (() => void) | null = null;

    if (currentUser.관리자여부) {
      // Admin: Real-time Snapshot for all activities in the target week
      // We query ONLY by date range to avoid indexing requirements for (date + status)
      const q = query(
        collection(db, "활동"),
        where("날짜", ">=", lastWeekStart),
        where("날짜", "<=", lastWeekEnd)
      );
      
      unsubAdminCounts = onSnapshot(q, (snap) => {
        const counts: any = {};
        snap.forEach(doc => {
          const d = doc.data();
          if (d.상태 === "승인") {
            const nickname = (d.닉네임 || "").trim();
            counts[nickname] = (counts[nickname] || 0) + 1;
          }
        });
        setAllMembersLastWeekCounts(counts);
        setLastWeekWorkoutCount(counts[(currentUser.닉네임 || "").trim()] || 0);
      });
    } else {
      // Regular user: fetch their own records for calendar
      const q = query(
        collection(db, "활동"),
        where("닉네임", "==", currentUser.닉네임),
        where("날짜", ">=", lastWeekStart),
        where("날짜", "<=", lastWeekEnd)
      );
      getDocs(q).then(snap => {
        const dataMap: any = {};
        snap.forEach(doc => { dataMap[doc.data().날짜] = doc.data(); });
        const combined = lastWeekDaysInfo.map(info => ({
          day: info.요일,
          date: info.일,
          fullDate: info.날짜,
          상태: dataMap[info.날짜]?.상태 || 'none'
        }));
        setLastWeekAttendance(combined);
        setLastWeekWorkoutCount(combined.filter(d => d.상태 === '승인').length);
      });
    }

    return () => {
      if (unsubAdminCounts) unsubAdminCounts();
    };
  }, [currentUser, globalBaseDate]);



  const fetchUserLastWeekCalendar = async (nickname: string) => {
    const lastWeekDaysInfo = getLastWeekRangeInfo(mockNow);
    const q = query(
      collection(db, "활동"),
      where("닉네임", "==", nickname),
      where("날짜", ">=", lastWeekDaysInfo[0].날짜),
      where("날짜", "<=", lastWeekDaysInfo[6].날짜)
    );
    const snap = await getDocs(q);
    const dataMap: any = {};
    snap.forEach(doc => { dataMap[doc.data().날짜] = doc.data(); });
    const attendance = lastWeekDaysInfo.map(info => ({
      day: info.요일,
      date: info.일,
      fullDate: info.날짜,
      상태: dataMap[info.날짜]?.상태 || 'none'
    }));
    setAdminViewUserAttendance(attendance);
  };

  const handleAdminManualConfirmPenalty = async (item: any) => {
    if (!confirm(`[${item.닉네임}]님의 벌금(${(item.penaltyAmount).toLocaleString()}원)을 완납 처리하시겠습니까?`)) return;
    const lastWeekDays = getLastWeekRange(mockNow);
    const weekId = lastWeekDays[0];
    const penaltyId = `${item.닉네임}_${weekId}`;
    
    try {
      await setDoc(doc(db, "벌금", penaltyId), {
        닉네임: item.닉네임,
        이름: item.이름,
        아바타: item.아바타,
        주차: weekId,
        운동횟수: item.count,
        금액: item.penaltyAmount,
        상태: "완납",
        생성시간: serverTimestamp()
      }, { merge: true });
      setToast(`${item.닉네임}님의 벌금이 완납 처리되었습니다. ✨`);
    } catch (err) { console.error(err); }
  };

  const handleConfirmPenalty = async (id: string) => {
    try {
      await updateDoc(doc(db, "벌금", id), { 상태: "완납" });
      setToast("납부가 확인되었습니다. ✨");
    } catch (err) { console.error(err); }
  };

  const handleAggregateAndBackup = async () => {
    if (!currentUser?.관리자여부 || !globalBaseDate) return;

    // 1. Safety Check: 24-hour warning
    if (lastBackupTime) {
      const lastTime = lastBackupTime.toDate();
      const now = new Date();
      const diffMs = now.getTime() - lastTime.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffMs < 24 * 60 * 60 * 1000) {
        if (!confirm(`${diffHours}시간 ${diffMins}분 전에 이미 집성 및 백업이 수행되었습니다. 정말로 다시 진행하시겠습니까?\n(이 작업은 현재 주차를 마감하고 다음 주차로 이동하며 되돌릴 수 없습니다!)`)) {
          return;
        }
      } else {
         if (!confirm("현재 주차를 마감하고 다음 주차로 이동하시겠습니까?\n이 작업은 모든 사용자의 벌금을 계산하고 영구적으로 다음 주차로 전환합니다.")) return;
      }
    } else {
      if (!confirm("현재 주차를 마감하고 다음 주차로 이동하시겠습니까?\n이 작업은 모든 사용자의 벌금을 계산하고 영구적으로 다음 주차로 전환합니다.")) return;
    }

    setToast("주간 집계 및 백업 중... ⏳");
    
    try {
      // 2. Get All Approved Members
      const membersSnap = await getDocs(query(collection(db, "멤버"), where("승인상태", "==", "승인")));
      
      // 3. Current Week Range
      const currentWeekDays = getWeekRange(new Date(globalBaseDate));
      const startDate = currentWeekDays[0].날짜;
      const endDate = currentWeekDays[6].날짜;

      // 4. Fetch ALL activities for this week once (Simple range query only to avoid any index issues)
      const allActSnap = await getDocs(query(
        collection(db, "활동"),
        where("날짜", ">=", startDate),
        where("날짜", "<=", endDate)
      ));
      
      const countMap: any = {};
      allActSnap.forEach(doc => {
        const d = doc.data();
        if (d.상태 === "승인") {
          countMap[d.닉네임] = (countMap[d.닉네임] || 0) + 1;
        }
      });

      // 5. Process Penalties
      for (const mDoc of membersSnap.docs) {
        const mData = mDoc.data();
        if (mData.닉네임 === 'admin') continue;

        const count = countMap[mData.닉네임] || 0;

        // If less than 3, create penalty record
        if (count < 3) {
          const penaltyAmount = (3 - count) * 2000;
          const penaltyId = `${mData.닉네임}_${startDate}`;
          await setDoc(doc(db, "벌금", penaltyId), {
            닉네임: mData.닉네임,
            이름: mData.이름 || mData.닉네임,
            아바타: mData.아바타 || mData.닉네임.substring(0,2).toUpperCase(),
            주차: startDate,
            운동횟수: count,
            금액: penaltyAmount,
            상태: "미납",
            생성시간: serverTimestamp()
          }, { merge: true });
        } else {
          // New: Record achieved status even if penalty is 0
          const penaltyId = `${mData.닉네임}_${startDate}`;
          await setDoc(doc(db, "벌금", penaltyId), {
            닉네임: mData.닉네임,
            이름: mData.이름 || mData.닉네임,
            아바타: mData.아바타 || mData.닉네임.substring(0,2).toUpperCase(),
            주차: startDate,
            운동횟수: count,
            금액: 0,
            상태: "완료",
            생성시간: serverTimestamp()
          }, { merge: true });
        }
      }

      // 6. Advance Global Week
      const currentBase = new Date(globalBaseDate);
      currentBase.setDate(currentBase.getDate() + 7);
      const nextMondayStr = currentBase.toISOString().split('T')[0];

      await updateDoc(doc(db, "시스템", "상태"), {
        기준일: nextMondayStr,
        최종집계시간: serverTimestamp()
      });

      setToast("집계 및 다음 주차 이동이 완료되었습니다! 🎉");
    } catch (err: any) {
      console.error(err);
      setToast(`집계 오류: ${err.message || '알 수 없는 오류'}`);
    }
  };


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

        // Case 3.5: Withdrawn account
        if (userData.승인상태 === "탈퇴") {
          setToast("탈퇴 처리된 사용자입니다. ❌");
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

  const handleUpload = async () => {
    if (!currentUser || !uploadFile) return;
    const targetDay = showUpload?.fullDate || mockNow.toISOString().split('T')[0];
    const targetDayName = showUpload?.day || '목'; 
    
    setToast("업로드 중... ⏳");
    try {
      const storageRef = ref(storage, `활동/${currentUser.닉네임}_${Date.now()}`);
      const uploadSnap = await uploadBytes(storageRef, uploadFile);
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
        내용: uploadText || `[${targetDay}] 오늘도 득근! 💪`,
        반려사유: "",
        제출시간: serverTimestamp()
      });

      setToast("인증샷 제출 완료! 관리자 승인을 기다려주세요. ⏳");
      setShowUpload(null);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadText("");
      setSelectedDay(null);
    } catch (err) {
      console.error(err);
      setToast("업로드 실패 ❌");
    }
  };


  const handleGeneralPostUpload = async () => {
    if (!currentUser || !uploadFile) return;
    
    setToast("게시글 업로드 중... ⏳");
    try {
      const storageRef = ref(storage, `게시글/${currentUser.닉네임}_${Date.now()}`);
      const uploadSnap = await uploadBytes(storageRef, uploadFile);
      const downloadURL = await getDownloadURL(uploadSnap.ref);

      await addDoc(collection(db, "게시글"), {
        닉네임: currentUser.닉네임,
        이름: currentUser.이름 || currentUser.닉네임,
        아바타: currentUser.아바타 || currentUser.닉네임.substring(0, 2).toUpperCase(),
        이미지URL: downloadURL,
        내용: uploadText || "오늘의 소소한 일상... ✨",
        생성시간: serverTimestamp(),
        좋아요유저: [],
        댓글: [],
        유형: "일반" 
      });

      setToast("게시글이 성공적으로 공유되었습니다! ✨");
      setShowUpload(null);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadText("");
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
          내용: activityData.내용 || `[${activityData.날짜}] 오늘도 득근! 💪`,
          생성시간: serverTimestamp(),
          좋아요유저: [],
          댓글: []
        });

      }


      setToast("활동이 승인되었습니다! ✅");
    } catch (err) { console.error(err); }
  };

  const handleRejectMember = async (nickname: string) => {
    if (!confirm(`[${nickname}] 사용자의 가입을 반려하고 계정을 삭제하시겠습니까?`)) return;
    try {
      const userRef = doc(db, "멤버", nickname);
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

  const handleAddNotice = async () => {
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
      setToast("제목과 내용을 입력해주세요. ⚠️");
      return;
    }
    try {
      await addDoc(collection(db, "공지"), {
        제목: newNoticeTitle,
        내용: newNoticeContent,
        작성자: currentUser.닉네임,
        생성시간: serverTimestamp()
      });
      setToast("공지가 등록되었습니다! 📢");
      setNewNoticeTitle("");
      setNewNoticeContent("");
      setIsNoticeRegOpen(false);
    } catch (err) {
      console.error(err);
      setToast("공지 등록 실패 ❌");
    }
  };

  const handleToggleAdmin = async (targetNickname: string, currentStatus: boolean) => {
    if (targetNickname === currentUser.닉네임) {
      setToast("본인의 권한은 변경할 수 없습니다. ⚠️");
      return;
    }
    try {
      const userRef = doc(db, "멤버", targetNickname);
      await updateDoc(userRef, { 관리자여부: !currentStatus });
      setToast(`${targetNickname}님의 관리자 권한이 ${!currentStatus ? '부여' : '해제'}되었습니다.`);
    } catch (err) {
      console.error(err);
      setToast("권한 설정 실패 ❌");
    }
  };

  const handleUpdateMemberStatus = async (targetNickname: string, newStatus: string) => {
    if (targetNickname === currentUser.닉네임) {
      setToast("본인의 상태는 변경할 수 없습니다. ⚠️");
      return;
    }
    try {
      const userRef = doc(db, "멤버", targetNickname);
      await updateDoc(userRef, { 승인상태: newStatus });
      setToast(`${targetNickname}님이 ${newStatus === '탈퇴' ? '탈퇴 처리' : '복구'}되었습니다. ${newStatus === '탈퇴' ? '🚫' : '✨'}`);
    } catch (err) {
      console.error(err);
      setToast("상태 업데이트 실패 ❌");
    }
  };

  const handleHidePenalty = async (nickname: string) => {
    try {
      const lastWeekDays = getLastWeekRange(mockNow);
      const weekId = lastWeekDays[0];
      const penaltyRef = doc(collection(db, "벌금"));
      // We create a record specifically to mark it as excluded
      await setDoc(penaltyRef, {
        닉네임: nickname,
        주차: weekId,
        상태: "제외",
        생성시간: serverTimestamp()
      });
      setToast(`${nickname}님의 이번 주 벌금 데이터가 제외되었습니다.`);
    } catch (err) {
      console.error(err);
      setToast("제외 처리 중 오류 발생 ❌");
    }
  };


  const handleDeleteProfileImage = async () => {
    if (!currentUser) return;
    try {
      const defaultAvatar = currentUser.닉네임.substring(0, 2).toUpperCase();
      const updateData = { 
        아바타: defaultAvatar,
        아바타줌: 1
      };
      await updateDoc(doc(db, "멤버", currentUser.닉네임), updateData);
      
      const updatedUser = { ...currentUser, ...updateData };
      setCurrentUser(updatedUser);
      localStorage.setItem("sme_session", JSON.stringify(updatedUser));
      
      setTempProfileImg(null);
      setTempProfileFile(null);
      setProfileZoom(1);
      setToast("프로필 사진이 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      setToast("삭제 실패 ❌");
    }
  };

  const handleUpdateProfile = async (newBio: string, avatarUrl?: string, bgColor?: string) => {
    if (!currentUser) return;
    try {
      const updateData: any = { 인사말: newBio };
      if (avatarUrl !== undefined) updateData.아바타 = avatarUrl;
      if (bgColor) updateData.배경색 = bgColor;
      
      updateData.아바타줌 = profileZoom;
      
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

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, "게시글", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const data = postSnap.data();
      const likes = data.좋아요유저 || [];
      const hasLiked = likes.includes(currentUser.닉네임);

      if (hasLiked) {
        await updateDoc(postRef, {
          좋아요유저: likes.filter((n: string) => n !== currentUser.닉네임)
        });
      } else {
        await updateDoc(postRef, {
          좋아요유저: [...likes, currentUser.닉네임]
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    try {
      const postRef = doc(db, "게시글", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const newComment = {
        닉네임: currentUser.닉네임,
        아바타: currentUser.아바타,
        내용: text,
        생성시간: Date.now()
      };

      await updateDoc(postRef, {
        댓글: [...(postSnap.data().댓글 || []), newComment]
      });
      
      // If global input was used, clear it
      if (text === commentInput) setCommentInput("");
      // If inline input was used, clear it
      setInlineInputs({ ...inlineInputs, [postId]: "" });
      
    } catch (err) { console.error(err); }
  };



  const handleDeleteComment = async (postId: string, cmtIndex: number) => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, "게시글", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      const existingComments = postSnap.data().댓글 || [];
      const updatedComments = existingComments.filter((_: any, i: number) => i !== cmtIndex);
      await updateDoc(postRef, { 댓글: updatedComments });
      if (showComments?.id === postId) {
        setShowComments((prev: any) => prev ? { ...prev, 댓글: updatedComments } : prev);
      }
      setToast("댓글이 삭제되었습니다.");
    } catch (err) { console.error(err); }
  };

  const handleProfileImageUpload = async (file: File) => {
    setToast("사진 업로드 중... ⏳");
    try {
      const storageRef = ref(storage, `프로필/${currentUser.닉네임}_${Date.now()}`);
      const uploadSnap = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadSnap.ref);
      // Pass the current color states as well
      handleUpdateProfile(editBio, downloadURL, editBgColor);
    } catch (err) {
      console.error(err);
      setToast("이미지 업로드 실패 ❌");
    }
  };


  const ProfileHeader = ({ name }: { name: string }) => {
    const member = members.find(m => m.닉네임 === name) || (name === currentUser?.닉네임 ? currentUser : (members[0] || { 닉네임: name }));
    const userPosts = posts.filter(p => p.닉네임 === name);
    const isMe = name === currentUser?.닉네임;

    return (
      <div style={{ padding: "0 1.25rem", marginBottom: "1rem" }}>
         <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginBottom: "1.25rem" }}>
             <div style={{ 
               width: "5.5rem", height: "5.5rem", borderRadius: "50%", 
               background: member.배경색 || "var(--secondary)", 
               overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", 
               fontSize: "1.8rem", fontWeight: 800, color: "white", flexShrink: 0
             }}>
               {member.아바타 && member.아바타.startsWith('http') ? 
                 <img src={member.아바타} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${member.아바타줌 || 1})` }} /> : 
                 (name === "admin" ? <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : member.아바타)}
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "space-between", paddingRight: "0.5rem" }}>
               <div style={{ textAlign: "center" }}><div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{userPosts.length}</div><div style={{ fontSize: "0.7rem", opacity: 0.5, fontWeight: 700 }}>게시물</div></div>
               <div style={{ textAlign: "center" }}><div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{member.운동횟수 || 0}</div><div style={{ fontSize: "0.7rem", opacity: 0.5, fontWeight: 700 }}>운동횟수</div></div>
               <div 
                 onClick={() => setIsGradeTableOpen(true)}
                 style={{ textAlign: "center", cursor: "pointer", transition: "0.3s" }}
               >
                  {(() => {
                    const level = getPassionLevel(member.운동횟수 || 0);
                    return (
                      <>
                        <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#475569", display: "flex", alignItems: "baseline", justifyContent: "center", gap: "1px" }}>
                          <span style={{ fontSize: "0.6rem", opacity: 0.4, fontWeight: 800 }}>LV.</span>
                          <span style={{ color: "#1e293b" }}>{level.lv}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: level.color, marginTop: "1px" }}>{level.label}</div>
                      </>
                    );
                  })()}
               </div>
            </div>
         </div>
         <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 900, fontSize: "0.95rem", marginBottom: "0.2rem" }}>{name}</div>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{member.인사말 || "안녕하세요! 득근 중입니다. 💪"}</p>
         </div>
         <div style={{ display: "flex", gap: "0.6rem" }}>
            {isMe && (
              <button 
                onClick={() => { 
                  setEditBio(member.인사말 || ""); 
                  setEditBgColor(member.배경색 || "var(--secondary)");
                  
                  setProfileZoom(member.아바타줌 || 1);
                  setIsEditProfileOpen(true); 
                }}
                style={{ flex: 1, padding: "0.6rem", borderRadius: "0.6rem", background: "rgba(0,0,0,0.05)", fontSize: "0.85rem", fontWeight: 800 }}
              >
                프로필 편집
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
      <main style={{ 
        minHeight: "100vh", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center",
        padding: "2.5rem 1.8rem",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(150deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)"
      }}>
        {/* Animated background orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "-8rem", right: "-6rem", width: "22rem", height: "22rem", borderRadius: "50%", background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)", pointerEvents: "none" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{ position: "absolute", bottom: "-10rem", left: "-6rem", width: "26rem", height: "26rem", borderRadius: "50%", background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", pointerEvents: "none" }}
        />

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: "3rem" }}
        >
          <h1 style={{ 
            fontSize: "2.8rem", fontWeight: 900, lineHeight: 1.1, marginBottom: "0.8rem",
            background: "linear-gradient(135deg, #ffffff 0%, #38bdf8 60%, #6366f1 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            SME<br/>GYM
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.05em" }}>
            {authMode === "login" ? "운동 관리의 시작" : "새로운 시작을 환영합니다"}
          </p>
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={authMode}
            onSubmit={handleAuth}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
          <div style={{ position: "relative" }}>
            <Users size={18} style={{ position: "absolute", left: "1.1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }} />
            <input
              name="nickname" type="text" placeholder="닉네임 (ID)" required
              style={{ 
                width: "100%", padding: "1.1rem 1rem 1.1rem 3rem",
                borderRadius: "1.2rem", fontSize: "16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white", outline: "none",
                backdropFilter: "blur(10px)"
              }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock size={18} style={{ position: "absolute", left: "1.1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }} />
            <input
              name="password" type="password" placeholder="비밀번호" required
              style={{ 
                width: "100%", padding: "1.1rem 1rem 1.1rem 3rem",
                borderRadius: "1.2rem", fontSize: "16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white", outline: "none",
                backdropFilter: "blur(10px)"
              }}
            />
          </div>

          {authMode === "login" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0 0.2rem" }}>
              <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer", accentColor: "#38bdf8" }} />
              <label htmlFor="remember" style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>로그인 상태 유지</label>
            </div>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            style={{ 
              padding: "1.15rem", borderRadius: "1.2rem",
              fontWeight: 900, fontSize: "1rem", marginTop: "0.5rem",
              background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
              color: "white", border: "none",
              boxShadow: "0 8px 32px rgba(56, 189, 248, 0.35)"
            }}
          >
            {authMode === "login" ? "로그인" : "회원가입"}
          </motion.button>

          <button
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            style={{ 
              marginTop: "0.5rem", fontSize: "0.88rem", fontWeight: 700,
              color: "rgba(255,255,255,0.4)", textAlign: "center"
            }}
          >
            {authMode === "login" ? "아직 회원이 아니신가요? → 회원가입" : "이미 회원이신가요? → 로그인"}
          </button>
        </motion.form>
        </AnimatePresence>

        {/* Toast */}
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
    <main className="container" style={{ padding: "1.5rem 0 7.5rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Top Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
           <h1 onClick={() => {setActiveTab("home"); setMenuView(null);}} style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--primary)", cursor: "pointer", letterSpacing: "-0.5px" }}>SME GYM 2.0</h1>
           {currentUser && (
             <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                <div style={{ width: "1.1rem", height: "1.1rem", borderRadius: "50%", background: currentUser.배경색 || "var(--secondary)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                     <img src={currentUser.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1.2})` }} /> : 
                     <div style={{ fontSize: "0.5rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, opacity: 0.8 }}>{currentUser.닉네임}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: getPassionLevel(currentUser.운동횟수 || 0).color, background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: "4px" }}>
                  {getPassionLevel(currentUser.운동횟수 || 0).label}
                </span>
             </div>
           )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
           {currentUser?.관리자여부 && (
             <motion.div 
               whileTap={{ scale: 0.95 }}
               onClick={handleAggregateAndBackup}
               style={{ 
                 display: "flex", alignItems: "center", gap: "0.4rem",
                 padding: "0.45rem 0.9rem", borderRadius: "1.2rem",
                 background: "var(--primary)",
                 color: "white",
                 cursor: "pointer", transition: "0.3s",
                 boxShadow: "0 4px 12px rgba(56, 189, 248, 0.25)"
               }}
             >
               <History size={17} />
               <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>
                 집계 및 백업
               </span>
             </motion.div>
           )}
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
                <div style={{ padding: "1rem 1.25rem", borderRadius: "1rem", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.1)" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div 
                        onClick={() => setIsNoticeOpen(!isNoticeOpen)}
                        style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, cursor: "pointer" }}
                      >
                         <Megaphone size={16} color="var(--primary)" />
                         <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>
                           {notices.length > 0 ? `[공지] ${notices[0].제목}` : "[공지] 등록된 공지가 없습니다."}
                         </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        {currentUser?.관리자여부 && (
                          <Plus 
                            size={18} 
                            style={{ cursor: "pointer", color: "var(--primary)" }} 
                            onClick={(e) => { e.stopPropagation(); setIsNoticeRegOpen(true); }} 
                          />
                        )}
                        <ChevronDown 
                          size={16} 
                          style={{ cursor: "pointer", transform: isNoticeOpen ? "rotate(180deg)" : "none", transition: "0.3s", opacity: 0.3 }} 
                          onClick={() => setIsNoticeOpen(!isNoticeOpen)}
                        />
                      </div>
                   </div>
                   <AnimatePresence>
                      {isNoticeOpen && notices.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                           <p style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "1rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                             {notices[0].내용}
                           </p>
                           <div style={{ marginTop: "1.2rem", display: "flex", justifyContent: "flex-end" }}>
                              <button 
                                onClick={() => setIsNoticeHistoryOpen(true)}
                                style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--primary)", background: "rgba(56, 189, 248, 0.1)", padding: "0.4rem 0.8rem", borderRadius: "2rem" }}
                              >
                                전체 공지 기록 보기
                              </button>
                           </div>
                        </motion.div>
                      )}
                   </AnimatePresence>
                </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", padding: "0 1.25rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>이번 주 벌금</div><div style={{ fontSize: "1.5rem", fontWeight: 900, color: penalty > 0 ? "var(--warning)" : "var(--success)" }}>{penalty === 0 ? "0원" : `${penalty.toLocaleString()}원`}</div></div>
              <div className="card" style={{ padding: "1.5rem" }}><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>활동 승인</div><div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{workoutCount} / 3</div></div>
            </section>
            
            <section className="card" style={{ margin: "0 1.25rem", padding: "1.5rem" }}>
                <div style={{ marginBottom: "1.8rem" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                      <div style={{ width: "3px", height: "12px", background: "var(--primary)", borderRadius: "2px" }} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, opacity: 0.5, letterSpacing: "1px" }}>나의 운동 현황</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <h3 style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1 }}>
                        {mockNow.getFullYear()}년 <span style={{ color: "var(--primary)" }}>{mockNow.getMonth() + 1}월</span>
                      </h3>
                      <div style={{ fontSize: "0.8rem", fontWeight: 800, opacity: 0.5 }}>
                        이번 주 <span style={{ color: "var(--primary)", opacity: 1 }}>{workoutCount}회</span> 완료
                      </div>
                   </div>
                </div>

               {/* --- Month Calendar Grid --- */}
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", textAlign: "center", marginBottom: "0.5rem" }}>
                 {['월','화','수','목','금','토','일'].map((d, i) => (
                   <span key={i} style={{ fontSize: "0.6rem", fontWeight: 800, opacity: 0.3 }}>{d}</span>
                 ))}
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                  {attendance.map((day, i) => {
                     const isCurrentWeek = weekInfo.some(w => w.날짜 === day.fullDate);
                     
                     // 클릭 가능 여부 판단 (현실 시간 기준)
                     const d = new Date();
                     const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                     const isFuture = day.fullDate > todayStr;
                     const hasRecord = day.상태 !== 'none';
                     const canClick = hasRecord || (isCurrentWeek && !isFuture);

                     return (
                       <motion.div 
                         key={i}
                         whileTap={canClick ? { scale: 0.95 } : {}}
                         onClick={() => {
                           if (!canClick) return;
                           if (day.id) {
                             setSelectedDay(day);
                           } else {
                             setShowUpload({ ...day, day: ['일','월','화','수','목','금','토'][new Date(day.fullDate).getDay()] });
                           }
                         }}
                         style={{ 
                           aspectRatio: "1/1", borderRadius: "0.8rem", 
                           background: isCurrentWeek ? "rgba(56, 189, 248, 0.15)" : "rgba(0,0,0,0.03)",
                           border: isCurrentWeek ? "1px solid rgba(56, 189, 248, 0.3)" : "none",
                           display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                           position: "relative", cursor: canClick ? "pointer" : "default",
                           opacity: !canClick ? (isCurrentWeek ? 0.3 : 0.15) : (day.isCurrentMonth ? 1 : 0.4),
                           transition: "all 0.2s"
                         }}
                      >
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, opacity: isCurrentWeek ? 1 : 0.4, marginBottom: "2px" }}>{day.date}</span>
                        {day.상태 === '승인' ? <Check size={14} color="var(--primary)" strokeWidth={4} /> : 
                         day.상태 === '반려' ? <AlertCircle size={14} color="var(--error)" /> : 
                         day.상태 === '대기' ? <RefreshCw size={12} color="var(--primary)" className="animate-spin" /> : null}
                      </motion.div>
                    );
                  })}
               </div>
               
               <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "1rem", background: "rgba(56, 189, 248, 0.05)", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                     <Trophy size={20} />
                  </div>
                  <div>
                     <p style={{ fontSize: "0.85rem", fontWeight: 800 }}>이번 주 목표까지 <span style={{ color: "var(--primary)" }}>{Math.max(0, 3 - workoutCount)}회</span> 남았습니다!</p>
                     <p style={{ fontSize: "0.7rem", opacity: 0.5 }}>{workoutCount >= 3 ? "목표를 달성하셨습니다! 수고하셨습니다 👏" : "3회 이상 운동 시 벌금이 면제됩니다."}</p>
                  </div>
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
                     <div style={{ 
                        width: "2.2rem", height: "2.2rem", borderRadius: "50%", 
                        background: m.배경색 || "var(--secondary)", 
                        color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                        fontSize: "0.75rem", fontWeight: 800, overflow: "hidden" 
                      }}>
                        {m.아바타 && m.아바타.startsWith('http') ? 
                          <img src={m.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${m.아바타줌 || 1})` }} /> : 
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
            <div style={{ padding: "0 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 900 }}>활동 피드</h2>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowUpload({ isGeneral: true })}
                style={{ 
                  width: "2.8rem", height: "2.8rem", borderRadius: "50%", 
                  background: "var(--primary)", color: "white", 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(56, 189, 248, 0.3)"
                }}
              >
                <Plus size={24} />
              </motion.button>
            </div>
              {posts.map(post => {
                const postMember = members.find(m => m.닉네임.trim() === post.닉네임.trim()) || 
                  { 아바타: post.아바타, 배경색: "var(--secondary)",  아바타줌: 1 };

                return (
                  <article key={post.id} className="card" style={{ padding: "0", overflow: "hidden" }}>
                    <div onClick={() => { setSelectedProfile(post); setActiveTab("profile"); }} style={{ padding: "0.8rem 1.25rem", display: "flex", alignItems: "center", gap: "0.8rem", cursor: "pointer" }}>
                      <div style={{ 
                        width: "2rem", height: "2rem", borderRadius: "50%", 
                        background: postMember.배경색 || "var(--secondary)", 
                         
                        color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                        fontSize: "0.75rem", fontWeight: 900, overflow: "hidden" 
                      }}>
                        {postMember.아바타 && postMember.아바타.startsWith('http') ? 
                          <img src={postMember.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${postMember.아바타줌 || 1})` }} /> : 
                          postMember.아바타}
                      </div>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{post.닉네임}</span>
                    </div>
                    <div style={{ background: isLightMode ? "#f8fafc" : "#0f172a", textAlign: "center", borderBottom: "1px solid var(--glass-border)" }}>
                       <img src={post.이미지URL} alt="feed" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>
                     <div style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.8rem" }}>
                           <motion.div whileTap={{ scale: 1.2 }} onClick={() => handleLike(post.id)}>
                              <Heart 
                                size={26} 
                                style={{ 
                                  cursor: "pointer", 
                                  fill: (post.좋아요유저 || []).includes(currentUser.닉네임) ? "var(--error)" : "none",
                                  color: (post.좋아요유저 || []).includes(currentUser.닉네임) ? "var(--error)" : "inherit"
                                }} 
                              />
                           </motion.div>
                           <MessageCircle 
                             size={26} 
                             style={{ cursor: "pointer" }} 
                             onClick={() => setShowComments(post)} 
                           />
                           <Share2 size={26} style={{ marginLeft: "auto", opacity: 0.5 }} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "0.85rem", marginBottom: "0.4rem" }}>좋아요 {(post.좋아요유저 || []).length}개</div>
                        <p style={{ fontSize: "0.95rem", lineHeight: 1.5, marginBottom: (post.댓글 || []).length > 0 ? "1rem" : "0" }}><span style={{ fontWeight: 900, marginRight: "0.5rem" }}>{post.닉네임}</span>{post.내용}</p>
                        
                         {/* Inline Comments Area */}
                         {(post.댓글 || []).length > 0 && (
                           <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", padding: "0.8rem 0", borderTop: "1px solid rgba(0,0,0,0.03)" }}>
                              {(post.댓글 || []).map((cmt: any, i: number) => {
                                const cmtMember = members.find(m => m.닉네임 === cmt.닉네임);
                                return (
                                  <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.85rem", lineHeight: 1.4 }}>
                                     <div 
                                       onClick={() => {
                                         const target = cmtMember || { 닉네임: cmt.닉네임 };
                                         setSelectedProfile(target);
                                         setActiveTab("profile");
                                         window.scrollTo(0,0);
                                       }}
                                       style={{ width: "1.6rem", height: "1.6rem", borderRadius: "50%", background: cmtMember?.배경색 || "var(--secondary)", overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
                                     >
                                        {cmtMember?.아바타?.startsWith('http') ? 
                                          <img src={cmtMember.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${cmtMember.아바타줌 || 1})` }} /> : 
                                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white" }}>{cmt.닉네임.substring(0,2)}</div>
                                        }
                                     </div>
                                     <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                           <div style={{ flex: 1 }}>
                                              <span 
                                                onClick={() => {
                                                  const target = cmtMember || { 닉네임: cmt.닉네임 };
                                                  setSelectedProfile(target);
                                                  setActiveTab("profile");
                                                  window.scrollTo(0,0);
                                                }}
                                                style={{ fontWeight: 800, marginRight: "0.5rem", cursor: "pointer" }}
                                              >
                                                {cmt.닉네임}
                                              </span>
                                              <span style={{ opacity: 0.8 }}>{cmt.내용}</span>
                                           </div>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                                            <span style={{ fontSize: "0.65rem", opacity: 0.4, whiteSpace: "nowrap" }}>
                                               {new Date(cmt.생성시간).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {(cmt.닉네임 === currentUser.닉네임 || currentUser.닉네임 === 'admin') && (
                                              <button onClick={() => handleDeleteComment(post.id, i)} style={{ fontSize: "0.65rem", color: "var(--error)", opacity: 0.6, fontWeight: 700 }}>삭제</button>
                                            )}
                                         </div>
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                         )}

                        {/* Inline Comment Input */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: (post.댓글 || []).length > 0 ? "0.5rem" : "1rem" }}>
                           <div style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", background: currentUser.배경색 || "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                               {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                                 <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1})` }} /> : 
                                 <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                            </div>
                           <input 
                             value={inlineInputs[post.id] || ""}
                             onChange={(e) => setInlineInputs({ ...inlineInputs, [post.id]: e.target.value })}
                             onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id, inlineInputs[post.id])}
                             placeholder="댓글 달기..." 
                             style={{ flex: 1, height: "2.2rem", borderRadius: "1.1rem", border: "1px solid var(--glass-border)", padding: "0 1rem", outline: "none", fontSize: "0.85rem", background: "rgba(0,0,0,0.02)" }} 
                           />
                           <button 
                             onClick={() => handleAddComment(post.id, inlineInputs[post.id])}
                             disabled={!(inlineInputs[post.id] || "").trim()}
                             style={{ color: "var(--primary)", fontWeight: 900, fontSize: "0.85rem", opacity: (inlineInputs[post.id] || "").trim() ? 1 : 0.2 }}
                           >
                             게시
                           </button>
                        </div>
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
                    <div 
                      key={p.id} 
                      onClick={() => { setShowComments(p); setCommentInput(""); }}
                      style={{ aspectRatio: "1/1", background: "#f0f0f0", cursor: "pointer" }}
                    >
                      <img src={p.이미지URL} alt="gal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                 ))}
                 {posts.filter(p => p.닉네임 === currentUser?.닉네임).length === 0 && (
                   <div style={{ gridColumn: "span 3", textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>첫 인증을 남겨주세요😊</div>
                 )}
              </div>
           </motion.div>
        )}

        {activeTab === "profile" && (
           <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-color)" }}>
              <header style={{ display: "flex", alignItems: "center", padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--glass-border)", position: "sticky", top: 0, background: "var(--bg-color)", zIndex: 10 }}>
                 <ArrowLeft size={24} onClick={() => { setActiveTab("social"); setSelectedProfile(null); }} style={{ cursor: "pointer" }} />
                 <span style={{ flex: 1, textAlign: "center", fontWeight: 900, marginRight: "24px" }}>{selectedProfile?.닉네임}</span>
              </header>
              <div style={{ padding: "1.5rem 0" }}>
                 <ProfileHeader name={selectedProfile?.닉네임} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", borderTop: "1px solid var(--glass-border)", padding: "2px" }}>
                 {posts.filter(p => p.닉네임 === selectedProfile?.닉네임).map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setShowComments(p); setCommentInput(""); }}
                      style={{ aspectRatio: "1/1", background: "#f1f5f9", overflow: "hidden", cursor: "pointer" }}
                    >
                       <img src={p.이미지URL} alt="post" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                 ))}
                 {posts.filter(p => p.닉네임 === selectedProfile?.닉네임).length === 0 && (
                   <div style={{ gridColumn: "span 3", textAlign: "center", padding: "6rem 0", opacity: 0.2 }}>
                      <ImageIcon size={48} style={{ margin: "0 auto 1rem" }} />
                      <p style={{ fontWeight: 800 }}>게시물이 없습니다.</p>
                   </div>
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

                <div style={{
                  display: "flex", background: "var(--background)",
                  borderBottom: "1px solid var(--glass-border)",
                  flexShrink: 0
                }}>
                  {["가입검토", "사진검토", "면제검토", "벌금확인", "멤버관리"].map((tab) => (
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
                      {tab === "벌금확인" ? "벌금" : (tab === "멤버관리" ? "멤버" : tab.replace("검토",""))}
                      {tab === "가입검토" && pendingMembers.length > 0 && (
                        <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{pendingMembers.length}</span>
                      )}
                      {tab === "사진검토" && pendingApprovals.filter(p => !p.유형 || p.유형 === "인증샷").length > 0 && (
                        <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{pendingApprovals.filter(p => !p.유형 || p.유형 === "인증샷").length}</span>
                      )}
                      {tab === "면제검토" && pendingApprovals.filter(p => p.유형 === "면제").length > 0 && (
                        <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{pendingApprovals.filter(p => p.유형 === "면제").length}</span>
                      )}
                      {tab === "벌금확인" && penalties.filter(p => p.상태 === "납부확인중").length > 0 && (
                        <span style={{ background: "var(--error)", color: "white", padding: "1px 5px", borderRadius: "8px", fontSize: "0.55rem", marginLeft: "4px" }}>{penalties.filter(p => p.상태 === "납부확인중").length}</span>
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

                {/* 벌금확인 탭 */}
                {adminApprovalTab === "벌금확인" && (
                  <>
                    <div style={{ background: "rgba(56, 189, 248, 0.05)", padding: "1rem", borderRadius: "1rem", marginBottom: "1rem", border: "1px solid rgba(56, 189, 248, 0.1)" }}>
                      <p style={{ fontSize: "0.75rem", opacity: 0.7, fontWeight: 800, lineHeight: 1.5 }}>
                        현재 달력 하이라이트 기준 **지구 직전 주({getLastWeekRange(mockNow)[0].substring(5)} ~)** 의 정산 현황입니다. ✨
                      </p>
                    </div>
                    {members
                      .filter(m => m.닉네임 !== 'admin')
                      .map(m => {
                        const count = allMembersLastWeekCounts[m.닉네임] || 0;
                        const penaltyAmount = Math.max(0, 3 - count) * 2000;
                        
                        const lastWeekDays = getLastWeekRange(mockNow);
                        const weekId = lastWeekDays[0];
                        const penaltyRecord = penalties.find(p => p.닉네임 === m.닉네임 && p.주차 === weekId);
                        
                        return {
                          ...m,
                          count,
                          penaltyAmount,
                          status: penaltyRecord?.상태 || (penaltyAmount === 0 ? "완료" : "미납"),
                          recordId: penaltyRecord?.id
                        };
                      })
                      .sort((a: any, b: any) => {
                        const order: any = { "납부확인중": 0, "미납": 1, "완료": 2, "완납": 3 };
                        const orderA = order[a.status] ?? 99;
                        const orderB = order[b.status] ?? 99;
                        return orderA - orderB;
                      })
                      .map((item: any) => (
                        <div key={item.닉네임} className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", opacity: item.status === '완료' ? 0.6 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flex: 1, minWidth: 0 }}>
                             <div style={{ 
                               width: "2.5rem", height: "2.5rem", borderRadius: "50%", 
                               background: item.배경색 || "var(--secondary)", flexShrink: 0,
                               color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                               fontWeight: 800, fontSize: "0.85rem", overflow: "hidden" 
                             }}>
                                {item.아바타 && item.아바타.startsWith('http') ? <img src={item.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.아바타}
                             </div>
                             <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>{item.닉네임}</span>
                                  {item.status === "완료" && <span style={{ fontSize: "0.6rem", background: "rgba(34, 197, 94, 0.1)", color: "var(--success)", padding: "2px 5px", borderRadius: "5px", fontWeight: 800 }}>달성</span>}
                                </div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "2px" }}>
                                  {item.status === "완료" ? "3회 달성! 수고하셨습니다 👏" : `${item.count}회 / ${item.penaltyAmount.toLocaleString()}원`}
                                </div>
                             </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                             <button 
                               onClick={() => { setAdminViewUserCalendar(item); fetchUserLastWeekCalendar(item.닉네임); }}
                               style={{ padding: "0.45rem 0.65rem", fontSize: "0.68rem", borderRadius: "0.6rem", background: "rgba(0,0,0,0.04)", fontWeight: 800 }}
                             >기록</button>
                             <div style={{ fontSize: "0.7rem", color: (item.status === '완납' || item.status === '완료') ? "var(--success)" : "var(--error)", fontWeight: 800, margin: "0 0.1rem" }}>
                               {item.status}
                             </div>
                             {item.status === "납부확인중" && item.recordId && (
                               <button onClick={() => handleConfirmPenalty(item.recordId)} className="btn-primary" style={{ padding: "0.5rem 0.8rem", fontSize: "0.75rem", borderRadius: "0.7rem", fontWeight: 800 }}>확인</button>
                             )}
                             {item.status === "미납" && (
                               <button onClick={() => handleAdminManualConfirmPenalty(item)} className="btn-primary" style={{ padding: "0.5rem 0.8rem", fontSize: "0.75rem", borderRadius: "0.7rem", fontWeight: 800 }}>완납</button>
                             )}
                             {(item.status === "완납" || item.status === "완료") && <Check size={20} color="var(--success)" strokeWidth={3} />}
                          </div>
                        </div>
                      ))}
                  </>
                )}
 
                {/* 멤버관리 탭 */}
                {adminApprovalTab === "멤버관리" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {members
                      .sort((a, b) => (a.닉네임 === currentUser?.닉네임 ? -1 : 1))
                      .map((m, i) => (
                        <div key={i} className="card" style={{ padding: "1.1rem", border: "1px solid var(--glass-border)", opacity: m.승인상태 === "탈퇴" ? 0.5 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                               <div style={{ 
                                 width: "2.8rem", height: "2.8rem", borderRadius: "50%", 
                                 background: m.배경색 || "var(--secondary)", flexShrink: 0,
                                 color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                                 fontWeight: 800, fontSize: "0.9rem", overflow: "hidden" 
                               }}>
                                  {m.아바타 && m.아바타.startsWith('http') ? <img src={m.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.아바타}
                               </div>
                               <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "3px" }}>
                                    <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>{m.닉네임}</span>
                                    {m.관리자여부 && <span style={{ fontSize: "0.6rem", background: "var(--primary)", color: "white", padding: "1px 5px", borderRadius: "5px", fontWeight: 800 }}>관리자</span>}
                                    {m.승인상태 === "탈퇴" && <span style={{ fontSize: "0.6rem", background: "#ef4444", color: "white", padding: "1px 5px", borderRadius: "5px", fontWeight: 800 }}>탈퇴</span>}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5 }}>
                                    LV.{getPassionLevel(m.운동횟수 || 0).lv} {getPassionLevel(m.운동횟수 || 0).label}
                                  </div>
                               </div>
                            </div>
                            
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                               <button 
                                 onClick={() => handleToggleAdmin(m.닉네임, m.관리자여부)}
                                 style={{ 
                                   padding: "0.5rem 0.7rem", fontSize: "0.72rem", borderRadius: "0.7rem", 
                                   background: m.관리자여부 ? "rgba(0,0,0,0.05)" : "var(--primary)", 
                                   color: m.관리자여부 ? "inherit" : "white", fontWeight: 800 
                                 }}
                               >
                                 {m.관리자여부 ? "권한해제" : "관리자부여"}
                               </button>
                               {m.승인상태 === "탈퇴" ? (
                                 <button 
                                   onClick={() => handleUpdateMemberStatus(m.닉네임, "승인")}
                                   style={{ padding: "0.5rem 0.7rem", fontSize: "0.72rem", borderRadius: "0.7rem", background: "#22c55e", color: "white", fontWeight: 800 }}
                                 >복구</button>
                               ) : (
                                 <button 
                                   onClick={() => handleUpdateMemberStatus(m.닉네임, "탈퇴")}
                                   style={{ padding: "0.5rem 0.7rem", fontSize: "0.72rem", borderRadius: "0.7rem", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontWeight: 800 }}
                                 >탈퇴</button>
                               )}
                            </div>
                          </div>
                        </div>
                      ))}
                   </div>
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

      <AnimatePresence>
        {menuView === "penalty" && (
          <motion.div initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: "100%" }} style={{ position: "fixed", inset: 0, background: "var(--background)", zIndex: 3000, display: "flex", flexDirection: "column" }}>
             <header style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
                <ArrowLeft onClick={() => setMenuView(null)} style={{ cursor: "pointer" }} />
                <h2 style={{ fontWeight: 900, fontSize: "1.2rem" }}>벌금 관리</h2>
             </header>
             <div style={{ padding: "2rem 1.5rem", flex: 1, overflowY: "auto" }}>
                 <section className="card" style={{ padding: "2rem", textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, opacity: 0.5, marginBottom: "0.5rem" }}>지난 주 나의 활동 (Goal: 3회)</div>
                    <div style={{ fontSize: "3rem", fontWeight: 900, color: "var(--primary)" }}>{lastWeekWorkoutCount} <span style={{ fontSize: "1.2rem", color: "inherit" }}>회</span></div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.4rem", marginTop: "1.5rem" }}>
                      {lastWeekAttendance.map((day, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", padding: "0.5rem 0", borderRadius: "0.8rem", background: "rgba(0,0,0,0.03)" }}>
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, opacity: 0.5 }}>{day.day}</span>
                          {day.상태 === '승인' ? <CheckCircle2 size={14} color="var(--success)" /> : 
                           day.상태 === '반려' ? <AlertCircle size={14} color="var(--error)" /> : 
                           day.상태 === '대기' ? <RefreshCw size={14} color="var(--primary)" className="animate-spin" /> :
                           <span style={{ fontWeight: 800, fontSize: "0.75rem", opacity: 0.2 }}>{day.date}</span>}
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "1.5rem", padding: "0.8rem", borderRadius: "0.8rem", background: "rgba(0,0,0,0.03)", display: "inline-block" }}>
                       <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>미달 횟수: {Math.max(0, 3 - lastWeekWorkoutCount)}회</span>
                    </div>
                 </section>

                 {lastWeekWorkoutCount < 3 ? (
                   <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                      <div className="card" style={{ textAlign: "center", padding: "1.5rem", background: "rgba(0,0,0,0.02)" }}>
                         <h3 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: "0.8rem" }}>납부하실 벌금: <span style={{ color: "var(--error)" }}>{(Math.max(0, 3 - lastWeekWorkoutCount) * 2000).toLocaleString()}원</span></h3>
                         <div style={{ background: "white", padding: "1rem", borderRadius: "0.8rem", marginBottom: "1rem", position: "relative" }}>
                            <p style={{ fontSize: "0.8rem", fontWeight: 700, opacity: 0.6, marginBottom: "0.4rem" }}>입금 계좌</p>
                            <p style={{ fontSize: "0.9rem", fontWeight: 900 }}>카카오뱅크 3333-14-1234567<br/>(예금주: 홍길동)</p>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText("카카오뱅크 3333-14-1234567");
                                setToast("계좌번호가 복사되었습니다! 📋");
                              }}
                              style={{ position: "absolute", top: "50%", right: "1rem", transform: "translateY(-50%)", padding: "0.5rem", borderRadius: "0.5rem", background: "var(--primary)", color: "white" }}
                            >
                              <Copy size={16} />
                            </button>
                         </div>
                         <p style={{ fontSize: "0.75rem", opacity: 0.6, fontWeight: 800 }}>입금 시 닉네임을 꼭 기재해 주세요! <br/>관리자가 입금 확인 후 즉시 완료 처리해 드립니다. 🙏</p>
                      </div>
                     
                     {(() => {
                        const myPenalty = penalties.find(p => p.닉네임 === currentUser.닉네임 && p.주차 === getLastWeekRange(mockNow)[0]);
                        const status = myPenalty?.상태 || "미납";
                        
                        if (status === "미납" || status === "납부확인중") {
                           return <div style={{ padding: "1.25rem", borderRadius: "1.25rem", background: "var(--error)", color: "white", fontWeight: 900, textAlign: "center", boxShadow: "0 10px 20px rgba(239, 68, 68, 0.2)" }}>미납 (입금 대기 중)</div>;
                        }
                        return <div style={{ padding: "1.25rem", borderRadius: "1.25rem", background: "var(--success)", color: "white", fontWeight: 900, textAlign: "center", boxShadow: "0 10px 20px rgba(34, 197, 94, 0.2)" }}>납부 완료! 고생하셨습니다 ✨</div>;
                     })()}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "4rem 0" }}>
                     <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏆</div>
                     <h3 style={{ fontWeight: 900, fontSize: "1.2rem" }}>완벽합니다!</h3>
                     <p style={{ opacity: 0.6, marginTop: "0.5rem" }}>지난 주 목표를 달성하셨습니다.<br/>벌금 납부 대상자가 아닙니다.</p>
                  </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "420px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <h3 style={{ fontWeight: 900, fontSize: "1.1rem" }}>{showUpload.isGeneral ? "새 게시물 작성" : "활동 인증 게시글 작성"}</h3>
                   <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => { setShowUpload(null); setUploadFile(null); setUploadPreview(null); }} />
                </div>

                {!uploadPreview ? (
                  <label style={{ width: "100%", height: "200px", borderRadius: "1rem", border: "2px dashed var(--glass-border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8rem", cursor: "pointer", background: "rgba(0,0,0,0.02)" }}>
                    <ImageIcon size={40} style={{ opacity: 0.15 }} />
                    <span style={{ fontSize: "0.85rem", opacity: 0.5, fontWeight: 700 }}>사진을 선택해주세요</span>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        setUploadPreview(URL.createObjectURL(file));
                      }
                    }} />
                  </label>
                ) : (
                  <div style={{ position: "relative", width: "100%", borderRadius: "1rem", overflow: "hidden", aspectRatio: "1/1", background: "#f8fafc" }}>
                    <img src={uploadPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => { setUploadFile(null); setUploadPreview(null); }} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "rgba(0,0,0,0.6)", color: "white", padding: "0.4rem", borderRadius: "50%" }}>
                       <X size={16} />
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                   <label style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6 }}>피드에 올릴 내용</label>
                   <textarea 
                     value={uploadText}
                     onChange={(e) => setUploadText(e.target.value)}
                     placeholder={showUpload.isGeneral ? "무슨 생각을 하고 계신가요? ✨" : "오늘의 운동 완료! 소감을 남겨주세요... 💪"}
                     style={{ width: "100%", height: "100px", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", padding: "1rem", outline: "none", fontSize: "0.9rem", resize: "none" }}
                   />
                </div>

                <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
                   <button onClick={() => { setShowUpload(null); setUploadFile(null); setUploadPreview(null); }} style={{ flex: 1, padding: "1rem", borderRadius: "1rem", fontWeight: 800, opacity: 0.5, background: "rgba(0,0,0,0.05)" }}>취소</button>
                    <button 
                     onClick={showUpload.isGeneral ? handleGeneralPostUpload : handleUpload}
                     disabled={!uploadFile}
                     className="btn-primary" 
                     style={{ flex: 2, padding: "1rem", borderRadius: "1rem", fontWeight: 800, opacity: !uploadFile ? 0.3 : 1 }}
                   >
                     {showUpload.isGeneral ? "공유하기" : "인증샷 제출하기"}
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


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
                        <div style={{ 
                          width: "8rem", height: "8rem", borderRadius: "50%", 
                          background: editBgColor, 
                          display: "flex", alignItems: "center", justifyContent: "center", 
                          fontSize: "2rem", fontWeight: 800, color: "white", 
                          overflow: "hidden", 
                        }}>
                           {tempProfileImg ? 
                             <img src={tempProfileImg} alt="temp" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${profileZoom})` }} /> : 
                             (currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                               <img src={currentUser.아바타} alt="curr" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${profileZoom})` }} /> : 
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
                        handleUpdateProfile(editBio, undefined, editBgColor);
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


      {/* --- Admin Reject UI --- */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 6000, display: "flex", alignItems: "flex-end" }}>
             <motion.div 
               initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
               style={{ 
                 width: "100%", 
                 maxHeight: "85vh", 
                 background: isLightMode ? "#ffffff" : "#0f172a", 
                 borderTopLeftRadius: "1.5rem", 
                 borderTopRightRadius: "1.5rem", 
                 display: "flex", 
                 flexDirection: "column", 
                 padding: "1.5rem 0",
                 boxShadow: "0 -10px 40px rgba(0,0,0,0.2)"
               }}
             >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1.5rem 1rem 1.5rem", borderBottom: "1px solid var(--glass-border)" }}>
                   <div style={{ width: 40 }} />
                   <h3 style={{ fontWeight: 900, fontSize: "1rem" }}>댓글</h3>
                   <X size={24} style={{ cursor: "pointer", opacity: 0.5 }} onClick={() => setShowComments(null)} />
                </div>
                
                <div style={{ flex: 1, overflowY: "auto" }}>
                   {/* Post Info Header */}
                   <div style={{ padding: "1.5rem", borderBottom: "4px solid var(--glass-border)", background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)" }}>
                      <div style={{ borderRadius: "1.25rem", overflow: "hidden", background: "#f8fafc", marginBottom: "1.25rem", border: "1px solid var(--glass-border)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
                         <img src={showComments.이미지URL} alt="post" style={{ width: "100%", height: "auto", display: "block" }} />
                      </div>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                         <div style={{ width: "2.4rem", height: "2.4rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0, border: "2px solid var(--primary)" }}>
                            {members.find(m => m.닉네임 === showComments.닉네임)?.아바타?.startsWith('http') ? <img src={members.find(m => m.닉네임 === showComments.닉네임).아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, color: "white" }}>{showComments.닉네임.substring(0,2)}</div>}
                         </div>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "1rem", fontWeight: 900 }}>{showComments.닉네임}</div>
                            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, marginTop: "0.4rem", opacity: 0.9, whiteSpace: "pre-wrap" }}>{showComments.내용}</p>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                               <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--error)" }}>
                                  <Heart size={20} fill="var(--error)" />
                                  <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>{(showComments.좋아요유저 || []).length}</span>
                               </div>
                               <div style={{ fontSize: "0.75rem", opacity: 0.4, fontWeight: 700 }}>{new Date(showComments.생성시간).toLocaleString()}</div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Comments List */}
                   <div style={{ padding: "1.5rem" }}>
                      {(showComments.댓글 || []).map((cmt: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem" }}>
                             <div 
                               onClick={() => {
                                 const target = members.find(m => m.닉네임 === cmt.닉네임) || { 닉네임: cmt.닉네임 };
                                 setSelectedProfile(target);
                                 setActiveTab("profile");
                                 setShowComments(null);
                                 window.scrollTo(0,0);
                               }}
                               style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: members.find(m => m.닉네임 === cmt.닉네임)?.배경색 || "var(--secondary)", overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
                             >
                                {(() => {
                                   const cmtMember = members.find(m => m.닉네임 === cmt.닉네임);
                                   return cmtMember?.아바타?.startsWith('http') ? 
                                     <img src={cmtMember.아바타} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${cmtMember.아바타줌 || 1})` }} /> : 
                                     <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: "white" }}>{cmt.닉네임.substring(0,2)}</div>
                                })()}
                             </div>
                           <div style={{ flex: 1 }}>
                              <div 
                                onClick={() => {
                                  const target = members.find(m => m.닉네임 === cmt.닉네임) || { 닉네임: cmt.닉네임 };
                                  setSelectedProfile(target);
                                  setActiveTab("profile");
                                  setShowComments(null);
                                  window.scrollTo(0,0);
                                }}
                                style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.2rem", cursor: "pointer" }}
                              >
                                {cmt.닉네임}
                              </div>
                              <p style={{ fontSize: "0.9rem", lineHeight: 1.4, opacity: 0.8 }}>{cmt.내용}</p>
                              <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.4rem" }}>{new Date(cmt.생성시간).toLocaleString()}</div>
                           </div>
                        </div>
                      ))}
                      {(showComments.댓글 || []).length === 0 && (
                        <div style={{ textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>
                           <MessageCircle size={40} style={{ margin: "0 auto 1rem" }} />
                           <p style={{ fontWeight: 800 }}>첫 댓글을 남겨보세요! 😊</p>
                        </div>
                      )}
                   </div>
                </div>

                <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--glass-border)", display: "flex", gap: "0.8rem", alignItems: "center" }}>
                   <div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: currentUser.배경색 || "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                       {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                         <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1})` }} /> : 
                         <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                    </div>
                   <input 
                     value={commentInput}
                     onChange={(e) => setCommentInput(e.target.value)}
                     onKeyPress={(e) => e.key === 'Enter' && handleAddComment(showComments.id, commentInput)}
                     placeholder="댓글 달기..." 
                     style={{ flex: 1, height: "2.5rem", borderRadius: "1.25rem", border: "1px solid var(--glass-border)", padding: "0 1.25rem", outline: "none", fontSize: "0.9rem", background: "rgba(0,0,0,0.02)" }} 
                   />
                   <button 
                     onClick={() => handleAddComment(showComments.id, commentInput)}
                     disabled={!commentInput.trim()}
                     style={{ color: "var(--primary)", fontWeight: 900, fontSize: "0.9rem", opacity: commentInput.trim() ? 1 : 0.3 }}
                   >
                     게시
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      


      <AnimatePresence>
        {rejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 7000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
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


      <AnimatePresence>
        {isGradeTableOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
             <div className="card" style={{ width: "100%", maxWidth: "380px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Trophy size={22} color="var(--primary)" />
                      <h3 style={{ fontWeight: 900, fontSize: "1.2rem" }}>열정 등급 기준표</h3>
                   </div>
                   <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setIsGradeTableOpen(false)} />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                   {[
                     { lv: "1", label: "존못", range: "0 ~ 5회", color: "#94a3b8" },
                     { lv: "2", label: "그냥못", range: "6 ~ 15회", color: "#64748b" },
                     { lv: "3", label: "평범", range: "16 ~ 30회", color: "#10b981" },
                     { lv: "4", label: "훈훈", range: "31 ~ 60회", color: "#fbbf24" },
                     { lv: "5", label: "역대", range: "61 ~ 100회", color: "#ef4444" },
                     { lv: "6", label: "퀸", range: "101 ~ 150회", color: "#3b82f6" },
                     { lv: "MAX", label: "고고보이", range: "151회+", color: "#f59e0b" },
                   ].map((g, i) => (
                     <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1rem", borderRadius: "1rem", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                           <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#94a3b8" }}>LV.{g.lv}</span>
                           <span style={{ fontWeight: 900, fontSize: "0.95rem", color: g.color }}>{g.label}</span>
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, opacity: 0.5 }}>{g.range}</span>
                     </div>
                   ))}
                </div>
                
                <button onClick={() => setIsGradeTableOpen(false)} style={{ width: "100%", padding: "1.1rem", borderRadius: "1.2rem", background: "var(--primary)", color: "white", fontWeight: 900, marginTop: "0.5rem" }}>확인</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNoticeRegOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
             <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                   <h3 style={{ fontWeight: 900 }}>공지사항 등록</h3>
                   <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setIsNoticeRegOpen(false)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.5 }}>공지 제목</label>
                      <input 
                        value={newNoticeTitle} 
                        onChange={(e) => setNewNoticeTitle(e.target.value)} 
                        placeholder="공지 제목을 입력하세요." 
                        style={{ width: "100%", padding: "1rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none" }} 
                      />
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.5 }}>공지 내용</label>
                      <textarea 
                        value={newNoticeContent} 
                        onChange={(e) => setNewNoticeContent(e.target.value)} 
                        placeholder="공지 내용을 입력하세요." 
                        style={{ width: "100%", height: "150px", padding: "1rem", borderRadius: "1rem", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", outline: "none", resize: "none" }} 
                      />
                   </div>
                   <button onClick={handleAddNotice} style={{ width: "100%", padding: "1.1rem", borderRadius: "1.2rem", background: "var(--primary)", color: "white", fontWeight: 900, marginTop: "0.5rem" }}>공지 게시하기</button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNoticeHistoryOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
             <div className="card" style={{ width: "100%", maxWidth: "460px", maxHeight: "80vh", padding: "2rem", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                   <h3 style={{ fontWeight: 900, fontSize: "1.2rem" }}>전체 공지 내역</h3>
                   <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setIsNoticeHistoryOpen(false)} />
                </div>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                   {notices.map((n, i) => (
                     <div key={i} style={{ padding: "1.5rem", borderRadius: "1.25rem", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 900, marginBottom: "0.6rem" }}>{n.제목}</div>
                        <p style={{ fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: "1rem" }}>{n.내용}</p>
                        <div style={{ fontSize: "0.7rem", opacity: 0.4, fontWeight: 700 }}>
                          {n.생성시간?.toDate ? n.생성시간.toDate().toLocaleString() : "시간 정보 없음"}
                        </div>
                     </div>
                   ))}
                   {notices.length === 0 && (
                     <div style={{ textAlign: "center", padding: "4rem 0", opacity: 0.3 }}>등록된 공지가 없습니다.</div>
                   )}
                </div>
                <button onClick={() => setIsNoticeHistoryOpen(false)} style={{ width: "100%", padding: "1rem", borderRadius: "1rem", background: "var(--primary)", color: "white", fontWeight: 900, marginTop: "1.5rem" }}>닫기</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {adminViewUserCalendar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
             <div className="card" style={{ width: "100%", maxWidth: "360px", padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                   <h3 style={{ fontWeight: 900 }}>{adminViewUserCalendar.닉네임} 활동 기록</h3>
                   <X size={24} style={{ cursor: "pointer", opacity: 0.3 }} onClick={() => setAdminViewUserCalendar(null)} />
                </div>
                
                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                   <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--primary)" }}>{adminViewUserAttendance.filter(d => d.상태 === '승인').length} <span style={{ fontSize: "1rem", color: "inherit" }}>회</span></div>
                   <div style={{ fontSize: "0.8rem", opacity: 0.5, fontWeight: 700 }}>지난 주 운동 기록</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", marginBottom: "2rem" }}>
                   {adminViewUserAttendance.map((day, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", padding: "0.6rem 0", borderRadius: "0.8rem", background: "rgba(0,0,0,0.03)" }}>
                         <span style={{ fontSize: "0.6rem", fontWeight: 700, opacity: 0.5 }}>{day.day}</span>
                         {day.상태 === '승인' ? <CheckCircle2 size={16} color="var(--success)" /> : 
                          day.상태 === '반려' ? <AlertCircle size={16} color="var(--error)" /> : 
                          day.상태 === '대기' ? <RefreshCw size={16} color="var(--primary)" /> :
                          <span style={{ fontWeight: 800, fontSize: "0.8rem", opacity: 0.1 }}>{day.date}</span>}
                      </div>
                   ))}
                </div>

                <button onClick={() => setAdminViewUserCalendar(null)} style={{ width: "100%", padding: "1rem", borderRadius: "1rem", background: "var(--primary)", color: "white", fontWeight: 900 }}>닫기</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav 
        className="glass" 
        initial={{ y: 0, x: "-50%" }}
        animate={{ y: isNavVisible ? 0 : 150, x: "-50%" }}
        transition={{ duration: 0.2 }}
        style={{ position: "fixed", bottom: "1.5rem", left: "50%", width: "calc(100% - 2.5rem)", maxWidth: "420px", height: "4.8rem", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, borderRadius: "2.5rem", background: isLightMode ? "rgba(255,255,255,0.92)" : "rgba(15, 23, 42, 0.85)" }}
      >
        {[ { id: "home", icon: <HomeIcon size={24} />, label: "홈" }, { id: "social", icon: <Users size={24} />, label: "피드" }, { id: "my", icon: <User size={24} />, label: "마이" } ].map(it => (
          <button key={it.id} onClick={() => {setActiveTab(it.id); setSelectedProfile(null); window.scrollTo(0,0); setMenuView(null);}} style={{ display: "flex", flexDirection: "column", alignItems: "center", color: (activeTab === it.id || (it.id === 'social' && activeTab === 'profile')) ? "var(--primary)" : "rgba(128,128,128,0.5)" }}>
            {it.icon} <span style={{ fontSize: "0.65rem", fontWeight: 800 }}>{it.label}</span>
          </button>
        ))}
      </motion.nav>

    </main>
  );
}

