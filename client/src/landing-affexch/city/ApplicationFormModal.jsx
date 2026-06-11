import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { X, ChevronDown, MapPin, Check, ArrowLeft, Send, Copy, ArrowRight } from "lucide-react";
import { useCity } from "./CityContext";
import "./ApplicationFormModal.css";

// Promo code is minted server-side by POST /api/affiliate/apply — see
// server/affexchPromoCode.ts. Format: PEP-XXXX-XXXX, DB-enforced uniqueness.

const FOLLOWER_OPTIONS = [
  "Under 1K",
  "1K–5K",
  "5K–10K",
  "10K–50K",
  "50K+",
];

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  socials: "",
  youtube: "",
  followers: "",
  why: "",
};

const REQUIRED_FIELDS = ["name", "email", "phone", "followers", "why"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /[\d().\-\s+]{7,}/;
const URL_RE = /^(https?:\/\/|www\.)\S+\.\S+|^@[\w._]+$/i;

function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = "Required";
  else if (form.name.trim().length < 2) errs.name = "Too short";

  if (!form.email.trim()) errs.email = "Required";
  else if (!EMAIL_RE.test(form.email.trim())) errs.email = "Invalid email";

  if (!form.phone.trim()) errs.phone = "Required";
  else if (!PHONE_RE.test(form.phone.trim())) errs.phone = "Invalid phone";

  if (form.socials.trim() && !URL_RE.test(form.socials.trim())) {
    errs.socials = "Use a full URL or @handle";
  }
  if (form.youtube.trim() && !URL_RE.test(form.youtube.trim())) {
    errs.youtube = "Use a full URL";
  }

  if (!form.followers) errs.followers = "Select a range";

  if (!form.why.trim()) errs.why = "Required";
  else if (form.why.trim().length < 12) errs.why = "Tell us a bit more (12+ chars)";

  return errs;
}

