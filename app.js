
// ========================================
// 🔥 FIREBASE IMPORTS
// ========================================

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";


// ========================================
// 🔐 FIREBASE CONFIG
// ========================================

const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "comedorjardin-c2db7.firebaseapp.com",
  projectId: "comedorjardin-c2db7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ========================================
// 🧠 VARIABLES
// ========================================

let alumnos = [];

let alumnosNuevos = [];

let alumnoSeleccionado = null;

let pedidos = [];

let menuActual = {
  opcion1: "",
  opcion2: ""
};

// Guarda qué grupo está viendo actualmente
// una educadora.
let grupoActual = null;


// ========================================
// 🔥 ALUMNOS EN TIEMPO REAL
// ========================================

onSnapshot(collection(db, "Alumnos"), (snap) => {

  alumnos = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  console.log("Alumnos cargados:", alumnos.length);

  // Los grupos se generan automáticamente
  // a partir de los alumnos existentes.
  renderGrupos();
});


// ========================================
// 🔥 PEDIDOS EN TIEMPO REAL
// ========================================

onSnapshot(collection(db, "pedidos"), (snap) => {

  pedidos = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  const totalPedidos =
    document.getElementById("totalPedidos");

  if (totalPedidos) {
    totalPedidos.textContent = pedidos.length;
  }

  renderPedidos();
  renderDirectora();

  // Si una educadora está viendo un grupo,
  // actualizamos su pantalla automáticamente.
  if (grupoActual) {
    verGrupo(grupoActual);
  }
});


// ========================================
// 🔥 MENÚ EN TIEMPO REAL
// ========================================

onSnapshot(doc(db, "config", "menu"), (snap) => {

  if (!snap.exists()) {
    return;
  }

  menuActual = snap.data();

  renderMenu();
  renderPedidos();

  if (grupoActual) {
    verGrupo(grupoActual);
  }
});


// ========================================
// 🔍 BUSCADOR DE ALUMNOS
// ========================================

function activarBuscador() {

  const input =
    document.getElementById("buscarAlumno");

  if (!input) return;

  input.addEventListener("input", (e) => {

    const texto =
      e.target.value
        .trim()
        .toLowerCase();

    if (!texto) {
      document.getElementById("resultados").innerHTML = "";
      alumnoSeleccionado = null;
      return;
    }

    const filtrados = alumnos.filter(a =>
      a.nombre
        .toLowerCase()
        .includes(texto)
    );

    mostrarResultados(filtrados);
  });
}


function mostrarResultados(lista) {

  const cont =
    document.getElementById("resultados");

  if (!cont) return;

  if (lista.length === 0) {

    cont.innerHTML = `
      <div class="opcion">
        No se encontraron alumnos
      </div>
    `;

    return;
  }

  cont.innerHTML = lista.map(a => `
    <div
      class="opcion"
      onclick="seleccionarAlumnoPorId('${a.id}')"
    >
      ${a.nombre} (${a.grupo})
    </div>
  `).join("");
}


// Usamos el ID del alumno en lugar del nombre.
// Así también funciona si existen dos niños
// con exactamente el mismo nombre.

window.seleccionarAlumnoPorId = function(id) {

  alumnoSeleccionado =
    alumnos.find(a => a.id === id);

  if (!alumnoSeleccionado) return;

  document.getElementById("buscarAlumno").value =
    alumnoSeleccionado.nombre;

  document.getElementById("resultados").innerHTML = "";
};


// ========================================
// 🍽️ HACER PEDIDO
// ========================================

