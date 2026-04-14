import { useState } from "react";
import { useMockAuth } from "../../features/profile/MockAuthContext";

export function AuthModal() {
  const { authOpen, closeAuth, login, signup } = useMockAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!authOpen) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "signup") {
      if (!password || password.length < 4) {
        setError("Choose a password with at least 4 characters.");
        return;
      }
      const ok = signup({ username: name, email, password });
      if (!ok) {
        setError("That email is already registered.");
      }
    } else {
      const ok = login({ email, password });
      if (!ok) {
        setError("Invalid email or password.");
      }
    }
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="mock-auth-title">
      <button aria-label="Close sign in" className="auth-modal__backdrop" onClick={closeAuth} type="button" />
      <div className="auth-modal__panel card">
        <div className="auth-modal__head">
          <span className="section-header__eyebrow">Game Account</span>
          <button className="auth-modal__close" onClick={closeAuth} type="button">
            Close
          </button>
        </div>
        <h2 id="mock-auth-title">{mode === "signup" ? "Create your player ID" : "Welcome back"}</h2>
        <p>{mode === "signup" ? "Create a simple account to keep your game progress." : "Log in to keep your progress synced."}</p>
        <div className="auth-modal__tabs">
          <button
            className={`auth-modal__tab ${mode === "login" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`auth-modal__tab ${mode === "signup" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        <form className="auth-modal__form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label>
              <span>Username</span>
              <input onChange={(event) => setName(event.target.value)} placeholder="Maple Player" type="text" value={name} />
            </label>
          ) : null}
          <label>
            <span>Email</span>
            <input onChange={(event) => setEmail(event.target.value)} placeholder="player@maple.world" type="email" value={email} />
          </label>
          <label>
            <span>Password</span>
            <input onChange={(event) => setPassword(event.target.value)} placeholder="••••••" type="password" value={password} />
          </label>
          {error ? <div className="auth-modal__error">{error}</div> : null}
          <button className="button button--primary button--full" type="submit">
            {mode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
