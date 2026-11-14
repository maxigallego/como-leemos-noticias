// =====================================================================
// Escepticismo vago: experimento sobre el costo de verificar noticias
// jsPsych 8. La configuración está en config.js.
// =====================================================================

const params = new URLSearchParams(window.location.search);
const MODO_PRUEBA = !DATAPIPE_ID;

const jsPsych = initJsPsych({
  show_progress_bar: false,
  on_finish: () => {},
});

const PARTICIPANTE = jsPsych.randomization.randomID(10);
let COSTO = null; // se asigna al inicio

const titularHTML = (t) => `<div class="titular">${t.texto}</div>`;
const respuestaAnterior = () => jsPsych.data.get().last(1).values()[0];

// ---------------------------------------------------------------------
// Bloque 0. Consentimiento
// ---------------------------------------------------------------------
const consentimiento = {
  type: jsPsychSurveyMultiChoice,
  preamble: `
    <h2>¿Cómo leemos las noticias?</h2>
    <p>Este estudio es parte de un trabajo de la Maestría en Economía Aplicada (FCE-UBA).
    Vas a ver algunos titulares de noticias y responder preguntas breves.
    Dura unos 10 minutos, es anónimo y podés dejarlo cuando quieras.</p>
    <p>Algunos titulares son reales y otros no; al final te contamos cuáles.</p>
    <p class="nota">Contacto: ${CONTACTO}</p>`,
  questions: [
    { prompt: "¿Tenés 18 años o más?", name: "mayor_edad", options: ["Sí", "No"], required: true, horizontal: true },
    { prompt: "¿Aceptás participar?", name: "acepta", options: ["Sí, acepto", "No acepto"], required: true, horizontal: true },
  ],
  button_label: "Continuar",
  data: { fase: "consentimiento" },
  on_finish: (data) => {
    if (data.response.mayor_edad !== "Sí" || data.response.acepta !== "Sí, acepto") {
      jsPsych.abortExperiment("<p>Gracias por tu tiempo. Este estudio es solo para personas mayores de 18 años que aceptan participar.</p>");
    }
  },
};

// ---------------------------------------------------------------------
// Asignación de la condición de costo
// ---------------------------------------------------------------------
const asignarCosto = {
  type: jsPsychCallFunction,
  async: true,
  func: async (done) => {
    let indice = null;
    let origen = "aleatorio_local";
    const forzado = params.get("costo"); // solo para pruebas: ?costo=2 o ?costo=15
    if (forzado && COSTOS.includes(Number(forzado))) {
      COSTO = Number(forzado);
      origen = "forzado_url";
    } else {
      if (!MODO_PRUEBA) {
        try {
          const c = await jsPsychPipe.getCondition(DATAPIPE_ID);
          if (Number.isInteger(c) && c >= 0 && c < COSTOS.length) { indice = c; origen = "datapipe"; }
        } catch (e) { /* si falla, se asigna al azar */ }
      }
      if (indice === null) indice = Math.floor(Math.random() * COSTOS.length);
      COSTO = COSTOS[indice];
    }
    jsPsych.data.addProperties({ participante: PARTICIPANTE, costo: COSTO, asignacion: origen, modo_prueba: MODO_PRUEBA });
    done({ costo: COSTO, asignacion: origen });
  },
  data: { fase: "asignacion" },
};

// ---------------------------------------------------------------------
// Bloque 1. Instrucciones
// ---------------------------------------------------------------------
const instrucciones = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => `
    <h2>Cómo funciona</h2>
    <p>Vas a ver <b>8 titulares de noticias</b>, de a uno. Para cada titular:</p>
    <ol>
      <li>Indicás si creés que es verdadera o falsa, en una escala de 1 (seguro que es falsa) a 7 (seguro que es verdadera).</li>
      <li>Elegís si querés ver una <b>verificación</b> que te dice si es verdadero o falso.
          <span class="costo">Ver la verificación demora ${COSTO} segundos.</span></li>
    </ol>
    <p>Al final te mostramos cuántos titulares acertaste: cuenta como acierto si verificaste,
    o si no verificaste pero te inclinaste hacia la respuesta correcta (1 a 3 si era falsa, 5 a 7 si era verdadera).</p>
    <p>Primero hay un titular de práctica.</p>`,
  choices: ["Empezar la práctica"],
  data: { fase: "instrucciones" },
};

