<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>StatementIQ — Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
  :root {
    --bg-base:       #080d14;
    --bg-card:       #0e1620;
    --bg-card2:      #111c2b;
    --bg-hover:      #162031;
    --border:        rgba(255,255,255,0.07);
    --border-glow:   rgba(0,200,255,0.18);
    --accent-cyan:   #00c8ff;
    --accent-purple: #a855f7;
    --accent-green:  #22d67a;
    --accent-red:    #f25c5c;
    --accent-amber:  #f5a623;
    --text-primary:  #e8f0fe;
    --text-secondary:#7a90ac;
    --text-muted:    #3d5166;
    --grad-brand:    linear-gradient(135deg,#00c8ff 0%,#a855f7 100%);
    --shadow-card:   0 4px 32px rgba(0,0,0,0.45);
    --shadow-glow:   0 0 24px rgba(0,200,255,0.12);
    --radius:        14px;
    --radius-sm:     8px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ─── NOISE OVERLAY ─── */
  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: .4;
  }

  /* ─── SIDEBAR ─── */
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 240px;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    z-index: 100;
    padding: 0 0 24px;
  }

  .sidebar-logo {
    display: flex; align-items: center; gap: 12px;
    padding: 28px 24px 24px;
    border-bottom: 1px solid var(--border);
  }

  .logo-icon {
    width: 38px; height: 38px;
    background: var(--grad-brand);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  .logo-text {
    font-family: 'Syne', sans-serif;
    font-size: 18px; font-weight: 800;
    color: var(--text-primary);
  }

  .logo-text span { color: var(--accent-cyan); }

  .beta-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 1.5px;
    color: var(--accent-cyan);
    background: rgba(0,200,255,0.1);
    border: 1px solid rgba(0,200,255,0.25);
    border-radius: 4px;
    padding: 2px 6px;
    margin-left: 4px;
    vertical-align: middle;
  }

  .sidebar-nav {
    flex: 1;
    padding: 20px 0;
    overflow-y: auto;
  }

  .nav-section-label {
    font-size: 10px; font-weight: 600; letter-spacing: 1.8px;
    color: var(--text-muted);
    text-transform: uppercase;
    padding: 0 24px 8px;
    margin-top: 12px;
  }

  .nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 24px;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 14px; font-weight: 500;
    border-left: 3px solid transparent;
    transition: all .2s;
    position: relative;
    text-decoration: none;
  }

  .nav-item:hover { color: var(--text-primary); background: var(--bg-hover); }

  .nav-item.active {
    color: var(--accent-cyan);
    background: rgba(0,200,255,0.06);
    border-left-color: var(--accent-cyan);
  }

  .nav-icon { width: 18px; text-align: center; font-size: 16px; }

  .nav-badge {
    margin-left: auto;
    font-size: 10px; font-weight: 600;
    background: var(--accent-red);
    color: #fff;
    border-radius: 10px;
    padding: 1px 6px;
    min-width: 18px; text-align: center;
  }

  .sidebar-footer {
    padding: 16px 24px 0;
    border-top: 1px solid var(--border);
  }

  .user-card {
    display: flex; align-items: center; gap: 10px;
    padding: 10px;
    background: var(--bg-card2);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .user-avatar {
    width: 34px; height: 34px;
    background: var(--grad-brand);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }

  .user-name { font-size: 13px; font-weight: 600; }
  .user-plan { font-size: 11px; color: var(--accent-cyan); }

  /* ─── MAIN CONTENT ─── */
  .main {
    margin-left: 240px;
    padding: 32px 36px;
    min-height: 100vh;
    position: relative; z-index: 1;
  }

  /* ─── TOP BAR ─── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 32px;
  }

  .topbar-left h1 {
    font-family: 'Syne', sans-serif;
    font-size: 24px; font-weight: 800;
    color: var(--text-primary);
  }

  .topbar-left p {
    font-size: 13px; color: var(--text-secondary);
    margin-top: 3px;
  }

  .topbar-right {
    display: flex; align-items: center; gap: 12px;
  }

  .period-selector {
    display: flex; align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .period-btn {
    padding: 7px 14px;
    font-size: 12px; font-weight: 500;
    color: var(--text-secondary);
    background: transparent; border: none; cursor: pointer;
    transition: all .2s;
  }

  .period-btn.active {
    background: var(--bg-hover);
    color: var(--accent-cyan);
  }

  .icon-btn {
    width: 36px; height: 36px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 15px;
    color: var(--text-secondary);
    transition: all .2s;
  }

  .icon-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }

  /* ─── HEALTH SCORE BAR ─── */
  .health-banner {
    background: linear-gradient(135deg, rgba(0,200,255,0.08) 0%, rgba(168,85,247,0.08) 100%);
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 18px 28px;
    display: flex; align-items: center; gap: 32px;
    margin-bottom: 28px;
    position: relative; overflow: hidden;
  }

  .health-banner::before {
    content: '';
    position: absolute; top: -50%; right: -10%;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(0,200,255,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .health-score-block { display: flex; flex-direction: column; }

  .health-label {
    font-size: 10px; font-weight: 600; letter-spacing: 1.8px;
    text-transform: uppercase; color: var(--accent-cyan);
  }

  .health-number {
    font-family: 'Syne', sans-serif;
    font-size: 38px; font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
    margin: 4px 0 2px;
  }

  .health-number span { font-size: 18px; color: var(--text-secondary); font-weight: 400; }

  .health-status {
    font-size: 12px; font-weight: 500;
    color: var(--accent-green);
    display: flex; align-items: center; gap: 4px;
  }

  .health-bar-wrap {
    flex: 1;
    display: flex; flex-direction: column; gap: 8px;
  }

  .health-bar-track {
    height: 8px;
    background: var(--bg-card2);
    border-radius: 4px;
    overflow: hidden;
  }

  .health-bar-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #00c8ff, #22d67a);
    border-radius: 4px;
    transition: width 1.4s cubic-bezier(.34,1.56,.64,1);
  }

  .health-bar-labels {
    display: flex; justify-content: space-between;
    font-size: 10px; color: var(--text-muted);
  }

  .health-meta {
    display: flex; gap: 28px;
  }

  .health-meta-item { text-align: center; }
  .health-meta-item .val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
  .health-meta-item .lbl { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

  /* ─── SUMMARY CARDS ─── */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-bottom: 28px;
  }

  .summary-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 22px 20px;
    position: relative; overflow: hidden;
    transition: transform .2s, box-shadow .2s;
    cursor: default;
  }

  .summary-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow);
    border-color: var(--border-glow);
  }

  .summary-card::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0;
    height: 2px;
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .summary-card.income::after  { background: var(--accent-green); }
  .summary-card.expense::after { background: var(--accent-red); }
  .summary-card.balance::after { background: var(--accent-cyan); }
  .summary-card.savings::after { background: var(--accent-purple); }

  .card-top {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 14px;
  }

  .card-icon-wrap {
    width: 38px; height: 38px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px;
  }

  .income  .card-icon-wrap { background: rgba(34,214,122,0.12); }
  .expense .card-icon-wrap { background: rgba(242,92,92,0.12); }
  .balance .card-icon-wrap { background: rgba(0,200,255,0.12); }
  .savings .card-icon-wrap { background: rgba(168,85,247,0.12); }

  .card-trend {
    font-size: 11px; font-weight: 500;
    padding: 3px 8px;
    border-radius: 20px;
    display: flex; align-items: center; gap: 3px;
  }

  .trend-up   { background: rgba(34,214,122,0.1);  color: var(--accent-green); }
  .trend-down { background: rgba(242,92,92,0.1);   color: var(--accent-red); }
  .trend-neu  { background: rgba(0,200,255,0.1);   color: var(--accent-cyan); }

  .card-label { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px; }

  .card-value {
    font-family: 'Syne', sans-serif;
    font-size: 26px; font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
  }

  .card-sub { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

  /* ─── CHARTS ROW ─── */
  .charts-row {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 18px;
    margin-bottom: 28px;
  }

  .panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    position: relative;
  }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px;
  }

  .panel-title {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700;
    color: var(--text-primary);
  }

  .panel-subtitle { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

  .panel-badge {
    font-size: 11px; font-weight: 600;
    background: rgba(0,200,255,0.1);
    color: var(--accent-cyan);
    border: 1px solid rgba(0,200,255,0.2);
    border-radius: 20px;
    padding: 3px 10px;
  }

  /* BAR CHART */
  .bar-chart {
    display: flex; align-items: flex-end; gap: 10px;
    height: 160px;
    padding-bottom: 2px;
  }

  .bar-group {
    flex: 1;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }

  .bar-pair {
    display: flex; gap: 4px;
    align-items: flex-end;
    height: 140px;
  }

  .bar {
    width: 18px;
    border-radius: 4px 4px 0 0;
    transition: height 1s cubic-bezier(.34,1.56,.64,1);
    position: relative;
    cursor: pointer;
  }

  .bar.income-bar { background: linear-gradient(180deg, var(--accent-green), rgba(34,214,122,0.4)); }
  .bar.expense-bar { background: linear-gradient(180deg, var(--accent-red), rgba(242,92,92,0.4)); }

  .bar:hover::after {
    content: attr(data-val);
    position: absolute; top: -26px; left: 50%; transform: translateX(-50%);
    background: var(--bg-card2); border: 1px solid var(--border);
    border-radius: 4px; padding: 2px 6px;
    font-size: 10px; white-space: nowrap;
    color: var(--text-primary);
  }

  .bar-label { font-size: 10px; color: var(--text-muted); }

  .chart-legend {
    display: flex; gap: 18px;
    margin-top: 14px;
  }

  .legend-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-secondary);
  }

  .legend-dot {
    width: 8px; height: 8px; border-radius: 50%;
  }

  /* DONUT CHART */
  .donut-wrap {
    display: flex; flex-direction: column; align-items: center;
    gap: 18px;
  }

  .donut-svg-wrap { position: relative; width: 160px; height: 160px; }

  .donut-center {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }

  .donut-center-val {
    font-family: 'Syne', sans-serif;
    font-size: 22px; font-weight: 800;
    color: var(--text-primary);
  }

  .donut-center-lbl { font-size: 10px; color: var(--text-secondary); }

  .donut-cats {
    width: 100%;
    display: flex; flex-direction: column; gap: 8px;
  }

  .donut-cat-item {
    display: flex; align-items: center; justify-content: space-between;
  }

  .donut-cat-left { display: flex; align-items: center; gap: 8px; }

  .donut-cat-dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0;
  }

  .donut-cat-name { font-size: 12px; color: var(--text-secondary); }

  .donut-cat-bar-track {
    flex: 1; height: 4px;
    background: var(--bg-card2);
    border-radius: 2px;
    margin: 0 10px;
    overflow: hidden;
  }

  .donut-cat-bar-fill {
    height: 100%; border-radius: 2px;
    width: 0%; transition: width 1.2s ease;
  }

  .donut-cat-val { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; }

  /* ─── BOTTOM GRID ─── */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 28px;
  }

  /* RECURRING PAYMENTS */
  .recurring-list { display: flex; flex-direction: column; gap: 10px; }

  .recurring-item {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px;
    background: var(--bg-card2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    transition: border-color .2s;
  }

  .recurring-item:hover { border-color: var(--border-glow); }

  .rec-icon {
    width: 36px; height: 36px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }

  .rec-info { flex: 1; }
  .rec-name { font-size: 13px; font-weight: 500; }
  .rec-date { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

  .rec-amt {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px; font-weight: 500;
  }

  .rec-status {
    font-size: 10px; font-weight: 600;
    padding: 2px 8px; border-radius: 10px;
    margin-left: 8px;
  }

  .status-active { background: rgba(34,214,122,0.1); color: var(--accent-green); }
  .status-due    { background: rgba(245,166,35,0.1);  color: var(--accent-amber); }
  .status-missed { background: rgba(242,92,92,0.1);   color: var(--accent-red); }

  /* UNUSUAL TRANSACTIONS */
  .unusual-list { display: flex; flex-direction: column; gap: 10px; }

  .unusual-item {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px;
    background: rgba(242,92,92,0.05);
    border: 1px solid rgba(242,92,92,0.15);
    border-radius: var(--radius-sm);
    transition: border-color .2s;
  }

  .unusual-item:hover { border-color: rgba(242,92,92,0.35); }

  .unusual-flag {
    width: 34px; height: 34px;
    background: rgba(242,92,92,0.12);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; flex-shrink: 0;
  }

  .unusual-info { flex: 1; }
  .unusual-name { font-size: 13px; font-weight: 500; }
  .unusual-reason { font-size: 11px; color: var(--accent-amber); margin-top: 2px; }

  .unusual-amt {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px; font-weight: 500; color: var(--accent-red);
  }

  /* ─── AI SUMMARY ─── */
  .ai-panel {
    background: linear-gradient(135deg, rgba(0,200,255,0.06), rgba(168,85,247,0.06));
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 28px;
    position: relative; overflow: hidden;
  }

  .ai-panel::before {
    content: '';
    position: absolute; bottom: -60px; right: -60px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .ai-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 18px;
  }

  .ai-orb {
    width: 40px; height: 40px;
    background: var(--grad-brand);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    box-shadow: 0 0 20px rgba(0,200,255,0.3);
  }

  .ai-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px; font-weight: 700;
  }

  .ai-subtitle { font-size: 12px; color: var(--accent-cyan); }

  .ai-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .ai-insight {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px;
  }

  .ai-insight-icon { font-size: 20px; margin-bottom: 8px; }
  .ai-insight-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); letter-spacing: .5px; margin-bottom: 6px; }
  .ai-insight-text { font-size: 13px; color: var(--text-primary); line-height: 1.5; }

  /* ─── TRANSACTIONS TABLE ─── */
  .tx-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 28px;
  }

  .tx-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }

  .tx-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-card2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 7px 14px;
    font-size: 13px; color: var(--text-secondary);
  }

  .tx-table { width: 100%; border-collapse: collapse; }

  .tx-table th {
    text-align: left;
    padding: 12px 20px;
    font-size: 10px; font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    background: var(--bg-card2);
  }

  .tx-table td {
    padding: 13px 20px;
    font-size: 13px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }

  .tx-table tr:last-child td { border-bottom: none; }

  .tx-table tr:hover td { background: var(--bg-hover); }

  .tx-date { color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; font-size: 12px; }

  .tx-name-wrap { display: flex; align-items: center; gap: 10px; }

  .tx-cat-icon {
    width: 30px; height: 30px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }

  .tx-name { font-weight: 500; }
  .tx-bank { font-size: 11px; color: var(--text-muted); }

  .tx-cat-badge {
    font-size: 11px; font-weight: 500;
    padding: 3px 10px;
    border-radius: 10px;
    background: rgba(0,200,255,0.08);
    color: var(--accent-cyan);
    border: 1px solid rgba(0,200,255,0.15);
  }

  .tx-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; font-weight: 500;
  }

  .tx-amount.debit  { color: var(--accent-red); }
  .tx-amount.credit { color: var(--accent-green); }

  .tx-status-dot {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 500;
  }

  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    display: inline-block;
  }

  .dot-green { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
  .dot-amber { background: var(--accent-amber); box-shadow: 0 0 6px var(--accent-amber); }
  .dot-red   { background: var(--accent-red);   box-shadow: 0 0 6px var(--accent-red); }

  /* ─── SKELETON LOADER ─── */
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }

  .skeleton {
    background: linear-gradient(90deg, var(--bg-card2) 25%, var(--bg-hover) 50%, var(--bg-card2) 75%);
    background-size: 600px 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 4px;
  }

  /* ─── EMPTY STATE ─── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    padding: 36px 20px;
    color: var(--text-muted);
    gap: 10px;
  }

  .empty-state .empty-icon { font-size: 36px; opacity: .4; }
  .empty-state .empty-msg  { font-size: 13px; }

  /* ─── SCROLLBAR ─── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg-base); }
  ::-webkit-scrollbar-thumb { background: var(--bg-hover); border-radius: 3px; }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 1280px) {
    .cards-grid { grid-template-columns: repeat(2, 1fr); }
    .charts-row { grid-template-columns: 1fr; }
    .ai-grid    { grid-template-columns: repeat(2,1fr); }
  }

  @media (max-width: 900px) {
    .sidebar { display: none; }
    .main    { margin-left: 0; padding: 20px; }
    .bottom-grid { grid-template-columns: 1fr; }
    .health-meta { display: none; }
  }

  @media (max-width: 600px) {
    .cards-grid { grid-template-columns: 1fr; }
    .ai-grid    { grid-template-columns: 1fr; }
  }

  /* fade-in on load */
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .fadein { animation: fadeUp .5s ease both; }
  .fadein-1 { animation-delay: .1s; }
  .fadein-2 { animation-delay: .2s; }
  .fadein-3 { animation-delay: .3s; }
  .fadein-4 { animation-delay: .4s; }
  .fadein-5 { animation-delay: .5s; }
  .fadein-6 { animation-delay: .6s; }