window.hacerPedido = async function() {

  const platillo =
    document.querySelector(
      'input[name="platillo"]:checked'
    )?.value;

  if (!alumnoSeleccionado || !platillo) {

    return alert(
      "Selecciona un alumno y un platillo."
    );
  }


  // Fecha local del dispositivo.
  // Evitamos toISOString() porque trabaja en UTC
  // y cerca de medianoche podría producir
  // una fecha diferente en México.

  const ahora = new Date();

  const hoy = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, "0"),
    String(ahora.getDate()).padStart(2, "0")
  ].join("-");


  // Un solo pedido por alumno por día.
  //
  // Usamos el ID del alumno, no su nombre,
  // porque puede haber nombres repetidos.

  const pedidoId =
    `${alumnoSeleccionado.id}_${hoy}`;


  // Revisamos si ya existe para no perder
  // el estado de pagado/comió cuando un padre
  // vuelve a seleccionar el pedido.

  const pedidoRef =
    doc(db, "pedidos", pedidoId);

  const pedidoExistente =
    await getDoc(pedidoRef);


  if (pedidoExistente.exists()) {

    // Si ya había pedido, únicamente
    // actualizamos el platillo.

    await setDoc(
      pedidoRef,
      {
        alumno: alumnoSeleccionado.nombre,
        alumnoId: alumnoSeleccionado.id,
        grupo: alumnoSeleccionado.grupo,
        platillo: platillo,
        fechaTexto: hoy
      },
      { merge: true }
    );

    alert("Pedido actualizado ✅");

  } else {

    // Pedido nuevo.

    await setDoc(pedidoRef, {

      alumno: alumnoSeleccionado.nombre,
      alumnoId: alumnoSeleccionado.id,
      grupo: alumnoSeleccionado.grupo,
      platillo: platillo,

      pagado: false,
      comio: false,

      fechaTexto: hoy,
      fecha: new Date()
    });

    alert("Pedido guardado ✅");
  }


  // Limpiar selección para evitar
  // pedidos accidentales.

  alumnoSeleccionado = null;

  document.getElementById("buscarAlumno").value = "";

  document.getElementById("resultados").innerHTML = "";

  document
    .querySelectorAll('input[name="platillo"]')
    .forEach(radio => {
      radio.checked = false;
    });
};


// ========================================
// 📋 MENÚ
// ========================================

function renderMenu() {

  const cont =
    document.getElementById("menu");

  if (!cont) return;


  if (!menuActual.opcion1 ||
      !menuActual.opcion2) {

    cont.innerHTML =
      "<p>El menú del día aún no está disponible.</p>";

    return;
  }


  cont.innerHTML = `

    <div class="card">

      <label>
        <input
          type="radio"
          name="platillo"
          value="${menuActual.opcion1}"
        >

        ${menuActual.opcion1}
      </label>

      <br>

      <label>
        <input
          type="radio"
          name="platillo"
          value="${menuActual.opcion2}"
        >

        ${menuActual.opcion2}
      </label>

    </div>
  `;
}


window.guardarMenu = async function() {

  const p1 =
    document.getElementById("platillo1")
      .value
      .trim();

  const p2 =
    document.getElementById("platillo2")
      .value
      .trim();


  if (!p1 || !p2) {

    return alert(
      "Escribe las dos opciones del menú."
    );
  }


  await setDoc(
    doc(db, "config", "menu"),
    {
      opcion1: p1,
      opcion2: p2
    }
  );


  alert("Menú actualizado ✅");
};


// ========================================
// 👩‍🍳 COCINERA
// ========================================

window.togglePagado =
async function(id, estado) {

  await setDoc(
    doc(db, "pedidos", id),
    {
      pagado: estado
    },
    {
      merge: true
    }
  );
};


