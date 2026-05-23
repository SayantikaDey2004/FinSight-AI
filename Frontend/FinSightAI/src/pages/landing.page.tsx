import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────
// DESIGN DIRECTION: "Surgical Precision" — financial data
// deserves the aesthetic of a Bloomberg terminal crossed with
// a Swiss editorial magazine. Tight grid, precise numbers,
// monospace data, a near-black base with a single electric
// accent (#00E5C3 teal). No gradients on gradients.
// Typography: "Instrument Serif" (display) + "IBM Plex Mono"
// (data) + "Geist" (body). Every pixel intentional.
// ─────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:        #06080f;
  --ink-2:      #0e1219;
  --ink-3:      #161b26;
  --ink-4:      #1e2535;
  --wire:       rgba(255,255,255,0.07);
  --wire-2:     rgba(255,255,255,0.12);
  --wire-3:     rgba(255,255,255,0.2);
  --paper:      #e8eaf0;
  --paper-dim:  rgba(232,234,240,0.55);
  --paper-faint:rgba(232,234,240,0.25);
  --accent:     #00E5C3;
  --accent-dim: rgba(0,229,195,0.12);
  --accent-mid: rgba(0,229,195,0.35);
  --red:        #FF4D6D;
  --amber:      #F5A623;
  --blue:       #3D8EF0;
  --ff-display: 'Instrument Serif', serif;
  --ff-mono:    'IBM Plex Mono', monospace;
  --ff-body:    'Geist', sans-serif;
}

html { scroll-behavior: smooth; }

body {
  background: var(--ink);
  color: var(--paper);
  font-family: var(--ff-body);
  font-size: 15px;
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: var(--ink); }
::-webkit-scrollbar-thumb { background: var(--ink-4); border-radius: 2px; }

/* ── Selection ── */
::selection { background: var(--accent); color: var(--ink); }

/* ── Nav ── */
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s, background 0.3s;
  padding: 0 clamp(24px, 5vw, 80px);
}
.nav.scrolled {
  background: rgba(6,8,15,0.92);
  backdrop-filter: blur(24px);
  border-color: var(--wire);
}
.nav-inner {
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; max-width: 1280px; margin: 0 auto;
}
.logo {
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; cursor: pointer;
}
.logo-mark {
  width: 32px; height: 32px;
  background: var(--accent);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.logo-mark svg { width: 18px; height: 18px; }
.logo-name {
  font-family: var(--ff-mono);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--paper);
}
.logo-name em {
  font-style: normal;
  color: var(--accent);
}
.logo-beta {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-mid);
  padding: 2px 7px;
  border-radius: 4px;
  vertical-align: middle;
  margin-left: 2px;
}
.nav-links { display: flex; align-items: center; gap: 36px; }
.nav-link {
  font-size: 13px; font-weight: 400;
  color: var(--paper-dim);
  text-decoration: none; cursor: pointer; border: none; background: none;
  font-family: var(--ff-body);
  transition: color 0.2s;
  letter-spacing: 0.01em;
}
.nav-link:hover { color: var(--paper); }
.nav-cta {
  font-size: 13px; font-weight: 500;
  background: var(--accent);
  color: var(--ink);
  border: none; border-radius: 8px;
  padding: 9px 20px;
  cursor: pointer;
  font-family: var(--ff-body);
  letter-spacing: 0.01em;
  transition: opacity 0.2s, transform 0.2s;
  white-space: nowrap;
}
.nav-cta:hover { opacity: 0.88; transform: translateY(-1px); }

/* ── Mobile menu toggle ── */
.hamburger {
  display: none; flex-direction: column; gap: 5px;
  background: none; border: none; cursor: pointer; padding: 4px;
}
.hamburger span {
  display: block; width: 22px; height: 1.5px;
  background: var(--paper); border-radius: 2px;
  transition: transform 0.25s, opacity 0.25s;
}
.hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

.mobile-drawer {
  position: fixed; inset: 0; z-index: 99;
  background: rgba(6,8,15,0.97);
  backdrop-filter: blur(24px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 32px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s;
}
.mobile-drawer.open { opacity: 1; pointer-events: all; }
.mobile-drawer .nav-link {
  font-size: 22px; color: var(--paper-dim);
}

/* ── Section base ── */
section {
  padding: clamp(80px, 12vw, 140px) clamp(24px, 5vw, 80px);
}
.container {
  max-width: 1280px; margin: 0 auto;
}

/* ── Eyebrow ── */
.eyebrow {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 20px;
}
.eyebrow::before {
  content: '';
  display: block; width: 24px; height: 1px;
  background: var(--accent);
  flex-shrink: 0;
}

/* ── Display headings ── */
.display-xl {
  font-family: var(--ff-display);
  font-size: clamp(40px, 6vw, 80px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--paper);
  font-weight: 400;
}
.display-lg {
  font-family: var(--ff-display);
  font-size: clamp(32px, 4.5vw, 60px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--paper);
  font-weight: 400;
}
.display-md {
  font-family: var(--ff-display);
  font-size: clamp(22px, 3vw, 36px);
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--paper);
  font-weight: 400;
}
.italic { font-style: italic; color: var(--accent); }
.muted { color: var(--paper-dim); }