// ---------------------------------------------------------------------
// Secuencia de un titular (se usa para la práctica y para los 8)
// ---------------------------------------------------------------------
function secuenciaTitular(t, fase) {
  const base = { titular: t.id, verdadero: t.verdadero, verosimil: t.verosimil, fase };

  const credibilidad = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `${titularHTML(t)}<p class="pregunta">¿Creés que esta noticia es verdadera o falsa?</p>`,
    choices: ["1", "2", "3", "4", "5", "6", "7"],
    prompt: `<div class="extremos"><span>1 = Seguro que<br>es falsa</span><span style="text-align:center">4 = No sé</span><span style="text-align:right">7 = Seguro que<br>es verdadera</span></div>`,
    css_classes: ["escala"],
    data: { ...base, paso: "credibilidad" },
    on_finish: (d) => { d.credibilidad = d.response + 1; },
  };

  const decision = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => `${titularHTML(t)}
      <p class="pregunta">¿Querés ver la verificación de este titular?</p>
      <p class="costo">Ver la verificación demora ${COSTO} segundos.</p>`,
    choices: ["Ver verificación", "Seguir sin verificar"],
    button_html: (choice, i) => `<button class="jspsych-btn${i === 1 ? " secundario" : ""}">${choice}</button>`,
    data: { ...base, paso: "decision" },
    on_finish: (d) => { d.verifico = d.response === 0; },
  };

  let intervalo = null;
  const espera = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => `<div class="espera">
        <p>Verificando…</p>
        <div class="reloj" id="reloj">0:${String(COSTO).padStart(2, "0")}</div>
        <div class="barra"><div id="barra"></div></div>
      </div>`,
    choices: "NO_KEYS",
    trial_duration: () => COSTO * 1000,
    data: { ...base, paso: "espera" },
    on_load: () => {
      const inicio = performance.now();
      const total = COSTO * 1000;
      intervalo = setInterval(() => {
        const pasado = performance.now() - inicio;
        const resta = Math.max(0, Math.ceil((total - pasado) / 1000));
        const r = document.getElementById("reloj");
        const b = document.getElementById("barra");
        if (r) r.textContent = `0:${String(resta).padStart(2, "0")}`;
        if (b) b.style.width = `${Math.min(100, (pasado / total) * 100)}%`;
      }, 100);
    },
    on_finish: () => clearInterval(intervalo),
  };
  const esperaCondicional = {
    timeline: [espera],
    conditional_function: () => jsPsych.data.get().filter({ titular: t.id, paso: "decision", fase }).last(1).values()[0].verifico,
  };

  const verifico = () => jsPsych.data.get().filter({ titular: t.id, paso: "decision", fase }).last(1).values()[0].verifico;

  // Si verificó: ve el veredicto y sigue. Cuenta como acierto (pagó el costo de saberlo).
  const veredicto = {
    timeline: [{
      type: jsPsychHtmlButtonResponse,
      stimulus: `${titularHTML(t)}
        <p class="veredicto ${t.verdadero ? "v" : "f"}">Verificación: ${t.verdadero ? "VERDADERO" : "FALSO"}</p>
        <p>${t.contexto}</p><p class="nota">Verificación del equipo de investigación.</p>`,
      choices: ["Siguiente"],
      data: { ...base, paso: "juicio", verifico: true },
      on_finish: (d) => { d.juicio_verdadera = t.verdadero; d.acierto = true; },
    }],
    conditional_function: () => verifico(),
  };

  // Si no verificó: el juicio es el de la escala (1-3 = falsa, 5-7 = verdadera, 4 = no sabe). Sin pantalla.
  const juicio = {
    timeline: [{
      type: jsPsychCallFunction,
      func: () => {
        const c = jsPsych.data.get().filter({ titular: t.id, paso: "credibilidad", fase }).last(1).values()[0].credibilidad;
        const inclinacion = c >= 5 ? "verdadera" : c <= 3 ? "falsa" : "no_sabe";
        return { inclinacion, acierto: inclinacion === (t.verdadero ? "verdadera" : "falsa") };
      },
      data: { ...base, paso: "juicio", verifico: false },
      on_finish: (d) => { d.inclinacion = d.value.inclinacion; d.acierto = d.value.acierto; },
    }],
    conditional_function: () => !verifico(),
  };

  return { timeline: [credibilidad, decision, esperaCondicional, veredicto, juicio] };
}