</style>
</head>
<body>

<!-- ═══ SIDEBAR ═══ -->
<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">★</div>
    <div>
      <span class="logo-text">Statement<span>IQ</span></span>
      <span class="beta-tag">BETA</span>
    </div>
  </div>

  <nav class="sidebar-nav">
    <div class="nav-section-label">Overview</div>
    <a class="nav-item active" href="#">
      <span class="nav-icon">⊞</span> Dashboard
    </a>
    <a class="nav-item" href="#">
      <span class="nav-icon">📊</span> Analytics
    </a>

    <div class="nav-section-label">Finance</div>
    <a class="nav-item" href="#">
      <span class="nav-icon">🏦</span> Accounts
    </a>
    <a class="nav-item" href="#">
      <span class="nav-icon">↕</span> Transactions
      <span class="nav-badge">12</span>
    </a>
    <a class="nav-item" href="#">
      <span class="nav-icon">🔄</span> Recurring
    </a>
    <a class="nav-item" href="#">
      <span class="nav-icon">🎯</span> Budget
    </a>

    <div class="nav-section-label">Intelligence</div>
    <a class="nav-item" href="#">
      <span class="nav-icon">🤖</span> AI Insights
    </a>
    <a class="nav-item" href="#">
      <span class="nav-icon">⚠️</span> Alerts
      <span class="nav-badge">3</span>
    </a>
    <a class="nav-item" href="#">
      <span class="nav-icon">📁</span> Upload
    </a>

    <div class="nav-section-label">Account</div>
    <a class="nav-item" href="#">
      <span class="nav-icon">⚙</span> Settings
    </a>
  </nav>

  <div class="sidebar-footer">
    <div class="user-card">
      <div class="user-avatar">JD</div>
      <div>
        <div class="user-name">Jane Doe</div>
        <div class="user-plan">Premium Plan</div>
      </div>
    </div>
  </div>
