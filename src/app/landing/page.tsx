"use client";

import { useEffect } from "react";
import Link from "next/link";

const css = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --navy: #0a2342; --navy-light: #0f3060; --navy-mid: #0d2952;
  --blue: #2563eb; --blue-light: #3b82f6; --blue-glow: #60a5fa;
  --cyan: #06b6d4; --white: #ffffff; --gray-50: #f8fafc;
  --gray-100: #f1f5f9; --gray-200: #e2e8f0; --gray-400: #94a3b8;
  --gray-600: #475569; --gray-800: #1e293b;
  --green: #10b981; --amber: #f59e0b;
}
html { scroll-behavior: smooth; }
.lp-body { font-family: 'Inter', 'Open Sans', sans-serif; background: #fff; color: var(--gray-800); line-height: 1.6; -webkit-font-smoothing: antialiased; }

/* NAV */
.lp-nav { position: sticky; top: 0; z-index: 100; background: rgba(10,35,66,0.97); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0 2rem; }
.lp-nav-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 68px; }
.lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.lp-logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, var(--blue), var(--cyan)); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.lp-logo-icon svg { width: 20px; height: 20px; color: white; }
.lp-logo-text { font-size: 0.95rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; line-height: 1.2; }
.lp-logo-sub { font-size: 0.65rem; font-weight: 400; color: var(--blue-glow); letter-spacing: 0.05em; text-transform: uppercase; }
.lp-nav-links { display: flex; align-items: center; gap: 2rem; list-style: none; }
.lp-nav-links a { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: color 0.2s; }
.lp-nav-links a:hover { color: #fff; }
.lp-nav-cta { display: flex; align-items: center; gap: 0.75rem; }
.lp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1.25rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; border: none; font-family: inherit; }
.lp-btn-outline { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); }
.lp-btn-outline:hover { border-color: #fff; background: rgba(255,255,255,0.07); }
.lp-btn-primary { background: var(--blue); color: #fff; }
.lp-btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(37,99,235,0.4); }
.lp-btn-primary-lg { padding: 0.85rem 2rem; font-size: 1rem; border-radius: 8px; }
.lp-btn-ghost-lg { padding: 0.85rem 2rem; font-size: 1rem; border-radius: 8px; background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.35); display: inline-flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; font-family: inherit; }
.lp-btn-ghost-lg:hover { border-color: #fff; background: rgba(255,255,255,0.08); }

/* HERO */
.lp-hero { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 50%, #0a1628 100%); min-height: 88vh; display: flex; align-items: center; position: relative; overflow: hidden; padding: 5rem 2rem; }
.lp-hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%); }
.lp-hero-glow { position: absolute; top: -20%; right: -10%; width: 700px; height: 700px; background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%); pointer-events: none; }
.lp-hero-glow2 { position: absolute; bottom: -20%; left: -5%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%); pointer-events: none; }
.lp-hero-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; position: relative; z-index: 1; }
.lp-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.4); color: var(--blue-glow); padding: 0.3rem 0.9rem; border-radius: 100px; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 1.5rem; }
.lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue-glow); animation: lp-pulse 2s infinite; }
@keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
.lp-hero-title { font-size: clamp(2.2rem,4.5vw,3.4rem); font-weight: 800; color: #fff; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; }
.lp-hero-highlight { background: linear-gradient(90deg, var(--blue-glow), var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.lp-hero-desc { color: rgba(255,255,255,0.65); font-size: 1.1rem; line-height: 1.75; margin-bottom: 2rem; max-width: 520px; }
.lp-hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
.lp-trust { margin-top: 2.5rem; display: flex; align-items: center; gap: 0.75rem; color: rgba(255,255,255,0.45); font-size: 0.8rem; flex-wrap: wrap; }
.lp-trust-div { width: 1px; height: 14px; background: rgba(255,255,255,0.2); }

/* HERO VISUAL */
.lp-dash-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; backdrop-filter: blur(20px); animation: lp-float 6s ease-in-out infinite; position: relative; }
@keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
.lp-dash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.lp-dash-title { color: #fff; font-weight: 700; font-size: 0.9rem; }
.lp-dash-status { display: flex; align-items: center; gap: 5px; background: rgba(16,185,129,0.15); color: var(--green); padding: 3px 10px; border-radius: 100px; font-size: 0.72rem; font-weight: 600; }
.lp-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: lp-pulse 2s infinite; }
.lp-model-list { display: flex; flex-direction: column; gap: 0.6rem; }
.lp-model-row { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
.lp-model-name { color: rgba(255,255,255,0.85); font-size: 0.8rem; font-weight: 500; }
.lp-model-type { color: var(--gray-400); font-size: 0.7rem; }
.lp-risk { padding: 2px 8px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.lp-risk-high { background: rgba(239,68,68,0.15); color: #f87171; }
.lp-risk-medium { background: rgba(245,158,11,0.15); color: #fbbf24; }
.lp-risk-low { background: rgba(16,185,129,0.15); color: #34d399; }
.lp-risk-critical { background: rgba(239,68,68,0.2); color: #ef4444; }
.lp-mini { position: absolute; background: rgba(15,48,96,0.9); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 0.85rem 1.1rem; backdrop-filter: blur(12px); }
.lp-mini-1 { bottom: -30px; left: -40px; animation: lp-float2 5s ease-in-out infinite; }
.lp-mini-2 { top: -30px; right: -30px; animation: lp-float2 7s ease-in-out infinite; }
@keyframes lp-float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
.lp-mini-label { color: var(--gray-400); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; }
.lp-mini-val { color: #fff; font-size: 1.3rem; font-weight: 800; }
.lp-mini-sub { color: var(--green); font-size: 0.7rem; font-weight: 500; }

/* STATS */
.lp-stats { background: var(--navy); border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
.lp-stats-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4,1fr); }
.lp-stat { padding: 2rem 2.5rem; border-right: 1px solid rgba(255,255,255,0.06); text-align: center; transition: background 0.2s; }
.lp-stat:last-child { border-right: none; }
.lp-stat:hover { background: rgba(255,255,255,0.03); }
.lp-stat-num { font-size: 2.5rem; font-weight: 800; background: linear-gradient(90deg, var(--blue-light), var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 0.35rem; }
.lp-stat-label { color: rgba(255,255,255,0.55); font-size: 0.82rem; font-weight: 500; }

/* SECTIONS */
.lp-section { padding: 6rem 2rem; }
.lp-inner { max-width: 1200px; margin: 0 auto; }
.lp-section-label { display: inline-block; color: var(--blue); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
.lp-section-title { font-size: clamp(1.75rem,3vw,2.4rem); font-weight: 800; color: var(--navy); letter-spacing: -0.025em; line-height: 1.2; margin-bottom: 1rem; }
.lp-section-desc { color: var(--gray-600); font-size: 1.05rem; max-width: 580px; line-height: 1.75; }
.lp-header-center { text-align: center; margin-bottom: 3.5rem; }
.lp-header-center .lp-section-desc { margin: 0 auto; }

/* VALUE CARDS */
.lp-gray { background: var(--gray-50); }
.lp-val-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2rem; margin-top: 3.5rem; }
.lp-val-card { background: #fff; border: 1px solid var(--gray-200); border-radius: 12px; padding: 2rem; transition: all 0.3s; position: relative; overflow: hidden; }
.lp-val-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: linear-gradient(90deg,var(--blue),var(--cyan)); opacity:0; transition: opacity 0.3s; }
.lp-val-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(10,35,66,0.1); border-color: var(--blue-light); }
.lp-val-card:hover::before { opacity: 1; }
.lp-val-icon { width: 52px; height: 52px; background: linear-gradient(135deg,rgba(37,99,235,0.1),rgba(6,182,212,0.1)); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; border: 1px solid rgba(37,99,235,0.15); }
.lp-val-icon svg { width: 24px; height: 24px; color: var(--blue); }
.lp-val-title { font-size: 1.15rem; font-weight: 700; color: var(--navy); margin-bottom: 0.6rem; }
.lp-val-desc { color: var(--gray-600); font-size: 0.9rem; line-height: 1.7; margin-bottom: 1.25rem; }
.lp-val-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.lp-val-list li { display: flex; align-items: flex-start; gap: 8px; color: var(--gray-600); font-size: 0.85rem; }
.lp-val-list li::before { content:'✓'; color: var(--blue); font-weight: 700; flex-shrink: 0; margin-top: 1px; }

/* FEATURE SPLIT */
.lp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; margin-bottom: 6rem; }
.lp-split:last-child { margin-bottom: 0; }
.lp-split-rev { direction: rtl; }
.lp-split-rev > * { direction: ltr; }
.lp-feat-label { color: var(--blue); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
.lp-feat-title { font-size: 1.8rem; font-weight: 800; color: var(--navy); letter-spacing: -0.025em; margin-bottom: 1rem; line-height: 1.25; }
.lp-feat-desc { color: var(--gray-600); font-size: 0.95rem; line-height: 1.75; margin-bottom: 1.5rem; }
.lp-feat-pts { display: flex; flex-direction: column; gap: 0.75rem; }
.lp-feat-pt { display: flex; align-items: flex-start; gap: 12px; }
.lp-fp-icon { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,rgba(37,99,235,0.1),rgba(6,182,212,0.08)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(37,99,235,0.12); }
.lp-fp-icon svg { width: 15px; height: 15px; color: var(--blue); }
.lp-fp-text { font-size: 0.88rem; color: var(--gray-600); font-weight: 500; padding-top: 6px; }
.lp-panel { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%); border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.08); min-height: 320px; display: flex; flex-direction: column; gap: 1rem; }
.lp-panel-hdr { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.lp-pdot { width: 10px; height: 10px; border-radius: 50%; }
.lp-panel-title { color: rgba(255,255,255,0.6); font-size: 0.78rem; font-weight: 500; margin-left: auto; }
.lp-metric { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
.lp-mlabel { color: rgba(255,255,255,0.7); font-size: 0.82rem; }
.lp-mval { font-weight: 700; font-size: 0.88rem; }
.lp-good { color: var(--green); } .lp-warn { color: #fbbf24; } .lp-danger { color: #f87171; }
.lp-prog { margin-top: 0.25rem; }
.lp-prog-lbl { display: flex; justify-content: space-between; color: rgba(255,255,255,0.5); font-size: 0.72rem; margin-bottom: 5px; }
.lp-prog-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.lp-prog-fill { height: 100%; border-radius: 3px; }
.fill-blue { background: linear-gradient(90deg,var(--blue),var(--cyan)); }
.fill-green { background: linear-gradient(90deg,#10b981,#34d399); }
.fill-amber { background: linear-gradient(90deg,#f59e0b,#fbbf24); }

/* CAPS */
.lp-cap-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; margin-top: 3.5rem; }
.lp-cap { background: #fff; border: 1px solid var(--gray-200); border-radius: 10px; padding: 1.5rem; display: flex; align-items: flex-start; gap: 1rem; transition: all 0.2s; }
.lp-cap:hover { border-color: var(--blue-light); box-shadow: 0 4px 20px rgba(37,99,235,0.08); }
.lp-cap-icon { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg,var(--navy),var(--navy-light)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-cap-icon svg { width: 20px; height: 20px; color: var(--blue-glow); }
.lp-cap-title { font-size: 0.9rem; font-weight: 700; color: var(--navy); margin-bottom: 0.25rem; }
.lp-cap-desc { font-size: 0.8rem; color: var(--gray-600); line-height: 1.55; }

/* FRAMEWORKS */
.lp-fw-section { background: var(--navy); padding: 6rem 2rem; }
.lp-fw-section .lp-section-title { color: #fff; }
.lp-fw-section .lp-section-desc { color: rgba(255,255,255,0.55); }
.lp-fw-section .lp-section-label { color: var(--blue-glow); }
.lp-fw-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1.5rem; margin-top: 3.5rem; }
.lp-fw-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 2rem 1.5rem; text-align: center; transition: all 0.3s; }
.lp-fw-card:hover { background: rgba(37,99,235,0.12); border-color: rgba(37,99,235,0.4); transform: translateY(-3px); }
.lp-fw-logo { width: 56px; height: 56px; background: linear-gradient(135deg,rgba(37,99,235,0.2),rgba(6,182,212,0.15)); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid rgba(37,99,235,0.25); }
.lp-fw-logo svg { width: 26px; height: 26px; color: var(--blue-glow); }
.lp-fw-name { color: #fff; font-weight: 800; font-size: 1rem; margin-bottom: 0.25rem; }
.lp-fw-full { color: rgba(255,255,255,0.45); font-size: 0.72rem; margin-bottom: 1rem; }
.lp-fw-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center; }
.lp-fw-tag { background: rgba(37,99,235,0.15); color: var(--blue-glow); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; }

/* FAQ */
.lp-faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 3rem; }
.lp-faq-item { border: 1px solid var(--gray-200); border-radius: 10px; overflow: hidden; transition: border-color 0.2s; }
.lp-faq-item.open { border-color: var(--blue-light); }
.lp-faq-q { display: flex; align-items: center; justify-content: space-between; padding: 1.15rem 1.5rem; cursor: pointer; user-select: none; gap: 1rem; }
.lp-faq-qtext { font-size: 0.9rem; font-weight: 600; color: var(--navy); }
.lp-faq-chev { width: 20px; height: 20px; flex-shrink: 0; color: var(--blue); transition: transform 0.25s; }
.lp-faq-item.open .lp-faq-chev { transform: rotate(180deg); }
.lp-faq-ans { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.lp-faq-item.open .lp-faq-ans { max-height: 300px; }
.lp-faq-ans-inner { padding: 0 1.5rem 1.25rem; color: var(--gray-600); font-size: 0.875rem; line-height: 1.7; }

/* CTA */
.lp-cta { background: linear-gradient(135deg, var(--navy) 0%, #0d2a5c 50%, #0a1e40 100%); padding: 6rem 2rem; position: relative; overflow: hidden; }
.lp-cta::before { content:''; position:absolute; inset:0; background-image: linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px); background-size: 60px 60px; }
.lp-cta-glow { position: absolute; top:50%; left:50%; transform: translate(-50%,-50%); width:600px; height:300px; background: radial-gradient(ellipse, rgba(37,99,235,0.2) 0%, transparent 70%); }
.lp-cta-inner { max-width: 700px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
.lp-cta-title { font-size: clamp(2rem,4vw,2.8rem); font-weight: 800; color: #fff; letter-spacing: -0.025em; margin-bottom: 1rem; line-height: 1.2; }
.lp-cta-desc { color: rgba(255,255,255,0.6); font-size: 1.05rem; margin-bottom: 2.5rem; line-height: 1.7; }
.lp-cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.lp-btn-white { background: #fff; color: var(--navy); padding: 0.85rem 2rem; font-size: 1rem; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; }
.lp-btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,255,255,0.2); }
.lp-cta-note { margin-top: 1.5rem; color: rgba(255,255,255,0.35); font-size: 0.8rem; }

/* FOOTER */
.lp-footer { background: #060f1e; padding: 4rem 2rem 2rem; }
.lp-footer-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; padding-bottom: 3rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
.lp-footer-desc { color: rgba(255,255,255,0.45); font-size: 0.85rem; line-height: 1.7; margin-top: 1rem; max-width: 280px; }
.lp-footer-col-title { color: rgba(255,255,255,0.5); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
.lp-footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
.lp-footer-links a { color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
.lp-footer-links a:hover { color: #fff; }
.lp-footer-bottom { max-width: 1200px; margin: 0 auto; padding-top: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.lp-footer-copy { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
.lp-footer-credit { color: rgba(255,255,255,0.4); font-size: 0.8rem; text-align: right; }
.lp-footer-credit strong { color: rgba(255,255,255,0.65); }

/* AI PROJECT MGMT SECTION */
.lp-pm-section { background: linear-gradient(180deg, #f8fafc 0%, #fff 100%); padding: 6rem 2rem; }
.lp-pm-split { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; margin-top: 4rem; }
.lp-pm-features { display: flex; flex-direction: column; gap: 1.5rem; }
.lp-pm-feat { display: flex; align-items: flex-start; gap: 1rem; }
.lp-pm-feat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-pm-feat-icon svg { width: 20px; height: 20px; }
.lp-pm-feat-title { font-size: 0.9rem; font-weight: 700; color: var(--navy); margin-bottom: 0.2rem; }
.lp-pm-feat-desc { font-size: 0.8rem; color: var(--gray-600); line-height: 1.55; }
.lp-pm-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 2rem; }
.lp-pm-tag { background: rgba(37,99,235,0.08); color: var(--blue); border: 1px solid rgba(37,99,235,0.2); padding: 0.3rem 0.85rem; border-radius: 100px; font-size: 0.75rem; font-weight: 600; }

/* VIDEO PLAYER */
.lp-video-wrap { position: relative; border-radius: 16px; overflow: hidden; background: var(--navy); box-shadow: 0 24px 80px rgba(10,35,66,0.25), 0 0 0 1px rgba(255,255,255,0.08); aspect-ratio: 16/9; }
.lp-video-wrap iframe { width: 100%; height: 100%; border: none; display: block; }
.lp-video-badge { position: absolute; top: 14px; left: 14px; background: rgba(16,185,129,0.9); color: #fff; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 10px; border-radius: 100px; }
.lp-video-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem; background: linear-gradient(135deg, #0a2342 0%, #0f3060 50%, #0d2952 100%); cursor: pointer; text-decoration: none; position: relative; overflow: hidden; }
.lp-video-placeholder::before { content:''; position:absolute; inset:0; background-image: linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px); background-size: 40px 40px; }
.lp-video-play { width: 72px; height: 72px; border-radius: 50%; background: rgba(37,99,235,0.9); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 12px rgba(37,99,235,0.2), 0 0 0 24px rgba(37,99,235,0.08); transition: transform 0.2s, box-shadow 0.2s; position: relative; z-index: 1; }
.lp-video-placeholder:hover .lp-video-play { transform: scale(1.1); box-shadow: 0 0 0 14px rgba(37,99,235,0.25), 0 0 0 28px rgba(37,99,235,0.1); }
.lp-video-play svg { width: 28px; height: 28px; color: #fff; margin-left: 4px; }
.lp-video-label { color: rgba(255,255,255,0.7); font-size: 0.85rem; font-weight: 500; position: relative; z-index: 1; }
.lp-video-title-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 1.5rem; background: linear-gradient(transparent, rgba(0,0,0,0.7)); z-index: 1; }
.lp-video-title-overlay span { color: #fff; font-size: 0.85rem; font-weight: 600; }

/* ANIMATIONS */
.lp-fade { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.lp-fade.visible { opacity: 1; transform: translateY(0); }
.lp-fade-d1 { transition-delay: 0.1s; } .lp-fade-d2 { transition-delay: 0.2s; } .lp-fade-d3 { transition-delay: 0.3s; }

/* RESPONSIVE */
@media (max-width: 900px) {
  .lp-hero-inner { grid-template-columns: 1fr; }
  .lp-hero-visual { display: none; }
  .lp-val-grid,.lp-split { grid-template-columns: 1fr; gap: 2rem; }
  .lp-split-rev { direction: ltr; }
  .lp-cap-grid { grid-template-columns: 1fr 1fr; }
  .lp-fw-grid { grid-template-columns: 1fr 1fr; }
  .lp-pm-split { grid-template-columns: 1fr; }
  .lp-faq-grid { grid-template-columns: 1fr; }
  .lp-stats-inner { grid-template-columns: repeat(2,1fr); }
  .lp-footer-grid { grid-template-columns: 1fr 1fr; }
  .lp-nav-links { display: none; }
}
@media (max-width: 600px) {
  .lp-cap-grid,.lp-fw-grid { grid-template-columns: 1fr 1fr; }
  .lp-stats-inner { grid-template-columns: 1fr 1fr; }
}
`;

export default function LandingPage() {
  useEffect(() => {
    // Scroll fade-in
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".lp-fade").forEach((el) => observer.observe(el));

    // Counter animation
    function animateCounter(el: Element) {
      const target = parseInt((el as HTMLElement).dataset.target ?? "0");
      const duration = 1800;
      const start = performance.now();
      const update = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.floor(eased * target));
        if (p < 1) requestAnimationFrame(update);
        else el.textContent = String(target);
      };
      requestAnimationFrame(update);
    }
    const cObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { animateCounter(e.target); cObs.unobserve(e.target); } }),
      { threshold: 0.5 }
    );
    document.querySelectorAll(".lp-counter").forEach((el) => cObs.observe(el));

    // Sticky nav shadow
    const nav = document.querySelector(".lp-nav") as HTMLElement | null;
    const onScroll = () => { if (nav) nav.style.boxShadow = window.scrollY > 20 ? "0 4px 24px rgba(0,0,0,0.4)" : "none"; };
    window.addEventListener("scroll", onScroll);

    return () => { observer.disconnect(); cObs.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  function toggleFaq(e: React.MouseEvent<HTMLDivElement>) {
    const item = e.currentTarget.closest(".lp-faq-item") as HTMLElement | null;
    if (!item) return;
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".lp-faq-item.open").forEach((el) => el.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="lp-body">

        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-nav-inner">
            <a href="/landing" className="lp-logo">
              <div className="lp-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div className="lp-logo-text">AI Governance</div>
                <div className="lp-logo-sub">Control Tower</div>
              </div>
            </a>
            <ul className="lp-nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#capabilities">Capabilities</a></li>
              <li><a href="#frameworks">Frameworks</a></li>
              <li><a href="#ai-projects">AI Projects</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
            <div className="lp-nav-cta">
              <a href="/demo-marketing.html" target="_blank" className="lp-btn lp-btn-outline">Watch Demo ▶</a>
              <Link href="/login" className="lp-btn lp-btn-primary">Launch App →</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-grid" />
          <div className="lp-hero-glow" />
          <div className="lp-hero-glow2" />
          <div className="lp-hero-inner">
            <div>
              <div className="lp-badge"><span className="lp-badge-dot" />Enterprise AI Governance Platform</div>
              <h1 className="lp-hero-title">
                Govern, Monitor &amp;<br />
                <span className="lp-hero-highlight">Explain Every AI</span><br />
                Decision You Make
              </h1>
              <p className="lp-hero-desc">
                AI model performance depends not only on accuracy — but on how well you can explain, audit, and govern every decision when something eventually goes wrong. The AI Governance Control Tower gives your enterprise full visibility, control, and compliance across all AI systems.
              </p>
              <div className="lp-hero-actions">
                <Link href="/login" className="lp-btn lp-btn-primary lp-btn-primary-lg">Launch Control Tower →</Link>
                <a href="/demo-marketing.html" target="_blank" className="lp-btn-ghost-lg">▶ Watch Demo</a>
              </div>
              <div className="lp-trust">
                <span>DPDP Compliant</span><div className="lp-trust-div" />
                <span>ISO 42001 Ready</span><div className="lp-trust-div" />
                <span>EU AI Act Aligned</span><div className="lp-trust-div" />
                <span>GDPR Compliant</span>
              </div>
            </div>

            <div className="lp-hero-visual">
              <div className="lp-dash-card">
                <div className="lp-dash-header">
                  <span className="lp-dash-title">AI Model Registry</span>
                  <div className="lp-dash-status"><div className="lp-status-dot" />Live Monitoring</div>
                </div>
                <div className="lp-model-list">
                  {[
                    { name: "Credit Risk Scorer", type: "ML · Production", risk: "HIGH", cls: "lp-risk-high" },
                    { name: "Fraud Detection Engine", type: "Anomaly Detection · Production", risk: "CRITICAL", cls: "lp-risk-critical" },
                    { name: "Churn Predictor", type: "ML · Staging", risk: "MEDIUM", cls: "lp-risk-medium" },
                    { name: "NLP Document Classifier", type: "NLP · Active", risk: "LOW", cls: "lp-risk-low" },
                    { name: "Sentiment Analyzer", type: "NLP · Deprecated", risk: "MEDIUM", cls: "lp-risk-medium" },
                  ].map((m) => (
                    <div key={m.name} className="lp-model-row">
                      <div><div className="lp-model-name">{m.name}</div><div className="lp-model-type">{m.type}</div></div>
                      <span className={`lp-risk ${m.cls}`}>{m.risk}</span>
                    </div>
                  ))}
                </div>
                <div className="lp-mini lp-mini-1">
                  <div className="lp-mini-label">Compliance Score</div>
                  <div className="lp-mini-val">94<span style={{ fontSize: "0.9rem", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>%</span></div>
                  <div className="lp-mini-sub">↑ 3% this month</div>
                </div>
                <div className="lp-mini lp-mini-2">
                  <div className="lp-mini-label">Active Alerts</div>
                  <div className="lp-mini-val" style={{ color: "#fbbf24" }}>4</div>
                  <div className="lp-mini-sub" style={{ color: "rgba(255,255,255,0.4)" }}>2 require action</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="lp-stats">
          <div className="lp-stats-inner">
            {[
              { target: 5, label: "AI Models Monitored", suffix: "" },
              { target: 12, label: "Compliance Controls", suffix: "" },
              { target: 4, label: "Regulatory Frameworks", suffix: "+" },
              { target: 100, label: "Immutable Audit Trail", suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="lp-stat lp-fade">
                <div className="lp-stat-num"><span className="lp-counter" data-target={s.target}>0</span>{s.suffix}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VALUE PROPS */}
        <section className="lp-section lp-gray" id="features">
          <div className="lp-inner">
            <div className="lp-header-center">
              <span className="lp-section-label">Why Governance Matters</span>
              <h2 className="lp-section-title">Three Pillars of Responsible AI</h2>
              <p className="lp-section-desc">AI governance is no longer optional. Enterprises need a structured approach to deploy models responsibly, minimize regulatory risk, and build lasting trust.</p>
            </div>
            <div className="lp-val-grid">
              {[
                {
                  icon: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
                  title: "Deploy Responsibly",
                  desc: "Every AI model deployed into production carries risk. Understand exactly how predictions are made, detect bias early, and ensure human oversight at every critical decision point.",
                  points: ["Explainability for every model prediction", "Bias detection across demographic groups", "Human-in-the-loop approval workflows", "Model risk classification before go-live"],
                  delay: "",
                },
                {
                  icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
                  title: "Minimize Risk",
                  desc: "Regulatory penalties for non-compliant AI can be severe. Continuously monitor your models for drift, performance degradation, and policy violations before they become incidents.",
                  points: ["Real-time drift and anomaly detection", "Automated compliance control tracking", "Risk scoring across DPDP, GDPR, EU AI Act", "Incident escalation and remediation plans"],
                  delay: "lp-fade-d1",
                },
                {
                  icon: <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
                  title: "Increase Trust",
                  desc: "Customers, regulators, and stakeholders need to trust your AI. Transparent governance, published audit trails, and clear accountability build confidence across your entire AI portfolio.",
                  points: ["Immutable audit logs for every AI action", "Stakeholder-ready compliance reports", "Data subject consent management", "Role-based access for risk officers & auditors"],
                  delay: "lp-fade-d2",
                },
              ].map((v) => (
                <div key={v.title} className={`lp-val-card lp-fade ${v.delay}`}>
                  <div className="lp-val-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{v.icon}</svg></div>
                  <h3 className="lp-val-title">{v.title}</h3>
                  <p className="lp-val-desc">{v.desc}</p>
                  <ul className="lp-val-list">{v.points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE SPLITS */}
        <section className="lp-section" id="capabilities">
          <div className="lp-inner">
            {/* Split 1 */}
            <div className="lp-split lp-fade">
              <div>
                <div className="lp-feat-label">Risk Management</div>
                <h3 className="lp-feat-title">Gain Deep Visibility Into Your Most Complex AI Models</h3>
                <p className="lp-feat-desc">Move beyond accuracy metrics. Understand why each model makes each decision, detect when models start behaving unexpectedly, and act before issues reach customers or regulators.</p>
                <div className="lp-feat-pts">
                  {[
                    [<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>, "Drill into individual predictions with feature attribution scores"],
                    [<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>, "Monitor model drift and performance degradation in real-time"],
                    [<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>, "Instant alerts when bias scores or accuracy cross defined thresholds"],
                    [<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>, "Structured risk assessments with likelihood, impact, and mitigation plans"],
                  ].map(([icon, text], i) => (
                    <div key={i} className="lp-feat-pt">
                      <div className="lp-fp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{icon as React.ReactNode}</svg></div>
                      <div className="lp-fp-text">{text as string}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-panel">
                <div className="lp-panel-hdr">
                  <div className="lp-pdot" style={{ background: "#ef4444" }} /><div className="lp-pdot" style={{ background: "#fbbf24" }} /><div className="lp-pdot" style={{ background: "#10b981" }} />
                  <span className="lp-panel-title">Model Risk Dashboard</span>
                </div>
                <div className="lp-metric"><span className="lp-mlabel">Credit Risk Scorer — Bias Score</span><span className="lp-mval lp-danger">0.07 ⚠</span></div>
                <div className="lp-prog"><div className="lp-prog-lbl"><span>Bias Score</span><span>Threshold: 0.05</span></div><div className="lp-prog-track"><div className="lp-prog-fill fill-amber" style={{ width: "70%" }} /></div></div>
                <div className="lp-metric"><span className="lp-mlabel">Fraud Detection — Accuracy</span><span className="lp-mval lp-warn">91% ↓</span></div>
                <div className="lp-prog"><div className="lp-prog-lbl"><span>Current Accuracy</span><span>Min: 85%</span></div><div className="lp-prog-track"><div className="lp-prog-fill fill-green" style={{ width: "91%" }} /></div></div>
                <div className="lp-metric"><span className="lp-mlabel">NLP Classifier — Risk Level</span><span className="lp-mval lp-good">LOW ✓</span></div>
                <div className="lp-prog"><div className="lp-prog-lbl"><span>Overall Risk Score</span><span>25/100</span></div><div className="lp-prog-track"><div className="lp-prog-fill fill-blue" style={{ width: "25%" }} /></div></div>
              </div>
            </div>

            {/* Split 2 */}
            <div className="lp-split lp-split-rev lp-fade">
              <div>
                <div className="lp-feat-label">Compliance Automation</div>
                <h3 className="lp-feat-title">Increase Confidence in Your Regulatory Coverage</h3>
                <p className="lp-feat-desc">Track every compliance control across DPDP, ISO 42001, GDPR, and EU AI Act from a single pane of glass. Never miss a review deadline or fail an audit because of an undocumented AI system.</p>
                <div className="lp-feat-pts">
                  {[
                    [<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>, "Multi-framework compliance tracking in a unified dashboard"],
                    [<><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></>, "Attach evidence, notes, and reviewer sign-offs to each control"],
                    [<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, "Due date tracking and automated review reminders"],
                    [<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>, "Export audit-ready compliance reports in one click"],
                  ].map(([icon, text], i) => (
                    <div key={i} className="lp-feat-pt">
                      <div className="lp-fp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{icon as React.ReactNode}</svg></div>
                      <div className="lp-fp-text">{text as string}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-panel">
                <div className="lp-panel-hdr">
                  <div className="lp-pdot" style={{ background: "#ef4444" }} /><div className="lp-pdot" style={{ background: "#fbbf24" }} /><div className="lp-pdot" style={{ background: "#10b981" }} />
                  <span className="lp-panel-title">Compliance Controls</span>
                </div>
                {[["DPDP — Lawful Basis", "PASS ✓", "lp-good"],["ISO 42001 — Risk Assessment", "PASS ✓", "lp-good"],["DPDP — Data Subject Rights", "PARTIAL ⚡", "lp-warn"],["EU AI Act — Conformity", "FAIL ✗", "lp-danger"],["ISO 42001 — Human Oversight", "PASS ✓", "lp-good"]].map(([label, val, cls]) => (
                  <div key={label} className="lp-metric"><span className="lp-mlabel">{label}</span><span className={`lp-mval ${cls}`}>{val}</span></div>
                ))}
                <div style={{ marginTop: "0.75rem" }}>
                  <div className="lp-prog-lbl" style={{ color: "rgba(255,255,255,0.5)" }}><span>Overall Compliance</span><span>62.5%</span></div>
                  <div className="lp-prog-track"><div className="lp-prog-fill fill-blue" style={{ width: "62.5%" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="lp-section lp-gray">
          <div className="lp-inner">
            <div className="lp-header-center">
              <span className="lp-section-label">Platform Capabilities</span>
              <h2 className="lp-section-title">Everything You Need to Govern AI at Scale</h2>
              <p className="lp-section-desc">A comprehensive set of tools built specifically for AI Risk Officers, Compliance Managers, and Internal Auditors.</p>
            </div>
            <div className="lp-cap-grid">
              {[
                { icon: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>, title: "AI Model Inventory", desc: "Centralized registry of all AI models with metadata, versions, owners, and deployment status." },
                { icon: <path d="M13 10V3L4 14h7v7l9-11h-7z"/>, title: "Real-Time Risk Scoring", desc: "Automated risk assessments across bias, drift, explainability, and regulatory exposure dimensions." },
                { icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>, title: "Compliance Tracking", desc: "Map every AI system to DPDP, ISO 42001, GDPR, and EU AI Act controls with evidence and review workflows." },
                { icon: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>, title: "Data Governance", desc: "Track PII data assets, data lineage, consent records, and retention policies for all AI training data." },
                { icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, title: "Monitoring & Alerts", desc: "Continuous model monitoring with configurable alert thresholds for bias, accuracy, and compliance violations." },
                { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>, title: "Agent Governance", desc: "Manage autonomous AI agents with prompt logging, token budgets, tool permissions, and human approval gates." },
                { icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>, title: "Audit & Reports", desc: "Immutable audit trail of every action taken on AI systems with exportable reports for regulators and boards." },
                { icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, title: "Role-Based Access", desc: "Granular RBAC with Admin, Risk Officer, and Auditor roles — each with appropriate visibility and permissions." },
                { icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>, title: "Policy Configuration", desc: "Define and enforce organization-wide AI policies — bias thresholds, retention rules, consent expiry, and more." },
                { icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></>, title: "AI Project Management", desc: "Plan, track, and deliver AI projects with Gantt charts, Kanban boards, phase gates, milestones, and n8n workflow automation." },
              ].map((c, i) => (
                <div key={c.title} className={`lp-cap lp-fade ${i % 3 === 1 ? "lp-fade-d1" : i % 3 === 2 ? "lp-fade-d2" : ""}`}>
                  <div className="lp-cap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{c.icon}</svg></div>
                  <div><div className="lp-cap-title">{c.title}</div><div className="lp-cap-desc">{c.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FRAMEWORKS */}
        <section className="lp-fw-section" id="frameworks">
          <div className="lp-inner">
            <div className="lp-header-center">
              <span className="lp-section-label">Regulatory Coverage</span>
              <h2 className="lp-section-title">Built for Every Major AI Compliance Framework</h2>
              <p className="lp-section-desc">The AI Governance Control Tower maps your AI systems to all major global regulatory frameworks, so you are always audit-ready.</p>
            </div>
            <div className="lp-fw-grid">
              {[
                { name: "DPDP", full: "Digital Personal Data Protection Act, India", tags: ["Consent", "Data Rights", "Grievance"], icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
                { name: "ISO 42001", full: "AI Management System Standard", tags: ["Risk Mgmt", "Documentation", "Oversight"], icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
                { name: "GDPR", full: "General Data Protection Regulation, EU", tags: ["Privacy", "Data Transfer", "Erasure"], icon: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></> },
                { name: "EU AI Act", full: "European Union Artificial Intelligence Act", tags: ["High-Risk", "Conformity", "Transparency"], icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
              ].map((f, i) => (
                <div key={f.name} className={`lp-fw-card lp-fade lp-fade-d${i}`}>
                  <div className="lp-fw-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{f.icon}</svg></div>
                  <div className="lp-fw-name">{f.name}</div>
                  <div className="lp-fw-full">{f.full}</div>
                  <div className="lp-fw-tags">{f.tags.map((t) => <span key={t} className="lp-fw-tag">{t}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI PROJECT MANAGEMENT */}
        <section className="lp-pm-section" id="ai-projects">
          <div className="lp-inner">
            <div className="lp-header-center">
              <span className="lp-section-label" style={{color:"var(--blue)"}}>New Module</span>
              <h2 className="lp-section-title">AI Project Lifecycle Management</h2>
              <p className="lp-section-desc">Plan, execute, and deliver AI initiatives end-to-end — from business case to production monitoring — with purpose-built project management tools designed for AI teams.</p>
            </div>

            <div className="lp-pm-split">
              {/* Left: features */}
              <div className="lp-pm-features">
                {[
                  { bg: "rgba(37,99,235,0.1)", color: "#2563eb", icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, title: "6-Phase AI Lifecycle", desc: "Structured phases from Business Case → Data Discovery → Model Development → Testing → Deployment → Monitoring with phase-gate milestones." },
                  { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>, title: "Kanban & Gantt Boards", desc: "Visualize task progress across columns with drag-and-drop Kanban. Plan timelines with SVG Gantt charts supporting day/week/month zoom." },
                  { bg: "rgba(16,185,129,0.1)", color: "#10b981", icon: <><path d="M13 10V3L4 14h7v7l9-11h-7z"/></>, title: "n8n Workflow Automation", desc: "Connect n8n webhooks to project events — auto-trigger Slack alerts, Jira tickets, or any workflow when a phase completes or milestone is reached." },
                  { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>, title: "ML Experiment Tracking", desc: "Log experiment runs with hyperparameters and metrics. Compare accuracy/loss curves across runs with interactive line charts." },
                  { bg: "rgba(6,182,212,0.1)", color: "#06b6d4", icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, title: "Health Score & Alerts", desc: "Automatic project health scoring (0–100) based on overdue milestones, blocked tasks, and activity gaps — with HEALTHY / AT_RISK / CRITICAL status." },
                  { bg: "rgba(99,102,241,0.1)", color: "#6366f1", icon: <><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></>, title: "Visual Workflow Canvas", desc: "Build AI pipeline diagrams with a node-based canvas editor (like n8n/Visio) — connect data sources, transforms, models, evaluations, and outputs." },
                ].map((f) => (
                  <div key={f.title} className="lp-pm-feat lp-fade">
                    <div className="lp-pm-feat-icon" style={{background: f.bg}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2">{f.icon}</svg>
                    </div>
                    <div>
                      <div className="lp-pm-feat-title">{f.title}</div>
                      <div className="lp-pm-feat-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
                <div className="lp-pm-tags">
                  {["Gantt Charts","Kanban Board","Phase Gates","Milestones","Experiment Tracking","n8n Webhooks","Workflow Canvas","Team Resources","Health Score","Project Templates"].map(t => (
                    <span key={t} className="lp-pm-tag">{t}</span>
                  ))}
                </div>
              </div>

              {/* Right: demo video */}
              <div className="lp-fade lp-fade-d1">
                <div className="lp-video-wrap">
                  <span className="lp-video-badge">● Live Demo</span>
                  <iframe
                    src="/demo-projects.html"
                    title="AI Project Management Demo"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>

                {/* Stats row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginTop:"1.25rem"}}>
                  {[
                    {val:"6",label:"Project Phases"},
                    {val:"4",label:"Built-in Templates"},
                    {val:"∞",label:"n8n Integrations"},
                  ].map(s=>(
                    <div key={s.label} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"10px",padding:"1rem",textAlign:"center"}}>
                      <div style={{fontSize:"1.5rem",fontWeight:800,color:"var(--navy)"}}>{s.val}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--gray-600)",marginTop:"2px"}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:"1.25rem",display:"flex",gap:"0.75rem"}}>
                  <Link href="/login" className="lp-btn lp-btn-primary" style={{flex:1,justifyContent:"center"}}>Launch AI Projects →</Link>
                  <a href="/demo-projects.html" target="_blank" rel="noopener" className="lp-btn" style={{background:"#f1f5f9",color:"var(--navy)",border:"1px solid #e2e8f0"}}>▶ Full Demo</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-section" id="faq">
          <div className="lp-inner">
            <div className="lp-header-center">
              <span className="lp-section-label">Frequently Asked Questions</span>
              <h2 className="lp-section-title">Everything You Need to Know</h2>
              <p className="lp-section-desc">Common questions about AI governance, the Control Tower platform, and how to get started.</p>
            </div>
            <div className="lp-faq-grid">
              {[
                ["What is AI Governance and why does my organization need it?", "AI Governance is the framework of policies, processes, and controls that ensure AI systems operate ethically, legally, and reliably. With regulations like DPDP, GDPR, and the EU AI Act now in force, organizations face real legal and reputational risk from unmonitored AI. Governance is no longer optional — it is a business necessity."],
                ["How does the Control Tower differ from basic model monitoring tools?", "Basic monitoring tools track accuracy and drift metrics. The AI Governance Control Tower goes far beyond — combining risk assessment, compliance control tracking, data governance, consent management, agent governance, immutable audit logs, and regulatory framework mapping into one unified enterprise platform."],
                ["Which AI model types and frameworks does it support?", "The platform supports all AI model types — ML, NLP, LLMs, Computer Vision, Anomaly Detection, and Recommendation Systems. It is framework-agnostic, working with models built on TensorFlow, PyTorch, scikit-learn, XGBoost, and any OpenAI or Anthropic API-based systems."],
                ["How does the platform handle AI agent governance?", "Every AI agent is registered with defined tool permissions, token budgets, and system prompts. Every prompt and response is logged. Sensitive agent actions trigger human approval workflows. You get complete visibility into what your agents are doing, how much they cost, and whether they are staying within policy boundaries."],
                ["Can I generate compliance reports for auditors and regulators?", "Yes. The Audit & Reports module provides detailed compliance reports mapped to specific frameworks (DPDP, ISO 42001, GDPR, EU AI Act). Reports include control status, evidence, reviewer sign-offs, and full audit logs — all in formats suitable for internal audits and regulatory submissions."],
                ["How does data governance integrate with AI model governance?", "Every AI model is linked to the data assets it uses. You can see exactly which PII fields feed into which models, whether consent is in place, what the data retention policy is, and whether data subjects have exercised their rights. This end-to-end lineage is critical for DPDP and GDPR compliance."],
                ["What roles and permissions does the platform support?", "The platform has four built-in roles: Admin (full access), Risk Officer (risk and compliance management), Auditor (read-only with report access), and Viewer (dashboard only). All actions are logged against the user who performed them, creating an accountable audit trail."],
                ["Is this platform ready for EU AI Act compliance?", "Yes. The platform supports the full EU AI Act compliance lifecycle — classifying AI systems by risk category, tracking conformity assessment requirements, maintaining technical documentation per Article 11, and ensuring human oversight for all high-risk AI decisions."],
                ["How quickly can we get started?", "The platform is cloud-hosted on Vercel with a Neon PostgreSQL backend — no infrastructure setup needed. Start onboarding AI models within the first hour. Most enterprise teams are fully operational within 30 days."],
              ].map(([q, a]) => (
                <div key={q} className="lp-faq-item">
                  <div className="lp-faq-q" onClick={toggleFaq}>
                    <span className="lp-faq-qtext">{q}</span>
                    <svg className="lp-faq-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <div className="lp-faq-ans"><div className="lp-faq-ans-inner">{a}</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta">
          <div className="lp-cta-glow" />
          <div className="lp-cta-inner">
            <h2 className="lp-cta-title">Ready to Govern Your AI<br />with Confidence?</h2>
            <p className="lp-cta-desc">Join forward-thinking enterprises that treat AI governance as a strategic advantage — not a compliance checkbox. Get full visibility, control, and audit-readiness across your entire AI portfolio today.</p>
            <div className="lp-cta-actions">
              <Link href="/login" className="lp-btn-white">Launch Control Tower →</Link>
              <a href="/demo-marketing.html" target="_blank" className="lp-btn-ghost-lg">▶ Watch Demo</a>
            </div>
            <p className="lp-cta-note">No credit card required · Enterprise ready · DPDP / ISO 42001 / GDPR / EU AI Act</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-grid">
            <div>
              <a href="/landing" className="lp-logo">
                <div className="lp-logo-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div><div className="lp-logo-text">AI Governance</div><div className="lp-logo-sub">Control Tower</div></div>
              </a>
              <p className="lp-footer-desc">Enterprise AI Governance platform for DPDP, ISO 42001, GDPR, and EU AI Act compliance. Monitor, govern, and explain every AI decision at scale.</p>
            </div>
            <div>
              <div className="lp-footer-col-title">Product</div>
              <ul className="lp-footer-links">
                {["AI Inventory", "Risk & Compliance", "Data Governance", "Agent Governance", "Audit & Reports", "Monitoring"].map((l) => <li key={l}><a href="/login">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Frameworks</div>
              <ul className="lp-footer-links">
                {["DPDP Act", "ISO 42001", "GDPR", "EU AI Act", "ISO 27001", "NIST AI RMF"].map((l) => <li key={l}><a href="#frameworks">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Company</div>
              <ul className="lp-footer-links">
                {["About", "Pricing", "Documentation", "Privacy Policy", "Terms of Service", "Contact"].map((l) => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <div className="lp-footer-copy">&copy; 2026 AI Governance Control Tower. All rights reserved.</div>
            <div className="lp-footer-credit">Designed by <strong>Prashant Thakur</strong>. All rights reserved.</div>
          </div>
        </footer>

      </div>
    </>
  );
}
