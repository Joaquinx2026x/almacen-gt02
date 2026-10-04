// ══════════════════════════════════════════════
// CONFIGURACIÓN DE APARIENCIA (solo Admin)
// ══════════════════════════════════════════════
var PALETA = [
  {nombre:CONFIG.colorPaletaDefecto+" (por defecto)", primario:"#1B4332", secundario:"#2D6A4F", claro:"#D8F3DC", xclaro:"#EBF7ED", borde:"#B7E4C7", pastel:"#95D5B2"},
  {nombre:"Azul",         primario:"#1F3864", secundario:"#2E75B6", claro:"#D6E4F0", xclaro:"#EBF3FB", borde:"#BDD7EE", pastel:"#A8C8E8"},
  {nombre:"Rojo Energía", primario:"#7B0000", secundario:"#C00000", claro:"#FCE4D6", xclaro:"#FFF5F5", borde:"#F5BBBB", pastel:"#E88"},
  {nombre:"Morado",       primario:"#4A0E8F", secundario:"#7B2FF7", claro:"#EDE0FF", xclaro:"#F5EDFF", borde:"#D4B8FF", pastel:"#C8A0F0"},
  {nombre:"Naranja",      primario:"#7B3800", secundario:"#D96900", claro:"#FFE8CC", xclaro:"#FFF4E5", borde:"#FFD199", pastel:"#FFB84D"},
  {nombre:"Gris Acero",   primario:"#2B2B2B", secundario:"#555555", claro:"#E5E5E5", xclaro:"#F5F5F5", borde:"#CCCCCC", pastel:"#AAAAAA"},
];

