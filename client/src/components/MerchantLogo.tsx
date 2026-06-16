import { useState } from "react";

// Merchant logo: tries the store's favicon/logo, falls back to a deterministic
// colored initial. The CSV has no logos, so most render as the initial avatar.
const COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
];
function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function MerchantLogo({
  domain,
  name,
  className = "h-10 w-10 rounded-lg",
}: {
  domain?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const seed = (name || domain || "?").trim();
  const initial = seed.charAt(0).toUpperCase() || "?";

  if (domain && !failed) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={name ?? domain}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover border bg-white ${className}`}
      />
    );
  }
  return (
    <div className={`flex items-center justify-center text-white font-semibold ${colorFor(seed)} ${className}`}>
      {initial}
    </div>
  );
}
