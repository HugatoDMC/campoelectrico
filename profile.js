/* profile.js · perfil compartido de Campo Eléctrico
   Uso: openProfile({ id, name, avatar, decoration }, { pos, noRoles })  */
(() => {
const ICONS = "assets/icons/";                       // recluta.png, helper.png, mod.png, admin.png, coowner.png
const STAFF = [["recluta","Recluta"],["helper","Helper"],["mod","Mod"],["admin","Admin"],["coowner","CoOwner"]]
  .map(([id, name]) => ({ id, name, src: `${ICONS}${id}.png`, color: "#ffc800" }));
const TIER_ORDER = ["A","E","P","EX","M"];
const TIER_COLORS = { A:"#8f9dbd", E:"#3ddc84", P:"#4f9dff", EX:"#c58bff", M:"#ffc800" };
const DEF = "https://cdn.discordapp.com/embed/avatars/0.png";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const color = (c, f) => /^#[0-9a-f]{6}$/i.test(c || "") ? c : f;
const norm = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
const same = (a, b) => a.id != null && b.id != null ? String(a.id) === String(b.id) : (a.name || "").toLowerCase() === (b.name || "").toLowerCase();

const css = `
.pf{position:fixed;inset:0;background:rgba(2,5,12,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:100}
.pf[hidden]{display:none}
.pf-box{position:relative;width:100%;max-width:400px;max-height:90vh;overflow:auto;background:linear-gradient(#142042,#0a1020);border:1px solid #7fe0ff;border-radius:22px;padding:30px 24px;text-align:center;color:#e8eefb;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 0 40px rgba(127,224,255,.25)}
.pf-x{position:absolute;top:10px;right:12px;background:none;border:0;color:#8f9dbd;font-size:28px;cursor:pointer}.pf-x:hover{color:#ffc800}
.pf-av{position:relative;width:120px;height:120px;margin:8px auto 0}
.pf-av .p{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#1b2a4a;display:block}
.pf-av .d{position:absolute;left:50%;top:50%;width:140%;height:140%;transform:translate(-50%,-50%);pointer-events:none}
.pf-nm{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;font-size:20px;font-weight:700}
.pf-nm span{overflow-wrap:anywhere}
.pf-sub{font-size:14px;color:#8f9dbd;margin-top:4px}
.pf h2{margin:20px 0 0;font-size:15px;font-weight:600;color:#7fe0ff}
.pf-bs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}
.pf-b{--tc:#7fe0ff;position:relative;width:44px;height:44px;padding:0;border-radius:12px;background:#0a1020;border:1px solid var(--tc);box-shadow:0 0 10px color-mix(in srgb,var(--tc) 45%,transparent);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--tc);font-weight:700}
.pf-b img{width:80%;height:80%;object-fit:contain}
.pf-b.sm{width:28px;height:28px;border-radius:8px}
.pf-b .pill{position:absolute;right:-5px;bottom:-5px;min-width:20px;padding:1px 4px;border-radius:999px;background:var(--tc);color:#060a14;font-size:10px;line-height:16px}
.pf-roles{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}
.pf-chip{padding:6px 12px;border-radius:999px;font-size:13px;border:1px solid #5b6478;background:rgba(255,255,255,.04)}
.pf-tip{position:absolute;transform:translateX(-50%);padding:5px 10px;border-radius:8px;background:#ffc800;color:#1a1300;font-size:12px;font-weight:700;white-space:nowrap;pointer-events:none;z-index:2}
`;
let box, modal, cache = null, at = 0;

async function getJSON(f) {
  try { const r = await fetch(`${f}?t=${Date.now()}`, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function data() {
  if (cache && Date.now() - at < 60000) return cache;
  const [top, tiers] = await Promise.all([getJSON("top.json"), getJSON("tiers.json")]);
  at = Date.now(); return (cache = { top: top?.users || [], T: tiers });
}
function staffOf(p) {
  const f = new Set([norm(p.staff), ...(p.roles || []).map(r => norm(r.name))]);
  let best = null; STAFF.forEach(s => { if (f.has(s.id)) best = s; }); return best;
}
function tierBadges(p, T) {
  if (!T?.categories) return [];
  const tn = Object.fromEntries((T.tiers || []).map(t => [t.id, t.name]));
  return T.categories.filter(c => p.tiers?.[c.id]).map(c => {
    const t = p.tiers[c.id];
    return { name: `${c.name} · ${tn[t] || t}`, src: T.badge_pattern.replace("{tier}", t).replace("{code}", c.code), fb: c.icon, pill: t, color: TIER_COLORS[t] || "#7fe0ff", r: TIER_ORDER.indexOf(t) };
  });
}
const badge = (b, sm) => `<button class="pf-b${sm ? " sm" : ""}" type="button" data-n="${esc(b.name)}" title="${esc(b.name)}" style="--tc:${b.color}"><img src="${esc(b.src)}" alt="" data-fb="${esc(b.fb || "")}" data-pill="${esc(b.pill || "")}" data-l="${esc(b.name[0])}"></button>`;

function ensure() {
  if (modal) return;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  modal = document.createElement("div"); modal.className = "pf"; modal.hidden = true;
  modal.innerHTML = `<div class="pf-box"><button class="pf-x" aria-label="Cerrar">×</button><div class="pf-body"></div></div>`;
  document.body.appendChild(modal); box = modal.firstChild;
  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.classList.contains("pf-x")) modal.hidden = true;
    const b = e.target.closest(".pf-b");
    box.querySelectorAll(".pf-tip").forEach(t => t.remove());
    if (!b) return;
    const tip = document.createElement("div"); tip.className = "pf-tip"; tip.textContent = b.dataset.n; box.appendChild(tip);
    const r = b.getBoundingClientRect(), br = box.getBoundingClientRect();
    tip.style.left = `${r.left - br.left + box.scrollLeft + r.width / 2}px`;
    tip.style.top = `${r.top - br.top + box.scrollTop - 34}px`;
    setTimeout(() => tip.remove(), 2500);
  });
  modal.addEventListener("error", e => {            // insignia sin imagen: icono de categoría + letra, o inicial
    const i = e.target; if (i.tagName !== "IMG" || !i.closest(".pf-b")) return;
    if (i.dataset.fb && !i.dataset.done) {
      i.dataset.done = 1; i.src = i.dataset.fb;
      if (i.dataset.pill) { const s = document.createElement("span"); s.className = "pill"; s.textContent = i.dataset.pill; i.parentNode.appendChild(s); }
    } else i.replaceWith(Object.assign(document.createElement("span"), { textContent: i.dataset.l || "?" }));
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") modal.hidden = true; });
}

async function openProfile(user, o = {}) {
  ensure();
  const { top, T } = await data();
  const tp = top.find(x => same(x, user)) || {};
  const tu = (T?.users || []).find(x => same(x, user)) || {};
  const p = { ...tp, ...tu, ...user };
  p.decoration = p.decoration || p.frame || tp.decoration;
  p.avatar = user.avatar || tp.avatar || tu.avatar || DEF;

  const tb = tierBadges(p, T), st = staffOf(p);
  const rare = tb.reduce((m, b) => !m || b.r > m.r ? b : m, null);
  const main = st ? { name: st.name, src: st.src, color: st.color } : rare;
  const all = [...(st ? [{ name: st.name, src: st.src, color: st.color }] : []), ...tb];

  const j = p.joined && (/^\d{4}-\d{2}-\d{2}$/.test(p.joined) ? new Date(...p.joined.split("-").map((n, i) => i === 1 ? n - 1 : +n)) : new Date(p.joined));
  const joined = j && !isNaN(j) ? `Se unió el ${j.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}` : "";
  const sub = [o.pos && `#${o.pos}`, p.level != null && `Nivel ${p.level}`, p.xp != null && `${Number(p.xp).toLocaleString("es-AR")} XP`].filter(Boolean).join(" · ");
  const roles = o.noRoles ? "" : `<h2>Roles en el server</h2><div class="pf-roles">${(p.roles || []).length
    ? p.roles.map(r => { const c = color(r.color, "#9aa6c2"); return `<span class="pf-chip" style="border-color:${c};color:${c}">${esc(r.name)}</span>`; }).join("")
    : `<div class="pf-sub">Sin roles</div>`}</div>`;

  box.querySelector(".pf-body").innerHTML = `
    <div class="pf-av"><img class="p" src="${esc(p.avatar)}" alt="">${p.decoration ? `<img class="d" src="${esc(p.decoration)}" alt="">` : ""}</div>
    <div class="pf-nm"><span>${esc(p.name)}</span>${main ? badge(main, true) : ""}</div>
    ${sub ? `<div class="pf-sub">${esc(sub)}</div>` : ""}
    ${joined ? `<div class="pf-sub">${esc(joined)}</div>` : ""}
    ${all.length ? `<h2>Insignias</h2><div class="pf-bs">${all.map(b => badge(b)).join("")}</div>` : ""}
    ${roles}`;
  modal.hidden = false;
}
window.openProfile = openProfile;
})();