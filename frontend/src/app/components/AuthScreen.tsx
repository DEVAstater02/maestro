"use client";

import { useState } from "react";

interface AuthScreenProps {
  onAuthenticated: (token: string, userId: string, name: string) => void;
}

type Mode = "signin" | "signup";

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup-only fields
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [interests, setInterests] = useState("");
  const [learningStyle, setLearningStyle] = useState("");

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint =
        mode === "signup"
          ? "http://localhost:8000/api/auth/signup"
          : "http://localhost:8000/api/auth/signin";

      const body =
        mode === "signup"
          ? { email, password, name, grade: grade || undefined, interests: interests || undefined, learning_style: learningStyle || undefined }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Something went wrong. Please try again.");
        return;
      }

      // Persist token
      localStorage.setItem("maestro_token", data.token);
      localStorage.setItem("maestro_user_id", data.user_id);
      localStorage.setItem("maestro_name", data.name);

      onAuthenticated(data.token, data.user_id, data.name);
    } catch {
      setError("Network error – is the server running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* ── Background orbs ── */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        {/* ── Logo ── */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
          <h1 className="auth-brand">maestro</h1>
          <p className="auth-tagline">Your personalized AI voice tutor</p>
        </div>

        {/* ── Mode tabs ── */}
        <div className="auth-tabs">
          <button
            id="tab-signin"
            className={`auth-tab ${mode === "signin" ? "auth-tab-active" : ""}`}
            onClick={() => switchMode("signin")}
            type="button"
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            className={`auth-tab ${mode === "signup" ? "auth-tab-active" : ""}`}
            onClick={() => switchMode("signup")}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* ── Form ── */}
        <form id="auth-form" className="auth-form" onSubmit={handleSubmit}>
          {/* Name – signup only */}
          {mode === "signup" && (
            <div className="auth-field auth-field-animate">
              <label htmlFor="auth-name" className="auth-label">Full Name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="auth-input"
                required
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="auth-email" className="auth-label">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@example.com"
              className="auth-input"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="auth-password" className="auth-label">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
              className="auth-input"
              required
              minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {/* Grade – signup only */}
          {mode === "signup" && (
            <div className="auth-field auth-field-animate">
              <label htmlFor="auth-grade" className="auth-label">Grade / Level <span className="auth-optional">(optional)</span></label>
              <input
                id="auth-grade"
                type="text"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                placeholder="e.g. 10th Grade, Undergrad, Self-learner"
                className="auth-input"
              />
            </div>
          )}

          {/* Interests – signup only */}
          {mode === "signup" && (
            <div className="auth-field auth-field-animate">
              <label htmlFor="auth-interests" className="auth-label">Interests <span className="auth-optional">(optional)</span></label>
              <input
                id="auth-interests"
                type="text"
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="e.g. Math, Robotics, History"
                className="auth-input"
              />
            </div>
          )}

          {/* Learning Style – signup only */}
          {mode === "signup" && (
            <div className="auth-field auth-field-animate">
              <label htmlFor="auth-style" className="auth-label">How do you prefer to learn? <span className="auth-optional">(optional)</span></label>
              <select
                id="auth-style"
                value={learningStyle}
                onChange={e => setLearningStyle(e.target.value)}
                className="auth-input"
              >
                <option value="">Select a style...</option>
                <option value="Direct">Direct — just explain it clearly</option>
                <option value="Socratic">Socratic — ask me questions, guide me</option>
                <option value="Example-first">Example-first — show me before explaining</option>
                <option value="Visual">Visual — use diagrams and analogies</option>
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit"
            type="submit"
            className="auth-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="auth-spinner" />
            ) : mode === "signup" ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* ── Switch mode link ── */}
        <p className="auth-switch">
          {mode === "signin" ? (
            <>
              New to maestro?{" "}
              <button id="switch-to-signup" className="auth-switch-link" onClick={() => switchMode("signup")} type="button">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button id="switch-to-signin" className="auth-switch-link" onClick={() => switchMode("signin")} type="button">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <style>{`
        .auth-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Background decorative orbs */
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .auth-orb-1 {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, hsl(230 80% 92%) 0%, transparent 70%);
          top: -120px;
          right: -120px;
          animation: orbFloat 8s ease-in-out infinite;
        }
        .auth-orb-2 {
          width: 360px;
          height: 360px;
          background: radial-gradient(circle, hsl(280 70% 92%) 0%, transparent 70%);
          bottom: -80px;
          left: -80px;
          animation: orbFloat 10s ease-in-out infinite reverse;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }

        /* Card */
        .auth-card {
          position: relative;
          z-index: 1;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 24px;
          padding: 40px 36px 36px;
          width: 100%;
          max-width: 420px;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.04),
            0 8px 24px rgba(0,0,0,0.06),
            0 0 0 1px rgba(255,255,255,0.9) inset;
          animation: cardIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* Logo area */
        .auth-logo {
          text-align: center;
          margin-bottom: 28px;
        }
        .auth-logo-icon {
          width: 48px;
          height: 48px;
          background: var(--color-text);
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-bg);
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .auth-brand {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--color-text);
          margin: 0 0 4px;
        }
        .auth-tagline {
          font-size: 13px;
          color: var(--color-text-muted);
          margin: 0;
        }

        /* Tabs */
        .auth-tabs {
          display: flex;
          background: var(--color-surface-alt);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 24px;
          gap: 4px;
        }
        .auth-tab {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 7px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .auth-tab:hover:not(.auth-tab-active) {
          color: var(--color-text);
          background: var(--color-surface);
        }
        .auth-tab-active {
          background: var(--color-bg) !important;
          color: var(--color-text) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        }

        /* Form */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .auth-field-animate {
          animation: fieldSlideIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes fieldSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--color-text-secondary);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .auth-optional {
          font-weight: 400;
          text-transform: none;
          color: var(--color-text-muted);
          letter-spacing: 0;
        }
        .auth-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--color-border);
          border-radius: 10px;
          font-size: 14px;
          color: var(--color-text);
          background: var(--color-bg);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .auth-input::placeholder {
          color: var(--color-text-muted);
        }
        .auth-input:focus {
          border-color: var(--color-text);
          background: var(--color-surface);
          box-shadow: 0 0 0 3px var(--color-border-subtle);
        }

        /* Error */
        .auth-error {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 13px;
          background: var(--color-surface-alt);
          border: 1px solid var(--color-danger);
          border-radius: 8px;
          color: var(--color-danger);
          font-size: 13px;
          font-weight: 500;
          animation: fieldSlideIn 0.2s ease;
        }

        /* Submit button */
        .auth-submit {
          width: 100%;
          padding: 12px;
          background: var(--color-text);
          color: var(--color-bg);
          border: none;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          font-family: inherit;
          letter-spacing: 0.01em;
        }
        .auth-submit:hover:not(:disabled) {
          opacity: 0.88;
        }
        .auth-submit:active:not(:disabled) {
          transform: scale(0.985);
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        .auth-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: var(--color-bg);
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Switch mode */
        .auth-switch {
          text-align: center;
          margin: 18px 0 0;
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .auth-switch-link {
          background: none;
          border: none;
          padding: 0;
          color: var(--color-text);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          font-family: inherit;
        }
        .auth-switch-link:hover {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
