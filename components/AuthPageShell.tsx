/**
 * Оболочка для страниц входа, заявки, регистрации. Фон и декор только из переменных темы.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page relative min-h-screen overflow-visible bg-[var(--color-bg)]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-light-gray)]/80 via-[var(--color-bg)] to-[var(--color-muted)]/20" aria-hidden />
        <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-[var(--color-brand-gold)]/8 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 h-[28rem] w-[28rem] rounded-full bg-[var(--color-navy)]/6 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><circle cx='24' cy='24' r='0.5' fill='%230a192f'/></svg>")`,
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
      </div>
      {children}
    </div>
  );
}
