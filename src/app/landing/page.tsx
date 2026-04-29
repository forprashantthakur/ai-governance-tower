"use client";

import React, { useEffect } from "react";
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
.lp-nav { position: sticky; top: 0; z-index: 100; background: rgba(10,35,66,0.97); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0 2rem 0 0; }
.lp-nav-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 110px; padding-left: 0; }
.lp-logo { display: flex; align-items: center; text-decoration: none; flex-shrink: 0; margin-left: -0.5rem; }
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

/* AI MATURITY ASSESSMENT SECTION */
.lp-assess { background: linear-gradient(135deg, #0a1e3d 0%, var(--navy) 50%, #091a33 100%); padding: 6rem 2rem; position: relative; overflow: hidden; }
.lp-assess-glow { position: absolute; top: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%); pointer-events: none; }
.lp-assess-inner { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }
.lp-assess-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; margin-top: 3rem; }
.lp-assess-features { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.lp-assess-feat { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1.2rem; transition: all 0.2s; }
.lp-assess-feat:hover { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.3); }
.lp-assess-feat-icon { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg,rgba(37,99,235,0.2),rgba(6,182,212,0.15)); display: flex; align-items: center; justify-content: center; margin-bottom: 0.6rem; border: 1px solid rgba(37,99,235,0.2); }
.lp-assess-feat-icon svg { width: 18px; height: 18px; color: var(--blue-glow); }
.lp-assess-feat-title { color: #fff; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.25rem; }
.lp-assess-feat-desc { color: rgba(255,255,255,0.5); font-size: 0.78rem; line-height: 1.5; }
.lp-assess-visual { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; backdrop-filter: blur(20px); }
.lp-assess-score { text-align: center; margin-bottom: 1.5rem; }
.lp-assess-score-num { font-size: 3rem; font-weight: 800; background: linear-gradient(90deg, var(--blue-glow), var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }
.lp-assess-score-label { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.25rem; }
.lp-assess-dims { display: flex; flex-direction: column; gap: 0.5rem; }
.lp-assess-dim { display: flex; align-items: center; gap: 0.75rem; }
.lp-assess-dim-name { color: rgba(255,255,255,0.7); font-size: 0.75rem; width: 120px; flex-shrink: 0; text-align: right; }
.lp-assess-dim-bar { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
.lp-assess-dim-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--blue), var(--cyan)); }
.lp-assess-dim-val { color: rgba(255,255,255,0.5); font-size: 0.7rem; width: 32px; }
.lp-assess-actions { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }
.lp-btn-gradient { background: linear-gradient(135deg, var(--blue), var(--cyan)); color: #fff; padding: 0.85rem 2rem; font-size: 1rem; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; }
.lp-btn-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,99,235,0.35); }
@media(max-width:768px) {
  .lp-assess-grid { grid-template-columns: 1fr; gap: 2rem; }
  .lp-assess-features { grid-template-columns: 1fr; }
}

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

