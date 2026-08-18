import { useEffect, useRef, useState } from "react";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62.5..125,100..900&family=Space+Mono:wght@400;700&display=swap";

const CSS = `
/* build: r66.2 */
/* ───────────────────────────────────────────────────────────
   RECONCILED TOKENS, old account terracotta == new grainy terra.
   One token set, two cream densities.
   ─────────────────────────────────────────────────────────── */
.furnishes-account{
  --ink:#6b2c12;
  --terra:oklch(0.605 0.176 41);   /* midpoint of #C2542A and zip oklch(0.63 0.2 42) */
  --accent:oklch(0.655 0.196 43);
  --cream-ui:#FFF2E5;       /* account-theme peach (muted), one surface */
  --cream-hero:#FFEDDF;--topbar:#FFEFE1;--canvas:#FFF2E5;     /* account-theme peach (muted), one surface */
  --on-orange:#FBF0DC;
  /* page grain removed, solid peach surface only */
  --grain:none;
  --hair:rgba(107,44,18,.075);
  --line-w:color-mix(in srgb,var(--terra) 34%,rgba(107,44,18,.08));
  --fill-w:color-mix(in srgb,var(--terra) 6%,transparent);
  --ink-w:color-mix(in srgb,var(--terra) 22%,var(--ink));
  --hair-soft:rgba(107,44,18,.075);
  /* the sunset band, used in exactly ONE place (the floating bar backing) */
  --band:linear-gradient(180deg,#E83200 0%,#F24A00 18%,#FA6400 38%,#FF8410 64%,#FF9C18 100%);
  /* faint vertical guides, one line per module (rail-width column grid) */
  --rail:244px;     /* widened so the brand fits on one line at full size */
  /* 2 separators between the three tabs (50/75vw); the leading 25vw line removed */
  --col-lines:linear-gradient(to right,
    transparent calc(50vw - var(--rail) - 0.5px),
    var(--hair-soft) calc(50vw - var(--rail) - 0.5px) calc(50vw - var(--rail) + 0.5px),
    transparent calc(50vw - var(--rail) + 0.5px) calc(75vw - var(--rail) - 0.5px),
    var(--hair-soft) calc(75vw - var(--rail) - 0.5px) calc(75vw - var(--rail) + 0.5px),
    transparent calc(75vw - var(--rail) + 0.5px));
  --nav-h:46px;
  --navband:55.2px;   /* navbar header band: tabs sit centered, vertical + horizontal rules meet here */
  --pad:clamp(18px,2.4vw,34px);
}
.furnishes-account,.furnishes-account *{box-sizing:border-box}
.furnishes-account{min-height:100vh}
.furnishes-account{
  background:var(--canvas);color:var(--ink);
  font-family:"Space Mono",ui-monospace,monospace;
  -webkit-font-smoothing:antialiased;
}
.cap{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.18em}
.disp{font-family:"Archivo",system-ui,sans-serif;font-weight:800;font-stretch:78%;letter-spacing:-.005em;line-height:.96}

/* App shell: left rail + right stage */
.app{position:relative;display:grid;grid-template-columns:var(--rail) 1fr;height:100vh;overflow:hidden}
.headrule{display:none}

/* ───────────────────────── LEFT RAIL ───────────────────────── */
.rail{
  background-color:var(--cream-hero);background-image:var(--grain);
  font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;
  display:flex;flex-direction:column;
  padding:0 16px 14px;overflow:hidden;
  border-right:1px solid var(--hair);
}
.railhead{padding-top:24px;display:flex;align-items:center;flex:0 0 auto}
.brand{font-family:"Archivo",system-ui,sans-serif;font-weight:550;font-stretch:78%;font-size:18.4px;letter-spacing:.015em;text-transform:uppercase;color:var(--ink);line-height:1;white-space:nowrap}
.brand b{color:var(--terra)}
.group{margin-top:16px}
.railhead + .group{margin-top:10px}
.railsearch{display:flex;align-items:center;gap:8px;margin:4px 0 2px;padding:7px 2px 8px;
  border-bottom:1px solid var(--hair);cursor:text;
  color:color-mix(in srgb,var(--ink) 46%,transparent);transition:border-color .15s,color .15s}
.railsearch:hover{border-color:color-mix(in srgb,var(--ink) 26%,transparent);color:color-mix(in srgb,var(--ink) 62%,transparent)}
.railsearch__ico{width:13px;height:13px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round}
.railsearch__ph{flex:1;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-weight:400;font-size:14.375px;letter-spacing:.01em}
.railsearch__kbd{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.04em;
  color:color-mix(in srgb,var(--ink) 40%,transparent);border:1px solid var(--hair);border-radius:3px;padding:1px 4px;line-height:1.4}
.railtag{margin:0 0 2px}
.group__h{font-size:11.5px;font-weight:700;letter-spacing:.08em;color:var(--terra);opacity:1;margin:0 0 6px;text-transform:uppercase}
.nav{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2.5px}
.nav a{
  display:flex;align-items:center;gap:7px;text-decoration:none;color:var(--ink);
  font-size:16.675px;font-weight:400;letter-spacing:.01em;padding:5px 8px;border-radius:3px;line-height:1;
}
.nav a span{position:relative;display:inline-block}
.nav a span::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:1.5px;
  background:var(--terra);transform:scaleX(0);transform-origin:left;
  transition:transform .3s cubic-bezier(.4,0,.2,1)}
.nav a.is-active span::after{transform:scaleX(1)}
.nav a:hover span::after{transform:scaleX(1)}
.nav:hover a.is-active span::after{transform:scaleX(0)}
.nav:hover a.is-active:hover span::after{transform:scaleX(1)}
.nav .ico{width:15px;height:15px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
.nav a.is-active .ico{opacity:1}
/* chat-mode nav: icon rows matched to the Workspace tabs (size + underline switch animation) */
.cnav{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2.5px}
.cnav a{display:flex;align-items:center;gap:7px;text-decoration:none;color:var(--ink);font-size:16.675px;font-weight:400;letter-spacing:.01em;padding:5px 8px;border-radius:3px;line-height:1;cursor:pointer}
.cnav a span{position:relative;display:inline-block}
.cnav a span::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:1.5px;background:var(--terra);transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.4,0,.2,1)}
.cnav a.is-active span::after,.cnav a:hover span::after{transform:scaleX(1)}
.cnav:hover a.is-active span::after{transform:scaleX(0)}
.cnav:hover a.is-active:hover span::after{transform:scaleX(1)}
.cnav .ico{width:15px;height:15px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
.cnav a.is-active .ico{opacity:1}

.cnav--recent a{color:color-mix(in srgb,var(--ink) 64%,transparent);transition:color .15s,background .15s}
.cnav--recent a:hover{color:var(--ink);background:color-mix(in srgb,var(--terra) 5%,transparent)}
.cnav--recent a.is-active{color:var(--ink);background:color-mix(in srgb,var(--terra) 10%,transparent)}
.cnav--recent a span::after{display:none}
.cnav--recent a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.nav .soon{margin-left:auto;font-size:8.625px;letter-spacing:.18em;border:1px solid var(--hair);
  color:var(--terra);padding:2px 4px;border-radius:3px;text-transform:uppercase}

/* rail footer, bold compressed tagline + credit (San Rita bottom-left language) */
.railfoot{margin-top:auto;padding-top:20px}
.railscroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}
.railscroll::-webkit-scrollbar{width:0;height:0;display:none}
.hr-short{display:block;width:38px;height:1.5px;background:var(--terra);margin-bottom:14px}
.railfoot__title{margin:0;font-size:clamp(18.4px,1.6vw,23.4px);line-height:.98;text-transform:uppercase;color:var(--ink)}
.railfoot__cr{margin-top:12px;font-size:10.925px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink);opacity:.5}
.account{display:flex;align-items:center;gap:8px;margin-top:16px}
.account__av{width:30px;height:30px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;
  background:color-mix(in srgb,var(--terra) 16%,var(--cream-ui));color:var(--terra);
  border:1px solid color-mix(in srgb,var(--terra) 32%,transparent);
  font-family:"Archivo",system-ui,sans-serif;font-weight:700;font-stretch:78%;font-size:12.075px;letter-spacing:.02em;text-transform:uppercase}
.account__name{font-size:17.25px;font-weight:400;font-stretch:78%;letter-spacing:.01em;color:var(--ink)}

/* legend, the "map legend" (rooms / materials / flow) */
.legend{margin-top:auto;padding-top:18px;border-top:1px solid var(--hair)}
.legend__h{font-size:10.925px;letter-spacing:.24em;color:var(--terra);text-transform:uppercase;margin:0 0 10px}
.legend ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.legend li{display:flex;align-items:center;gap:9px;font-size:12.65px;letter-spacing:.02em;opacity:.85}
.sw{width:16px;height:10px;border-radius:3px;flex:0 0 auto;border:1px solid var(--hair)}
.line{width:18px;border-top:1.5px solid var(--ink);flex:0 0 auto}
.line.dash{border-top:1.5px dashed var(--terra)}
.lang{margin-top:14px;font-size:12.65px;letter-spacing:.16em}
.lang b{color:var(--ink)} .lang span{color:var(--terra);opacity:.55}

/* ───────────────────────── RIGHT STAGE ───────────────────────── */
.stage{position:relative;background-color:var(--canvas);background-image:var(--grain);overflow:hidden;--inspw:clamp(320px,32%,430px)}
.wf-vmain{display:block;width:100%;min-width:0}
.wireview.wf-split{display:flex;align-items:flex-start}
.wireview.wf-split .wf-vmain{flex:1 1 auto}
/* warm grain on the hero surface only (subtle) */
.grain{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.06;mix-blend-mode:multiply;z-index:1}
/* faint vertical column guides behind everything */
.stage::before{content:"";position:absolute;top:0;left:0;right:0;height:0;background:var(--col-lines);z-index:0;pointer-events:none}

/* ── cartographic FRAME: corner ticks + edge metadata + scale bar ── */
.frame{position:absolute;inset:14px;z-index:2;pointer-events:none}
.tick{position:absolute;width:18px;height:18px;border-color:var(--ink);opacity:.7}
.tick.tl{top:0;left:0;border-top:1.5px solid;border-left:1.5px solid}
.tick.tr{top:0;right:0;border-top:1.5px solid;border-right:1.5px solid}
.tick.bl{bottom:0;left:0;border-bottom:1.5px solid;border-left:1.5px solid}
.tick.br{bottom:0;right:0;border-bottom:1.5px solid;border-right:1.5px solid}
.edge{position:absolute;font-size:11.5px;letter-spacing:.2em;color:var(--ink);opacity:.55;text-transform:uppercase}
.edge.top{top:-2px;left:50%;transform:translateX(-50%)}
.edge.left{left:-2px;top:50%;transform:translateY(-50%) rotate(180deg);writing-mode:vertical-rl}
.edge.right{right:-2px;top:50%;transform:translateY(-50%);writing-mode:vertical-rl}
.scalebar{position:absolute;left:0;bottom:-2px;display:flex;align-items:center;gap:10px;font-size:11.5px;letter-spacing:.16em;color:var(--ink);opacity:.6;text-transform:uppercase}
.scalebar .bar{width:120px;height:6px;border:1px solid var(--ink);
  background:repeating-linear-gradient(to right,var(--ink) 0 1px,transparent 1px 20px)}
.edge.botright{right:-2px;bottom:-2px;font-size:11.5px;letter-spacing:.16em;color:var(--ink);opacity:.6}

/* ── FLOATING TOP BAR, tabs centered on the module column grid ── */
.topbar{
  position:absolute;top:0;left:0;right:0;height:var(--navband);z-index:5;
  color:var(--ink);background:var(--topbar);
}
.tab{position:absolute;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:5px;text-decoration:none;
  color:var(--ink);opacity:.5;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:72%;
  font-size:14.95px;letter-spacing:.01em;text-transform:uppercase;white-space:nowrap;transition:opacity .2s,transform .2s}
.topbar .tab:nth-child(1){left:calc(37.5vw - var(--rail))}
.topbar .tab:nth-child(2){left:calc(62.5vw - var(--rail))}
.topbar .tab:nth-child(3){left:calc(87.5vw - var(--rail))}
.tab:hover{opacity:.8;transform:translate(-50%,-50%) translateY(-1px)}
.tab .ix{align-self:flex-start;margin-top:-1px;font-size:.6em;font-weight:600;letter-spacing:0;color:var(--terra)}
.tab.is-active{opacity:1}
.topbar::before,.topbar::after{content:"";position:absolute;top:0;bottom:0;width:1px;background:var(--hair);pointer-events:none}
.topbar::before{left:calc(50vw - var(--rail))}
.topbar::after{left:calc(75vw - var(--rail))}
[data-view]{cursor:pointer}
/* mode options relocated into the rail, styled to match the nav links below */
.modeswitch{margin:0;display:flex;flex-direction:column;gap:1.5px}
.modeswitch .tab{position:static;transform:none;display:flex;width:100%;box-sizing:border-box;align-items:center;justify-content:space-between;gap:7px;padding:3.5px 6.5px;border-radius:3px;font-weight:400;font-stretch:78%;font-size:16.675px;text-transform:none;line-height:1;opacity:1;color:var(--ink)}
.modeswitch .tab:hover{opacity:1;transform:none}
.modeswitch .tab>span:not(.ix){position:relative;display:inline-block}
.modeswitch .tab>span:not(.ix)::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:1.5px;background:var(--terra);transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.4,0,.2,1)}
.modeswitch .tab.is-active>span:not(.ix)::after,.modeswitch .tab:hover>span:not(.ix)::after{transform:scaleX(1)}
.modeswitch .tab .ix{align-self:center;margin-top:0}

/* ── DASHBOARD = SaaS workbench / launchpad overview ── */
.canvas,.wireview{scrollbar-width:none;-ms-overflow-style:none}
.canvas::-webkit-scrollbar,.wireview::-webkit-scrollbar{width:0;height:0;display:none}
.canvas{position:absolute;top:0;left:0;right:0;bottom:0;z-index:3;
  padding:14px 0 44px;overflow-y:auto;overflow-x:hidden;
  display:flex;flex-direction:column;
  --gut:clamp(22px,2.6vw,36px);
  font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;color:var(--ink)}
.dash{display:flex;flex-direction:column;width:100%}

.dash-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;
  gap:4px 24px;padding:16px var(--gut) 22px}
.dash-hi{font-weight:600;font-stretch:78%;font-size:clamp(26.45px,2.875vw,34.5px);line-height:1.02;letter-spacing:-.02em;color:var(--ink)}
.dash-hi em{font-style:normal;color:var(--terra)}
.dash-status{font-weight:400;font-stretch:78%;font-size:14.95px;line-height:1.5;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.dash-status b{font-weight:600;color:var(--ink)}

.band-label{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.2em;text-transform:uppercase;
  color:color-mix(in srgb,var(--ink) 40%,transparent);margin:0 0 10px}

/* one connected, edge-to-edge ledger */
.ledger{border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.row{display:grid;gap:1px;background:var(--hair)}
.row + .row{border-top:1px solid var(--hair)}
.row--feature{grid-template-columns:1.5fr 1fr}
.row--work{grid-template-columns:repeat(4,1fr)}
.row--util{grid-template-columns:repeat(2,1fr)}
@media(max-width:900px){
  .row--feature{grid-template-columns:1fr}
  .row--work{grid-template-columns:repeat(2,1fr)}
  .row--util{grid-template-columns:1fr}
}
@media(max-width:560px){.row--work{grid-template-columns:1fr}}

.door{position:relative;display:flex;flex-direction:column;text-decoration:none;color:var(--ink);
  background:var(--cream-ui);padding:17px var(--gut);transition:background .16s ease}
.door:hover{background:color-mix(in srgb,var(--terra) 6%,var(--cream-ui))}
.door__arr{position:absolute;top:15px;right:var(--gut);font-size:14.95px;line-height:1;color:var(--terra);opacity:0;transition:opacity .16s}
.door:hover .door__arr{opacity:.85}

.door--feat{padding:20px var(--gut);min-height:158px}
.feat-title{font-weight:600;font-stretch:78%;font-size:21.85px;letter-spacing:-.01em;line-height:1.1;color:var(--ink)}
.feat-sub{margin-top:7px;font-weight:400;font-size:14.375px;line-height:1.5;color:color-mix(in srgb,var(--ink) 56%,transparent);max-width:42ch}
.palette{display:flex;gap:0;margin-top:14px}
.palette i{display:block;height:8px;width:34px}
.door__go{margin-top:auto;padding-top:16px;font-weight:600;font-stretch:78%;font-size:12.65px;letter-spacing:.06em;text-transform:uppercase;color:var(--terra)}

.door__top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.door__name{font-weight:600;font-stretch:78%;font-size:17.25px;color:var(--ink)}
.door__count{font-weight:500;font-stretch:78%;font-size:21.85px;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums}
.door__meta{margin-top:8px;font-family:"Space Mono",monospace;font-size:10.925px;letter-spacing:.08em;text-transform:uppercase;color:var(--terra)}
.door__prev{margin-top:11px;font-weight:400;font-size:14.375px;line-height:1.45;color:color-mix(in srgb,var(--ink) 56%,transparent);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.door--util .door__name{font-size:16.675px}
.door__val{margin-top:9px;font-weight:500;font-stretch:78%;font-size:15.525px;color:var(--ink);font-variant-numeric:tabular-nums}
.door__track{margin-top:10px;height:3px;background:color-mix(in srgb,var(--ink) 8%,transparent);overflow:hidden}
.door__track i{display:block;height:100%;background:var(--terra)}

.dash-act{padding:22px var(--gut) 0}
.act{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.act li{display:flex;align-items:baseline;gap:12px;padding:9px 0;font-weight:400;font-stretch:78%;font-size:14.95px;color:color-mix(in srgb,var(--ink) 62%,transparent)}
.act li::before{content:"";flex:0 0 auto;width:5px;height:5px;border-radius:50%;background:var(--terra);opacity:.6;transform:translateY(-1px)}
.act__d{margin-left:auto;font-family:"Space Mono",monospace;font-size:10.925px;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent);white-space:nowrap}

/* ══════ LIGHTWEIGHT WIREFRAME VIEWS (all non-dashboard screens) ══════ */
.wireview{position:absolute;top:0;left:0;right:0;bottom:0;z-index:3;
  --wpad:clamp(20px,3vw,40px);padding:12px var(--wpad) 44px;
  overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column}
.wf-head{flex:0 0 auto;margin-bottom:34px}
.wf-eye{margin:0;font-family:"Space Mono","Archivo",monospace;font-size:11.5px;font-weight:400;letter-spacing:.22em;text-transform:uppercase;color:var(--terra)}
.wf-title{margin:13px 0 0;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;
  font-size:clamp(28.75px,2.875vw,39.1px);line-height:1.02;letter-spacing:-.018em;color:var(--ink)}
.wf-sub{margin:15px 0 0;max-width:52ch;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;
  font-size:16.1px;line-height:1.55;color:color-mix(in srgb,var(--ink) 62%,transparent)}
/* skeleton primitives */
.wf-bar{display:inline-block;height:9px;border-radius:2px;background:color-mix(in srgb,var(--ink) 8%,transparent)}
.wf-chip{display:inline-flex;align-items:center;height:26px;padding:0 12px;border:1px solid var(--hair);
  font-family:"Space Mono","Archivo",monospace;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-btn{display:inline-flex;align-items:center;height:30px;padding:0 14px;border:1px solid var(--terra);color:var(--terra);
  font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:12.65px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.wf-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:22px}
.wf-tools .sp{margin-left:auto}
/* list */
.wf-list{display:flex;flex-direction:column}
.wf-row{display:flex;align-items:center;gap:18px;padding:13px 6px;border-radius:3px;cursor:pointer;transition:background .15s}
.wf-row:hover{background:color-mix(in srgb,var(--terra) 6%,transparent)}
.wf-row__main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.wf-row__meta{flex:0 0 auto;display:flex;gap:12px;align-items:center}
/* grid, box-free: whitespace gaps + a thin top rule per card (editorial index) */
.wf-grid{display:grid;gap:30px 26px}
.wf-grid.c2{grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))}
.wf-grid.c3{grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr))}
.wf-cell{background:transparent;padding:0;display:flex;flex-direction:column;gap:11px;cursor:pointer;min-height:0}
.wf-cell:hover .wf-cell__t{color:var(--terra)}
.wf-cell:hover .wf-thumb{border-color:color-mix(in srgb,var(--terra) 45%,transparent)}
.wf-thumb{width:100%;height:150px;border:1px solid var(--hair);transition:border-color .15s;
  background:color-mix(in srgb,var(--ink) 5%,transparent)}
/* form */
.wf-form{display:flex;flex-direction:column;max-width:720px}
.wf-field{display:flex;align-items:baseline;justify-content:space-between;gap:32px;padding:15px 0}
.wf-input{height:34px;border:1px solid var(--hair)}
.wf-toggle{display:flex;align-items:center;justify-content:space-between;padding:15px 0}
.wf-switch{width:36px;height:18px;border:1px solid var(--terra);border-radius:9px;position:relative;flex:0 0 auto}
.wf-switch::after{content:"";position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:var(--terra)}
/* palette */
.wf-pal{display:flex;gap:6px}.wf-pal span{height:34px;flex:1;border:1px solid var(--hair)}
/* chat */
/* chat interface removed, clean slate (rebuild plan pending) */
.wf-msg{max-width:62%;display:flex;flex-direction:column;gap:7px;padding:13px 15px;border:1px solid var(--hair)}
.wf-msg.me{align-self:flex-end;border-color:color-mix(in srgb,var(--terra) 35%,transparent);background:color-mix(in srgb,var(--terra) 5%,transparent)}
.wf-msgs{display:flex;flex-direction:column;gap:18px;padding-bottom:6px}
/* ═══ chat (rebuild r1: static skeleton) ═══ */
.wireview--chat{padding:0;overflow:hidden}  /* chat fills the stage edge-to-edge; v5 cleanup casualty, restored */
/* §1.3 layout */
.wf-cx{flex:1;min-height:0;display:flex}
.wf-cx__main{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
.wf-cx__body{flex:1;min-height:0;overflow-y:auto;padding:20px var(--wpad);display:flex;flex-direction:column;scrollbar-width:none;-ms-overflow-style:none}
.wf-cx__body::-webkit-scrollbar{display:none}
.wf-cx__aside{flex:0 0 320px;border-left:1px solid var(--hair);display:flex;flex-direction:column;overflow:hidden;padding:0}
.wf-cx__aside-head{flex:0 0 auto;display:flex;flex-direction:column;gap:14px;padding:0 18px 16px}
.wf-cx__aside-scroll{flex:1;min-height:0;overflow-y:auto;padding:2px 18px 40px;display:flex;flex-direction:column;gap:0;scrollbar-width:none;-ms-overflow-style:none}
.wf-cx__aside-scroll::-webkit-scrollbar{display:none}
.wf-msgs,.wf-empty{max-width:840px;width:100%;margin-inline:auto}
/* r13: center-top breadcrumb + fog */
.wf-crumb{flex:0 0 auto;position:relative;z-index:4;display:flex;align-items:center;gap:9px;height:60px;box-sizing:border-box;padding:0 20px;background:var(--canvas)}
.wf-crumb::after{content:"";position:absolute;left:0;right:0;top:100%;height:14px;background:linear-gradient(to bottom,var(--canvas),transparent);pointer-events:none}
#fa-rail-chat .cnav .ico{display:none}
.wf-crumb__b{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:17.25px;color:color-mix(in srgb,var(--ink-w) 60%,transparent);cursor:pointer;transition:color .15s}
.wf-crumb__b:hover{color:var(--terra)}
.wf-crumb__t.nochev svg{display:none}
.wf-crumb__t.nochev{pointer-events:none}
.wf-crumb__sl{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:16.1px;color:color-mix(in srgb,var(--ink-w) 32%,transparent)}
.wf-crumb__t{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;padding:3px 6px;margin:-3px 0;border-radius:7px;cursor:pointer;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:17.25px;color:var(--ink);max-width:46ch;transition:background .15s}
.wf-crumb__t:hover{background:color-mix(in srgb,var(--terra) 7%,transparent)}
.wf-crumb__t span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wf-crumb__t svg{width:15px;height:15px;color:color-mix(in srgb,var(--ink-w) 50%,transparent);flex-shrink:0;transition:transform .18s}
.wf-crumb__t[aria-expanded="true"] svg{transform:rotate(180deg)}
.wf-crumbdd{position:absolute;top:calc(100% - 2px);left:calc(var(--wpad) + 74px);z-index:9;min-width:15rem;max-width:22rem;background:var(--canvas);border:1px solid var(--line-w);border-radius:10px;padding:5px;box-shadow:0 14px 40px -16px rgba(107,44,18,.35)}
.wf-crumbdd:not([hidden]){animation:wfpop .14s ease}
.wf-crumbdd__i{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:transparent;border-radius:7px;padding:7px 10px;cursor:pointer;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;color:var(--ink);transition:background .13s}
.wf-crumbdd__i:hover{background:var(--fill-w)}
.wf-crumbdd__i span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wf-crumbdd__i svg{width:13px;height:13px;color:var(--terra);flex-shrink:0}
.wf-crumbdd__i.new{color:var(--terra);font-weight:500}
.wf-crumbdd__hr{height:1px;background:var(--hair);margin:5px 6px}
/* §1.4 empty state */
.wf-empty{margin:auto 0;display:flex;flex-direction:column;align-items:center;padding:20px 0}
.wf-empty__av{width:64px;height:64px;border-radius:50%;background:var(--terra);color:var(--on-orange);display:flex;align-items:center;justify-content:center;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:24px;margin-bottom:16px}
.wf-empty__h{margin:0 0 10px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:25.3px;letter-spacing:-.012em;color:var(--ink);text-align:center}
.wf-empty__p{margin:0 auto 24px;max-width:660px;text-align:center;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:16.1px;line-height:1.55;color:color-mix(in srgb,var(--ink-w) 58%,transparent)}
.wf-rooms{width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:0 52px}
.wf-room{display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;border:0;border-bottom:1px solid var(--hair);background:transparent;border-radius:0;padding:15px 2px 17px;cursor:pointer;transition:border-color .18s}
.wf-room:hover{border-bottom-color:color-mix(in srgb,var(--terra) 45%,transparent)}
.wf-room:hover .wf-room__t{color:var(--terra)}
.wf-room__ix{font-family:"Space Mono",monospace;font-size:10.35px;font-weight:600;letter-spacing:.05em;color:var(--terra)}
.wf-room:hover{border-color:color-mix(in srgb,var(--terra) 45%,transparent);background:color-mix(in srgb,var(--terra) 5%,transparent)}

.wf-room__t{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:17.25px;color:var(--ink);transition:color .15s}
.wf-room__d{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px;line-height:1.55;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-empty__hint{margin:16px 0 0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 52%,transparent)}
/* §1.5 messages (inert this phase; live from r2) */
.wf-msgs{display:flex;flex-direction:column;gap:18px;padding-bottom:6px}
.wf-cmsg{display:flex;gap:11px;width:100%;min-width:0}
.wf-cmsg--me{flex-direction:row-reverse}
.wf-cav{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:12.5px;user-select:none}
.wf-cav--eva{background:var(--terra);color:var(--on-orange)}
.wf-cav--me{background:color-mix(in srgb,var(--ink) 62%,var(--terra));color:var(--canvas)}
.wf-cbody{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;align-items:flex-start}
.wf-cmsg--me .wf-cbody{align-items:flex-end}
.wf-bub{border:1px solid var(--line-w);background:var(--fill-w);border-radius:11px;padding:9px 14px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:15.525px;line-height:1.5;max-width:min(90%,52rem);overflow-wrap:anywhere;white-space:pre-wrap;color:color-mix(in srgb,var(--ink-w) 88%,transparent)}
.wf-cmsg--me .wf-bub{width:fit-content;max-width:100%;background:color-mix(in srgb,var(--terra) 10%,transparent)}
.wf-hl{background:color-mix(in srgb,var(--terra) 20%,transparent);color:var(--ink);padding:0 3px;border-radius:3px}
.wf-bub mark.wf-hl[data-ent]{cursor:pointer;border-bottom:1px dashed color-mix(in srgb,var(--terra) 50%,transparent);transition:background .15s}
.wf-bub mark.wf-hl[data-ent]:hover{background:color-mix(in srgb,var(--terra) 30%,transparent)}
/* r14: entity popover */
.wf-entpop{position:absolute;z-index:10;min-width:200px;max-width:260px;background:var(--canvas);border:1px solid var(--line-w);border-radius:10px;padding:8px;box-shadow:0 14px 40px -16px rgba(107,44,18,.35)}
.wf-entpop:not([hidden]){animation:wfpop .14s ease}
.wf-entpop__h{display:flex;align-items:center;gap:7px;padding:2px 4px 7px;border-bottom:1px solid var(--hair);margin-bottom:5px}
.wf-entpop__h svg{width:13px;height:13px;color:var(--terra);flex-shrink:0}
.wf-entpop__w{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:13.8px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wf-entpop__k{margin-left:auto;font-family:"Space Mono",monospace;font-size:9.2px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--ink-w) 45%,transparent);flex-shrink:0}
.wf-entpop__a{display:flex;width:100%;text-align:left;border:0;background:transparent;border-radius:7px;padding:6px 8px;cursor:pointer;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:var(--ink);transition:background .13s,color .13s}
.wf-entpop__a:hover{background:var(--fill-w);color:var(--terra)}
/* r14: selection toolbar (dark, toast-language) */
.wf-seltool[hidden]{display:none}
.wf-seltool{position:absolute;z-index:10;display:flex;align-items:center;gap:2px;background:var(--ink);border-radius:9px;padding:4px;box-shadow:0 10px 28px -12px rgba(107,44,18,.5)}
.wf-seltool:not([hidden]){animation:wfpop .13s ease}
.wf-seltool button{border:0;background:transparent;color:var(--on-orange);border-radius:7px;padding:5px 9px;cursor:pointer;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:12.65px;white-space:nowrap;transition:background .12s}
.wf-seltool button:hover{background:rgba(255,246,238,.14)}
.wf-seltool button.terra2{color:color-mix(in srgb,var(--terra) 78%,#fff)}
.wf-bub--err{border-color:rgba(178,58,46,.36)!important;background:rgba(178,58,46,.07)!important;color:#8C2E23!important}
.wf-daysep{display:flex;align-items:center;gap:12px;margin:4px 0 2px}
.wf-daysep::before,.wf-daysep::after{content:"";flex:1;height:1px;background:var(--hair)}
.wf-daysep span{font-family:"Space Mono",monospace;font-size:9.775px;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb,var(--ink-w) 42%,transparent)}
.wf-mtime{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:10.925px;color:color-mix(in srgb,var(--ink-w) 48%,transparent);opacity:0;transition:opacity .18s}
.wf-cmsg:hover .wf-mtime{opacity:1}
.wf-tdots{display:inline-flex;gap:4px;align-items:center;height:1em}
.wf-tdots span{width:6px;height:6px;border-radius:50%;background:color-mix(in srgb,var(--ink-w) 40%,transparent);animation:wfb 1s infinite}
.wf-tdots span:nth-child(2){animation-delay:.15s}.wf-tdots span:nth-child(3){animation-delay:.3s}
@keyframes wfb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
.wf-tlabel{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-style:italic;font-size:13.8px;color:color-mix(in srgb,var(--ink-w) 50%,transparent);margin-left:7px}
.wf-cmsg--in{animation:wfmsg .15s cubic-bezier(.4,0,.2,1) both}
@keyframes wfmsg{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.wf-cmsg--in{animation:wffade .15s ease both}@keyframes wffade{from{opacity:0}to{opacity:1}}.wf-tdots span{animation:none}}
.wf-fbrow{display:flex;gap:3px;margin-top:2px;align-items:center;flex-wrap:wrap}
.wf-fbrow .wf-mact.wf-mact--txt{width:auto;padding:0 8px;white-space:nowrap;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:11.5px;color:color-mix(in srgb,var(--ink-w) 52%,transparent)}
.wf-fbrow .wf-mact.wf-mact--txt:hover{color:var(--terra)}
.wf-fbrow__sep{width:1px;height:13px;background:var(--hair);margin:0 3px;flex-shrink:0}
.wf-mact.on,.wf-fb.on{color:var(--terra)}
.wf-refine{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.wf-refine .wf-chip2{font-size:12.65px;padding:4px 10px}
.wf-cmsg.rowhl .wf-bub{animation:wfrowhl 1.2s ease}
@keyframes wfrowhl{0%{background:color-mix(in srgb,var(--terra) 14%,transparent)}100%{}}
.wf-fb,.wf-mact{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:7px;color:color-mix(in srgb,var(--ink-w) 42%,transparent);cursor:pointer;transition:color .15s,background .15s}
.wf-fb svg{width:14px;height:14px}.wf-mact svg{width:13px;height:13px}
.wf-fb--dn svg{transform:rotate(180deg)}
.wf-fb:hover,.wf-mact:hover{color:var(--terra);background:color-mix(in srgb,var(--terra) 9%,transparent)}
.wf-fbrow.lock .wf-fb{pointer-events:none;opacity:.4}
.wf-fbrow.lock .wf-fb.sel{color:var(--terra);opacity:1}
.wf-fbrow.lock .wf-mact{pointer-events:auto;opacity:1}
.wf-stopnote{margin:2px 0 0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;line-height:1.4;color:color-mix(in srgb,var(--ink-w) 52%,transparent)}
.wf-stopnote b{font-weight:600;color:color-mix(in srgb,var(--ink-w) 78%,transparent)}
/* §1.6 extraction chain */
.wf-ex{display:flex;flex-direction:column;align-items:flex-end;gap:5px;max-width:min(100%,22rem)}
.wf-extag{border:1px solid var(--line-w);background:var(--fill-w);border-radius:3px;padding:2.5px 8px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:11.5px;color:color-mix(in srgb,var(--ink-w) 70%,transparent)}
.wf-exq{margin:0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:11.5px;line-height:1.4;text-align:right;color:color-mix(in srgb,var(--ink-w) 56%,transparent)}
.wf-exact{display:flex;gap:7px}
.wf-exbtn{border:1px solid var(--line-w);border-radius:3px;padding:4px 10px;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:12.65px;color:var(--ink);cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s,background .15s}
.wf-exbtn:hover{color:var(--terra);border-color:color-mix(in srgb,var(--terra) 45%,transparent);background:color-mix(in srgb,var(--terra) 6%,transparent)}
.wf-exbtn--ghost{border-color:transparent;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-exnote{margin:0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:10.925px;text-align:right;color:color-mix(in srgb,var(--ink-w) 40%,transparent)}
.wf-exin{box-sizing:border-box;width:100%;max-width:15rem;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;color:var(--ink);background:var(--canvas);border:1px solid var(--line-w);border-radius:3px;padding:6px 9px;outline:none}
.wf-exin:focus{border-color:color-mix(in srgb,var(--terra) 55%,transparent)}
/* §1.7 foot */
.wf-chat__foot{flex:0 0 auto;border-top:1px solid var(--hair);padding:12px var(--wpad) 14px;display:flex;flex-direction:column;gap:9px}
.wf-sugg__h{display:flex;align-items:center;gap:6px;margin-top:2px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-sugg__h svg{width:13px;height:13px;color:var(--terra);flex-shrink:0}
.wf-sugg__h .terra{color:var(--terra);font-weight:500}
.wf-chips{display:flex;flex-wrap:wrap;gap:8px}
.wf-chip2{border:1px solid var(--line-w);background:transparent;border-radius:3px;padding:4.5px 11px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;color:color-mix(in srgb,var(--ink-w) 62%,transparent);cursor:pointer;transition:color .18s,background .18s,border-color .18s;white-space:nowrap}
.wf-chip2:hover{color:var(--terra);background:color-mix(in srgb,var(--terra) 8%,transparent);border-color:color-mix(in srgb,var(--terra) 42%,transparent)}
.wf-attach{display:none;flex-wrap:wrap;gap:7px}
.wf-attach.has{display:flex}
.wf-attach__chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line-w);background:var(--fill-w);border-radius:3px;padding:4px 10px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 70%,transparent)}
.wf-composer{display:flex;align-items:center;gap:9px;border:1px solid var(--line-w);background:var(--fill-w);border-radius:11px;padding:5px 13px;transition:border-color .18s,box-shadow .18s}
.wf-composer:focus-within{border-color:color-mix(in srgb,var(--terra) 55%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--terra) 12%,transparent)}
.wf-composer__clip{color:color-mix(in srgb,var(--ink-w) 44%,transparent);cursor:pointer;display:flex;align-items:center;flex-shrink:0;transition:color .15s}
.wf-composer__clip:hover{color:var(--terra)}
.wf-composer__clip svg{width:17px;height:17px}
.wf-composer input{flex:1;min-width:0;border:0;background:transparent;outline:none;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:15.525px;color:var(--ink);padding:8px 2px}
.wf-composer input::placeholder{color:color-mix(in srgb,var(--ink-w) 40%,transparent)}
.wf-composer textarea{flex:1;min-width:0;border:0;background:transparent;outline:none;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:15.525px;color:var(--ink);padding:8px 2px;resize:none;line-height:1.45;max-height:120px;overflow-y:auto;scrollbar-width:none}
.wf-composer textarea::-webkit-scrollbar{display:none}
.wf-composer textarea::placeholder{color:color-mix(in srgb,var(--ink-w) 40%,transparent);transition:color .28s}
.wf-composer textarea.ph-fade::placeholder{color:transparent}
.wf-composer__send,.wf-composer__stop{color:var(--terra);cursor:pointer;display:flex;align-items:center;flex-shrink:0;padding:4px;border-radius:7px;transition:background .15s,opacity .15s}
.wf-composer__send svg{width:17px;height:17px}.wf-composer__stop svg{width:15px;height:15px}
.wf-composer__send:hover,.wf-composer__stop:hover{background:color-mix(in srgb,var(--terra) 12%,transparent)}
.wf-composer__send.is-empty{opacity:.35;pointer-events:none}
.wf-composer.streaming .wf-composer__send{display:none} /* same-slot swap: Stop takes the slot */
.wf-composer:not(.streaming) .wf-composer__stop{display:none} /* and hides when idle, mutually exclusive */
.wf-cxerr{display:flex;align-items:center;gap:9px;border:1px solid rgba(178,58,46,.36);background:rgba(178,58,46,.07);border-radius:9px;padding:7px 11px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:#8C2E23}
.wf-cxerr b{font-weight:600}
.wf-cxerr .wf-exbtn{flex-shrink:0;margin-left:auto}
.wf-cmsg--me .wf-bub{position:relative}
.wf-medit2{position:absolute;right:calc(100% + 7px);top:50%;transform:translateY(-50%);opacity:0;transition:opacity .15s;margin:0}
.wf-cmsg--me:hover .wf-medit2{opacity:1}
.wf-cx .wf-medit2:active{transform:translateY(-50%) scale(.94)}
.wf-fups{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}
.wf-tempbadge{display:inline-flex;align-items:center;gap:6px;margin-left:auto;border:1px solid color-mix(in srgb,var(--terra) 32%,transparent);background:color-mix(in srgb,var(--terra) 8%,transparent);border-radius:3px;padding:3px 10px 3px 8px;font-family:"Space Mono",monospace;font-size:9.2px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra);cursor:pointer;transition:background .15s}
.wf-tempbadge:hover{background:color-mix(in srgb,var(--terra) 14%,transparent)}
.wf-tempgo{margin-left:auto;display:inline-flex;padding:5px;border-radius:7px;color:color-mix(in srgb,var(--ink-w) 52%,transparent);cursor:pointer;transition:color .15s,background .15s}
.wf-tempgo:hover{color:var(--terra);background:color-mix(in srgb,var(--terra) 9%,transparent)}
.wf-tempgo[hidden]{display:none}
.wf-tempgo svg{width:15px;height:15px}
.wf-tempbadge svg{width:13px;height:13px;flex-shrink:0}

.wf-tempbadge[hidden]{display:none}
.wf-toast.act{pointer-events:auto}
.wf-toast .wf-undo{margin-left:10px;background:transparent;border:0;color:var(--on-orange);text-decoration:underline;text-underline-offset:2px;font:inherit;cursor:pointer;padding:0}
.wf-lowconf{display:flex;align-items:center;gap:9px;flex-wrap:wrap;border:1px solid var(--line-w);background:var(--fill-w);border-radius:3px;padding:6px 10px;margin-top:2px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 60%,transparent);max-width:min(100%,52rem)}
.wf-evachip{display:none;align-items:center;gap:6px;margin-left:auto;border:1px solid var(--line-w);border-radius:3px;padding:3px 10px 3px 4px;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:12.65px;color:var(--ink);cursor:pointer}
.wf-evachip i{width:20px;height:20px;border-radius:50%;background:var(--terra);color:var(--on-orange);display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:600;font-size:10.35px}
.wf-aside-back{display:none;align-items:center;gap:7px;border:0;background:transparent;padding:0 0 4px;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:13.8px;color:color-mix(in srgb,var(--ink-w) 62%,transparent);cursor:pointer}
.wf-aside-back:hover{color:var(--terra)}
.wf-cx__aside.open .wf-aside-back{display:inline-flex}
@keyframes wfaside{from{transform:translateX(100%)}to{transform:translateX(0)}}
.wf-cx__aside.open{animation:wfaside .24s cubic-bezier(.4,0,.2,1)}
.wf-psel__v[data-psrc]{cursor:pointer;border-bottom:1px dashed color-mix(in srgb,var(--terra) 45%,transparent)}
.wf-propbanner,.wf-review{border:1px solid var(--line-w);background:var(--fill-w);border-radius:11px;padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;color:var(--ink);max-width:min(100%,52rem)}
.wf-propbanner b{font-weight:600}
.wf-propbanner .conf{font-size:10.925px;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in srgb,var(--ink-w) 48%,transparent)}
.wf-propbanner .cd{margin-left:auto;font-size:10.925px;color:color-mix(in srgb,var(--ink-w) 48%,transparent)}
.wf-review span.q{color:color-mix(in srgb,var(--ink-w) 70%,transparent)}
.wf-pickmask{position:absolute;inset:0;z-index:8;background:color-mix(in srgb,var(--ink) 18%,transparent);display:flex;align-items:center;justify-content:center;padding:20px}
.wf-pickmask[hidden]{display:none}
.wf-picker{background:var(--canvas);border:1px solid var(--line-w);border-radius:13px;padding:18px 20px 20px;max-width:26rem;width:100%;box-shadow:0 18px 50px -20px rgba(107,44,18,.4)}
.wf-picker__crumb{display:flex;align-items:center;gap:8px;margin:0 0 14px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:14.375px;color:var(--ink)}
.wf-picker__crumb svg{width:15px;height:15px;color:var(--terra)}
.wf-picker__crumb .sl{color:color-mix(in srgb,var(--ink-w) 38%,transparent);font-weight:400}
.wf-picker__crumb u{text-decoration-color:color-mix(in srgb,var(--terra) 55%,transparent);text-underline-offset:3px}
.wf-picker__list{display:flex;flex-direction:column;gap:9px;margin-bottom:14px}
.wf-pitem{display:flex;align-items:center;gap:11px;border:1px solid var(--line-w);border-radius:11px;padding:11px 13px;cursor:pointer;transition:border-color .15s,background .15s;text-align:left;background:transparent;width:100%}
.wf-pitem:hover{border-color:color-mix(in srgb,var(--terra) 45%,transparent)}
.wf-pitem.sel{border-color:color-mix(in srgb,var(--terra) 45%,transparent);background:color-mix(in srgb,var(--terra) 7%,transparent)}
.wf-pitem__av{width:32px;height:32px;border-radius:50%;background:var(--terra);color:var(--on-orange);display:flex;align-items:center;justify-content:center;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:13px;flex-shrink:0}
.wf-pitem__n{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:15.525px;color:var(--ink);line-height:1.15}
.wf-pitem__t{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-pitem__chk{margin-left:auto;color:var(--terra);flex-shrink:0}
.wf-srcmask{position:absolute;inset:0;z-index:8;background:color-mix(in srgb,var(--ink) 18%,transparent);display:flex;align-items:center;justify-content:center;padding:20px}
.wf-srcmask[hidden]{display:none}
.wf-srcmodal{background:var(--canvas);border:1px solid var(--line-w);border-radius:13px;padding:20px 22px;max-width:30rem;width:100%;box-shadow:0 18px 50px -20px rgba(107,44,18,.4)}
.wf-srcmodal__e{margin:0 0 4px;font-family:"Space Mono",monospace;font-size:9.775px;letter-spacing:.16em;text-transform:uppercase;color:var(--terra)}
.wf-srcmodal__v{margin:0 0 12px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:18.4px;color:var(--ink)}
.wf-srcmodal__q{margin:0 0 4px;border-left:2px solid color-mix(in srgb,var(--terra) 45%,transparent);padding:6px 0 6px 12px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;line-height:1.55;color:color-mix(in srgb,var(--ink-w) 78%,transparent)}
.wf-srcmodal__t{margin:0 0 14px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:10.925px;color:color-mix(in srgb,var(--ink-w) 48%,transparent)}
@media(min-width:1041px){.wf-evachip{display:none!important}}
@media(max-width:1040px){.wf-evachip{display:inline-flex}}
.wf-ailabel{margin:1px 0 0;text-align:center;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:10.925px;color:color-mix(in srgb,var(--ink-w) 48%,transparent)}
.wf-tolatest{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--foot-h,150px) + 14px);width:34px;height:34px;border-radius:50%;border:1px solid var(--line-w);background:var(--canvas);color:var(--terra);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px -10px rgba(107,44,18,.35);transition:opacity .18s;z-index:5}
.wf-tolatest svg{width:16px;height:16px}
.wf-tolatest[hidden]{display:none}
.wireview--chat .wf-toast{bottom:calc(var(--foot-h,150px) + 18px)}
/* §1.8 aside */
.wf-eva{display:flex;align-items:center;gap:11px;height:60px;box-sizing:border-box}
.wf-eva__id{align-self:flex-start;margin-top:20px}
.wf-eva__av{align-self:flex-start;margin-top:18px}
.wf-eva__av{width:40px;height:40px;border-radius:50%;background:var(--terra);color:var(--on-orange);display:flex;align-items:center;justify-content:center;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16px;flex-shrink:0}
.wf-eva__id{min-width:0;flex:1}
.wf-eva__n{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:18.4px;color:var(--ink);line-height:1.1}
.wf-eva__tag{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 52%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.wf-eva__act{display:flex;align-items:center;gap:12px;flex-shrink:0}
.wf-eva__i{width:17px;height:17px;color:color-mix(in srgb,var(--ink-w) 42%,transparent);cursor:pointer;transition:color .15s}
.wf-eva__i:hover{color:var(--terra)}
.wf-eva__i.on{color:var(--terra)}
.wf-brainstorm{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1px solid color-mix(in srgb,var(--terra) 22%,transparent);background:color-mix(in srgb,var(--terra) 7%,transparent);border-radius:3px;padding:6px 11px;cursor:pointer;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:15.525px;color:var(--terra);transition:background .16s,opacity .16s}
.wf-brainstorm:hover{background:color-mix(in srgb,var(--terra) 13%,transparent)}
.wf-brainstorm svg{width:15px;height:15px;flex-shrink:0}
.wf-brainstorm.busy{opacity:.55;pointer-events:none}
.wf-pref-lbl{margin:4px 0 10px;font-family:"Space Mono","Archivo",monospace;font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--terra)}
.wf-cx__aside{background:var(--topbar)}
/* r21: rail section views */
.wf-cx.seco .wf-chat__foot,.wf-cx.seco .wf-tolatest,.wf-cx.seco [data-tempbadge],.wf-cx.seco [data-tempgo]{display:none!important}
.wf-cx.seco .wf-crumb{display:none}
.wf-secv{max-width:none;width:100%;margin-inline:auto;padding:26px 0 60px}
.wf-cx.seco .wf-cx__body{padding-top:4px}
.wf-secv__h{margin:0 0 6px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:clamp(26.45px,2.875vw,34.5px);line-height:1.02;letter-spacing:-.018em;color:var(--ink)}
.wf-secv__sub{margin:0 0 20px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:15.525px;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-secv__lbl{margin:20px 0 9px;font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb,var(--ink-w) 48%,transparent)}
.wf-lblhint{margin-left:auto;text-align:right;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;font-weight:400;letter-spacing:.01em;text-transform:none;color:color-mix(in srgb,var(--ink-w) 52%,transparent)}
.wf-sec__lbl{display:flex;align-items:baseline;gap:10px;margin:26px 0 8px;font-family:"Space Mono",monospace;font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--terra)}
.wf-scard{border:0;border-bottom:1px solid var(--hair);border-radius:0;padding:14px 2px 16px;background:transparent}
.wf-scard+.wf-scard{margin-top:0}
.wf-scard__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:17.25px;color:var(--ink);display:flex;align-items:center;gap:8px}
.wf-scard__d{margin:4px 0 0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px;line-height:1.55;color:color-mix(in srgb,var(--ink-w) 60%,transparent)}
.wf-scard__act{display:flex;gap:18px;margin-top:9px;flex-wrap:wrap}
/* section actions read as text links, not boxed buttons (chat keeps its boxes) */
.wf-secv .wf-exbtn{border:0;border-radius:0;padding:2px 0;background:transparent;color:var(--terra);font-size:14.375px}
.wf-secv .wf-exbtn:hover{background:transparent;text-decoration:underline;text-underline-offset:3px}
.wf-secv .wf-slbtn{border:0;border-radius:0;padding:2px 0;background:transparent}
.wf-secv .wf-slbtn.on{background:transparent}
.wf-secv .wf-rthumb{display:none}
.wf-arow:not(.read) .wf-acat::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--terra);margin-right:7px;vertical-align:1px}
.wf-sgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.wf-schip{margin-left:auto;font-family:"Space Mono",monospace;font-size:9.2px;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--hair);border-radius:3px;padding:2px 6px;color:color-mix(in srgb,var(--ink-w) 52%,transparent);flex-shrink:0}
.wf-schip.terra{color:var(--terra);border-color:color-mix(in srgb,var(--terra) 40%,transparent)}
.wf-srow{display:flex;align-items:center;gap:12px;border:0;border-bottom:1px solid var(--hair);border-radius:0;padding:16px 2px 17px}
.wf-srow+.wf-srow{margin-top:0}
.wf-srow__i{width:15px;height:15px;color:var(--terra);flex-shrink:0}
.wf-srow__b{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.wf-srow__t{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:15.525px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wf-srow__m{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 48%,transparent)}
.wf-sfilter{display:flex;gap:7px;margin:0 0 12px;flex-wrap:wrap}
.wf-price{font-family:"Space Mono",monospace;font-size:12.65px;color:var(--terra);flex-shrink:0}
/* r25: prod parity for section views */
.wf-statdot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:7px;background:var(--terra)}
.wf-statdot.wait{background:transparent;border:1.5px solid var(--line-w)}
.wf-ck{width:15px;height:15px;border:1.5px solid var(--line-w);border-radius:3px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:transparent;transition:all .15s}
.wf-ck.on{background:var(--terra);border-color:var(--terra);color:var(--on-orange)}
.wf-ck svg{width:10px;height:10px}
.wf-arow{opacity:1;transition:opacity .2s;padding:20px 2px 22px}
.wf-arow.read{opacity:.55}
.wf-acat{font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--terra) 80%,transparent);display:inline-block;margin-bottom:5px}
.wf-abody{margin:8px 0 0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px;line-height:1.5;color:color-mix(in srgb,var(--ink-w) 58%,transparent)}
.wf-alink{color:var(--terra);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.wf-search{display:flex;align-items:center;gap:8px;flex:1;min-width:180px;max-width:340px;padding:7px 2px;border-bottom:1px solid var(--hair);color:color-mix(in srgb,var(--ink) 46%,transparent)}.wf-frows{margin-inline:calc(-1*var(--wpad))}.wf-frow{display:flex;align-items:baseline;gap:20px;padding:17px var(--wpad)}.wf-frow+.wf-frow{border-top:1px solid var(--hair)}.wf-frow__l{flex:0 0 188px;font-family:"Space Mono",monospace;font-size:11.5px;letter-spacing:.13em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent)}.wf-frow__v{flex:1;min-width:0;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:17.25px;color:var(--ink)}.wf-frow__a{flex:0 0 auto;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:12.65px;letter-spacing:.05em;text-transform:uppercase;color:var(--terra);cursor:pointer}
.wf-viewout{animation:wfvout .13s ease both}
@keyframes wfvout{to{opacity:0;transform:translateY(-6px)}}
.wf-riser{animation:wfvin .38s cubic-bezier(.22,.61,.36,1) both}
.wf-viewin>*{animation:wfvin .38s cubic-bezier(.22,.61,.36,1) both}
.wf-viewin>*:nth-child(2){animation-delay:.045s}
.wf-viewin>*:nth-child(3){animation-delay:.09s}
.wf-viewin>*:nth-child(4){animation-delay:.135s}
.wf-viewin>*:nth-child(5){animation-delay:.18s}
.wf-viewin>*:nth-child(6){animation-delay:.225s}
.wf-viewin>*:nth-child(7){animation-delay:.27s}
.wf-viewin>*:nth-child(n+8){animation-delay:.31s}
@keyframes wfvin{from{opacity:0;transform:translateY(10px)}}
@media (prefers-reduced-motion: reduce){
  .wf-viewout{animation:none}
  .wf-viewin>*,.wf-riser{animation:wffade .18s ease both;animation-delay:0s!important}
  .wf-insp.open{animation:wffade .18s ease both}
}
.wf-topics{display:flex;flex-wrap:wrap;gap:6px 22px;margin:2px 0 4px}
.wf-bdl{max-width:420px}
.wf-bdrow{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:8px 2px;border-bottom:1px solid var(--hair);font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px;color:var(--ink)}
.wf-bdrow b{font-family:"Space Mono",monospace;font-size:12.65px;font-weight:400;letter-spacing:.02em}
.wf-bdrow--tot{border-bottom:0;font-weight:600}
.wf-bdrow--tot b{font-weight:700;color:var(--terra)}
.wf-tstat{margin-left:auto;align-self:center;font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 55%,transparent);white-space:nowrap}
.wf-fsplit{display:flex;gap:30px;align-items:flex-start}
.wf-fsplit__list{flex:0 0 300px;max-height:70vh;overflow-y:auto;padding-right:4px}
.wf-fsplit__list .wf-fthumb{height:44px;width:44px;flex:0 0 44px}
.wf-fsplit__det{flex:1;min-width:0}
.wf-fcard.on{background:color-mix(in srgb,var(--terra) 8%,transparent);border-radius:3px}
.wf-fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:11px}
.wf-fcard{border:1px solid var(--line-w);border-radius:11px;overflow:hidden;cursor:pointer;transition:border-color .15s,transform .12s}
.wf-fcard:hover .wf-srow__t{color:var(--terra)}
/* r46: files grid -> ruled list */
.wf-fgrid{display:flex;flex-direction:column;gap:0}
.wf-fcard{display:flex;align-items:center;gap:13px;border:0;border-bottom:1px solid var(--hair);border-radius:0;padding:16px 2px 17px;overflow:visible}
.wf-fthumb{width:36px;height:36px;flex:0 0 auto;border-radius:3px;display:flex;align-items:center;justify-content:center}
.wf-fthumb svg{width:17px;height:17px}
.wf-fcard__b{flex:1;min-width:0}
.wf-fcard:active{transform:scale(.985)}
.wf-fthumb{height:36px;display:flex;align-items:center;justify-content:center;background:var(--fill-w);color:color-mix(in srgb,var(--ink-w) 38%,transparent)}
.wf-fthumb svg{width:26px;height:26px}
.wf-fthumb.k-Floorplans{background:color-mix(in srgb,var(--terra) 7%,transparent);color:color-mix(in srgb,var(--terra) 70%,transparent)}
.wf-fthumb.k-Images{background:color-mix(in srgb,var(--ink) 5%,transparent)}
.wf-fcard__b{padding:9px 11px 11px}
.wf-fdet__hero{height:230px;border:1px solid var(--line-w);border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--fill-w);color:color-mix(in srgb,var(--ink-w) 35%,transparent);margin-bottom:14px}
.wf-fdet__hero svg{width:44px;height:44px}
.wf-kchip{font-family:"Space Mono",monospace;font-size:9.2px;letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--hair);border-radius:3px;padding:2px 7px;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-rthumb{width:58px;height:58px;border-radius:9px;background:var(--fill-w);display:flex;align-items:center;justify-content:center;color:color-mix(in srgb,var(--ink-w) 38%,transparent);flex-shrink:0}
.wf-rthumb svg{width:22px;height:22px}
.wf-slbtn{display:inline-flex;align-items:center;gap:5px;border:1px solid color-mix(in srgb,var(--terra) 40%,transparent);background:transparent;border-radius:3px;padding:4px 9px;cursor:pointer;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:11.5px;color:var(--terra);transition:all .15s;flex-shrink:0}
.wf-slbtn.on{background:color-mix(in srgb,var(--terra) 10%,transparent)}
.wf-pref{border:0;border-radius:0;padding:12px 2px 13px;background:transparent}
.wf-pref.done{border-color:color-mix(in srgb,var(--terra) 45%,transparent)}
.wf-pref__h{display:flex;align-items:center;gap:0;margin-bottom:8px}
.wf-pref__i{display:none;width:15px;height:15px;opacity:.78;color:color-mix(in srgb,var(--ink-w) 62%,transparent);flex-shrink:0}
.wf-pref__t{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:15.525px;color:var(--ink)}
.wf-pidx{margin-left:7px;align-self:flex-start;margin-top:-1px;font-family:"Space Mono",monospace;font-size:8.6px;letter-spacing:.04em;font-weight:600;color:var(--terra)}
.wf-pref__d{display:none;margin:0 0 9px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;line-height:1.5;color:color-mix(in srgb,var(--ink-w) 55%,transparent)}
.wf-pchips{display:flex;flex-wrap:wrap;gap:7px}
.wf-pchip{position:relative;border:1px solid var(--line-w);background:transparent;border-radius:3px;padding:4px 11px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:12.65px;color:color-mix(in srgb,var(--ink-w) 70%,transparent);cursor:pointer;transition:color .15s,border-color .15s}
.wf-pchip:hover{color:var(--terra);border-color:color-mix(in srgb,var(--terra) 55%,transparent)}
.wf-psel{display:inline-flex;align-items:center;gap:9px;border:0;background:transparent;border-radius:0;padding:1px 0 2px}
.wf-psel__v{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:14.375px;color:var(--terra)}
.wf-psel__e,.wf-psel__x{display:flex;align-items:center;color:color-mix(in srgb,var(--ink-w) 45%,transparent);cursor:pointer;transition:color .15s;font-size:11.5px;line-height:1}
.wf-psel__e svg{width:12px;height:12px}
.wf-psel__e:hover,.wf-psel__x:hover{color:var(--terra)}
/* ── r10 motion pack ── */
.wf-bub--ghost{border:0!important;background:transparent!important;padding:6px 0!important;width:max-content;max-width:min(90%,832px);white-space:normal;overflow-wrap:normal}
.wf-think{display:inline-flex;align-items:center;gap:10px;white-space:normal}
.wf-shape{width:15px;height:15px;background:var(--terra);flex-shrink:0;transform-origin:50% 62%;
  clip-path:polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%);
  animation:wfshape 5.2s linear infinite}
@keyframes wfshape{
  0%{clip-path:polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%);transform:rotate(0deg) translateY(0) scale(1)}
  2%{transform:rotate(45deg) translateY(0) scale(1)}
  16%{clip-path:polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%);transform:rotate(360deg) translateY(0) scale(1)}
  20%{transform:rotate(360deg) translateY(-7px) scale(1)}
  23%{clip-path:polygon(50% 0%,100% 0%,100% 50%,100% 100%,50% 100%,0% 100%,0% 50%,0% 0%);transform:rotate(360deg) translateY(-2px) scale(1)}
  25%{clip-path:polygon(50% 0%,100% 0%,100% 50%,100% 100%,50% 100%,0% 100%,0% 50%,0% 0%);transform:rotate(360deg) translateY(0) scale(1.14,.84)}
  27%{transform:rotate(405deg) translateY(0) scale(1)}
  41%{clip-path:polygon(50% 0%,100% 0%,100% 50%,100% 100%,50% 100%,0% 100%,0% 50%,0% 0%);transform:rotate(720deg) translateY(0) scale(1)}
  45%{transform:rotate(720deg) translateY(-7px) scale(1)}
  48%{clip-path:polygon(50% 0%,75% 50%,100% 100%,75% 100%,50% 100%,25% 100%,0% 100%,25% 50%);transform:rotate(720deg) translateY(-2px) scale(1)}
  50%{clip-path:polygon(50% 0%,75% 50%,100% 100%,75% 100%,50% 100%,25% 100%,0% 100%,25% 50%);transform:rotate(720deg) translateY(0) scale(1.14,.84)}
  52%{transform:rotate(765deg) translateY(0) scale(1)}
  66%{clip-path:polygon(50% 0%,75% 50%,100% 100%,75% 100%,50% 100%,25% 100%,0% 100%,25% 50%);transform:rotate(1080deg) translateY(0) scale(1)}
  70%{transform:rotate(1080deg) translateY(-7px) scale(1)}
  73%{clip-path:polygon(50% 0%,75% 25%,100% 50%,75% 75%,50% 100%,25% 75%,0% 50%,25% 25%);transform:rotate(1080deg) translateY(-2px) scale(1)}
  75%{clip-path:polygon(50% 0%,75% 25%,100% 50%,75% 75%,50% 100%,25% 75%,0% 50%,25% 25%);transform:rotate(1080deg) translateY(0) scale(1.14,.84)}
  77%{transform:rotate(1125deg) translateY(0) scale(1)}
  91%{clip-path:polygon(50% 0%,75% 25%,100% 50%,75% 75%,50% 100%,25% 75%,0% 50%,25% 25%);transform:rotate(1440deg) translateY(0) scale(1)}
  95%{transform:rotate(1440deg) translateY(-7px) scale(1)}
  98%{clip-path:polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%);transform:rotate(1440deg) translateY(-2px) scale(1)}
  100%{clip-path:polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%);transform:rotate(1440deg) translateY(0) scale(1)}
}
.wf-think__ic{width:17px;height:17px;color:var(--terra);flex-shrink:0;animation:wfspin 2.6s linear infinite}
@keyframes wfspin{to{transform:rotate(360deg)}}
.wf-think__t{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:15.525px;white-space:normal;overflow-wrap:normal;color:color-mix(in srgb,var(--ink-w) 72%,transparent);transition:opacity .25s}
.wf-think__t.wfsw{opacity:0}
@media (prefers-reduced-motion:reduce){.wf-think__ic{animation:none}.wf-shape{animation:none}}
.wf-caret{display:inline-block;width:2px;height:1.05em;background:var(--terra);margin-left:2px;vertical-align:-2px;animation:wfblink .9s steps(2,start) infinite}
@keyframes wfblink{to{visibility:hidden}}
.wf-load{animation:wfload .2s ease both}
@keyframes wfload{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.wf-in2{animation:wfin2 .18s cubic-bezier(.4,0,.2,1) both}
@keyframes wfin2{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
.wf-just .wf-hl{animation:wfhl .5s ease both}
@keyframes wfhl{from{background:transparent}}
.wf-srcmodal,.wf-picker{animation:wfpop .16s ease}
@keyframes wfpop{from{opacity:0;transform:scale(.965) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
.wf-srcmask:not([hidden]),.wf-pickmask:not([hidden]){animation:wffade2 .16s ease}
@keyframes wffade2{from{opacity:0}}
.wf-tolatest{animation:wfpill .18s ease}
.wf-tempbadge:not([hidden]){animation:wffade2 .18s ease}
@keyframes wfpill{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.wf-chips{transition:opacity .14s}
.wf-chips.fade{opacity:0}
.wf-cx :is(.wf-room,.wf-chip2,.wf-pchip,.wf-exbtn,.wf-brainstorm,.wf-pitem,.wf-fb,.wf-mact,.wf-composer__send,.wf-composer__stop,.wf-eva__i,.wf-tolatest):active{transform:scale(.96)}
.wf-cx .wf-tolatest:active{transform:translateX(-50%) scale(.94)}
@media (prefers-reduced-motion:reduce){
  .wf-caret{animation:none;opacity:.65}
  .wf-in2,.wf-load,.wf-srcmodal,.wf-picker,.wf-entpop,.wf-seltool,.wf-crumbdd:not([hidden]),.wf-tolatest,.wf-tempbadge:not([hidden]),.wf-srcmask:not([hidden]),.wf-pickmask:not([hidden]){animation:wffade .15s ease both}
  .wf-just .wf-hl,.wf-pref.flash{animation:none}
  .wf-cx :is(.wf-room,.wf-chip2,.wf-pchip,.wf-exbtn,.wf-brainstorm,.wf-pitem,.wf-fb,.wf-mact,.wf-composer__send,.wf-composer__stop,.wf-eva__i,.wf-tolatest):active{transform:none}
}
/* focus visibility (spec red line) */
.wf-cx :is(button,a,input,textarea,[tabindex],.wf-chip2,.wf-room,.wf-pchip,.wf-fb,.wf-mact,.wf-exbtn):focus-visible{outline:2px solid color-mix(in srgb,var(--terra) 60%,transparent);outline-offset:2px}
/* responsive */

@media(max-width:1040px){
  .wf-cx__aside{display:none}
  .wf-cx__aside.open{display:flex;position:absolute;top:0;right:0;bottom:0;width:min(320px,92%);z-index:6;background:var(--canvas);border-left:1px solid var(--hair)}
}
@media(max-width:720px){.wf-rooms{grid-template-columns:1fr}}
/* image gen 3-col */
.wf-3col{display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr) minmax(0,260px);border:1px solid var(--hair);flex:1;min-height:0}
.wf-3col>div{padding:18px;display:flex;flex-direction:column;gap:13px;min-width:0}
.wf-3col__l{border-right:1px solid var(--hair)}
.wf-3col__r{border-left:1px solid var(--hair)}
.wf-canvas{flex:1;border:1px dashed var(--hair);display:grid;place-items:center;min-height:200px;
  background:repeating-linear-gradient(45deg,transparent 0 11px,color-mix(in srgb,var(--ink) 4%,transparent) 11px 12px)}
/* budget */
.wf-bigstat{display:flex;align-items:baseline;gap:12px;margin-bottom:6px}
.wf-bignum{font-family:"Archivo",system-ui,sans-serif;font-weight:700;font-stretch:78%;font-size:50.6px;line-height:1.02;color:var(--ink)}
.wf-track{height:6px;background:color-mix(in srgb,var(--ink) 8%,transparent);position:relative;margin:10px 0 0}
.wf-track i{position:absolute;left:0;top:0;bottom:0;background:var(--terra)}
/* projects as a clean, box-free list */
.wf-plist{display:flex;flex-direction:column}
.wf-prow{display:flex;align-items:center;gap:clamp(20px,4vw,40px);padding:15px 6px;border-radius:3px;cursor:pointer;transition:background .15s}
.wf-prow:hover{background:color-mix(in srgb,var(--terra) 6%,transparent)}
.wf-prow__l{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:7px}
.wf-prow__r{flex:0 0 auto;display:flex;align-items:center;gap:14px}
.wf-prow__r .wf-track{width:clamp(120px,18vw,200px);flex:0 0 auto;margin:0}
.wf-prow__r .wf-num{flex:0 0 auto;width:42px;text-align:right}
.wf-stack{display:flex;flex-direction:column;gap:8px}

/* real-content text inside wireframe shells */
.wf-row__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.675px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wf-row__p{font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:14.375px;line-height:1.4;color:color-mix(in srgb,var(--ink) 46%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wf-row__m{flex:0 0 auto;font-family:"Space Mono","Archivo",monospace;font-size:12.075px;letter-spacing:.07em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-dot{width:6px;height:6px;border-radius:50%;background:var(--terra);flex:0 0 auto}
.wf-cell__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.1px;line-height:1.25;color:var(--ink);transition:color .15s}
.wf-cell__sub{font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:13.8px;line-height:1.5;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-cell__row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto}
.wf-price{font-family:"Space Mono","Archivo",monospace;font-size:13.8px;color:var(--terra);letter-spacing:.01em;white-space:nowrap}
.wf-tag{font-family:"Space Mono","Archivo",monospace;font-size:10.925px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-msg__role{font-family:"Space Mono","Archivo",monospace;font-size:10.35px;letter-spacing:.16em;text-transform:uppercase;color:var(--terra)}
.wf-msg__txt{font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:14.375px;line-height:1.5;color:var(--ink)}
.wf-field__lbl{flex:0 0 auto;font-family:"Space Mono","Archivo",monospace;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra);white-space:nowrap}
.wf-field__val{text-align:right;font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:16.1px;color:var(--ink)}
.wf-trait{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:14.95px;color:var(--ink)}
.wf-num{font-family:"Space Mono","Archivo",monospace;font-size:12.65px;color:var(--ink)}
.wf-pal span{position:relative;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
.wf-pal small{font-family:"Space Mono",monospace;font-size:8.625px;color:rgba(255,255,255,.85);letter-spacing:.02em}
/* cart */
.wf-cart{display:grid;grid-template-columns:minmax(0,1fr) clamp(220px,30%,290px);gap:clamp(20px,3vw,34px);align-items:start}
.wf-cart .wf-thumb{width:56px;height:44px;aspect-ratio:auto;flex:0 0 auto}
.wf-sum{border:1px solid var(--hair);padding:20px;display:flex;flex-direction:column;min-width:0}
.wf-sum__row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:8px 0;
  font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px;color:color-mix(in srgb,var(--ink) 62%,transparent)}
.wf-sum__total{display:flex;justify-content:space-between;gap:10px;margin-top:8px;padding-top:12px;border-top:1px solid var(--hair);
  font-family:"Archivo",system-ui,sans-serif;font-weight:700;font-stretch:78%;font-size:18.4px;color:var(--ink)}
.wf-x{flex:0 0 auto;margin-left:4px;font-size:13.8px;color:color-mix(in srgb,var(--ink) 40%,transparent);cursor:pointer}
.wf-x:hover{color:var(--terra)}
/* checkout stepper */
.wf-steps{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:26px}
.wf-step{display:inline-flex;align-items:center;gap:7px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;
  font-size:13.8px;letter-spacing:.04em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent)}
.wf-step.on{color:var(--ink)}
.wf-step b{font-weight:400;color:var(--terra);font-family:"Space Mono","Archivo",monospace;font-size:.78em}
.wf-steps .ln{width:22px;height:1px;background:var(--hair)}
/* narrow: stack the two-column layouts */
@media (max-width:980px){
  .wf-cart{grid-template-columns:1fr}
  .wf-3col{grid-template-columns:1fr}
  .wf-3col__l{border-right:none;border-bottom:1px solid var(--hair)}
  .wf-3col__r{border-left:none;border-top:1px solid var(--hair)}
}

/* orange route-progress sweep, replicated from the zip's RouteProgressSweep */
.route-sweep{position:fixed;top:0;left:0;right:0;height:2px;z-index:100;pointer-events:none;
  background:color-mix(in srgb,var(--terra) 14%,transparent);opacity:0}
.route-sweep.run{opacity:1}
.route-sweep i{display:block;height:100%;width:0;background:var(--terra);transform-origin:left center}
.route-sweep.run i{animation:furnishes-route-sweep 1.2s cubic-bezier(.4,0,.2,1) forwards}
@keyframes furnishes-route-sweep{
  0%{width:0;opacity:1}
  60%{width:90%;opacity:1}
  75%{width:100%;opacity:1}
  100%{width:100%;opacity:0}
}
.tab .ico{width:14px;height:14px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:.85}
.meta{position:absolute;right:18px;bottom:16px;z-index:3;font-size:11.5px;letter-spacing:.12em;color:var(--ink);opacity:.55;display:flex;gap:14px;white-space:nowrap;text-transform:uppercase}
.meta b{font-weight:700}
.util{display:flex;align-items:center;gap:14px}
.util .ib{position:relative;font-size:17.25px;opacity:.8;text-decoration:none;color:var(--ink)}
.util .badge{position:absolute;top:-6px;right:-7px;background:var(--terra);color:var(--on-orange);
  font-size:9.2px;line-height:1;padding:2px 4px;border-radius:9px}
.avatar{width:26px;height:26px;border-radius:50%;border:1px solid var(--terra);color:var(--terra);
  display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;letter-spacing:.06em}

/* ── CONTENT region (the real content lives here; this is the OVERVIEW view) ── */
.content{position:absolute;top:14px;left:14px;bottom:14px;right:40%;z-index:3;display:flex;flex-direction:column;
  padding:calc(var(--nav-h) + 26px) 24px 56px clamp(24px,4vw,64px)}
.eyebrow{font-size:12.65px;letter-spacing:.26em;text-transform:uppercase;color:var(--ink);opacity:.7}
.eyebrow b{color:var(--terra)}
.headline{margin:auto 0 0;max-width:12ch;font-size:clamp(34.5px,5.06vw,66.7px);text-transform:uppercase}
.subline{margin-top:18px;max-width:46ch;font-size:13.8px;letter-spacing:.04em;line-height:1.6;opacity:.72}
.enter{margin-top:26px;display:inline-flex;align-items:center;gap:12px;align-self:flex-start;
  font-family:"Archivo";font-weight:700;font-size:14.95px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--ink);cursor:pointer}
.enter .pill{display:inline-flex;align-items:center;gap:8px;color:var(--terra)}
.enter .pill .br{opacity:.6}

/* explorable-world markers (placeholder for the 3D house overview) */
.markers{position:absolute;inset:14px;z-index:2;pointer-events:none}
.mk{position:absolute;width:12px;height:12px;border-radius:50%;background:var(--terra);
  box-shadow:0 0 0 4px rgba(194,84,42,.14);opacity:.55}
.mk small{position:absolute;left:18px;top:-1px;white-space:nowrap;font-size:10.35px;letter-spacing:.18em;
  color:var(--ink);opacity:.5;text-transform:uppercase}
.mk.a{top:20%;left:66%} .mk.b{top:30%;left:84%} .mk.c{top:44%;left:74%}
.thread{display:none}

/* bottom-right feature card ("LATEST", San Rita's Podium Global slot) */
.card{position:absolute;right:44px;bottom:54px;z-index:4;width:198px;
  background:var(--ink);color:var(--on-orange);border:1px solid var(--ink);border-radius:0;overflow:hidden}
.card__top{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;font-size:10.35px;
  letter-spacing:.18em;text-transform:uppercase;opacity:.85}
.card__lab{padding:13px 12px 0;font-size:10.35px;letter-spacing:.2em;text-transform:uppercase;opacity:.7}
.card__title{padding:2px 12px 12px;font-family:"Archivo";font-weight:800;font-size:25.3px;letter-spacing:-.01em;
  text-transform:uppercase;line-height:1}
.card__img{height:84px;background:var(--terra);
  background-image:linear-gradient(135deg,rgba(0,0,0,.18),transparent),var(--band);opacity:.92}

@media (max-width:1024px){ .meta{display:none} }
@media (max-width:680px){
  .app{grid-template-columns:200px 1fr}
}

/* ════════ adapted structural pieces (real product → my skin) ════════ */
.wf-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px 24px;flex-wrap:wrap;margin-bottom:18px;margin-inline:calc(-1*var(--wpad));padding:18px var(--wpad) 16px;border-bottom:1px solid var(--hair)}.wf-head:has(+ .wf-toolrow){border-bottom:0}
.wf-head__main{min-width:0}
.wf-head__act{display:flex;gap:10px;flex:0 0 auto;flex-wrap:wrap}
.wf-btn.ghost{border-color:var(--hair);color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-btn.ghost:hover{border-color:var(--terra);color:var(--terra)}
/* status badge */
.wf-badge{display:inline-flex;align-items:center;height:19px;padding:0 7px;border:1px solid var(--hair);
  font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.1em;text-transform:uppercase;
  color:color-mix(in srgb,var(--ink) 46%,transparent);white-space:nowrap;flex:0 0 auto}
.wf-badge--on{border-color:color-mix(in srgb,var(--terra) 55%,transparent);color:var(--terra)}
.wf-badge--mut{opacity:.62}
/* count chips */
.wf-chip .ct{margin-left:7px;color:color-mix(in srgb,var(--ink) 40%,transparent)}
.wf-chip.on{border-color:var(--terra);color:var(--terra)}
.wf-chip.on .ct{color:var(--terra)}
/* ledger table */
.wf-tbl{width:100%;border-collapse:collapse}
.wf-tbl th{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.13em;text-transform:uppercase;font-weight:400;
  color:color-mix(in srgb,var(--ink) 40%,transparent);text-align:left;padding:0 0 11px;border-bottom:1px solid var(--hair);white-space:nowrap}
.wf-tbl th.num,.wf-tbl td.num{text-align:right}
.wf-tbl th+th,.wf-tbl td+td{padding-left:26px}
.wf-tbl td{padding:16px 0;border-bottom:1px solid var(--hair-soft);vertical-align:middle}
.wf-tbl tbody tr{cursor:pointer;transition:background .15s}
.wf-tbl tbody tr:hover{background:color-mix(in srgb,var(--terra) 5%,transparent)}
.wf-tbl__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.1px;color:var(--ink)}
.wf-tbl__d{margin-top:3px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:13.8px;
  color:color-mix(in srgb,var(--ink) 46%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42ch}
.wf-tbl__n{font-family:"Space Mono",monospace;font-size:13.8px;color:var(--ink)}
.wf-tbl__m{font-family:"Space Mono",monospace;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent);white-space:nowrap}
/* grouped (shortlist) */
.wf-group{margin-bottom:36px}
.wf-group__h{display:flex;align-items:baseline;gap:10px;margin-bottom:16px}
.wf-group__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:19.55px;color:var(--ink)}
.wf-group__n{font-family:"Space Mono",monospace;font-size:10.925px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent)}
.wf-move{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent);cursor:pointer}
.wf-move:hover{color:var(--terra)}
/* prow status row */
.wf-prow__top{display:flex;align-items:center;gap:11px}
/* memory (preferences) */
.wf-mem{display:flex;flex-direction:column;gap:28px;max-width:780px}
.wf-mem__row{display:flex;align-items:baseline;gap:18px;padding:10px 0}
.wf-mem__k{flex:0 0 120px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:15.525px;color:var(--ink)}
.wf-mem__v{flex:1;min-width:0;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:15.525px;line-height:1.5;color:color-mix(in srgb,var(--ink) 62%,transparent)}
.wf-mem__src{flex:0 0 auto;font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.07em;text-transform:uppercase;color:var(--terra);cursor:pointer;white-space:nowrap}
.wf-mem__src:hover{text-decoration:underline}
/* matrix (notifications) */
.wf-matrix{border-collapse:collapse;max-width:580px;width:100%}
.wf-matrix th{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.1em;text-transform:uppercase;font-weight:400;
  color:color-mix(in srgb,var(--ink) 40%,transparent);padding:0 0 13px;text-align:center}
.wf-matrix th.lbl{text-align:left}
.wf-matrix td{padding:12px 0;border-top:1px solid var(--hair-soft)}
.wf-matrix td.lbl{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:15.525px;color:var(--ink);text-align:left;padding-right:18px}
.wf-matrix td.c{text-align:center;width:78px}
.wf-check{display:inline-block;width:15px;height:15px;border:1px solid color-mix(in srgb,var(--ink) 26%,transparent);position:relative;cursor:pointer;vertical-align:middle}
.wf-check.on{border-color:var(--terra)}
.wf-check.on::after{content:"";position:absolute;inset:3px;background:var(--terra)}
/* choice pills */
.wf-choice{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.wf-choice span{display:inline-flex;align-items:center;height:30px;padding:0 13px;border:1px solid var(--hair);cursor:pointer;
  font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:14.375px;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-choice span.on{border-color:var(--terra);color:var(--terra)}
/* SG benchmarks */
.wf-bench{display:flex;flex-direction:column;margin-inline:calc(-1*var(--wpad));border-top:1px solid var(--hair)}
.wf-bench__row{display:flex;align-items:baseline;justify-content:space-between;gap:18px;padding:13px var(--wpad);border-bottom:1px solid var(--hair)}
.wf-bench__l{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:14.95px;color:var(--ink)}
.wf-bench__v{font-family:"Space Mono",monospace;font-size:12.65px;color:var(--terra);white-space:nowrap}
/* style: 2col + mood + evidence + archetypes + pillars */
.wf-2col{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:30px}
@media(max-width:820px){.wf-2col{grid-template-columns:1fr}}
.wf-2col--closed{margin-inline:calc(-1*var(--wpad));padding:0 var(--wpad) 34px;border-bottom:1px solid var(--hair)}
.wf-mood{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:340px}
.wf-mood div{aspect-ratio:1;display:flex;align-items:flex-end;padding:8px;font-family:"Space Mono",monospace;font-size:9.775px;letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--hair)}
.wf-evi{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:16px 28px;max-width:920px}
.wf-evi__tx{font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:14.95px;line-height:1.5;color:var(--ink)}
.wf-evi__src{display:inline-block;margin-top:5px;font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.07em;text-transform:uppercase;color:var(--terra);cursor:pointer}
.wf-evi__src:hover{text-decoration:underline}
.wf-arch{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(215px,100%),1fr));gap:20px 26px}
.wf-arch__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.1px;color:var(--ink)}
.wf-arch__q{margin-top:4px;font-family:"Archivo",system-ui,sans-serif;font-style:italic;font-stretch:78%;font-size:13.8px;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-arch__sw{display:flex;gap:3px;margin-top:10px}
.wf-arch__sw i{display:block;width:22px;height:9px}
.wf-arch__d{margin-top:9px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:13.225px;line-height:1.45;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:22px 28px;max-width:920px}
.wf-pillar__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.1px;color:var(--ink)}
.wf-pillar__b{margin-top:6px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:13.8px;line-height:1.5;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-pillar__l{display:inline-block;margin-top:9px;font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.1em;text-transform:uppercase;color:var(--terra);cursor:pointer}
/* uploads toolbar + search */
.wf-toolrow{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-bottom:22px}
.wf-toolrow .wf-tools{padding-bottom:0}.wf-tools+.wf-cells{margin-top:14px}
.wf-secintro{margin:-2px 0 15px;max-width:64ch;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:16.1px;line-height:1.5;color:color-mix(in srgb,var(--ink) 56%,transparent)}.wf-secintro+.wf-cells{border-top:0;border-bottom:0}.wf-helpsearch{display:flex;align-items:center;gap:10px;margin-inline:calc(-1*var(--wpad));padding:15px var(--wpad);border-bottom:1px solid var(--hair);color:color-mix(in srgb,var(--ink) 46%,transparent);font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:16.1px}.wf-helpsearch svg{width:15px;height:15px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.4}
.wf-search svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;flex:0 0 auto}
.wf-search span{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px}
.wf-uphead{display:flex;align-items:center;justify-content:space-between;gap:10px}
/* inspector (slide-in) */
.wf-scrim{display:none}
.wf-scrim.open{opacity:1;pointer-events:auto}
.wf-insp{display:none;flex:0 0 var(--inspw);width:var(--inspw);box-sizing:border-box;position:sticky;top:0;align-self:flex-start;max-height:calc(100vh - 140px);overflow-y:auto;background:transparent;border-left:1px solid var(--hair);margin-left:clamp(18px,2.4vw,34px);padding:2px 2px 30px clamp(16px,2vw,26px)}
.wf-insp::-webkit-scrollbar{width:0;height:0;display:none}
.wf-insp.open{display:flex;flex-direction:column;animation:wfvin .3s cubic-bezier(.22,.61,.36,1) both}
.wf-insp__body{width:100%;max-width:none}
.wf-insp__x{position:sticky;top:0;align-self:flex-end;font-family:"Space Mono",monospace;font-size:13.8px;color:color-mix(in srgb,var(--ink) 56%,transparent);cursor:pointer;line-height:1;padding:4px 6px;border-radius:3px;transition:color .15s}
.wf-insp__x:hover{color:var(--terra)}
.insp-src{background:color-mix(in srgb,var(--terra) 10%,transparent)!important;border-radius:3px;transition:background .2s}
.wf-insp__x:hover{color:var(--terra)}
.wf-insp__t{margin:10px 0 18px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:25.3px;letter-spacing:-.01em;color:var(--ink)}


/* ════════ structural lines: section dividers only, NO per-row separators ════════ */
/* a line is only used to close/divide a real region (section break, heading rule),
   never as a thin underline beneath every list item / field / toggle. */
.wf-sec{border-top:1px solid var(--hair);margin:22px calc(-1*var(--wpad)) 6px;padding:16px var(--wpad) 10px;background:var(--canvas)}
.wf-sec .wf-eye{margin:0}
.wf-mem{gap:6px}
.wf-group__h{border-bottom:1px solid var(--hair);margin-inline:calc(-1*var(--wpad));padding:0 var(--wpad) 12px}
.wf-toolrow{margin-inline:calc(-1*var(--wpad));padding:0 var(--wpad) 22px}


/* ── sub-section label (ink, no line) + orders sub-tabs + dash activity link ── */
.wf-mlbl{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:15.525px;color:var(--ink);margin:0 0 11px}
.wf-subsec{margin-bottom:26px}
.wf-tabs{display:flex;gap:6px;margin-bottom:26px}
.wf-tab{display:inline-flex;align-items:center;height:30px;padding:0 14px;border:1px solid var(--hair);cursor:pointer;
  font-family:"Space Mono",monospace;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-tab.on{border-color:var(--terra);color:var(--terra)}
.otab-panel[hidden]{display:none}
.dash-act__all{display:inline-block;margin-top:16px;font-family:"Space Mono",monospace;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--terra);cursor:pointer}
.dash-act__all:hover{text-decoration:underline}


/* ── fact mini-grid (enclosed cells) + budget bars + described toggles ── */
.wf-facts{display:grid;gap:1px;background:var(--hair);border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);margin-inline:calc(-1*var(--wpad,0px));margin-bottom:28px}
.wf-fact{background:var(--cream-ui);padding:14px var(--wpad,15px);min-width:0}
.wf-fact__l{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra)}
.wf-fact__v{margin-top:7px;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:18.4px;line-height:1.05;color:var(--ink)}
.wf-bhero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,290px);gap:32px;align-items:end;margin-bottom:6px}
@media(max-width:760px){.wf-bhero{grid-template-columns:1fr}}
.wf-alloc{display:flex;flex-direction:column;gap:20px}
.wf-alloc__row{display:grid;grid-template-columns:minmax(150px,210px) minmax(100px,1fr) 78px;gap:22px;align-items:center}
@media(max-width:620px){.wf-alloc__row{grid-template-columns:1fr auto;gap:6px 14px}.wf-alloc__bar{grid-column:1/-1}}
.wf-alloc__name{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.1px;color:var(--ink)}
.wf-alloc__desc{margin-top:3px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:13.8px;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-alloc__bar{height:6px;background:color-mix(in srgb,var(--ink) 8%,transparent);position:relative}
.wf-alloc__bar i{position:absolute;left:0;top:0;bottom:0;background:var(--terra)}
.wf-alloc__amt{font-family:"Space Mono",monospace;font-size:13.8px;color:var(--ink);text-align:right;white-space:nowrap}
.wf-togblock{margin-inline:calc(-1*var(--wpad));background:var(--cream-ui)}
.wf-tog2{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:15px var(--wpad)}.wf-tog2+.wf-tog2{border-top:1px solid var(--hair)}
.wf-tog2__main{min-width:0}
.wf-tog2__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.1px;color:var(--ink)}
.wf-tog2__d{margin-top:4px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:13.8px;line-height:1.45;color:color-mix(in srgb,var(--ink) 46%,transparent)}
.wf-tog2 .wf-switch{margin-top:3px}


/* ════════ connected cell cards (dashboard-style enclosed grid) ════════ */
.wf-cells{display:grid;gap:1px;background:var(--hair);border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);margin-inline:calc(-1*var(--wpad,0px));margin-bottom:28px}
.wf-cellbox{background:var(--cream-ui);padding:16px var(--wpad,17px);min-width:0;display:flex;flex-direction:column;transition:background .15s}
.wf-cellbox[data-view]{cursor:pointer}
.wf-cellbox[data-view]:hover{background:color-mix(in srgb,var(--terra) 6%,transparent)}
.wf-cellbox__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:17.25px;line-height:1.2;color:var(--ink)}
.wf-cellbox__d{margin-top:8px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:14.375px;line-height:1.5;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-cellbox__go{margin-top:11px;font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra)}
.wf-cellbox__meta{margin-top:11px;font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent)}
.wf-cellbox__top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.wf-cellbox__sw{display:flex;gap:3px;margin:12px 0 2px}
.wf-cellbox__sw i{display:block;height:11px;flex:1 1 0}
.wf-cellbox .wf-arch__q{margin-top:0}
@media(max-width:720px){.wf-cells{grid-template-columns:1fr!important}}
/* settings notifications, framed tight matrix */
.wf-notif{margin-inline:calc(-1*var(--wpad))}.wf-notif__r+.wf-notif__r{border-top:1px solid var(--hair)}.wf-notif__h{border-bottom:1px solid var(--hair)}.wf-notif__h+.wf-notif__r{border-top:0}
.wf-notif__r{display:grid;grid-template-columns:1fr 54px 54px 54px;align-items:center;padding:17px var(--wpad);gap:10px}
.wf-notif__r+.wf-notif__r{border-top:1px solid var(--hair-soft)}
.wf-notif__h span{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent);text-align:center}
.wf-notif__h span:first-child{text-align:left}
.wf-notif__cat{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:15.525px;color:var(--ink)}
.wf-notif__c{display:flex;justify-content:center}


/* ════════ interactive states: hover / press / toggle animations ════════ */
[data-view],[data-insp],[data-otab],[data-insp-close]{cursor:pointer}
/* big cards: subtle peach hover (blend INTO cream, not over the hairline grid) */
.wf-cellbox[data-view]:hover{background:color-mix(in srgb,var(--terra) 6%,var(--cream-ui))}
/* buttons */
.wf-btn{transition:background .16s,color .16s,border-color .16s,transform .07s}
.wf-btn:hover{background:var(--terra);color:var(--on-orange)}
.wf-btn:active{transform:translateY(1px)}
.wf-btn.ghost:hover{background:color-mix(in srgb,var(--terra) 10%,var(--cream-ui));color:var(--terra);border-color:var(--terra)}
@keyframes btnflash{0%,100%{background:transparent}45%{background:var(--terra);color:var(--on-orange)}}
.wf-btn.flash{animation:btnflash .32s ease}
/* chips / tabs / choice pills */
.wf-chip{cursor:pointer;transition:border-color .15s,color .15s,background .15s}
.wf-chip:hover{border-color:color-mix(in srgb,var(--terra) 50%,transparent);color:var(--terra)}
.wf-tab{transition:border-color .15s,color .15s}
.wf-tab:hover{border-color:color-mix(in srgb,var(--terra) 50%,transparent);color:var(--terra)}
.wf-choice span{transition:border-color .15s,color .15s}
.wf-choice span:hover{border-color:color-mix(in srgb,var(--terra) 50%,transparent);color:var(--terra)}
/* switches (animate the knob) */
.wf-switch{cursor:pointer;transition:border-color .2s}
.wf-switch::after{transition:right .2s cubic-bezier(.4,0,.2,1),left .2s cubic-bezier(.4,0,.2,1),background .2s}
.wf-switch.off{border-color:color-mix(in srgb,var(--ink) 26%,transparent)}
.wf-switch.off::after{right:auto;left:2px;background:color-mix(in srgb,var(--ink) 26%,transparent)}
.wf-toggle,.wf-tog2{cursor:pointer}
/* matrix checkboxes (animate the fill) */
.wf-check{transition:border-color .15s}
.wf-check::after{content:"";position:absolute;inset:3px;background:var(--terra);opacity:0;transition:opacity .15s,transform .15s;transform:scale(.4)}
.wf-check.on::after{opacity:1;transform:scale(1)}
/* link-like affordances */
.wf-cellbox__go,.wf-move,.wf-mem__src,.wf-evi__src,.wf-pillar__l{cursor:pointer}


/* memory facts inside enclosed cells (Style Profile) */
.wf-memline{display:flex;align-items:baseline;gap:10px;margin-top:10px;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.375px;line-height:1.45}
.wf-memline b{flex:0 0 auto;font-weight:600;color:var(--ink)}
.wf-memline__v{flex:1 1 auto;min-width:0;color:color-mix(in srgb,var(--ink) 56%,transparent)}
.wf-memline__s{flex:0 0 auto;font-family:"Space Mono",monospace;font-size:9.775px;letter-spacing:.06em;text-transform:uppercase;color:var(--terra);white-space:nowrap;cursor:pointer}
.wf-memline__s:hover{text-decoration:underline}

.wf-cellbox--empty{background:var(--cream-ui)}
.wf-cells--flush{border-top:0}.wf-cellbox--band{padding:22px var(--wpad) 17px;background:var(--canvas)}.wf-cellbox--band-slim{padding:14px var(--wpad) 10px}.wf-cellbox--hero{padding:26px var(--wpad);background:var(--cream-ui)}.wf-led__intro{margin:11px 0 0;max-width:62ch;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:16.1px;line-height:1.55;color:color-mix(in srgb,var(--ink) 62%,transparent)}
.wf-conn .wf-cells,.wf-conn .wf-facts{margin-bottom:0}.wf-conn--flat .wf-cells{border-bottom:0}.wf-conn .wf-facts{border-top:0;border-bottom:0}.wf-conn .wf-cells:not(.wf-cells--flush){border-top:0;border-bottom:0}.wf-conn .wf-tbl tbody tr:last-child td{border-bottom:0}.wf-conn--top>.wf-sec:first-child{border-top:0;margin-top:12px}.wf-facts--lg .wf-fact{padding:20px var(--wpad)}.wf-facts--lg .wf-fact__v{font-size:25.3px;margin-top:9px}.wf-pms{margin-inline:calc(-1*var(--wpad))}.wf-pm{display:grid;grid-template-columns:1fr auto;grid-template-areas:"main edit""meta edit";gap:3px 16px;align-items:center;padding:18px var(--wpad);cursor:pointer;transition:background .15s}.wf-pm+.wf-pm{border-top:1px solid var(--hair)}.wf-pm:hover{background:color-mix(in srgb,var(--terra) 5%,transparent)}.wf-pm__main{grid-area:main;display:flex;align-items:center;gap:10px}.wf-pm__brand{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:17.25px;color:var(--ink)}.wf-pm__num{font-family:"Space Mono",monospace;font-size:13.8px;color:color-mix(in srgb,var(--ink) 62%,transparent)}.wf-pm__meta{grid-area:meta;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;color:color-mix(in srgb,var(--ink) 46%,transparent)}.wf-pm__edit{grid-area:edit;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:12.65px;letter-spacing:.05em;text-transform:uppercase;color:var(--terra);white-space:nowrap}.wf-conn--top{margin-top:-18px}
.wf-led-list{margin-inline:calc(-1*var(--wpad));background:var(--cream-ui)}.wf-led-list .wf-row{padding:14px var(--wpad);border-radius:0}.wf-led-list .wf-row+.wf-row{border-top:1px solid var(--hair)}.wf-led-list .wf-row:hover{background:color-mix(in srgb,var(--terra) 5%,var(--cream-ui))}
.wf-shelf__band{margin-inline:calc(-1*var(--wpad));display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:17px var(--wpad) 13px;border-top:1px solid var(--hair)}
.wf-shelf__t{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:18.975px;color:var(--ink)}
.wf-shelf__n{font-family:"Space Mono",monospace;font-size:10.925px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 40%,transparent)}
.wf-shelf__grid{margin-inline:calc(-1*var(--wpad));display:grid;gap:1px;background:var(--hair);border-top:1px solid var(--hair);grid-template-columns:repeat(auto-fit,minmax(178px,1fr))}
.wf-shelf:last-of-type .wf-shelf__grid{border-bottom:1px solid var(--hair)}
.wf-shelf__c{background:var(--cream-ui);display:flex;flex-direction:column;cursor:pointer;transition:background .15s}
.wf-shelf__c:hover{background:color-mix(in srgb,var(--terra) 6%,var(--cream-ui))}
.wf-shelf__img{aspect-ratio:4/3;background:color-mix(in srgb,var(--terra) 14%,var(--canvas));border-bottom:1px solid var(--hair)}
.wf-shelf__meta{padding:11px 15px 13px;display:flex;flex-direction:column;gap:8px;flex:1}
.wf-shelf__name{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:15.525px;line-height:1.25;color:var(--ink)}
.wf-shelf__row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto}
.wf-logs{margin-inline:calc(-1*var(--wpad));border-bottom:1px solid var(--hair);background:var(--cream-ui)}
.wf-log{display:flex;gap:18px;align-items:flex-start;padding:16px var(--wpad);cursor:pointer;transition:background .15s}
.wf-log+.wf-log{border-top:1px solid var(--hair)}
.wf-log:hover{background:color-mix(in srgb,var(--terra) 5%,var(--cream-ui))}
.wf-log__img{flex:0 0 auto;width:88px;height:66px;background:color-mix(in srgb,var(--terra) 14%,var(--canvas));border:1px solid var(--hair)}
.wf-log__main{flex:1;min-width:0}
.wf-log__head{display:flex;align-items:center;gap:11px;margin-bottom:5px}
.wf-log__room{font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:16.675px;color:var(--ink)}
.wf-log__txt{margin:0;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:14.375px;line-height:1.55;color:color-mix(in srgb,var(--ink) 56%,transparent);max-width:74ch}
.wf-band__h{margin:0;font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:25.3px;line-height:1.08;letter-spacing:-.015em;color:var(--ink)}
.wf-toast{position:absolute;left:50%;bottom:30px;transform:translate(-50%,12px);z-index:12;background:var(--ink);color:var(--on-orange);font-family:"Archivo",system-ui,sans-serif;font-weight:600;font-stretch:78%;font-size:14.95px;letter-spacing:.02em;padding:9px 16px;border-radius:3px;opacity:0;pointer-events:none;transition:opacity .22s,transform .22s}.wf-toast.show{opacity:1;transform:translate(-50%,0)}.is-hidden{display:none!important}.wf-efields{display:flex;flex-direction:column;gap:13px;margin:4px 0 2px}.wf-efield{display:flex;flex-direction:column;gap:5px}.wf-efield__l{font-family:"Space Mono",monospace;font-size:10.35px;letter-spacing:.13em;text-transform:uppercase;color:color-mix(in srgb,var(--ink) 46%,transparent)}.wf-input{width:100%;box-sizing:border-box;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:17.25px;color:var(--ink);background:var(--canvas);border:1px solid var(--hair);border-radius:3px;padding:9px 11px;outline:none}.wf-input:focus{border-color:var(--terra)}.wf-insp__p{margin:0 0 13px;font-family:"Archivo",system-ui,sans-serif;font-weight:400;font-stretch:78%;font-size:16.1px;line-height:1.55;color:color-mix(in srgb,var(--ink) 62%,transparent)}.wf-insp__act{margin-top:24px;display:flex;gap:10px;flex-wrap:wrap}.wf-insp__img{aspect-ratio:4/3;background:color-mix(in srgb,var(--terra) 14%,var(--cream-ui));border:1px solid var(--hair);margin-bottom:16px}.wf-insp__msgs{display:flex;flex-direction:column;gap:8px;margin:6px 0}.wf-insp__msg{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.95px;line-height:1.5;color:var(--ink);background:color-mix(in srgb,var(--ink) 5%,transparent);padding:9px 12px;border-radius:3px;max-width:92%}.wf-insp__msg.me{align-self:flex-end;background:color-mix(in srgb,var(--terra) 12%,transparent)}.wf-insp__msg b{font-weight:700;opacity:.55;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:2px}.wf-doc__head{display:flex;align-items:center;gap:12px;margin:2px 0 4px}.wf-doc__date{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:13.8px;color:color-mix(in srgb,var(--ink) 46%,transparent)}.wf-doc__line{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:baseline;padding:7px 0}.wf-doc__nm{font-family:"Archivo",system-ui,sans-serif;font-weight:500;font-stretch:78%;font-size:14.95px;color:var(--ink)}.wf-doc__q{font-family:"Space Mono",monospace;font-size:12.65px;color:color-mix(in srgb,var(--ink) 46%,transparent)}.wf-doc__p{font-family:"Space Mono",monospace;font-size:13.8px;color:var(--ink);text-align:right;min-width:64px}.wf-doc__rule{border-top:1px solid var(--hair);margin:7px 0 3px}.wf-doc__tot{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.95px;color:color-mix(in srgb,var(--ink) 56%,transparent)}.wf-doc__tot .v{font-family:"Space Mono",monospace;font-size:13.8px;color:var(--ink)}.wf-doc__tot--grand{font-weight:700;font-size:17.25px;color:var(--ink);padding-top:9px;margin-top:3px;border-top:1px solid var(--hair)}.wf-doc__tot--grand .v{font-size:16.1px}.wf-doc__addr{font-family:"Archivo",system-ui,sans-serif;font-stretch:78%;font-size:14.95px;line-height:1.55;color:color-mix(in srgb,var(--ink) 62%,transparent);margin:2px 0}.wf-doc__addr b{font-weight:600;color:var(--ink)}.wf-doc__addr--track{color:var(--terra)}`;