</aside>

<!-- ═══ MAIN CONTENT ═══ -->
<main class="main">

  <!-- TOP BAR -->
  <div class="topbar fadein">
    <div class="topbar-left">
      <h1>Financial Dashboard</h1>
      <p id="dash-date">Loading date…</p>
    </div>
    <div class="topbar-right">
      <div class="period-selector">
        <button class="period-btn" onclick="setPeriod(this,'7D')">7D</button>
        <button class="period-btn active" onclick="setPeriod(this,'1M')">1M</button>
        <button class="period-btn" onclick="setPeriod(this,'3M')">3M</button>
        <button class="period-btn" onclick="setPeriod(this,'1Y')">1Y</button>
      </div>
      <div class="icon-btn" title="Refresh" onclick="triggerRefresh(this)">↻</div>
      <div class="icon-btn" title="Export">⤓</div>
    </div>
  </div>

  <!-- HEALTH SCORE -->
  <div class="health-banner fadein fadein-1">
    <div class="health-score-block">
      <div class="health-label">● Financial Health Score</div>
      <div class="health-number" id="hs-num">0<span>/850</span></div>
      <div class="health-status" id="hs-status">— loading…</div>
    </div>
    <div class="health-bar-wrap">
      <div class="health-bar-track">
        <div class="health-bar-fill" id="hs-bar"></div>
      </div>
      <div class="health-bar-labels">
        <span>Poor (0)</span><span>Fair (400)</span><span>Good (600)</span><span>Excellent (850)</span>
      </div>
    </div>
    <div class="health-meta">
      <div class="health-meta-item"><div class="val" id="hm-transactions">0</div><div class="lbl">Transactions</div></div>
      <div class="health-meta-item"><div class="val" id="hm-categories">0</div><div class="lbl">Categories</div></div>
      <div class="health-meta-item"><div class="val" id="hm-recurring">0</div><div class="lbl">Recurring</div></div>
    </div>
  </div>

  <!-- SUMMARY CARDS -->
  <div class="cards-grid fadein fadein-2">
    <div class="summary-card income">
      <div class="card-top">
        <div class="card-icon-wrap">💚</div>
        <div class="card-trend trend-up" id="tr-income">↑ 0%</div>
      </div>
      <div class="card-label">Total Income</div>
      <div class="card-value" id="cv-income">₹0</div>
      <div class="card-sub" id="cs-income">vs last month: ₹0</div>
    </div>
    <div class="summary-card expense">
      <div class="card-top">
        <div class="card-icon-wrap">🔴</div>
        <div class="card-trend trend-down" id="tr-expense">↓ 0%</div>
      </div>
      <div class="card-label">Total Expense</div>
      <div class="card-value" id="cv-expense">₹0</div>
      <div class="card-sub" id="cs-expense">vs last month: ₹0</div>
    </div>
    <div class="summary-card balance">
      <div class="card-top">
        <div class="card-icon-wrap">🔵</div>
        <div class="card-trend trend-neu" id="tr-balance">— stable</div>
      </div>
      <div class="card-label">Current Balance</div>
      <div class="card-value" id="cv-balance">₹0</div>
      <div class="card-sub" id="cs-balance">across 0 accounts</div>
    </div>
    <div class="summary-card savings">
      <div class="card-top">
        <div class="card-icon-wrap">💜</div>
        <div class="card-trend trend-up" id="tr-savings">↑ 0%</div>
      </div>
      <div class="card-label">Savings / Budget</div>
      <div class="card-value" id="cv-savings">₹0</div>
      <div class="card-sub" id="cs-savings">0% of income saved</div>
    </div>
  </div>

  <!-- CHARTS ROW -->
  <div class="charts-row fadein fadein-3">

    <!-- INCOME vs EXPENSE BAR CHART -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">Income vs Expense</div>
          <div class="panel-subtitle">Monthly comparison</div>
        </div>
        <div class="panel-badge" id="chart-period">Jan – Jun 2025</div>
      </div>
      <div class="bar-chart" id="bar-chart">
        <!-- rendered by JS -->
      </div>
      <div class="chart-legend">
        <div class="legend-item"><div class="legend-dot" style="background:var(--accent-green)"></div> Income</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--accent-red)"></div> Expense</div>
      </div>
    </div>

    <!-- DONUT / CATEGORY BREAKDOWN -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">Category Breakdown</div>
          <div class="panel-subtitle">Spending by type</div>
        </div>
      </div>
      <div class="donut-wrap">
        <div class="donut-svg-wrap">
          <svg id="donut-svg" viewBox="0 0 160 160" width="160" height="160"></svg>
          <div class="donut-center">
            <div class="donut-center-val" id="donut-total">₹0</div>
            <div class="donut-center-lbl">Total Spent</div>
          </div>
        </div>
        <div class="donut-cats" id="donut-cats"></div>
      </div>
    </div>
  </div>

  <!-- RECURRING & UNUSUAL GRID -->
  <div class="bottom-grid fadein fadein-4">

    <!-- RECURRING PAYMENTS -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">🔄 Recurring Payments</div>
          <div class="panel-subtitle">Subscriptions & scheduled bills</div>
        </div>
        <div class="panel-badge" id="rec-count">0 active</div>
      </div>
      <div class="recurring-list" id="recurring-list">
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-msg">No recurring data yet</div>
        </div>
      </div>
    </div>

    <!-- UNUSUAL TRANSACTIONS -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">⚠️ Unusual Transactions</div>
          <div class="panel-subtitle">Anomalous spending flagged by AI</div>
        </div>
        <div class="panel-badge" id="unusual-count" style="background:rgba(242,92,92,0.1);color:var(--accent-red);border-color:rgba(242,92,92,0.2)">0 alerts</div>
      </div>
      <div class="unusual-list" id="unusual-list">
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-msg">No anomalies detected yet</div>
        </div>
      </div>
    </div>
  </div>

  <!-- AI SUMMARY -->
  <div class="ai-panel fadein fadein-5">
    <div class="ai-header">
      <div class="ai-orb">🤖</div>
      <div>
        <div class="ai-title">AI Financial Summary</div>
        <div class="ai-subtitle">Powered by GPT-4 · Updated now</div>
      </div>
    </div>
    <div class="ai-grid" id="ai-grid">
      <div class="ai-insight skeleton" style="height:80px"></div>
      <div class="ai-insight skeleton" style="height:80px"></div>
      <div class="ai-insight skeleton" style="height:80px"></div>
      <div class="ai-insight skeleton" style="height:80px"></div>
    </div>
  </div>

  <!-- TRANSACTIONS TABLE -->
  <div class="tx-panel fadein fadein-6">
    <div class="tx-panel-header">
      <div>
        <div class="panel-title">Transaction History</div>
        <div class="panel-subtitle" id="tx-count">Showing 0 transactions</div>
      </div>
      <div class="tx-search">🔍 &nbsp;Search transactions…</div>
    </div>
    <table class="tx-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Transaction</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="tx-body">
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-icon">📄</div>
              <div class="empty-msg">No transactions loaded. Upload a bank statement to get started.</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</main>