/* ── Body copy ── */
.body-lg { font-size: 17px; line-height: 1.7; color: var(--paper-dim); font-weight: 300; }
.body-md { font-size: 15px; line-height: 1.65; color: var(--paper-dim); }
.body-sm { font-size: 13px; line-height: 1.6; color: var(--paper-faint); }

/* ── Mono data ── */
.mono { font-family: var(--ff-mono); }

/* ── Buttons ── */
.btn-primary {
  display: inline-flex; align-items: center; gap: 9px;
  background: var(--accent); color: var(--ink);
  font-size: 14px; font-weight: 600;
  font-family: var(--ff-body);
  border: none; border-radius: 10px;
  padding: 13px 26px;
  cursor: pointer; letter-spacing: 0.01em;
  transition: opacity 0.2s, transform 0.2s;
  white-space: nowrap;
}
.btn-primary:hover { opacity: 0.88; transform: translateY(-2px); }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 9px;
  background: transparent; color: var(--paper-dim);
  font-size: 14px; font-weight: 400;
  font-family: var(--ff-body);
  border: 1px solid var(--wire-2); border-radius: 10px;
  padding: 13px 26px;
  cursor: pointer; letter-spacing: 0.01em;
  transition: color 0.2s, border-color 0.2s, transform 0.2s;
  white-space: nowrap;
}
.btn-ghost:hover { color: var(--paper); border-color: var(--wire-3); transform: translateY(-2px); }

/* ── Cards ── */
.card {
  background: var(--ink-2);
  border: 1px solid var(--wire);
  border-radius: 16px;
  position: relative; overflow: hidden;
}
.card-bright {
  background: var(--ink-3);
  border: 1px solid var(--wire-2);
  border-radius: 16px;
  position: relative; overflow: hidden;
}
.card-top-line::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0;
  transition: opacity 0.35s;
}
.card-top-line:hover::before { opacity: 1; }
.card-top-line:hover {
  border-color: var(--wire-3);
  transform: translateY(-3px);
  transition: transform 0.3s, border-color 0.3s;
}
.card-top-line { transition: transform 0.3s, border-color 0.3s; }

/* ── Grid layouts ── */
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }

/* ── Hero layout ── */
.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}
@media (max-width: 900px) {
  .hero-grid { grid-template-columns: 1fr; gap: 48px; }
  .hero-visual { display: none; }
}

/* ── Ticker line ── */
@keyframes ticker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.ticker-track {
  display: flex; gap: 0;
  animation: ticker 28s linear infinite;
  width: max-content;
}
.ticker-item {
  display: flex; align-items: center; gap: 20px;
  padding: 0 40px;
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--paper-faint);
  letter-spacing: 0.06em;
  white-space: nowrap;
  border-right: 1px solid var(--wire);
}
.ticker-val {
  color: var(--accent);
  font-weight: 600;
}
.ticker-val.neg { color: var(--red); }

/* ── Stat cards ── */
.stat-num {
  font-family: var(--ff-mono);
  font-size: 32px;
  font-weight: 600;
  color: var(--paper);
  letter-spacing: -0.02em;
}
.stat-label { font-size: 12px; color: var(--paper-faint); letter-spacing: 0.04em; margin-top: 4px; }

/* ── Step numbers ── */
.step-num {
  font-family: var(--ff-mono);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-mid);
  padding: 3px 10px; border-radius: 20px;
  display: inline-block; margin-bottom: 20px;
}

/* ── Feature icon ── */
.feat-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

/* ── Divider ── */
.divider {
  border: none;
  border-top: 1px solid var(--wire);
  margin: 0;
}

/* ── Section with side rule ── */
.side-rule {
  position: relative;
  padding-left: 24px;
}
.side-rule::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, var(--accent), transparent);
}

/* ── Trust badge ── */
.trust-badge {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid var(--wire);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px; font-weight: 400;
  color: var(--paper-dim);
}

/* ── Before/after ── */
.before-after-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 520px) { .before-after-row { grid-template-columns: 1fr; } }

/* ── Health ring animation ── */
@keyframes ring-draw {
  from { stroke-dashoffset: 220; }
  to   { stroke-dashoffset: 50; }
}
.ring-fill-animated {
  animation: ring-draw 1.8s 0.4s cubic-bezier(.4,0,.2,1) both;
}

/* ── Bar animations ── */
@keyframes bar-in {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
.bar-animated { transform-origin: bottom; animation: bar-in 0.7s ease forwards; }

/* ── Fade up ── */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up   { animation: fade-up 0.7s ease both; }
.fade-up-1 { animation: fade-up 0.7s 0.1s ease both; }
.fade-up-2 { animation: fade-up 0.7s 0.2s ease both; }
.fade-up-3 { animation: fade-up 0.7s 0.3s ease both; }
.fade-up-4 { animation: fade-up 0.7s 0.45s ease both; }

/* ── Float ── */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
.float { animation: float 5s ease-in-out infinite; }

/* ── Pulse dot ── */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
.pulse-dot { animation: pulse-dot 1.8s ease-in-out infinite; }

/* ── Responsive nav ── */
@media (max-width: 720px) {
  .nav-links, .nav-cta { display: none; }
  .hamburger { display: flex; }
}

/* ── CTA section ── */
.cta-section {
  background: var(--ink-2);
  border-top: 1px solid var(--wire);
  border-bottom: 1px solid var(--wire);
  padding: clamp(80px, 10vw, 120px) clamp(24px, 5vw, 80px);
  text-align: center;
}

/* ── Footer ── */
footer {
  background: var(--ink);
  border-top: 1px solid var(--wire);
  padding: 64px clamp(24px, 5vw, 80px) 40px;
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  max-width: 1280px; margin: 0 auto 48px;
}
@media (max-width: 768px) {
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .footer-grid { grid-template-columns: 1fr; }
}
.footer-link {
  display: block;
  font-size: 13px;
  color: var(--paper-faint);
  text-decoration: none; cursor: pointer;
  margin-bottom: 10px;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--paper-dim); }

