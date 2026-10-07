// ══════════════════════════════════════════════
//  MÓDULO ARMADO DE PERNOS — independiente del resto de la app,
//  igual patrón que el Horómetro. Guarda en su propia hoja
//  (Armado_Pernos) sin tocar Inventario ni Personal.
// ══════════════════════════════════════════════
var AP_PERNO_SEL = null;

var AP_TRAB_SEL = null;

var AP_ARMADOS_CACHE = null; // se llena la primera vez que se abre "Resumen"

function abrirArmadoPernos(){
  navLimpiarTodo(); // cierra cualquier otra pantalla/módulo antes de abrir este
  document.getElementById("menuMas").style.display="none";
  document.querySelector(".tabs").style.display="none";
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display="none"; });
  document.getElementById("armadoPernosScreen").style.display="block";
  var fechaEl = document.getElementById("apFecha");
  if(fechaEl && !fechaEl.value) fechaEl.value = new Date().toISOString().slice(0,10);
  apGoTab(0);
}

function cerrarArmadoPernos(){
  document.getElementById("armadoPernosScreen").style.display="none";
  document.querySelector(".tabs").style.display="flex";
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display=""; });
  goTab(NAV_TAB_ACTUAL); // vuelve a la pestaña en la que estabas
}

function apGoTab(n){
  document.getElementById("apScrRegistrar").style.display = n===0 ? "block" : "none";
  document.getElementById("apScrResumen").style.display = n===1 ? "block" : "none";
  document.getElementById("apBtnRegistrar").className = "btn "+(n===0?"b-ok":"b-sec")+" b-sm";
  document.getElementById("apBtnResumen").className = "btn "+(n===1?"b-ok":"b-sec")+" b-sm";
  if(n===1){
    apRangoSemana();
    apCargarArmados(); // siempre al día
  }
}

// ── Paso 1: buscar y elegir el tipo de perno (desde Catalogo_Insumos) ──
var apTBuscaPerno;

function apBuscarPernos(){
  clearTimeout(apTBuscaPerno);
  var v = document.getElementById("apBuscarPerno").value.trim();
  var d = document.getElementById("apSugPerno");
  if(v.length<1){ d.style.display="none"; return; }
  apTBuscaPerno = setTimeout(function(){
    sheetsGet("Catalogo_Insumos!A2:C").then(function(resp){
      var rows = resp.values || [];
      var q = v.toLowerCase();
      var res = [];
      for(var i=0;i<rows.length && res.length<8;i++){
        var cod=(rows[i][0]||"").toString().trim();
        var desc=(rows[i][1]||"").toString().trim();
        if(!cod) continue;
        if(cod.toLowerCase().indexOf(q)>=0 || desc.toLowerCase().indexOf(q)>=0){
          res.push({codigo:cod, descripcion:desc});
        }
      }
      if(!res.length){ d.style.display="none"; return; }
      d.innerHTML = res.map(function(it){
        return "<div class=\'sug-item\' onclick=\'apSelPerno(\""+escJS(it.codigo)+"\",\""+escJS(it.descripcion)+"\")\'>"+
          "<div class=\'sug-nom\'>"+it.descripcion+"</div><div class=\'sug-cod\'>"+it.codigo+"</div></div>";
      }).join("");
      d.style.display="block";
    }).catch(function(){ d.style.display="none"; });
  },300);
}

function apSelPerno(codigo, descripcion){
  AP_PERNO_SEL = {codigo:codigo, descripcion:descripcion};
  document.getElementById("apSugPerno").style.display="none";
  document.getElementById("apBuscarPerno").value="";
  document.getElementById("apPernoSel").innerHTML =
    "<div class=\'card\' style=\'padding:8px;display:flex;justify-content:space-between;align-items:center\'>"+
    "<div><b>"+descripcion+"</b><div style=\'font-size:11px;color:#888\'>"+codigo+"</div></div>"+
    "<button class=\'btn b-sec b-sm\' onclick=\'apQuitarPerno()\'>✕</button></div>";
}

function apQuitarPerno(){ AP_PERNO_SEL=null; document.getElementById("apPernoSel").innerHTML=""; }

// ── Paso 2: buscar y elegir el trabajador (del plantel de Personal_GT02) ──
var apTBuscaTrab;

