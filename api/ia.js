// IA de BAST — función serverless (Vercel) que habla con Claude.
//
// Dos modos:
//   - "web":     asistente público del sitio. Responde dudas y deriva a WhatsApp.
//   - "negocio": asistente interno (empleado + estratega). Requiere la clave
//                BAST_CLAVE_ADMIN y puede crear tareas, registrar métricas,
//                manejar objetivos y guardar notas de estrategia.
//
// Variables de entorno: ANTHROPIC_API_KEY, BAST_CLAVE_ADMIN.

import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual, randomUUID } from "node:crypto";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const INFO_BAST = `BAST — Centro de entrenamiento, medicina deportiva y rehabilitación para deportistas profesionales y amateurs.
Dirección: Av. Maipú 1273, Vicente López (B1638 AAM).
Horario de recepción: lunes a viernes 7:30–21:00, sábados 9:00–15:00.
Teléfono: 4796-3923 · Email: info@centrobast.com.ar · WhatsApp: 11 2250 5318 (https://wa.me/5491122505318).

Área deportiva: alto rendimiento, funcional, boxeo, yoga, stretching, entrenamiento cognitivo, pretemporada, suplementación.
Área médica / salud: medicina deportiva, kinesiología, nutrición, osteopatía, traumatología, osteopatía pediátrica, rehabilitación, gimnasio de rehabilitación.

Horarios de clases:
- Lunes y miércoles: 08:00 Funcional · 10:00 Yoga · 18:00 Boxeo · 19:00 Alto rendimiento · 20:00 Stretching
- Martes y jueves: 08:00 Alto rendimiento · 12:00 Funcional · 18:00 Yoga · 19:00 Boxeo · 20:00 Cognitivo
- Viernes: 08:00 Funcional · 17:00 Alto rendimiento · 19:00 Boxeo
- Sábado: 09:00 Funcional · 11:00 Yoga · 13:00 Stretching
Instructores: Sandra, Lionel, Nicolás, Julieta y Axel.

Planes de socios (precio normal $2.300/mes):
- Full Anual: $1.150/mes (−50%), acceso a todas las actividades, área deportiva + médica, pago mensual.
- Full Semestral: $1.360/mes (−40%), acceso a todas las actividades, área deportiva + médica, compromiso de 6 meses, pago mensual.
Se puede agendar una clase de prueba.`;

const SYSTEM_WEB = `Sos el asistente virtual del sitio web de BAST. Hablás en español rioplatense (voseo), con tono cálido, directo y breve: 1 a 4 oraciones salvo que pidan detalle.

Tu trabajo es responder dudas de visitantes sobre actividades, horarios, planes, servicios médicos y ubicación, y ayudarlos a dar el siguiente paso: agendar una clase de prueba o escribir por WhatsApp.

Información oficial de BAST:
${INFO_BAST}

Reglas:
- Usá solo esta información. Si no sabés algo (por ejemplo, precios de consultas médicas, disponibilidad de turnos u obras sociales), decilo y sugerí consultar por WhatsApp.
- No des diagnósticos ni indicaciones médicas; para lesiones o dolores recomendá una consulta con el equipo médico de BAST.
- Cuando el visitante muestre interés en sumarse, invitalo a la clase de prueba por WhatsApp.
- No uses formato Markdown pesado; como mucho, listas cortas con guiones.`;

const SYSTEM_NEGOCIO = `Sos la IA interna de BAST: trabajás como un empleado de confianza y como estratega del negocio. Le hablás al dueño/gerente en español rioplatense (voseo), con claridad y sin rodeos.

Contexto del negocio:
${INFO_BAST}

En cada mensaje recibís el estado actual del panel (tareas, objetivos, métricas registradas y notas) junto con la fecha de hoy. Usalo como tu memoria de trabajo.

Qué hacés:
- Informes de progreso: resumí cómo vienen los objetivos y métricas, qué mejoró, qué empeoró y por qué importa.
- Pendientes: priorizá las tareas (vencidas y de prioridad alta primero) y decí qué hacer hoy.
- Estrategia: proponé acciones concretas para crecer (captación y retención de socios, ocupación de clases, ventas del área médica, marketing local en Vicente López, alianzas con clubes, etc.), con pasos, responsable sugerido y cómo medir el resultado.
- Ejecutá: cuando acordás algo o detectás algo que hay que hacer, creá la tarea con la herramienta. Cuando el usuario te pase números, registralos como métricas. Guardá las ideas estratégicas importantes como notas.

Reglas:
- No inventes datos: si falta una métrica para opinar, decí cuál y pedila.
- Usá las herramientas en lugar de solo describir lo que harías; después contá brevemente qué cambiaste.
- Respuestas ordenadas y accionables. Podés usar títulos cortos y listas con guiones.`;