/* ── Noise overlay ── */
.noise {
  position: fixed; inset: 0; z-index: 1000; pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ── Crosshair corner decoration ── */
.crosshair {
  position: absolute;
  width: 16px; height: 16px;
}
.crosshair::before, .crosshair::after {
  content: ''; position: absolute;
  background: var(--accent-mid);
}
.crosshair::before { width: 1px; height: 100%; left: 50%; top: 0; }
.crosshair::after  { width: 100%; height: 1px; top: 50%; left: 0; }
.crosshair.tl { top: 12px; left: 12px; }
.crosshair.tr { top: 12px; right: 12px; }
.crosshair.br { bottom: 12px; right: 12px; }
`;

// ── Mini SVG icons ──────────────────────────────────────────
const Icon = {
  chart: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.5L7 9l3 3 5-6"/>
      <path d="M3 16.5h12"/>
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12v2a1 1 0 001 1h10a1 1 0 001-1v-2"/>
      <path d="M9 3v9m-3-3l3-3 3 3"/>
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 3.5C5 3.5 3.5 4.7 3.5 6.5c0 .8.3 1.5.8 2a2.5 2.5 0 000 3 2.5 2.5 0 001.7 4H9"/>
      <path d="M11.5 3.5C13 3.5 14.5 4.7 14.5 6.5c0 .8-.3 1.5-.8 2a2.5 2.5 0 010 3 2.5 2.5 0 01-1.7 4H9"/>
      <path d="M9 4v10"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L3 5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L9 2z"/>
      <path d="M6.5 9l2 2 3-3"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L2 15h14L9 2z"/>
      <path d="M9 8v3m0 2.5v.5"/>
    </svg>
  ),
  repeat: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V6a2 2 0 012-2h7.5L15 5.5"/>
      <path d="M14 9v3a2 2 0 01-2 2H4.5L3 12.5"/>
      <path d="M12 2.5l2.5 2.5L12 8"/>
      <path d="M6 15.5L3.5 13 6 10"/>
    </svg>
  ),
  trending: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13L7 8l3 3 6-7"/>
      <path d="M12 4h4v4"/>
    </svg>
  ),
  pie: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2a7 7 0 107 7H9V2z"/>
      <path d="M9 2v7h7"/>
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2L5 10h5.5L7.5 16 13 8H7.5L10.5 2z"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="8" width="11" height="8" rx="2"/>
      <path d="M6 8V6a3 3 0 016 0v2"/>
    </svg>
  ),
  target: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7"/>
      <circle cx="9" cy="9" r="3.5"/>
      <circle cx="9" cy="9" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7"/>
      <path d="M9 5.5V9l2.5 2.5"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9.5l4 4 7-8"/>
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h12m-5-5l5 5-5 5"/>
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
      <circle cx="9" cy="9" r="2.5"/>
    </svg>
  ),
  file: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2H5a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6.5L10.5 2z"/>
      <path d="M10.5 2v4.5H14"/>
      <path d="M6.5 9h5m-5 2.5h3"/>
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v3m0 8v3M2 9h3m8 0h3"/>
      <path d="M4.2 4.2l2.1 2.1m5.4 5.4l2.1 2.1M13.8 4.2l-2.1 2.1M6.3 11.7l-2.1 2.1"/>
    </svg>
  ),
};

// ── Dashboard Mockup ───────────────────────────────────────
function DashMock() {
  const bars = [38, 52, 44, 68, 47, 72, 58, 85, 60, 74, 66, 92];
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  return (
    <div className="float" style={{ position:'relative', maxWidth:460, margin:'0 auto' }}>
      {/* Ambient glow */}
      <div style={{
        position:'absolute', inset:-60, borderRadius:'50%',
        background:'radial-gradient(ellipse at 50% 50%, rgba(0,229,195,0.06), transparent 70%)',
        pointerEvents:'none', zIndex:0
      }}/>

      <div className="card-bright" style={{ padding:24, position:'relative', zIndex:1, boxShadow:'0 40px 80px rgba(0,0,0,0.6)' }}>
        <div className="crosshair tl"/>
        <div className="crosshair tr"/>
        <div className="crosshair br"/>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, letterSpacing:'0.12em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:4 }}>Financial Overview</div>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600, color:'var(--paper)' }}>June 2025</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--accent-dim)', border:'1px solid var(--accent-mid)', borderRadius:6, padding:'4px 10px' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)' }} className="pulse-dot"/>
            <span style={{ fontFamily:'var(--ff-mono)', fontSize:9, fontWeight:600, color:'var(--accent)', letterSpacing:'0.1em' }}>LIVE ANALYSIS</span>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'Income', val:'₹1,24,500', badge:'+8.2%', up:true },
            { label:'Expense', val:'₹78,300', badge:'-3.1%', up:false },
            { label:'Savings', val:'₹46,200', badge:'+18%', up:true },
          ].map(({ label, val, badge, up }) => (
            <div key={label} style={{
              background:'var(--ink)', border:'1px solid var(--wire)',
              borderRadius:12, padding:'10px 12px'
            }}>
              <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, letterSpacing:'0.1em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
              <div style={{ fontFamily:'var(--ff-mono)', fontSize:13, fontWeight:600, color:'var(--paper)', marginBottom:4 }}>{val}</div>
              <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, fontWeight:600, color: up ? 'var(--accent)' : 'var(--red)' }}>{badge}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ background:'var(--ink)', border:'1px solid var(--wire)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
          <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, letterSpacing:'0.1em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:10 }}>Monthly Trend</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:44 }}>
            {bars.map((h,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'100%' }}>
                <div className="bar-animated" style={{
                  height:`${h}%`,
                  borderRadius:'2px 2px 0 0',
                  animationDelay:`${i*0.04}s`,
                  background: i===11 ? 'var(--accent)' : 'rgba(255,255,255,0.08)'
                }}/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', marginTop:5 }}>
            {months.map(m=>(
              <div key={m} style={{ flex:1, textAlign:'center', fontFamily:'var(--ff-mono)', fontSize:8, color:'var(--paper-faint)' }}>{m}</div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:10 }}>
          {/* Spend breakdown */}
          <div style={{ background:'var(--ink)', border:'1px solid var(--wire)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, letterSpacing:'0.1em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:10 }}>Breakdown</div>
            {[['Food','30%','#3D8EF0'],['Transport','20%','var(--accent)'],['Shopping','25%','#818cf8'],['Others','25%','var(--amber)']].map(([l,v,c])=>(
              <div key={l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:c, flexShrink:0 }}/>
                  <span style={{ fontFamily:'var(--ff-mono)', fontSize:9, color:'var(--paper-faint)' }}>{l}</span>
                </div>
                <span style={{ fontFamily:'var(--ff-mono)', fontSize:9, fontWeight:600, color:'var(--paper-dim)' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Health score */}
          <div style={{ background:'var(--ink)', border:'1px solid var(--wire)', borderRadius:12, padding:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:8, letterSpacing:'0.1em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:8, textAlign:'center' }}>Health</div>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
              <circle cx="30" cy="30" r="22" fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray="138" className="ring-fill-animated"
                transform="rotate(-90 30 30)"/>
              <text x="30" y="34" textAnchor="middle" style={{ fill:'var(--paper)', fontSize:'11px', fontFamily:'var(--ff-mono)', fontWeight:600 }}>782</text>
            </svg>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, color:'var(--accent)', fontWeight:600, marginTop:5 }}>Excellent</div>
          </div>
        </div>

        {/* AI insight strip */}
        <div style={{
          marginTop:12, background:'rgba(0,229,195,0.06)',
          border:'1px solid var(--accent-mid)',
          borderRadius:10, padding:'10px 14px',
          display:'flex', alignItems:'flex-start', gap:10
        }}>
          <div style={{ color:'var(--accent)', flexShrink:0, marginTop:1 }}><svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{Icon.sparkle.props.children}</svg></div>
          <div>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:8, letterSpacing:'0.12em', color:'var(--accent)', textTransform:'uppercase', marginBottom:3 }}>AI Insight</div>
            <div style={{ fontFamily:'var(--ff-body)', fontSize:11, color:'var(--paper-dim)', lineHeight:1.5 }}>
              Dining expenses up <span style={{ color:'var(--red)', fontWeight:600 }}>24%</span>. Cutting food delivery saves <span style={{ color:'var(--accent)', fontWeight:600 }}>₹4,200/mo</span>.
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="float" style={{
        position:'absolute', top:-16, right:-16, zIndex:10,
        background:'var(--ink-3)', border:'1px solid var(--wire-2)',
        borderRadius:10, padding:'8px 14px',
        boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
        animationDelay:'1.2s'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} className="pulse-dot"/>
          <span style={{ fontFamily:'var(--ff-mono)', fontSize:10, color:'var(--accent)', fontWeight:600, letterSpacing:'0.05em' }}>AI Processing</span>
        </div>
      </div>

      <div style={{
        position:'absolute', bottom:-14, left:-14, zIndex:10,
        background:'var(--ink-3)', border:'1px solid rgba(255,77,109,0.3)',
        borderRadius:10, padding:'7px 12px',
        boxShadow:'0 8px 24px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ color:'var(--red)', flexShrink:0 }}>{Icon.alert}</div>
          <span style={{ fontFamily:'var(--ff-mono)', fontSize:10, color:'var(--paper-faint)' }}>2 unusual transactions</span>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function StatementIQ() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);

  const goTo = (path: string) => {
    setMenuOpen(false);
    setAuthMenuOpen(false);
    navigate(path);
  };

  const goSignup = () => goTo("/signup");
  const goLogin = () => goTo("/login");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Security', id: 'security' },
  ];

  const tickerItems = [
    { label: 'SAVINGS RATE', val: '+18.4%', pos: true },
    { label: 'FOOD DELIVERY', val: '-₹4,200', pos: false },
    { label: 'SUBSCRIPTIONS', val: '12 active', pos: null },
    { label: 'HEALTH SCORE', val: '782 / 850', pos: true },
    { label: 'EMI LOAD', val: '22% of income', pos: null },
    { label: 'INVESTMENTS', val: '+₹8,000/mo', pos: true },
    { label: 'UNUSUAL TXN', val: '2 flagged', pos: false },
    { label: 'NET SAVINGS', val: '₹46,200', pos: true },
  ];

  const doubled = [...tickerItems, ...tickerItems];

  return (
    <>
      <style>{STYLES}</style>
      <div className="noise"/>

      {/* ══ MOBILE DRAWER ══ */}
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
        {navLinks.map(n => (
          <button key={n.id} className="nav-link" style={{ fontSize:28 }} onClick={() => go(n.id)}>{n.label}</button>
        ))}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
          <button className="btn-ghost" style={{ fontSize:15, padding:'12px 28px' }} onClick={goLogin}>
            Sign in
          </button>
          <button
            className="btn-primary"
            style={{ fontSize:15, padding:'12px 28px' }}
            onClick={() => setAuthMenuOpen((open) => !open)}
          >
            Get started
          </button>
        </div>
        {authMenuOpen && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, width:'min(320px, 90vw)' }}>
            <button className="btn-ghost" style={{ justifyContent:'center' }} onClick={goLogin}>
              Sign in
            </button>
            <button className="btn-primary" style={{ justifyContent:'center' }} onClick={goLogin}>
              Login
            </button>
          </div>
        )}
      </div>

      {/* ══ NAV ══ */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="logo" onClick={() => go('home')}>
            <div className="logo-mark" style={{ color: 'var(--ink)' }}>
              <svg viewBox="0 0 18 18" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13L7 9l3 3 5-6"/>
                <path d="M3 16.5h12"/>
              </svg>
            </div>
            <span className="logo-name">Statement<em>IQ</em></span>
            <span className="logo-beta">BETA</span>
          </div>

          <div className="nav-links">
            {navLinks.map(n => (
              <button key={n.id} className="nav-link" onClick={() => go(n.id)}>{n.label}</button>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }}>
            <button className="nav-link" style={{ padding:'7px 14px', border:'1px solid var(--wire-2)', borderRadius:8 }} onClick={goLogin}>
              Sign in
            </button>
            <button className="nav-cta" onClick={() => setAuthMenuOpen((open) => !open)}>
              Get started
            </button>
            {authMenuOpen && (
              <div style={{
                position:'absolute',
                top:'calc(100% + 12px)',
                right:0,
                width:220,
                padding:12,
                borderRadius:14,
                background:'rgba(10,14,22,0.98)',
                border:'1px solid var(--wire-2)',
                boxShadow:'0 24px 50px rgba(0,0,0,0.45)',
                display:'flex',
                flexDirection:'column',
                gap:10,
                zIndex:120,
              }}>
                <button className="btn-ghost" style={{ justifyContent:'center', padding:'11px 16px' }} onClick={goLogin}>
                  Sign in
                </button>
                <button className="btn-primary" style={{ justifyContent:'center', padding:'11px 16px' }} onClick={goLogin}>
                  Login
                </button>
              </div>
            )}
          </div>

          <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section id="home" style={{
        minHeight:'100vh', paddingTop:120,
        background:'var(--ink)',
        position:'relative', overflow:'hidden'
      }}>
        {/* Background grid lines */}
        <div style={{
          position:'absolute', inset:0, zIndex:0, pointerEvents:'none',
          backgroundImage:`
            linear-gradient(var(--wire) 1px, transparent 1px),
            linear-gradient(90deg, var(--wire) 1px, transparent 1px)
          `,
          backgroundSize:'80px 80px',
          maskImage:'radial-gradient(ellipse 80% 80% at 50% 30%, black 30%, transparent 80%)'
        }}/>
        {/* Glow */}
        <div style={{
          position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)',
          width:600, height:400, borderRadius:'50%',
          background:'radial-gradient(ellipse at center, rgba(0,229,195,0.05), transparent 70%)',
          pointerEvents:'none', zIndex:0
        }}/>

        <div className="container" style={{ position:'relative', zIndex:1 }}>
          <div className="hero-grid">
            {/* Left */}
            <div>
              <div className="eyebrow fade-up">AI-Powered Financial Intelligence</div>

              <h1 className="display-xl fade-up-1" style={{ marginBottom:24 }}>
                Know exactly<br/>
                where your money<br/>
                <span className="italic">actually goes</span>
              </h1>

              <p className="body-lg fade-up-2" style={{ maxWidth:480, marginBottom:40 }}>
                Upload your Indian bank statement. Our AI parses every transaction, categorizes spending, surfaces patterns, and delivers insights in under 30 seconds.
              </p>

              <div className="fade-up-3" style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:56 }}>
                <button className="btn-primary" onClick={goSignup}>
                  <span style={{ width:16, height:16, color:'var(--ink)', flexShrink:0 }}>{Icon.upload}</span>
                  Get started free
                </button>
                <button className="btn-ghost" onClick={goLogin}>
                  Sign in
                  <span style={{ width:14, height:14, flexShrink:0 }}>{Icon.arrow}</span>
                </button>
              </div>

              {/* Stats */}
              <div className="fade-up-4" style={{ display:'flex', flexWrap:'wrap', gap:40 }}>
                {[
                  ['2.4M+', 'Transactions analyzed'],
                  ['98%', 'Categorization accuracy'],
                  ['< 30s', 'Time to insights'],
                ].map(([val, lbl]) => (
                  <div key={lbl}>
                    <div className="mono" style={{ fontSize:26, fontWeight:600, color:'var(--paper)', letterSpacing:'-0.02em' }}>{val}</div>
                    <div style={{ fontSize:12, color:'var(--paper-faint)', marginTop:4, letterSpacing:'0.02em' }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right visual */}
            <div className="hero-visual fade-up-2">
              <DashMock/>
            </div>
          </div>
        </div>

        {/* Ticker tape */}
        <div style={{
          marginTop: 80,
          borderTop:'1px solid var(--wire)',
          borderBottom:'1px solid var(--wire)',
          overflow:'hidden', position:'relative', zIndex:1
        }}>
          <div className="ticker-track" style={{ padding:'12px 0' }}>
            {doubled.map((item, i) => (
              <div key={i} className="ticker-item">
                <span>{item.label}</span>
                <span className={`ticker-val ${item.pos === false ? 'neg' : ''}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" style={{ background:'var(--ink-2)' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:80, alignItems:'start' }}>
            {/* Left sticky label */}
            <div style={{ position:'sticky', top:100 }}>
              <div className="eyebrow">The process</div>
              <h2 className="display-md" style={{ marginBottom:20 }}>
                From statement<br/>to clarity in<br/><span className="italic">four steps</span>
              </h2>
              <p className="body-md" style={{ maxWidth:260 }}>
                No spreadsheets. No manual work. Just upload once and understand everything.
              </p>
            </div>

            {/* Steps */}
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {[
                { icon: Icon.file, num:'01', title:'Upload your statement', desc:'Securely upload your PDF or CSV bank statement. We support all major Indian banks — HDFC, ICICI, SBI, Axis, Kotak, and more. Your file never leaves the session.' },
                { icon: Icon.brain, num:'02', title:'AI extracts every transaction', desc:'Our language model intelligently parses each line — amount, merchant, date, type. It handles messy formats, multi-currency entries, and even UPI transaction notes.' },
                { icon: Icon.pie, num:'03', title:'Smart categorization', desc:'Each transaction is auto-tagged across 15+ categories: Food, Travel, Shopping, Utilities, EMIs, Investments, and more. 98% accuracy on first pass, with manual correction support.' },
                { icon: Icon.zap, num:'04', title:'Get your financial picture', desc:'A full report: health score, trend graphs, subscription detector, unusual transaction flags, and a personalized AI narrative of your month — all in under 30 seconds.' },
              ].map(({ icon, num, title, desc }, i) => (
                <div key={num} style={{
                  display:'grid', gridTemplateColumns:'auto 1fr',
                  gap:24, padding:'36px 0',
                  borderBottom: i < 3 ? '1px solid var(--wire)' : 'none'
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:12,
                    background:'var(--accent-dim)', border:'1px solid var(--accent-mid)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'var(--accent)', flexShrink:0
                  }}>
                    {icon}
                  </div>
                  <div>
                    <span className="step-num">Step {num}</span>
                    <h3 style={{ fontFamily:'var(--ff-body)', fontSize:18, fontWeight:500, color:'var(--paper)', marginBottom:10 }}>{title}</h3>
                    <p className="body-md">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" style={{ background:'var(--ink)' }}>
        <div className="container">
          <div style={{ maxWidth:560, marginBottom:72 }}>
            <div className="eyebrow">Capabilities</div>
            <h2 className="display-lg" style={{ marginBottom:20 }}>
              Every tool to master<br/><span className="italic">your money</span>
            </h2>
            <p className="body-lg">
              Raw transaction data becomes actionable intelligence. Here's what StatementIQ surfaces for you.
            </p>
          </div>

          <div className="grid-3">
            {[
              { icon: Icon.pie,      color:'var(--blue)',   title:'Smart Categorization',      desc:'Every debit and credit auto-tagged across 15+ spending categories with 98% accuracy. Edit any tag with one click.', badge:'Core' },
              { icon: Icon.trending, color:'var(--accent)', title:'Income vs Expense',          desc:'Visual cash flow breakdown with month-over-month comparison, trend lines, and projected next-month estimates.', badge:'Analytics' },
              { icon: Icon.repeat,   color:'#818cf8',       title:'Recurring Detection',        desc:'Finds subscriptions, EMIs, and regular payments you forgot about. Cancel button links included.', badge:'Smart' },
              { icon: Icon.alert,    color:'var(--red)',    title:'Unusual Transaction Alerts', desc:'AI flags anomalous spending patterns and potential fraud. Ranked by deviation score for quick review.', badge:'Security' },
              { icon: Icon.brain,    color:'var(--amber)',  title:'AI Financial Summary',       desc:'A human-readable narrative of your financial month — written by AI, tailored precisely to your data.', badge:'AI' },
              { icon: Icon.chart,    color:'var(--accent)', title:'Financial Health Score',     desc:'A composite 0–850 score across savings rate, debt load, spending diversity, investment ratio, and more.', badge:'Score' },
            ].map(({ icon, color, title, desc, badge }) => (
              <div key={title} className="card card-top-line" style={{ padding:28 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
                  <div className="feat-icon" style={{ background:`${color}18`, border:`1px solid ${color}30`, color }}>
                    {icon}
                  </div>
                  <span className="trust-badge" style={{ fontSize:10, fontFamily:'var(--ff-mono)', letterSpacing:'0.08em' }}>{badge}</span>
                </div>
                <h3 style={{ fontFamily:'var(--ff-body)', fontSize:16, fontWeight:500, color:'var(--paper)', marginBottom:10 }}>{title}</h3>
                <p className="body-sm" style={{ lineHeight:1.7, fontSize:13 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY ══ */}
      <section style={{ background:'var(--ink-2)' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center' }}>
            <div>
              <div className="eyebrow">Why StatementIQ</div>
              <h2 className="display-lg" style={{ marginBottom:24 }}>
                Most people don't know<br/><span className="italic">where it goes</span>
              </h2>
              <p className="body-lg" style={{ marginBottom:20 }}>
                Manually reviewing a bank statement is tedious, error-prone, and leaves patterns invisible. Most people have no idea they're spending ₹8,000/month on subscriptions.
              </p>
              <p className="body-md" style={{ marginBottom:36 }}>
                StatementIQ reads your statement in seconds, builds a complete financial picture, and surfaces insights that would take hours to find manually — if you'd ever find them at all.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  'Upload once — understand everything',
                  'No spreadsheets, no manual categorization',
                  'Bank-grade processing, instant results',
                  'Personalized to your spending patterns',
                ].map(pt => (
                  <div key={pt} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:20, height:20, borderRadius:6, background:'var(--accent-dim)', border:'1px solid var(--accent-mid)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'var(--accent)' }}>
                      {Icon.check}
                    </div>
                    <span style={{ fontSize:14, color:'var(--paper-dim)' }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Before / After card */}
            <div className="float">
              <div className="card-bright" style={{ padding:28 }}>
                <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, letterSpacing:'0.14em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:20 }}>Before vs After StatementIQ</div>

                <div className="before-after-row">
                  <div style={{ background:'rgba(255,77,109,0.06)', border:'1px solid rgba(255,77,109,0.2)', borderRadius:12, padding:16 }}>
                    <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, color:'var(--red)', fontWeight:600, letterSpacing:'0.06em', marginBottom:12 }}>WITHOUT AI</div>
                    {['Stare at 200+ raw rows','Miss category overruns','Forget subscriptions','Confusion about savings'].map(t => (
                      <div key={t} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--red)', marginTop:6, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:'var(--paper-faint)', lineHeight:1.5 }}>{t}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background:'rgba(0,229,195,0.06)', border:'1px solid var(--accent-mid)', borderRadius:12, padding:16 }}>
                    <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, color:'var(--accent)', fontWeight:600, letterSpacing:'0.06em', marginBottom:12 }}>WITH IQ</div>
                    {['Instant full picture','Category breakdown','All subscriptions found','Saving recommendations'].map(t => (
                      <div key={t} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                        <div style={{ width:14, height:14, color:'var(--accent)', flexShrink:0, marginTop:2 }}>{Icon.check}</div>
                        <span style={{ fontSize:12, color:'var(--paper-dim)', lineHeight:1.5 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop:16, background:'var(--ink)', border:'1px solid var(--wire)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:16, height:16, color:'var(--accent)', flexShrink:0 }}>{Icon.clock}</div>
                  <span style={{ fontSize:13, color:'var(--paper-dim)' }}>
                    Saves <strong style={{ color:'var(--paper)', fontWeight:600 }}>4–6 hours</strong> of manual review every month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECURITY ══ */}
      <section id="security" style={{ background:'var(--ink)' }}>
        <div className="container">
          <div style={{ textAlign:'center', maxWidth:560, margin:'0 auto 64px' }}>
            <div className="eyebrow" style={{ justifyContent:'center' }}>Security &amp; Trust</div>
            <h2 className="display-lg" style={{ marginBottom:16 }}>
              Your data stays<br/><span className="italic">yours, always</span>
            </h2>
            <p className="body-lg">Built with bank-grade security so you can trust us with your most sensitive financial data.</p>
          </div>

          <div className="grid-4" style={{ marginBottom:48 }}>
            {[
              { icon: Icon.shield, color:'var(--blue)',   title:'End-to-end Encryption', desc:'All data encrypted in transit and at rest. Statements are never stored beyond the session.' },
              { icon: Icon.lock,   color:'#818cf8',       title:'Private by Design',     desc:'Your data is processed only for your analysis. Zero sharing with third parties, ever.' },
              { icon: Icon.target, color:'var(--accent)', title:'No Human Eyes',          desc:'Fully automated pipeline. No human reviews your transactions — everything is algorithmic.' },
              { icon: Icon.zap,    color:'var(--amber)',  title:'Under 30 Seconds',      desc:'Complete analysis delivered fast. No waiting, no queue — instant financial clarity.' },
            ].map(({ icon, color, title, desc }) => (
              <div key={title} className="card" style={{ padding:24 }}>
                <div style={{
                  width:42, height:42, borderRadius:10,
                  background:`${color}15`, border:`1px solid ${color}25`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color, marginBottom:16
                }}>
                  {icon}
                </div>
                <h3 style={{ fontFamily:'var(--ff-body)', fontSize:14, fontWeight:500, color:'var(--paper)', marginBottom:8 }}>{title}</h3>
                <p style={{ fontSize:13, color:'var(--paper-faint)', lineHeight:1.65 }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ paddingTop:40, borderTop:'1px solid var(--wire)', display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            {['256-bit Encryption', 'SOC 2 Ready', 'GDPR Compliant', 'No Data Retention', 'Open Source'].map(b => (
              <div key={b} className="trust-badge">
                <div style={{ width:12, height:12, color:'var(--accent)' }}>{Icon.check}</div>
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <div className="cta-section">
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'var(--accent-dim)', border:'1px solid var(--accent-mid)',
            borderRadius:20, padding:'6px 16px', marginBottom:28
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} className="pulse-dot"/>
            <span className="mono" style={{ fontSize:11, color:'var(--accent)', fontWeight:600, letterSpacing:'0.1em' }}>FREE 14-DAY TRIAL · NO CREDIT CARD</span>
          </div>

          <h2 className="display-lg" style={{ marginBottom:20 }}>
            Ready to understand<br/><span className="italic">your finances?</span>
          </h2>
          <p className="body-lg" style={{ maxWidth:480, margin:'0 auto 40px' }}>
            Upload your statement and get AI-powered insights in seconds. Supports all major Indian banks.
          </p>

          <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:40 }}>
            <button className="btn-primary" style={{ fontSize:15, padding:'15px 32px' }} onClick={goSignup}>
              <span style={{ width:18, height:18 }}>{Icon.upload}</span>
              Create free account
              <span style={{ width:16, height:16 }}>{Icon.arrow}</span>
            </button>
            <button className="btn-ghost" style={{ fontSize:15, padding:'15px 28px' }} onClick={goLogin}>
              Sign in
            </button>
          </div>

          {/* Social proof */}
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:12 }}>
            <div style={{ display:'flex' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  width:28, height:28, borderRadius:'50%',
                  border:'2px solid var(--ink-2)',
                  background:`hsl(${i*55+170},40%,30%)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, color:'var(--paper)', fontWeight:600,
                  fontFamily:'var(--ff-mono)',
                  marginLeft: i===0 ? 0 : -8,
                }}>
                  {String.fromCharCode(65+i)}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:2 }}>
              {[...Array(5)].map((_,i) => (
                <svg key={i} width="13" height="13" viewBox="0 0 18 18" fill="var(--amber)">
                  <path d="M9 1l2.2 6.6H18l-5.4 4 2.1 6.4L9 14 3.3 18l2.1-6.4L0 7.6h6.8L9 1z"/>
                </svg>
              ))}
            </div>
            <span style={{ fontSize:13, color:'var(--paper-faint)' }}>Loved by 1,200+ users in early access</span>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer>
        <div className="footer-grid">
          <div>
            <div className="logo" style={{ marginBottom:16 }}>
              <div className="logo-mark" style={{ color:'var(--ink)' }}>
                <svg viewBox="0 0 18 18" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13L7 9l3 3 5-6"/><path d="M3 16.5h12"/>
                </svg>
              </div>
              <span className="logo-name">Statement<em>IQ</em></span>
            </div>
            <p style={{ fontSize:13, color:'var(--paper-faint)', lineHeight:1.7, maxWidth:240, marginBottom:16 }}>
              AI-powered bank statement analysis for smarter financial decisions.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} className="pulse-dot"/>
              <span className="mono" style={{ fontSize:10, color:'var(--accent)', fontWeight:600, letterSpacing:'0.08em' }}>ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>

          {[
            { title:'Product', links:['Features','How It Works','Pricing','Demo'] },
            { title:'Company', links:['About','Blog','Careers','Press'] },
            { title:'Legal', links:['Privacy Policy','Terms of Service','Security','Contact'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="mono" style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'var(--paper-faint)', textTransform:'uppercase', marginBottom:20 }}>{title}</div>
              {links.map(l => (
                <a key={l} className="footer-link">{l}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{ maxWidth:1280, margin:'0 auto', paddingTop:32, borderTop:'1px solid var(--wire)', display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <span className="mono" style={{ fontSize:11, color:'var(--paper-faint)', letterSpacing:'0.04em' }}>© 2025 StatementIQ. All rights reserved.</span>
          <span className="mono" style={{ fontSize:11, color:'var(--paper-faint)', letterSpacing:'0.04em' }}>Built for AI FinTech Innovation</span>
        </div>
      </footer>
    </>
  );
}