const BODY_HTML = `<!-- Reusable monochrome grain (matches your jsx Grain/feTurbulence) -->
<svg width="0" height="0" style="position:absolute"><filter id="fa-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></svg>

<!-- outline icon sprite (stroke, no fill) -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="fa-i-dashboard" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></symbol>
<symbol id="fa-i-sparkle" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></symbol>
<symbol id="fa-i-check" viewBox="0 0 24 24"><path d="M4 7h9"/><path d="M4 12h9"/><path d="M4 17h7"/><path d="M15.5 7.2l1.8 1.8 3.5-3.5"/></symbol>
<symbol id="fa-i-budget" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.5" r="1.2"/></symbol>
<symbol id="fa-i-chat" viewBox="0 0 24 24"><path d="M5 5h11a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 16 14H9l-4 3v-3.2A1.5 1.5 0 0 1 4 12.5v-6A1.5 1.5 0 0 1 5.5 5z"/></symbol>
<symbol id="fa-i-book" viewBox="0 0 24 24"><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 7v12"/></symbol>
<symbol id="fa-i-heart" viewBox="0 0 24 24"><path d="M12 20S5 15.6 5 10.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.6 12 20 12 20z"/></symbol>
<symbol id="fa-i-projects" viewBox="0 0 24 24"><path d="M4 7a1 1 0 0 1 1-1h4l2 2h7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></symbol>
<symbol id="fa-i-image" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l4-4 3 3 3-4 4 5"/></symbol>
<symbol id="fa-i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></symbol>
<symbol id="fa-i-bell" viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/></symbol>
<symbol id="fa-i-shield" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z"/></symbol>
<symbol id="fa-i-play" viewBox="0 0 24 24"><circle cx="7.5" cy="8" r="3"/><rect x="13" y="5" width="6" height="6" rx="1"/><path d="M8 14l4 6.2H4z"/></symbol>
</defs></svg>

<div class="route-sweep" aria-hidden="true"><i></i></div>

<div class="app">

  <div class="headrule" aria-hidden="true"></div>

  <!-- ════════ LEFT RAIL = navigation (sections) + legend ════════ -->
  <aside class="rail">
    <div class="railhead"><div class="brand">FURNISHES <b>「</b>STUDIO<b>」</b></div></div>

    <!-- search temporarily hidden -->
    <div class="railsearch" role="button" tabindex="0" aria-label="Search Studio" style="display:none">
      <svg class="railsearch__ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2L14 14"/></svg>
      <span class="railsearch__ph">Search Studio</span>
      <span class="railsearch__kbd">⌘K</span>
    </div>

    <div class="railscroll">
    <div class="group">
      <p class="group__h">Workspace</p>
      <nav class="modeswitch">
        <a class="tab is-active" data-view="dashboard"><span>Inspiration</span><span class="ix">[01]</span></a>
        <a class="tab" data-view="imagegen"><span>Image Gen</span><span class="ix">[02]</span></a>
        <a class="tab" data-view="chat"><span>Chat</span><span class="ix">[03]</span></a>
      </nav>
    </div>

    <div id="fa-rail-main">
    <div class="group">
      <p class="group__h">Overview</p>
      <ul class="nav">
        <li><a class="is-active" data-view="dashboard"><span>Dashboard</span></a></li>
      </ul>
    </div>
    <div class="group">
      <p class="group__h">How Eva Knows Me</p>
      <ul class="nav">
        <li><a data-view="style"><span>Style Profile</span></a></li>
        <li><a data-view="budget"><span>Budget</span></a></li>
        <li><a data-view="privacy"><span>Eva&rsquo;s Memory &amp; Data</span></a></li>
      </ul>
    </div>
    <div class="group">
      <p class="group__h">Design Work</p>
      <ul class="nav">
        <li><a data-view="conversations"><span>Conversations</span></a></li>
        <li><a data-view="shortlist"><span>Shortlist</span></a></li>
        <li><a data-view="projects"><span>Projects</span></a></li>
        <li><a data-view="uploads"><span>Uploads</span></a></li>
      </ul>
    </div>
    <div class="group">
      <p class="group__h">Orders &amp; Account</p>
      <ul class="nav">
        <li><a data-view="orders"><span>Orders</span></a></li>
        <li><a data-view="billing"><span>Billing</span></a></li>
        <li><a data-view="settings"><span>Settings</span></a></li>
        <li><a data-view="help"><span>Help &amp; Feedback</span></a></li>
      </ul>
    </div>
    </div>

    <div id="fa-rail-chat" hidden>
    <div class="group">
      <p class="group__h">Discover</p>
      <ul class="cnav">
        <li><a class="is-active" data-cnav="new"><svg class="ico" viewBox="0 0 24 24"><path d="M12 7v6"/><path d="M9 10h6"/><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>New Chat</span></a></li>
        <li><a data-cnav="project"><svg class="ico" viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg><span>Project</span></a></li>
        <li><a data-cnav="activity"><svg class="ico" viewBox="0 0 24 24"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg><span>Activity</span></a></li>
        <li><a data-cnav="files"><svg class="ico" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg><span>Files</span></a></li>
      </ul>
    </div>
    <div class="group">
      <p class="group__h">Design</p>
      <ul class="cnav">
        <li><a data-cnav="discover"><svg class="ico" viewBox="0 0 24 24"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg><span>Discover</span></a></li>
        <li><a data-cnav="recs"><svg class="ico" viewBox="0 0 24 24"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg><span>Recommendations</span></a></li>
                              </ul>
    </div>
    <div class="group">
      <p class="group__h">Recents</p>
      <ul class="cnav cnav--recent">
        <li><a data-cnav="recent"><span>Living room &mdash; Scandi warmth</span></a></li>
        <li><a data-cnav="recent"><span>Dining nook for the flat</span></a></li>
        <li><a data-cnav="recent"><span>Home office refresh</span></a></li>
      </ul>
      <div class="group__h" data-pinhead hidden style="margin-top:18px">Pinned</div>
      <ul class="cnav cnav--recent" data-pinlist></ul>
    </div>
    </div>
    </div>

    <!-- rail footer: bold compressed tagline + credit -->
    <div class="railfoot">
      <span class="hr-short" aria-hidden="true"></span>
      <h2 class="railfoot__title disp">A design studio where rooms move off-template</h2>
      <p class="railfoot__cr">©2026, Furnishes Studio Inc.</p>
      <div class="account">
        <span class="account__av">ML</span>
        <span class="account__name">Mohan Lu</span>
      </div>
    </div>
  </aside>

  <!-- ════════ RIGHT STAGE = real content + cartographic frame ════════ -->
  <section class="stage">

    <!-- mode tabs moved into the left rail (see .modeswitch) -->

    <!-- ░░ DASHBOARD, Plan B first screen ░░ -->
    <div class="canvas">
      <div class="dash">

        <header class="dash-head">
          <h1 class="dash-hi">Welcome back, <em>Mohan</em>.</h1>
          <p class="dash-status"><b>2</b> projects in progress · budget <b>69%</b> used</p>
        </header>

        <div class="ledger">
          <section class="row row--feature" aria-label="Identity and Eva">
            <a class="door door--feat" data-view="style">
              <span class="band-label">Style profile</span>
              <span class="feat-title">Warm Minimalist</span>
              <span class="feat-sub">Natural materials, low clutter, soft contrast, anchors every recommendation Eva makes.</span>
              <span class="palette"><i style="background:#DDD5C4"></i><i style="background:#B09470"></i><i style="background:#8C6B4F"></i><i style="background:#5E4B3A"></i><i style="background:#D9C9A3"></i></span>
              <span class="door__go">Open profile →</span>
              <span class="door__arr">↗</span>
            </a>
            <a class="door door--feat" data-resume style="cursor:pointer">
              <span class="band-label">Eva</span>
              <span class="feat-title">Continue with Eva</span>
              <span class="feat-sub">Last thread, “Oak console options for the entryway,” 2 hours ago.</span>
              <span class="door__go">Resume thread →</span>
              <span class="door__arr">↗</span>
            </a>
          </section>

          <section class="row row--work" aria-label="Workspaces">
            <a class="door" data-view="conversations">
              <span class="door__top"><span class="door__name">Conversations</span><span class="door__count">3</span></span>
              <span class="door__meta">4 conversations</span>
              <span class="door__prev">Oak console options for the entryway</span>
              <span class="door__arr">↗</span>
            </a>
            <a class="door" data-view="shortlist">
              <span class="door__top"><span class="door__name">Shortlist</span><span class="door__count">12</span></span>
              <span class="door__meta">+4 this week</span>
              <span class="door__prev">Söderhamn 3-seat sofa · S$1,299</span>
              <span class="door__arr">↗</span>
            </a>
            <a class="door" data-view="projects">
              <span class="door__top"><span class="door__name">Projects</span><span class="door__count">2</span></span>
              <span class="door__meta">1 in review</span>
              <span class="door__prev">Living room refresh · 80% sourced</span>
              <span class="door__arr">↗</span>
            </a>
            <a class="door" data-view="uploads">
              <span class="door__top"><span class="door__name">Uploads</span><span class="door__count">5</span></span>
              <span class="door__meta">2 pending</span>
              <span class="door__prev">Living room, north wall · analyzed</span>
              <span class="door__arr">↗</span>
            </a>
          </section>

          <section class="row row--util" aria-label="Money and saved">
            <a class="door door--util" data-view="budget">
              <span class="door__name">Budget</span>
              <span class="door__val">S$12,400 <span style="color:color-mix(in srgb,var(--ink) 40%,transparent)">/ S$18,000</span></span>
              <span class="door__track"><i style="width:69%"></i></span>
              <span class="door__go">Manage →</span>
              <span class="door__arr">↗</span>
            </a>
            <a class="door door--util" data-view="cart">
              <span class="door__name">Cart</span>
              <span class="door__val">4 items · S$4,909</span>
              <span class="door__go">Review order →</span>
              <span class="door__arr">↗</span>
            </a>
                      </section>
        </div>

        <div class="dash-act">
          <p class="band-label">Recent activity</p>
          <ul class="act">
            <li>Eva analyzed your Bedroom photo<span class="act__d">1h ago</span></li>
            <li>Added Noguchi coffee table to Shortlist<span class="act__d">Yesterday</span></li>
            <li>Living room refresh moved to sourcing<span class="act__d">2d ago</span></li>
            <li>Budget updated to S$18,000<span class="act__d">3d ago</span></li>
          </ul>
          <span class="dash-act__all" data-view="activity">View all activity →</span>
        </div>

      </div>
    </div>

    <!-- ░░ all other screens render here as lightweight wireframes ░░ -->
    <div class="wireview" hidden></div>
    <div class="wf-scrim" data-insp-close></div>
    <aside class="wf-insp"><span class="wf-insp__x" data-insp-close title="Close">\u2715</span><div class="wf-insp__body"></div></aside>
  </section>
</div>`;

