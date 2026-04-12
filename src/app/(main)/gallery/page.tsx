"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, RefreshCw, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */
interface ReactionGroup {
  count: number;
  reactorIds: string[];
}

interface GalleryCheckIn {
  id: string;
  userId: string;
  nickname: string;
  profileUrl: string | null;
  dayOfWeek: number;
  status: string | null;
  imageUrl: string | null;
  postContent: string | null;
  createdAt: string;
  reactions: {
    fire: ReactionGroup;
    muscle: ReactionGroup;
    chili: ReactionGroup;
  };
}

type EmojiType = "fire" | "muscle" | "chili";

const EMOJI_MAP: Record<EmojiType, string> = {
  fire: "🔥",
  muscle: "💪",
  chili: "🌶️",
};

const DAY_LABELS = ["", "월", "화", "수", "목", "프", "토", "일"];
const DAY_EMOJI = ["", "💪", "🏃", "🤸", "🏋️", "🧘", "⚽", "🛌"];

/* ─── Palette (Design C - Sporty Dark) ─── */
const C = {
  bg: "#0A0A0A",
  surface: "#1A1A1A",
  surfaceLight: "#222222",
  primary: "#00E676",
  secondary: "#00B0FF",
  text: "#FFFFFF",
  textSub: "#666666",
  textDim: "#444444",
  radius: "20px",
  radiusSm: "14px",
};