<script>
/* ══════════════════════════════════
   MOCK DATA — replace with real API
══════════════════════════════════ */
const mockData = {
  healthScore: 782,
  totalIncome:  148500,
  totalExpense:  97340,
  currentBalance: 284750,
  savings: 51160,
  incomeChangePct: 12.4,
  expenseChangePct: -3.2,
  savingsPct: 34.4,
  transactions: 248,
  categories: 12,
  recurring: 7,

  monthlyData: [
    { month:'Jan', income:112000, expense:78000 },
    { month:'Feb', income:98000,  expense:82000 },
    { month:'Mar', income:135000, expense:91000 },
    { month:'Apr', income:121000, expense:88000 },
    { month:'May', income:148500, expense:97340 },
    { month:'Jun', income:0,      expense:0 },
  ],

  categories: [
    { name:'Food & Dining',   amount:22400, pct:23, color:'#00c8ff' },
    { name:'Shopping',        amount:18900, pct:19, color:'#a855f7' },
    { name:'Bills & Utilities', amount:15200, pct:16, color:'#22d67a' },
    { name:'Transport',       amount:12600, pct:13, color:'#f5a623' },
    { name:'Entertainment',   amount:9800,  pct:10, color:'#f25c5c' },
    { name:'Others',          amount:18440, pct:19, color:'#3d8bff' },
  ],

  recurring: [
    { name:'Netflix Premium',    date:'Due Jun 1',  amount:649,  status:'active', icon:'🎬', color:'rgba(242,92,92,0.15)' },
    { name:'Spotify Family',     date:'Due Jun 3',  amount:179,  status:'active', icon:'🎵', color:'rgba(34,214,122,0.15)' },
    { name:'Home Loan EMI',      date:'Due Jun 5',  amount:24500, status:'due',   icon:'🏠', color:'rgba(245,166,35,0.15)' },
    { name:'AWS Subscription',   date:'Due Jun 8',  amount:3200, status:'active', icon:'☁️', color:'rgba(0,200,255,0.15)' },
    { name:'Gym Membership',     date:'Missed May', amount:1200, status:'missed', icon:'💪', color:'rgba(242,92,92,0.15)' },
  ],

  unusual: [
    { name:'Amazon — Electronics', reason:'3× above avg spend', amount:18400, icon:'📦' },
    { name:'International Transfer', reason:'First-time overseas txn', amount:52000, icon:'🌍' },
    { name:'ATM Withdrawal',        reason:'Late night, unknown ATM', amount:5000, icon:'🏧' },
  ],

  aiInsights: [
    { icon:'📈', title:'Spending Habits', text:'Your dining spend is 23% of budget — 8% above optimal. Consider meal planning to save ~₹4K/month.' },
    { icon:'💰', title:'Income Trend',    text:'Income rose 12.4% this month, outpacing expense growth of -3.2%. Strong momentum.' },
    { icon:'🎯', title:'Budget Insights', text:'You\'re ₹8,200 under your shopping budget this month. Best performance in 6 months.' },
    { icon:'🌱', title:'Savings Tips',    text:'At current rate, you\'ll exceed your ₹6L annual savings goal in August — 4 months early.' },
  ],

  transactions: [
    { date:'2025-05-23', name:'Zomato Order',         bank:'HDFC Savings', cat:'Food',         catColor:'#00c8ff', icon:'🍕', iconBg:'rgba(0,200,255,0.1)', amount: -840,  status:'completed' },
    { date:'2025-05-22', name:'Salary Credit',         bank:'HDFC Salary',  cat:'Income',       catColor:'#22d67a', icon:'💼', iconBg:'rgba(34,214,122,0.1)', amount:+148500, status:'completed' },
    { date:'2025-05-21', name:'Amazon Shopping',       bank:'ICICI Credit',  cat:'Shopping',    catColor:'#a855f7', icon:'🛒', iconBg:'rgba(168,85,247,0.1)', amount:-18400, status:'completed' },
    { date:'2025-05-20', name:'Electricity Bill',      bank:'SBI Savings',   cat:'Utilities',   catColor:'#f5a623', icon:'⚡', iconBg:'rgba(245,166,35,0.1)', amount: -2140, status:'completed' },
    { date:'2025-05-19', name:'Uber Ride',             bank:'Paytm Wallet',  cat:'Transport',   catColor:'#3d8bff', icon:'🚗', iconBg:'rgba(61,139,255,0.1)', amount:  -340, status:'completed' },
    { date:'2025-05-18', name:'Netflix Premium',       bank:'HDFC Savings',  cat:'Entertainment',catColor:'#f25c5c',icon:'🎬',iconBg:'rgba(242,92,92,0.1)',  amount:  -649, status:'completed' },
    { date:'2025-05-17', name:'Freelance Payment',     bank:'HDFC Savings',  cat:'Income',       catColor:'#22d67a', icon:'💻', iconBg:'rgba(34,214,122,0.1)', amount:+22000, status:'completed' },
    { date:'2025-05-16', name:'Home Loan EMI',         bank:'SBI Savings',   cat:'EMI',          catColor:'#f5a623', icon:'🏠', iconBg:'rgba(245,166,35,0.1)', amount:-24500, status:'pending' },
    { date:'2025-05-14', name:'Swiggy Instamart',      bank:'GPay UPI',      cat:'Groceries',    catColor:'#00c8ff', icon:'🛍️', iconBg:'rgba(0,200,255,0.1)', amount: -1280, status:'completed' },
    { date:'2025-05-12', name:'Intl. Wire Transfer',   bank:'HDFC Savings',  cat:'Transfer',     catColor:'#f25c5c', icon:'🌍', iconBg:'rgba(242,92,92,0.1)', amount:-52000, status:'flagged' },
  ],
};

