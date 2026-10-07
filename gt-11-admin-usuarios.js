// ══════════════════════════════════════════════
// GESTIÓN DE USUARIOS (solo Admin)
// ══════════════════════════════════════════════
function abrirGestionUsuarios() {
  toggleMenuMas();
  if((SESION.rol||"").toLowerCase()!=="admin"){ alert("Solo un Admin puede gestionar usuarios."); return; }
  // Ocultar pestañas y mostrar pantalla de gestión
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("gestionUsuariosScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  cargarUsuarios();
}

function cargarUsuarios() {
  var div = document.getElementById("usuariosLista");
  if(!div) return;
  div.innerHTML = "<div class='loading'>Cargando usuarios...</div>";
  sheetsGet(SHEET("Usuarios")+"!A2:E").then(function(r){
    var rows = r.values || [];
    if(!rows.length){ div.innerHTML="<p style='text-align:center;color:#888;padding:20px'>No hay usuarios registrados</p>"; return; }
    var html2 = "";
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(!row[0]) continue;
      var activo=(row[3]||"").toLowerCase()==="si";
      var rol=row[4]||"Operador";
      var usuario=row[0]; var nombre=row[1]||row[0];
      html2 += "<div class='card' style='margin-bottom:8px;padding:10px'>";
      html2 += "<div style='display:flex;justify-content:space-between;align-items:center'>";
      var badgeRol = rol==="Admin" ? "bh" : (rol==="Supervisor" ? "bm" : "bi");
      html2 += "<div><b>"+nombre+"</b> <span class='badge "+badgeRol+"'>"+rol+"</span></div>";
      html2 += "<span style='font-size:11px;color:"+(activo?"#375623":"#C00000")+"'>"+(activo?"Activo":"Inactivo")+"</span>";
      html2 += "</div>";
      html2 += "<div style='font-size:11px;color:#888;margin-top:2px'>@"+usuario+"</div>";
      html2 += "<div style='margin-top:8px;display:flex;gap:6px;flex-wrap:wrap'>";
      html2 += "<button class='btn b-blue b-sm' onclick='editarUsuarioForm(this)' data-u='"+usuario+"' data-n='"+nombre+"' data-r='"+rol+"' data-a='"+activo+"'>Editar</button>";
      html2 += "<button class='btn b-warn b-sm' onclick='resetPinForm(this)' data-u='"+usuario+"'>Cambiar PIN</button>";
      html2 += "<button class='btn "+(activo?"b-sec":"b-ok")+" b-sm' onclick='toggleActivoUsuario(this)' data-u='"+usuario+"' data-a='"+activo+"'>"+(activo?"Desactivar":"Activar")+"</button>";
      html2 += "</div></div>";
    }
    div.innerHTML = html2;
  }).catch(function(e){ div.innerHTML="<div class='msg-err'>Error: "+e.message+"</div>"; });
}

function editarUsuarioFormBtn(btn) {
  editarUsuarioForm(btn.getAttribute("data-u"),btn.getAttribute("data-n"),btn.getAttribute("data-r"),btn.getAttribute("data-a")==="true");
}

function editarUsuarioForm(btn_or_usuario, nombre, rol, activo) {
  var usuario = typeof btn_or_usuario === "string" ? btn_or_usuario : btn_or_usuario.getAttribute("data-u");
  nombre = nombre || (typeof btn_or_usuario === "object" ? btn_or_usuario.getAttribute("data-n") : "");
  rol = rol || (typeof btn_or_usuario === "object" ? btn_or_usuario.getAttribute("data-r") : "Operador");
  activo = activo !== undefined ? activo : (typeof btn_or_usuario === "object" ? btn_or_usuario.getAttribute("data-a")==="true" : false);
  var formDiv = document.getElementById("usuarioFormContainer");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>✏️ Editar usuario: @"+usuario+"</div>" +
    "<input type='text' id='euNombre' placeholder='Nombre completo' value='"+nombre+"'>" +
    "<select id='euRol'><option value='Operador'"+(rol==="Operador"?" selected":"")+">Operador</option><option value='Supervisor'"+(rol==="Supervisor"?" selected":"")+">Supervisor</option><option value='Admin'"+(rol==="Admin"?" selected":"")+">Admin</option><option value='Solo lectura'"+(rol==="Solo lectura"?" selected":"")+">Solo lectura</option></select>" +
    "<div id='euMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarEdicionUsuario(\""+usuario+"\")'>💾 Guardar</button>" +
    "<button class='btn b-sec' onclick='cancelarFormUsuario()'>Cancelar</button>" +
    "</div></div>";
}

