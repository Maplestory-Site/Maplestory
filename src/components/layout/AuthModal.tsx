import { useState } from "react";
import { useMockAuth } from "../../features/profile/MockAuthContext";

export function AuthModal() {
  const { authOpen, closeAuth, login } = useMockAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!authOpen) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login({ name, email });
    setName("");
    setEmail("");
  }

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="mock-auth-title">
      <button aria-label="Close sign in" className="auth-modal__backdrop" onClick={closeAuth} type="button" />
      <div className="auth-modal__panel card">
        <div className="auth-modal__head">
          <span className="section-header__eyebrow">Mock Login</span>
          <button className="auth-modal__close" onClick={closeAuth} type="button">
            Close
          </button>
        </div>
        <h2 id="mock-auth-title">Save your Maple loop</h2>
        <p>Track favorites, saved clips, and watch history in one profile.</p>
        <form className="auth-modal__form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input onChange={(event) => setName(event.target.value)} placeholder="Maple Player" type="text" value={name} />
          </label>
          <label>
            <span>Email</span>
            <input onChange={(event) => setEmail(event.target.value)} placeholder="player@maple.world" type="email" value={email} />
          </label>
          <button className="button button--primary button--full" type="submit">
            Enter Profile
          </button>
        </form>
      </div>
    </div>
  );
}
