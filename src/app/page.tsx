"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Dumbbell,
  Flame,
  Trophy,
  ChevronRight,
  User
} from "lucide-react";

export default function Home() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleCheckIn = () => {
    if (checkedIn) return;
    setCheckedIn(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const progress = [true, true, false, true, false, false, false];

  return (
    <main style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "0.875rem", opacity: 0.6, fontWeight: 400 }}>Good Morning,</h2>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Warrior Donnie</h1>
        </div>
        <div className="glass" style={{ width: "2.5rem", height: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={20} />
        </div>
      </header>

      {/* Stats Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
            <Flame size={18} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Streak</span>
          </div>
          <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>12 Days</span>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)" }}>
            <Trophy size={18} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Level</span>
          </div>
          <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>Silver III</span>
        </div>
      </section>

      {/* Main Check-in Area */}
      <section className="glass" style={{ padding: "2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Daily Check-in</h3>
            <p style={{ opacity: 0.6, fontSize: "0.875rem" }}>Have you crushed your workout today?</p>
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
            {checkedIn ? "Workout Completed!" : "Tap to Punch In"}
          </div>
        </div>

        {/* Subtle Background Glow */}
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 70%)",
          zIndex: 1
        }} />
      </section>

      {/* Weekly Progress */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Weekly Progress</h3>
          <span style={{ fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            View History <ChevronRight size={14} />
          </span>
        </div>
        <div className="card" style={{ display: "flex", justifyContent: "space-between", padding: "1.25rem" }}>
          {days.map((day, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.5, fontWeight: 600 }}>{day}</span>
              <div style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "0.5rem",
                background: progress[i] ? "var(--primary)" : "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: progress[i] ? "white" : "transparent"
              }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Recent Activity</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { title: "Leg Day - Quads & Glutes", time: "Yesterday, 6:30 PM", icon: <Dumbbell size={16} /> },
            { title: "Push Session - Chest/Triceps", time: "2 days ago", icon: <Dumbbell size={16} /> }
          ].map((act, i) => (
            <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem" }}>
              <div className="glass" style={{ padding: "0.5rem", color: "var(--primary)" }}>
                {act.icon}
              </div>
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>{act.title}</h4>
                <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>{act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 100,
              background: "radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)"
            }}
          >
            {/* Simple CSS-based confetti or particles could be added here */}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
