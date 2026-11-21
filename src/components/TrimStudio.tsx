"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export type StudioMoment = { thumb?: string; title: string; hook?: string; score?: number };
export type StudioProps = {
  poster?: string;            // frame of the stream / video
  title: string;              // video or stream title
  channel?: string;
  live?: boolean;
  step: string;               // real current step, e.g. "Finding viral moments"
  stepIndex: number;
  steps: string[];
  moments: StudioMoment[];    // clips found so far (newest last); empty = still searching
  total?: number;             // clips ready
  demo?: boolean;             // welcome preview, not a real job
};

const W = 1120, H = 640;
const STICKERS = ["💀", "😂", "🔥", "👀"];
const CROPS = [10, 52, 26, 40];
const DEFAULT: StudioMoment[] = [
  { title: "The moment chat went crazy", hook: "WAIT FOR IT", score: 0.94 },
  { title: "He did not see this coming", hook: "HE DID NOT SEE THIS COMING", score: 0.9 },
  { title: "Gone in three seconds", hook: "GONE IN 3 SECONDS", score: 0.96 },
];

/**
 * "Trim Studio": a motion-design view of clipping in progress. Pieces fly between panels — a found moment drops into the
 * timeline, its frame jumps to the monitor, the 9:16 crop morphs into the phone, caption words and a sticker land on it,
 * and the finished Short flies into My clips. Drawn at a fixed design size and scaled to fit its container.
 */