// ---------------------------------------------------------------------
// Comprensión
// ---------------------------------------------------------------------
const comprension = {
  type: jsPsychSurveyMultiChoice,
  questions: [{ prompt: "Antes de empezar: ¿cuánto demora ver una verificación?", name: "comprension",
    options: ["2 segundos", "15 segundos", "No demora", "No sé"], required: true }],
  button_label: "Continuar",
  data: { fase: "comprension" },
  on_finish: (d) => { d.comprension_ok = d.response.comprension === `${COSTO} segundos`; },
};
const feedbackComprension = {
  timeline: [{
    type: jsPsychHtmlButtonResponse,
    stimulus: () => `<p>La respuesta correcta es <b>${COSTO} segundos</b>. Tenelo en cuenta durante la tarea.</p>`,
    choices: ["Entendido"],
    data: { fase: "comprension_feedback" },
  }],
  conditional_function: () => !respuestaAnterior().comprension_ok,
};
const inicioTarea = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "<p>Ahora empieza la tarea con los 8 titulares.</p>",
  choices: ["Empezar"],
  data: { fase: "inicio_tarea" },
};

// ---------------------------------------------------------------------
// Bloque 2. Los 8 titulares en orden aleatorio
// ---------------------------------------------------------------------
const ordenTitulares = jsPsych.randomization.shuffle(TITULARES);
const tareaPrincipal = { timeline: ordenTitulares.map((t, i) => {
  const s = secuenciaTitular(t, "tarea");
  s.timeline.forEach((n) => { if (n.data) n.data.orden = i + 1; else if (n.timeline) n.timeline[0].data.orden = i + 1; });
  return s;
}) };

// ---------------------------------------------------------------------
// Bloque 3. Después de la tarea
// ---------------------------------------------------------------------
const familiaridad = {
  type: jsPsychSurveyMultiChoice,
  preamble: "<p class='pregunta'>¿Habías visto alguno de estos titulares antes de este estudio?</p>",
  questions: TITULARES.map((t) => ({ prompt: t.texto, name: `fam_${t.id}`,
    options: ["Sí", "No", "No estoy seguro/a"], required: true, horizontal: true })),
  button_label: "Continuar",
  data: { fase: "post", paso: "familiaridad" },
};
const motivos = {
  timeline: [{
    type: jsPsychSurveyMultiSelect,
    questions: [{ prompt: "Cuando elegiste no ver la verificación, ¿por qué fue? Podés marcar más de una opción.",
      name: "motivos", required: true,
      options: ["Ya sabía si era cierto", "Confiaba en mi propio criterio", "No me interesaba el tema",
        "La espera era demasiado larga", "Quería terminar rápido", "Otro motivo"] }],
    button_label: "Continuar",
    data: { fase: "post", paso: "motivos" },
  }],
  conditional_function: () => jsPsych.data.get().filter({ fase: "tarea", paso: "decision" }).values().some((d) => !d.verifico),
};
const postTarea = {
  type: jsPsychSurveyMultiChoice,
  questions: [
    { prompt: "¿Qué tan molesta te resultó la espera para ver las verificaciones? (1 = Nada molesta, 7 = Muy molesta)",
      name: "molestia", options: ["1", "2", "3", "4", "5", "6", "7"], required: true, horizontal: true },
    { prompt: "En general, cuando una noticia te genera dudas, ¿con qué frecuencia la buscás en otra fuente para confirmarla?",
      name: "habito", options: ["Nunca", "Pocas veces", "A veces", "Casi siempre", "Siempre"], required: true },
    { prompt: "¿Con qué frecuencia te informás sobre noticias?", name: "consumo",
      options: ["Menos de una vez por semana", "Algunas veces por semana", "Todos los días", "Varias veces por día"], required: true },
    { prompt: "En general, ¿cuánto confiás en las noticias que publican los medios de comunicación? (1 = Nada, 5 = Mucho)",
      name: "confianza_medios", options: ["1", "2", "3", "4", "5"], required: true, horizontal: true },
  ],
  button_label: "Continuar",
  data: { fase: "post", paso: "post_tarea" },
};

