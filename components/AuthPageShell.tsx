/**
 * Оболочка для страниц входа, заявки, регистрации. Фон и декор только из переменных темы.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page relative min-h-screen overflow-visible bg-[var(--color-bg)]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-[var(--color-muted)]/10 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 h-[28rem] w-[28rem] rounded-full bg-[var(--color-muted)]/5 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      </div>
      {children}
    </div>
  );
}