function abrirConfigApariencia() {
  toggleMenuMas();
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("configAparienciaScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  renderPaleta();
}

function renderPaleta() {
  var div = document.getElementById("paletaOpciones");
  if(!div) return;
  div.innerHTML = PALETA.map(function(p,i){
    return "<div onclick='aplicarPaleta("+i+")' style='display:flex;align-items:center;gap:10px;padding:10px;background:#fff;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);cursor:pointer'>" +
      "<div style='display:flex;gap:4px'>" +
      "<div style='width:24px;height:24px;border-radius:50%;background:"+p.primario+"'></div>" +
      "<div style='width:24px;height:24px;border-radius:50%;background:"+p.secundario+"'></div>" +
      "<div style='width:24px;height:24px;border-radius:50%;background:"+p.claro+"'></div>" +
      "</div>" +
      "<span style='font-size:13px;font-weight:bold;color:#333'>"+p.nombre+"</span>" +
      "</div>";
  }).join("") +
  "<div class='card' style='margin-top:12px'>" +
  "<div class='ctit'>🎨 Color personalizado</div>" +
  "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'>" +
  "<div><label style='font-size:11px;color:#666'>Color primario</label><br><input type='color' id='cpPrimario' value='#1B4332' style='width:100%;height:40px;padding:2px;margin-bottom:0'></div>" +
  "<div><label style='font-size:11px;color:#666'>Color secundario</label><br><input type='color' id='cpSecundario' value='#2D6A4F' style='width:100%;height:40px;padding:2px;margin-bottom:0'></div>" +
  "</div>" +
  "<button class='btn b-ok' onclick='aplicarColorPersonalizado()'>✅ Aplicar colores personalizados</button>" +
  "</div>";
}

function aplicarPaleta(idx) {
  var p = PALETA[idx];
  if(!p) return;
  aplicarColores(p.primario, p.secundario, p.claro, p.xclaro, p.borde, p.pastel);
  guardarColoresRemoto(p.primario, p.secundario, p.claro, p.xclaro, p.borde, p.pastel, p.nombre);
}

function aplicarColorPersonalizado() {
  var prim = (document.getElementById("cpPrimario")||{value:"#1B4332"}).value;
  var secu = (document.getElementById("cpSecundario")||{value:"#2D6A4F"}).value;
  // Generar variantes claras automáticamente
  var claro=secu+"33", xclaro=secu+"15", borde=secu+"55", pastel=secu+"88";
  aplicarColores(prim, secu, claro, xclaro, borde, pastel);
  guardarColoresRemoto(prim, secu, claro, xclaro, borde, pastel, "Personalizado");
}

// guardarColoresRemoto — antes el color elegido se guardaba en
// localStorage: cada quien veía un color distinto según su propio
// celular. Ahora se guarda en Config_GT02 (Admin → Ajustes), así el
// cambio se ve igual para todos los usuarios del sistema.
function guardarColoresRemoto(primario, secundario, claro, xclaro, borde, pastel, etiqueta){
  gasPost("guardarConfig", {
    colorPrimario:primario, colorSecundario:secundario, colorClaro:claro,
    colorXclaro:xclaro, colorBorde:borde, colorPastel:pastel
  }).then(function(r){
    if(r && r.ok) alert("✅ Apariencia actualizada para todos los usuarios"+(etiqueta?": "+etiqueta:""));
    else alert("❌ No se pudo guardar: "+(r&&r.error||"error desconocido"));
  }).catch(function(e){ alert("❌ Error: "+e.message); });
}

function aplicarColores(prim, secu, claro, xclaro, borde, pastel) {
  var root = document.documentElement;
  root.style.setProperty("--c-prim",   prim);
  root.style.setProperty("--c-secu",   secu);
  root.style.setProperty("--c-claro",  claro);
  root.style.setProperty("--c-xclaro", xclaro);
  root.style.setProperty("--c-borde",  borde);
  root.style.setProperty("--c-pastel", pastel);
}

function abrirAjustes() {
  toggleMenuMas();
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("ajustesScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  document.getElementById("ajNombreProyecto").value = CONFIG.nombreProyecto;
  document.getElementById("ajUbicacion").value      = CONFIG.ubicacion;
  document.getElementById("ajEmpresa").value        = CONFIG.empresa;
  document.getElementById("ajPaisLegal").value      = CONFIG.paisLegal;
  document.getElementById("ajLeyendaCarnet").value  = CONFIG.leyendaCarnet;
}

function guardarAjustesIdentidad() {
  var btn = _botonDelEvento();
  var msg = document.getElementById("ajMsg");
  msg.innerHTML = "";
  var datos = {
    nombreProyecto: (document.getElementById("ajNombreProyecto")||{value:""}).value.trim(),
    ubicacion:      (document.getElementById("ajUbicacion")||{value:""}).value.trim(),
    empresa:        (document.getElementById("ajEmpresa")||{value:""}).value.trim(),
    paisLegal:      (document.getElementById("ajPaisLegal")||{value:""}).value.trim(),
    leyendaCarnet:  (document.getElementById("ajLeyendaCarnet")||{value:""}).value.trim()
  };
  if(!datos.nombreProyecto || !datos.ubicacion || !datos.empresa){
    msg.innerHTML = "<div class='msg-err'>Nombre, ubicación y empresa son obligatorios.</div>";
    return;
  }
  if(!_bloquearBoton(btn, "guardarAjustesIdentidad")) return;
  gasPost("guardarConfig", datos).then(function(r){
    _liberarBoton(btn, "guardarAjustesIdentidad");
    if(r && r.ok){
      CONFIG.nombreProyecto = datos.nombreProyecto;
      CONFIG.ubicacion      = datos.ubicacion;
      CONFIG.empresa        = datos.empresa;
      CONFIG.paisLegal      = datos.paisLegal;
      CONFIG.leyendaCarnet  = datos.leyendaCarnet;
      aplicarConfigProyecto();
      msg.innerHTML = "<div class='msg-ok'>✅ Guardado — visible para todos los usuarios.</div>";
      setTimeout(function(){ msg.innerHTML=""; },2500);
    } else {
      msg.innerHTML = "<div class='msg-err'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){
    _liberarBoton(btn, "guardarAjustesIdentidad");
    msg.innerHTML = "<div class='msg-err'>"+e.message+"</div>";
  });
}