export default function ApplicationFormModal() {
  const { applicationOpen, closeApplication, city, openModal } = useCity();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [code, setCode] = useState("");
  const [serverError, setServerError] = useState("");
  const panelRef = useRef(null);
  const firstFieldRef = useRef(null);

  // Two-phase mount/unmount so the entrance animation can play
  useEffect(() => {
    if (applicationOpen) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [applicationOpen]);

  // Reset form on every fresh open
  useEffect(() => {
    if (applicationOpen) {
      setForm(EMPTY);
      setTouched({});
      setSubmitted(false);
      setSubmitting(false);
      setCode("");
      setServerError("");
    }
  }, [applicationOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (!applicationOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [applicationOpen]);

  // Esc to close
  useEffect(() => {
    if (!applicationOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeApplication(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applicationOpen, closeApplication]);

  // Auto-focus first field on desktop only
  useEffect(() => {
    if (!applicationOpen) return;
    const isTouch = window.matchMedia("(pointer: coarse), (hover: none)").matches;
    if (isTouch) return;
    const t = setTimeout(() => firstFieldRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, [applicationOpen]);

  const errors = useMemo(() => validate(form), [form]);
  const requiredMissing = REQUIRED_FIELDS.some((k) => !form[k] || (typeof form[k] === "string" && !form[k].trim()));
  const hasErrors = Object.keys(errors).length > 0;
  const canSubmit = !requiredMissing && !hasErrors && !submitting;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const goBackToCity = () => {
    closeApplication();
    // Reopen the city modal once the application has finished closing
    setTimeout(openModal, 360);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Mark everything as touched so error messages surface
    setTouched(REQUIRED_FIELDS.reduce((a, k) => ({ ...a, [k]: true }), {}));
    if (!canSubmit) return;

    setSubmitting(true);
    setServerError("");
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      socials: form.socials.trim() || null,
      youtube: form.youtube.trim() || null,
      followers: form.followers,
      why: form.why.trim(),
      city: city?.name || null,
      cityCode: city?.id || null,
      country: city?.country || null,
    };
    try {
      const resp = await fetch("/api/affiliate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        setServerError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      // Prime the auth cache with the user we just created so App.tsx's
      // protected-route guard sees isAuthenticated=true on the next render
      // and doesn't hard-redirect to /login (which would 404 in ProtectedRouter).
      // See [[affexch-creator-routes]] memory note.
      if (data.user) queryClient.setQueryData(["/api/auth/user"], data.user);
      setCode(data.promoCode);
      setSubmitted(true);
    } catch (err) {
      setServerError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={"appform" + (applicationOpen ? " is-open" : " is-closing")}
      role="dialog"
      aria-modal="true"
      aria-label="Affiliate application form"
    >
      <button type="button" className="appform__backdrop" aria-label="Close" onClick={closeApplication} />

      <div ref={panelRef} className="appform__panel">
        <button type="button" className="appform__close" onClick={closeApplication} aria-label="Close">
          <X size={18} strokeWidth={1.6} />
        </button>

        <span className="appform__corner tl" />
        <span className="appform__corner tr" />
        <span className="appform__corner bl" />
        <span className="appform__corner br" />

        {submitted ? (
          <SuccessView onClose={closeApplication} code={code} />
        ) : (
          <>
            <header className="appform__head">
              <div className="appform__eyebrow">
                <span className="sq" /> AFFILIATE APPLICATION &nbsp;//&nbsp; STEP_02
              </div>
              <h2 className="appform__title display">SUBMIT_APPLICATION</h2>
              <p className="appform__sub">// tell us about you — review in 24 hours</p>
            </header>

            <form className="appform__form" onSubmit={onSubmit} noValidate>
              <Field
                ref={firstFieldRef}
                label="// Full Name"
                name="name"
                value={form.name}
                onChange={set("name")}
                onBlur={blur("name")}
                touched={touched.name}
                error={errors.name}
                placeholder="enter full name"
                required
                autoComplete="name"
              />

              <div className="appform__row">
                <Field
                  label="// Email Address"
                  name="email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={set("email")}
                  onBlur={blur("email")}
                  touched={touched.email}
                  error={errors.email}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <Field
                  label="// Phone Number"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  onBlur={blur("phone")}
                  touched={touched.phone}
                  error={errors.phone}
                  placeholder="+1 555 0123"
                  required
                  autoComplete="tel"
                />
              </div>

              {/* City — read-only, pre-filled from step 1 */}
              <div className="appform__field">
                <label className="appform__label">// City</label>
                <div className="appform__city-chip">
                  <MapPin size={14} strokeWidth={1.7} aria-hidden />
                  <span>{city?.name || "—"}</span>
                  {city && <span className="appform__city-meta">{city.tag} · {city.country}</span>}
                  <button type="button" className="appform__city-change" onClick={goBackToCity}>
                    <ArrowLeft size={11} strokeWidth={1.7} aria-hidden />
                    CHANGE
                  </button>
                </div>
              </div>

              <Field
                label="// Instagram or TikTok"
                name="socials"
                value={form.socials}
                onChange={set("socials")}
                onBlur={blur("socials")}
                touched={touched.socials}
                error={errors.socials}
                placeholder="instagram.com/your_handle or @your_handle"
                autoComplete="url"
                inputMode="url"
              />

              <Field
                label="// YouTube Channel"
                name="youtube"
                value={form.youtube}
                onChange={set("youtube")}
                onBlur={blur("youtube")}
                touched={touched.youtube}
                error={errors.youtube}
                placeholder="youtube.com/@yourchannel"
                autoComplete="url"
                inputMode="url"
              />

              {/* Followers dropdown — styled native select */}
              <div className="appform__field">
                <label className="appform__label" htmlFor="appform-followers">
                  // How many followers do you have?
                  <span className="appform__req">*</span>
                </label>
                <div className={"appform__select-wrap" + (touched.followers && errors.followers ? " has-error" : "")}>
                  <select
                    id="appform-followers"
                    className="appform__select"
                    value={form.followers}
                    onChange={set("followers")}
                    onBlur={blur("followers")}
                    required
                  >
                    <option value="" disabled>select range</option>
                    {FOLLOWER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} strokeWidth={1.6} className="appform__select-ico" />
                </div>
                {touched.followers && errors.followers && <span className="appform__err">{errors.followers}</span>}
              </div>

              {/* Textarea */}
              <div className="appform__field">
                <label className="appform__label" htmlFor="appform-why">
                  // Why do you want to promote peptides?
                  <span className="appform__req">*</span>
                </label>
                <textarea
                  id="appform-why"
                  className={"appform__textarea" + (touched.why && errors.why ? " has-error" : "")}
                  rows={4}
                  placeholder="tell us about your audience, niche, motivation..."
                  value={form.why}
                  onChange={set("why")}
                  onBlur={blur("why")}
                  required
                />
                <div className="appform__counter">
                  {form.why.length}/600
                </div>
                {touched.why && errors.why && <span className="appform__err">{errors.why}</span>}
              </div>

              <button
                type="submit"
                className={"appform__submit" + (canSubmit ? "" : " is-disabled")}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <>
                    <span className="appform__spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <Send size={14} strokeWidth={1.8} aria-hidden />
                    SUBMIT APPLICATION
                  </>
                )}
              </button>

              {serverError && (
                <div className="appform__server-err" role="alert">
                  {serverError}
                </div>
              )}

              <div className="appform__legal">
                // by submitting, you agree to receive promo codes and tracking links.
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ----- Field component (text/email/tel/url) ----- */
const Field = forwardRef(function Field(
  { label, name, type = "text", value, onChange, onBlur, touched, error, placeholder, required, autoComplete, inputMode },
  ref
) {
  const showErr = touched && error;
  return (
    <div className="appform__field">
      <label className="appform__label" htmlFor={`appform-${name}`}>
        {label}
        {required && <span className="appform__req">*</span>}
      </label>
      <input
        ref={ref}
        id={`appform-${name}`}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={"appform__input" + (showErr ? " has-error" : "")}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        spellCheck="false"
      />
      {showErr && <span className="appform__err">{error}</span>}
    </div>
  );
});

/* ----- Scramble-reveal display for the promo code ----- */
const SCRAMBLE_GLYPHS = "アイウエオ!<>-_/\\[]{}=+*^?#0123456789ABCDEF";

function ScrambleCode({ code }) {
  const [out, setOut] = useState(() => code.replace(/[^-]/g, "█"));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!code) return;
    // Each character reveals at its own pace; hyphens stay locked in place.
    const positions = code.split("");
    const lockedAt = positions.map((ch, i) => (ch === "-" ? -1 : 6 + i * 3));
    let frame = 0;
    const total = lockedAt.reduce((m, v) => Math.max(m, v), 0) + 10;
    const iv = setInterval(() => {
      frame++;
      let s = "";
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] === "-") s += "-";
        else if (frame >= lockedAt[i]) s += positions[i];
        else s += SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
      }
      setOut(s);
      if (frame >= total) {
        clearInterval(iv);
        setOut(code);
        setDone(true);
      }
    }, 38);
    return () => clearInterval(iv);
  }, [code]);

  return (
    <div className={"appform__code-text" + (done ? " is-done" : "")} aria-label={code}>
      {out.split("").map((ch, i) => (
        <span key={i} className={"appform__code-ch" + (ch === "-" ? " is-sep" : "")}>{ch}</span>
      ))}
    </div>
  );
}

/* ----- Success screen ----- */
function SuccessView({ onClose, code }) {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-secure contexts / older browsers
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* swallow — user can still triple-click + copy manually */
    }
  };

  const goDashboard = () => {
    onClose();
    // Phase 3: server has already set the session cookie via req.login(),
    // so /creator/dashboard will load authenticated. Give the close animation a beat.
    setTimeout(() => setLocation("/creator/dashboard"), 280);
  };

  return (
    <div className="appform__success">
      <div className="appform__success-ico">
        <Check size={32} strokeWidth={2.4} aria-hidden />
      </div>

      <h2 className="appform__success-title display">APPLICATION RECEIVED</h2>
      <p className="appform__success-sub">// your unique promo code has been assigned</p>

      <div className="appform__code-frame">
        <span className="appform__code-corner tl" />
        <span className="appform__code-corner tr" />
        <span className="appform__code-corner bl" />
        <span className="appform__code-corner br" />
        <div className="appform__code-eyebrow">
          <span className="sq" /> YOUR_PROMO_CODE
        </div>
        <ScrambleCode code={code} />
        <button
          type="button"
          className={"appform__copy" + (copied ? " is-copied" : "")}
          onClick={handleCopy}
          disabled={!code}
        >
          {copied ? (
            <>
              <Check size={14} strokeWidth={2} aria-hidden />
              COPIED
            </>
          ) : (
            <>
              <Copy size={14} strokeWidth={1.8} aria-hidden />
              COPY CODE
            </>
          )}
        </button>
      </div>

      <p className="appform__success-help">
        Share this code with your audience. They enter it at checkout on our peptide
        websites to get their discount.
      </p>

      <div className="appform__success-cta">
        <button type="button" className="appform__submit appform__success-primary" onClick={goDashboard}>
          GO TO MY DASHBOARD
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </button>
        <button type="button" className="appform__success-ghost" onClick={onClose}>
          // close
        </button>
      </div>
    </div>
  );
}