export default function FurnishesAccount() {
  const rootRef = useRef(null);
  const runtimeRef = useRef(null);
  const [engineError, setEngineError] = useState(false);
  const [bootKey, setBootKey] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Fresh markup on every mount so remount / React Strict Mode never inherits mutated DOM.
    root.innerHTML = BODY_HTML;

    // Component-owned runtime: durable state + lifecycle handles (no window.__* globals).
    const RT = runtimeRef.current = { view: "dashboard", chat: null, prefs: null, listeners: [], timers: new Set(), intervals: new Set(), fontNodes: [] };
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => Array.prototype.slice.call(root.querySelectorAll(sel));
    const T = (fn, ms) => { const id = window.setTimeout(() => { RT.timers.delete(id); fn(); }, ms); RT.timers.add(id); return id; };
    const IV = (fn, ms) => { const id = window.setInterval(fn, ms); RT.intervals.add(id); return id; };

    // Fonts: only remove links THIS mount created (host-provided links are left alone).
    [
      ["preconnect", "https://fonts.googleapis.com"],
      ["preconnect", "https://fonts.gstatic.com", "anonymous"],
      ["stylesheet", FONT_HREF],
    ].forEach(([rel, href, cors]) => {
      if (document.querySelector('link[data-furn][href="' + href + '"]')) return;
      const l = document.createElement("link");
      l.rel = rel; l.href = href; l.dataset.furn = "1";
      if (cors) l.crossOrigin = cors;
      document.head.appendChild(l);
      RT.fontNodes.push(l);
    });

    // --- App engine: runs as real code against the markup mounted above ---
    try {
/* ── multi-view prototype: click any nav item / tab / KPI to switch the stage ── */
(function(){
  /* ── remount-proof lifecycle ──
     State lives in the component-owned runtime (RT) passed in from the effect; there is
     no window.* global state. Document-level listeners are registered through on() and
     tracked in RT.listeners, and every listener/timer/interval is removed by the effect
     cleanup on unmount, so a remount never doubles handlers, leaks timers, or replays. */
  var ST=RT;   /* component-owned runtime (no window.__* global state) */
  function on(t,f,c){document.addEventListener(t,f,c);ST.listeners.push([t,f,c]);}
  var sweep=$('.route-sweep');
  var insp=$('.wf-insp'),
      inspBody=insp.querySelector('.wf-insp__body'),
      scrim=$('.wf-scrim');
  var currentView=ST.view||'dashboard';
  function _ip(t){return '<p class="wf-insp__p">'+t+'</p>';}
  function _hd(eye,t){return '<p class="wf-eye">'+eye+'</p><h2 class="wf-insp__t">'+t+'</h2>';}
  function _act(a,b){return '<div class="wf-insp__act"><span class="wf-btn" data-insp-close>'+a+'</span>'+(b?'<span class="wf-btn ghost" data-insp-close>'+b+'</span>':'')+'</div>';}
  function _img(){return '<div class="wf-insp__img"></div>';}
  var inspSrc=null;
  function efields(items){return '<div class="wf-efields">'+items.map(function(f){return '<label class="wf-efield"><span class="wf-efield__l">'+f.l+'</span><input class="wf-input" value="'+String(f.v==null?'':f.v).replace(/"/g,'&quot;')+'"></label>';}).join('')+'</div>';}
  function _act2(a,act,b){return '<div class="wf-insp__act"><span class="wf-btn" data-insp-close data-act="'+act+'">'+a+'</span>'+(b?'<span class="wf-btn ghost" data-insp-close>'+b+'</span>':'')+'</div>';}
  function _grab(r,ss){for(var i=0;i<ss.length;i++){var n=r.querySelector(ss[i]);if(n&&n.textContent.trim())return n.textContent.trim();}return '';}
  function _ctx(el){
    var it=el.closest('.wf-cellbox,.wf-shelf__c,.wf-log,.wf-prow,.wf-frow,tr,.wf-row')||el;
    var title=_grab(it,['.wf-cellbox__t','.wf-shelf__name','.wf-log__room','.wf-log__head','.wf-tbl__t','.wf-pm__brand','.wf-frow__l','strong','b']);
    if(!title)title=(it.textContent||'').replace(/\s+/g,' ').trim().slice(0,56);
    inspSrc=it;var detail=_grab(it,['.wf-cellbox__d','.wf-shelf__row','.wf-log__txt','.wf-pm__meta','.wf-frow__v']);var meta=_grab(it,['.wf-cellbox__meta']);if(it.tagName==='TR'){var td=it.querySelectorAll('td');if(td.length>=3){if(!detail)detail=td[1].textContent.trim();if(!meta)meta=td[2].textContent.trim();}}return {title:title,detail:detail,meta:meta,view:currentView,action:(el.textContent||'').trim()};
  }
  function _type(c){var v=c.view,a=(c.action||'').toLowerCase();
    if(v==='settings'){if(a.indexOf('change')>=0)return 'changepw';if(a.indexOf('sign out')>=0)return 'signout';if(a.indexOf('edit')>=0)return 'editfield';return 'info';}
    if(v==='help')return 'read'; 
    if(v==='shortlist')return 'piece'; if(v==='uploads')return 'upload';
    if(v==='billing')return a.indexOf('edit')>=0?'editcard':'invoice';
    if(v==='orders')return 'order'; if(v==='projects')return 'project';
    if(v==='conversations')return 'thread'; return 'info';}
  var ORD={
    '#FZ-20614':{placed:'12 Jun 2026',status:['Delivered','on'],eta:'Delivered 14 Jun',track:'SG-SPX-88241990',addr:'Blk 123 Tampines St 11, #08-456, Singapore 521123',items:[['Söderhamn 3-seat sofa','1','S$1,299'],['Ferm Living wool rug','1','S$420']],sub:'S$1,719',ship:'Free',gst:'S$142',total:'S$1,719'},
    '#FZ-20588':{placed:'18 Jun 2026',status:['In transit',''],eta:'Arrives 24 Jun',track:'SG-SPX-88307711',addr:'Blk 123 Tampines St 11, #08-456, Singapore 521123',items:[['Noguchi coffee table','1','S$2,450']],sub:'S$2,450',ship:'Free',gst:'S$202',total:'S$2,450'},
    '#FZ-20571':{placed:'21 Jun 2026',status:['In transit',''],eta:'Arrives 27 Jun',track:'SG-SPX-88351204',addr:'Blk 123 Tampines St 11, #08-456, Singapore 521123',items:[['Artek Stool 60','2','S$620']],sub:'S$620',ship:'Free',gst:'S$51',total:'S$620'},
    '#FZ-20502':{placed:'2 Jun 2026',status:['Delivered','on'],eta:'Delivered 6 Jun',track:'SG-SPX-88102665',addr:'Blk 123 Tampines St 11, #08-456, Singapore 521123',items:[['Flos Arco floor lamp','1','S$3,100']],sub:'S$3,100',ship:'Free',gst:'S$256',total:'S$3,100'},
    '#FZ-20498':{placed:'28 May 2026',status:['Cancelled','mut'],eta:'Refunded 30 May',track:', ',addr:'Blk 123 Tampines St 11, #08-456, Singapore 521123',items:[['String shelving system','1','S$840']],sub:'S$840',ship:'Free',gst:'S$69',total:'S$840'}
  };
  var INV={
    'INV-2026-031':{issued:'12 Jun 2026',order:'#FZ-20614',status:['Paid','on'],method:'Visa •••• 4242'},
    'INV-2026-028':{issued:'2 Jun 2026',order:'#FZ-20502',status:['Paid','on'],method:'Visa •••• 4242'},
    'INV-2026-021':{issued:'28 May 2026',order:'#FZ-20498',status:['Refunded','mut'],method:'Visa •••• 4242'}
  };
  var BILLTO={name:'Mohan Lu',addr:['Blk 123 Tampines St 11, #08-456','Singapore 521123'],gst:'GST Reg 201xxxxxxR'};
  function _lines(items){return items.map(function(it){return '<div class="wf-doc__line"><span class="wf-doc__nm">'+it[0]+'</span><span class="wf-doc__q">×'+it[1]+'</span><span class="wf-doc__p">'+it[2]+'</span></div>';}).join('');}
  function _tots(o){return '<div class="wf-doc__rule"></div>'+
    '<div class="wf-doc__tot"><span>Subtotal</span><span class="v">'+o.sub+'</span></div>'+
    '<div class="wf-doc__tot"><span>Delivery</span><span class="v">'+o.ship+'</span></div>'+
    '<div class="wf-doc__tot"><span>GST (9% incl.)</span><span class="v">'+o.gst+'</span></div>'+
    '<div class="wf-doc__tot wf-doc__tot--grand"><span>Total</span><span class="v">'+o.total+'</span></div>';}
  var INSP={
    read:function(c){return _hd('Help article',c.title||'Article')+(c.detail?_ip(c.detail):'')+_ip('This guide walks through it step by step, or ask Eva in chat and she\u2019ll do it for you.')+sub('In this article')+'<div class="wf-choice" style="flex-wrap:wrap"><span class="on">Overview</span><span>Steps</span><span>FAQ</span></div>'+_act('Mark helpful','Close');},
    piece:function(c){return _hd('Saved piece',c.title||'Piece')+_img()+(c.detail?_ip(c.detail):'')+sub('Move to project')+'<div class="wf-choice"><span class="on">Living room refresh</span><span>Home office</span></div>'+'<div class="wf-insp__act"><span class="wf-btn" data-insp-close data-act="cart">Add to cart</span><span class="wf-btn ghost" data-insp-close data-act="remove">Remove</span></div>';},
    upload:function(c){return _hd('Room photo',c.title||'Photo')+_img()+sub('Eva\u2019s analysis')+_ip(c.detail||'Eva is still analyzing this room.')+'<div class="wf-insp__act"><span class="wf-btn" data-insp-close>Re-analyze</span><span class="wf-btn ghost" data-insp-close data-act="remove">Delete</span></div>';},
    invoice:function(c){var iv=INV[c.title];if(!iv)return INSP.info(c);var o=ORD[iv.order]||{items:[],sub:', ',ship:', ',gst:', ',total:', '};return _hd('Invoice',c.title)+'<div class="wf-doc__head">'+badge(iv.status[0],iv.status[1])+'<span class="wf-doc__date">Issued '+iv.issued+'</span></div>'+sub('Billed to')+'<p class="wf-doc__addr"><b>'+BILLTO.name+'</b><br>'+BILLTO.addr.join('<br>')+'<br>'+BILLTO.gst+'</p>'+sub('Items · '+iv.order)+_lines(o.items)+_tots(o)+'<p class="wf-doc__addr" style="margin-top:14px">Paid via '+iv.method+'</p>'+'<div class="wf-insp__act"><span class="wf-btn" data-insp-close>Download PDF</span><span class="wf-btn ghost" data-insp-close>Close</span></div>';},
    editcard:function(c){return _hd('Payment method',c.title||'Card')+efields([{l:'Card',v:c.title||''},{l:'Expiry',v:c.detail||''},{l:'Name on card',v:'Mohan Lu'}])+_act('Save card','Remove');},
    order:function(c){var o=ORD[c.title];if(!o)return INSP.info(c);return _hd('Order',c.title)+'<div class="wf-doc__head">'+badge(o.status[0],o.status[1])+'<span class="wf-doc__date">Placed '+o.placed+'</span></div>'+sub('Items')+_lines(o.items)+_tots(o)+sub('Delivery')+'<p class="wf-doc__addr">'+o.addr+'</p>'+'<p class="wf-doc__addr wf-doc__addr--track">'+(o.track!==', '?'Tracking '+o.track+' · '+o.eta:o.eta)+'</p>'+'<div class="wf-insp__act"><span class="wf-btn" data-insp-close>Track order</span><span class="wf-btn ghost" data-insp-close>Download invoice</span></div>';},
    project:function(c){return _hd('Project',c.title||'Project')+fields([{l:'Status',v:c.detail||'In progress'},{l:'Budget',v:c.meta||', '}])+_act('Open project','Close');},
    thread:function(c){return _hd('Conversation',c.title||'Thread')+'<div class="wf-insp__msgs"><div class="wf-insp__msg me"><b>Mohan</b>Can we find a sofa under S$1,500?</div><div class="wf-insp__msg"><b>Eva</b>Three options in your style, want them on your shortlist?</div></div>'+_act('Continue in chat','Close');},
    editfield:function(c){return _hd('Edit',c.title||'Field')+efields([{l:c.title||'Field',v:c.detail||''}])+_act2('Save','savefield','Cancel');},
    signout:function(c){return _hd('Sessions','Sign out?')+_ip('This ends the session on '+(c.title||'this device')+'. You\u2019ll need to sign in again there.')+_act('Sign out','Cancel');},
    changepw:function(){return _hd('Security','Change password')+fields([{l:'Current',v:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'},{l:'New',v:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'},{l:'Confirm',v:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}])+_ip('Use at least 12 characters with a mix of letters, numbers, and symbols.')+_act('Update','Cancel');},
    newproject:function(){return _hd('New project','Start a design effort')+efields([{l:'Name',v:'Untitled project'},{l:'Room',v:'Living room'},{l:'Budget',v:'S$5,000'}])+_act('Create','Cancel');},
    "new":function(c){return _hd('Create',c.title||'New item')+efields([{l:'Name',v:''},{l:'Notes',v:''}])+_act('Create','Cancel');},
    startreturn:function(c){return _hd('Returns','Start a return')+efields([{l:'Order',v:c.title||''},{l:'Reason',v:'Changed my mind'}])+_ip('Returns are free within 14 days for items in original condition.')+_act('Request return','Cancel');},
    addcard:function(){return _hd('Payment method','Add a card')+efields([{l:'Card number',v:''},{l:'Expiry',v:'MM/YY'},{l:'Name on card',v:'Mohan Lu'}])+_act('Add card','Cancel');},
    info:function(c){var e=(c.view||'details');return _hd(e.charAt(0).toUpperCase()+e.slice(1),c.title||'Details')+(c.detail?_ip(c.detail):'')+(c.meta?_ip(c.meta):'')+_act('Close');}
  };
  function openInsp(k,ctx){ var fn=INSP[k]||INSP.info; inspBody.innerHTML=fn(ctx||{}); insp.scrollTop=0;
    if(wireview&&wireview.style.display!=='none'&&!wireview.classList.contains('wireview--chat')){
      wireview.classList.add('wf-split');
      if(insp.parentElement!==wireview)wireview.appendChild(insp);
    }
    insp.classList.remove('open'); void insp.offsetWidth; insp.classList.add('open');
    [].slice.call($$('.insp-src')).forEach(function(x){x.classList.remove('insp-src');});
    if(inspSrc&&inspSrc.classList)inspSrc.classList.add('insp-src');
    runSweep(); }
  function closeInsp(){ insp.classList.remove('open');
    if(wireview)wireview.classList.remove('wf-split'); [].slice.call($$('.insp-src')).forEach(function(x){x.classList.remove('insp-src');}); }
  function showToast(m){ var t=$('.wf-toast'); if(!t){t=document.createElement('div');t.className='wf-toast';($('.stage')||document.body).appendChild(t);} t.classList.remove('act'); t.textContent=m+' \u2713'; t.classList.add('show'); clearTimeout(t._h); t._h=T(function(){t.classList.remove('show');},1500); }
  var UNDO_FN=null;
  function showUndoToast(m,fn){ var t=$('.wf-toast'); if(!t){t=document.createElement('div');t.className='wf-toast';($('.stage')||document.body).appendChild(t);} UNDO_FN=fn; t.innerHTML=''; t.appendChild(document.createTextNode(m+' ')); var b=document.createElement('button'); b.className='wf-undo'; b.setAttribute('data-undo',''); b.textContent='Undo'; t.appendChild(b); t.classList.add('show','act'); clearTimeout(t._h); t._h=T(function(){t.classList.remove('show','act');UNDO_FN=null;},5000); }
  function applyFilter(chip){
    var bar=chip.parentNode, label=(chip.textContent||'').replace(/[0-9]+$/,'').trim().toLowerCase();
    var NON=['all','newest','oldest','grid','list'];
    var blk=bar.nextElementSibling;
    while(blk&&!/wf-cells|wf-shelf|wf-logs|wf-list|wf-prows|wf-tbl/.test(blk.className||'')) blk=blk.nextElementSibling;
    if(!blk) return;
    var items=[].slice.call(blk.querySelectorAll('.wf-cellbox,.wf-shelf__c,.wf-log,.wf-row,.wf-prow,tr[data-view]'));
    var any=false;
    items.forEach(function(it){
      if(it.classList.contains('wf-cellbox--band')||it.classList.contains('wf-cellbox--empty'))return;
      var cat=(it.getAttribute('data-cat')||'').toLowerCase();
      var show=NON.indexOf(label)>=0||(cat?cat===label:(it.textContent||'').toLowerCase().indexOf(label)>=0);
      it.classList.toggle('is-hidden',!show); if(show)any=true;
    });
    if(!any) items.forEach(function(it){it.classList.remove('is-hidden');});
  }
  function switchOtab(tab){
    var bar=tab.parentNode, root=bar.parentNode, name=tab.dataset.otab;
    [].slice.call(bar.children).forEach(function(t){ if(t.dataset&&t.dataset.otab) t.classList.toggle('on', t===tab); });
    [].slice.call(root.querySelectorAll('[data-otabpanel]')).forEach(function(pn){ pn.hidden=(pn.dataset.otabpanel!==name); });
  }
  on('keydown',function(e){ if(e.key==='Escape') closeInsp(); });
  var canvas=$('.canvas');
  var wireview=$('.wireview');
  var navLinks=[].slice.call($$('.nav a'));
  var tabs=[].slice.call($$('.modeswitch .tab'));
  var taglineEl=$('.railfoot__title');
  var TAGLINES={
    dashboard:'A design studio where rooms move off-template',
    imagegen:'See the room before you build it',
    chat:'Every room starts as a conversation'
  };

  function runSweep(){
    if(!sweep) return;
    sweep.classList.remove('run'); void sweep.offsetWidth; sweep.classList.add('run');
    T(function(){sweep.classList.remove('run');},1200);
  }

  /* ---------- builders ---------- */
  function head(e,t,s,a){return '<header class="wf-head"><div class="wf-head__main"><p class="wf-eye">'+e+'</p><h1 class="wf-title">'+t+'</h1>'+(s?'<p class="wf-sub">'+s+'</p>':'')+'</div>'+(a?'<div class="wf-head__act">'+a+'</div>':'')+'</header>';}
  function sub(t){return '<p class="wf-eye" style="margin:0 0 13px">'+t+'</p>';}
  function sec(t){return '<div class="wf-sec"><p class="wf-eye">'+t+'</p></div>';}
  function mlbl(t){return '<p class="wf-mlbl">'+t+'</p>';}
  function slbl(t){return '<p class="wf-eye" style="margin:42px 0 16px">'+t+'</p>';}
  function facts(cols,items,cls){return '<div class="wf-facts '+(cls||'')+'" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+items.map(function(it){return '<div class="wf-fact"><div class="wf-fact__l">'+it[0]+'</div><div class="wf-fact__v">'+it[1]+'</div></div>';}).join('')+'</div>';}
  function togDesc(items){return items.map(function(it){return '<div class="wf-tog2"><div class="wf-tog2__main"><div class="wf-tog2__t">'+it[0]+'</div><div class="wf-tog2__d">'+it[1]+'</div></div><span class="wf-switch"></span></div>';}).join('');}
  function cells(cols,items){var inner=items.map(function(it){return '<div class="wf-cellbox"'+(it.view?' data-view="'+it.view+'"':'')+'>'+(it.top||(it.t?'<div class="wf-cellbox__t">'+it.t+'</div>':''))+(it.mid||'')+(it.d?'<div class="wf-cellbox__d">'+it.d+'</div>':'')+(it.go?'<div class="wf-cellbox__go">'+it.go+'</div>':'')+(it.meta?'<div class="wf-cellbox__meta">'+it.meta+'</div>':'')+'</div>';}).join('');var pad=(cols-items.length%cols)%cols;for(var i=0;i<pad;i++){inner+='<div class="wf-cellbox wf-cellbox--empty"></div>';}return '<div class="wf-cells" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+inner+'</div>';}
  function section(label,intro,cols,items,title){var band='<div class="wf-cellbox wf-cellbox--band'+(title?'':' wf-cellbox--band-slim')+'" style="grid-column:1/-1"><p class="wf-eye"'+(title?' style="margin:0 0 9px"':'')+'>'+label+'</p>'+(title?'<div class="wf-band__h">'+title+'</div>':'')+(intro?'<p class="wf-led__intro">'+intro+'</p>':'')+'</div>';var cell=items.map(function(it){return '<div class="wf-cellbox"'+(it.view?' data-view="'+it.view+'"':'')+'>'+(it.top||(it.t?'<div class="wf-cellbox__t">'+it.t+'</div>':''))+(it.mid||'')+(it.d?'<div class="wf-cellbox__d">'+it.d+'</div>':'')+(it.go?'<div class="wf-cellbox__go">'+it.go+'</div>':'')+(it.meta?'<div class="wf-cellbox__meta">'+it.meta+'</div>':'')+'</div>';}).join('');var pad=(cols-items.length%cols)%cols;for(var i=0;i<pad;i++)cell+='<div class="wf-cellbox wf-cellbox--empty"></div>';return '<div class="wf-cells wf-cells--flush" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+band+cell+'</div>';}
  function badge(l,v){return '<span class="wf-badge'+(v?' wf-badge--'+v:'')+'">'+l+'</span>';}
  function chips(items){return '<div class="wf-tools">'+items.map(function(c){return '<span class="wf-chip'+(c[2]?' on':'')+'">'+c[0]+(c[1]!=null?'<span class="ct">'+c[1]+'</span>':'')+'</span>';}).join('')+'</div>';}
  function tools(c,btn){var cc=c.map(function(x){return '<span class="wf-chip">'+x+'</span>';}).join('');return '<div class="wf-tools">'+cc+'<span class="sp"></span>'+(btn?'<span class="wf-btn">'+btn+'</span>':'')+'</div>';}
  function rowList(items){return '<div class="wf-list">'+items.map(function(it){
    return '<div class="wf-row" data-view="'+(it.view||'conversations')+'">'+(it.dot?'<span class="wf-dot"></span>':'')+'<div class="wf-row__main">'+
      '<span class="wf-row__t">'+it.t+'</span><span class="wf-row__p">'+it.p+'</span></div>'+
      '<span class="wf-row__m">'+it.m+'</span></div>';}).join('')+'</div>';}
  function fields(items){return items.map(function(it){
    return '<div class="wf-field"><span class="wf-field__lbl">'+it.l+'</span><span class="wf-field__val">'+it.v+'</span></div>';}).join('');}
  function toggles(items){return items.map(function(it){
    return '<div class="wf-toggle"><span class="wf-field__val">'+it+'</span><span class="wf-switch"></span></div>';}).join('');}
  function msgs(items){return items.map(function(m){
    return '<div class="wf-msg '+(m.me?'me':'')+'"><span class="wf-msg__role">'+(m.me?'You':'Eva')+'</span><span class="wf-msg__txt">'+m.x+'</span></div>';}).join('');}

  /* ---------- bodies (adapted to the real product, in my skin) ---------- */
  function conversationsBody(){
    var R=[
      ['Living room, Scandinavian warmth','Eva: shortlisted 4 sofas under your budget.',18,3,['Active','on'],'2h'],
      ['Dining nook for the HDB flat','Eva: 3 compact extendable tables.',24,2,['Active','on'],'2d'],
      ['Home office refresh','Eva: match the oak desk you saved?',12,2,['Shared','on'],'4d'],
      ['Bedroom lighting plan','You: warmer tones near the bed?',9,1,['Active','on'],'Yesterday'],
      ['Balcony styling','You: low-maintenance, shade-loving.',6,0,['Active','on'],'1w'],
      ['Entryway storage','Eva: a slim console with hooks could work.',7,1,['Archived','mut'],'2w'],
      ['Kids\u2019 room, playful but calm','Eva: drafted a soft, washable palette.',15,2,['Archived','mut'],'3w']
    ];
    var filt=chips([['All',7,1],['Active',5,0],['Archived',2,0],['Shared',1,0]]);
    var rows=R.map(function(r){
      return '<tr data-view="chat"><td><div class="wf-tbl__t">'+r[0]+'</div><div class="wf-tbl__d">'+r[1]+'</div></td>'+
        '<td class="num"><span class="wf-tbl__n">'+r[2]+'</span></td>'+
        '<td class="num"><span class="wf-tbl__n">'+r[3]+'</span></td>'+
        '<td>'+badge(r[4][0],r[4][1])+'</td>'+
        '<td class="num"><span class="wf-tbl__m">'+r[5]+'</span></td></tr>';
    }).join('');
    return filt+'<table class="wf-tbl"><thead><tr><th>Conversation</th><th class="num">Messages</th><th class="num">Prefs</th><th>Status</th><th class="num">Last activity</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function shortlistBody(){
    var G=[
      {p:'Living room refresh',items:[['S\u00f6derhamn 3-seat sofa','S$1,299'],['Noguchi coffee table','S$2,450'],['Ferm Living wool rug','S$420'],['Flos Arco floor lamp','S$3,100']]},
      {p:'Home office',items:[['String shelving system','S$840'],['Gubi Beetle chair','S$720']]},
      {p:'Unassigned',items:[['Muuto Fiber armchair','S$590'],['Hay Palissade bench','S$680'],['Artek Stool 60','S$310']]}
    ];
    var filt=chips([['Grid',null,1],['List',null,0]]);
    var body=G.map(function(g){
      var cells='<div class="wf-shelf__grid">'+g.items.map(function(it){
        return '<div class="wf-shelf__c" data-view="shortlist"><div class="wf-shelf__img"></div>'+
          '<div class="wf-shelf__meta"><span class="wf-shelf__name">'+it[0]+'</span>'+
          '<div class="wf-shelf__row"><span class="wf-price">'+it[1]+'</span><span class="wf-move">Move \u25be</span></div></div></div>';
      }).join('')+'</div>';
      return '<div class="wf-shelf"><div class="wf-shelf__band"><span class="wf-shelf__t">'+g.p+'</span><span class="wf-shelf__n">'+g.items.length+' pieces</span></div>'+cells+'</div>';
    }).join('');
    return filt+body;
  }
  function projectsBody(){
    var P=[
      {t:'Tampines HDB, full reno',st:['Sourcing','on'],meta:'8 rooms · budget S$18,000 · 2 collaborators',p:62},
      {t:'Living room refresh',st:['Sourcing','on'],meta:'4 pieces · budget S$7,200',p:80},
      {t:'Home office',st:['Planning',''],meta:'planning layout · budget S$2,500 · 1 collaborator',p:35},
      {t:'Balcony makeover',st:['Planning',''],meta:'concept · budget S$1,300',p:20}
    ];
    var filt=chips([['Active',4,1],['Archived',0,0]]);
    var rows='<div class="wf-plist">'+P.map(function(x){
      return '<div class="wf-prow" data-view="projects"><div class="wf-prow__l">'+
        '<div class="wf-prow__top"><span class="wf-row__t">'+x.t+'</span>'+badge(x.st[0],x.st[1])+'</div>'+
        '<span class="wf-row__p">'+x.meta+'</span></div>'+
        '<div class="wf-prow__r"><div class="wf-track"><i style="width:'+x.p+'%"></i></div><span class="wf-num">'+x.p+'%</span></div></div>';
    }).join('')+'</div>';
    return filt+rows;
  }
  function uploadsBody(){
    var U=[
      ['Living room, north wall','Eva: 3 anchor zones identified; the north wall takes a 2.4m sofa. Cool daylight from the left, pair with warm 2700K lamps.',['Analyzed','on']],
      ['Bedroom','Eva: lighting reads cool-toned. Layer warm sources; a textured headboard wall would soften the room.',['Analyzed','on']],
      ['Kitchen corner','Eva: 2 furniture gaps found, a slim bar-stool pair and under-counter storage.',['Analyzed','on']],
      ['Balcony','Eva: suggests vertical greenery and a compact bench; floor needs weather-resistant materials.',['Analyzed','on']],
      ['Entryway','Eva: needs slim storage, 38cm depth max before it blocks the door swing.',['Pending','']],
      ['Study nook','Eva: desk placement options pending, awaiting a wider shot of the window wall.',['Pending','']]
    ];
    var search='<div class="wf-search"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2L14 14"/></svg><span>Search by room, filename, analysis\u2026</span></div>';
    var filt=chips([['Newest',null,1],['Oldest',null,0]]);
    var rows='<div class="wf-logs">'+U.map(function(u){
      return '<div class="wf-log" data-view="uploads"><div class="wf-log__img"></div>'+
        '<div class="wf-log__main"><div class="wf-log__head"><span class="wf-log__room">'+u[0]+'</span>'+badge(u[2][0],u[2][1])+'</div>'+
        '<p class="wf-log__txt">'+u[1]+'</p></div></div>';
    }).join('')+'</div>';
    return '<div class="wf-toolrow">'+search+filt+'</div>'+rows;
  }
  function styleBody(){
    var pal=['#E4D5BE','#C8A87C','#9C7C57','#5E5141','#2A1E14'];
    var mood=[['Clay','oklch(0.72 0.08 30)',0],['Linen','oklch(0.88 0.05 60)',0],['Oak','oklch(0.55 0.1 45)',1],['Sage','oklch(0.62 0.06 120)',1],['Wheat','oklch(0.78 0.07 80)',0],['Cream','oklch(0.92 0.04 55)',0]];
    var heroInner='<div class="wf-2col"><div>'+
      '<p class="wf-eye" style="margin:0 0 10px">Your profile</p>'+
      '<div class="wf-cell__t" style="font-size:28.75px">Warm Minimalist</div>'+
      '<p class="wf-sub" style="margin-top:8px;max-width:42ch">Natural materials, low clutter, soft contrast, mid-century leaning with muted earth tones.</p>'+
      '<div style="margin-top:18px">'+sub('Palette')+'<div class="wf-pal">'+pal.map(function(h){return '<span style="background:'+h+'"><small>'+h+'</small></span>';}).join('')+'</div></div>'+
      '</div><div>'+sub('Mood board')+'<div class="wf-mood">'+mood.map(function(m){return '<div style="background:'+m[1]+';color:'+(m[2]?'#FBF0DC':'var(--ink)')+'">'+m[0]+'</div>';}).join('')+'</div></div></div>';
    var hero='<div class="wf-cells wf-cells--flush" style="grid-template-columns:1fr"><div class="wf-cellbox wf-cellbox--hero">'+heroInner+'</div></div>';
    var evi=section('Why Eva calls you this','The signals behind this label, each one traceable to something you actually did.',2,[
      ['You used \u201cearth tones\u201d in 4 recent conversations with Eva.','Review conversations \u2197','conversations'],
      ['You\u2019ve saved pieces in undyed wool, boucle linen, and solid oak, never synthetics.','See shortlist \u2197','shortlist'],
      ['Quiz result: 78% leaning Scandinavian-Japandi over Industrial or Maximalist.','Re-take quiz \u2197','style'],
      ['Your project \u201cTampines HDB\u201d has a profile centered on natural textures.','View project \u2197','projects']
    ].map(function(e){return {top:'<div class="wf-evi__tx">'+e[0]+'</div>',go:e[1],view:e[2]};}),'The evidence');
    var arch=section('How your profile differs from the others','Profiles that sit next to yours, close enough to compare, different enough to show what you\u2019re not.',2,[
      ['The Collector','\u201cA room should tell the whole story.\u201d','You layer natural textures; the Collector layers stories. Both warm, differently loud.',['#A8451F','#9C7C57','#D8CBB0','#3A2A1C','#D9C06A']],
      ['The Naturalist','\u201cLiving things are the best furniture.\u201d','A different answer to the same question: how should a room feel?',['#6E7E55','#9C8A6A','#D8CFB8','#37452C','#C9C39A']],
      ['The Structuralist','\u201cHonest material. Honest form.\u201d','You soften rooms with living materials; Structuralists leave structure exposed.',['#6E7E66','#86A0A6','#C2A57C','#2A2A28','#CFCBB8']],
      ['The Maker','\u201cThe hand is always visible.\u201d','You favor what grows; Makers favor what\u2019s shaped. Both honor hand and process.',['#9C7C57','#6E7E55','#D8CBB0','#8C3A1F','#CFC6AE']]
    ].map(function(a){return {t:a[0],mid:'<div class="wf-arch__q">'+a[1]+'</div><div class="wf-cellbox__sw">'+a[3].map(function(c){return '<i style="background:'+c+'"></i>';}).join('')+'</div>',d:a[2]};}),'Adjacent tastes');
    var mem=section('What Eva remembers','The granular taste signals behind your profile, each linked to where Eva learned it. Correct anything that\u2019s off.',2,preferencesBody(),'The fine print');
    var space=section('About your space','So Eva only suggests pieces that physically fit your home.',2,profileBody(),'The room itself');
    var pil=section('How Eva uses this','Where this profile quietly shapes what Furnishes shows you.',3,[
      {t:'Filters collections',d:'Eva narrows Collections to pieces that fit your language, not everything, just what matters.',go:'Browse \u2197',view:'shortlist'},
      {t:'Anchors conversations',d:'Eva picks up where your style leaves off instead of starting from zero.',go:'Chat with Eva \u2197',view:'chat'},
      {t:'Shapes your shortlist',d:'Every saved piece carries a short rationale tying it back to your profile.',go:'View shortlist \u2197',view:'shortlist'}
    ],'Put to work');
    return '<div class="wf-conn wf-conn--top">'+hero+evi+arch+mem+space+pil+'</div>';
  }
  function preferencesBody(){
    var G=[
      ['Style',[['Leaning','Warm minimalist \u00b7 Scandinavian-Japandi','from quiz','conversations'],['Avoids','Glass tables, cool greys, high-gloss','from 3 chats','conversations']]],
      ['Materials',[['Loves','Undyed wool, boucle linen, solid oak','from shortlist','shortlist'],['Never','Synthetics, chrome','from shortlist','shortlist']]],
      ['Rooms',[['Active','Living room, bedroom, home office','from projects','projects']]],
      ['Must-haves',[['Always','Layered warm lighting; one hero piece per room','from Eva','style']]],
      ['Deal-breakers',[['Won\u2019t do','Open kitchen shelving; bar-height dining','from 2 chats','conversations']]],
      ['Budget',[['Range','S$15,000 \u2013 S$20,000 across the flat','from budget','budget']]]
    ];
    return G.map(function(g){
      var lines=g[1].map(function(r){return '<div class="wf-memline"><b>'+r[0]+'</b><span class="wf-memline__v">'+r[1]+'</span><span class="wf-memline__s" data-view="'+r[3]+'">'+r[2]+' \u2197</span></div>';}).join('');
      return {top:'<div class="wf-cellbox__t">'+g[0]+'</div>'+lines};
    });
  }
  function profileBody(){
    return [
      {top:'<div class="wf-cellbox__t" style="margin-bottom:12px">Property type</div><div class="wf-choice"><span class="on">HDB</span><span>Condo</span><span>Landed</span><span>Rental</span><span>Other</span></div>'},
      {top:'<div class="wf-cellbox__t" style="margin-bottom:4px">Dimensions</div>'+fields([{l:'Main room',v:'4.2 \u00d7 3.6 m'},{l:'Ceiling height',v:'2.6 m'},{l:'Doorway width',v:'0.9 m'}])}
    ];
  }
  function budgetBody(){
    var rooms=[['Living room','Sofa, lighting, rug, coffee table','S$7,200',100],['Bedroom','Bed frame, side tables, lamps','S$4,000',56],['Dining','Table, 4 chairs','S$3,000',42],['Home office','Desk, chair, shelving','S$2,500',35],['Balcony','Bench, planters','S$1,300',18]];
    var hero='<div class="wf-bigstat"><span class="wf-bignum">S$18,000</span></div>'+
      '<p class="wf-sub" style="margin:10px 0 0;max-width:48ch">Working budget, within the S$15k\u201320k range you set.</p>'+
      '<div class="wf-track" style="margin-top:18px;max-width:560px"><i style="width:90%"></i></div>'+
      '<p class="wf-tag" style="margin:9px 0 26px">90% of your S$20k ceiling planned</p>'+
      facts(3,[['Range','S$15k \u2013 20k'],['Spent so far','S$8,900'],['Remaining','S$9,100']]);
    var alloc=slbl('Allocation by room')+'<div class="wf-alloc">'+rooms.map(function(r){
      return '<div class="wf-alloc__row"><div><div class="wf-alloc__name">'+r[0]+'</div><div class="wf-alloc__desc">'+r[1]+'</div></div>'+
        '<div class="wf-alloc__bar"><i style="width:'+r[3]+'%"></i></div>'+
        '<div class="wf-alloc__amt">'+r[2]+'</div></div>';
    }).join('')+'</div>';
    var bench=[['Living room sofa (condo)','S$1,200 \u2013 3,500'],['Bedroom bed + mattress (queen)','S$1,500 \u2013 4,000'],['Dining table (6-seater)','S$800 \u2013 2,500'],['Wardrobe (2-door)','S$600 \u2013 1,800'],['Lighting (room set)','S$300 \u2013 1,200'],['Rug (200\u00d7300cm)','S$250 \u2013 1,500']];
    var benchHtml=slbl('SG benchmarks')+'<p class="wf-sub" style="margin:-4px 0 18px;max-width:60ch">Typical Singapore price ranges, so you can sanity-check each allocation.</p><div class="wf-bench">'+bench.map(function(b){return '<div class="wf-bench__row"><span class="wf-bench__l">'+b[0]+'</span><span class="wf-bench__v">'+b[1]+'</span></div>';}).join('')+'</div>';
    return '<div class="wf-conn">'+hero+alloc+benchHtml+'</div>';
  }

  function escT(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function hlRender(t){return escT(t).replace(/\[\[(.+?)\]\]/g,'<mark class="wf-hl" data-ent>$1</mark>');}
  function plainT(t){return String(t).replace(/\[\[|\]\]/g,'');}
  function fmtT(ts){var d=new Date(ts);return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
  function dayKey(ts){var d=new Date(ts);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
  function fmtDay(ts){var n=Date.now();if(dayKey(ts)===dayKey(n))return 'Today';if(dayKey(ts)===dayKey(n-86400000))return 'Yesterday';return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});}
  function daySepHtml(ts){return '<div class="wf-daysep"><span>'+fmtDay(ts)+'</span></div>';}
  function renderRow(m,i,fresh){
    var mt=m.ts?'<span class="wf-mtime">'+fmtT(m.ts)+'</span>':'';
    if(m.role==='user'){
      return '<div class="wf-cmsg wf-cmsg--me'+(fresh?' wf-cmsg--in':'')+'" data-mi="'+i+'"><span class="wf-cav wf-cav--me">Y</span><div class="wf-cbody"><div class="wf-bub">'+escT(m.x)+penHtml(i)+'</div>'+(m.ex?exBlockHtml(m,i):'')+mt+'</div></div>';
    }
    var inner;
    if(m.done)inner=hlRender(m.x);
    else if(m.x)inner=escT(m.x);
    else if(m.think)inner='<span class="wf-think"><span class="wf-shape"></span><span class="wf-think__t" data-think-t>'+escT(m.think[0]||'Thinking\u2026')+'</span></span>';
    else inner='<span class="wf-tdots"><span></span><span></span><span></span></span><span class="wf-tlabel">'+escT(m.lbl||'Thinking')+'</span>';
    var after='';
    if(m.done&&m.stopped)after+='<p class="wf-stopnote"><b>Stopped.</b> Your partial reply is kept above, send another message to continue.</p>';
    if(m.done&&m.err==='timeout')after+='<p class="wf-stopnote"><b>Timed out.</b> The reply took too long to finish.</p>';
    if(m.done&&m.err)after+=(i===CHATM.length-1?errActionsHtml(m,i):'');
    if(m.done&&!m.stopped&&!m.err){after+=fbRowHtml(i);if(m.lc)after+=lowconfHtml();}
    var bubCls=((m.err&&m.err!=='timeout')?' wf-bub--err':'')+((!m.done&&!m.x&&m.think)?' wf-bub--ghost':'');
    return '<div class="wf-cmsg'+(fresh?' wf-cmsg--in':'')+'" data-mi="'+i+'"><span class="wf-cav wf-cav--eva">E</span><div class="wf-cbody"><div class="wf-bub'+bubCls+'">'+inner+'</div>'+after+mt+'</div></div>';
  }
  function chatMsgsHtml(list){
    var out='';list.forEach(function(m,i){var pv=list[i-1];
      out+=renderRow(m,i,false);});
    return out;}
  /* ── r3: message store (remount-proof via ST) + append-only send pipeline ── */
  /* -- r7: multi-session store (remount-proof) -- */
  var STORE=ST.store||(ST.store={sessions:[],seq:0,seeded:false});
  function newSession(title){var se={id:++STORE.seq,title:title||'New chat',msgs:[],chipsSwapped:false,costWarned:false,lastReview:0,draft:'',star:false,upd:Date.now()};STORE.sessions.unshift(se);return se;}
  if(ST.msgs&&ST.msgs.length&&!ST.migrated){ST.migrated=true;var _mo=newSession('Earlier chat');_mo.msgs=ST.msgs;ST.msgs=null;}
  if(!STORE.seeded){STORE.seeded=true;(function(){var D=86400000,n=Date.now();
    var a=newSession('Home office refresh');a.upd=n-4*D;a.msgs=[
      {role:'user',x:'My home office needs a refresh, where do I start?',ts:n-4*D,done:true},
      {role:'eva',x:'Start at the desk wall: a [[2.4m oak worktop]], cable tray underneath, and one soft task lamp. Send me a photo and I\u2019ll zone it.',ts:n-4*D+60000,done:true}];
    var b=newSession('Living room, Scandi warmth');b.upd=n-2*D;b.msgs=[
      {role:'user',x:'I want the living room warmer but still scandinavian.',ts:n-2*D,done:true},
      {role:'eva',x:'Keep the pale base, add [[oat wool textiles]] and one clay accent, warmth without losing the scandi calm.',ts:n-2*D+45000,done:true}];
    var c=newSession('Dining nook for the flat');c.upd=n-D;c.msgs=[
      {role:'user',x:'Can we fit a dining nook in the flat?',ts:n-D,done:true},
      {role:'eva',x:'Yes, a [[bench-against-the-wall]] layout frees 40cm. I\u2019d pair a 110cm round table with two light chairs.',ts:n-D+90000,done:true}];})();}
  var CHAT=null;STORE.sessions.forEach(function(x){if(x.id===ST.activeId)CHAT=x;});
  if(!CHAT)CHAT=newSession();
  ST.activeId=CHAT.id;
  var CHATM=CHAT.msgs;
  function titleFor(v){var tl=v.toLowerCase();
    if(/living room/.test(tl))return 'Living room direction';
    if(/home office/.test(tl))return 'Home office setup';
    if(/bedroom/.test(tl))return 'Bedroom plan';
    if(/open plan/.test(tl))return 'Open-plan zoning';
    if(/sofa/.test(tl))return 'Sofa shortlist';
    if(/rug/.test(tl))return 'Rug pairing';
    if(/light/.test(tl))return 'Lighting plan';
    if(/palette|color/.test(tl))return 'Palette exploration';
    if(/floorplan|layout/.test(tl))return 'Floor plan review';
    if(/mood/.test(tl))return 'Mood image direction';
    if(/budget|\$/.test(tl))return 'Budget planning';
    var w=v.split(/\s+/).slice(0,4).join(' ');return w.length<v.length?w+'\u2026':w;}
  function paintRecents(){var ul=$('#fa-rail-chat .cnav--recent');if(!ul)return;
    var list=STORE.sessions.filter(function(x){return !x.temp;}).sort(function(a,b){return b.upd-a.upd;});
    ul.innerHTML=list.map(function(se){return '<li><a data-sess="'+se.id+'"'+(se.id===CHAT.id?' class="is-active"':'')+'><span>'+escT(se.title)+'</span></a></li>';}).join('');
    if(typeof paintPins==='function')paintPins();}
  function flushDraft(){var ta=chatEls().ta;if(ta&&CHAT)CHAT.draft=ta.value;}
  function finalizeActiveStream(){if(typeof stopThinkRotor==='function')stopThinkRotor();if(STREAM.timer){clearInterval(STREAM.timer);STREAM.timer=null;}
    if(STREAM.on){var lm=CHATM[CHATM.length-1];
      if(lm&&lm.role==='eva'&&!lm.done){if(lm.full){lm.x=plainT(lm.full);lm.done=true;}else if(String(lm.x).trim()){lm.done=true;}else{CHATM.pop();}}
      STREAM.on=false;STREAM.mi=-1;}}
  var EIC={home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    kase:'<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'};
  function emptyStateHtml(){
    var ROOMS=[['home','Living Room','living room'],['kase','Home Office','home office'],['moon','Bedroom','bedroom'],['sun','Open Plan','open plan']];
    var cards=ROOMS.map(function(r,ri){return '<button class="wf-room" data-room="'+r[2]+'"><span class="wf-room__ix">[0'+(ri+1)+']</span><span class="wf-room__t">'+r[1]+'</span><span class="wf-room__d">'+focusCopy(r[2])+'</span></button>';}).join('');
    return '<div class="wf-empty"><div class="wf-empty__av">E</div>'+
      '<h2 class="wf-empty__h">How can I help you today?</h2>'+
      '<p class="wf-empty__p">You\u2019re chatting with '+escT(curPersona().n)+', '+escT(curPersona().tag)+'. Pick a room to start, or describe your space in your own words.</p>'+
      '<div class="wf-rooms">'+cards+'</div>'+
      '<p class="wf-empty__hint">Type a message, Eva replies in seconds.</p></div>';}
  function chatBodyCore(){return CHATM.length?('<div class="wf-msgs">'+chatMsgsHtml(CHATM)+'</div>'):emptyStateHtml();}
  function paintCrumb(){var el=$('[data-crumb-title]');
    if(el)el.textContent=ST.chatSec&&SEC[ST.chatSec]?SEC[ST.chatSec].t:(CHAT.temp?'Temporary chat':CHAT.title);
    var bt=$('.wf-crumb__t');
    if(bt)bt.classList.toggle('nochev',!ST.chatSec&&!CHAT.temp&&CHAT.title==='New chat');
    closeCrumbDD();}
  function secClass(on){var cx=$('.wf-cx');if(cx)cx.classList.toggle('seco',!!on);}
  function secShell(key,inner){var d=SEC[key];
    return '<div class="wf-secv"><h1 class="wf-secv__h">'+d.t+'</h1><p class="wf-secv__sub">'+d.sub+'</p>'+inner+'</div>';}
  function sbtn(label,attr){return '<span class="wf-exbtn" '+attr+'>'+label+'</span>';}
  function agoStr(ts){var m=Math.max(1,Math.round((Date.now()-ts)/60000));if(m<60)return m+'m ago';var h=Math.round(m/60);if(h<24)return h+'h ago';return Math.round(h/24)+'d ago';}
  function slStore(){ST.shortlist=ST.shortlist||{};return ST.shortlist;}
  function fmicon(kind){return kind==='Floorplans'?'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h7v9"/><path d="M10 12V3"/><path d="M14 8h7"/>':kind==='Images'?'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>';}
  function secProject(){
    var live=STORE.sessions.filter(function(x){return !x.temp&&x.msgs.length;});
    var rows=live.map(function(se){return '<div class="wf-srow"><svg class="wf-srow__i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="wf-srow__b"><span class="wf-srow__t">'+escT(se.title)+'</span><span class="wf-srow__m">'+se.msgs.length+' messages \u00b7 '+agoStr(se.upd)+'</span></span>'+sbtn('Open','data-sec-sess="'+se.id+'"')+'</div>';}).join('');
    ST.tasks=ST.tasks||{};
    var tasks=[['Confirm the room preferences with Eva','conversation','in progress \u00b7 high'],['Approve one moodboard direction','review','queued \u00b7 medium'],['Pick a delivery week for the console','orders','queued \u00b7 low']];
    var trows=tasks.map(function(t,i2){var on=!!ST.tasks[i2];
      return '<div class="wf-srow"><span class="wf-ck'+(on?' on':'')+'" data-task="'+i2+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg></span><span class="wf-srow__b"><span class="wf-srow__t"'+(on?' style="text-decoration:line-through;opacity:.6"':'')+'>'+t[0]+'</span><span class="wf-srow__m">'+t[1]+'</span></span><span class="wf-tstat">'+t[2]+'</span></div>';}).join('');
    var sl=slStore();var slNames=Object.keys(sl).filter(function(k2){return sl[k2];});
    var slrows=slNames.length?slNames.map(function(n){return '<div class="wf-srow"><span class="wf-rthumb" style="width:38px;height:38px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16V11a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/></svg></span><span class="wf-srow__b"><span class="wf-srow__t">'+escT(n)+'</span><span class="wf-srow__m">saved from recommendations</span></span>'+sbtn('Remove','data-sl="'+escT(n).replace(/"/g,'&quot;')+'"')+'</div>';}).join(''):'<p class="wf-scard__d">Nothing shortlisted yet, pick pieces in <span class="wf-alink" data-sec-open="recs">Recommendations</span>.</p>';
    return '<div class="wf-scard"><p class="wf-scard__t">Bedroom refresh<span class="wf-schip terra">Active</span></p><p class="wf-scard__d">Shared with Ana K. and Studio Eva \u00b7 started 3 weeks ago.</p>'+
      '<div class="wf-scard__act">'+sbtn('Open project chat','data-sec-back')+sbtn('Team review &amp; timeline','data-sec-toast="Team review is out of wireframe scope"')+sbtn('Invite (demo)','data-sec-toast="Invite link copied (demo)"')+'</div></div>'+
      '<p class="wf-sec__lbl">Tasks</p>'+trows+
      '<p class="wf-sec__lbl">Shortlist</p>'+slrows+
      '<p class="wf-sec__lbl">Conversations in this project</p>'+(rows||'<p class="wf-scard__d">No conversations yet.</p>');}
  function secActivity(){
    ST.actRead=ST.actRead||{};
    var items=[];var n=Date.now();
    Object.keys(PREFS).forEach(function(k){if(PREFS[k].v)items.push({id:'p_'+k,cat:'Preference',t:PREFS[k].label+' set to '+capT(PREFS[k].v),b:'Eva will use this in every reply for this project.',ts:n-3*60000,proj:true});});
    STORE.sessions.forEach(function(se){se.msgs.forEach(function(mm){if(mm.pinned)items.push({id:'pin_'+se.id+'_'+se.msgs.indexOf(mm),cat:'Pinned',t:'\u201c'+plainT(mm.x).slice(0,42)+'\u2026\u201d',b:'Saved from \u201c'+escT(se.title)+'\u201d.',ts:n-9*60000,proj:false});});});
    items.push({id:'a1',cat:'Order',t:'Delivery scheduled, Oak console',b:'Order #4211 arrives Thursday between 9\u201312. A signature is needed.',ts:n-26*3600000,proj:true});
    items.push({id:'a2',cat:'Comment',t:'Ana K. commented on the moodboard',b:'\u201cLove the clay accent, keep it. Less rattan though.\u201d',ts:n-2*86400000,proj:true});
    return items.map(function(it){var rd=!!ST.actRead[it.id];
      return '<div class="wf-srow wf-arow'+(rd?' read':'')+'"><span class="wf-srow__b"><span class="wf-acat">'+it.cat+'</span><span class="wf-srow__t" style="display:block">'+it.t+'</span><p class="wf-abody">'+it.b+'</p><span class="wf-srow__m">'+(it.proj?'Project: <span class="wf-alink" data-sec-open="project">Bedroom refresh</span> \u00b7 ':'')+agoStr(it.ts)+(rd?' \u00b7 read':'')+'</span></span>'+(rd?'':sbtn('\u2713 Mark read','data-act-read="'+it.id+'"'))+'</div>';}).join('');}
  function filesList(){
    var out=[{n:'floorplan-v2.png',c:'Floorplans',m:'1.2 MB \u00b7 uploaded 2d ago',d:'Scaled plan of the 68m\u00b2 flat with the new sofa footprint marked.'},{n:'moodboard-warm.pdf',c:'Documents',m:'3.4 MB \u00b7 generated by Eva',d:'Nine-frame warm-minimal direction with clay accents.'},{n:'summary-v1.md',c:'Documents',m:'2 KB \u00b7 exported 5d ago',d:'First export of the project summary.'}];
    STORE.sessions.forEach(function(se){se.msgs.forEach(function(mm){var mt=String(mm.x).match(/\[attached: ([^\]]+)\]/);if(mt)out.push({n:mt[1],c:'Images',m:'attached in \u201c'+se.title+'\u201d',d:'Uploaded by you during the conversation.'});});});
    return out;}
  function secFiles(){
    var sel=ST.fsel;var list=filesList();
    var cards=function(ls){return ls.map(function(f){return '<div class="wf-fcard'+(sel===f.n?' on':'')+'" data-fcat="'+f.c+'" data-file-open="'+escT(f.n).replace(/"/g,'&quot;')+'"><div class="wf-fthumb k-'+f.c+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">'+fmicon(f.c)+'</svg></div><div class="wf-fcard__b"><span class="wf-srow__t" style="display:block">'+escT(f.n)+'</span><span class="wf-srow__m">'+f.c+' \u00b7 '+f.m+'</span></div></div>';}).join('');};
    if(sel){var f=list.filter(function(x){return x.n===sel;})[0];
      if(f)return '<div class="wf-fsplit"><div class="wf-fsplit__list"><div class="wf-fgrid" data-file-list>'+cards(list)+'</div></div>'+
        '<div class="wf-fsplit__det">'+
        '<div class="wf-fdet__hero"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">'+fmicon(f.c)+'</svg></div>'+
        '<p class="wf-scard__t" style="font-size:17px">'+escT(f.n)+'</p><p class="wf-scard__d">'+f.d+'</p>'+
        '<div class="wf-scard__act" style="margin-top:10px"><span class="wf-kchip">'+f.c+'</span><span class="wf-kchip">'+f.m+'</span></div>'+
        '<div class="wf-scard__act" style="margin-top:14px">'+sbtn('\u2193 Download','data-sec-toast="Download started (demo)"')+sbtn('Ask Eva about this file','data-sec-chat="What should I do with '+escT(f.n)+'?"')+'</div>'+
        '</div></div>';
      ST.fsel=null;}
    var cats=['All','Documents','Floorplans','Images'];
    return '<div class="wf-sfilter">'+cats.map(function(c,i2){return '<span class="wf-chip2'+(i2===0?' is-active':'')+'" data-file-cat="'+c+'">'+c+'</span>';}).join('')+'</div>'+
      '<div class="wf-fgrid" data-file-list>'+cards(list)+'</div>';}
  function secDiscover(){
    ST.dch=ST.dch||{};
    var msgsN=(CHATM||[]).length;
    var ready=msgsN>=2;
    var ins=[];
    if(PREFS.color.v)ins.push(['You lean '+PREFS.color.v,'Across recent chats you kept returning to this palette. Worth committing to it for textiles.','What textiles suit '+PREFS.color.v+'?']);
    if(PREFS.budget.v)ins.push(['Budget discipline: '+PREFS.budget.v,'Eva filtered 14 candidate pieces down to 6 that respect this ceiling.','Show pieces inside my budget']);
    if(PREFS.style.v)ins.push(['Direction: '+capT(PREFS.style.v),'Your saved pins and confirmations agree on this direction.','Push the '+PREFS.style.v+' direction further']);
    if(!ins.length)ins.push(['Your preferences are still warming up','Confirm a couple of them in chat and insights will land here.','Help me set my preferences']);
    ins.push(['Lighting is your open question','Three chats touched lighting without a decision, one focused session would close it.','Plan my lighting in one pass']);
    var checks=[['Swap the overhead pendant for two 2700K lamps','Lighting'],['Add one textured throw to soften the sofa line','Textiles'],['Test a 2.4m rug size before ordering','Layout']];
    var chr=checks.map(function(c,i2){var on=!!ST.dch[i2];
      return '<div class="wf-srow"><span class="wf-ck'+(on?' on':'')+'" data-dch="'+i2+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg></span><span class="wf-srow__b"><span class="wf-srow__t"'+(on?' style="text-decoration:line-through;opacity:.6"':'')+'>'+c[0]+'</span><span class="wf-srow__m">'+c[1]+'</span></span>'+sbtn('Discuss','data-sec-chat="'+c[0].replace(/"/g,'&quot;')+', talk me through it"')+'</div>';}).join('');
    return '<p class="wf-sec__lbl"><span class="wf-statdot'+(ready?'':' wait')+'"></span>Key insights'+(ready?'':'<span class="wf-lblhint">unlocks after a few more messages</span>')+'</p>'+ins.map(function(x){return '<div class="wf-scard"><p class="wf-scard__t">'+escT(x[0])+'</p><p class="wf-scard__d">'+escT(x[1])+'</p><div class="wf-scard__act">'+sbtn('Discuss in chat','data-sec-chat="'+escT(x[2]).replace(/"/g,'&quot;')+'"')+'</div></div>';}).join('')+
      '<p class="wf-sec__lbl">Topics</p><div class="wf-topics">'+['lighting','layout','textiles','budget','color palette'].map(function(t){return sbtn(t,'data-sec-chat="Let\u2019s dig into '+t+' next."');}).join('')+'</div>'+
      '<p class="wf-sec__lbl"><span class="wf-statdot"></span>Recommendations<span class="wf-lblhint">check off what you\u2019ve handled</span></p>'+chr+
      '<div class="wf-scard" style="margin-top:9px"><p class="wf-scard__d">4 pieces match your current preferences.</p><div class="wf-scard__act">'+sbtn('Open recommendations','data-sec-open="recs"')+'</div></div>';}
  function secRecs(){
    var sl=slStore();
    var why=function(){var w=[];if(PREFS.style.v)w.push('fits your '+PREFS.style.v+' direction');if(PREFS.budget.v)w.push('inside '+PREFS.budget.v);if(PREFS.color.v)w.push('pairs with '+PREFS.color.v);return w.length?capT(w.join(' \u00b7 ')):'A safe anchor piece for most warm interiors';};
    var items=[['S\u00f6derhamn 3-seat sofa','S$1,295','Sofa','Nordic Living'],['Ferm Living flatweave rug','S$420','Rug','Studio Import'],['Anglepoise task lamp','S$310','Lighting','Anglepoise'],['Oak console, low profile','S$680','Storage','Local maker']];
    return items.map(function(it){var on=!!sl[it[0]];
      return '<div class="wf-srow"><span class="wf-rthumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16V11a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/></svg></span><span class="wf-srow__b"><span class="wf-srow__t">'+it[0]+'<span class="wf-srow__m" style="margin-left:8px">'+it[2]+' \u00b7 '+it[3]+'</span></span><span class="wf-srow__m">'+escT(why())+'</span></span><span class="wf-price">'+it[1]+'</span><span class="wf-slbtn'+(on?' on':'')+'" data-sl="'+it[0].replace(/"/g,'&quot;')+'">'+(on?'\u2713 In shortlist':'+ Shortlist')+'</span>'+sbtn('Ask Eva','data-sec-chat="Tell me more about the '+it[0].replace(/"/g,'')+'"')+'</div>';}).join('')
      +((PREFS.budget&&PREFS.budget.v)?('<p class="wf-sec__lbl">Budget breakdown<span class="wf-lblhint">against your '+escT(PREFS.budget.v)+' budget</span></p><div class="wf-bdl">'+[['Sofa','$1,295'],['Rug','$420'],['Lighting','$310'],['Storage','$680']].map(function(r){return '<div class="wf-bdrow"><span>'+r[0]+'</span><b>'+r[1]+'</b></div>';}).join('')+'<div class="wf-bdrow wf-bdrow--tot"><span>Total</span><b>$2,705</b></div></div>'):'');}
  var SEC={
    project:{t:'Project',sub:'Everything living under \u201cBedroom refresh\u201d.',html:secProject},
    activity:{t:'Activity',sub:'Notifications across your project, newest first.',html:secActivity},
    files:{t:'Files',sub:'All artifacts from chats in your active project.',html:secFiles},
    discover:{t:'Discover',sub:'Key insights Eva has drawn from your conversations.',html:secDiscover},
    recs:{t:'Recommendations',sub:'Pieces matched to your current preferences.',html:secRecs}};
  function showSection(key,soft){if(!SEC[key])return;
    if(key==='files'&&ST.chatSec!=='files')ST.fsel=null;   /* entering Files fresh always shows the grid */
    if(!soft){flushDraft();finalizeActiveStream();dismissProp();}
    ST.chatSec=key;secClass(true);
    var b=chatEls().body;if(b){b.innerHTML=secShell(key,SEC[key].html());b.scrollTop=0;
      var sv=b.querySelector('.wf-secv');if(sv&&!soft){sv.classList.add('wf-viewin');T(function(){sv.classList.remove('wf-viewin');},640);}}
    paintCrumb();
    var w=$('#fa-rail-chat');if(w){[].slice.call(w.querySelectorAll('.cnav a')).forEach(function(x){x.classList.remove('is-active');});var me=w.querySelector('[data-cnav="'+key+'"]');if(me)me.classList.add('is-active');}
    paintRecents();}
  function exitSection(){if(!ST.chatSec)return;ST.chatSec=null;secClass(false);
    var w=$('#fa-rail-chat');if(w){[].slice.call(w.querySelectorAll('.cnav a')).forEach(function(x){x.classList.remove('is-active');});}
    swapChatDom();}
  function closeCrumbDD(){var dd=$('[data-crumbdd]');if(dd)dd.hidden=true;
    var bt=$('[data-crumb-menu]');if(bt)bt.setAttribute('aria-expanded','false');}
  function openCrumbDD(){var dd=$('[data-crumbdd]');if(!dd)return;
    var list=STORE.sessions.filter(function(x){return !x.temp;}).sort(function(a,b){return b.upd-a.upd;});
    dd.innerHTML=list.map(function(se){return '<button class="wf-crumbdd__i" data-sess="'+se.id+'"><span>'+escT(se.title)+'</span>'+(se.id===CHAT.id?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</button>';}).join('')
      +'<div class="wf-crumbdd__hr"></div><button class="wf-crumbdd__i new" data-crumb-new>+ New chat</button>';
    dd.hidden=false;
    var bt=$('[data-crumb-menu]');if(bt)bt.setAttribute('aria-expanded','true');}
  function swapChatDom(){if(currentView!=='chat')return;dismissProp();paintCrumb();
    var b=chatEls().body;if(b){b.innerHTML=chatBodyCore();b.scrollTop=b.scrollHeight;
      var fc=b.firstElementChild;if(fc)fc.classList.add('wf-load');}   /* soft load only on session switch */
    var c=$('.wf-chips');if(c)c.innerHTML=(CHAT.chipsSwapped?CH2:CH).map(chipHtml).join('');
    var ta=chatEls().ta;if(ta){ta.value=CHAT.draft||'';autoGrow(ta);}
    setSendEmpty();setStreamUI(false);updateFootH();
    var tb=$('[data-tempbadge]');if(tb)tb.hidden=!CHAT.temp;
    var tg=$('[data-tempgo]');if(tg)tg.hidden=!!CHAT.temp;
}
  function discardIfTemp(){if(CHAT&&CHAT.temp){var _ti=CHAT.id;STORE.sessions=STORE.sessions.filter(function(x){return x.id!==_ti;});}}
  function switchSession(id){if(ST.chatSec){ST.chatSec=null;secClass(false);}
    if(CHAT&&CHAT.id===id){if(currentView!=='chat')go('chat');closeCrumbDD();swapChatDom();return;}
    flushDraft();finalizeActiveStream();dismissProp();discardIfTemp();
    var nx=null;STORE.sessions.forEach(function(x){if(x.id===id)nx=x;});if(!nx)return;
    CHAT=nx;CHATM=CHAT.msgs;ST.activeId=id;
    if(currentView==='chat')swapChatDom();else go('chat');
    paintRecents();}
  function chatReset(){if(ST.chatSec){ST.chatSec=null;secClass(false);}
    flushDraft();finalizeActiveStream();dismissProp();discardIfTemp();
    if(CHAT&&CHAT.msgs.length===0&&!CHAT.temp){if(currentView!=='chat')go('chat');else swapChatDom();paintRecents();return;}
    CHAT=newSession();CHATM=CHAT.msgs;ST.activeId=CHAT.id;
    if(currentView==='chat')swapChatDom();else go('chat');
    paintRecents();}
  if(ST.phT){try{clearInterval(ST.phT);}catch(_e){}ST.phT=null;}
  function chatEls(){return {body:$('.wf-cx__body'),ta:$('[data-chat-input]'),send:$('[data-chat-send]')};}
  function scrollBottom(smooth){var b=chatEls().body;if(b)b.scrollTo({top:b.scrollHeight,behavior:smooth?'smooth':'auto'});}
  function nearBottom(){var b=chatEls().body;return b?(b.scrollHeight-b.scrollTop-b.clientHeight<90):false;}
  function msgsWrap(){var b=chatEls().body;if(!b)return null;var w=b.querySelector('.wf-msgs');if(!w){b.innerHTML='<div class="wf-msgs"></div>';w=b.querySelector('.wf-msgs');}return w;}
  function appendRow(i,opts){opts=opts||{};var w=msgsWrap();if(!w)return;var m=CHATM[i],pv=CHATM[i-1];
    w.insertAdjacentHTML('beforeend',renderRow(m,i,true));
    if(opts.scroll==='smooth')scrollBottom(true);else if(opts.scroll==='follow'&&nearBottom())scrollBottom(false);}
  function setSendEmpty(){var e_=chatEls();if(e_.send&&e_.ta)e_.send.classList.toggle('is-empty',!e_.ta.value.trim());}
  function autoGrow(ta){ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px';}
  function evaReplyFor(t){var tl=t.toLowerCase();
    if(/living room/.test(tl))return 'Great, let\u2019s shape the living room. For a [[warm-minimalist]] base I\u2019d anchor on a low sofa, a wool rug and one sculptural light. What\u2019s the room\u2019s longest wall in metres?';
    if(/home office/.test(tl))return 'A calm office starts with the desk wall. I\u2019d run a [[2.4m oak worktop]] along the window, hide a cable tray underneath, and add one soft task lamp. Do you take video calls here?';
    if(/bedroom/.test(tl))return 'For the bedroom I\u2019d keep contrast low: linen bedding, a [[low-profile oak frame]], and two warm 2700K lamps. Is storage on the list too?';
    if(/open plan/.test(tl))return 'Open plans work best zoned by rug and light. I\u2019d define the lounge with a [[2\u00d73m rug]] and drop a pendant over the dining table. Shall we start from the lounge zone?';
    if(/\$|budget/.test(tl))return 'Noted, I\u2019ll plan around that. Within it I\u2019d put roughly [[60% into the sofa]], 25% into the rug, and keep the rest for lighting. Want the shortlist filtered to fit?';
    if(/guarantee|exact price/.test(tl))return 'Based on current listings the [[S\u00f6derhamn 3-seat]] runs about [[S$1,295]], prices shift by store and fabric, so treat this as an estimate.';
    if(/sofa/.test(tl))return 'Four sofas fit your profile, my top pick is the [[S\u00f6derhamn 3-seat]] in oatmeal: low, deep, and easy to re-cover. Want me to pair rugs against it?';
    if(/rug/.test(tl))return 'Go [[low-pile wool in oatmeal]], it warms the palette without fighting the sofa. I\u2019ve added the Ferm Living one to your shortlist.';
    if(/light/.test(tl))return 'Layer three levels: a dim pendant, one [[floor lamp at 2700K]], and a picture light for depth. I can mark positions on your floorplan.';
    if(/color|palette|warm|cool|neutral|blue|green/.test(tl))return 'Let\u2019s build on [[warm neutrals]]: bone-white walls, oat textiles, and one clay accent. I\u2019ll fold that into every recommendation.';
    if(/mood image|moodboard/.test(tl))return 'I\u2019ll assemble a mood image from your saved pins, expect [[soft light, wool and oak]] with one terracotta accent. Give me a minute, then check Uploads.';
    if(/\[attached:/.test(tl))return 'Got the file, I\u2019ll pull [[palette and layout cues]] from it and fold them into the next suggestions.';
    if(/floorplan|layout/.test(tl))return 'Upload a quick sketch or photo of the plan and I\u2019ll zone it, I mostly need the [[longest wall]] and the window positions.';
    return 'Got it, I\u2019ve noted that for the project. Tell me the room and a rough budget, and I\u2019ll turn it into a [[concrete shortlist]].';}
  /* -- r4: chunked streaming lifecycle -- */
  var STREAM={on:false,timer:null,mi:-1};
  STORE.sessions.forEach(function(se){var _lm=se.msgs[se.msgs.length-1]; /* remount mid-stream: finalize quietly */
    if(_lm&&_lm.role==='eva'&&!_lm.done){if(_lm.full){_lm.x=plainT(_lm.full);_lm.done=true;}else if(_lm.x){_lm.done=true;}else{se.msgs.pop();}}});
  var CUP='<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>';
  var CCOPY='<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
  function csvg2(pp,c){return '<svg class="'+(c||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+pp+'</svg>';}
  function fbRowHtml(i){var pinned=CHATM[i]&&CHATM[i].pinned;
    return '<div class="wf-fbrow" data-fb="'+i+'"><span class="wf-fb" title="Good response">'+csvg2(CUP,'')+'</span><span class="wf-fb wf-fb--dn" title="Bad response">'+csvg2(CUP,'')+'</span><span class="wf-mact" data-copy="'+i+'" title="Copy">'+csvg2(CCOPY,'')+'</span><span class="wf-mact'+(pinned?' on':'')+'" data-pin-msg="'+i+'" title="Pin to project">'+csvg2('<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>','')+'</span><span class="wf-mact" data-refine="'+i+'" title="Refine reply">'+csvg2('<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>','')+'</span></div>';}
  function thinkStepsFor(t){var tl=String(t).toLowerCase();
    if(/floorplan|layout|zoning|zone/.test(tl))return ['Reading the room proportions.','Testing two circulation paths.','Placing the anchor pieces.'];
    if(/mood image|moodboard/.test(tl))return ['Pulling from your saved pins.','Balancing texture and light.','Composing the mood frame.'];
    if(/palette|inspiration|ideas/.test(tl))return ['Reviewing your saved preferences.','Cross-checking palette and budget.','Drafting a direction worth exploring.'];
    if(/compare/.test(tl))return ['Lining up the candidates.','Weighing cost against longevity.','Ranking the shortlist.'];
    return null;}
  function startThinkRotor(steps){var ix=0;
    if(STREAM.thinkT){clearInterval(STREAM.thinkT);STREAM.thinkT=null;}
    STREAM.thinkT=IV(function(){ix++;
      var el=$('[data-think-t]');
      if(!el||ix>=steps.length){clearInterval(STREAM.thinkT);STREAM.thinkT=null;return;}
      el.classList.add('wfsw');
      T(function(){var e2=$('[data-think-t]');if(e2){e2.textContent=steps[ix];e2.classList.remove('wfsw');}},250);
    },1200);}
  function stopThinkRotor(){if(STREAM.thinkT){clearInterval(STREAM.thinkT);STREAM.thinkT=null;}}
  var REFINE={
    shorter:{lbl:'Shorter',fn:function(base){var f=base.split(/(?<=\.)\s+/)[0]||base;return f;}},
    options:{lbl:'More options',fn:function(base){return base+' Two more directions: a [[low-slung modular]] if you host often, or a [[compact loveseat]] to free floor space.';}},
    cheaper:{lbl:'Cheaper',fn:function(base){return base+' On a tighter budget: the [[Friheten sleeper]] lands about 30% lower and keeps the same footprint.';}}};
  function refineRowHtml(i){return '<div class="wf-refine" data-refrow>'+Object.keys(REFINE).map(function(k){return '<span class="wf-chip2" data-ref-mode="'+k+'" data-ref-mi="'+i+'">'+REFINE[k].lbl+'</span>';}).join('')+'</div>';}
  function closeRefine(){var r=$('[data-refrow]');if(r)r.remove();}
  function refineEva(i,mode){if(STREAM.on||i!==CHATM.length-1)return;
    var prev=CHATM[i-1];if(!prev)return;
    closeRefine();
    CHATM.pop();                                     /* user-initiated regenerate: legal removal */
    var r=rowEl(i);if(r)r.remove();
    var base=evaReplyFor(prev.x);
    startEva(personaize(REFINE[mode].fn(base)),'Refining\u2026');}
  function paintPins(){var head=$('[data-pinhead]'),ul=$('[data-pinlist]');if(!head||!ul)return;
    var items=[];
    STORE.sessions.forEach(function(se){if(se.temp)return;se.msgs.forEach(function(m,i){if(m.pinned)items.push({sid:se.id,mi:i,t:plainT(m.x)});});});
    head.hidden=items.length===0;
    ul.innerHTML=items.map(function(it){var sn=it.t.length>34?it.t.slice(0,31)+'\u2026':it.t;
      return '<li><a data-pin-go="'+it.sid+'|'+it.mi+'" title="'+escT(it.t.slice(0,120)).replace(/"/g,'&quot;')+'"><span>'+escT(sn)+'</span></a></li>';}).join('');}
  function gotoPinned(sid,mi){switchSession(sid);
    T(function(){var r=rowEl(mi);if(!r)return;
      r.scrollIntoView({block:'center',behavior:'auto'});
      r.classList.remove('rowhl');void r.offsetWidth;r.classList.add('rowhl');
      T(function(){r.classList.remove('rowhl');},1300);},60);}
  function lblFor(t){return /mood image|moodboard|floorplan|palette|inspiration|ideas/i.test(t)?'Searching inspiration\u2026':'Thinking';}
  function rowEl(mi){var b=chatEls().body;return b?b.querySelector('[data-mi="'+mi+'"]'):null;}
  function updateFootH(){var f=$('.wf-chat__foot'),mn=$('.wf-cx__main');if(f&&mn)mn.style.setProperty('--foot-h',f.offsetHeight+'px');}
  function pillEl(){return $('[data-tolatest]');}
  function updatePill(force){var b=chatEls().body,pl=pillEl();if(!b||!pl)return;var far=(b.scrollHeight-b.scrollTop-b.clientHeight)>200;pl.hidden=!(far||force===true);}
  function setStreamUI(on){STREAM.on=on;var c=$('.wf-composer');if(!c)return;c.classList.toggle('streaming',on);var st=c.querySelector('[data-chat-stop]');if(st)st.hidden=!on;}
  function startEva(full,lbl,opts){opts=opts||{};
    CHATM.push({role:'eva',x:'',full:full,lbl:lbl||'Thinking',done:false,ts:Date.now(),lc:!!opts.lowconf,think:opts.think||null});CHAT.upd=Date.now();
    var mi=CHATM.length-1;STREAM.mi=mi;appendRow(mi,{scroll:'follow'});setStreamUI(true);
    var toks=plainT(full).match(/\S+\s*/g)||[plainT(full)];var ix=0;
    if(opts.timeout)T(function(){if(STREAM.mi===mi&&CHATM[mi]&&!CHATM[mi].done)timeoutEva(mi);},opts.timeout);
    var _delay=650;
    if(opts.think){_delay=opts.think.length*1200+300;startThinkRotor(opts.think);}
    T(function(){if(!STREAM.on||!CHATM[mi]||CHATM[mi].done)return;
      stopThinkRotor();
      STREAM.timer=IV(function(){var m=CHATM[mi];
        ix+=1+Math.floor(Math.random()*2);m.x=toks.slice(0,ix).join('');
        var r=rowEl(mi);if(r){var bub=r.querySelector('.wf-bub');if(bub){bub.classList.remove('wf-bub--ghost');bub.innerHTML=escT(m.x)+'<span class="wf-caret"></span>';}}
        if(nearBottom())scrollBottom(false);else updatePill(true);
        if(ix>=toks.length)finishEva(mi);
      },55);},_delay);}
  function finishEva(mi){if(STREAM.timer){clearInterval(STREAM.timer);STREAM.timer=null;}
    var m=CHATM[mi];m.done=true;m.x=m.full||m.x;
    var r=rowEl(mi);
    removeFups();
    var pu0=CHATM[mi-1];
    var px=detectEx(plainT(m.x||''));
    var willProp=!!(px&&PREFS[px.k]&&!PREFS[px.k].v&&!$('[data-prop]')&&!(pu0&&pu0.ex&&!pu0.exok));
    if(r){var bub=r.querySelector('.wf-bub');if(bub){bub.classList.remove('wf-bub--ghost');bub.classList.add('wf-just');bub.innerHTML=hlRender(m.x);
      bub.insertAdjacentHTML('afterend',
        fbRowHtml(mi).replace('"wf-fbrow"','"wf-fbrow wf-in2"')
        +(m.lc?lowconfHtml().replace('"wf-lowconf"','"wf-lowconf wf-in2"'):'')
        +(willProp?'':fupsHtml(m.x).replace('"wf-fups"','"wf-fups wf-in2"')));}}
    setStreamUI(false);STREAM.mi=-1;if(nearBottom())scrollBottom(false);
    if(willProp)showProp(px,mi);
    else if(CHATM.length>=10&&CHATM.length%10===0&&CHAT.lastReview!==CHATM.length&&!$('[data-review]')){CHAT.lastReview=CHATM.length;showReview();}
    if(!CHAT.chipsSwapped){CHAT.chipsSwapped=true;T(function(){var c=$('.wf-chips');if(!c)return;
      c.classList.add('fade');
      T(function(){c.innerHTML=CH2.map(chipHtml).join('');c.classList.remove('fade');},150);},1200);}}
  function stopEva(){if(!STREAM.on)return;stopThinkRotor();if(STREAM.timer){clearInterval(STREAM.timer);STREAM.timer=null;}
    var mi=STREAM.mi>=0?STREAM.mi:CHATM.length-1;var m=CHATM[mi];
    if(!m||m.role!=='eva'||m.done){setStreamUI(false);return;}
    if(!String(m.x).trim()){ /* stopped during dots: drop the empty reply (user-initiated, legal removal) */
      CHATM.pop();var r0=rowEl(mi);if(r0)r0.remove();setStreamUI(false);showToast('Stopped');STREAM.mi=-1;return;}
    m.done=true;m.stopped=true;
    var r=rowEl(mi);
    if(r){var bub=r.querySelector('.wf-bub');if(bub){bub.textContent=m.x;bub.insertAdjacentHTML('afterend','<p class="wf-stopnote wf-in2"><b>Stopped.</b> Your partial reply is kept above, send another message to continue.</p>');}}
    setStreamUI(false);STREAM.mi=-1;}
  /* -- r8: edit & resend, follow-ups, temp chat, attachment send -- */
  var ATT=null;
  function removeFups(){var f=$('[data-fups]');if(f)f.remove();}
  function followupsFor(t){var tl=String(t).toLowerCase();
    if(/sofa/.test(tl))return ['Compare two sofas','Rug pairing'];
    if(/light/.test(tl))return ['Dim-to-warm bulbs?','Mark positions on my plan'];
    if(/budget|\$|spend/.test(tl))return ['Filter the shortlist to my budget','Where to save vs splurge?'];
    if(/rug/.test(tl))return ['Show flatweave options','What size for a 3-seat sofa?'];
    if(/palette|neutral|warm/.test(tl))return ['Build a 5-color palette','Add one bold accent'];
    return ['Tell me more','What would you pick?'];}
  function fupsHtml(t){return '<div class="wf-fups" data-fups>'+followupsFor(t).map(function(x){return '<span class="wf-chip2">'+escT(x)+'</span>';}).join('')+'</div>';}
  function meditStart(i){if(STREAM.on)return;var r=rowEl(i);if(!r)return;var bub=r.querySelector('.wf-bub');if(!bub)return;
    bub.innerHTML='<textarea class="wf-exin" data-me-in="'+i+'" rows="2" style="max-width:100%;width:24rem">'+escT(CHATM[i].x)+'</textarea><div class="wf-exact" style="margin-top:7px"><span class="wf-exbtn" data-me-save="'+i+'">\u2713 Save &amp; resend</span><span class="wf-exbtn wf-exbtn--ghost" data-me-cancel="'+i+'">Cancel</span></div>';
    var ta=bub.querySelector('textarea');if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);}}
  function penHtml(i){return '<span class="wf-mact wf-medit2" data-medit="'+i+'" title="Edit &amp; resend">'+csvg2(PEN,'')+'</span>';}
  function meditCancel(i){var r=rowEl(i);if(r){var bub=r.querySelector('.wf-bub');if(bub)bub.innerHTML=escT(CHATM[i].x)+penHtml(i);}}
  function editResend(i,nv){if(STREAM.on)return;nv=String(nv||'').trim();if(!nv){meditCancel(i);return;}
    CHATM.splice(i);                                  /* user-initiated revision: legal truncation */
    var w=msgsWrap();
    if(w){[].slice.call(w.querySelectorAll('[data-mi]')).forEach(function(n){if(+n.getAttribute('data-mi')>=i)n.remove();});
      while(w.lastElementChild&&(w.lastElementChild.classList.contains('wf-daysep')||w.lastElementChild.hasAttribute('data-fups')||w.lastElementChild.hasAttribute('data-prop')||w.lastElementChild.hasAttribute('data-review')))w.lastElementChild.remove();}
    dismissProp();removeFups();
    sendUser(nv);}
  var ERRCOPY={net:'I couldn\u2019t reach the studio service just now. Your message is kept above.',
    cost:'This conversation has reached its length limit, start a new one to keep going.'};
  function errActionsHtml(m,i){
    if(m.err==='cost')return '<div class="wf-exact" style="margin-top:2px"><span class="wf-exbtn" data-newconv>+ New conversation</span></div>';
    return '<div class="wf-exact" style="margin-top:2px"><span class="wf-exbtn" data-retry="'+i+'">\u21bb Try again</span></div>';}
  function lowconfHtml(){return '<div class="wf-lowconf"><span>Estimates can vary by store and stock, double-check before you commit.</span><span class="wf-exbtn wf-exbtn--ghost" data-lc>Check details</span></div>';}
  function startEvaError(kind){
    CHATM.push({role:'eva',x:'',lbl:'Thinking',done:false,err:null,ts:Date.now()});
    var arr=CHATM;
    var mi=CHATM.length-1;STREAM.mi=mi;appendRow(mi,{scroll:'follow'});setStreamUI(true);
    T(function(){if(arr!==CHATM)return;var m=CHATM[mi];if(!m||m.done)return;
      m.done=true;m.err=kind;m.ts=Date.now();m.x=ERRCOPY[kind];
      var r=rowEl(mi);
      if(r){var bub=r.querySelector('.wf-bub');if(bub){bub.classList.add('wf-bub--err');bub.textContent=m.x;bub.insertAdjacentHTML('afterend',errActionsHtml(m,mi).replace('"wf-exact"','"wf-exact wf-in2"'));}}
      setStreamUI(false);STREAM.mi=-1;if(nearBottom())scrollBottom(false);
      var pu=CHATM[mi-1];
      if(pu&&pu.ex&&!pu.exok)showToast('Eva\u2019s reply failed, but \u201c'+pu.ex.v+'\u201d is noted above, confirm to save it.');},900);}
  function timeoutEva(mi){var m=CHATM[mi];if(!m||m.done)return;
    if(STREAM.timer){clearInterval(STREAM.timer);STREAM.timer=null;}
    m.done=true;m.err='timeout';
    var r=rowEl(mi);
    if(r){var bub=r.querySelector('.wf-bub');if(bub){if(!String(m.x).trim())bub.textContent='\u2026';bub.insertAdjacentHTML('afterend','<p class="wf-stopnote wf-in2"><b>Timed out.</b> The reply took too long to finish.</p>'+errActionsHtml(m,mi).replace('"wf-exact"','"wf-exact wf-in2"'));}}
    setStreamUI(false);STREAM.mi=-1;}
  function retryEva(i){if(STREAM.on||i!==CHATM.length-1)return;
    var prev=CHATM[i-1];CHATM.pop();
    var r=rowEl(i);if(r)r.remove();                      /* user-initiated recovery: legal removal */
    var t=prev?prev.x:'';startEva(personaize(evaReplyFor(t)),lblFor(t),{lowconf:/guarantee|exact price/i.test(t)});}
  /* -- r6: preferences store + keyword->label chain -- */
  var PEN='<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>';
  var PREFS=ST.prefs||(ST.prefs={
    room:{label:'room type',v:null,src:null,opts:['living room','bedroom','kitchen']},
    budget:{label:'budget range',v:null,src:null,opts:['$1000','$5000','$10000+']},
    style:{label:'design style',v:null,src:null,opts:['modern','scandinavian','minimal']},
    color:{label:'color preference',v:null,src:null,opts:['blue','green','neutral','warm tones','cool tones']},
    furniture:{label:'furniture need',v:null,src:null,opts:['sofa','bed','dining table','coffee table','lighting']}});
  function capT(t){return String(t).replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function detectEx(t){var tl=t.toLowerCase(),m;
    if(m=tl.match(/\$\s?\d[\d,]*k?\+?/))return {k:'budget',v:m[0]};
    if(m=tl.match(/\b(sofa|bed|dining table|coffee table|lighting)\b/))return {k:'furniture',v:m[1]};
    if(m=tl.match(/\b(living room|bedroom|kitchen|home office|open plan)\b/))return {k:'room',v:m[1]};
    if(m=tl.match(/\b(modern|scandinavian|minimal(?:ist)?|industrial|bohemian)\b/))return {k:'style',v:m[1]};
    if(m=tl.match(/\b(blue|green|neutrals?|warm tones|cool tones)\b/))return {k:'color',v:m[1]};
    return null;}
  function prefChipsHtml(k){var P0=PREFS[k];
    if(P0.v){return '<span class="wf-psel"><span class="wf-psel__v"'+(P0.src!=null?' data-psrc="'+k+'" title="Where this came from"':'')+'>'+escT(capT(P0.v))+'</span><span class="wf-psel__e" data-pe="'+k+'" title="Edit">'+csvg2(PEN,'')+'</span><span class="wf-psel__x" data-px="'+k+'" title="Remove">\u2715</span></span>';}
    return P0.opts.map(function(o){return '<span class="wf-pchip" data-pk="'+k+'" data-pv="'+o+'">'+o+'</span>';}).join('');}
  function paintPref(k){var el=$('[data-pblock="'+k+'"]');if(!el)return;
    el.classList.toggle('done',!!PREFS[k].v);
    var bd=el.querySelector('.wf-pref__body');if(bd)bd.innerHTML=prefChipsHtml(k);}
  function setPref(k,v,src){if(!PREFS[k])return;PREFS[k].v=v;if(src!==undefined)PREFS[k].src=src;paintPref(k);}
  function flashPref(k){}
  function clearPref(k){PREFS[k].v=null;PREFS[k].src=null;paintPref(k);showToast('Preference removed');}
  function prefEdit(k){var el=$('[data-pblock="'+k+'"] .wf-pref__body');if(!el)return;
    el.innerHTML='<input class="wf-exin" data-pin="'+k+'" value="'+escT(PREFS[k].v||'').replace(/"/g,'&quot;')+'"><div class="wf-exact" style="margin-top:7px"><span class="wf-exbtn" data-pn-save="'+k+'">\u2713 Save</span><span class="wf-exbtn wf-exbtn--ghost" data-pn-cancel="'+k+'">Cancel</span></div>';
    var inp=el.querySelector('input');if(inp){inp.focus();inp.select();}}
  function exInnerHtml(m,i){
    return '<span class="wf-extag">'+escT(m.ex.v)+'</span>'+
      '<p class="wf-exq">Save \u201c'+escT(m.ex.v)+'\u201d as your '+PREFS[m.ex.k].label+'?</p>'+
      '<div class="wf-exact"><span class="wf-exbtn" data-x-ok="'+i+'">\u2713 Looks good</span><span class="wf-exbtn wf-exbtn--ghost" data-x-adj="'+i+'">\u270e Adjust</span></div>';}
  function exBlockHtml(m,i){
    if(m.exok)return '<p class="wf-exnote">Noted.</p>';
    return '<div class="wf-ex" data-ex="'+i+'">'+exInnerHtml(m,i)+'</div>';}
  function confirmEx(i,val){var m=CHATM[i];if(!m||!m.ex||m.exok)return;
    var k=m.ex.k,prevV=PREFS[k].v,prevSrc=PREFS[k].src;
    if(val)m.ex.v=val;m.exok=true;m.srcMi=i;
    setPref(k,m.ex.v,i);flashPref(k);
    var host=$('[data-ex="'+i+'"]');if(host)host.outerHTML='<p class="wf-exnote wf-in2" data-exnote="'+i+'">Noted.</p>';
    showUndoToast('Noted for your project: '+PREFS[k].label+': '+m.ex.v,function(){
      m.exok=false;m.srcMi=null;setPref(k,prevV,prevSrc);flashPref(k);
      var nt=$('[data-exnote="'+i+'"]');
      if(nt)nt.outerHTML='<div class="wf-ex wf-in2" data-ex="'+i+'">'+exInnerHtml(m,i)+'</div>';
      showToast('Preference restored');});}
  function exAdjust(i){var host=$('[data-ex="'+i+'"]');var m=CHATM[i];if(!host||!m||!m.ex)return;
    host.innerHTML='<input class="wf-exin" data-x-in="'+i+'" value="'+escT(m.ex.v).replace(/"/g,'&quot;')+'"><div class="wf-exact"><span class="wf-exbtn" data-x-save="'+i+'">\u2713 Save</span><span class="wf-exbtn wf-exbtn--ghost" data-x-cancel="'+i+'">Cancel</span></div>';
    var inp=host.querySelector('input');if(inp){inp.focus();inp.select();}}
  function exRestore(i){var host=$('[data-ex="'+i+'"]');if(host&&CHATM[i]&&CHATM[i].ex)host.innerHTML=exInnerHtml(CHATM[i],i);}
  function openSrc(k){var P0=PREFS[k];if(!P0||P0.src==null||!CHATM[P0.src])return;
    var m=CHATM[P0.src];var mk=$('[data-srcmask]');if(!mk)return;
    mk.querySelector('.wf-srcmodal__e').textContent=P0.label;
    mk.querySelector('.wf-srcmodal__v').textContent=capT(P0.v||'');
    mk.querySelector('.wf-srcmodal__q').textContent='\u201c'+m.x+'\u201d';
    mk.querySelector('.wf-srcmodal__t').textContent=(m.role==='eva'?'From Eva\u2019s reply \u00b7 ':'From your message \u00b7 ')+fmtT(m.ts||Date.now());
    mk.hidden=false;var cb0=mk.querySelector('[data-src-close]');if(cb0&&cb0.focus)cb0.focus();}
  function closeSrc(){var mk=$('[data-srcmask]');if(mk)mk.hidden=true;}
  /* proposal banner (Accept/Reject + 60s countdown) + review prompt */
  if(ST.propT){try{clearInterval(ST.propT);}catch(_e){}ST.propT=null;}
  function dismissProp(){if(ST.propT){clearInterval(ST.propT);ST.propT=null;}
    var el=$('[data-prop]');if(el)el.remove();}
  function showProp(px,mi){if($('[data-prop]'))return;
    var w=msgsWrap();if(!w)return;var secs=60;
    w.insertAdjacentHTML('beforeend','<div class="wf-propbanner wf-in2" data-prop><span>Eva suggests: <b>'+PREFS[px.k].label+', '+escT(capT(px.v))+'</b></span><span class="conf">high confidence</span><span class="wf-exbtn" data-prop-ok="'+px.k+'|'+escT(px.v)+'|'+mi+'">\u2713 Accept</span><span class="wf-exbtn wf-exbtn--ghost" data-prop-no>Dismiss</span><span class="cd" data-prop-cd>auto-dismiss 60s</span></div>');
    if(nearBottom())scrollBottom(true);
    ST.propT=IV(function(){secs--;var cd=$('[data-prop-cd]');
      if(cd)cd.textContent='auto-dismiss '+secs+'s';
      if(secs<=0||!cd)dismissProp();},1000);}
  function showReview(){if($('[data-review]'))return;var w=msgsWrap();if(!w)return;
    w.insertAdjacentHTML('beforeend','<div class="wf-review wf-in2" data-review><span class="q">Want a quick look at your saved preferences?</span><span class="wf-exbtn" data-review-open>Open preferences</span><span class="wf-exbtn wf-exbtn--ghost" data-review-no>Not now</span></div>');
    if(nearBottom())scrollBottom(true);}
  var BRAIN='Here\u2019s a direction to explore: pair the [[S\u00f6derhamn 3-seat]] in oatmeal with a low-pile wool rug, then layer [[warm brass lighting]] against your neutral walls. Want me to sketch two layout options for the 3.5m wall?';
  function brainstorm(btn){if(STREAM.on||btn.classList.contains('busy'))return;
    var sid=CHAT.id;
    btn.classList.add('busy');var lb=btn.querySelector('span');var old=lb?lb.textContent:'';if(lb)lb.textContent='Thinking\u2026';
    T(function(){btn.classList.remove('busy');if(lb)lb.textContent=old;if(STREAM.on||CHAT.id!==sid)return;
      startEva(BRAIN,'Thinking',{think:['Reviewing your saved preferences.','Cross-checking palette and budget.','Drafting a direction worth exploring.']});showToast('Brainstorm ideas added to chat');},300);}
  /* -- r7.5: assistant personas (global scope, non-retroactive) -- */
  var PERSONAS=[
    {id:'eva-general',n:'Eva',tag:'Balanced design partner',focus:'general'},
    {id:'eva-style',n:'Eva \u00b7 Style',tag:'Aesthetic & cohesion first',focus:'style'},
    {id:'eva-plan',n:'Eva \u00b7 Plan',tag:'Layout, flow & fit',focus:'layout'},
    {id:'eva-budget',n:'Eva \u00b7 Budget',tag:'Tradeoffs & priorities',focus:'budget'}];
  if(!ST.persona)ST.persona='eva-general';
  function curPersona(){var f=PERSONAS[0];PERSONAS.forEach(function(x){if(x.id===ST.persona)f=x;});return f;}
  function focusCopy(room){var f=curPersona().focus;
    if(f==='style')return 'Define palette, materials, and mood for your '+room+'.';
    if(f==='layout')return 'Shape circulation, zones, and furniture fit for your '+room+'.';
    if(f==='budget')return 'Prioritize spend and what to buy first for your '+room+'.';
    return 'Balance look, layout, and budget for your '+room+'.';}
  function personaize(t){var f=curPersona().focus;
    if(f==='style')return 'Through a style lens: '+t;
    if(f==='layout')return 'Thinking in floor plans: '+t;
    if(f==='budget')return 'With the budget hat on: '+t;
    return t;}
  function openPicker(){var mk=$('[data-pickmask]');if(!mk)return;
    mk.querySelector('.wf-picker__list').innerHTML=PERSONAS.map(function(a){
      return '<button class="wf-pitem'+(a.id===ST.persona?' sel':'')+'" data-pick="'+a.id+'"><span class="wf-pitem__av">E</span><span><span class="wf-pitem__n">'+escT(a.n)+'</span><br><span class="wf-pitem__t">'+escT(a.tag)+'</span></span>'+(a.id===ST.persona?'<svg class="wf-pitem__chk" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</button>';}).join('');
    mk.hidden=false;}
  function closePicker(){var mk=$('[data-pickmask]');if(mk)mk.hidden=true;}
  function applyPersona(id){ST.persona=id;var a=curPersona();
    var n=$('.wf-eva__n'),tg=$('.wf-eva__tag');
    if(n)n.textContent=a.n;if(tg)tg.textContent=a.tag;
    if(!CHATM.length){var b=chatEls().body;if(b)b.innerHTML=chatBodyCore();}
    closePicker();showToast('Now chatting with '+a.n);}
  /* -- r14: entity tokens + selection toolbar -- */
  function entTypeFor(t){var tl=t.toLowerCase();
    if(/\$/.test(tl))return 'budget';
    if(/\d+(?:\.\d+)?\s?(?:m|cm|mm)\b|\d+\s?k\b|\d+\s?[\u00d7x]\s?\d+/.test(tl))return 'spec';
    if(/\b(neutrals?|warm tones|cool tones|oatmeal|clay|terracotta|bone-white|blue|green)\b/.test(tl))return 'color';
    if(/\b(sofa|rug|lamp|light(?:ing)?|table|worktop|textiles?|seat|frame|pendant|sconce|shelf|bench|chairs?)\b/.test(tl))return 'product';
    return 'idea';}
  function furnCatOf(t){var m=t.toLowerCase().match(/\b(sofa|bed|dining table|coffee table|lighting)\b/);return m?m[1]:null;}
  function closeEntPop(){var el=$('[data-entpop]');if(el)el.hidden=true;}
  function closeSelTool(){var el=$('[data-seltool]');if(el)el.hidden=true;}
  function placeOver(el,rect){var main=$('.wf-cx__main');if(!main)return;
    var base=main.getBoundingClientRect();
    el.style.visibility='hidden';el.hidden=false;
    var w=el.offsetWidth,h=el.offsetHeight;
    var left=Math.max(8,Math.min(rect.left-base.left,base.width-w-8));
    var top=rect.bottom-base.top+6;
    if(top+h>base.height-140)top=rect.top-base.top-h-6;
    el.style.left=left+'px';el.style.top=Math.max(46,top)+'px';el.style.visibility='';}
  function openEntPop(mark){var el=$('[data-entpop]');if(!el)return;
    closeSelTool();
    var t=mark.textContent;var ty=entTypeFor(t);var row=mark.closest('[data-mi]');var mi=row?+row.getAttribute('data-mi'):null;
    var IC2={budget:'<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      color:'<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
      spec:'<path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0l-11.2 11.2a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/>',
      product:'<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16V11a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/>',
      idea:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'};
    var acts='';
    var q=escT(t).replace(/"/g,'&quot;');
    if(ty==='budget')acts+='<button class="wf-entpop__a" data-entact="budget" data-v="'+q+'" data-mi2="'+mi+'">Set as budget</button>';
    if(ty==='color')acts+='<button class="wf-entpop__a" data-entact="color" data-v="'+q+'" data-mi2="'+mi+'">Set as color preference</button>';
    if(ty==='product'){acts+='<button class="wf-entpop__a" data-entact="shortlist" data-v="'+q+'">Save to shortlist</button>';
      var fc=furnCatOf(t);if(fc)acts+='<button class="wf-entpop__a" data-entact="furniture" data-v="'+escT(fc)+'" data-mi2="'+mi+'">Set as furniture need</button>';}
    if(ty==='spec')acts+='<button class="wf-entpop__a" data-entact="copy" data-v="'+q+'">Copy</button>';
    acts+='<button class="wf-entpop__a" data-entact="ask" data-v="'+q+'">Ask about this</button>';
    acts+='<button class="wf-entpop__a" data-entact="quote" data-v="'+q+'">Quote in reply</button>';
    el.innerHTML='<div class="wf-entpop__h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+IC2[ty]+'</svg><span class="wf-entpop__w">'+escT(t)+'</span><span class="wf-entpop__k">'+ty+'</span></div>'+acts;
    placeOver(el,mark.getBoundingClientRect());}
  function showSelTool(){if(STREAM.on)return;
    var sel=window.getSelection&&window.getSelection();if(!sel||sel.isCollapsed)return closeSelTool();
    var txt=String(sel.toString()).trim();if(!txt||txt.length<2)return closeSelTool();
    var anchor=sel.anchorNode&&sel.anchorNode.parentElement;var bub=anchor?anchor.closest('.wf-bub'):null;
    if(!bub||bub.closest('.wf-cmsg')===null)return closeSelTool();
    var row=bub.closest('[data-mi]');var mi=row?+row.getAttribute('data-mi'):null;
    var el=$('[data-seltool]');if(!el)return;
    closeEntPop();
    var short=txt.length>60?txt.slice(0,57)+'\u2026':txt;
    var q=escT(short).replace(/"/g,'&quot;');
    el.innerHTML='<button data-selact="quote" data-v="'+q+'">Quote</button><button data-selact="ask" data-v="'+q+'">Ask Eva</button><button class="terra2" data-selact="save" data-v="'+q+'" data-mi2="'+mi+'">Save as\u2026</button><button data-selact="copy" data-v="'+q+'">Copy</button>';
    var r=sel.getRangeAt(0).getBoundingClientRect();
    placeOver(el,{left:r.left,top:r.top,bottom:r.top-4});}
  var CH=['Mood image','Floorplan','Color palette','Cozy living room','Small bedroom','Minimalist tips','Lighting ideas'];
  var CH2=['Sofa under S$1,500','Rug pairing','Layout for a 3.5m wall','Warm palette','Compare two sofas','Lighting plan'];
  function chipHtml(x){return '<span class="wf-chip2">'+x+'</span>';}
  var SLOWREPLY='Let me work through the full lighting plan for you. Start with the ambient layer: a dimmable pendant centred over the seating zone, warm 2700K, sized about one third of the table width. Then the task layer, a floor lamp beside the reading chair and a slim picture light over the shelf. Finally the accent layer: two plug-in sconces flanking the window to lift the evening mood, plus a small table lamp on the sideboard for depth. I would also add smart dimmers so every scene can shift from bright afternoon work to a soft film-night glow without touching a single bulb.';
  function sendUser(text){var v=String(text||'').trim();if(!v||STREAM.on)return;
    if(ST.chatSec){ST.chatSec=null;secClass(false);swapChatDom();}   /* stray sends always land in the conversation */
    removeFups();
    if(ATT){v+=' [attached: '+ATT.name+']';ATT=null;var _aw=$('.wf-attach');if(_aw){_aw.innerHTML='';_aw.classList.remove('has');}}
    var um={role:'user',x:v,ts:Date.now(),done:true};var ex=detectEx(v);if(ex)um.ex=ex;
    CHATM.push(um);CHAT.upd=Date.now();CHAT.draft='';
    var _uc1=0;CHATM.forEach(function(x){if(x.role==='user')_uc1++;});
    if(_uc1===1){CHAT.title=titleFor(v);var _ct=$('[data-crumb-title]');if(_ct&&!CHAT.temp)_ct.textContent=CHAT.title;}
    paintRecents();
    appendRow(CHATM.length-1,{scroll:'smooth'});
    var uc=0;CHATM.forEach(function(m){if(m.role==='user')uc++;});
    if(uc===8&&!CHAT.costWarned){CHAT.costWarned=true;showToast('This conversation is nearing its usage limit. Consider starting a new one soon.');}
    if(/\berror\b|\bfail(ed)?\b/i.test(v)){startEvaError('net');return;}
    if(/\blimit\b/i.test(v)){startEvaError('cost');return;}
    if(/\bslow\b/i.test(v)){startEva(SLOWREPLY,'Thinking',{timeout:4000});return;}
    var _tk=thinkStepsFor(v);
    startEva(personaize(evaReplyFor(v)),lblFor(v),{lowconf:/guarantee|exact price/i.test(v),think:_tk});}
  var PH=['Ask, create, analyze, or explore\u2026','Describe your space in your own words\u2026','Try \u201csofa under S$1,500\u201d\u2026','Paste a link or attach a floor plan\u2026'];
  var PHI=0;
  ST.phT=IV(function(){var ta=chatEls().ta;if(!ta||ta.value||document.activeElement===ta)return;
    ta.classList.add('ph-fade');
    T(function(){PHI=(PHI+1)%PH.length;ta.setAttribute('placeholder',PH[PHI].replace(/\\u201c/g,'\u201c'));ta.classList.remove('ph-fade');},280);
  },3800);
  /* ── chat rebuild r1: STATIC skeleton (zero behavioral JS; engine arrives in later phases) ── */
  function chatBody(){
    function sv(pp,c){return '<svg class="'+(c||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+pp+'</svg>';}
    var IC={
      home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      kase:'<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
      moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
      bulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
      dollar:'<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      star:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
      checks:'<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
      clip:'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
      send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
      swap:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'
    };

    var chips=(ST.chipsSwapped?CH2:CH).map(chipHtml).join('');
    var PREFMETA=[['room','home','Room Type','The type of room you\u2019re designing'],
      ['budget','dollar','Budget Range','Your budget for the project'],
      ['style','bulb','Design Style','Your preferred design aesthetic'],
      ['color','star','Color Preferences','Colors you want to incorporate'],
      ['furniture','checks','Furniture Needs','Furniture items you need']];
    var prefBlocks=PREFMETA.map(function(b,bi){
      return '<div class="wf-pref'+(PREFS[b[0]].v?' done':'')+'" data-pblock="'+b[0]+'"><div class="wf-pref__h">'+sv(IC[b[1]],'wf-pref__i')+'<span class="wf-pref__t">'+b[2]+'</span><span class="wf-pidx">[0'+(bi+1)+']</span></div><p class="wf-pref__d">'+b[3]+'</p><div class="wf-pref__body wf-pchips">'+prefChipsHtml(b[0])+'</div></div>';}).join('');
    return '<div class="wf-cx">'+
      '<div class="wf-cx__main">'+
        '<div class="wf-crumb"><span class="wf-crumb__b" data-crumb-brand>Furnishes</span><span class="wf-crumb__sl">/</span><button class="wf-crumb__t'+((!ST.chatSec&&!CHAT.temp&&CHAT.title==='New chat')?' nochev':'')+'" data-crumb-menu aria-expanded="false"><span data-crumb-title>'+escT(CHAT.temp?'Temporary chat':CHAT.title)+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button><span class="wf-tempgo" data-tempgo data-cv-temp'+(CHAT.temp?' hidden':'')+' title="Start a temporary chat, nothing is saved"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-dasharray="2.7 2.7"/></svg></span><span class="wf-tempbadge" data-tempbadge data-cv-temp'+(CHAT.temp?'':' hidden')+' title="Temporary chat, click to end &amp; discard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-dasharray="2.7 2.7"/></svg><span>Temporary</span></span><div class="wf-crumbdd" data-crumbdd hidden></div></div>'+
        '<div class="wf-entpop" data-entpop hidden></div>'+'<div class="wf-seltool" data-seltool hidden></div>'+
        '<span class="wf-tolatest" data-tolatest hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></span>'+
                '<div class="wf-cx__body">'+chatBodyCore()+'</div>'+
        '<div class="wf-chat__foot">'+
          '<p class="wf-sugg__h">'+sv(IC.bulb,'')+'<span class="terra">Quick suggestions</span><span>for your project:</span><span class="wf-evachip" data-aside-open><i>E</i>Eva</span></p>'+
          '<div class="wf-chips">'+chips+'</div>'+
          '<div class="wf-cxerrs"></div>'+'<div class="wf-attach"></div>'+
          '<div class="wf-composer"><input type="file" data-chat-file hidden><span class="wf-composer__clip" title="Attach image">'+sv(IC.clip,'')+'</span><textarea rows="1" placeholder="Ask, create, analyze, or explore\u2026" data-chat-input>'+escT(CHAT.draft||'')+'</textarea><span class="wf-composer__stop" data-chat-stop title="Stop generating" hidden><svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/></svg></span><span class="wf-composer__send'+((CHAT.draft||'').trim()?'':' is-empty')+'" data-chat-send title="Send">'+sv(IC.send,'')+'</span></div>'+
          '<p class="wf-ailabel">Eva is an AI assistant and can make mistakes, check important details.</p>'+
        '</div>'+
      '</div>'+
      '<aside class="wf-cx__aside">'+
        '<div class="wf-cx__aside-head">'+'<button class="wf-aside-back" data-aside-close>\u2190 Back</button>'+
          '<div class="wf-eva"><div class="wf-eva__av">E</div><div class="wf-eva__id"><div class="wf-eva__n">'+escT(curPersona().n)+'</div><div class="wf-eva__tag">'+escT(curPersona().tag)+'</div></div><div class="wf-eva__act">'+
          '<svg class="wf-eva__i" data-eva-swap title="Switch assistant" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+IC.swap+'</svg>'+
        '</div></div>'+
          '<button class="wf-brainstorm">'+sv(IC.bulb,'')+'<span>Brainstorm for me</span></button>'+
        '</div>'+
        '<div class="wf-cx__aside-scroll"><p class="wf-pref-lbl">Preferences</p>'+prefBlocks+'</div>'+
      '</aside>'+
      '<div class="wf-pickmask" data-pickmask hidden><div class="wf-picker"><p class="wf-picker__crumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg><span class="sl">/</span><u>Choose assistant</u></p><div class="wf-picker__list"></div><div class="wf-exact"><span class="wf-exbtn" data-pick-close>Close</span></div></div></div>'+
      '<div class="wf-srcmask" data-srcmask hidden><div class="wf-srcmodal"><p class="wf-srcmodal__e"></p><p class="wf-srcmodal__v"></p><p class="wf-srcmodal__q"></p><p class="wf-srcmodal__t"></p><div class="wf-exact"><span class="wf-exbtn" data-src-close>Close</span></div></div></div>'+
    '</div>';}
  function imagegenBody(){return '<div class="wf-3col"><div class="wf-3col__l">'+sub('Controls')+
        fields([{l:'Room',v:'Living room'},{l:'Style',v:'Warm minimalist'},{l:'Aspect',v:'3 : 2'}])+
        '<div style="margin-top:6px"><span class="wf-field__lbl">Prompt</span><div class="wf-input" style="height:auto;min-height:54px;margin-top:8px;padding:8px"><span class="wf-cell__sub">Oak sofa, oatmeal rug, soft afternoon light\u2026</span></div></div></div>'+
      '<div><div class="wf-canvas"><span class="wf-eye">Generated render</span></div>'+
        '<div style="margin-top:14px;display:flex;gap:10px"><span class="wf-btn">Generate</span><span class="wf-chip">4 variations</span><span class="wf-chip">Edit region</span></div></div>'+
      '<div class="wf-3col__r">'+sub('Eva')+'<div class="wf-msg"><span class="wf-msg__role">Eva</span><span class="wf-msg__txt">Warmed the lighting and swapped in your saved sofa.</span></div>'+
        '<div class="wf-msg me"><span class="wf-msg__role">You</span><span class="wf-msg__txt">Add a floor lamp on the left.</span></div></div></div>';}
  function cartBody(){
    var items=[['S\u00f6derhamn 3-seat sofa','Qty 1','S$1,299'],['Noguchi coffee table','Qty 1','S$2,450'],['Ferm Living wool rug','Qty 1','S$420'],['Artek Stool 60','Qty 2','S$620']];
    var list=items.map(function(it){return '<div class="wf-row"><div class="wf-thumb"></div>'+
      '<div class="wf-row__main"><span class="wf-row__t">'+it[0]+'</span><span class="wf-row__p">'+it[1]+'</span></div>'+
      '<span class="wf-row__m">'+it[2]+'</span><span class="wf-x">\u2715</span></div>';}).join('');
    function sr(l,v){return '<div class="wf-sum__row"><span>'+l+'</span><span class="wf-num">'+v+'</span></div>';}
    var summary='<aside class="wf-sum">'+sub('Order summary')+sr('Subtotal','S$4,789')+sr('Delivery','S$120')+sr('GST (incl. 9%)','S$405')+
      '<div class="wf-sum__total"><span>Total</span><span>S$4,909</span></div>'+
      '<span class="wf-btn" data-view="checkout" style="margin-top:18px;width:100%;justify-content:center;height:38px">Checkout \u2192</span></aside>';
    return '<div class="wf-cart"><div class="wf-list">'+list+'</div>'+summary+'</div>';
  }
  function checkoutBody(){
    var steps='<div class="wf-tools"><span class="wf-chip on">Delivery</span><span class="wf-chip">Payment</span><span class="wf-chip">Review</span></div>';
    var left='<div class="wf-form" style="max-width:none">'+sub('Delivery')+
      fields([{l:'Recipient',v:'Mohan Lu'},{l:'Address',v:'12 Holland Drive, #08-21'},{l:'Postal code',v:'271012'},{l:'Phone',v:'+65 8123 4567'},{l:'Delivery window',v:'Thu 26 Jun \u00b7 9\u201312'}])+
      '<div style="height:26px"></div>'+sub('Payment')+
      fields([{l:'Card',v:'Visa \u2022\u2022\u2022\u2022 4242'},{l:'Name on card',v:'Mohan Lu'},{l:'Expiry',v:'08 / 28'}])+'</div>';
    function sr(l,v){return '<div class="wf-sum__row"><span>'+l+'</span><span class="wf-num">'+v+'</span></div>';}
    var right='<aside class="wf-sum">'+sub('Review')+sr('Subtotal','S$4,789')+sr('Delivery','S$120')+sr('GST (incl. 9%)','S$405')+
      '<div class="wf-sum__total"><span>Total</span><span>S$4,909</span></div>'+
      '<span class="wf-btn" data-view="cart" style="margin-top:18px;width:100%;justify-content:center;height:38px">Place order \u2192</span></aside>';
    return steps+'<div class="wf-cart">'+left+right+'</div>';
  }

  function ordersBody(){
    var O=[
      ['#FZ-20614','Söderhamn sofa, Ferm Living rug',2,'S$1,719',['Delivered','on'],'12 Jun','Delivered 14 Jun'],
      ['#FZ-20588','Noguchi coffee table',1,'S$2,450',['In transit',''],'18 Jun','Arrives 24 Jun'],
      ['#FZ-20571','Artek Stool 60 ×2',2,'S$620',['In transit',''],'21 Jun','Arrives 27 Jun'],
      ['#FZ-20502','Flos Arco floor lamp',1,'S$3,100',['Delivered','on'],'2 Jun','Delivered 6 Jun'],
      ['#FZ-20498','String shelving system',1,'S$840',['Cancelled','mut'],'28 May','Refunded 30 May']
    ];
    var sum=facts(4,[['In transit','2'],['Delivered','2'],['Cancelled','1'],['Spent · 2026','S$7,889']],'wf-facts--lg');
    var filt=chips([['All',5,1],['In transit',2,0],['Delivered',2,0],['Cancelled',1,0]]);
    var trows=O.map(function(o){return '<tr data-view="orders">'+
      '<td><div class="wf-tbl__t">'+o[0]+'</div><div class="wf-tbl__d">Placed '+o[5]+'</div></td>'+
      '<td><div class="wf-tbl__t" style="font-weight:500">'+o[1]+'</div><div class="wf-tbl__d">'+o[2]+(o[2]>1?' items':' item')+'</div></td>'+
      '<td class="num"><span class="wf-tbl__n">'+o[3]+'</span></td>'+
      '<td>'+badge(o[4][0],o[4][1])+'<div class="wf-tbl__d" style="margin-top:6px">'+o[6]+'</div></td>'+
    '</tr>';}).join('');
    var table='<table class="wf-tbl"><thead><tr><th>Order</th><th>Items</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>'+trows+'</tbody></table>';
    return '<div class="wf-conn wf-conn--top">'+sum+filt+table+'</div>';
  }
  function deliveriesBody(){
    var D=[
      {t:'Noguchi coffee table',st:['Out for delivery',''],meta:'Today \u00b7 14\u201318 \u00b7 12 Holland Drive, #08-21',p:75},
      {t:'Artek Stool 60 \u00d72',st:['Scheduled',''],meta:'Thu 26 Jun \u00b7 9\u201312 \u00b7 12 Holland Drive, #08-21',p:30},
      {t:'S\u00f6derhamn sofa + Ferm rug',st:['Delivered','on'],meta:'Delivered 12 Jun \u00b7 left with concierge',p:100}
    ];
    return '<div class="wf-plist">'+D.map(function(x){
      return '<div class="wf-prow" data-view="orders"><div class="wf-prow__l"><div class="wf-prow__top"><span class="wf-row__t">'+x.t+'</span>'+badge(x.st[0],x.st[1])+'</div><span class="wf-row__p">'+x.meta+'</span></div><div class="wf-prow__r"><div class="wf-track"><i style="width:'+x.p+'%"></i></div></div></div>';
    }).join('')+'</div>';
  }
  function returnsBody(){
    var R=[
      {t:'Gubi Beetle chair',p:'Reason: color mismatch \u00b7 S$720 refunded',st:['Refunded','on'],m:'10 Jun'},
      {t:'Muuto Fiber armchair',p:'Reason: too large for the room \u00b7 S$590 refund',st:['Approved',''],m:'20 Jun'},
      {t:'Hay Palissade bench',p:'Reason: changed mind \u00b7 pending review',st:['Requested',''],m:'23 Jun'}
    ];
    var list=R.map(function(x){return '<div class="wf-row" data-view="orders"><div class="wf-row__main"><span class="wf-row__t">'+x.t+'</span><span class="wf-row__p">'+x.p+'</span></div>'+badge(x.st[0],x.st[1])+'<span class="wf-row__m" style="margin-left:14px">'+x.m+'</span></div>';}).join('');
    return '<div class="wf-list">'+list+'</div>';
  }
  function activityBody(){
    var A=[
      {t:'Eva shortlisted 4 sofas',p:'In \u201cLiving room, Scandinavian warmth\u201d',m:'2h'},
      {t:'You saved Noguchi coffee table',p:'Added to Living room refresh',m:'5h'},
      {t:'Order #FZ-20588 shipped',p:'Noguchi coffee table',m:'Yesterday'},
      {t:'Eva analyzed a new upload',p:'Bedroom, lighting reads cool-toned',m:'Yesterday'},
      {t:'You started project \u201cBalcony makeover\u201d',p:'Concept stage',m:'2d'},
      {t:'Return approved',p:'Muuto Fiber armchair \u00b7 S$590',m:'3d'},
      {t:'Eva updated your style profile',p:'Now: Warm Minimalist',m:'1w'}
    ];
    var filt=chips([['All',null,1],['Eva',null,0],['Orders',null,0],['Projects',null,0]]);
    return filt+rowList(A.map(function(a){a.dot=1;a.view='activity';return a;}));
  }
  function billingBody(){
    var sum=facts(4,[['Spent · 2026','S$5,659'],['Paid invoices','2'],['Last payment','12 Jun'],['Next charge','None due']],'wf-facts--lg');
    var PM=[['Visa','4242','08/28','Mohan Lu',1],['Mastercard','8819','03/27','Mohan Lu',0]];
    var pmrows=PM.map(function(c){return '<div class="wf-pm" data-insp="editcard">'+
      '<div class="wf-pm__main"><span class="wf-pm__brand">'+c[0]+'</span><span class="wf-pm__num">•••• '+c[1]+'</span>'+(c[4]?badge('Default','on'):'')+'</div>'+
      '<div class="wf-pm__meta">Expires '+c[2]+' · '+c[3]+'</div>'+
      '<span class="wf-pm__edit">Edit ↗</span>'+
    '</div>';}).join('');
    var pmblock=sec('Payment methods')+'<div class="wf-pms">'+pmrows+'</div>';
    var inv=[
      ['INV-2026-031','Order #FZ-20614','12 Jun','S$1,719',['Paid','on']],
      ['INV-2026-028','Order #FZ-20502','2 Jun','S$3,100',['Paid','on']],
      ['INV-2026-021','Order #FZ-20498 · refund','28 May','S$840',['Refunded','mut']]
    ];
    var rows=inv.map(function(i){return '<tr data-view="billing">'+
      '<td><div class="wf-tbl__t">'+i[0]+'</div><div class="wf-tbl__d">'+i[1]+'</div></td>'+
      '<td class="num"><span class="wf-tbl__m">'+i[2]+'</span></td>'+
      '<td class="num"><span class="wf-tbl__n">'+i[3]+'</span></td>'+
      '<td>'+badge(i[4][0],i[4][1])+'</td>'+
    '</tr>';}).join('');
    var invblock=sec('Invoices')+'<table class="wf-tbl"><thead><tr><th>Invoice</th><th class="num">Date</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table>';
    var details=sec('Billing details')+'<div class="wf-frows">'+'<div class="wf-frow"><span class="wf-frow__l">Billed to</span><span class="wf-frow__v">Mohan Lu</span></div>'+'<div class="wf-frow"><span class="wf-frow__l">Address</span><span class="wf-frow__v">Blk 123 Tampines St 11, #08-456, Singapore 521123</span></div>'+'<div class="wf-frow"><span class="wf-frow__l">GST registration</span><span class="wf-frow__v">201xxxxxxR</span></div>'+'<div class="wf-frow"><span class="wf-frow__l">Currency</span><span class="wf-frow__v">SGD (S$)</span></div>'+'</div>';return '<div class="wf-conn wf-conn--top">'+sum+pmblock+invblock+details+'</div>';
  }
  function privacyBody(){
    var snap=section('What Eva remembers right now','',4,[['Style','Warm Minimalist'],['Budget','S$15\u201320k'],['Active rooms','4'],['Taste signals','6']].map(function(x){return {top:'<div class="wf-fact__l">'+x[0]+'</div><div class="wf-fact__v">'+x[1]+'</div>'};}))+
      '<p style="margin-top:13px"><span class="wf-mem__src" data-view="style">Review what Eva remembers \u2197</span></p>';
    var canUse=sec('What Eva can use')+'<div class="wf-togblock">'+togDesc([
      ['Remember my taste across sessions','Eva keeps your style profile and preferences between visits, so you don\u2019t start over each time.'],
      ['Use my uploads to improve recommendations','Your room photos help Eva learn your space, lighting, and proportions.'],
      ['Personalize with my purchase history','Past orders inform what Eva suggests next and what it avoids repeating.']
    ])+'</div>';
    var data=sec('Your data')+'<div class="wf-led-list">'+rowList([
      {t:'Export my data',p:'Download everything Eva knows about you',m:'Request',view:'privacy'},
      {t:'Download conversations',p:'All threads with Eva as a file',m:'Request',view:'privacy'}])+'</div>';
    var danger=sec('Danger zone')+'<div class="wf-led-list">'+rowList([
      {t:'Clear Eva\u2019s memory',p:'Eva forgets your taste profile and starts fresh',m:'Clear',view:'privacy'},
      {t:'Delete account',p:'Permanently remove your account and all data',m:'Delete',view:'privacy'}])+'</div>';
    return '<div class="wf-conn wf-conn--top wf-conn--flat">'+snap+canUse+data+danger+'</div>';
  }
  function helpBody(){
    var search='<div class="wf-helpsearch"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2L14 14"/></svg><span>Search help articles…</span></div>';
    var topics=section('Popular topics','The guides people open most, short reads written by the team.',2,[
      {t:'How Eva builds your style profile',d:'From your quiz, recent chats, and saved pieces, and how to read what she infers about your taste.',go:'Read ↗',view:'help'},
      {t:'Editing what Eva remembers',d:'Review, correct, or remove any taste signal Eva has picked up from your activity.',go:'Read ↗',view:'help'},
      {t:'Delivery & returns in Singapore',d:'Typical timelines and fees, plus how to start a return on any order.',go:'Read ↗',view:'help'},
      {t:'Sharing a project with others',d:'Invite collaborators and control exactly what they can see and edit.',go:'Read ↗',view:'help'}
    ]);
    var fb=section('Feedback','Reach a real person, or tell us what to build next.',3,[
      {t:'Send feedback',d:'Tell us what’s working and what isn’t, it shapes what we build next.',go:'Open ↗',view:'help'},
      {t:'Report a problem',d:'Something broken or behaving oddly? Let the team know.',go:'Open ↗',view:'help'},
      {t:'Email support',d:'help@furnishes.studio · a person replies within a day.',go:'Email ↗',view:'help'}
    ]);
    return '<div class="wf-conn wf-conn--top">'+search+topics+fb+'</div>';
  }

  function settingsBody(){
    function frow(l,v,a){return '<div class="wf-frow"><span class="wf-frow__l">'+l+'</span><span class="wf-frow__v">'+v+'</span>'+(a?'<span class="wf-frow__a" data-insp="settings">'+a+'</span>':'')+'</div>';}
    function secintro(t){return '<p class="wf-secintro">'+t+'</p>';}
    var C=[['Transactional',[1,1,1]],['Project activity',[1,0,1]],['Shared-project mentions',[1,1,1]],['Eva digest',[1,0,0]],['New collections',[1,0,0]],['Design tips',[0,0,0]],['Marketing & promotions',[0,0,0]]];
    var nhead='<div class="wf-notif__r wf-notif__h"><span>Category</span><span>Email</span><span>SMS</span><span>Push</span></div>';
    var nrows=C.map(function(c){return '<div class="wf-notif__r"><span class="wf-notif__cat">'+c[0]+'</span>'+c[1].map(function(on){return '<span class="wf-notif__c"><span class="wf-check'+(on?' on':'')+'"></span></span>';}).join('')+'</div>';}).join('');
    var notif='<div class="wf-notif">'+nhead+nrows+'</div>';
    var digest='<div class="wf-frows" style="border-top:1px solid var(--hair)"><div class="wf-frow"><span class="wf-frow__l">Digest frequency</span><div class="wf-choice" style="flex:1;margin-top:0"><span>Daily</span><span class="on">Weekly</span><span>Off</span></div></div></div>';
    var secf='<div class="wf-frows">'+frow('Password','••••••••••••','Change')+frow('Recovery email','m.lu@gmail.com','Edit')+'</div>';
    var tfa='<div class="wf-togblock">'+togDesc([['Authenticator app','Require a code from your authenticator app at every sign-in.'],['Alert on new sign-ins','Email me whenever a new device signs into the account.']])+'</div>';
    var sess=cells(2,[
      {top:'<div class="wf-cellbox__top"><span class="wf-cellbox__t">Chrome · macOS</span>'+badge('This device','on')+'</div>',d:'Singapore · active now in this browser session.',meta:'Active now'},
      {t:'Safari · iPhone 15',d:'Singapore · Furnishes mobile app on your phone.',meta:'2 days ago',go:'Sign out ↗',view:'settings'}
    ]);
    var acct='<div class="wf-frows">'+frow('Full name','Mohan Lu','Edit')+frow('Email','mohan.lu@furnishes.studio','Edit')+frow('Location','Singapore','Edit')+frow('Member since','Jan 2026','')+'</div>';
    return '<div class="wf-conn wf-conn--top">'+
      sec('Notifications')+secintro('Choose how Eva reaches you. Transactional alerts can’t be turned off.')+notif+digest+
      sec('Sign-in & security')+secintro('Your password, recovery email, and two-factor protection.')+secf+tfa+
      sec('Active sessions')+secintro('Where your account is signed in right now.')+sess+
      sec('Account')+secintro('Your profile details on Furnishes.')+acct+
      '<div style="margin-top:24px"><span class="wf-btn">Save changes</span></div>'+
    '</div>';
  }

  /* ---------- view registry ---------- */
  var V={
    style:{e:'How Eva Knows Me',t:'Your design language',s:'Everything Eva uses to personalize your recommendations, your taste, what she remembers, your budget, and your space.',a:'<span class="wf-btn">\u2713 Save profile</span><span class="wf-btn ghost">\u21bb Re-take quiz</span>',f:styleBody},
    budget:{e:'How Eva Knows Me',t:'Where your money goes',s:'Share a range and break it out per room. Eva filters every recommendation to fit.',a:'<span class="wf-btn">Save range</span>',f:budgetBody},
    privacy:{e:'How Eva Knows Me',t:'Eva\u2019s memory & data',s:'What Eva is allowed to remember about you, and how to review, export, or erase it.',f:privacyBody},
    conversations:{e:'Design Work',t:'Conversations',s:'Your threads with Eva, sortable, with status and last activity.',a:'<span class="wf-btn" data-view="chat">+ New thread</span>',f:conversationsBody},
    shortlist:{e:'Design Work',t:'Saved pieces',s:'Saved pieces, grouped by project.',a:'<span class="wf-btn">+ Add piece</span>',f:shortlistBody},
    projects:{e:'Design Work',t:'Design projects',s:'Each project keeps its preferences, chats, files, and progress together.',a:'<span class="wf-btn" data-insp="newproject">+ New project</span>',f:projectsBody},
    uploads:{e:'Design Work',t:'Uploads',s:'Photos you\u2019ve shared with Eva, with her analysis attached.',a:'<span class="wf-btn ghost">Share in Eva</span>',f:uploadsBody},
    orders:{e:'Orders & Account',t:'Orders',s:'Your orders, deliveries, and returns, the whole lifecycle in one place.',a:'<span class="wf-btn" data-insp="startreturn">Start a return</span>',f:ordersBody},
    billing:{e:'Orders & Account',t:'Billing',s:'Your payment methods and invoices.',a:'<span class="wf-btn" data-insp="addcard">+ Add card</span>',f:billingBody},
    settings:{e:'Orders & Account',t:'Settings',s:'Notifications, sign-in & security, and account details.',f:settingsBody},
    help:{e:'Orders & Account',t:'Help & feedback',s:'Find answers, or tell us what could be better.',f:helpBody},
    cart:{e:'Orders & Account',t:'Cart',s:'Pieces ready for checkout, across your projects.',f:cartBody},
    checkout:{e:'Orders & Account',t:'Checkout',s:'Confirm delivery and payment.',f:checkoutBody},
    activity:{e:'Overview',t:'Activity',s:'A timeline of everything happening across your studio.',f:activityBody},
    imagegen:{e:'Workspace',t:'Image Gen',s:'Generate and edit room visuals with Eva.',f:imagegenBody},
    chat:{e:'Workspace',t:'Chat',s:'Talk with Eva.',f:chatBody}
  };

  function setActive(view){
    navLinks.forEach(function(a){a.classList.toggle('is-active',a.dataset.view===view);});
    var tabView=(view==='imagegen')?'imagegen':(view==='chat')?'chat':'dashboard';
    tabs.forEach(function(t){t.classList.toggle('is-active',t.dataset.view===tabView);});
    if(taglineEl&&TAGLINES[tabView]) taglineEl.textContent=TAGLINES[tabView];
  }
  function render(view){currentView=view;ST.view=view;closeInsp();
    wireview.classList.toggle('wireview--chat', view==='chat');
    var _rm=$('#fa-rail-main'),_rc=$('#fa-rail-chat');
    if(_rm)_rm.hidden=(view==='chat'); if(_rc)_rc.hidden=(view!=='chat');
    if(view==='dashboard'||!V[view]){canvas.style.display='flex';wireview.style.display='none';}
    else if(view==='chat'){ wireview.innerHTML=chatBody(); canvas.style.display='none';wireview.style.display='flex';wireview.scrollTop=0; var _cb=wireview.querySelector('.wf-cx__body'); if(_cb)_cb.scrollTop=_cb.scrollHeight; updateFootH(); setStreamUI(STREAM.on); var _t9=wireview.querySelector('[data-chat-input]'); if(_t9){autoGrow(_t9);setSendEmpty();} if(ST.chatSec&&currentView==='chat')showSection(ST.chatSec,true); }
    else{var s=V[view];wireview.innerHTML='<div class="wf-vmain">'+head(s.e,s.t,s.s,s.a)+s.f()+'</div>';canvas.style.display='none';wireview.style.display='flex';wireview.scrollTop=0;}
  }
  var navBusy=false;
  function staggerize(host){
    var vm=host.querySelector&&host.querySelector('.wf-vmain');
    var out=[].slice.call((vm||host).children).filter(function(x){return !(x.classList&&x.classList.contains('wf-insp'));});
    var depth=0;
    while(out.length<4&&depth<3){
      var nxt=[],grew=false;
      out.forEach(function(r){var k=[].slice.call(r.children);
        if(k.length){nxt=nxt.concat(k);grew=grew||k.length>1;}else nxt.push(r);});
      if(nxt.length===out.length&&!grew)break;
      out=nxt;depth++;
    }
    if(out.length<6){
      var fin=[];
      out.forEach(function(k){var gk=[].slice.call(k.children);
        if(gk.length>=3){gk.forEach(function(g){fin.push(g);});}else fin.push(k);});
      out=fin;
    }
    out=out.slice(0,14);
    out.forEach(function(el,i){ el.classList.add('wf-riser'); el.style.animationDelay=(i*0.04)+'s'; });
    T(function(){ out.forEach(function(el){ el.classList.remove('wf-riser'); el.style.animationDelay=''; }); },980);
  }
  function go(view){setActive(view);
    if(navBusy){render(view);runSweep();return;}
    navBusy=true;
    var outHost=(canvas&&canvas.style.display!=='none')?canvas:wireview;
    outHost.classList.add('wf-viewout');
    T(function(){
      outHost.classList.remove('wf-viewout');
      render(view);runSweep();
      var inHost=(canvas&&canvas.style.display!=='none')?canvas:wireview;
      staggerize(inHost);
      T(function(){navBusy=false;},560);
    },130);}

  on('animationend',function(e){ if((e.animationName==='wfmsg'||e.animationName==='wffade')&&e.target.classList) e.target.classList.remove('wf-cmsg--in'); },true);
  on('input',function(e){ var t=e.target; if(t&&t.matches&&t.matches('[data-chat-input]')){ autoGrow(t); setSendEmpty(); clearTimeout(ST.draftT); ST.draftT=T(function(){ if(CHAT)CHAT.draft=t.value; },500); } },true);
  on('keydown',function(e){ var t=e.target;
    if(e.key==='Escape'){ var _mk0=$('[data-srcmask]'); if(_mk0&&!_mk0.hidden){ closeSrc(); return; } var _pk0=$('[data-pickmask]'); if(_pk0&&!_pk0.hidden){ closePicker(); return; } }
    if(t&&t.matches&&t.matches('[data-chat-input]')){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); if(t.value.trim()&&!STREAM.on){ var v=t.value; t.value=''; t.style.height='auto'; setSendEmpty(); sendUser(v); } } return; }
    if(t&&t.matches&&t.matches('[data-me-in]')){ var mi9=+t.getAttribute('data-me-in'); if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); editResend(mi9,t.value); } else if(e.key==='Escape'){ meditCancel(mi9); } return; }
    if(t&&t.matches&&t.matches('[data-x-in]')){ var xi=+t.getAttribute('data-x-in'); if(e.key==='Enter'){ e.preventDefault(); confirmEx(xi,t.value.trim()||null); } else if(e.key==='Escape'){ exRestore(xi); } return; }
    if(t&&t.matches&&t.matches('[data-pin]')){ var pk=t.getAttribute('data-pin'); if(e.key==='Enter'){ e.preventDefault(); if(t.value.trim()){ setPref(pk,t.value.trim()); showToast('Preference updated'); } else paintPref(pk); } else if(e.key==='Escape'){ paintPref(pk); } return; }
    if(e.key==='Escape'){ var _ep2=$('[data-entpop]'); if(_ep2&&!_ep2.hidden){ closeEntPop(); return; } var _st2=$('[data-seltool]'); if(_st2&&!_st2.hidden){ closeSelTool(); return; } var _dd2=$('[data-crumbdd]'); if(_dd2&&!_dd2.hidden){ closeCrumbDD(); return; } var _pk=$('[data-pickmask]'); if(_pk&&!_pk.hidden){ closePicker(); return; } var _mk=$('[data-srcmask]'); if(_mk&&!_mk.hidden){ closeSrc(); return; } var _as=$('.wf-cx__aside.open'); if(_as){ _as.classList.remove('open'); } }
  });
  on('change',function(e){ var t=e.target; if(!t||!t.matches||!t.matches('[data-chat-file]'))return;
    var f=t.files&&t.files[0]; t.value=''; if(!f)return;
    var errBox=$('.wf-cxerrs');
    if(f.size>1500000){ if(errBox)errBox.innerHTML='<div class="wf-cxerr"><span><b>'+escT(f.name)+'</b> is too large (max 1.5 MB).</span><span class="wf-exbtn" data-file-replace>Replace file</span></div>'; updateFootH(); return; }
    if(errBox)errBox.innerHTML='';
    var w=$('.wf-attach'); if(w){ w.innerHTML='<span class="wf-attach__chip"><span>\ud83d\udcce '+escT(f.name)+'</span><span class="wf-psel__x" data-att-x title="Remove">\u2715</span></span>'; w.classList.add('has'); } ATT={name:f.name};
    updateFootH(); },true);
  on('scroll',function(e){ if(e.target&&e.target.classList&&e.target.classList.contains('wf-cx__body')){updatePill();closeEntPop();closeSelTool();} },true);
  on('keydown',function(e){ if(e.key!=='Escape'||!ST.chatSec)return;
    var _fsp=$('.wf-fsplit'); if(_fsp){ ST.fsel=null; showSection('files',true); return; }
    if($('[data-refrow]'))return;
    var ov=['[data-entpop]','[data-seltool]','[data-crumbdd]','[data-pickmask]','[data-srcmask]'];
    for(var i=0;i<ov.length;i++){var el=$(ov[i]);if(el&&!el.hidden)return;}
    exitSection(); },true);
  on('mouseup',function(e){ if(!e.target||!e.target.closest||!e.target.closest('.wf-cx__body')){return;} T(showSelTool,0); },true);
  on('click',function(e){
    var _dd0=$('[data-crumbdd]');
    if(_dd0&&!_dd0.hidden&&!e.target.closest('.wf-crumb'))closeCrumbDD();
    var _ep0=$('[data-entpop]');
    if(_ep0&&!_ep0.hidden&&!e.target.closest('[data-entpop]')&&!e.target.closest('[data-ent]'))closeEntPop();
    var ent=e.target.closest('mark[data-ent]'); if(ent){ var _sl=window.getSelection&&window.getSelection(); if(_sl&&!_sl.isCollapsed){/* selecting, not clicking */} else { openEntPop(ent); return; } }
    var ea=e.target.closest('[data-entact]'); if(ea){ var _v=ea.getAttribute('data-v')||''; var _m2=ea.getAttribute('data-mi2'); var _src=(_m2!==null&&_m2!=='null')?+_m2:null; var _k=ea.getAttribute('data-entact');
      if(_k==='budget'){ setPref('budget',_v,_src); flashPref('budget'); showToast('Noted for your project: budget range: '+_v); }
      else if(_k==='color'){ setPref('color',_v,_src); flashPref('color'); showToast('Noted for your project: color preference: '+_v); }
      else if(_k==='furniture'){ setPref('furniture',_v,_src); flashPref('furniture'); showToast('Noted for your project: furniture need: '+_v); }
      else if(_k==='shortlist'){ showToast('Added to your shortlist (demo)'); }
      else if(_k==='copy'){ try{ if(navigator.clipboard)navigator.clipboard.writeText(_v).catch(function(){}); }catch(_e){} showToast('Copied'); }
      else if(_k==='ask'){ if(!STREAM.on)sendUser('Tell me more about '+_v); }
      else if(_k==='quote'){ var _ta3=chatEls().ta; if(_ta3){ _ta3.value='\u201c'+_v+'\u201d '; autoGrow(_ta3); setSendEmpty(); _ta3.focus(); } }
      closeEntPop(); return; }
    var sa=e.target.closest('[data-selact]'); if(sa){ var sv=sa.getAttribute('data-selact'); var vv=sa.getAttribute('data-v')||''; var sm=sa.getAttribute('data-mi2'); var ssrc=(sm!==null&&sm!=='null')?+sm:null;
      if(sv==='save'){ sa.parentNode.innerHTML=['room','budget','style','color','furniture'].map(function(k){return '<button data-selpref="'+k+'" data-v="'+escT(vv).replace(/"/g,'&quot;')+'" data-mi2="'+(ssrc===null?'null':ssrc)+'">'+PREFS[k].label.split(' ')[0]+'</button>';}).join(''); return; }
      if(sv==='quote'){ var _ta4=chatEls().ta; if(_ta4){ _ta4.value='\u201c'+vv+'\u201d '; autoGrow(_ta4); setSendEmpty(); _ta4.focus(); } }
      else if(sv==='ask'){ if(!STREAM.on)sendUser('Tell me more about \u201c'+vv+'\u201d'); }
      else if(sv==='copy'){ try{ if(navigator.clipboard)navigator.clipboard.writeText(vv).catch(function(){}); }catch(_e){} showToast('Copied'); }
      try{window.getSelection().removeAllRanges();}catch(_e){}
      closeSelTool(); return; }
    var sp2=e.target.closest('[data-selpref]'); if(sp2){ var pk2=sp2.getAttribute('data-selpref'); var pv2=sp2.getAttribute('data-v')||''; var pm2=sp2.getAttribute('data-mi2');
      setPref(pk2,pv2,(pm2!==null&&pm2!=='null')?+pm2:null); flashPref(pk2); showToast('Noted for your project: '+PREFS[pk2].label+': '+pv2);
      try{window.getSelection().removeAllRanges();}catch(_e){} closeSelTool(); return; }
    var cb=e.target.closest('[data-crumb-brand]'); if(cb){ showSection('project',true); return; }
    var cm=e.target.closest('[data-crumb-menu]'); if(cm){ var _dd1=$('[data-crumbdd]'); if(_dd1&&_dd1.hidden)openCrumbDD(); else closeCrumbDD(); return; }
    var cnw=e.target.closest('[data-crumb-new]'); if(cnw){ chatReset(); showToast('New chat started'); return; }
    var rm=e.target.closest('.wf-room'); if(rm){ var rt=rm.querySelector('.wf-room__t'); var rd=rm.querySelector('.wf-room__d'); sendUser('I\u2019d like help with '+(rt?rt.textContent:'this room')+'. '+(rd?rd.textContent:'')); return; }
    var c2=e.target.closest('.wf-chip2'); if(c2&&!c2.hasAttribute('data-ref-mode')&&!c2.hasAttribute('data-file-cat')){ sendUser(c2.textContent); return; }
    var cs=e.target.closest('[data-chat-send]'); if(cs){ var _ta=chatEls().ta; if(_ta&&_ta.value.trim()&&!STREAM.on){ var _v=_ta.value; _ta.value=''; _ta.style.height='auto'; setSendEmpty(); sendUser(_v); } return; }
    var stp=e.target.closest('[data-chat-stop]'); if(stp){ stopEva(); return; }
    var rt=e.target.closest('[data-retry]'); if(rt){ retryEva(+rt.getAttribute('data-retry')); return; }
    var nv=e.target.closest('[data-newconv]'); if(nv){ chatReset(); showToast('New chat started'); return; }
    var lc=e.target.closest('[data-lc]'); if(lc){ showToast('Opening product details (demo)'); return; }
    var xo=e.target.closest('[data-x-ok]'); if(xo){ confirmEx(+xo.getAttribute('data-x-ok')); return; }
    var xa=e.target.closest('[data-x-adj]'); if(xa){ exAdjust(+xa.getAttribute('data-x-adj')); return; }
    var xs=e.target.closest('[data-x-save]'); if(xs){ var _xi=+xs.getAttribute('data-x-save'); var _xin=$('[data-x-in="'+_xi+'"]'); confirmEx(_xi,_xin&&_xin.value.trim()?_xin.value.trim():null); return; }
    var xc=e.target.closest('[data-x-cancel]'); if(xc){ exRestore(+xc.getAttribute('data-x-cancel')); return; }
    var pc=e.target.closest('.wf-pchip'); if(pc&&pc.hasAttribute('data-pk')){ setPref(pc.getAttribute('data-pk'),pc.getAttribute('data-pv'),null); showToast('Preference updated'); return; }
    var pe=e.target.closest('[data-pe]'); if(pe){ prefEdit(pe.getAttribute('data-pe')); return; }
    var px2=e.target.closest('[data-px]'); if(px2){ clearPref(px2.getAttribute('data-px')); return; }
    var ps=e.target.closest('[data-pn-save]'); if(ps){ var _pk=ps.getAttribute('data-pn-save'); var _pi=$('[data-pin="'+_pk+'"]'); if(_pi&&_pi.value.trim()){ setPref(_pk,_pi.value.trim()); showToast('Preference updated'); } else paintPref(_pk); return; }
    var pcl=e.target.closest('[data-pn-cancel]'); if(pcl){ paintPref(pcl.getAttribute('data-pn-cancel')); return; }
    var psv=e.target.closest('[data-psrc]'); if(psv){ openSrc(psv.getAttribute('data-psrc')); return; }
    var sc=e.target.closest('[data-src-close]'); if(sc){ closeSrc(); return; }
    var mk0=e.target.closest('.wf-srcmask'); if(mk0&&!e.target.closest('.wf-srcmodal')){ closeSrc(); return; }
    var po=e.target.closest('[data-prop-ok]'); if(po){ var pp=po.getAttribute('data-prop-ok').split('|');
      var _pk0=pp[0],_pv0=PREFS[_pk0].v,_ps0=PREFS[_pk0].src;
      setPref(pp[0],pp[1],+pp[2]); flashPref(pp[0]); dismissProp();
      showUndoToast('Noted for your project: '+PREFS[pp[0]].label+': '+pp[1],function(){setPref(_pk0,_pv0,_ps0);flashPref(_pk0);showToast('Preference restored');});
      if(0) showToast('Noted for your project: '+PREFS[pp[0]].label+': '+pp[1]); return; }
    var pn=e.target.closest('[data-prop-no]'); if(pn){ dismissProp(); return; }
    var ro=e.target.closest('[data-review-open]'); if(ro){ var rv=$('[data-review]'); if(rv)rv.remove(); var asd=$('.wf-cx__aside'); if(asd&&getComputedStyle(asd).display==='none'){asd.classList.add('open');}else{showToast('Preferences are on the right');} return; }
    var rn=e.target.closest('[data-review-no]'); if(rn){ var rv2=$('[data-review]'); if(rv2)rv2.remove(); return; }
    var bs=e.target.closest('.wf-brainstorm'); if(bs){ brainstorm(bs); return; }
    var sw2=e.target.closest('[data-sess]'); if(sw2){ switchSession(+sw2.getAttribute('data-sess')); return; }
    var md=e.target.closest('[data-medit]'); if(md){ meditStart(+md.getAttribute('data-medit')); return; }
    var ms2=e.target.closest('[data-me-save]'); if(ms2){ var _mi2=+ms2.getAttribute('data-me-save'); var _min=$('[data-me-in="'+_mi2+'"]'); editResend(_mi2,_min?_min.value:''); return; }
    var mc2=e.target.closest('[data-me-cancel]'); if(mc2){ meditCancel(+mc2.getAttribute('data-me-cancel')); return; }
    var ud=e.target.closest('[data-undo]'); if(ud){ var _fn=UNDO_FN; UNDO_FN=null; var _t=$('.wf-toast'); if(_t){_t.classList.remove('show','act');} if(_fn)_fn(); return; }
    var tp=e.target.closest('[data-cv-temp]'); if(tp){
      if(CHAT.temp){ var _ti2=CHAT.id; STORE.sessions=STORE.sessions.filter(function(x){return x.id!==_ti2;});
        var back=null; STORE.sessions.forEach(function(x){ if(!x.temp&&(!back||x.upd>back.upd))back=x; });
        if(!back)back=newSession();
        CHAT=back; CHATM=CHAT.msgs; ST.activeId=CHAT.id; swapChatDom(); paintRecents(); showToast('Temporary chat discarded');
      } else { flushDraft(); finalizeActiveStream(); dismissProp();
        var _ts=newSession('Temporary chat'); _ts.temp=true;
        CHAT=_ts; CHATM=CHAT.msgs; ST.activeId=CHAT.id; swapChatDom(); paintRecents(); showToast('Temporary chat, messages won\u2019t be saved');
      } return; }
    var ew3=e.target.closest('[data-eva-swap]'); if(ew3){ openPicker(); return; }
    var pk3=e.target.closest('[data-pick]'); if(pk3){ applyPersona(pk3.getAttribute('data-pick')); return; }
    var pkc=e.target.closest('[data-pick-close]'); if(pkc){ closePicker(); return; }
    var pkm=e.target.closest('.wf-pickmask'); if(pkm&&!e.target.closest('.wf-picker')){ closePicker(); return; }
    var rs3=e.target.closest('[data-resume]'); if(rs3){ var best=null; STORE.sessions.forEach(function(x){ if(x.msgs.length&&(!best||x.upd>best.upd))best=x; }); if(best)switchSession(best.id); else go('chat'); return; }
    var ao=e.target.closest('[data-aside-open]'); if(ao){ var a1=$('.wf-cx__aside'); if(a1)a1.classList.add('open'); return; }
    var ac=e.target.closest('[data-aside-close]'); if(ac){ var a2=$('.wf-cx__aside'); if(a2)a2.classList.remove('open'); return; }
    var clp=e.target.closest('.wf-composer__clip'); if(clp){ var fi=$('[data-chat-file]'); if(fi)fi.click(); return; }
    var fr2=e.target.closest('[data-file-replace]'); if(fr2){ var fi2=$('[data-chat-file]'); if(fi2)fi2.click(); return; }
    var ax=e.target.closest('[data-att-x]'); if(ax){ ATT=null; var w=$('.wf-attach'); if(w){w.innerHTML='';w.classList.remove('has');} return; }
    var tl=e.target.closest('[data-tolatest]'); if(tl){ scrollBottom(true); tl.hidden=true; return; }
    var sb=e.target.closest('[data-sec-back]'); if(sb){ exitSection(); return; }
    var ar=e.target.closest('[data-act-read]'); if(ar){ ST.actRead=ST.actRead||{}; ST.actRead[ar.getAttribute('data-act-read')]=1; showSection('activity',true); return; }
    var fo=e.target.closest('[data-file-open]'); if(fo){ ST.fsel=fo.getAttribute('data-file-open'); showSection('files',true); return; }
    var fb=e.target.closest('[data-file-back]'); if(fb){ ST.fsel=null; showSection('files',true); return; }
    var slb=e.target.closest('[data-sl]'); if(slb){ var _sl=slStore(); var _k9=slb.getAttribute('data-sl'); _sl[_k9]=!_sl[_k9]; showToast(_sl[_k9]?'Added to shortlist':'Removed from shortlist'); showSection(ST.chatSec,true); return; }
    var tk=e.target.closest('[data-task]'); if(tk){ ST.tasks=ST.tasks||{}; var _t8=tk.getAttribute('data-task'); ST.tasks[_t8]=!ST.tasks[_t8]; showSection('project',true); return; }
    var dch=e.target.closest('[data-dch]'); if(dch){ ST.dch=ST.dch||{}; var _d8=dch.getAttribute('data-dch'); ST.dch[_d8]=!ST.dch[_d8]; showSection('discover',true); return; }
    var so=e.target.closest('[data-sec-open]'); if(so){ showSection(so.getAttribute('data-sec-open')); return; }
    var ss=e.target.closest('[data-sec-sess]'); if(ss){ switchSession(+ss.getAttribute('data-sec-sess')); return; }
    var sc=e.target.closest('[data-sec-chat]'); if(sc){ var _q9=sc.getAttribute('data-sec-chat'); exitSection(); if(!STREAM.on)sendUser(_q9); return; }
    var stt=e.target.closest('[data-sec-toast]'); if(stt){ showToast(stt.getAttribute('data-sec-toast')); return; }
    var fcat=e.target.closest('[data-file-cat]'); if(fcat){ var cat=fcat.getAttribute('data-file-cat');
      [].slice.call(fcat.parentNode.children).forEach(function(x){x.classList.toggle('is-active',x===fcat);});
      [].slice.call($$('[data-fcat]')).forEach(function(r){r.style.display=(cat==='All'||r.getAttribute('data-fcat')===cat)?'':'none';});
      return; }
    var rf=e.target.closest('[data-refine]'); if(rf){ var ri=+rf.getAttribute('data-refine');
      if(ri!==CHATM.length-1){ showToast('Only the latest reply can be refined'); return; }
      var ex0=$('[data-refrow]');
      if(ex0){ ex0.remove(); return; }
      rf.closest('.wf-fbrow').insertAdjacentHTML('afterend',refineRowHtml(ri)); return; }
    var rfm=e.target.closest('[data-ref-mode]'); if(rfm){ refineEva(+rfm.getAttribute('data-ref-mi'),rfm.getAttribute('data-ref-mode')); return; }
    var pnm=e.target.closest('[data-pin-msg]'); if(pnm){ var pi=+pnm.getAttribute('data-pin-msg'); var pm=CHATM[pi]; if(!pm)return;
      pm.pinned=!pm.pinned; pnm.classList.toggle('on',pm.pinned); paintPins();
      showToast(pm.pinned?'Pinned to this project':'Unpinned'); return; }
    var pgo=e.target.closest('[data-pin-go]'); if(pgo){ var pg=pgo.getAttribute('data-pin-go').split('|'); gotoPinned(+pg[0],+pg[1]); return; }
    var fb=e.target.closest('.wf-fb'); if(fb){ var fr=fb.closest('.wf-fbrow'); if(fr&&!fr.classList.contains('lock')){ fr.classList.add('lock'); fb.classList.add('sel'); showToast('Thanks for the feedback'); } return; }
    var cp=e.target.closest('[data-copy]'); if(cp){ var _cm=CHATM[+cp.getAttribute('data-copy')]; if(_cm){ try{ if(navigator.clipboard)navigator.clipboard.writeText(plainT(_cm.x)).catch(function(){}); }catch(_e){} showToast('Copied'); } return; }
    var cl=e.target.closest('[data-insp-close]');
    if(cl){ var ct=(cl.textContent||'').toLowerCase(), ca=cl.getAttribute('data-act');
      if(ca==='savefield'&&inspSrc){ var _inp=insp.querySelector('.wf-input'), _vn=inspSrc.querySelector('.wf-frow__v'); if(_inp&&_vn) _vn.textContent=_inp.value; showToast('Saved'); }
      else if(ca==='remove'&&inspSrc){ inspSrc.remove(); showToast('Removed'); }
      else if(!/cancel|close|helpful/.test(ct)){ showToast(/remove|delete/.test(ct)?'Removed':/sign out/.test(ct)?'Signed out':/download/.test(ct)?'Downloading':/cart/.test(ct)?'Added to cart':/track/.test(ct)?'Opening tracking':/request|return/.test(ct)?'Request sent':'Saved'); }
      closeInsp(); return; }
    var ip=e.target.closest('[data-insp]'); if(ip){e.preventDefault();var ik=ip.dataset.insp,ic=_ctx(ip);if(!INSP[ik])ik=_type(ic);openInsp(ik,ic);return;}
    var ot=e.target.closest('[data-otab]'); if(ot){switchOtab(ot);return;}
    var bs=e.target.closest('.wf-brainstorm'); if(bs){ showToast('Brainstorming ideas\u2026'); return; }
    var cn=e.target.closest('.cnav a'); if(cn){ var _w=cn.closest('#fa-rail-chat'); if(_w){ [].slice.call(_w.querySelectorAll('.cnav a')).forEach(function(x){x.classList.remove('is-active');}); } cn.classList.add('is-active'); var _sp=cn.querySelector('span'); var _ck=cn.getAttribute('data-cnav'); if(_ck==='new'){ chatReset(); showToast('New chat started'); } else if(SEC[_ck]){ showSection(_ck); } else { showToast(_sp?_sp.textContent:'Opened'); } return; }
    var chip=e.target.closest('.wf-chip');
    if(chip&&chip.parentNode&&chip.parentNode.classList.contains('wf-tools')){
      [].slice.call(chip.parentNode.children).forEach(function(c){ if(c.classList&&c.classList.contains('wf-chip')) c.classList.toggle('on',c===chip); });
      applyFilter(chip); return;
    }
    var choice=e.target.closest('.wf-choice');
    if(choice){ var sp=e.target.closest('span'); if(sp){ [].slice.call(choice.children).forEach(function(x){ x.classList.toggle('on',x===sp); }); } return; }
    var tgl=e.target.closest('.wf-toggle,.wf-tog2');
    if(tgl){ var sw=tgl.querySelector('.wf-switch'); if(sw) sw.classList.toggle('off'); return; }
    var chk=e.target.closest('.wf-check'); if(chk){ chk.classList.toggle('on'); return; }
    var nb=e.target.closest('.wf-btn');
    if(nb&&!nb.hasAttribute('data-view')&&!nb.hasAttribute('data-insp')){
      var bt=(nb.textContent||'').toLowerCase();
      if(/password/.test(bt)){ openInsp('changepw',{}); return; }
      if(/quiz/.test(bt)){ openInsp('info',{view:'style',title:'Re-take style quiz',detail:'Answer a few quick questions and Eva refreshes your style profile.'}); return; }
      if(/new\b|add/.test(bt)){ openInsp('new',{title:nb.textContent.replace(/[+\u2197]/g,'').trim(),view:currentView}); return; }
      if(/save|update|create|request|apply/.test(bt)){ showToast('Saved'); return; }
      return;
    }
    var fa=e.target.closest('.wf-frow__a,.wf-move');
    if(fa){ e.preventDefault(); var cf=_ctx(fa); openInsp(_type(cf),cf); return; }
    var el=e.target.closest('[data-view]');
    if(el){ e.preventDefault();
      var dv=el.dataset.view;
      var isNav=el.matches('.tab')||!!el.closest('.nav'); /* sidebar nav link or top mode tab = pure navigation chrome */
      if(isNav&&dv===currentView){ return; }               /* already on this view -> do nothing, no inspector */
      if(isNav&&dv==='chat'){ go('chat'); return; }        /* CHAT tab -> open the chat page */
      if(dv==='chat'){ var cc=_ctx(el); openInsp('thread',cc); }
      else if((V[dv]||dv==='dashboard')&&dv!==currentView){ go(dv); }
      else if(isNav){ return; }                            /* nav chrome with nothing to navigate to -> no-op */
      else { var cd=_ctx(el); openInsp(_type(cd),cd); }
      return;
    }
    var item=e.target.closest('.wf-shelf__c,.wf-log,.wf-prow,tr.wf-trow,.wf-cellbox:not(.wf-cellbox--empty):not(.wf-cellbox--band)');
    if(item){ var ci2=_ctx(item); openInsp(_type(ci2),ci2); return; }
  });

  /* initial paint: restore the persisted session after a host remount, same view,
     same conversation, instant (no sweep, no entrance animations, chat pinned to bottom) */
  wireview.style.display='none';
  paintRecents();
  if(!ST.booted){ ST.booted=1;
    T(function(){ var h0=(canvas&&getComputedStyle(canvas).display!=='none')?canvas:wireview; staggerize(h0); },40); }
  if(currentView!=='dashboard'&&V[currentView]){
    setActive(currentView); render(currentView);

  }
})();
    } catch (err) {
      console.error("[FurnishesAccount] engine error:", err);
      setEngineError(true);
    }

    return () => {
      RT.listeners.forEach(([t, fn, c]) => { try { document.removeEventListener(t, fn, c); } catch (e) {} });
      RT.listeners.length = 0;
      RT.timers.forEach((id) => clearTimeout(id)); RT.timers.clear();
      RT.intervals.forEach((id) => clearInterval(id)); RT.intervals.clear();
      RT.fontNodes.forEach((n) => { if (n.parentNode) n.parentNode.removeChild(n); });
      RT.fontNodes.length = 0;
    };
  }, [bootKey]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {engineError ? (
        <div className="furnishes-account" data-surface="account" role="alert"
          style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center", fontFamily: '"Space Mono", ui-monospace, monospace', color: "#6b2c12", background: "#FFF2E5" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "16px" }}>Something went wrong loading your account.</p>
          <button type="button" onClick={() => { setEngineError(false); setBootKey((k) => k + 1); }}
            style={{ cursor: "pointer", padding: "10px 18px", borderRadius: "3px", border: "1px solid #6b2c12", background: "#6b2c12", color: "#FBF0DC", font: "inherit" }}>
            Reload
          </button>
        </div>
      ) : (
        <div key={bootKey} ref={rootRef} className="furnishes-account" data-surface="account" />
      )}
    </>
  );
}