function apBuscarTrabajadores(){
  clearTimeout(apTBuscaTrab);
  var v = document.getElementById("apBuscarTrab").value.trim();
  var d = document.getElementById("apSugTrab");
  if(v.length<1){ d.style.display="none"; return; }
  apTBuscaTrab = setTimeout(function(){
    sheetsGet(SHEET("Personal")+"!A2:G").then(function(resp){
      var rows = resp.values || [];
      var q = v.toLowerCase();
      var res = [];
      for(var i=0;i<rows.length && res.length<8;i++){
        var cod=(rows[i][0]||"").toString().trim();
        var nom=(rows[i][1]||"").toString().trim();
        var activo=(rows[i][6]||"Activo").toString().toLowerCase()==="activo";
        if(!cod || !activo) continue;
        if(cod.toLowerCase().indexOf(q)>=0 || nom.toLowerCase().indexOf(q)>=0){
          res.push({codigo:cod, nombre:nom||cod});
        }
      }
      if(!res.length){ d.style.display="none"; return; }
      d.innerHTML = res.map(function(t){
        return "<div class=\'sug-item\' onclick=\'apSelTrab(\""+escJS(t.codigo)+"\",\""+escJS(t.nombre)+"\")\'>"+
          "<div class=\'sug-nom\'>"+t.nombre+"</div><div class=\'sug-cod\'>"+t.codigo+"</div></div>";
      }).join("");
      d.style.display="block";
    }).catch(function(){ d.style.display="none"; });
  },300);
}

function apSelTrab(codigo, nombre){
  AP_TRAB_SEL = {codigo:codigo, nombre:nombre};
  document.getElementById("apSugTrab").style.display="none";
  document.getElementById("apBuscarTrab").value="";
  document.getElementById("apTrabSel").innerHTML =
    "<div class=\'card\' style=\'padding:8px;display:flex;justify-content:space-between;align-items:center\'>"+
    "<div><b>"+nombre+"</b><div style=\'font-size:11px;color:#888\'>"+codigo+"</div></div>"+
    "<button class=\'btn b-sec b-sm\' onclick=\'apQuitarTrab()\'>✕</button></div>";
}

function apQuitarTrab(){ AP_TRAB_SEL=null; document.getElementById("apTrabSel").innerHTML=""; }

