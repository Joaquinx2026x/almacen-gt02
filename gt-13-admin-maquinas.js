// ══════════════════════════════════════════════
// GESTIÓN DE MÁQUINAS (solo Admin)
// ══════════════════════════════════════════════
function abrirGestionMaquinas() {
  toggleMenuMas();
  if((SESION.rol||"").toLowerCase()!=="admin"){ alert("Solo un Admin puede gestionar máquinas."); return; }
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("gestionMaquinasScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  cargarMaquinasAdmin();
}

function cargarMaquinasAdmin() {
  var div = document.getElementById("maqLista");
  if(!div) return;
  div.innerHTML="<div class='loading'>🔄 Cargando...</div>";
  sheetsGet(SHEET("Maquinas")+"!A2:F").then(function(r){
    var rows=(r.values||[]).filter(function(row){return row[0];});
    if(!rows.length){ div.innerHTML="<div class='empty'><div class='ei'>🚧</div><p>No hay máquinas registradas</p></div>"; return; }
    div.innerHTML=rows.map(function(row){
      return "<div class='card' style='margin-bottom:7px;padding:10px'>" +
        "<b>"+row[1]+"</b> <span class='badge bm'>"+row[2]+"</span>" +
        "<div style='font-size:11px;color:#888;margin-top:3px'>"+row[0]+(row[3]?" · "+row[3]:"")+"</div>" +
        "</div>";
    }).join("");
  }).catch(function(){
    div.innerHTML="<div class='msg-err'>No se encontró la hoja "+SHEET("Maquinas")+". Agrega la primera máquina para crearla.</div>";
  });
}

function nuevaMaquinaForm() {
  var formDiv = document.getElementById("maqForm");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>➕ Agregar máquina</div>" +
    "<input type='text' id='nmNombre' placeholder='Nombre de la máquina *'>" +
    "<select id='nmTipo'>" +
    "<option value='Excavadora'>Excavadora</option>" +
    "<option value='Retroexcavadora'>Retroexcavadora</option>" +
    "<option value='Telehandler'>Telehandler</option>" +
    "<option value='Montacargas'>Montacargas</option>" +
    "<option value='Compactadora'>Compactadora</option>" +
    "<option value='Generador'>Generador</option>" +
    "<option value='Otro'>Otro</option>" +
    "</select>" +
    "<input type='text' id='nmPlaca' placeholder='Placa o número de serie'>" +
    "<input type='text' id='nmObs' placeholder='Observaciones (opcional)'>" +
    "<div id='nmMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarNuevaMaquina()'>💾 Agregar</button>" +
    "<button class='btn b-sec' onclick='cancelarFormMaq()'>Cancelar</button>" +
    "</div></div>";
}

function guardarNuevaMaquina() {
  var btn = _botonDelEvento();
  var nombre = (document.getElementById("nmNombre")||{value:""}).value.trim();
  var tipo   = (document.getElementById("nmTipo")||{value:"Excavadora"}).value;
  var placa  = (document.getElementById("nmPlaca")||{value:""}).value.trim();
  var obs    = (document.getElementById("nmObs")||{value:""}).value.trim();
  var msg    = document.getElementById("nmMsg");
  if(!nombre){ if(msg)msg.innerHTML="<div class='msg-err'>El nombre es requerido</div>"; return; }
  if(!_bloquearBoton(btn, "guardarNuevaMaquina")) return;
  gasPost("agregarMaquina",{nombre:nombre,tipo:tipo,placa:placa,observaciones:obs}).then(function(r){
    _liberarBoton(btn, "guardarNuevaMaquina");
    if(r&&r.ok){
      cancelarFormMaq();
      if(msg)msg.innerHTML="<div class='msg-ok'>✅ Máquina agregada: "+r.codigo+"</div>";
      cargarMaquinasAdmin();
      // Recargar selector de horómetro
      horCargarMaquinas();
    } else { if(msg)msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "guardarNuevaMaquina"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function cancelarFormMaq() {
  var f = document.getElementById("maqForm");
  if(f) f.innerHTML="";
}
