// =====================================================================
// CONFIGURACIÓN DEL EXPERIMENTO
// Lo único que hay que completar antes de lanzar es DATAPIPE_ID.
// =====================================================================

// ID de 12 caracteres que da DataPipe (pipe.jspsych.org) al crear el experimento.
// Mientras quede vacío, el experimento corre en "modo prueba": no guarda en OSF
// y al final ofrece descargar los datos en un archivo CSV.
const DATAPIPE_ID = "goC12oxVwkzh";

// Segundos de espera para ver una verificación, por condición.
// Con DataPipe, la condición se asigna de forma balanceada (configurar 2 condiciones en DataPipe).
const COSTOS = [5, 15];

// Mail de contacto que aparece en el consentimiento y en el cierre.
const CONTACTO = "maxigallego089@gmail.com";

// Titulares de la tarea. verdadero: true/false. verosimil: true = verosímil, false = sorprendente.
const TITULARES = [
  { id: "t1", verdadero: true,  verosimil: true,
    texto: "Desde noviembre, el boleto mínimo de colectivo en las líneas porteñas pasa a $956",
    contexto: "Sube 3,9 %: la inflación de septiembre más 2 puntos." },
  { id: "t2", verdadero: true,  verosimil: true,
    texto: "La Asignación Universal por Hijo aumenta 1,9 % en noviembre y llega a $159.610 por hijo",
    contexto: "Es la actualización mensual por la inflación de septiembre." },
  { id: "t3", verdadero: true,  verosimil: false,
    texto: "La nafta súper en Argentina es más barata que en Chile, Perú y Uruguay",
    contexto: "En mayo costó US$ 1,54 por litro, contra US$ 1,78 en Chile, 1,75 en Perú y 2,20 en Uruguay. Solo Brasil era más barato." },
  { id: "t4", verdadero: true,  verosimil: false,
    texto: "Milei propuso llevar la apertura de la economía argentina del 30 % al 90 %",
    contexto: "Habló del coeficiente de apertura comercial en la gala de Endeavor del 12 de noviembre." },
  { id: "t5", verdadero: false, verosimil: true,
    texto: "ARCA envía mails a contribuyentes con multas por documentos fiscales sin presentar",
    contexto: "Son mails falsos que usan el nombre de ARCA para robar datos (phishing): no los envía el organismo." },
  { id: "t6", verdadero: false, verosimil: true,
    texto: "The Economist publicó una nota que llama a Milei “el líder más ignorante del mundo”",
    contexto: "La revista no publicó esa nota; la imagen salió de una cuenta de parodia." },
  { id: "t7", verdadero: false, verosimil: false,
    texto: "Trump dejó de seguir a Milei en Instagram después de las elecciones de medio término",
    contexto: "Trump sigue a muy pocas cuentas desde 2020 y Milei nunca estuvo entre ellas: no pudo dejar de seguirlo." },
  { id: "t8", verdadero: false, verosimil: false,
    texto: "El Banco Central lanzará un billete de $100.000 con la imagen de René Favaloro",
    contexto: "El Banco Central desmintió que vaya a emitir ese billete; no hay ningún anuncio oficial." },
];

const PRACTICA = { id: "practica", verdadero: true, verosimil: true,
  texto: "Los alquileres con ajuste trimestral suben 5,81 % en noviembre",
  contexto: "Es la inflación acumulada de julio a septiembre." };