/* ══════════════════════════════════
   HELPERS
══════════════════════════════════ */
const fmt = n => '₹' + Math.abs(n).toLocaleString('en-IN');

function animateCount(el, target, prefix='₹', duration=1200) {
  const start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now()-start)/duration, 1);
    const ease = 1 - Math.pow(1-p, 3);
    el.innerHTML = prefix + Math.round(ease*target).toLocaleString('en-IN');
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ══════════════════════════════════
   RENDER FUNCTIONS
══════════════════════════════════ */
function renderHealthScore(d) {
  const pct = (d.healthScore / 850) * 100;
  setTimeout(() => {
    document.getElementById('hs-bar').style.width = pct + '%';
    document.getElementById('hs-num').innerHTML =
      `<span style="font-size:38px">${d.healthScore}</span><span style="font-size:18px;color:var(--text-secondary)">/850</span>`;
    document.getElementById('hs-status').innerHTML = '↑ Excellent standing';
    document.getElementById('hm-transactions').textContent = d.transactions;
    document.getElementById('hm-categories').textContent = d.categories.length ?? 6;
    document.getElementById('hm-recurring').textContent = d.recurring.length ?? 5;
  }, 400);
}

function renderCards(d) {
  setTimeout(() => {
    animateCount(document.getElementById('cv-income'), d.totalIncome);
    animateCount(document.getElementById('cv-expense'), d.totalExpense);
    animateCount(document.getElementById('cv-balance'), d.currentBalance);
    animateCount(document.getElementById('cv-savings'), d.savings);

    document.getElementById('tr-income').textContent = `↑ ${d.incomeChangePct}%`;
    document.getElementById('tr-expense').textContent = `↓ ${Math.abs(d.expenseChangePct)}%`;
    document.getElementById('tr-savings').textContent = `↑ ${d.savingsPct}%`;
    document.getElementById('cs-income').textContent = `This month's total inflow`;
    document.getElementById('cs-expense').textContent = `vs last month: ₹1,00,120`;
    document.getElementById('cs-balance').textContent = `across 3 accounts`;
    document.getElementById('cs-savings').textContent = `${d.savingsPct}% of income saved`;
  }, 300);
}