// ── Paso 3: registrar ──
function apRegistrar(){
  var btn = _botonDelEvento();
  var msg = document.getElementById("apMsg");
  msg.innerHTML="";
  if(!AP_PERNO_SEL){ msg.innerHTML="<div class=\'msg-err\'>Selecciona el tipo de perno</div>"; return; }
  if(!AP_TRAB_SEL){ msg.innerHTML="<div class=\'msg-err\'>Selecciona el trabajador</div>"; return; }
  var fecha = document.getElementById("apFecha").value;
  if(!fecha){ msg.innerHTML="<div class=\'msg-err\'>Selecciona la fecha del armado</div>"; return; }
  var cantidad = document.getElementById("apCantidad").value;
  if(!cantidad || Number(cantidad)<=0){ msg.innerHTML="<div class=\'msg-err\'>Escribe una cantidad válida</div>"; return; }
  if(!_bloquearBoton(btn, "apRegistrar")) return;
  var pieza = document.getElementById("apPieza").value.trim();
  var obs = document.getElementById("apObs").value.trim();

  msg.innerHTML="<div class=\'msg-ok\'>🔄 Guardando...</div>";
  gasPost("registrarArmado",{
    fecha: fecha,
    codigoPerno: AP_PERNO_SEL.codigo,
    descripcionPerno: AP_PERNO_SEL.descripcion,
    cantidad: cantidad,
    codigoTrabajador: AP_TRAB_SEL.codigo,
    nombreTrabajador: AP_TRAB_SEL.nombre,
    pieza: pieza,
    observaciones: obs,
    registradoPor: (SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    _liberarBoton(btn, "apRegistrar");
    if(r && r.ok){
      msg.innerHTML="<div class=\'msg-ok\'>✅ Armado registrado ("+fecha+")</div>";
      apQuitarPerno(); apQuitarTrab();
      document.getElementById("apCantidad").value="";
      document.getElementById("apPieza").value="";
      document.getElementById("apObs").value="";
      // La fecha NO se reinicia a propósito: si está registrando varios
      // armados del mismo día atrasado, no tiene que volver a elegirla cada vez.
      AP_ARMADOS_CACHE = null; // para que el resumen se recargue con el dato nuevo
      apPoblarFiltros();
      setTimeout(function(){ msg.innerHTML=""; },2500);
    } else {
      msg.innerHTML="<div class=\'msg-err\'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){
    _liberarBoton(btn, "apRegistrar");
    msg.innerHTML="<div class=\'msg-err\'>"+e.message+"</div>";
  });
}

// ── Resumen: totales por tipo y por trabajador, con filtro de fecha ──
function apCargarArmados(){
  document.getElementById("apResumenTipo").innerHTML="<div class=\'loading\'>🔄 Cargando...</div>";
  sheetsGet("Armado_Pernos!A2:I").then(function(resp){
    var rows = resp.values || [];
    AP_ARMADOS_CACHE = rows.map(function(r){
      return {
        fecha: r[0] ? new Date(r[0]) : null,
        codigoPerno: r[1]||"", descripcionPerno: r[2]||"",
        cantidad: Number(r[3])||0,
        codigoTrabajador: r[4]||"", nombreTrabajador: r[5]||""
      };
    }).filter(function(x){ return x.fecha; });
    apPoblarFiltros();
    apCalcularResumen();
  }).catch(function(){
    document.getElementById("apResumenTipo").innerHTML="<div class=\'msg-err\'>No se pudo cargar (¿ya registró al menos un armado?)</div>";
    document.getElementById("apResumenTrab").innerHTML="";
  });
}

// apPoblarFiltros — llena los dos desplegables (tipo / trabajador) con los
// valores que realmente existen en los registros, para poder aislar uno
// solo en vez de ver siempre todo junto.
function apPoblarFiltros(){
  if(!AP_ARMADOS_CACHE) return;
  var selTipo = document.getElementById("apFiltroTipo");
  var selTrab = document.getElementById("apFiltroTrab");
  var valorTipoActual = selTipo.value;
  var valorTrabActual = selTrab.value;

  var tipos = {}, trabs = {};
  AP_ARMADOS_CACHE.forEach(function(x){
    if(x.descripcionPerno) tipos[x.descripcionPerno]=true;
    if(x.nombreTrabajador) trabs[x.nombreTrabajador]=true;
  });

  selTipo.innerHTML = "<option value=\'\'>Todos los tipos de perno</option>" +
    Object.keys(tipos).sort().map(function(t){ return "<option value=\""+esc(t)+"\">"+t+"</option>"; }).join("");
  selTrab.innerHTML = "<option value=\'\'>Todos los trabajadores</option>" +
    Object.keys(trabs).sort().map(function(t){ return "<option value=\""+esc(t)+"\">"+t+"</option>"; }).join("");

  if(tipos[valorTipoActual]) selTipo.value = valorTipoActual;
  if(trabs[valorTrabActual]) selTrab.value = valorTrabActual;
}

function apRangoSemana(){
  var hoy = new Date();
  var diaSemana = (hoy.getDay()+6)%7; // lunes=0
  var lunes = new Date(hoy); lunes.setDate(hoy.getDate()-diaSemana);
  document.getElementById("apDesde").value = lunes.toISOString().slice(0,10);
  document.getElementById("apHasta").value = hoy.toISOString().slice(0,10);
  apCalcularResumen();
}

function apRangoTodo(){
  document.getElementById("apDesde").value="";
  document.getElementById("apHasta").value="";
  apCalcularResumen();
}

function apCalcularResumen(){
  if(!AP_ARMADOS_CACHE) return;
  var desdeVal = document.getElementById("apDesde").value;
  var hastaVal = document.getElementById("apHasta").value;
  var desde = desdeVal ? new Date(desdeVal+"T00:00:00") : null;
  var hasta = hastaVal ? new Date(hastaVal+"T23:59:59") : null;
  var tipoSel = document.getElementById("apFiltroTipo").value;
  var trabSel = document.getElementById("apFiltroTrab").value;
  var filtrados = AP_ARMADOS_CACHE.filter(function(x){
    if(desde && x.fecha < desde) return false;
    if(hasta && x.fecha > hasta) return false;
    if(tipoSel && x.descripcionPerno !== tipoSel) return false;
    if(trabSel && x.nombreTrabajador !== trabSel) return false;
    return true;
  });

  var porTipo = {};
  filtrados.forEach(function(x){
    var key = x.descripcionPerno || x.codigoPerno;
    porTipo[key] = (porTipo[key]||0) + x.cantidad;
  });
  var htmlTipo = Object.keys(porTipo).length ? Object.keys(porTipo).sort().map(function(k){
    return "<div style=\'display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f2f2f2;font-size:13px\'>"+
      "<span>"+k+"</span><b>"+porTipo[k]+"</b></div>";
  }).join("") : "<div style=\'font-size:12px;color:#888\'>Sin registros en ese rango</div>";
  document.getElementById("apResumenTipo").innerHTML = htmlTipo;

  var porTrab = {};
  filtrados.forEach(function(x){
    var key = x.nombreTrabajador || x.codigoTrabajador;
    porTrab[key] = (porTrab[key]||0) + x.cantidad;
  });
  var htmlTrab = Object.keys(porTrab).length ? Object.keys(porTrab).sort(function(a,b){return porTrab[b]-porTrab[a];}).map(function(k){
    return "<div style=\'display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f2f2f2;font-size:13px\'>"+
      "<span>"+k+"</span><b>"+porTrab[k]+"</b></div>";
  }).join("") : "<div style=\'font-size:12px;color:#888\'>Sin registros en ese rango</div>";
  document.getElementById("apResumenTrab").innerHTML = htmlTrab;
}
