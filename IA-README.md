# IA de BAST

Dos asistentes con Claude (Anthropic):

| Qué | Dónde | Para quién |
|---|---|---|
| **Asistente del negocio** (empleado + estratega) | `asistente.html` | Dueño / gerente. Pide clave. |
| **Chat de la web** | burbuja en `index.html`, `entrenamiento.html`, `medicina.html`, `bast-web.html` (`ia-chat.js`) | Visitantes del sitio |

Los dos usan la misma función del servidor: `api/ia.js`.

## Asistente del negocio (`/asistente.html`)

Menú lateral con:

- **Resumen**: pendientes, tareas vencidas, avance de objetivos, tareas hechas en la semana y la última estrategia.
- **Pendientes**: tareas tuyas y las que crea la IA, con prioridad y fecha límite.
- **Progreso**: objetivos con barra de avance y métricas (socios, altas, bajas, facturación…) con su variación.
- **Estrategia**: planes, ideas y alertas que guarda la IA.
- **Hablar con la IA**: le pedís informes, “¿qué hago hoy?”, el plan del mes o que analice tus números. La IA puede **crear y actualizar tareas, registrar métricas, crear objetivos y guardar notas** por su cuenta.

Los datos se guardan en el navegador (localStorage) del dispositivo donde lo uses. Usá **Exportar / Importar datos** para hacer copias o pasar los datos a otra computadora.

## Cómo ponerlo en línea (Vercel)

1. Creá una API key en https://platform.claude.com (Settings → API keys).
2. Importá este repositorio en https://vercel.com (New Project). No hace falta configurar build.
3. En **Settings → Environment Variables** cargá:
   - `ANTHROPIC_API_KEY` = tu API key
   - `BAST_CLAVE_ADMIN` = la clave para entrar a `asistente.html` (elegí una larga)
4. Deploy. El sitio queda en `https://tu-proyecto.vercel.app` y el panel en `/asistente.html`.

Sin estas variables el chat de la web muestra un aviso y deriva a WhatsApp.

## Costos y límites

- Modelo: `claude-opus-5-5`. Se cobra por uso en la cuenta de Anthropic; conviene poner un límite de gasto mensual en la consola.
- El chat público usa esfuerzo bajo, respuestas cortas y como máximo los últimos 20 mensajes, para que cada consulta salga barata.
- El chat público no tiene límite por visitante: si ves abuso, agregá un rate limit (por ejemplo, Vercel Firewall) delante de `/api/ia`.

## Cambiar la información de BAST

Precios, horarios, actividades y contacto que conoce la IA están en `INFO_BAST`, al principio de `api/ia.js`. Si cambian en la web, actualizalos ahí también.