/* CONTACT SALES */
.lp-cs-section { background: #f8fafc; padding: 5rem 2rem; scroll-margin-top: 80px; }
.lp-cs-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; }
.lp-cs-left { padding-top: 0.5rem; }
.lp-cs-label { color: var(--blue); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
.lp-cs-title { font-size: 2.2rem; font-weight: 800; color: var(--navy); letter-spacing: -0.025em; line-height: 1.2; margin-bottom: 1rem; }
.lp-cs-desc { color: var(--gray-600); font-size: 1rem; line-height: 1.75; margin-bottom: 2rem; }
.lp-cs-cards { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
.lp-cs-card { display: flex; align-items: flex-start; gap: 1rem; background: #fff; border: 1px solid var(--gray-200); border-radius: 10px; padding: 1.1rem 1.25rem; }
.lp-cs-card-icon { width: 40px; height: 40px; border-radius: 9px; background: linear-gradient(135deg, rgba(37,99,235,0.1), rgba(6,182,212,0.1)); border: 1px solid rgba(37,99,235,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-cs-card-icon svg { width: 18px; height: 18px; color: var(--blue); }
.lp-cs-card-title { font-size: 0.88rem; font-weight: 700; color: var(--navy); margin-bottom: 0.2rem; }
.lp-cs-card-desc { font-size: 0.8rem; color: var(--gray-600); line-height: 1.5; }
.lp-cs-support { color: var(--gray-600); font-size: 0.85rem; }
.lp-cs-support a { color: var(--blue); text-decoration: none; font-weight: 600; }
.lp-cs-support a:hover { text-decoration: underline; }
.lp-cs-form-box { background: #fff; border: 1px solid var(--gray-200); border-radius: 16px; padding: 2.25rem; box-shadow: 0 4px 24px rgba(10,35,66,0.07); }
.lp-cs-form-title { font-size: 1.15rem; font-weight: 700; color: var(--navy); margin-bottom: 0.35rem; }
.lp-cs-form-sub { font-size: 0.83rem; color: var(--gray-600); margin-bottom: 1.75rem; }
.lp-cs-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.lp-cs-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
.lp-cs-field:last-of-type { margin-bottom: 0; }
.lp-cs-label-f { font-size: 0.78rem; font-weight: 600; color: var(--navy); }
.lp-cs-input { width: 100%; padding: 0.6rem 0.875rem; border: 1px solid var(--gray-200); border-radius: 7px; font-size: 0.875rem; font-family: inherit; color: var(--gray-800); background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
.lp-cs-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
.lp-cs-input::placeholder { color: var(--gray-400); }
.lp-cs-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
.lp-cs-textarea { resize: vertical; min-height: 90px; }
.lp-cs-submit { width: 100%; padding: 0.8rem; background: var(--blue); color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-top: 1.25rem; }
.lp-cs-submit:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.35); }
.lp-cs-privacy { text-align: center; color: var(--gray-400); font-size: 0.73rem; margin-top: 0.75rem; }
.lp-cs-success { text-align: center; padding: 3rem 1rem; display: none; flex-direction: column; align-items: center; gap: 1rem; }
.lp-cs-success.show { display: flex; }
.lp-cs-success-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: center; }
.lp-cs-success-icon svg { width: 32px; height: 32px; color: var(--green); }
.lp-cs-success h3 { font-size: 1.2rem; font-weight: 700; color: var(--navy); }
.lp-cs-success p { font-size: 0.9rem; color: var(--gray-600); }
@media (max-width: 900px) { .lp-cs-inner { grid-template-columns: 1fr; } .lp-cs-grid2 { grid-template-columns: 1fr; } }

/* ANIMATIONS */
.lp-fade { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.lp-fade.visible { opacity: 1; transform: translateY(0); }
.lp-fade-d1 { transition-delay: 0.1s; } .lp-fade-d2 { transition-delay: 0.2s; } .lp-fade-d3 { transition-delay: 0.3s; }

/* MEGA DROPDOWN NAV */
.lp-nav-item { position: relative; list-style: none; }
.lp-nav-trigger { display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,0.75); font-size: 0.875rem; font-weight: 500; cursor: pointer; background: none; border: none; font-family: inherit; padding: 0; transition: color 0.2s; }
.lp-nav-trigger:hover, .lp-nav-item.open .lp-nav-trigger { color: #fff; }
.lp-nav-trigger svg { width: 14px; height: 14px; transition: transform 0.2s; flex-shrink: 0; }
.lp-nav-item.open .lp-nav-trigger svg { transform: rotate(180deg); }
.lp-mega { display: none; position: absolute; top: calc(100% + 12px); left: 50%; transform: translateX(-50%); background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(10,35,66,0.18), 0 0 0 1px rgba(0,0,0,0.06); padding: 2rem; z-index: 200; min-width: 700px; animation: lp-mega-in 0.18s ease; }
.lp-mega-sol { min-width: 520px; }
@keyframes lp-mega-in { from { opacity:0; transform: translateX(-50%) translateY(-8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
.lp-nav-item.open .lp-mega { display: block; }
.lp-mega::before { content:''; position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:12px; height:12px; background:#fff; border-radius:2px; transform: translateX(-50%) rotate(45deg); box-shadow: -2px -2px 5px rgba(0,0,0,0.04); }
.lp-mega-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 2rem; }
.lp-mega-grid-sol { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 2rem; }
.lp-mega-col-title { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.85rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; }
.lp-mega-col { margin-bottom: 1.5rem; }
.lp-mega-item { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.55rem 0.6rem; border-radius: 8px; text-decoration: none; transition: background 0.15s; cursor: pointer; }
.lp-mega-item:hover { background: #f8fafc; }
.lp-mega-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-mega-icon svg { width: 16px; height: 16px; }
.lp-mega-item-title { font-size: 0.84rem; font-weight: 600; color: #0f172a; line-height: 1.2; margin-bottom: 2px; }
.lp-mega-item-desc { font-size: 0.74rem; color: #64748b; line-height: 1.4; }
.lp-mega-footer { border-top: 1px solid #f1f5f9; margin-top: 0.5rem; padding-top: 1rem; display: flex; align-items: center; justify-content: space-between; }
.lp-mega-footer-link { font-size: 0.8rem; font-weight: 600; color: var(--blue); text-decoration: none; display: flex; align-items: center; gap: 4px; }
.lp-mega-footer-link:hover { text-decoration: underline; }
.lp-mega-footer-link svg { width: 14px; height: 14px; }
.lp-mega-footer-note { font-size: 0.75rem; color: #94a3b8; }

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
  .lp-mega { display: none !important; }
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

  const [csLoading, setCsLoading] = React.useState(false);
  const [csSubmitted, setCsSubmitted] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<"features" | "solutions" | null>(null);

  function toggleMenu(name: "features" | "solutions") {
    setOpenMenu((prev) => (prev === name ? null : name));
  }

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".lp-nav-item")) setOpenMenu(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function submitContactForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (id: string) =>
      (form.querySelector(`#cs-${id}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value ?? "";

    const payload = {
      "First Name": get("fname"),
      "Last Name": get("lname"),
      "Work Email": get("email"),
      Company: get("company"),
      Phone: get("phone"),
      "Organisation Size": get("size"),
      Message: get("message"),
    };

    setCsLoading(true);
    try {
      const res = await fetch("https://formspree.io/f/mjgpdzkk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCsSubmitted(true);
      } else {
        alert("Something went wrong. Please email us directly at enquiry@aigovernancetower.com");
      }
    } catch {
      alert("Network error. Please email us directly at enquiry@aigovernancetower.com");
    } finally {
      setCsLoading(false);
    }
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
              <img src="/logo.png" alt="AI Governance Control Tower" style={{width:"320px", height:"108px", objectFit:"contain", objectPosition:"left center", display:"block"}} />
            </a>
            <ul className="lp-nav-links" style={{display:"flex",alignItems:"center",gap:"1.75rem",listStyle:"none"}}>

              {/* ── FEATURES MEGA DROPDOWN ── */}
              <li className={`lp-nav-item${openMenu === "features" ? " open" : ""}`}>
                <button className="lp-nav-trigger" onClick={() => toggleMenu("features")}>
                  Features
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div className="lp-mega">
                  <div className="lp-mega-grid">

                    {/* Col 1 — AI GOVERNANCE */}
                    <div className="lp-mega-col">
                      <div className="lp-mega-col-title">AI Governance</div>
                      {[
                        { icon:"#2563eb", bg:"rgba(37,99,235,0.1)", svg:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>, title:"Model Inventory", desc:"Register & track all AI models in one place" },
                        { icon:"#ef4444", bg:"rgba(239,68,68,0.1)", svg:<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, title:"Risk Assessment", desc:"Automated risk scoring, flagging & alerts" },
                        { icon:"#8b5cf6", bg:"rgba(139,92,246,0.1)", svg:<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>, title:"Agent Governance", desc:"Monitor AI agents, tool usage & token spend" },
                      ].map((item) => (
                        <a key={item.title} href="/login" className="lp-mega-item">
                          <div className="lp-mega-icon" style={{background:item.bg}}>
                            <svg viewBox="0 0 24 24" fill="none" stroke={item.icon} strokeWidth="2">{item.svg}</svg>
                          </div>
                          <div>
                            <div className="lp-mega-item-title">{item.title}</div>
                            <div className="lp-mega-item-desc">{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Col 2 — COMPLIANCE */}
                    <div className="lp-mega-col">
                      <div className="lp-mega-col-title">Compliance</div>
                      {[
                        { icon:"#10b981", bg:"rgba(16,185,129,0.1)", svg:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>, title:"Compliance Controls", desc:"Map controls to DPDP, ISO 42001, GDPR & EU AI Act" },
                        { icon:"#f59e0b", bg:"rgba(245,158,11,0.1)", svg:<><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></>, title:"Audit & Reports", desc:"Generate regulator-ready compliance reports" },
                        { icon:"#06b6d4", bg:"rgba(6,182,212,0.1)", svg:<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>, title:"Data Governance", desc:"PII tracking, consent management & data lineage" },
                      ].map((item) => (
                        <a key={item.title} href="/login" className="lp-mega-item">
                          <div className="lp-mega-icon" style={{background:item.bg}}>
                            <svg viewBox="0 0 24 24" fill="none" stroke={item.icon} strokeWidth="2">{item.svg}</svg>
                          </div>
                          <div>
                            <div className="lp-mega-item-title">{item.title}</div>
                            <div className="lp-mega-item-desc">{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Col 3 — OPERATIONS */}
                    <div className="lp-mega-col">
                      <div className="lp-mega-col-title">Operations</div>
                      {[
                        { icon:"#2563eb", bg:"rgba(37,99,235,0.1)", svg:<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>, title:"AI Project Management", desc:"Kanban phases, tasks & team collaboration" },
                        { icon:"#ec4899", bg:"rgba(236,72,153,0.1)", svg:<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>, title:"Prompt Logs", desc:"Full prompt & response audit trail for every agent" },
                        { icon:"#10b981", bg:"rgba(16,185,129,0.1)", svg:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>, title:"Monitoring", desc:"Real-time dashboards, drift detection & alerts" },
                      ].map((item) => (
                        <a key={item.title} href="/login" className="lp-mega-item">
                          <div className="lp-mega-icon" style={{background:item.bg}}>
                            <svg viewBox="0 0 24 24" fill="none" stroke={item.icon} strokeWidth="2">{item.svg}</svg>
                          </div>
                          <div>
                            <div className="lp-mega-item-title">{item.title}</div>
                            <div className="lp-mega-item-desc">{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>

                  </div>
                  <div className="lp-mega-footer">
                    <a href="/login" className="lp-mega-footer-link">
                      Explore all features
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </a>
                    <span className="lp-mega-footer-note">DPDP · ISO 42001 · GDPR · EU AI Act</span>
                  </div>
                </div>
              </li>

              {/* ── SOLUTIONS MEGA DROPDOWN ── */}
              <li className={`lp-nav-item${openMenu === "solutions" ? " open" : ""}`}>
                <button className="lp-nav-trigger" onClick={() => toggleMenu("solutions")}>
                  Solutions
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div className="lp-mega lp-mega-sol">
                  <div className="lp-mega-grid-sol">

                    {/* Col 1 — BY FRAMEWORK */}
                    <div className="lp-mega-col">
                      <div className="lp-mega-col-title">By Compliance Framework</div>
                      {[
                        { icon:"#2563eb", bg:"rgba(37,99,235,0.1)", abbr:"DPDP", title:"DPDP Act", desc:"India's Digital Personal Data Protection Act compliance" },
                        { icon:"#10b981", bg:"rgba(16,185,129,0.1)", abbr:"ISO", title:"ISO 42001", desc:"AI Management System certification readiness" },
                        { icon:"#f59e0b", bg:"rgba(245,158,11,0.1)", abbr:"EU", title:"EU AI Act", desc:"High-risk AI system classification & conformity" },
                        { icon:"#8b5cf6", bg:"rgba(139,92,246,0.1)", abbr:"GDPR", title:"GDPR", desc:"Data protection impact assessments & controls" },
                      ].map((item) => (
                        <a key={item.title} href="#frameworks" className="lp-mega-item" onClick={() => setOpenMenu(null)}>
                          <div className="lp-mega-icon" style={{background:item.bg, fontSize:"0.6rem", fontWeight:800, color:item.icon, flexDirection:"column"}}>
                            {item.abbr}
                          </div>
                          <div>
                            <div className="lp-mega-item-title">{item.title}</div>
                            <div className="lp-mega-item-desc">{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Col 2 — BY INDUSTRY */}
                    <div className="lp-mega-col">
                      <div className="lp-mega-col-title">By Industry</div>
                      {[
                        { icon:"#2563eb", bg:"rgba(37,99,235,0.1)", svg:<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>, title:"Banking & Finance", desc:"Model risk management, fraud AI governance" },
                        { icon:"#ef4444", bg:"rgba(239,68,68,0.1)", svg:<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>, title:"Healthcare & Pharma", desc:"Clinical AI oversight, patient data compliance" },
                        { icon:"#f59e0b", bg:"rgba(245,158,11,0.1)", svg:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, title:"Insurance", desc:"Underwriting AI audit trails & explainability" },
                        { icon:"#10b981", bg:"rgba(16,185,129,0.1)", svg:<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>, title:"Technology", desc:"LLM & agent governance for product teams" },
                      ].map((item) => (
                        <a key={item.title} href="#contact-sales" className="lp-mega-item" onClick={() => setOpenMenu(null)}>
                          <div className="lp-mega-icon" style={{background:item.bg}}>
                            <svg viewBox="0 0 24 24" fill="none" stroke={item.icon} strokeWidth="2">{item.svg}</svg>
                          </div>
                          <div>
                            <div className="lp-mega-item-title">{item.title}</div>
                            <div className="lp-mega-item-desc">{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>

                  </div>
                  <div className="lp-mega-footer">
                    <a href="#contact-sales" className="lp-mega-footer-link" onClick={() => setOpenMenu(null)}>
                      Talk to our team
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </a>
                    <span className="lp-mega-footer-note">Enterprise · On-Premise · SaaS</span>
                  </div>
                </div>
              </li>

              <li><a href="#frameworks" style={{color:"rgba(255,255,255,0.75)",textDecoration:"none",fontSize:"0.875rem",fontWeight:500}}>Frameworks</a></li>
              <li><a href="#ai-projects" style={{color:"rgba(255,255,255,0.75)",textDecoration:"none",fontSize:"0.875rem",fontWeight:500}}>AI Projects</a></li>
              <li><a href="#ai-maturity" style={{color:"rgba(255,255,255,0.75)",textDecoration:"none",fontSize:"0.875rem",fontWeight:500}}>AI Maturity</a></li>
              <li><a href="#faq" style={{color:"rgba(255,255,255,0.75)",textDecoration:"none",fontSize:"0.875rem",fontWeight:500}}>FAQ</a></li>
              <li><a href="#pricing" style={{color:"rgba(255,255,255,0.75)",textDecoration:"none",fontSize:"0.875rem",fontWeight:500}}>Pricing</a></li>
              <li><a href="#contact-sales" style={{color:"rgba(255,255,255,0.75)",textDecoration:"none",fontSize:"0.875rem",fontWeight:500}}>Contact Sales</a></li>
            </ul>
            <div className="lp-nav-cta">
              <a href="https://aigovernancetower.com/login" className="lp-btn lp-btn-outline">Sign In</a>
              <button className="lp-btn lp-btn-primary" onClick={() => { setOpenMenu(null); document.getElementById("contact-sales")?.scrollIntoView({ behavior: "smooth" }); }}>Contact Sales</button>
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

        {/* AD VIDEO — hero intro */}
        <section style={{background:"#060f1e",padding:"2.5rem 1rem 0"}}>
          <div style={{maxWidth:"960px",margin:"0 auto"}}>
            <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:"6px",background:"rgba(37,99,235,.15)",border:"1px solid rgba(37,99,235,.4)",color:"#60a5fa",padding:".28rem .9rem",borderRadius:"100px",fontSize:".7rem",fontWeight:700,letterSpacing:".07em",textTransform:"uppercase"}}>
                <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#60a5fa",display:"inline-block"}}/>Platform Overview · 90 Seconds
              </span>
              <h2 style={{fontSize:"clamp(1.2rem,3.5vw,1.9rem)",fontWeight:800,color:"#fff",marginTop:".6rem",letterSpacing:"-.02em",lineHeight:1.2}}>See the Control Tower in Action</h2>
              <p style={{fontSize:".85rem",color:"rgba(255,255,255,.5)",marginTop:".4rem"}}>Watch how we solve the AI governance crisis — from spreadsheet chaos to audit-ready compliance.</p>
            </div>
            <div className="lp-video-wrap" style={{maxWidth:"900px",margin:"0 auto",borderRadius:"14px",boxShadow:"0 0 0 1px rgba(37,99,235,.25), 0 30px 80px rgba(6,15,30,.7)"}}>
              <iframe src="/demo-marketing.html" title="AI Governance Control Tower — Platform Ad Video" allowFullScreen loading="lazy" />
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

        {/* AI MATURITY ASSESSMENT */}
        <section className="lp-assess" id="ai-maturity">
          <div className="lp-assess-glow" />
          <div className="lp-assess-inner">
            <div className="lp-header-center">
              <span className="lp-section-label" style={{color:"var(--blue-glow)"}}>AI Readiness</span>
              <h2 className="lp-section-title" style={{color:"#fff"}}>AI Maturity Assessment &amp; Use Case Finder</h2>
              <p className="lp-section-desc" style={{color:"rgba(255,255,255,0.55)"}}>
                Assess your organization&apos;s AI readiness across 9 dimensions, get personalized recommendations from 64+ AI use cases, and receive an LLM-powered roadmap — completely free.
              </p>
            </div>
            <div className="lp-assess-grid">
              {/* Left — Features */}
              <div className="lp-assess-features">
                {[
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>, title: "9 Assessment Dimensions", desc: "Including Responsible AI & Agentic AI readiness" },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>, title: "64 AI Use Cases", desc: "Industry-specific with ROI & effort estimates" },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, title: "LLM-Powered Insights", desc: "AI-generated gap analysis & 90-day roadmap" },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, title: "Industry Workflows", desc: "Visual diagrams showing AI automation opportunities" },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>, title: "Industry Benchmarking", desc: "Compare your scores against industry peers" },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title: "Quick & Full Modes", desc: "10-min quick assessment or 30-min comprehensive" },
                ].map((f) => (
                  <div className="lp-assess-feat" key={f.title}>
                    <div className="lp-assess-feat-icon">{f.icon}</div>
                    <div className="lp-assess-feat-title">{f.title}</div>
                    <div className="lp-assess-feat-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
              {/* Right — Visual */}
              <div className="lp-assess-visual">
                <div className="lp-assess-score">
                  <div className="lp-assess-score-num">3.8 / 5.0</div>
                  <div className="lp-assess-score-label">Level 4 — Managed</div>
                </div>
                <div className="lp-assess-dims">
                  {[
                    { name: "Strategy", pct: 82 }, { name: "Governance", pct: 68 },
                    { name: "Data", pct: 76 }, { name: "Technology", pct: 84 },
                    { name: "Organization", pct: 60 }, { name: "Processes", pct: 72 },
                    { name: "Performance", pct: 78 }, { name: "Responsible AI", pct: 54 },
                    { name: "Agentic AI", pct: 42 },
                  ].map((d) => (
                    <div className="lp-assess-dim" key={d.name}>
                      <div className="lp-assess-dim-name">{d.name}</div>
                      <div className="lp-assess-dim-bar">
                        <div className="lp-assess-dim-fill" style={{width:`${d.pct}%`}} />
                      </div>
                      <div className="lp-assess-dim-val">{(d.pct / 20).toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lp-assess-actions" style={{justifyContent:"center"}}>
              <a href="https://aima-frontend.onrender.com/register" target="_blank" rel="noopener noreferrer" className="lp-btn-gradient">
                Launch AI Maturity Assessment
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
              </a>
              <a href="https://aima-frontend.onrender.com/login" target="_blank" rel="noopener noreferrer" className="lp-btn-ghost-lg">Already have an account? Sign in</a>
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

        {/* PRICING */}
        <section className="lp-section lp-gray" id="pricing">
          <div className="lp-container">
            <div className="lp-header-center" style={{marginBottom:"3rem"}}>
              <div className="lp-badge"><span className="lp-badge-dot"/>Transparent Pricing</div>
              <h2 className="lp-section-title">Simple, Predictable Plans</h2>
              <p className="lp-section-desc">No hidden fees. No per-user surprises. Choose a plan that fits your organisation — upgrade anytime as you grow.</p>
            </div>

            {/* Toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",marginBottom:"2.5rem",fontSize:"0.9rem",color:"var(--gray-600)"}}>
              <span style={{fontWeight:600,color:"var(--navy)"}}>Monthly</span>
              <div style={{width:"44px",height:"24px",borderRadius:"100px",background:"var(--blue-glow)",position:"relative",cursor:"default",opacity:0.5}}>
                <span style={{position:"absolute",top:"3px",left:"3px",width:"18px",height:"18px",borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
              </div>
              <span>Annual <span style={{marginLeft:"6px",fontSize:"0.72rem",background:"rgba(16,185,129,0.12)",color:"#10b981",padding:"2px 8px",borderRadius:"100px",fontWeight:700}}>Save 20%</span></span>
            </div>

            {/* Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"1.5rem",alignItems:"start"}}>

              {/* Trial */}
              <div style={{background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:"16px",padding:"2rem",display:"flex",flexDirection:"column",gap:"0"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--gray-600)",marginBottom:"0.5rem"}}>Trial</div>
                <div style={{fontSize:"0.9rem",color:"var(--gray-600)",marginBottom:"1.25rem"}}>Explore the platform</div>
                <div style={{marginBottom:"0.25rem"}}><span style={{fontSize:"2.4rem",fontWeight:800,color:"var(--navy)",letterSpacing:"-0.03em"}}>₹0</span></div>
                <div style={{fontSize:"0.78rem",color:"var(--gray-600)",marginBottom:"1.5rem"}}>14 days · No card required</div>
                <a href="/register" style={{display:"block",textAlign:"center",padding:"0.65rem 1rem",borderRadius:"8px",border:"1.5px solid #cbd5e1",color:"var(--navy)",fontWeight:600,fontSize:"0.88rem",marginBottom:"1.5rem",textDecoration:"none"}}>Start Free Trial</a>
                <div style={{display:"flex",gap:"0.5rem",background:"#f8fafc",borderRadius:"8px",padding:"0.75rem",marginBottom:"1.5rem"}}>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--gray-600)"}}>Users</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--navy)"}}>5</div>
                  </div>
                  <div style={{width:"1px",background:"#e2e8f0"}}/>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--gray-600)"}}>Models</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--navy)"}}>10</div>
                  </div>
                </div>
                <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                  {["DPDP Act compliance controls","Basic risk scoring","Consent management","Community support"].map(f=>(
                    <li key={f} style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",fontSize:"0.83rem",color:"var(--gray-600)"}}>
                      <svg style={{width:"14px",height:"14px",color:"#10b981",flexShrink:0,marginTop:"2px"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Starter */}
              <div style={{background:"#fff",border:"1.5px solid #bfdbfe",borderRadius:"16px",padding:"2rem",display:"flex",flexDirection:"column",gap:"0"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--blue-glow)",marginBottom:"0.5rem"}}>Starter</div>
                <div style={{fontSize:"0.9rem",color:"var(--gray-600)",marginBottom:"1.25rem"}}>For fintechs &amp; NBFCs</div>
                <div style={{marginBottom:"0.25rem"}}><span style={{fontSize:"2.4rem",fontWeight:800,color:"var(--navy)",letterSpacing:"-0.03em"}}>₹12,711</span></div>
                <div style={{fontSize:"0.78rem",color:"var(--gray-600)",marginBottom:"1.5rem"}}>+ 18% GST &nbsp;·&nbsp; ₹14,999 incl. GST/mo</div>
                <a href="/register" style={{display:"block",textAlign:"center",padding:"0.65rem 1rem",borderRadius:"8px",border:"1.5px solid var(--blue-glow)",color:"var(--blue-glow)",fontWeight:600,fontSize:"0.88rem",marginBottom:"1.5rem",textDecoration:"none"}}>Get Started</a>
                <div style={{display:"flex",gap:"0.5rem",background:"#f8fafc",borderRadius:"8px",padding:"0.75rem",marginBottom:"1.5rem"}}>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--gray-600)"}}>Users</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--navy)"}}>10</div>
                  </div>
                  <div style={{width:"1px",background:"#e2e8f0"}}/>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--gray-600)"}}>Models</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--navy)"}}>25</div>
                  </div>
                </div>
                <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                  {["DPDP Act + ISO 42001 controls","Automated risk scoring","Consent & data governance","Compliance reports (PDF)","Email support (48h SLA)","Audit logs — 90 days"].map(f=>(
                    <li key={f} style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",fontSize:"0.83rem",color:"var(--gray-600)"}}>
                      <svg style={{width:"14px",height:"14px",color:"#10b981",flexShrink:0,marginTop:"2px"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Professional — highlighted */}
              <div style={{background:"linear-gradient(145deg,#0f172a 0%,#1e3a5f 100%)",border:"1.5px solid rgba(37,99,235,0.5)",borderRadius:"16px",padding:"2rem",display:"flex",flexDirection:"column",gap:"0",position:"relative",boxShadow:"0 20px 60px rgba(37,99,235,0.2)"}}>
                <div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"var(--blue-glow)",color:"#fff",fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.06em",padding:"3px 14px",borderRadius:"100px",whiteSpace:"nowrap"}}>MOST POPULAR</div>
                <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#60a5fa",marginBottom:"0.5rem"}}>Professional</div>
                <div style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.55)",marginBottom:"1.25rem"}}>For banks &amp; insurers</div>
                <div style={{marginBottom:"0.25rem"}}><span style={{fontSize:"2.4rem",fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>₹38,135</span></div>
                <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",marginBottom:"1.5rem"}}>+ 18% GST &nbsp;·&nbsp; ₹44,999 incl. GST/mo</div>
                <a href="/register" style={{display:"block",textAlign:"center",padding:"0.65rem 1rem",borderRadius:"8px",background:"var(--blue-glow)",color:"#fff",fontWeight:700,fontSize:"0.88rem",marginBottom:"1.5rem",textDecoration:"none",boxShadow:"0 4px 16px rgba(37,99,235,0.4)"}}>Upgrade to Pro</a>
                <div style={{display:"flex",gap:"0.5rem",background:"rgba(255,255,255,0.07)",borderRadius:"8px",padding:"0.75rem",marginBottom:"1.5rem"}}>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.45)"}}>Users</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"#fff"}}>25</div>
                  </div>
                  <div style={{width:"1px",background:"rgba(255,255,255,0.1)"}}/>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.45)"}}>Models</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"#fff"}}>100</div>
                  </div>
                </div>
                <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                  {["All frameworks: DPDP, ISO 42001, RBI, SEBI, IRDAI, EU AI Act","AI Agent governance (10 agents)","Bias & fairness testing module","ISO 42005 impact assessments","n8n workflow automation","Priority support (24h SLA)","Audit logs — 1 year","SSO / SAML integration"].map(f=>(
                    <li key={f} style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",fontSize:"0.83rem",color:"rgba(255,255,255,0.7)"}}>
                      <svg style={{width:"14px",height:"14px",color:"#34d399",flexShrink:0,marginTop:"2px"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enterprise */}
              <div style={{background:"#fff",border:"1.5px solid #fde68a",borderRadius:"16px",padding:"2rem",display:"flex",flexDirection:"column",gap:"0",position:"relative"}}>
                <div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"#f59e0b",color:"#fff",fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.06em",padding:"3px 14px",borderRadius:"100px",whiteSpace:"nowrap"}}>BEST VALUE</div>
                <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#d97706",marginBottom:"0.5rem"}}>Enterprise</div>
                <div style={{fontSize:"0.9rem",color:"var(--gray-600)",marginBottom:"1.25rem"}}>For PSBs &amp; large institutions</div>
                <div style={{marginBottom:"0.25rem"}}><span style={{fontSize:"2.4rem",fontWeight:800,color:"var(--navy)",letterSpacing:"-0.03em"}}>Custom</span></div>
                <div style={{fontSize:"0.78rem",color:"var(--gray-600)",marginBottom:"1.5rem"}}>Annual billing · Volume discounts</div>
                <a href="#contact-sales" style={{display:"block",textAlign:"center",padding:"0.65rem 1rem",borderRadius:"8px",background:"#f59e0b",color:"#fff",fontWeight:700,fontSize:"0.88rem",marginBottom:"1.5rem",textDecoration:"none"}}>Contact Sales</a>
                <div style={{display:"flex",gap:"0.5rem",background:"#fffbeb",borderRadius:"8px",padding:"0.75rem",marginBottom:"1.5rem"}}>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--gray-600)"}}>Users</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--navy)"}}>∞</div>
                  </div>
                  <div style={{width:"1px",background:"#fde68a"}}/>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--gray-600)"}}>Models</div>
                    <div style={{fontWeight:800,fontSize:"1.1rem",color:"var(--navy)"}}>∞</div>
                  </div>
                </div>
                <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                  {["Everything in Professional","On-premise / private cloud","Dedicated Customer Success Manager","99.9% uptime SLA","Custom compliance frameworks","White-label option","On-site training & workshops","4-hour critical support SLA"].map(f=>(
                    <li key={f} style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",fontSize:"0.83rem",color:"var(--gray-600)"}}>
                      <svg style={{width:"14px",height:"14px",color:"#10b981",flexShrink:0,marginTop:"2px"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{f}
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* GST note */}
            <p style={{textAlign:"center",fontSize:"0.82rem",color:"var(--gray-600)",marginTop:"2rem"}}>
              All prices exclusive of GST unless stated. GST invoice generated automatically. Accepted: UPI, NetBanking, Credit/Debit Cards, NEFT/RTGS.
              &nbsp;<a href="mailto:billing@aigovernancetower.com" style={{color:"var(--blue-glow)"}}>billing@aigovernancetower.com</a>
            </p>
          </div>
        </section>

        {/* CONTACT SALES */}
        <section className="lp-cs-section" id="contact-sales">
          <div className="lp-cs-inner">
            {/* Left */}
            <div className="lp-cs-left lp-fade">
              <div className="lp-cs-label">Contact Sales</div>
              <h2 className="lp-cs-title">Talk to Our<br />Enterprise Team</h2>
              <p className="lp-cs-desc">Get a personalised walkthrough of the AI Governance Control Tower and learn how it fits your compliance and risk landscape.</p>
              <div className="lp-cs-cards">
                {[
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                    title: "Tailored Demo",
                    desc: "See the platform configured for your industry, frameworks, and AI portfolio.",
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
                    title: "Flexible Pricing",
                    desc: "Starter, Professional, and Enterprise plans — or a custom on-premise deployment.",
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
                    title: "Dedicated Onboarding",
                    desc: "Our team handles setup, migration, and training so you're live within days.",
                  },
                ].map((card) => (
                  <div className="lp-cs-card" key={card.title}>
                    <div className="lp-cs-card-icon">{card.icon}</div>
                    <div>
                      <div className="lp-cs-card-title">{card.title}</div>
                      <div className="lp-cs-card-desc">{card.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="lp-cs-support">
                Need immediate help? Email us at{" "}
                <a href="mailto:enquiry@aigovernancetower.com">enquiry@aigovernancetower.com</a>
              </p>
            </div>

            {/* Right — Form */}
            <div className="lp-fade lp-fade-d1">
              <div className="lp-cs-form-box">
                {csSubmitted ? (
                  <div className="lp-cs-success show">
                    <div className="lp-cs-success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <h3>Message Sent!</h3>
                    <p>Thank you for reaching out. Our team will get back to you within 1 business day.</p>
                  </div>
                ) : (
                  <>
                    <div className="lp-cs-form-title">Get in Touch</div>
                    <div className="lp-cs-form-sub">We typically respond within 1 business day.</div>
                    <form onSubmit={submitContactForm}>
                      <div className="lp-cs-grid2">
                        <div className="lp-cs-field">
                          <label className="lp-cs-label-f" htmlFor="cs-fname">First Name *</label>
                          <input id="cs-fname" className="lp-cs-input" placeholder="Prashant" required />
                        </div>
                        <div className="lp-cs-field">
                          <label className="lp-cs-label-f" htmlFor="cs-lname">Last Name *</label>
                          <input id="cs-lname" className="lp-cs-input" placeholder="Thakur" required />
                        </div>
                      </div>
                      <div className="lp-cs-field">
                        <label className="lp-cs-label-f" htmlFor="cs-email">Work Email *</label>
                        <input id="cs-email" type="email" className="lp-cs-input" placeholder="you@company.com" required />
                      </div>
                      <div className="lp-cs-grid2">
                        <div className="lp-cs-field">
                          <label className="lp-cs-label-f" htmlFor="cs-company">Company *</label>
                          <input id="cs-company" className="lp-cs-input" placeholder="Acme Corp" required />
                        </div>
                        <div className="lp-cs-field">
                          <label className="lp-cs-label-f" htmlFor="cs-phone">Phone</label>
                          <input id="cs-phone" type="tel" className="lp-cs-input" placeholder="+91 98765 43210" />
                        </div>
                      </div>
                      <div className="lp-cs-field">
                        <label className="lp-cs-label-f" htmlFor="cs-size">Organisation Size</label>
                        <select id="cs-size" className="lp-cs-input lp-cs-select">
                          <option value="">Select size…</option>
                          <option>1–50 employees</option>
                          <option>51–200 employees</option>
                          <option>201–1000 employees</option>
                          <option>1001–5000 employees</option>
                          <option>5000+ employees</option>
                        </select>
                      </div>
                      <div className="lp-cs-field" style={{marginBottom:0}}>
                        <label className="lp-cs-label-f" htmlFor="cs-message">Message</label>
                        <textarea id="cs-message" className="lp-cs-input lp-cs-textarea" placeholder="Tell us about your AI governance needs, current challenges, or the frameworks you need to comply with…" />
                      </div>
                      <button type="submit" className="lp-cs-submit" disabled={csLoading}>
                        {csLoading ? "Sending…" : "Send Message →"}
                      </button>
                      <p className="lp-cs-privacy">By submitting, you agree to our Privacy Policy. We never share your data.</p>
                    </form>
                  </>
                )}
              </div>
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
              <a href="/landing" className="lp-logo" style={{marginLeft:"0"}}>
                <img src="/logo.png" alt="AI Governance Control Tower" style={{width:"220px", height:"80px", objectFit:"contain", objectPosition:"left center", display:"block"}} />
              </a>
              <p className="lp-footer-desc">Enterprise AI Governance platform for DPDP, ISO 42001, GDPR, and EU AI Act compliance. Monitor, govern, and explain every AI decision at scale.</p>
            </div>
            <div>
              <div className="lp-footer-col-title">Product</div>
              <ul className="lp-footer-links">
                {["AI Inventory", "Risk & Compliance", "Data Governance", "Agent Governance", "Audit & Reports", "Monitoring", "AI Maturity Assessment"].map((l) => <li key={l}><a href={l === "AI Maturity Assessment" ? "https://aima-frontend.onrender.com" : "/login"} target={l === "AI Maturity Assessment" ? "_blank" : undefined} rel={l === "AI Maturity Assessment" ? "noopener noreferrer" : undefined}>{l}</a></li>)}
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
                {["About", "Documentation", "Privacy Policy", "Terms of Service", "Contact"].map((l) => <li key={l}><a href="#">{l}</a></li>)}
                <li><a href="#pricing">Pricing</a></li>
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