// ---------------------------------------------------------------------
// Bloque 4. Perfil
// ---------------------------------------------------------------------
const edad = {
  type: jsPsychSurveyHtmlForm,
  html: `<p class="pregunta">¿Qué edad tenés?</p>
         <input name="edad" type="number" min="18" max="99" required style="width:100px"> años`,
  button_label: "Continuar",
  data: { fase: "perfil", paso: "edad" },
};
const perfil = {
  type: jsPsychSurveyMultiChoice,
  questions: [
    { prompt: "Para mostrar que estás leyendo, elegí la opción «Bastante».", name: "atencion",
      options: ["Nada", "Poco", "Bastante", "Mucho"], required: true, horizontal: true },
    { prompt: "¿Con qué género te identificás?", name: "genero",
      options: ["Mujer", "Varón", "Otro", "Prefiero no decir"], required: true },
    { prompt: "¿Cuál es el máximo nivel educativo que alcanzaste (completo o en curso)?", name: "educacion",
      options: ["Secundario", "Terciario", "Universitario", "Posgrado"], required: true },
    { prompt: "¿En qué área estudiás o trabajás?", name: "area",
      options: ["Economía y negocios", "Ciencias sociales", "Ciencias exactas o ingeniería", "Salud", "Otra"], required: true },
    { prompt: "En política se suele hablar de izquierda y derecha. ¿Dónde te ubicarías? (1 = Izquierda, 7 = Derecha)", name: "ideologia",
      options: ["1", "2", "3", "4", "5", "6", "7", "Prefiero no responder"], required: true, horizontal: true },
  ],
  button_label: "Continuar",
  data: { fase: "perfil", paso: "perfil" },
};

// ---------------------------------------------------------------------
// Guardado y cierre
// ---------------------------------------------------------------------
const puntaje = () => jsPsych.data.get().filter({ fase: "tarea", paso: "juicio" }).values().filter((d) => d.acierto).length;

const guardando = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>Guardando tus respuestas…</p>",
  choices: "NO_KEYS",
  trial_duration: 300,
  data: { fase: "fin" },
  on_finish: () => jsPsych.data.addProperties({ puntaje: puntaje() }),
};
const guardar = {
  timeline: [{
    type: jsPsychPipe,
    action: "save",
    experiment_id: DATAPIPE_ID,
    filename: () => `${PARTICIPANTE}.csv`,
    data_string: () => jsPsych.data.get().csv(),
  }],
  conditional_function: () => !MODO_PRUEBA,
};

const cierre = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    const lista = TITULARES.map((t) => `<li>${t.texto}: <b>${t.verdadero ? "verdadero" : "falso"}</b></li>`).join("");
    return `<h2>Acertaste ${puntaje()} de 8 titulares</h2>
      <p>Estos eran los titulares:</p><ul>${lista}</ul>
      <p><b>De qué se trataba el estudio.</b> Estudiamos si el tiempo que lleva verificar cambia cuánto se verifica.
      A la mitad de los participantes la verificación les demoró 2 segundos y a la otra mitad, 15.</p>
      <p>Los titulares falsos fueron tomados de contenidos que el sitio de verificación Chequeado ya desmintió.
      Por favor, no los compartas como si fueran ciertos.</p>
      <p>¡Gracias por participar! Si tenés consultas, escribinos a ${CONTACTO}.</p>
      ${MODO_PRUEBA ? '<p class="nota">Modo prueba: los datos no se guardaron en OSF. Podés descargarlos con el botón.</p>' : ""}`;
  },
  choices: () => (MODO_PRUEBA ? ["Descargar datos (CSV)"] : []),
  data: { fase: "cierre" },
  on_load: () => {
    if (MODO_PRUEBA) {
      const btn = document.querySelector(".jspsych-btn");
      if (btn) btn.addEventListener("click", () => jsPsych.data.get().localSave("csv", `prueba_${PARTICIPANTE}.csv`));
    }
  },
};

// ---------------------------------------------------------------------
// Línea de tiempo
// ---------------------------------------------------------------------
jsPsych.run([
  consentimiento,
  asignarCosto,
  instrucciones,
  secuenciaTitular(PRACTICA, "practica"),
  comprension,
  feedbackComprension,
  inicioTarea,
  tareaPrincipal,
  familiaridad,
  motivos,
  postTarea,
  perfil,
  edad,
  guardando,
  guardar,
  cierre,
]);