export function TrimStudio(props: StudioProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [reduced, setReduced] = useState(false);
  const key = props.moments.map((m) => m.title).join("|") + (props.poster ?? "");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set(); mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const r = root.current;
    if (!r || reduced) return;
    return play(r, props);
    // re-run only when the content changes (new clips, new poster)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  const moments = props.moments.length ? props.moments.slice(-3) : DEFAULT;
  const poster = props.poster || moments.find((m) => m.thumb)?.thumb;
  const film = props.moments.map((m) => m.thumb).filter(Boolean) as string[];

  return (
    <div ref={wrap} className="ts-wrap" style={{ height: H * scale }}>
      <style>{CSS}</style>
      <div ref={root} className="ts" style={{ width: W, height: H, transform: `scale(${scale})` }} aria-label="Clipping in progress" role="img">
        <div className="ts-cam">
          <div className="ts-head">
            <span className="ts-brand">Trim <em>Studio</em></span>
            <span className="ts-pill"><i /><span data-k="pill">{props.demo ? "Preview" : props.step}</span></span>
            <span className="ts-meta">
              {props.live ? "LIVE · " : ""}{(props.channel || props.title).slice(0, 48).toUpperCase()}
              {props.demo ? "" : ` · STEP ${Math.min(props.stepIndex + 1, props.steps.length)}/${props.steps.length}`}
            </span>
          </div>
          <div className="ts-grid">
            <section className="ts-panel ts-tx">
              <div className="ts-label">{props.moments.length ? "Moments found" : "Example moments"} <b>{props.moments.length ? "AI" : "how it works"}</b></div>
              <div className="ts-beam" data-k="beam" />
              <div className="ts-lines">
                {moments.map((m, i) => (
                  <div className="ts-ln" data-k={`ln${i}`} key={i}>
                    <span className="t">★ {((m.score ?? 0.9) * 10).toFixed(1)}</span><span>{m.title}</span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 6 - moments.length) }, (_, i) => <div className="ts-ln ghost" key={`g${i}`}><span className="bar" style={{ width: `${55 + ((i * 37) % 40)}%` }} /></div>)}
              </div>
            </section>

            <section className="ts-panel ts-mon">
              <div className="ts-label">Source <b>{props.live ? "live" : "16:9"}</b></div>
              <div className="ts-screen" data-k="screen">
                <div className="ts-img" data-k="img" style={poster ? { backgroundImage: `url(${poster})` } : undefined} />
                <div className="ts-face" data-k="face" />
                <div className="ts-crop" data-k="crop"><span>9:16</span></div>
                <div className="ts-flash" data-k="flash" />
              </div>
              <div className="ts-capbar" data-k="capbar" />
              <div className="ts-row"><span className="ts-title">{props.title}</span><span>score <b data-k="score">—</b></span></div>
            </section>

            <section className="ts-panel ts-out">
              <div className="ts-label">Output <b>9:16</b></div>
              <div className="ts-phone" data-k="phone">
                <div className="ts-pimg" data-k="pimg" style={poster ? { backgroundImage: `url(${poster})` } : undefined} />
                <div className="ts-veil" data-k="veil" />
                <div className="ts-hook" data-k="hook"><span /></div>
                <div className="ts-pcap" data-k="pcap" />
                <div className="ts-stk" data-k="stk" />
              </div>
              <div className="ts-tray" data-k="tray">{STICKERS.map((s) => <span key={s}>{s}</span>)}</div>
              <div className="ts-stackwrap"><div className="ts-stack" data-k="stack" /><div><span className="k">My clips</span><span className="ts-count" data-k="count">{props.total ?? 0}</span></div></div>
            </section>

            <section className="ts-panel ts-tl">
              <div className="ts-label">Timeline <b>{props.steps[props.stepIndex] ?? ""}</b></div>
              <div className="ts-tracks">
                <span className="k">Video</span>
                <div className="ts-lane" data-k="lane">
                  <div className="ts-film">{Array.from({ length: 12 }, (_, i) => <i key={i} style={film.length || poster ? { backgroundImage: `url(${film[i % Math.max(1, film.length)] || poster})` } : undefined} />)}</div>
                </div>
                <span className="k">Audio</span>
                <div className="ts-lane s"><div className="ts-wave">{Array.from({ length: 120 }, (_, i) => <i key={i} style={{ height: `${Math.round(16 + Math.abs(Math.sin(i * 1.3) * 55 + Math.sin(i * 0.27) * 25))}%` }} />)}</div></div>
                <div className="ts-ph" data-k="ph" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ choreography */
function play(r: HTMLElement, p: StudioProps): () => void {
  const q = (k: string) => r.querySelector(`[data-k="${k}"]`) as HTMLElement;
  const moments = p.moments.length ? p.moments.slice(-3) : DEFAULT;
  const layer = document.createElement("div");
  layer.className = "ts-layer";
  document.body.appendChild(layer);
  const cur = document.createElement("div");
  cur.className = "ts-cur";
  cur.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.6L20 11z" fill="#ff2e88" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg><b>AI editor</b>`;
  layer.appendChild(cur);
  const label = cur.querySelector("b") as HTMLElement;
  const rect = (el: Element) => el.getBoundingClientRect();
  const center = (el: Element) => { const b = rect(el); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
  const state = { crop: 34 };

  const applyCrop = () => {
    q("crop").style.left = state.crop + "%";
    const phone = q("phone"), w = phone.clientHeight * 16 / 9;
    const pimg = q("pimg");
    pimg.style.width = w + "px";
    pimg.style.transform = `translateX(${-state.crop / 100 * w}px)`;
  };
  applyCrop();

  gsap.set(cur, { x: innerWidth / 2, y: innerHeight, opacity: 0 });
  const moveTo = (el: Element, text: string | null, dur = .7, dx = .5, dy = .5) => {
    const b = rect(el);
    const tl = gsap.timeline();
    if (text) tl.call(() => { label.textContent = text; });
    return tl.to(cur, { x: b.left + b.width * dx, y: b.top + b.height * dy, opacity: 1, duration: dur, ease: "power3.inOut" });
  };
  const sparks = (x: number, y: number, color = "#ff2e88", n = 12) => {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i"); s.className = "ts-spark"; s.style.background = color; layer.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 60;
      gsap.fromTo(s, { x, y, scale: 1, opacity: 1 }, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, scale: 0, opacity: 0, duration: .6 + Math.random() * .4, ease: "power3.out", onComplete: () => s.remove() });
    }
  };
  /** Shared-element flight: clone travels on an arc from one box to another, scaling and blurring in flight. */
  const fly = (node: HTMLElement, from: Element, to: Element, o: { dur?: number; lift?: number; spin?: number; ease?: string } = {}) => {
    const a = rect(from), b = rect(to);
    node.classList.add("ts-fly"); layer.appendChild(node);
    Object.assign(node.style, { width: a.width + "px", height: a.height + "px" });
    const t = { v: 0 }, sx = b.width / a.width, sy = b.height / a.height, lift = o.lift ?? -100, spin = o.spin ?? 0;
    return gsap.to(t, { v: 1, duration: o.dur ?? .85, ease: o.ease ?? "power2.inOut", onUpdate() {
      const k = t.v, u = 1 - k;
      const x = u * a.left + k * b.left, y = u * a.top + k * b.top + lift * 4 * k * u;
      node.style.transform = `translate(${x}px,${y}px) scale(${1 + (sx - 1) * k},${1 + (sy - 1) * k}) rotate(${spin * Math.sin(Math.PI * k)}deg)`;
      node.style.filter = `blur(${Math.sin(Math.PI * k) * 2}px)`;
    }, onComplete: () => node.remove() });
  };
  const cam = r.querySelector(".ts-cam") as HTMLElement;
  const push = (el: Element | null, s = 1.05, dur = .7) => {
    if (!el) return gsap.to(cam, { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, duration: dur, ease: "power3.inOut" });
    const c = { x: W / 2, y: H / 2 }, e = el as HTMLElement;
    const ex = e.offsetLeft + e.offsetWidth / 2, ey = e.offsetTop + e.offsetHeight / 2 + 50;
    return gsap.to(cam, { x: (c.x - ex) * (s - 1) * 1.4, y: (c.y - ey) * (s - 1) * 1.4, scale: s, rotateY: (ex - c.x) / W * -5, rotateX: (ey - c.y) / H * 4, duration: dur, ease: "power3.inOut" });
  };

  const ph = gsap.fromTo(q("ph"), { left: "54px" }, { left: "calc(100% - 2px)", duration: 14, ease: "none", repeat: -1 });
  const pan = gsap.to(q("img"), { scale: 1.08, xPercent: -2, duration: 9, yoyo: true, repeat: -1, ease: "sine.inOut" });

  const moment = (m: StudioMoment, i: number) => {
    const tl = gsap.timeline();
    const line = q(`ln${i}`);
    const lane = q("lane");
    const cut = document.createElement("div"); cut.className = "ts-cut";
    cut.innerHTML = `<b>★ ${((m.score ?? 0.9) * 10).toFixed(1)}</b>`;
    Object.assign(cut.style, { left: `${12 + i * 29}%`, width: `${9 + (i % 2) * 3}%` });
    const words = (m.hook || m.title).toUpperCase().split(/\s+/).filter(Boolean).slice(0, 3);
    const sticker = (r.querySelectorAll(`[data-k="tray"] span`)[i % 4]) as HTMLElement;

    // found moment lights up in the list
    tl.add(push(r.querySelector(".ts-tx"), 1.04, .6))
      .fromTo(q("beam"), { opacity: 0, top: 30 }, { opacity: 1, top: () => line.offsetTop - 4, duration: .7, ease: "power2.inOut" }, "<")
      .add(moveTo(line, "Found a moment", .6, .85), "<.15")
      .call(() => line.classList.add("hot"))
      .fromTo(line, { scale: 1 }, { scale: 1.05, duration: .16, yoyo: true, repeat: 1 })
      .to(q("beam"), { opacity: 0, duration: .3 });
    // …drops into the timeline as a cut
    tl.add(push(r.querySelector(".ts-tl"), 1.05, .6))
      .add(() => {
        lane.appendChild(cut);
        const chip = line.cloneNode(true) as HTMLElement;
        Object.assign(chip.style, { background: "rgba(255,46,136,.92)", color: "#000", borderRadius: "8px", fontWeight: "700" });
        fly(chip, line, cut, { dur: .8, lift: -50, spin: -6, ease: "power3.inOut" });
      }, "<.1")
      .add(moveTo(cut, "Cut it", .75), "<")
      .fromTo(cut, { opacity: 0, scaleX: .3, transformOrigin: "left center" }, { opacity: 1, scaleX: 1, duration: .45, ease: "back.out(2.2)" }, ">-.05")
      .call(() => { const c = center(cut); sparks(c.x, c.y); q("score").textContent = ((m.score ?? 0.9) * 10).toFixed(1); });
    // …its frame jumps up into the monitor
    tl.add(push(r.querySelector(".ts-mon"), 1.04, .6))
      .add(() => {
        const card = document.createElement("div");
        Object.assign(card.style, { backgroundImage: m.thumb ? `url(${m.thumb})` : (q("img").style.backgroundImage || "none"), backgroundColor: "#1a1a20", backgroundSize: "cover", backgroundPosition: "center", borderRadius: "8px", border: "2px solid #ff2e88", boxShadow: "0 18px 40px rgba(0,0,0,.6)" });
        fly(card, cut, q("screen"), { dur: .75, lift: -150, spin: 4 });
      }, "<")
      .add(moveTo(q("screen"), "Load", .75, .5, .45), "<")
      .to(q("flash"), { opacity: .85, duration: .08 }).to(q("flash"), { opacity: 0, duration: .35 });
    // reframe
    tl.fromTo(q("face"), { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .35, ease: "back.out(2)" })
      .fromTo(q("crop"), { opacity: 0, scaleY: .2 }, { opacity: 1, scaleY: 1, duration: .4, ease: "expo.out" }, "<.1")
      .add(moveTo(q("crop"), "Reframe 9:16", .5, .5, .2), "<")
      .to(state, { crop: CROPS[i % 4], duration: .9, ease: "power3.inOut", onUpdate: applyCrop })
      .call(() => { const b = rect(q("crop")); gsap.to(cur, { x: b.left + b.width / 2, y: b.top + 20, duration: .9, ease: "power3.inOut" }); }, undefined, "<");
    // crop morphs into the phone
    tl.add(push(null, 1, .7))
      .add(() => {
        const ghost = document.createElement("div");
        Object.assign(ghost.style, { border: "2px solid #38e1ff", borderRadius: "8px", boxShadow: "0 0 30px rgba(56,225,255,.6)", background: "rgba(56,225,255,.08)" });
        fly(ghost, q("crop"), q("phone"), { dur: .85, lift: -80, ease: "expo.inOut" });
      }, "<")
      .add(moveTo(q("phone"), "Export", .85), "<")
      .to(q("veil"), { opacity: 0, duration: .35 }, ">-.1")
      .fromTo(q("phone"), { scale: .94, rotateZ: -2 }, { scale: 1, rotateZ: 0, duration: .6, ease: "elastic.out(1,.5)" }, "<")
      .to([q("crop"), q("face")], { opacity: 0, duration: .3 }, "<");
    // hook + captions + sticker
    tl.call(() => { (q("hook").firstChild as HTMLElement).textContent = (m.hook || m.title).toUpperCase().slice(0, 40); })
      .fromTo(q("hook"), { opacity: 0, scale: 2.2, rotate: -6 }, { opacity: 1, scale: 1, rotate: 0, duration: .45, ease: "back.out(2.6)" })
      .fromTo(q("phone"), { x: -5 }, { x: 0, duration: .35, ease: "elastic.out(1.2,.3)" }, "<.2");
    words.forEach((w, k) => {
      tl.call(() => {
        const src = document.createElement("span"); src.className = "ts-cw"; src.textContent = w; q("capbar").appendChild(src);
        gsap.fromTo(src, { y: 18, opacity: 0, scale: .6 }, { y: 0, opacity: 1, scale: 1, duration: .25, ease: "back.out(3)" });
        const dst = document.createElement("span"); dst.className = "ts-cw"; dst.textContent = w; dst.style.opacity = "0";
        if (k === words.length - 1) dst.style.color = "#ff2e88";
        q("pcap").appendChild(dst);
        gsap.delayedCall(.26, () => {
          const f = src.cloneNode(true) as HTMLElement; f.style.color = k === words.length - 1 ? "#ff2e88" : "#fff";
          fly(f, src, dst, { dur: .5, lift: -60, spin: 8 });
          gsap.delayedCall(.5, () => { gsap.fromTo(dst, { opacity: 1, scale: 1.5 }, { scale: 1, duration: .3, ease: "back.out(3)" }); });
        });
      }).add(moveTo(q("capbar"), "Captions", .3, .4 + k * .12), "<").to({}, { duration: .4 });
    });
    tl.to({}, { duration: .3 })
      .add(() => {
        const s = document.createElement("div"); s.textContent = sticker.textContent; Object.assign(s.style, { fontSize: "40px", display: "grid", placeItems: "center" });
        fly(s, sticker, q("stk"), { dur: .7, lift: -130, spin: 340, ease: "power2.out" });
      })
      .add(moveTo(sticker, "Sticker", .3), "<")
      .call(() => { q("stk").textContent = sticker.textContent; }, undefined, "+=.65")
      .fromTo(q("stk"), { opacity: 0, scale: .3 }, { opacity: 1, scale: 1, duration: .45, ease: "elastic.out(1,.45)" })
      .call(() => { const c = center(q("stk")); sparks(c.x, c.y, "#b6ff3b", 10); })
      .to({}, { duration: .5 });
    // finished short flies into My clips
    tl.add(() => {
        const snap = document.createElement("div");
        Object.assign(snap.style, { backgroundImage: m.thumb ? `url(${m.thumb})` : (q("img").style.backgroundImage || "none"), backgroundColor: "#1a1a20", backgroundSize: "cover", backgroundPosition: "center", borderRadius: "16px", border: "2px solid #fff" });
        fly(snap, q("phone"), q("stack"), { dur: .75, lift: -50, spin: -10, ease: "power3.in" });
        gsap.delayedCall(.72, () => {
          const c = document.createElement("div"); c.className = "card";
          c.style.backgroundImage = snap.style.backgroundImage;
          q("stack").appendChild(c);
          gsap.fromTo(c, { scale: 1.4, rotate: -14, opacity: 0 }, { scale: 1, rotate: (i - 1) * 7, x: i * 4, opacity: 1, duration: .45, ease: "back.out(2)" });
          if (p.demo || !p.moments.length) q("count").textContent = String(i + 1);
          gsap.fromTo(q("count"), { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: "back.out(3)" });
          const cc = center(q("stack")); sparks(cc.x, cc.y, "#38e1ff", 10);
        });
      })
      .add(moveTo(q("stack"), "Saved", .75), "<")
      .to([q("hook"), q("stk")], { opacity: 0, duration: .3 }, "+=.5")
      .to(r.querySelectorAll(".ts-cw"), { opacity: 0, y: -10, duration: .25, stagger: .03 }, "<")
      .call(() => { q("pcap").innerHTML = ""; q("capbar").innerHTML = ""; line.classList.remove("hot"); })
      .to(q("veil"), { opacity: .85, duration: .3 }, "<");
    return tl;
  };

  let master: gsap.core.Timeline | null = null;
  const run = () => {
    q("stack").innerHTML = "";
    r.querySelectorAll(".ts-cut").forEach((c) => c.remove());
    gsap.set([q("hook"), q("stk"), q("crop"), q("face")], { opacity: 0 }); gsap.set(q("veil"), { opacity: 1 });
    state.crop = 34; applyCrop();
    master = gsap.timeline({ onComplete: run });
    master.fromTo(cam, { rotateX: 12, rotateY: -8, scale: .92, opacity: 0, filter: "blur(8px)" }, { rotateX: 0, rotateY: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 1, ease: "expo.out" })
      .from(r.querySelectorAll(".ts-panel"), { y: 30, opacity: 0, rotateX: -10, duration: .6, stagger: .07, ease: "back.out(1.6)" }, "<.1");
    moments.forEach((m, i) => master!.add(moment(m, i), "+=.15"));
    master.to(cur, { opacity: 0, duration: .3 }).to(cam, { opacity: 0, scale: .96, filter: "blur(6px)", duration: .6, ease: "power2.in" }, "+=.6");
  };

  // only animate while visible
  let started = false;
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!started) { started = true; run(); } else master?.resume(); gsap.to(cur, { opacity: 1, duration: .2 }); }
    else { master?.pause(); gsap.set(cur, { opacity: 0 }); }
  }, { threshold: .25 });
  io.observe(r);
  const onResize = () => applyCrop();
  addEventListener("resize", onResize);

  return () => {
    io.disconnect(); removeEventListener("resize", onResize);
    master?.kill(); ph.kill(); pan.kill(); gsap.killTweensOf(cur);
    layer.remove();
  };
}