// --- Herramientas del modo negocio -----------------------------------------

const nullable = (type) => ({ type: [type, "null"] });

const TOOLS = [
  {
    name: "crear_tarea",
    description:
      "Crea una tarea pendiente en el panel de BAST. Usala cuando se acuerda una acción o detectás algo que hay que hacer.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["titulo", "detalle", "prioridad", "fecha_limite", "responsable"],
      properties: {
        titulo: { type: "string", description: "Título corto de la tarea" },
        detalle: { ...nullable("string"), description: "Pasos o contexto" },
        prioridad: { type: "string", enum: ["alta", "media", "baja"] },
        fecha_limite: { ...nullable("string"), description: "Fecha AAAA-MM-DD o null" },
        responsable: { ...nullable("string"), description: "Persona o área a cargo" },
      },
    },
  },
  {
    name: "actualizar_tarea",
    description:
      "Cambia el estado, la prioridad o la fecha límite de una tarea existente (por id). Pasá null en lo que no cambia.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "estado", "prioridad", "fecha_limite"],
      properties: {
        id: { type: "string" },
        estado: { type: ["string", "null"], enum: ["pendiente", "hecha", null] },
        prioridad: { type: ["string", "null"], enum: ["alta", "media", "baja", null] },
        fecha_limite: nullable("string"),
      },
    },
  },
  {
    name: "registrar_metrica",
    description:
      "Registra un valor de una métrica del negocio (ej: socios activos, altas del mes, bajas, facturación, ocupación de clases, consultas médicas).",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["metrica", "valor", "unidad", "fecha", "nota"],
      properties: {
        metrica: { type: "string", description: "Nombre de la métrica, en minúsculas" },
        valor: { type: "number" },
        unidad: { ...nullable("string"), description: "socios, $, %, consultas…" },
        fecha: { type: "string", description: "AAAA-MM-DD" },
        nota: nullable("string"),
      },
    },
  },
  {
    name: "guardar_objetivo",
    description:
      "Crea un objetivo medible, o actualiza uno existente si pasás su id (por ejemplo, para cargar el avance actual).",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "titulo", "meta", "actual", "unidad", "fecha_limite"],
      properties: {
        id: { ...nullable("string"), description: "null para crear uno nuevo" },
        titulo: nullable("string"),
        meta: nullable("number"),
        actual: nullable("number"),
        unidad: nullable("string"),
        fecha_limite: nullable("string"),
      },
    },
  },
  {
    name: "guardar_nota",
    description: "Guarda una nota en la sección Estrategia del panel: un plan, una idea o una alerta.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["titulo", "contenido", "tipo"],
      properties: {
        titulo: { type: "string" },
        contenido: { type: "string" },
        tipo: { type: "string", enum: ["estrategia", "idea", "alerta"] },
      },
    },
  },
];

const nuevoId = () => randomUUID().slice(0, 8);
const hoy = () => new Date().toISOString().slice(0, 10);

function estadoVacio() {
  return { tareas: [], objetivos: [], metricas: [], notas: [] };
}

function normalizarEstado(e) {
  const base = estadoVacio();
  if (!e || typeof e !== "object") return base;
  for (const k of Object.keys(base)) if (Array.isArray(e[k])) base[k] = e[k];
  return base;
}

function ejecutarHerramienta(nombre, input, estado) {
  switch (nombre) {
    case "crear_tarea": {
      const tarea = { id: nuevoId(), ...input, estado: "pendiente", creada: hoy(), origen: "ia" };
      estado.tareas.push(tarea);
      return `Tarea creada con id ${tarea.id}.`;
    }
    case "actualizar_tarea": {
      const t = estado.tareas.find((x) => x.id === input.id);
      if (!t) throw new Error(`No existe una tarea con id ${input.id}.`);
      for (const k of ["estado", "prioridad", "fecha_limite"]) if (input[k] !== null) t[k] = input[k];
      return `Tarea ${t.id} actualizada.`;
    }
    case "registrar_metrica": {
      estado.metricas.push({ id: nuevoId(), ...input, metrica: input.metrica.toLowerCase().trim() });
      return `Métrica "${input.metrica}" registrada: ${input.valor}.`;
    }
    case "guardar_objetivo": {
      if (input.id) {
        const o = estado.objetivos.find((x) => x.id === input.id);
        if (!o) throw new Error(`No existe un objetivo con id ${input.id}.`);
        for (const k of ["titulo", "meta", "actual", "unidad", "fecha_limite"]) if (input[k] !== null) o[k] = input[k];
        return `Objetivo ${o.id} actualizado.`;
      }
      if (!input.titulo || input.meta === null) throw new Error("Para crear un objetivo hacen falta título y meta.");
      const o = { ...input, id: nuevoId(), actual: input.actual ?? 0, creado: hoy() };
      estado.objetivos.push(o);
      return `Objetivo creado con id ${o.id}.`;
    }
    case "guardar_nota": {
      const n = { id: nuevoId(), ...input, fecha: hoy() };
      estado.notas.push(n);
      return `Nota guardada con id ${n.id}.`;
    }
    default:
      throw new Error(`Herramienta desconocida: ${nombre}`);
  }
}

