export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "#0A0A0A",
      }}
    >
      <div
        style={{
          marginBottom: "2.5rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#00E676",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textShadow: "0 0 30px rgba(0, 230, 118, 0.3)",
          }}
        >
          SME
        </h1>
        <p
          style={{
            color: "#666666",
            fontSize: "0.8125rem",
            marginTop: "0.375rem",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          GYM / FITNESS CLUB
        </p>
      </div>
      {children}
    </div>
  );
}