function renderBarChart(data) {
  const maxVal = Math.max(...data.flatMap(m => [m.income, m.expense]));
  const container = document.getElementById('bar-chart');
  container.innerHTML = '';
  data.forEach(m => {
    const ih = m.income  ? Math.max(8, (m.income  / maxVal) * 130) : 0;
    const eh = m.expense ? Math.max(8, (m.expense / maxVal) * 130) : 0;
    container.innerHTML += `
      <div class="bar-group">
        <div class="bar-pair">
          <div class="bar income-bar" style="height:0px" data-val="${fmt(m.income)}" data-target="${ih}"></div>
          <div class="bar expense-bar" style="height:0px" data-val="${fmt(m.expense)}" data-target="${eh}"></div>
        </div>
        <div class="bar-label">${m.month}</div>
      </div>`;
  });
  // animate
  setTimeout(() => {
    document.querySelectorAll('.bar').forEach(b => {
      b.style.height = b.dataset.target + 'px';
    });
  }, 500);
}

function renderDonut(cats, total) {
  const svg = document.getElementById('donut-svg');
  const cx=80, cy=80, r=65, sw=18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  let paths = '';

  cats.forEach(c => {
    const dash = (c.pct / 100) * circ;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${c.color}" stroke-width="${sw}"
      stroke-dasharray="${dash} ${circ - dash}"
      stroke-dashoffset="${-offset}"
      stroke-linecap="butt"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dasharray 1s ease"/>`;
    offset += dash;
  });

  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-card2)" stroke-width="${sw}"/>
    ${paths}`;

  document.getElementById('donut-total').textContent = fmt(total);

  const catsEl = document.getElementById('donut-cats');
  catsEl.innerHTML = cats.map(c => `
    <div class="donut-cat-item">
      <div class="donut-cat-left">
        <div class="donut-cat-dot" style="background:${c.color}"></div>
        <div class="donut-cat-name">${c.name}</div>
      </div>
      <div class="donut-cat-bar-track">
        <div class="donut-cat-bar-fill" style="background:${c.color};width:0%" data-w="${c.pct}%"></div>
      </div>
      <div class="donut-cat-val">${fmt(c.amount)}</div>
    </div>`).join('');

  setTimeout(() => {
    document.querySelectorAll('.donut-cat-bar-fill').forEach(el => {
      el.style.width = el.dataset.w;
    });
  }, 600);
}

function renderRecurring(list) {
  const el = document.getElementById('recurring-list');
  document.getElementById('rec-count').textContent = list.length + ' active';
  el.innerHTML = list.map(r => {
    const statusClass = { active:'status-active', due:'status-due', missed:'status-missed' }[r.status];
    return `
    <div class="recurring-item">
      <div class="rec-icon" style="background:${r.color}">${r.icon}</div>
      <div class="rec-info">
        <div class="rec-name">${r.name}</div>
        <div class="rec-date">${r.date}</div>
      </div>
      <div>
        <span class="rec-amt" style="color:var(--accent-red)">−${fmt(r.amount)}</span>
        <span class="rec-status ${statusClass}">${r.status}</span>
      </div>
    </div>`;
  }).join('');
}

function renderUnusual(list) {
  const el = document.getElementById('unusual-list');
  document.getElementById('unusual-count').textContent = list.length + ' alerts';
  el.innerHTML = list.map(u => `
    <div class="unusual-item">
      <div class="unusual-flag">${u.icon}</div>
      <div class="unusual-info">
        <div class="unusual-name">${u.name}</div>
        <div class="unusual-reason">⚠ ${u.reason}</div>
      </div>
      <div class="unusual-amt">−${fmt(u.amount)}</div>
    </div>`).join('');
}

function renderAI(insights) {
  const grid = document.getElementById('ai-grid');
  setTimeout(() => {
    grid.innerHTML = insights.map(i => `
      <div class="ai-insight fadein">
        <div class="ai-insight-icon">${i.icon}</div>
        <div class="ai-insight-title">${i.title}</div>
        <div class="ai-insight-text">${i.text}</div>
      </div>`).join('');
  }, 800);
}

function renderTransactions(list) {
  document.getElementById('tx-count').textContent = `Showing ${list.length} transactions`;
  const statusMap = {
    completed: `<span class="tx-status-dot"><span class="dot dot-green"></span>Completed</span>`,
    pending:   `<span class="tx-status-dot"><span class="dot dot-amber"></span>Pending</span>`,
    flagged:   `<span class="tx-status-dot"><span class="dot dot-red"></span>Flagged</span>`,
  };
  document.getElementById('tx-body').innerHTML = list.map(t => `
    <tr>
      <td class="tx-date">${t.date}</td>
      <td>
        <div class="tx-name-wrap">
          <div class="tx-cat-icon" style="background:${t.iconBg}">${t.icon}</div>
          <div>
            <div class="tx-name">${t.name}</div>
            <div class="tx-bank">${t.bank}</div>
          </div>
        </div>
      </td>
      <td><span class="tx-cat-badge" style="background:${t.catColor}18;color:${t.catColor};border-color:${t.catColor}30">${t.cat}</span></td>
      <td class="tx-amount ${t.amount > 0 ? 'credit' : 'debit'}">${t.amount > 0 ? '+' : '−'}${fmt(t.amount)}</td>
      <td>${statusMap[t.status]}</td>
    </tr>`).join('');
}

/* ══════════════════════════════════
   ZERO / EMPTY INITIAL STATE
══════════════════════════════════ */
function renderZeroState() {
  // Health score
  document.getElementById('hs-bar').style.width = '0%';
  document.getElementById('hs-num').innerHTML = `<span style="font-size:38px">—</span><span style="font-size:18px;color:var(--text-secondary)">/850</span>`;
  document.getElementById('hs-status').innerHTML = '<span style="color:var(--text-muted)">Upload a statement to calculate</span>';
  document.getElementById('hm-transactions').textContent = '0';
  document.getElementById('hm-categories').textContent = '0';
  document.getElementById('hm-recurring').textContent = '0';

  // Summary cards
  ['cv-income','cv-expense','cv-balance','cv-savings'].forEach(id => {
    document.getElementById(id).textContent = '₹0';
  });
  document.getElementById('tr-income').textContent = '— %';
  document.getElementById('tr-expense').textContent = '— %';
  document.getElementById('tr-balance').textContent = '— stable';
  document.getElementById('tr-savings').textContent = '— %';
  document.getElementById('cs-income').textContent = 'No data yet';
  document.getElementById('cs-expense').textContent = 'No data yet';
  document.getElementById('cs-balance').textContent = 'across 0 accounts';
  document.getElementById('cs-savings').textContent = '0% of income saved';

  // Bar chart — empty placeholder bars
  const container = document.getElementById('bar-chart');
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  container.innerHTML = months.map(m => `
    <div class="bar-group">
      <div class="bar-pair">
        <div class="bar income-bar" style="height:6px;opacity:0.2"></div>
        <div class="bar expense-bar" style="height:6px;opacity:0.2"></div>
      </div>
      <div class="bar-label">${m}</div>
    </div>`).join('');

  // Donut — empty ring
  const svg = document.getElementById('donut-svg');
  svg.innerHTML = `<circle cx="80" cy="80" r="65" fill="none" stroke="var(--bg-card2)" stroke-width="18"/>`;
  document.getElementById('donut-total').textContent = '₹0';
  document.getElementById('donut-cats').innerHTML = `
    <div class="empty-state" style="padding:12px 0">
      <div class="empty-icon" style="font-size:24px">🍩</div>
      <div class="empty-msg">No category data yet</div>
    </div>`;

  // Recurring
  document.getElementById('rec-count').textContent = '0 active';
  document.getElementById('recurring-list').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-msg">No recurring payments detected yet</div>
    </div>`;

  // Unusual
  document.getElementById('unusual-count').textContent = '0 alerts';
  document.getElementById('unusual-list').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-msg">No anomalies detected yet</div>
    </div>`;

  // AI grid — placeholder cards
  document.getElementById('ai-grid').innerHTML = `
    <div class="ai-insight" style="opacity:.5;text-align:center;padding:24px 14px">
      <div style="font-size:28px;margin-bottom:8px">📈</div>
      <div class="ai-insight-title">Spending Habits</div>
      <div class="ai-insight-text" style="color:var(--text-muted)">Awaiting data…</div>
    </div>
    <div class="ai-insight" style="opacity:.5;text-align:center;padding:24px 14px">
      <div style="font-size:28px;margin-bottom:8px">💰</div>
      <div class="ai-insight-title">Income Trend</div>
      <div class="ai-insight-text" style="color:var(--text-muted)">Awaiting data…</div>
    </div>
    <div class="ai-insight" style="opacity:.5;text-align:center;padding:24px 14px">
      <div style="font-size:28px;margin-bottom:8px">🎯</div>
      <div class="ai-insight-title">Budget Insights</div>
      <div class="ai-insight-text" style="color:var(--text-muted)">Awaiting data…</div>
    </div>
    <div class="ai-insight" style="opacity:.5;text-align:center;padding:24px 14px">
      <div style="font-size:28px;margin-bottom:8px">🌱</div>
      <div class="ai-insight-title">Savings Tips</div>
      <div class="ai-insight-text" style="color:var(--text-muted)">Awaiting data…</div>
    </div>`;

  // Transactions table — empty
  document.getElementById('tx-count').textContent = 'Showing 0 transactions';
  document.getElementById('tx-body').innerHTML = `
    <tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-msg">No transactions loaded. Upload a bank statement to get started.</div>
      </div>
    </td></tr>`;
}

/* ══════════════════════════════════
   AUTO-FETCH FROM DATABASE ON LOAD
   Replace setTimeout with your real:
   const res = await fetch('/api/dashboard');
   const d = await res.json();
══════════════════════════════════ */
function fetchDashboardData() {
  // Show skeleton loaders on cards while DB responds
  ['cv-income','cv-expense','cv-balance','cv-savings'].forEach(id => {
    document.getElementById(id).innerHTML =
      '<span class="skeleton" style="display:inline-block;width:80px;height:22px;border-radius:4px"></span>';
  });
  document.getElementById('ai-grid').innerHTML = `
    <div class="ai-insight skeleton" style="height:80px"></div>
    <div class="ai-insight skeleton" style="height:80px"></div>
    <div class="ai-insight skeleton" style="height:80px"></div>
    <div class="ai-insight skeleton" style="height:80px"></div>`;

  // ── Replace this block with your real API call ──
  setTimeout(() => {
    const d = mockData;
    renderHealthScore(d);
    renderCards(d);
    renderBarChart(d.monthlyData);
    renderDonut(d.categories, d.totalExpense);
    renderRecurring(d.recurring);
    renderUnusual(d.unusual);
    renderAI(d.aiInsights);
    renderTransactions(d.transactions);
  }, 1800);
}

function triggerRefresh(btn) {
  btn.style.transform = 'rotate(360deg)';
  btn.style.transition = 'transform 0.6s ease';
  setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 650);
  fetchDashboardData();
}

function setPeriod(btn, label) {
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

document.getElementById('dash-date').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });


renderZeroState();

fetchDashboardData();
</script>
</body>
</html>