const CSS = `
.ts-wrap{position:relative;width:100%;overflow:hidden;border-radius:16px}
.ts{transform-origin:0 0;position:absolute;left:0;top:0;perspective:1600px;color:#fafafa;font:13px/1.35 -apple-system,BlinkMacSystemFont,Inter,sans-serif;
  background:radial-gradient(40% 40% at 15% 10%,rgba(255,46,136,.16),transparent 70%),radial-gradient(35% 35% at 90% 90%,rgba(56,225,255,.10),transparent 70%),#07070a;border-radius:16px;padding:18px}
.ts-cam{width:100%;height:100%;transform-style:preserve-3d;will-change:transform}
.ts-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.ts-brand{font:900 30px/1 var(--font-poster),Impact,sans-serif;text-transform:uppercase}.ts-brand em{color:#ff2e88;font-style:normal}
.ts-pill{display:inline-flex;align-items:center;gap:7px;padding:4px 9px;background:#ff2e88;color:#000;font:800 10.5px ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.1em;max-width:300px;white-space:nowrap;overflow:hidden}
.ts-pill i{width:6px;height:6px;border-radius:50%;background:#000;animation:tsblink 1s infinite}@keyframes tsblink{50%{opacity:.2}}
.ts-meta{margin-left:auto;font:11px ui-monospace,Menlo,monospace;color:#a1a1aa;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px}
.ts-grid{display:grid;gap:12px;grid-template-columns:230px minmax(0,1fr) 200px;grid-template-rows:auto auto;height:calc(100% - 46px)}
.ts-panel{position:relative;background:linear-gradient(180deg,#15151b,#0f0f13);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;overflow:hidden}
.ts-label{font:700 10px ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.14em;color:#6b6b76;display:flex;justify-content:space-between;gap:8px;white-space:nowrap}
.ts-label b{color:#ff2e88;font-weight:700;overflow:hidden;text-overflow:ellipsis}
.ts-tx{grid-row:1/3}.ts-mon{grid-column:2}.ts-out{grid-column:3;grid-row:1/3;display:flex;flex-direction:column;gap:10px}.ts-tl{grid-column:2}
.ts-lines{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.ts-ln{display:flex;gap:8px;font-size:12px;color:#d4d4d8;padding:6px 7px;border-radius:7px;border:1px solid transparent;transform-origin:left center}
.ts-ln .t{font:10.5px ui-monospace,Menlo,monospace;color:#ff2e88;flex:none;padding-top:1px}
.ts-ln.hot{color:#fff;background:rgba(255,46,136,.12);border-color:rgba(255,46,136,.6)}
.ts-ln.ghost{padding:9px 7px}.ts-ln .bar{display:block;height:7px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,.03));animation:tspulse 1.6s ease-in-out infinite}
@keyframes tspulse{50%{opacity:.4}}
.ts-beam{position:absolute;left:0;right:0;height:40px;top:40px;background:linear-gradient(180deg,transparent,rgba(56,225,255,.18),transparent);border-top:1px solid rgba(56,225,255,.5);pointer-events:none;opacity:0}
.ts-screen{position:relative;margin-top:10px;aspect-ratio:16/9;max-height:300px;border-radius:10px;overflow:hidden;background:#111 radial-gradient(circle at 30% 30%,rgba(255,46,136,.25),transparent 60%)}
.ts-img{position:absolute;inset:0;background-size:cover;background-position:center}
.ts-flash{position:absolute;inset:0;background:#fff;opacity:0;mix-blend-mode:overlay}
.ts-crop{position:absolute;top:0;height:100%;width:31.64%;left:34%;border:2px solid #38e1ff;border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,.5),0 0 24px rgba(56,225,255,.45);opacity:0}
.ts-crop span{position:absolute;top:6px;left:6px;background:#38e1ff;color:#000;font:800 9.5px ui-monospace,Menlo,monospace;padding:1px 5px;border-radius:3px}
.ts-face{position:absolute;left:76%;top:55%;width:18%;aspect-ratio:1;border:1.5px solid #b6ff3b;border-radius:8px;opacity:0}
.ts-face:before{content:"STREAMER";position:absolute;top:-15px;left:0;font:800 9px ui-monospace,Menlo,monospace;color:#b6ff3b}
.ts-capbar{margin-top:10px;height:44px;display:flex;align-items:center;justify-content:center;gap:10px;border:1px dashed rgba(255,46,136,.45);border-radius:10px}
.ts-cw{font:900 26px/1 var(--font-poster),Impact,sans-serif;text-transform:uppercase;display:inline-block;color:#fff}
.ts-row{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font:11px ui-monospace,Menlo,monospace;color:#a1a1aa}
.ts-row b{color:#ff2e88}.ts-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ts-phone{position:relative;aspect-ratio:9/16;border-radius:18px;overflow:hidden;background:#000;border:2px solid rgba(255,255,255,.9);box-shadow:0 20px 50px rgba(0,0,0,.6)}
.ts-pimg{position:absolute;top:0;left:0;height:100%;background-size:cover;background-position:center}
.ts-veil{position:absolute;inset:0;background:#000}
.ts-hook{position:absolute;left:8%;right:8%;top:9%;text-align:center;font:900 17px/1.05 var(--font-poster),Impact,sans-serif;text-transform:uppercase;opacity:0}
.ts-hook span{background:#ff2e88;padding:1px 6px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.ts-pcap{position:absolute;left:4%;right:4%;top:57%;display:flex;justify-content:center;gap:5px;flex-wrap:wrap}
.ts-pcap .ts-cw{font-size:19px;-webkit-text-stroke:1px #000;paint-order:stroke fill}
.ts-stk{position:absolute;right:8%;top:34%;font-size:40px;opacity:0}
.ts-tray{display:flex;gap:6px;justify-content:center}
.ts-tray span{width:32px;height:32px;display:grid;place-items:center;font-size:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:9px}
.ts-stackwrap{position:relative;flex:1;min-height:60px;border:1px dashed rgba(255,255,255,.1);border-radius:12px;display:flex;align-items:center;padding:0 10px;gap:12px}
.ts-stack{position:relative;width:36px;height:56px}
.ts-stack .card{position:absolute;inset:0;border-radius:6px;border:1.5px solid rgba(255,255,255,.85);background:#1a1a20 center/cover}
.ts-stackwrap .k{display:block;font:700 10px ui-monospace,Menlo,monospace;color:#6b6b76;text-transform:uppercase;letter-spacing:.12em}
.ts-count{font:900 28px/1 var(--font-poster),Impact,sans-serif}
.ts-tracks{position:relative;margin-top:10px;display:grid;grid-template-columns:54px 1fr;row-gap:6px}
.ts-tracks .k{font:700 9.5px ui-monospace,Menlo,monospace;color:#6b6b76;text-transform:uppercase;align-self:center}
.ts-lane{position:relative;height:36px;border-radius:7px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);overflow:hidden}.ts-lane.s{height:18px}
.ts-film{display:flex;height:100%}.ts-film i{flex:1;background:#1a1a20 center/cover;opacity:.55;border-right:1px solid rgba(0,0,0,.4)}
.ts-cut{position:absolute;top:0;bottom:0;border:2px solid #ff2e88;border-radius:6px;background:rgba(255,46,136,.22);box-shadow:0 0 18px rgba(255,46,136,.55);opacity:0}
.ts-cut b{position:absolute;left:3px;top:2px;font:800 9px ui-monospace,Menlo,monospace;background:#ff2e88;color:#000;padding:0 4px;border-radius:3px}
.ts-wave{display:flex;align-items:center;gap:1px;height:100%;padding:0 3px}.ts-wave i{flex:1;background:#b6ff3b;opacity:.65;border-radius:1px}
.ts-ph{position:absolute;top:-5px;bottom:-5px;width:2px;background:#fff;left:54px;box-shadow:0 0 10px #fff}
.ts-layer{position:fixed;inset:0;pointer-events:none;z-index:60}
.ts-fly{position:fixed;left:0;top:0;transform-origin:0 0;will-change:transform}
.ts-cur{position:fixed;left:0;top:0}.ts-cur svg{width:22px;height:22px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}
.ts-cur b{position:absolute;left:20px;top:18px;white-space:nowrap;font:800 10.5px ui-monospace,Menlo,monospace;color:#000;background:#ff2e88;padding:3px 7px;border-radius:5px}
.ts-spark{position:fixed;left:0;top:0;width:6px;height:6px;border-radius:50%}
`;