function renderPedidos() {

  const cont =
    document.getElementById("listaPedidos");

  if (!cont) return;


  if (!menuActual.opcion1 ||
      !menuActual.opcion2) {

    cont.innerHTML =
      "<p>Esperando menú del día...</p>";

    return;
  }


  if (pedidos.length === 0) {

    cont.innerHTML =
      "<p>No hay pedidos registrados.</p>";

    return;
  }


  let html = "";


  const grupos = [
    ...new Set(
      pedidos
        .map(p => p.grupo)
        .filter(Boolean)
    )
  ].sort();


  grupos.forEach(grupo => {

    const pedidosGrupo =
      pedidos.filter(
        p => p.grupo === grupo
      );


    // IMPORTANTE:
    // Para cocina únicamente contamos
    // pedidos PAGADOS.

    const opcion1Count =
      pedidosGrupo.filter(p =>
        p.platillo === menuActual.opcion1 &&
        p.pagado === true
      ).length;


    const opcion2Count =
      pedidosGrupo.filter(p =>
        p.platillo === menuActual.opcion2 &&
        p.pagado === true
      ).length;


    html += `

      <div class="grupo">

        <strong>
          Grupo ${grupo}
        </strong>

        <br><br>

        ${menuActual.opcion1}:
        <strong>${opcion1Count}</strong>

        <br>

        ${menuActual.opcion2}:
        <strong>${opcion2Count}</strong>

      </div>
    `;


    // Seguimos mostrando TODOS los pedidos,
    // aunque todavía no hayan pagado.

    pedidosGrupo.forEach(p => {

      html += `

        <div
          class="card ${p.pagado ? "pagado" : ""}"
        >

          <label>

            <input
              type="checkbox"
              ${p.pagado ? "checked" : ""}
              onchange="
                togglePagado(
                  '${p.id}',
                  this.checked
                )
              "
            >

            ${p.alumno}
            - ${p.platillo}

          </label>

        </div>
      `;
    });
  });


  cont.innerHTML = html;
}


// ========================================
// 👩‍🏫 EDUCADORAS
// ========================================

function renderGrupos() {

  const cont =
    document.getElementById("grupos");

  if (!cont) return;


  cont.innerHTML = "";


  // Los grupos salen de los alumnos reales.
  // Ya NO están escritos manualmente.

  const grupos = [
    ...new Set(
      alumnos
        .map(a => a.grupo)
        .filter(Boolean)
    )
  ].sort();


  grupos.forEach(grupo => {

    const btn =
      document.createElement("button");

    btn.textContent = grupo;

    btn.onclick = () =>
      verGrupo(grupo);

    cont.appendChild(btn);
  });
}


function verGrupo(grupo) {

  grupoActual = grupo;


  const cont =
    document.getElementById("vistaGrupo");

  if (!cont) return;


  const pedidosGrupo =
    pedidos.filter(
      p => p.grupo === grupo
    );


  const opcion1Lista =
    pedidosGrupo.filter(
      p =>
        p.platillo ===
        menuActual.opcion1
    );


  const opcion2Lista =
    pedidosGrupo.filter(
      p =>
        p.platillo ===
        menuActual.opcion2
    );


  let html = `
    <h3>
      Grupo ${grupo}
    </h3>
  `;


  // ---------- OPCIÓN 1 ----------

  html += `
    <h4>
      ${menuActual.opcion1}
      (${opcion1Lista.length})
    </h4>
  `;


  if (opcion1Lista.length === 0) {

    html += `
      <p>
        No hay pedidos de esta opción.
      </p>
    `;
  }


  opcion1Lista.forEach(p => {

    html += crearTarjetaEducadora(p);
  });


  // ---------- OPCIÓN 2 ----------

  html += `
    <h4>
      ${menuActual.opcion2}
      (${opcion2Lista.length})
    </h4>
  `;


  if (opcion2Lista.length === 0) {

    html += `
      <p>
        No hay pedidos de esta opción.
      </p>
    `;
  }


  opcion2Lista.forEach(p => {

    html += crearTarjetaEducadora(p);
  });


  cont.innerHTML = html;
}


function crearTarjetaEducadora(p) {

  return `

    <div
      class="card ${p.pagado ? "pagado" : ""}"
    >

      <strong>
        ${p.alumno}
      </strong>

      ${p.pagado
        ? "(Pagado ✅)"
        : "(Pendiente ❌)"
      }

      <br><br>

      <label>

        <input
          type="checkbox"
          ${p.comio ? "checked" : ""}
          onchange="
            toggleComio(
              '${p.id}',
              this.checked
            )
          "
        >

        Sí comió

      </label>

    </div>
  `;
}


window.toggleComio =
async function(id, estado) {

  await setDoc(
    doc(db, "pedidos", id),
    {
      comio: estado
    },
    {
      merge: true
    }
  );
};


