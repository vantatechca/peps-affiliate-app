import { UserPlus, Ticket, TrendingUp } from "lucide-react";
import { useReveal, useScramble } from "../lib/hooks";
import "./HowItWorks.css";

const STEPS = [
  {
    n: "// 01",
    title: "JOIN FREE",
    desc: "Sign up as an affiliate in minutes. No cost to start.",
    Icon: UserPlus,
  },
  {
    n: "// 02",
    title: "GET YOUR CODE",
    desc: "Receive your own promo code for our top peptide offers.",
    Icon: Ticket,
  },
  {
    n: "// 03",
    title: "SHARE & EARN",
    desc: "Share your code, track every sale, and get paid weekly.",
    Icon: TrendingUp,
  },
];

function StepCard({ step, i }) {
  const [ref, vis] = useReveal();
  const { Icon } = step;
  return (
    <div
      ref={ref}
      className={"how-wrap" + (vis ? " is-in" : "")}
      style={{ transitionDelay: `${i * 0.12}s` }}
    >
      <article className="how-card" style={{ animationDelay: `${i * 0.6}s` }}>
        {/* downward sweep — light strip slides through the card */}
        <span className="how-card__sweep" style={{ animationDelay: `${i * 1.3}s` }} />

        {/* dashed orbital ring around the icon */}
        <span className="how-card__ring" style={{ animationDelay: `${i * 2}s` }} />

        {/* 4 blinking corner brackets */}
        <span className="how-corner tl" />
        <span className="how-corner tr" />
        <span className="how-corner bl" />
        <span className="how-corner br" />

        <div className="how-card__ico" style={{ animationDelay: `${i * 0.4}s` }}>
          <Icon size={32} strokeWidth={1.6} aria-hidden />
        </div>
        <div className="how-card__no">{step.n}</div>
        <div className="how-card__title">{step.title}</div>
        <div className="how-card__desc">{step.desc}</div>

        {/* progress bar at bottom — fills and clears */}
        <span className="how-card__bar" style={{ animationDelay: `${i * 0.8}s` }} />
      </article>
    </div>
  );
}

export default function HowItWorks() {
  const [headRef, headVis] = useReveal();
  const [titleDisplay] = useScramble("HOW IT WORKS", headVis);

  return (
    <section className="section how" id="how-it-works">
      <div ref={headRef} className={"how__head" + (headVis ? " is-in" : "")}>
        <div className="eyebrow how__eyebrow">
          <span className="sq" /> THREE STEPS &nbsp;//&nbsp; NO_005
        </div>
        <h2 className="how__title display">{titleDisplay}</h2>
        <div className="how__sub">// From signup to commission in three simple steps</div>
      </div>

      <div className="how__grid">
        {STEPS.map((s, i) => (
          <StepCard key={s.n} step={s} i={i} />
        ))}
      </div>
    </section>
  );
}
