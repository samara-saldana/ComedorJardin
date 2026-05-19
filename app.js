// 🔥 IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// 🔐 CONFIG
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "comedorjardin-c2db7.firebaseapp.com",
  projectId: "comedorjardin-c2db7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🧠 VARIABLES
let alumnos = [];
let alumnoSeleccionado = null;
let pedidos = [];
let menuActual = { opcion1: "", opcion2: "" };

// =======================
// 🔥 FIREBASE REALTIME
// =======================

onSnapshot(collection(db, "Alumnos"), snap => {
  alumnos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

onSnapshot(collection(db, "pedidos"), snap => {
  pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  document.getElementById("totalPedidos").textContent = pedidos.length;
  renderPedidos();
});

onSnapshot(doc(db, "config", "menu"), snap => {
  if (snap.exists()) {
    menuActual = snap.data();
    renderMenu();
  }
});

// =======================
// 🔍 BUSCADOR
// =======================

function activarBuscador() {
  const input = document.getElementById("buscarAlumno");

  input.addEventListener("input", (e) => {
    const texto = e.target.value.toLowerCase();

    const filtrados = alumnos.filter(a =>
      a.nombre.toLowerCase().includes(texto)
    );

    mostrarResultados(filtrados);
  });
}

function mostrarResultados(lista) {
  const cont = document.getElementById("resultados");

  cont.innerHTML = lista.map(a => `
    <div onclick="seleccionarAlumno('${a.nombre}')">
      ${a.nombre} (${a.grupo})
    </div>
  `).join("");
}

window.seleccionarAlumno = function(nombre) {
  alumnoSeleccionado = alumnos.find(a => a.nombre === nombre);

  document.getElementById("buscarAlumno").value = nombre;
  document.getElementById("resultados").innerHTML = "";
};

// =======================
// 🍽️ PEDIDOS
// =======================

window.hacerPedido = async function() {
  const platillo = document.querySelector('input[name="platillo"]:checked')?.value;

  if (!alumnoSeleccionado || !platillo) {
    return alert("Faltan datos");
  }

  await addDoc(collection(db, "pedidos"), {
    alumno: alumnoSeleccionado.nombre,
    grupo: alumnoSeleccionado.grupo,
    platillo,
    pagado: false,
    fecha: new Date()
  });

  alert("Pedido guardado");
};

// =======================
// 📋 MENÚ
// =======================

function renderMenu() {
  document.getElementById("menu").innerHTML = `
    <label><input type="radio" name="platillo" value="${menuActual.opcion1}"> ${menuActual.opcion1}</label><br>
    <label><input type="radio" name="platillo" value="${menuActual.opcion2}"> ${menuActual.opcion2}</label>
  `;
}

window.guardarMenu = async function() {
  const p1 = document.getElementById("platillo1").value;
  const p2 = document.getElementById("platillo2").value;

  await setDoc(doc(db, "config", "menu"), {
    opcion1: p1,
    opcion2: p2
  });
};

// =======================
// 👩‍🍳 PEDIDOS COCINERA
// =======================

window.togglePagado = async function(id, estado) {
  await setDoc(doc(db, "pedidos", id), { pagado: estado }, { merge: true });
};

function renderPedidos() {
  const cont = document.getElementById("listaPedidos");

  let html = "";

  const grupos = [...new Set(pedidos.map(p => p.grupo))];

  grupos.forEach(grupo => {
    const pedidosGrupo = pedidos.filter(p => p.grupo === grupo);

    const opcion1 = pedidosGrupo.filter(p => p.platillo === menuActual.opcion1).length;
    const opcion2 = pedidosGrupo.filter(p => p.platillo === menuActual.opcion2).length;

    html += `
      <h3>Grupo ${grupo}</h3>
      <p>${menuActual.opcion1}: ${opcion1} | ${menuActual.opcion2}: ${opcion2}</p>
    `;

    pedidosGrupo.forEach(p => {
      html += `
        <div class="card">
          <input type="checkbox" ${p.pagado ? "checked" : ""}
            onchange="togglePagado('${p.id}', this.checked)">
          ${p.alumno} - ${p.platillo}
        </div>
      `;
    });
  });

  cont.innerHTML = html;
}

// =======================
// 👩‍💼 DIRECTORA
// =======================

window.borrarPedidos = async function() {
  if (!confirm("¿Seguro?")) return;

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => deleteDoc(d.ref));
};

// =======================
// 🔒 LOGIN DESDE FIREBASE
// =======================

async function validarPassword(tipo, pass) {
  const snap = await getDoc(doc(db, "config", "passwords"));
  if (!snap.exists()) return false;

  return snap.data()[tipo] === pass;
}

window.loginCocinera = async function() {
  const pass = prompt("Contraseña");

  if (await validarPassword("cocinera", pass)) {
    mostrarTab("cocinera");
  } else {
    alert("Incorrecto");
  }
};

window.loginDirectora = async function() {
  const pass = prompt("Contraseña");

  if (await validarPassword("directora", pass)) {
    mostrarTab("directora");
  } else {
    alert("Incorrecto");
  }
};

// =======================
// 🔁 TABS
// =======================

window.mostrarTab = function(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  const el = document.getElementById(tab);
  if (!el) return console.error("No existe:", tab);

  el.classList.add("active");
};


function renderGrupos() {
  const cont = document.getElementById("grupos");
  cont.innerHTML = "";

  const grupos = ["1A","1B","2A","2B","3A"];

  grupos.forEach(g => {
    const btn = document.createElement("button");
    btn.textContent = g;
    btn.onclick = () => verGrupo(g);
    cont.appendChild(btn);
  });
}

function verGrupo(grupo) {
  const cont = document.getElementById("vistaGrupo");

  const pedidosGrupo = pedidos.filter(p => p.grupo === grupo);

  const opcion1Lista = pedidosGrupo.filter(p => p.platillo === menuActual.opcion1);
  const opcion2Lista = pedidosGrupo.filter(p => p.platillo === menuActual.opcion2);

  let html = `<h3>Grupo ${grupo}</h3>`;

  html += `<h4>${menuActual.opcion1}</h4>`;
  opcion1Lista.forEach(p => {
    html += `<div>${p.alumno}</div>`;
  });

  html += `<h4>${menuActual.opcion2}</h4>`;
  opcion2Lista.forEach(p => {
    html += `<div>${p.alumno}</div>`;
  });

  cont.innerHTML = html;
}


// =======================
//INIT
// =======================

document.addEventListener("DOMContentLoaded", () => {
  activarBuscador();
  renderGrupos(); //
});


//para subir CSV

window.subirCSV = function() {
  const file = document.getElementById("archivoCSV").files[0];

  if (!file) return alert("Selecciona un archivo");

  const reader = new FileReader();

  reader.onload = async function(e) {
    const texto = e.target.result;

    const filas = texto.split("\n").slice(1); // quitar encabezado

    for (let fila of filas) {
      if (!fila.trim()) continue;

      const [nombre, grupo] = fila.split(",");

      await setDoc(doc(db, "Alumnos", nombre.trim()), {
          nombre: nombre.trim(),
          grupo: grupo.trim()
      });
    }

    alert("Alumnos cargados correctamente ✅");
  };

  reader.readAsText(file);
};