// ========================================
// 👩‍💼 DIRECTORA
// ========================================

function renderDirectora() {

  const cont =
    document.getElementById(
      "directoraInfo"
    );

  if (!cont) return;


  const total =
    pedidos.length;


  const pagados =
    pedidos.filter(
      p => p.pagado === true
    );


  // Adeudo real:
  // no pagó + sí comió.

  const adeudos =
    pedidos.filter(
      p =>
        p.pagado !== true &&
        p.comio === true
    );


  cont.innerHTML = `

    <div class="card">

      <h3>
        Total pedidos:
        ${total}
      </h3>

      <h3>
        Pagados:
        ${pagados.length}
      </h3>

      <h3>
        No pagó y sí comió:
        ${adeudos.length}
      </h3>

    </div>


    <div class="card">

      <h3>
        Adeudos pendientes
      </h3>

      ${
        adeudos.length === 0

          ? `
            <p>
              No hay adeudos pendientes.
            </p>
          `

          : adeudos.map(p => `
              <div>
                ${p.alumno}
                (${p.grupo})
              </div>
            `).join("")
      }

    </div>
  `;
}


window.borrarPedidos =
async function() {

  const confirmar = confirm(
    "¿Seguro que quieres borrar todos los pedidos?"
  );

  if (!confirmar) return;


  const snap =
    await getDocs(
      collection(db, "pedidos")
    );


  for (const documento of snap.docs) {

    await deleteDoc(
      documento.ref
    );
  }


  alert("Pedidos eliminados.");
};


// ========================================
// 🔒 LOGIN
// ========================================

async function validarPassword(
  tipo,
  pass
) {

  const snap =
    await getDoc(
      doc(
        db,
        "config",
        "passwords"
      )
    );


  if (!snap.exists()) {
    return false;
  }


  return (
    snap.data()[tipo] === pass
  );
}


window.loginCocinera =
async function() {

  const pass =
    prompt("Contraseña");


  if (
    await validarPassword(
      "cocinera",
      pass
    )
  ) {

    mostrarTab("cocinera");

  } else {

    alert("Contraseña incorrecta");
  }
};


window.loginDirectora =
async function() {

  const pass =
    prompt("Contraseña");


  if (
    await validarPassword(
      "directora",
      pass
    )
  ) {

    mostrarTab("directora");

  } else {

    alert("Contraseña incorrecta");
  }
};


// ========================================
// 🔁 TABS
// ========================================

window.mostrarTab =
function(tab) {

  document
    .querySelectorAll(".tab")
    .forEach(t =>
      t.classList.remove("active")
    );


  const elemento =
    document.getElementById(tab);


  if (!elemento) {

    console.error(
      "No existe la pestaña:",
      tab
    );

    return;
  }


  elemento.classList.add("active");
};


// ========================================
// 📄 PREVISUALIZAR CSV
// ========================================

window.previsualizarCSV =
function() {

  const input =
    document.getElementById(
      "archivoCSV"
    );


  const file =
    input.files[0];


  if (!file) return;


  const reader =
    new FileReader();


  reader.onload =
  function(e) {

    const texto =
      e.target.result;


    const filas =
      texto
        .split(/\r?\n/)
        .filter(
          fila =>
            fila.trim() !== ""
        );


    if (filas.length < 2) {

      alert(
        "El archivo no contiene alumnos."
      );

      return;
    }


    // Eliminamos encabezado.

    filas.shift();


    const nuevos = [];


    for (const fila of filas) {

      /*
       * Para tu archivo actual esperamos:
       *
       * nombre,grupo
       *
       * Por ejemplo:
       *
       * Ana López,2A
       */

      const columnas =
        fila.split(",");


      if (columnas.length < 2) {

        console.warn(
          "Fila ignorada:",
          fila
        );

        continue;
      }


      const nombre =
        columnas[0].trim();


      const grupo =
        columnas[1].trim();


      if (!nombre || !grupo) {

        console.warn(
          "Fila incompleta:",
          fila
        );

        continue;
      }


      nuevos.push({
        nombre,
        grupo
      });
    }


    if (nuevos.length === 0) {

      alert(
        "No encontré alumnos válidos."
      );

      return;
    }


    alumnosNuevos = nuevos;


    mostrarResumenCSV();


    document
      .getElementById(
        "btnActualizarAlumnos"
      )
      .disabled = false;
  };


  reader.readAsText(file);
};