function guardarEdicionUsuario(usuario) {
  var btn = _botonDelEvento();
  var nombre = (document.getElementById("euNombre")||{value:""}).value.trim();
  var rol    = (document.getElementById("euRol")||{value:"Operador"}).value;
  var msg    = document.getElementById("euMsg");
  if(!nombre){ if(msg)msg.innerHTML="<div class='msg-err'>El nombre es requerido</div>"; return; }
  if(!_bloquearBoton(btn, "guardarEdicionUsuario")) return;
  gasPost("editarUsuario",{usuario:usuario,nombre:nombre,rol:rol}).then(function(r){
    _liberarBoton(btn, "guardarEdicionUsuario");
    if(r&&r.ok){ cancelarFormUsuario(); cargarUsuarios(); }
    else { if(msg)msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "guardarEdicionUsuario"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function resetPinForm(btn_or_usuario) {
  var usuario = typeof btn_or_usuario === "string" ? btn_or_usuario : btn_or_usuario.getAttribute("data-u");
  var formDiv = document.getElementById("usuarioFormContainer");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>🔑 Cambiar PIN: @"+usuario+"</div>" +
    "<input type='password' id='nuevoPin' placeholder='Nuevo PIN (solo números)' inputmode='numeric'>" +
    "<input type='password' id='confirmarPin' placeholder='Confirmar PIN'>" +
    "<div id='pinMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarNuevoPin(\""+usuario+"\")'>💾 Cambiar PIN</button>" +
    "<button class='btn b-sec' onclick='cancelarFormUsuario()'>Cancelar</button>" +
    "</div></div>";
}

function guardarNuevoPin(usuario) {
  var btn = _botonDelEvento();
  var pin1 = (document.getElementById("nuevoPin")||{value:""}).value.trim();
  var pin2 = (document.getElementById("confirmarPin")||{value:""}).value.trim();
  var msg  = document.getElementById("pinMsg");
  if(!pin1||pin1.length<4){ if(msg)msg.innerHTML="<div class='msg-err'>El PIN debe tener al menos 4 dígitos</div>"; return; }
  if(pin1!==pin2){ if(msg)msg.innerHTML="<div class='msg-err'>Los PIN no coinciden</div>"; return; }
  if(!_bloquearBoton(btn, "guardarNuevoPin")) return;
  gasPost("editarUsuario",{usuario:usuario,pin:pin1}).then(function(r){
    _liberarBoton(btn, "guardarNuevoPin");
    if(r&&r.ok){ cancelarFormUsuario(); alert("PIN actualizado correctamente"); }
    else{ if(msg)msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "guardarNuevoPin"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function toggleActivoUsuario(btn_or_usuario, estaActivo) {
  var btn = typeof btn_or_usuario === "string" ? null : btn_or_usuario;
  var usuario = typeof btn_or_usuario === "string" ? btn_or_usuario : btn_or_usuario.getAttribute("data-u");
  estaActivo = estaActivo !== undefined ? estaActivo : btn_or_usuario.getAttribute("data-a")==="true";
  if(!confirm((estaActivo?"Desactivar":"Activar")+" al usuario @"+usuario+"?")) return;
  if(!_bloquearBoton(btn, "toggleActivoUsuario")) return;
  gasPost("editarUsuario",{usuario:usuario,activo:!estaActivo}).then(function(r){
    _liberarBoton(btn, "toggleActivoUsuario");
    if(r&&r.ok) cargarUsuarios();
    else alert(r&&r.error||"Error");
  }).catch(function(e){ _liberarBoton(btn, "toggleActivoUsuario"); alert(e.message); });
}

function cancelarFormUsuario() {
  var f = document.getElementById("usuarioFormContainer");
  if(f) f.innerHTML="";
}

function nuevoUsuarioForm() {
  var formDiv = document.getElementById("usuarioFormContainer");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>➕ Nuevo usuario</div>" +
    "<input type='text' id='nuUser' placeholder='Nombre de usuario (ej: juan)'>" +
    "<input type='text' id='nuNombre' placeholder='Nombre completo'>" +
    "<input type='password' id='nuPin' placeholder='PIN (solo números)' inputmode='numeric'>" +
    "<select id='nuRol'><option value='Operador'>Operador</option><option value='Supervisor'>Supervisor</option><option value='Admin'>Admin</option><option value='Solo lectura'>Solo lectura</option></select>" +
    "<div id='nuMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarNuevoUsuario()'>💾 Crear usuario</button>" +
    "<button class='btn b-sec' onclick='cancelarFormUsuario()'>Cancelar</button>" +
    "</div></div>";
}

function guardarNuevoUsuario() {
  var btn = _botonDelEvento();
  var usuario = (document.getElementById("nuUser")||{value:""}).value.trim();
  var nombre  = (document.getElementById("nuNombre")||{value:""}).value.trim();
  var pin     = (document.getElementById("nuPin")||{value:""}).value.trim();
  var rol     = (document.getElementById("nuRol")||{value:"Operador"}).value;
  var msg     = document.getElementById("nuMsg");
  if(!usuario||!nombre||!pin){ if(msg)msg.innerHTML="<div class='msg-err'>Todos los campos son requeridos</div>"; return; }
  if(pin.length<4){ if(msg)msg.innerHTML="<div class='msg-err'>PIN mínimo 4 dígitos</div>"; return; }
  if(!_bloquearBoton(btn, "guardarNuevoUsuario")) return;
  gasPost("agregarUsuario",{usuario:usuario,nombre:nombre,pin:pin,rol:rol,activo:true}).then(function(r){
    _liberarBoton(btn, "guardarNuevoUsuario");
    if(r&&r.ok){ cancelarFormUsuario(); cargarUsuarios(); }
    else{ if(msg)msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "guardarNuevoUsuario"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}
