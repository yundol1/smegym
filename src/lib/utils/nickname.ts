/**
 * 닉네임을 안전한 이메일 로컬파트로 변환
 * ASCII-only 닉네임은 그대로, 비ASCII 포함 시 hex 인코딩
 */
export function nicknameToEmail(nickname: string): string {
  const lower = nickname.toLowerCase();
  // ASCII-only면 그대로 사용 (기존 호환성)
  if (/^[a-z0-9_-]+$/.test(lower)) {
    return `${lower}@smegym.noreply.com`;
  }
  // 비ASCII 포함 시 hex 인코딩
  const encoded = Array.from(new TextEncoder().encode(lower))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `u${encoded}@smegym.noreply.com`;
}