// ========================================
// 📊 RESUMEN DEL CSV
// ========================================

function mostrarResumenCSV() {

  const cont =
    document.getElementById(
      "resumenCSV"
    );


  const grupos = {};


  alumnosNuevos.forEach(alumno => {

    grupos[alumno.grupo] =
      (grupos[alumno.grupo] || 0)
      + 1;
  });


  let html = `

    <div class="card">

      <h4>
        Archivo listo
      </h4>

      <p>
        <strong>
          ${alumnosNuevos.length}
        </strong>

        alumnos encontrados.
      </p>

      <p>
        <strong>
          Distribución por grupo:
        </strong>
      </p>
  `;


  Object
    .entries(grupos)
    .sort(([a], [b]) =>
      a.localeCompare(b)
    )
    .forEach(
      ([grupo, cantidad]) => {

        html += `
          <p>
            ${grupo}:
            ${cantidad} alumnos
          </p>
        `;
      }
    );


  html += "</div>";


  cont.innerHTML = html;
}


// ========================================
// 🔄 REEMPLAZAR ALUMNOS
// ========================================

window.reemplazarAlumnos =
async function() {

  if (alumnosNuevos.length === 0) {

    return alert(
      "Primero selecciona un CSV válido."
    );
  }


  const confirmar = confirm(

    `Se eliminarán los alumnos actuales y se cargarán ${alumnosNuevos.length} alumnos del nuevo ciclo escolar.\n\n¿Deseas continuar?`

  );


  if (!confirmar) return;


  const boton =
    document.getElementById(
      "btnActualizarAlumnos"
    );


  boton.disabled = true;

  boton.textContent =
    "Actualizando alumnos...";


  try {

    // --------------------------
    // 1. BORRAR ALUMNOS VIEJOS
    // --------------------------

    const snapshot =
      await getDocs(
        collection(db, "Alumnos")
      );


    for (
      const documento
      of snapshot.docs
    ) {

      await deleteDoc(
        documento.ref
      );
    }


    // --------------------------
    // 2. SUBIR ALUMNOS NUEVOS
    // --------------------------

    /*
     * Generamos IDs propios en lugar de
     * usar el nombre.
     *
     * alumno_0001
     * alumno_0002
     * ...
     *
     * Así dos alumnos pueden llamarse
     * exactamente igual.
     */

    for (
      let i = 0;
      i < alumnosNuevos.length;
      i++
    ) {

      const alumno =
        alumnosNuevos[i];


      const numero =
        String(i + 1)
          .padStart(4, "0");


      const alumnoId =
        `alumno_${numero}`;


      await setDoc(
        doc(
          db,
          "Alumnos",
          alumnoId
        ),
        {
          nombre:
            alumno.nombre,

          grupo:
            alumno.grupo
        }
      );
    }


    alert(
      `Actualización terminada ✅\n\n${alumnosNuevos.length} alumnos cargados.`
    );


    // Limpiar formulario.

    document
      .getElementById(
        "archivoCSV"
      )
      .value = "";


    document
      .getElementById(
        "resumenCSV"
      )
      .innerHTML = "";


    alumnosNuevos = [];


  } catch (error) {

    console.error(
      "Error actualizando alumnos:",
      error
    );


    alert(
      "Ocurrió un error al actualizar los alumnos. No vuelvas a presionar el botón hasta revisar qué ocurrió."
    );


  } finally {

    boton.disabled = true;

    boton.textContent =
      "Reemplazar lista de alumnos";
  }
};


// ========================================
// 🚀 INICIO
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    activarBuscador();

  }
);
