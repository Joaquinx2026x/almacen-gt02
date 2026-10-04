// ══════════════════════════════════════════════
// GESTIÓN DE TRABAJADORES (solo Admin)
// ══════════════════════════════════════════════
function abrirGestionTrabajadores() {
  toggleMenuMas();
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("gestionTrabajadoresScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  cargarTrabajadoresAdmin();
}

var TRAB_ROWS_CACHE = [];

function cargarTrabajadoresAdmin() {
  var div = document.getElementById("trabLista");
  if(!div) return;
  div.innerHTML = "<div class='loading'>🔄 Cargando...</div>";
  sheetsGet(SHEET("Personal")+"!A2:N").then(function(r){
    var rows = (r.values||[]).filter(function(row){ return row[0]; });
    TRAB_ROWS_CACHE = rows;
    if(!rows.length){ div.innerHTML="<div class='empty'><div class='ei'>👷</div><p>No hay trabajadores</p></div>"; return; }
    TRAB_CACHE = {};
    rows.forEach(function(row){
      TRAB_CACHE[row[0]] = {
        codigo:row[0], nombre:row[1]||"", cargo:row[2]||"", especialidad:row[3]||"",
        telefono:row[4]||"", estado:row[6]||"Activo", dui:row[7]||"", observaciones:row[8]||"",
        fotoId:row[9]||"", vigenciaHasta:row[10]||"",
        tallaCamisa:row[11]||"", tallaZapato:row[12]||"", alergias:row[13]||""
      };
    });
    trabRenderLista(rows);
  }).catch(function(e){ div.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function trabFiltrarLista(){
  var q = (document.getElementById("trabBuscar")||{value:""}).value.toLowerCase().trim();
  var filtradas = !q ? TRAB_ROWS_CACHE : TRAB_ROWS_CACHE.filter(function(row){
    var nombre = (row[1]||"").toString().toLowerCase();
    var codigo = (row[0]||"").toString().toLowerCase();
    return nombre.indexOf(q)>=0 || codigo.indexOf(q)>=0;
  });
  trabRenderLista(filtradas, !!q);
}

function trabRenderLista(rows, esBusqueda){
  var div = document.getElementById("trabLista");
  if(!div) return;
  if(!rows.length){ div.innerHTML="<div class='empty'><div class='ei'>👷</div><p>Sin resultados</p></div>"; return; }
  var limite = esBusqueda ? rows.length : 30;
  div.innerHTML = rows.slice(0,limite).map(function(row){
    var activo = (row[6]||"Activo").toString().toLowerCase()==="activo";
    var codigo=row[0], nombre=row[1]||"[Sin nombre]", cargo=row[2]||"", fotoId=row[9]||"";
    var miniatura = fotoId
      ? "<img src='"+urlFotoDrive(fotoId,80)+"' style='width:38px;height:38px;border-radius:8px;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
      : "<div style='width:38px;height:38px;border-radius:8px;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0'>👤</div>";
    return "<div class='card' style='margin-bottom:7px;padding:10px'>" +
      "<div style='display:flex;gap:8px;justify-content:space-between'>" +
      "<div style='display:flex;gap:8px;align-items:center'>"+miniatura+
      "<div><b style='font-size:13px'>"+nombre+"</b>" +
      "<div style='font-size:11px;color:#888;margin-top:2px'>"+codigo+" · "+(cargo||"—")+"</div></div></div>" +
      "<span style='font-size:11px;color:"+(activo?"#375623":"#888")+"'>"+(activo?"✅":"⏸")+"</span>" +
      "</div>" +
      "<div style='margin-top:8px;display:flex;gap:6px;flex-wrap:wrap'>" +
      "<button class='btn b-blue b-sm' onclick='editarTrabajadorForm(\""+escJS(codigo)+"\")'>Editar</button>" +
      "<button class='btn "+(activo?"b-sec":"b-ok")+" b-sm' onclick='toggleActivoTrabajador(this)' data-c='"+codigo+"' data-a='"+activo+"'>"+(activo?"Desactivar":"Activar")+"</button>" +
      "</div>" +
      "</div>";
  }).join("") + (!esBusqueda && rows.length>30?"<div style='text-align:center;font-size:11px;color:#888;padding:8px'>Mostrando primeros 30 de "+rows.length+" — usa el buscador para encontrar a alguien específico</div>":"");
}

function nuevoTrabajadorForm() {
  var formDiv = document.getElementById("trabForm");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>➕ Agregar trabajador</div>" +
    "<input type='text' id='ntNombre' placeholder='Nombre completo *'>" +
    "<input type='text' id='ntCargo' placeholder='Cargo (ej: Técnico)'>" +
    "<input type='text' id='ntTel' placeholder='Teléfono'>" +
    "<input type='text' id='ntDui' placeholder='Número de DUI/DPI'>" +
    "<div style='display:flex;gap:8px'>" +
    "<input type='text' id='ntTallaCamisa' placeholder='Talla de camisa' style='flex:1'>" +
    "<input type='text' id='ntTallaZapato' placeholder='Talla de zapato' style='flex:1'>" +
    "</div>" +
    "<div id='ntMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarNuevoTrabajador()'>💾 Agregar</button>" +
    "<button class='btn b-sec' onclick='cancelarFormTrab()'>Cancelar</button>" +
    "</div></div>";
}

var TRAB_CACHE = {};

function editarTrabajadorForm(codigo) {
  var t = TRAB_CACHE[codigo];
  if(!t) return;
  var formDiv = document.getElementById("trabForm");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>✏️ Editar trabajador: "+codigo+"</div>" +
    "<div style='display:flex;gap:10px;align-items:center;margin-bottom:10px'>" +
      "<div id='etFotoPrev' style='width:56px;height:56px;border-radius:10px;flex-shrink:0;background:#D8F3DC;display:flex;align-items:center;justify-content:center;overflow:hidden'>" +
        (t.fotoId ? "<img src='"+urlFotoDrive(t.fotoId,120)+"' style='width:100%;height:100%;object-fit:cover'>" : "<span style='font-size:22px'>👤</span>") +
      "</div>" +
      "<div style='flex:1;display:flex;flex-direction:column;gap:5px'>" +
        "<input type='file' accept='image/*' capture='user' id='etFotoInputCam' style='display:none' onchange='subirFotoTrabajador(\""+esc(codigo)+"\",this)'>" +
        "<input type='file' accept='image/*' id='etFotoInputGal' style='display:none' onchange='subirFotoTrabajador(\""+esc(codigo)+"\",this)'>" +
        "<div style='display:flex;gap:5px'>" +
          "<button type='button' class='btn b-sec b-sm' style='flex:1' onclick=\"document.getElementById('etFotoInputCam').click()\">📷 Tomar foto</button>" +
          "<button type='button' class='btn b-sec b-sm' style='flex:1' onclick=\"document.getElementById('etFotoInputGal').click()\">🖼️ Galería</button>" +
        "</div>" +
        "<div id='etFotoMsg' style='font-size:11px'></div>" +
      "</div>" +
    "</div>" +
    "<input type='text' id='etNombre' placeholder='Nombre completo' value=\""+esc(t.nombre)+"\">" +
    "<input type='text' id='etCargo' placeholder='Cargo (ej: Técnico)' value=\""+esc(t.cargo)+"\">" +
    "<input type='text' id='etEspecialidad' placeholder='Especialidad' value=\""+esc(t.especialidad)+"\">" +
    "<input type='text' id='etTel' placeholder='Teléfono' value=\""+esc(t.telefono)+"\">" +
    "<input type='text' id='etDui' placeholder='Número de DUI/DPI' value=\""+esc(t.dui)+"\">" +
    "<div style='display:flex;gap:8px'>" +
    "<input type='text' id='etTallaCamisa' placeholder='Talla de camisa' value=\""+esc(t.tallaCamisa)+"\" style='flex:1'>" +
    "<input type='text' id='etTallaZapato' placeholder='Talla de zapato' value=\""+esc(t.tallaZapato)+"\" style='flex:1'>" +
    "</div>" +
    "<textarea id='etAlergias' placeholder='Alergias / notas de salud (ej: alérgico a acetaminofén)' style='min-height:50px'>"+escTexto(t.alergias)+"</textarea>" +
    "<select id='etEstado'>" +
      "<option value='Activo'"+(t.estado==="Activo"?" selected":"")+">Activo</option>"+
      "<option value='Inactivo'"+(t.estado==="Inactivo"?" selected":"")+">Inactivo</option>"+
    "</select>" +
    "<label style='display:block;font-size:11px;color:#888;margin-top:6px'>Vigencia del carnet (opcional — en blanco = mientras dure el proyecto)</label>" +
    "<input type='date' id='etVigencia' value=\""+esc(t.vigenciaHasta)+"\">" +
    "<input type='text' id='etObs' placeholder='Observaciones' value=\""+esc(t.observaciones)+"\">" +
    "<div id='etMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarEdicionTrabajador(\""+escJS(codigo)+"\")'>💾 Guardar</button>" +
    "<button class='btn b-sec' onclick='cancelarFormTrab()'>Cancelar</button>" +
    "</div></div>";
  formDiv.scrollIntoView({behavior:"smooth"});
}

var CARNET_LISTA = [];

var CARNET_IDX = 0;

var QR_CACHE_CARNET = {};

var FOTO_CACHE_CARNET = {};

function abrirCarnetViewer(){
  CARNET_LISTA = Object.keys(TRAB_CACHE).map(function(k){ return TRAB_CACHE[k]; })
    .sort(function(a,b){
      var ma = (a.codigo||"").match(/\d+/g);
      var mb = (b.codigo||"").match(/\d+/g);
      var na = ma ? parseInt(ma[ma.length-1], 10) : 0;
      var nb = mb ? parseInt(mb[mb.length-1], 10) : 0;
      return na - nb;
    });
  if(!CARNET_LISTA.length){ alert("No hay trabajadores cargados todavía."); return; }
  CARNET_IDX = 0;
  var v = document.getElementById("carnetViewer");
  v.style.display="block";
  carnetMostrar();
  v.scrollIntoView({behavior:"smooth", block:"start"});
}

function cerrarCarnetViewer(){
  var v = document.getElementById("carnetViewer");
  if(v) v.style.display="none";
}

function carnetMostrar(){
  var t = CARNET_LISTA[CARNET_IDX];
  if(!t) return;
  document.getElementById("carnetHdrEmpresa").textContent = CONFIG.empresa;
  document.getElementById("carnetHdrProyecto").textContent = "Proyecto "+CONFIG.codigoProyecto+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal;
  var logoDiv = document.getElementById("carnetLogo");
  if(logoDiv) logoDiv.innerHTML = CONFIG.logoBase64 ? "<img src='"+CONFIG.logoBase64+"' style='width:100%;height:100%;object-fit:contain'>" : "";
  document.getElementById("carnetNombre").textContent = t.nombre || "(sin nombre)";
  document.getElementById("carnetCargo").textContent = t.cargo || "—";
  document.getElementById("carnetCorrelativo").textContent = t.codigo.replace(CONFIG.prefijoTrabajador+"-","");
  document.getElementById("carnetContador").textContent = (CARNET_IDX+1)+" de "+CARNET_LISTA.length;
  var vigDiv = document.getElementById("carnetVigencia");
  if(t.estado === "Inactivo"){
    vigDiv.textContent = "⚠ Vigencia finalizada";
    vigDiv.style.color = "#C00000";
  } else if(t.vigenciaHasta){
    var f = new Date(t.vigenciaHasta+"T00:00:00");
    vigDiv.textContent = "Vigente hasta " + (isNaN(f) ? t.vigenciaHasta : f.toLocaleDateString("es-GT"));
    vigDiv.style.color = "#2D6A4F";
  } else {
    vigDiv.textContent = "Vigente mientras dure el proyecto";
    vigDiv.style.color = "#2D6A4F";
  }
  document.getElementById("carnetLeyenda").textContent = CONFIG.leyendaCarnet;
  var fotoDiv = document.getElementById("carnetFoto");
  if(!t.fotoId){
    fotoDiv.innerHTML = "<span style='font-size:34px'>👤</span>";
  } else if(FOTO_CACHE_CARNET[t.fotoId]){
    // Ya se cargó antes en esta sesión — se muestra al instante, sin parpadeo.
    fotoDiv.innerHTML = "<img src='"+urlFotoDrive(t.fotoId,200)+"' style='width:100%;height:100%;object-fit:cover'>";
  } else {
    // Precarga en segundo plano: la foto anterior se queda visible hasta
    // que la nueva esté completamente lista, así nunca se ve un espacio
    // en blanco ni un parpadeo mientras descarga.
    var img = new Image();
    img.onload = function(){
      FOTO_CACHE_CARNET[t.fotoId] = true;
      if(CARNET_LISTA[CARNET_IDX]!==t) return; // el usuario ya avanzó a otro mientras cargaba
      fotoDiv.innerHTML = "";
      img.style.width="100%"; img.style.height="100%"; img.style.objectFit="cover";
      fotoDiv.appendChild(img);
    };
    img.onerror = function(){
      if(CARNET_LISTA[CARNET_IDX]!==t) return;
      fotoDiv.innerHTML = "<span style='font-size:34px'>👤</span>";
    };
    img.src = urlFotoDrive(t.fotoId,200);
  }
  var qrDiv = document.getElementById("carnetQR");
  if(t.dui){
    if(QR_CACHE_CARNET[t.codigo]){
      // Ya se generó antes en esta sesión — se muestra al instante, sin parpadeo.
      qrDiv.innerHTML = "<img src='"+QR_CACHE_CARNET[t.codigo]+"' style='width:110px;height:110px'>";
    } else {
      qrDiv.innerHTML="<div style='font-size:11px;color:#888'>Generando QR...</div>";
      var duiFmt = qrFormatDui(t.dui);
      qrGenerarQRDataURL(duiFmt,180).then(function(url){
        QR_CACHE_CARNET[t.codigo] = url;
        if(CARNET_LISTA[CARNET_IDX]!==t) return; // el usuario ya avanzó a otro mientras cargaba
        qrDiv.innerHTML = "<img src='"+url+"' style='width:110px;height:110px'>";
      });
    }
  } else {
    qrDiv.innerHTML = "<div style='font-size:11px;color:#C00000;padding:0 10px'>⚠️ Sin DUI/DPI registrado — no se puede generar el QR</div>";
  }
}

function carnetSiguiente(){ CARNET_IDX=(CARNET_IDX+1)%CARNET_LISTA.length; carnetMostrar(); }

function carnetAnterior(){ CARNET_IDX=(CARNET_IDX-1+CARNET_LISTA.length)%CARNET_LISTA.length; carnetMostrar(); }

function carnetPrimero(){ CARNET_IDX=0; carnetMostrar(); }

function carnetUltimo(){ CARNET_IDX=CARNET_LISTA.length-1; carnetMostrar(); }

function carnetEditarActual(){
  var t = CARNET_LISTA[CARNET_IDX];
  if(!t) return;
  cerrarCarnetViewer();
  editarTrabajadorForm(t.codigo);
}

function subirFotoTrabajador(codigo, inputEl) {
  var file = inputEl.files && inputEl.files[0];
  if(!file) return;
  abrirRecortadorFoto(file, function(r){
    var msg = document.getElementById("etFotoMsg");
    var prev = document.getElementById("etFotoPrev");
    if(prev) prev.innerHTML = "<img src='"+r.dataUrl+"' style='width:100%;height:100%;object-fit:cover'>";
    if(msg) msg.innerHTML = "🔄 Subiendo foto...";
    gasPostBody("subirFoto", {tipo:"trabajador", codigo:codigo, base64:r.base64, mimeType:r.mimeType}).then(function(res){
      if(res && res.ok){
        if(msg) msg.innerHTML = "<span style='color:#375623'>✅ Foto guardada</span>";
        if(TRAB_CACHE[codigo]) TRAB_CACHE[codigo].fotoId = res.fileId;
      } else {
        if(msg) msg.innerHTML = "<span style='color:#C00000'>❌ "+(res&&res.error||"Error al subir")+"</span>";
      }
    }).catch(function(e){
      if(msg) msg.innerHTML = "<span style='color:#C00000'>❌ "+e.message+"</span>";
    });
  }, "Centra el rostro dentro del círculo");
}

function guardarEdicionTrabajador(codigo) {
  var btn = _botonDelEvento();
  var nombre = (document.getElementById("etNombre")||{value:""}).value.trim();
  var cargo  = (document.getElementById("etCargo")||{value:""}).value.trim();
  var espec  = (document.getElementById("etEspecialidad")||{value:""}).value.trim();
  var tel    = (document.getElementById("etTel")||{value:""}).value.trim();
  var dui    = (document.getElementById("etDui")||{value:""}).value.trim();
  var estado = (document.getElementById("etEstado")||{value:""}).value;
  var vigencia = (document.getElementById("etVigencia")||{value:""}).value;
  var obs    = (document.getElementById("etObs")||{value:""}).value.trim();
  var tallaCamisa = (document.getElementById("etTallaCamisa")||{value:""}).value.trim();
  var tallaZapato = (document.getElementById("etTallaZapato")||{value:""}).value.trim();
  var alergias    = (document.getElementById("etAlergias")||{value:""}).value.trim();
  var msg    = document.getElementById("etMsg");
  if(!nombre){ if(msg)msg.innerHTML="<div class='msg-err'>El nombre es requerido</div>"; return; }
  if(!_bloquearBoton(btn, "guardarEdicionTrabajador")) return;
  gasPost("editarTrabajador",{codigo:codigo,nombre:nombre,cargo:cargo,especialidad:espec,telefono:tel,dui:dui,estado:estado,vigenciaHasta:vigencia,observaciones:obs,tallaCamisa:tallaCamisa,tallaZapato:tallaZapato,alergias:alergias}).then(function(r){
    _liberarBoton(btn, "guardarEdicionTrabajador");
    if(r&&r.ok){ cancelarFormTrab(); cargarTrabajadoresAdmin(); }
    else { if(msg)msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "guardarEdicionTrabajador"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function toggleActivoTrabajador(btn) {
  var codigo=btn.getAttribute("data-c"), estaActivo=btn.getAttribute("data-a")==="true";
  if(!confirm((estaActivo?"Desactivar":"Activar")+" al trabajador "+codigo+"?")) return;
  if(!_bloquearBoton(btn, "toggleActivoTrabajador")) return;
  gasPost("editarTrabajador",{codigo:codigo,estado:estaActivo?"Inactivo":"Activo"}).then(function(r){
    _liberarBoton(btn, "toggleActivoTrabajador");
    if(r&&r.ok) cargarTrabajadoresAdmin();
    else alert(r&&r.error||"Error");
  }).catch(function(e){ _liberarBoton(btn, "toggleActivoTrabajador"); alert(e.message); });
}

function guardarNuevoTrabajador() {
  var btn = _botonDelEvento();
  var nombre = (document.getElementById("ntNombre")||{value:""}).value.trim();
  var cargo  = (document.getElementById("ntCargo")||{value:""}).value.trim();
  var tel    = (document.getElementById("ntTel")||{value:""}).value.trim();
  var dui    = (document.getElementById("ntDui")||{value:""}).value.trim();
  var tallaCamisa = (document.getElementById("ntTallaCamisa")||{value:""}).value.trim();
  var tallaZapato = (document.getElementById("ntTallaZapato")||{value:""}).value.trim();
  var msg    = document.getElementById("ntMsg");
  if(!nombre){ if(msg)msg.innerHTML="<div class='msg-err'>El nombre es requerido</div>"; return; }
  if(!_bloquearBoton(btn, "guardarNuevoTrabajador")) return;
  gasPost("agregarTrabajador",{nombre:nombre,cargo:cargo,telefono:tel,dui:dui,tallaCamisa:tallaCamisa,tallaZapato:tallaZapato}).then(function(r){
    _liberarBoton(btn, "guardarNuevoTrabajador");
    if(r&&r.ok){
      cancelarFormTrab();
      cargarTrabajadoresAdmin();
      var codigoNuevo = r.codigo;
      setTimeout(function(){
        if(confirm("✅ Trabajador agregado: "+codigoNuevo+"\n\n¿Agregar su foto ahora?")) {
          editarTrabajadorForm(codigoNuevo);
        }
      }, 300);
    } else { if(msg)msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "guardarNuevoTrabajador"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function cancelarFormTrab() {
  var f = document.getElementById("trabForm");
  if(f) f.innerHTML="";
}