// --- Utilidades HTTP ---------------------------------------------------------

function claveValida(recibida) {
  const esperada = process.env.BAST_CLAVE_ADMIN;
  if (!esperada || typeof recibida !== "string") return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Historial en texto plano: [{ role: "user"|"assistant", content: string }].
function limpiarHistorial(mensajes, maxMensajes, maxChars) {
  if (!Array.isArray(mensajes)) return null;
  const limpio = mensajes
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, maxChars) }))
    .slice(-maxMensajes);
  while (limpio.length && limpio[0].role !== "user") limpio.shift();
  if (!limpio.length || limpio[limpio.length - 1].role !== "user") return null;
  return limpio;
}

function textoDe(content) {
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function llamarClaude({ system, messages, tools, effort, maxTokens }) {
  const respuesta = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    ...(tools ? { tools } : {}),
    output_config: { effort },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (respuesta.stop_reason === "refusal") {
    const err = new Error("refusal");
    err.refusal = true;
    throw err;
  }
  return respuesta;
}

// --- Modos ---------------------------------------------------------------

async function modoWeb(body) {
  const messages = limpiarHistorial(body.mensajes, 20, 1500);
  if (!messages) return { status: 400, json: { error: "Mensajes inválidos." } };

  const r = await llamarClaude({ system: SYSTEM_WEB, messages, effort: "low", maxTokens: 2048 });
  return { status: 200, json: { respuesta: textoDe(r.content) } };
}

async function modoNegocio(body, req) {
  if (!claveValida(req.headers["x-bast-clave"])) {
    return { status: 401, json: { error: "Clave incorrecta." } };
  }
  const historial = limpiarHistorial(body.mensajes, 30, 20000);
  if (!historial) return { status: 400, json: { error: "Mensajes inválidos." } };

  const estado = normalizarEstado(body.estado);
  const ultimo = historial.pop();
  const contexto =
    `Fecha de hoy: ${hoy()}\n` +
    `Estado actual del panel (JSON):\n${JSON.stringify(estado)}\n\n` +
    `Mensaje:\n${ultimo.content}`;
  const messages = [...historial, { role: "user", content: contexto }];

  const cambios = [];
  let r;
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    r = await llamarClaude({ system: SYSTEM_NEGOCIO, messages, tools: TOOLS, effort: "medium", maxTokens: 16000 });
    if (r.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: r.content });
    const resultados = [];
    for (const bloque of r.content) {
      if (bloque.type !== "tool_use") continue;
      try {
        const salida = ejecutarHerramienta(bloque.name, bloque.input, estado);
        cambios.push(salida);
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: salida });
      } catch (e) {
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: e.message, is_error: true });
      }
    }
    messages.push({ role: "user", content: resultados });
  }

  let respuesta = textoDe(r.content);
  if (r.stop_reason === "tool_use") respuesta ||= "Hice varios cambios en el panel; pedime un resumen si querés el detalle.";
  if (r.stop_reason === "max_tokens") respuesta += "\n\n(La respuesta se cortó por largo.)";
  return { status: 200, json: { respuesta, estado, cambios } };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Usá POST." });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  try {
    const { status, json } = body.modo === "negocio" ? await modoNegocio(body, req) : await modoWeb(body);
    return res.status(status).json(json);
  } catch (e) {
    if (e.refusal) {
      return res.status(200).json({ respuesta: "No puedo ayudar con eso. Probá reformular la consulta." });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Hay muchas consultas en este momento. Probá en unos segundos." });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY inválida o ausente");
      return res.status(500).json({ error: "La IA no está configurada todavía." });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("Error de la API de Claude:", e.status, e.message);
      return res.status(502).json({ error: "La IA no respondió. Probá de nuevo." });
    }
    console.error(e);
    return res.status(500).json({ error: "Error interno." });
  }
}