/* ─── Avatar Colors ─── */
const AVATAR_COLORS = [
  "#00E676", "#00B0FF", "#FF6D00", "#AA00FF",
  "#FFD600", "#FF1744", "#00BFA5", "#D500F9",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: C.radius,
        padding: "1.25rem",
        border: `1px solid ${C.surfaceLight}`,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "50%",
            background: C.surfaceLight,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <div
            style={{
              width: "6rem",
              height: "0.875rem",
              borderRadius: "4px",
              background: C.surfaceLight,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: "4rem",
              height: "0.6875rem",
              borderRadius: "4px",
              background: C.surfaceLight,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      {/* Image skeleton */}
      <div
        style={{
          width: "100%",
          height: "200px",
          borderRadius: C.radiusSm,
          background: C.surfaceLight,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      {/* Reaction pills skeleton */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: "4rem",
              height: "2rem",
              borderRadius: "999px",
              background: C.surfaceLight,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Gallery Page ─── */
export default function GalleryPage() {
  const supabase = createClient();

  const [checkIns, setCheckIns] = useState<GalleryCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [supabase]);

  // Fetch gallery data from API
  const fetchGallery = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/gallery?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch gallery");
      const data = await res.json();
      return data as { checkIns: GalleryCheckIn[]; hasMore: boolean };
    },
    []
  );

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchGallery();
        setCheckIns(data.checkIns);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Gallery load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchGallery]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchGallery();
      setCheckIns(data.checkIns);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Gallery refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchGallery]);

  // Load more
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || checkIns.length === 0) return;
    try {
      setLoadingMore(true);
      const lastItem = checkIns[checkIns.length - 1];
      const data = await fetchGallery(lastItem.createdAt);
      setCheckIns((prev) => [...prev, ...data.checkIns]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Gallery load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, checkIns, fetchGallery]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const el = observerRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, handleLoadMore]);

  // Toggle reaction
  const handleReaction = useCallback(
    async (checkInId: string, emojiType: EmojiType) => {
      if (!currentUserId || reactingId) return;

      setReactingId(checkInId + emojiType);

      try {
        // Check if user already reacted with this emoji
        const item = checkIns.find((ci) => ci.id === checkInId);
        if (!item) return;

        const reactionGroup = item.reactions[emojiType];
        const alreadyReacted = reactionGroup.reactorIds.includes(currentUserId);

        if (alreadyReacted) {
          // Remove reaction
          const { error } = await supabase
            .from("reactions")
            .delete()
            .eq("check_in_id", checkInId)
            .eq("emoji_type", emojiType)
            .eq("reactor_id", currentUserId);

          if (!error) {
            setCheckIns((prev) =>
              prev.map((ci) => {
                if (ci.id !== checkInId) return ci;
                return {
                  ...ci,
                  reactions: {
                    ...ci.reactions,
                    [emojiType]: {
                      count: ci.reactions[emojiType].count - 1,
                      reactorIds: ci.reactions[emojiType].reactorIds.filter(
                        (id) => id !== currentUserId
                      ),
                    },
                  },
                };
              })
            );
          }
        } else {
          // Add reaction
          const { error } = await supabase.from("reactions").insert({
            check_in_id: checkInId,
            emoji_type: emojiType,
            reactor_id: currentUserId,
          } as never);

          if (!error) {
            setCheckIns((prev) =>
              prev.map((ci) => {
                if (ci.id !== checkInId) return ci;
                return {
                  ...ci,
                  reactions: {
                    ...ci.reactions,
                    [emojiType]: {
                      count: ci.reactions[emojiType].count + 1,
                      reactorIds: [
                        ...ci.reactions[emojiType].reactorIds,
                        currentUserId,
                      ],
                    },
                  },
                };
              })
            );
          }
        }
      } catch (err) {
        console.error("Reaction error:", err);
      } finally {
        setReactingId(null);
      }
    },
    [currentUserId, checkIns, supabase, reactingId]
  );

  // Format time ago
  function timeAgo(dateStr: string): string {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return "";
    }
  }

  return (
    <>
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <main
        style={{
          padding: "1.5rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          minHeight: "60vh",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 900,
                fontFamily: "var(--font-heading)",
                color: C.text,
                letterSpacing: "-0.03em",
              }}
            >
              {"📸"} 갤러리
            </h1>
            <p
              style={{
                fontSize: "0.8125rem",
                color: C.textSub,
                marginTop: "0.25rem",
              }}
            >
              멤버들의 운동 인증 피드
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              background: C.surface,
              border: `1px solid ${C.surfaceLight}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.textSub,
            }}
          >
            <RefreshCw
              size={18}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
          </motion.button>
        </header>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Loading State */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty State */}
        {!loading && checkIns.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "4rem 1rem",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                background: C.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${C.surfaceLight}`,
              }}
            >
              <ImageIcon size={32} style={{ color: C.textDim }} />
            </div>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: C.textSub,
              }}
            >
              아직 공유된 인증이 없어요
            </p>
            <p
              style={{
                fontSize: "0.8125rem",
                color: C.textDim,
                textAlign: "center",
              }}
            >
              운동 인증 시 공개로 설정하면{"\n"}
              여기에 표시됩니다
            </p>
          </motion.div>
        )}

        {/* Feed Cards */}
        {!loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <AnimatePresence mode="popLayout">
              {checkIns.map((item, index) => {
                const avatarColor = getAvatarColor(item.nickname);
                const initial = item.nickname.charAt(0).toUpperCase();
                const dayLabel = DAY_LABELS[item.dayOfWeek] || "";
                const dayEmoji = DAY_EMOJI[item.dayOfWeek] || "";

                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05, duration: 0.35 }}
                    layout
                    style={{
                      background: C.surface,
                      borderRadius: C.radius,
                      padding: "1.25rem",
                      border: `1px solid ${C.surfaceLight}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.875rem",
                    }}
                  >
                    {/* Card Header: Avatar + Name + Time */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      {/* Avatar */}
                      {item.profileUrl ? (
                        <img
                          src={item.profileUrl}
                          alt={item.nickname}
                          style={{
                            width: "2.75rem",
                            height: "2.75rem",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `2px solid ${C.surfaceLight}`,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "2.75rem",
                            height: "2.75rem",
                            borderRadius: "50%",
                            background: `${avatarColor}22`,
                            border: `2px solid ${avatarColor}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "1.125rem",
                              fontWeight: 800,
                              color: avatarColor,
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            {initial}
                          </span>
                        </div>
                      )}

                      {/* Name + workout tag + time */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.9375rem",
                              fontWeight: 700,
                              color: C.text,
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            {item.nickname}
                          </span>
                          {dayLabel && (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                color: C.primary,
                                background: `${C.primary}18`,
                                padding: "0.125rem 0.5rem",
                                borderRadius: "999px",
                              }}
                            >
                              {dayEmoji} {dayLabel}요일 운동
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: C.textSub,
                            marginTop: "0.125rem",
                            display: "block",
                          }}
                        >
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Post content */}
                    {item.postContent && (
                      <p
                        style={{
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                          color: C.text,
                          opacity: 0.9,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.postContent}
                      </p>
                    )}

                    {/* Photo */}
                    {item.imageUrl && (
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          setExpandedImage(
                            expandedImage === item.id ? null : item.id
                          )
                        }
                        style={{
                          position: "relative",
                          width: "100%",
                          borderRadius: C.radiusSm,
                          overflow: "hidden",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={item.imageUrl}
                          alt="운동 인증"
                          style={{
                            width: "100%",
                            height: expandedImage === item.id ? "auto" : "240px",
                            objectFit: expandedImage === item.id ? "contain" : "cover",
                            display: "block",
                            background: C.surfaceLight,
                            transition: "height 0.3s ease",
                          }}
                        />
                        {expandedImage !== item.id && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: "3rem",
                              background:
                                "linear-gradient(transparent, rgba(26, 26, 26, 0.8))",
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </motion.div>
                    )}

                    {/* Reaction Pills */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {(["fire", "muscle", "chili"] as EmojiType[]).map(
                        (emojiType) => {
                          const group = item.reactions[emojiType];
                          const isReacted =
                            currentUserId != null &&
                            group.reactorIds.includes(currentUserId);
                          const isProcessing =
                            reactingId === item.id + emojiType;

                          return (
                            <motion.button
                              key={emojiType}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                handleReaction(item.id, emojiType)
                              }
                              disabled={isProcessing}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                padding: "0.4375rem 0.75rem",
                                borderRadius: "999px",
                                border: isReacted
                                  ? `1.5px solid ${C.primary}`
                                  : `1.5px solid ${C.surfaceLight}`,
                                background: isReacted
                                  ? `${C.primary}15`
                                  : C.bg,
                                cursor: isProcessing
                                  ? "not-allowed"
                                  : "pointer",
                                opacity: isProcessing ? 0.5 : 1,
                                transition: "all 0.2s ease",
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>
                                {EMOJI_MAP[emojiType]}
                              </span>
                              {group.count > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.8125rem",
                                    fontWeight: 700,
                                    color: isReacted ? C.primary : C.textSub,
                                    fontFamily: "var(--font-heading)",
                                    minWidth: "0.75rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {group.count}
                                </span>
                              )}
                            </motion.button>
                          );
                        }
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {/* Load More / Infinite Scroll Sentinel */}
            {hasMore && (
              <div
                ref={observerRef}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "1.5rem 0",
                }}
              >
                {loadingMore ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    <RefreshCw size={20} style={{ color: C.primary }} />
                  </motion.div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLoadMore}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.625rem 1.25rem",
                      borderRadius: "999px",
                      background: C.surface,
                      border: `1px solid ${C.surfaceLight}`,
                      color: C.textSub,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <ChevronDown size={16} />
                    더 보기
                  </motion.button>
                )}
              </div>
            )}

            {/* End of feed */}
            {!hasMore && checkIns.length > 0 && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "0.75rem",
                  color: C.textDim,
                  padding: "1.5rem 0",
                }}
              >
                모든 인증을 확인했어요
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
