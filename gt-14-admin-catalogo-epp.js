// ══════════════════════════════════════════════
// CATÁLOGO DE EPP (solo Admin) — Pendiente 1 de la Especificación
// Técnica. Antes de esta pantalla, agregar o quitar un ítem de EPP
// (ej. un brazalete de seguridad) exigía reprogramar en varios
// lugares del index.html. Ahora es un alta común, como cualquier
// otro catálogo del sistema.
// ══════════════════════════════════════════════
function abrirGestionCatalogoEPP() {
  toggleMenuMas();
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("gestionCatalogoEPPScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  EPP_CATALOGO = null; // recargar por si se editó desde otra pestaña/sesión
  eppCargarCatalogo().then(cargarCatalogoEPPAdmin);
}

var EP_TIPO_ETIQUETAS = {
  devuelve: "Se entrega y se devuelve (ej. Casco)",
  unico: "Se entrega una vez, no se devuelve (ej. Lentes)",
  acumulable: "Se pueden sumar varias entregas (ej. Camisa)",
  reincidente: "Cambios repetidos con motivo (ej. Guantes)"
};

function cargarCatalogoEPPAdmin() {
  var div = document.getElementById("epLista");
  if(!div) return;
  var todos = (EPP_CATALOGO||[]).slice().sort(function(a,b){return a.orden-b.orden;});
  if(!todos.length){ div.innerHTML="<div class='empty'><div class='ei'>🦺</div><p>No hay ítems en el catálogo</p></div>"; return; }
  div.innerHTML = todos.map(function(c){
    return "<div class='card' style='margin-bottom:7px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px'>" +
      "<div>" +
        "<b>"+c.icono+" "+esc(c.item)+"</b> " +
        "<span class='badge bm'>"+(c.activo?"Activo":"Inactivo")+"</span>" +
        "<div style='font-size:11px;color:#888;margin-top:3px'>"+(EP_TIPO_ETIQUETAS[c.tipo]||c.tipo)+(c.requiereTalla?" · pide talla":"")+"</div>" +
      "</div>" +
      "<div style='display:flex;flex-direction:column;gap:4px'>" +
        "<button class='btn b-blue b-sm' onclick='editarItemEPPForm(\""+escJS(c.item)+"\")'>✏️ Editar</button>" +
        "<button class='btn b-sec b-sm' onclick='toggleActivoItemEPP(\""+escJS(c.item)+"\","+(c.activo?"false":"true")+")'>"+(c.activo?"Desactivar":"Activar")+"</button>" +
      "</div>" +
    "</div>";
  }).join("");
}

function nuevoItemEPPForm() {
  var formDiv = document.getElementById("epFormCat");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>➕ Agregar ítem de EPP</div>" +
    "<input type='text' id='epNombre' placeholder='Nombre del ítem (ej. Brazalete de seguridad) *'>" +
    "<input type='text' id='epIcono' placeholder='Ícono/emoji (opcional, ej. 🟠)' maxlength='4'>" +
    "<select id='epTipo'>" +
    "<option value='unico'>"+EP_TIPO_ETIQUETAS.unico+"</option>" +
    "<option value='devuelve'>"+EP_TIPO_ETIQUETAS.devuelve+"</option>" +
    "<option value='acumulable'>"+EP_TIPO_ETIQUETAS.acumulable+"</option>" +
    "<option value='reincidente'>"+EP_TIPO_ETIQUETAS.reincidente+"</option>" +
    "</select>" +
    "<label style='display:flex;align-items:center;gap:6px;font-size:13px;margin:6px 0'>" +
    "<input type='checkbox' id='epRequiereTalla' style='width:auto'> Este ítem pide talla al entregarlo" +
    "</label>" +
    "<div id='epMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarNuevoItemEPP()'>💾 Agregar</button>" +
    "<button class='btn b-sec' onclick='cancelarFormEPP()'>Cancelar</button>" +
    "</div></div>";
}

// editarItemEPPForm — permite cambiar el comportamiento (tipo) o si pide
// talla de un ítem YA existente. El nombre no se puede tocar acá porque
// es la clave que usa guardarItemEPPCatalogo para saber qué fila
// actualizar — cambiarlo crearía un ítem nuevo en vez de editar el actual.
function editarItemEPPForm(item) {
  var c = (EPP_CATALOGO||[]).find(function(x){return x.item===item;});
  if(!c) return;
  var formDiv = document.getElementById("epFormCat");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>✏️ Editar: "+esc(c.icono)+" "+esc(c.item)+"</div>" +
    "<input type='text' value='"+esc(c.item)+"' disabled style='background:#f2f2f2;color:#888'>" +
    "<div style='font-size:10px;color:#888;margin:-4px 0 6px'>El nombre no se puede cambiar aquí — si necesitas renombrarlo, crea un ítem nuevo y desactiva este.</div>" +
    "<input type='text' id='epIconoEd' placeholder='Ícono/emoji' maxlength='4' value='"+esc(c.icono)+"'>" +
    "<select id='epTipoEd'>" +
    "<option value='unico'"+(c.tipo==="unico"?" selected":"")+">"+EP_TIPO_ETIQUETAS.unico+"</option>" +
    "<option value='devuelve'"+(c.tipo==="devuelve"?" selected":"")+">"+EP_TIPO_ETIQUETAS.devuelve+"</option>" +
    "<option value='acumulable'"+(c.tipo==="acumulable"?" selected":"")+">"+EP_TIPO_ETIQUETAS.acumulable+"</option>" +
    "<option value='reincidente'"+(c.tipo==="reincidente"?" selected":"")+">"+EP_TIPO_ETIQUETAS.reincidente+"</option>" +
    "</select>" +
    "<label style='display:flex;align-items:center;gap:6px;font-size:13px;margin:6px 0'>" +
    "<input type='checkbox' id='epRequiereTallaEd' style='width:auto'"+(c.requiereTalla?" checked":"")+"> Este ítem pide talla al entregarlo" +
    "</label>" +
    "<div style='font-size:10px;color:#888;margin-bottom:6px'>El cambio aplica hacia adelante — el historial de entregas ya registradas no se altera.</div>" +
    "<div id='epMsgEd'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarEdicionItemEPP(\""+escJS(c.item)+"\")'>💾 Guardar cambios</button>" +
    "<button class='btn b-sec' onclick='cancelarFormEPP()'>Cancelar</button>" +
    "</div></div>";
  formDiv.scrollIntoView({behavior:"smooth"});
}

function guardarEdicionItemEPP(item) {
  var btn = _botonDelEvento();
  var c = (EPP_CATALOGO||[]).find(function(x){return x.item===item;});
  if(!c) return;
  var icono = (document.getElementById("epIconoEd")||{value:""}).value.trim() || "🦺";
  var tipo  = (document.getElementById("epTipoEd")||{value:"unico"}).value;
  var talla = (document.getElementById("epRequiereTallaEd")||{checked:false}).checked;
  var msg   = document.getElementById("epMsgEd");
  if(!_bloquearBoton(btn, "guardarEdicionItemEPP")) return;
  gasPost("guardarItemEPPCatalogo",{item:item, icono:icono, tipo:tipo, requiereTalla:talla, activo:c.activo, orden:c.orden}).then(function(r){
    _liberarBoton(btn, "guardarEdicionItemEPP");
    if(r&&r.ok){
      cancelarFormEPP();
      EPP_CATALOGO = null;
      eppCargarCatalogo().then(cargarCatalogoEPPAdmin);
    } else if(msg){
      msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){ _liberarBoton(btn, "guardarEdicionItemEPP"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function guardarNuevoItemEPP() {
  var btn = _botonDelEvento();
  var nombre = (document.getElementById("epNombre")||{value:""}).value.trim();
  var icono  = (document.getElementById("epIcono")||{value:""}).value.trim() || "🦺";
  var tipo   = (document.getElementById("epTipo")||{value:"unico"}).value;
  var talla  = (document.getElementById("epRequiereTalla")||{checked:false}).checked;
  var msg    = document.getElementById("epMsg");
  if(!nombre){ if(msg)msg.innerHTML="<div class='msg-err'>El nombre es requerido</div>"; return; }
  if((EPP_CATALOGO||[]).some(function(c){return c.item.toLowerCase()===nombre.toLowerCase();})){
    if(msg)msg.innerHTML="<div class='msg-err'>Ya existe un ítem de EPP con ese nombre</div>"; return;
  }
  if(!_bloquearBoton(btn, "guardarNuevoItemEPP")) return;
  gasPost("guardarItemEPPCatalogo",{item:nombre, icono:icono, tipo:tipo, requiereTalla:talla, activo:true}).then(function(r){
    _liberarBoton(btn, "guardarNuevoItemEPP");
    if(r&&r.ok){
      cancelarFormEPP();
      EPP_CATALOGO = null;
      eppCargarCatalogo().then(cargarCatalogoEPPAdmin);
    } else if(msg){
      msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){ _liberarBoton(btn, "guardarNuevoItemEPP"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function toggleActivoItemEPP(item, nuevoActivo) {
  var actual = (EPP_CATALOGO||[]).find(function(c){return c.item===item;});
  if(!actual) return;
  if(!confirm((nuevoActivo?"¿Activar ":"¿Desactivar ")+item+"?"+(nuevoActivo?"":"\n\nDejará de aparecer en Control de EPP, pero su historial no se pierde."))) return;
  gasPost("guardarItemEPPCatalogo",{item:actual.item, icono:actual.icono, tipo:actual.tipo, requiereTalla:actual.requiereTalla, activo:nuevoActivo, orden:actual.orden}).then(function(r){
    if(r&&r.ok){
      EPP_CATALOGO = null;
      eppCargarCatalogo().then(cargarCatalogoEPPAdmin);
    } else {
      alert("❌ "+(r&&r.error||"No se pudo actualizar"));
    }
  }).catch(function(e){ alert("❌ "+e.message); });
}

function cancelarFormEPP() {
  var f = document.getElementById("epFormCat");
  if(f) f.innerHTML="";
}
