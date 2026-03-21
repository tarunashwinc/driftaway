export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1A1A2E 0%, #2D1F3D 50%, #FF6B35 150%)" }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#FF6B35]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#06D6A0]/10 blur-3xl" />
      </div>
      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </main>
  );
}
