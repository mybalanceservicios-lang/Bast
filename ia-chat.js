/* Chat de la IA de BAST para el sitio público.
   Se incluye con <script src="ia-chat.js" defer></script> y habla con /api/ia (modo "web"). */
(function () {
  const ENDPOINT = "/api/ia";
  const WHATSAPP = "https://wa.me/5491122505318";
  const CLAVE_HIST = "bast_chat_web";

  const css = `
  .ia-btn{position:fixed;left:18px;bottom:86px;z-index:199;width:56px;height:56px;border-radius:50%;border:1.5px solid var(--mint-deep,#1E9E7C);background:var(--mint-soft,#0E241C);color:var(--mint,#7DE9C2);display:grid;place-items:center;cursor:pointer;box-shadow:0 10px 24px -8px rgba(0,0,0,.5);transition:.15s;font:800 13px/1 var(--body,sans-serif);letter-spacing:.04em}
  .ia-btn:hover{transform:translateY(-3px) scale(1.05);background:var(--mint,#7DE9C2);color:#04140F}
  .ia-btn svg{width:26px;height:26px}
  .ia-panel{position:fixed;left:18px;bottom:154px;z-index:201;width:min(380px,calc(100vw - 32px));height:min(540px,calc(100vh - 190px));display:none;flex-direction:column;background:#0C100E;border:1px solid var(--line,#1D2521);border-radius:18px;box-shadow:0 24px 60px -20px rgba(0,0,0,.7);overflow:hidden;font-family:var(--body,sans-serif);color:var(--ink,#EAF3EE)}
  .ia-panel.open{display:flex}
  .ia-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line,#1D2521)}
  .ia-head b{font-family:var(--disp,Impact,sans-serif);font-weight:900;text-transform:uppercase;letter-spacing:.06em;font-size:18px}
  .ia-head small{display:block;color:var(--ink-3,#63736C);font-size:11.5px}
  .ia-dot{width:9px;height:9px;border-radius:50%;background:var(--mint,#7DE9C2);box-shadow:0 0 0 4px rgba(125,233,194,.15)}
  .ia-close{margin-left:auto;width:32px;height:32px;border:1px solid var(--line,#1D2521);border-radius:9px;background:none;color:var(--ink-2,#9DB2A8);cursor:pointer;font-size:14px}
  .ia-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
  .ia-m{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
  .ia-m.bot{background:var(--surface-2,#161C19);border:1px solid var(--line,#1D2521);border-bottom-left-radius:4px;align-self:flex-start}
  .ia-m.yo{background:var(--mint,#7DE9C2);color:#04140F;font-weight:600;border-bottom-right-radius:4px;align-self:flex-end}
  .ia-m.err{background:#2a1212;border:1px solid #5a2323;color:#f3c2c2;align-self:flex-start}
  .ia-m a{color:var(--mint,#7DE9C2);text-decoration:underline}
  .ia-typing{display:inline-flex;gap:4px}.ia-typing i{width:6px;height:6px;border-radius:50%;background:var(--ink-3,#63736C);animation:iab 1s infinite}.ia-typing i:nth-child(2){animation-delay:.15s}.ia-typing i:nth-child(3){animation-delay:.3s}
  @keyframes iab{0%,80%,100%{opacity:.3}40%{opacity:1}}
  .ia-sug{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}
  .ia-sug button{border:1px solid var(--line,#1D2521);background:none;color:var(--ink-2,#9DB2A8);font:600 12px var(--body,sans-serif);padding:6px 10px;border-radius:20px;cursor:pointer}
  .ia-sug button:hover{border-color:var(--mint,#7DE9C2);color:var(--mint,#7DE9C2)}
  .ia-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line,#1D2521)}
  .ia-form input{flex:1;min-width:0;background:var(--surface,#111614);border:1px solid var(--line,#1D2521);border-radius:11px;color:var(--ink,#EAF3EE);font:500 14px var(--body,sans-serif);padding:11px 12px;outline:none}
  .ia-form input:focus{border-color:var(--mint-deep,#1E9E7C)}
  .ia-form button{border:0;border-radius:11px;background:var(--mint,#7DE9C2);color:#04140F;font:800 14px var(--body,sans-serif);padding:0 15px;cursor:pointer}
  .ia-form button:disabled{opacity:.5;cursor:default}
  @media(max-width:600px){.ia-btn{left:14px;bottom:76px;width:50px;height:50px}.ia-panel{left:16px;bottom:136px;height:calc(100vh - 170px)}}
  `;

  const estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  const btn = document.createElement("button");
  btn.className = "ia-btn";
  btn.setAttribute("aria-label", "Abrir el asistente de BAST");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';

  const panel = document.createElement("div");
  panel.setAttribute("role", "dialog");
  panel.className = "ia-panel";
  panel.setAttribute("aria-label", "Asistente de BAST");
  panel.innerHTML = `
    <div class="ia-head"><span class="ia-dot"></span><div><b>Asistente BAST</b><small>IA · respuestas al instante</small></div>
      <button class="ia-close" aria-label="Cerrar">✕</button></div>
    <div class="ia-msgs" aria-live="polite"></div>
    <div class="ia-sug">
      <button>¿Qué planes tienen?</button><button>Horarios de boxeo</button><button>Tengo una lesión</button><button>Quiero una clase de prueba</button>
    </div>
    <form class="ia-form"><input placeholder="Escribí tu consulta…" maxlength="1500" aria-label="Tu consulta"><button type="submit">Enviar</button></form>`;

  document.body.append(btn, panel);

  const msgs = panel.querySelector(".ia-msgs");
  const form = panel.querySelector(".ia-form");
  const input = form.querySelector("input");
  const enviarBtn = form.querySelector("button");
  const sug = panel.querySelector(".ia-sug");

  let historial = [];
  try { historial = JSON.parse(sessionStorage.getItem(CLAVE_HIST)) || []; } catch (e) {}
  const guardar = () => { try { sessionStorage.setItem(CLAVE_HIST, JSON.stringify(historial.slice(-20))); } catch (e) {} };

  function esc(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function formatear(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
  function burbuja(tipo, html) {
    const d = document.createElement("div");
    d.className = "ia-m " + tipo;
    d.innerHTML = html;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function pintar() {
    msgs.innerHTML = "";
    burbuja("bot", "¡Hola! Soy el asistente de BAST. Preguntame por actividades, horarios, planes o el área médica.");
    historial.forEach((m) => burbuja(m.role === "user" ? "yo" : "bot", formatear(m.content)));
    sug.style.display = historial.length ? "none" : "flex";
  }

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto || enviarBtn.disabled) return;
    historial.push({ role: "user", content: texto });
    burbuja("yo", formatear(texto));
    sug.style.display = "none";
    input.value = "";
    enviarBtn.disabled = true;
    const espera = burbuja("bot", '<span class="ia-typing"><i></i><i></i><i></i></span>');
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "web", mensajes: historial }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.respuesta) throw new Error(data.error || "Sin respuesta");
      historial.push({ role: "assistant", content: data.respuesta });
      espera.innerHTML = formatear(data.respuesta);
      guardar();
    } catch (e) {
      historial.pop();
      espera.className = "ia-m err";
      espera.innerHTML = `No pude responder ahora (${esc(e.message)}). Escribinos por <a href="${WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a>.`;
    } finally {
      enviarBtn.disabled = false;
      input.focus();
    }
  }

  btn.addEventListener("click", () => {
    const abierto = panel.classList.toggle("open");
    if (abierto) { pintar(); input.focus(); }
  });
  panel.querySelector(".ia-close").addEventListener("click", () => panel.classList.remove("open"));
  form.addEventListener("submit", (e) => { e.preventDefault(); enviar(input.value); });
  sug.addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") enviar(e.target.textContent); });
})();
