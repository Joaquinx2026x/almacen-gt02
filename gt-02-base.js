var qrRdr = null;

var qrMode= -1;

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  NAVEGACIÓN CENTRAL (v3.0.0)
//  Antes cada módulo (Horómetro, Armado, EPP, Salud) y cada pantalla de
//  Admin se mostraba/ocultaba por su cuenta y no sabía que existían las
//  demás; al saltar de una a otra quedaban superpuestas o invisibles.
//  Ahora TODAS pasan por navLimpiarTodo(): deja la app en un estado
//  limpio (sin módulos abiertos, sin pantallas "pegadas") antes de
//  mostrar la pantalla nueva. Un módulo nuevo solo debe agregarse a
//  NAV_PANTALLAS_MODULO y llamar navLimpiarTodo() al abrirse.
// ══════════════════════════════════════════════
var NAV_TAB_ACTUAL = 0;   // última pestaña principal vista (a ella se regresa al cerrar un módulo)
var NAV_INV_TS = 0;       // cuándo se cargó el inventario por última vez
var NAV_PANTALLAS_MODULO = ["horometroScreen","armadoPernosScreen","eppScreen","saludScreen"];
function navLimpiarTodo(){
  NAV_PANTALLAS_MODULO.forEach(function(id){
    var e=document.getElementById(id); if(e) e.style.display="none";
  });
  document.querySelectorAll(".scr").forEach(function(s){ s.style.display=""; s.classList.remove("on"); });
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  var tabs=document.querySelector(".tabs"); if(tabs) tabs.style.display="flex";
  var menu=document.getElementById("menuMas"); if(menu) menu.style.display="none";
  try{ stopQR(); }catch(e){}
}

function goTab(n) {
  navLimpiarTodo();
  NAV_TAB_ACTUAL = n;
  document.querySelectorAll(".tab").forEach(function(t,i){ t.classList.toggle("on",i===n); });
  document.querySelectorAll(".scr").forEach(function(s,i){ s.classList.toggle("on",i===n); });
  // Inventario: se recarga al entrar si pasaron más de 30 segundos desde
  // la última carga (o si nunca se cargó), para que no muestre datos viejos.
  if(n===4 && (INV_ITEMS.length===0 || (Date.now()-NAV_INV_TS)>30000)){ NAV_INV_TS=Date.now(); invCargar(); }
  // Historial se recarga SIEMPRE al entrar, no solo la primera vez —
  // así refleja de inmediato cualquier préstamo o devolución recién
  // hecha, sin que haya que refrescar toda la página manualmente.
  if(n===2) cargarHist();
}

// ══════════════════════════════════════════════
//  PITIDO
// ══════════════════════════════════════════════
function beep() {
  try {
    var a=new(window.AudioContext||window.webkitAudioContext)();
    var o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);
    o.frequency.value=1200;g.gain.value=0.3;
    o.start();setTimeout(function(){o.stop();},130);
  } catch(e){}
}

// ══════════════════════════════════════════════
//  QR SCANNER
// ══════════════════════════════════════════════
function toggleQR(mode) {
  if (qrMode===mode){stopQR();return;}
  if (qrMode!==-1) stopQR();
  var wrap=document.getElementById("qw"+mode);
  var vid =document.getElementById("qv"+mode);
  var btn =document.getElementById("btnQR"+mode);
  wrap.style.display="block";
  btn.textContent="⏹ Cerrar cámara";
  qrMode=mode;
  var hints=new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.QR_CODE]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER,true);
  qrRdr=new ZXing.BrowserQRCodeReader(hints);
  qrRdr.decodeFromVideoDevice(undefined,vid,function(result){
    if(!result) return;
    var val=result.getText().trim();
    if(!val) return;
    beep();
    var fl=document.getElementById("qf"+mode);
    if(fl){fl.classList.add("show");setTimeout(function(){fl.classList.remove("show");},300);}
    var mg=mode;
    stopQR();
    if(mg===1){document.getElementById("btd").value=val;buscaTWDirecto(val,1);}
    else{document.getElementById("bt").value=val;buscaTWDirecto(val,0);}
  });
}

function stopQR(){
  if(qrRdr){try{qrRdr.reset();}catch(e){}qrRdr=null;}
  if(qrMode!==-1){
    var w=document.getElementById("qw"+qrMode);
    var v=document.getElementById("qv"+qrMode);
    var b=document.getElementById("btnQR"+qrMode);
    if(w)w.style.display="none";
    if(v){try{v.srcObject=null;}catch(e){}}
    if(b)b.textContent="📷 Escanear QR del trabajador";
  }
  qrMode=-1;
}

// ══════════════════════════════════════════════
//  API — Google Sheets (lectura pública)
// ══════════════════════════════════════════════
function sheetsGet(range) {
  var url = SHEETS_URL + encodeURIComponent(range) + "?key=" + API_KEY;
  return fetch(url,{cache:"no-store"}).then(function(r){ return r.json(); });
}

// ══════════════════════════════════════════════
//  API — Apps Script (escritura via fetch CORS)
// ══════════════════════════════════════════════
// _bloquearBoton / _liberarBoton — mismo criterio que ya usaba
// guardarPrestamo (ENVIANDO_PRESTAMO), hecho reutilizable para
// cualquier botón de guardar del sistema. "key" es un nombre único
// por acción (ej. "eppRegistrar"); mientras esté bloqueada, un
// segundo toque se ignora en vez de mandar un registro duplicado.
var _ENVIANDO = {};

function _bloquearBoton(btn, key, textoCargando){
  if(_ENVIANDO[key]) return false;
  _ENVIANDO[key] = true;
  if(btn){
    btn.dataset.textoOriginal = btn.textContent;
    btn.textContent = textoCargando || "⏳ Guardando...";
    btn.disabled = true;
  }
  return true;
}

function _liberarBoton(btn, key){
  _ENVIANDO[key] = false;
  if(btn){
    btn.disabled = false;
    if(btn.dataset.textoOriginal !== undefined) btn.textContent = btn.dataset.textoOriginal;
  }
}

function _botonDelEvento(){
  // Recupera el botón que disparó el onclick actual, sin tener que
  // cambiar cada llamada para pasar "this" — funciona porque los
  // manejadores inline sí exponen el evento global del navegador.
  try { return (window.event && window.event.target) || null; } catch(e){ return null; }
}

function gasPost(action, data) {
  data.action = action;
  var payload = JSON.stringify(data, function(k,v){
    if(v===null||v===undefined) return undefined;
    return v;
  });
  var url = GAS_URL + "?action=" + action + "&payload=" + encodeURIComponent(payload);
  return fetch(url, {method:"GET", redirect:"follow"})
    .then(function(r){
      if(!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function(d){
      if(d && d.error) throw new Error(d.error);
      return d;
    });
}

// gasPostBody — igual que gasPost, pero manda los datos en el cuerpo (body)
// de la petición en vez de en la URL. Se usa SOLO para fotos: una imagen en
// base64 es demasiado pesada para ir pegada a una URL normal.
function gasPostBody(action, data) {
  data.action = action;
  return fetch(GAS_URL, {method:"POST", body:JSON.stringify(data)})
    .then(function(r){
      if(!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function(d){
      if(d && d.error) throw new Error(d.error);
      return d;
    });
}

// urlFotoDrive — miniatura pública de una foto guardada en Drive, a partir
// del ID que devuelve subirFoto(). Sirve para mostrarla en pantalla (no
// requiere permisos especiales porque el archivo se comparte como "cualquiera
// con el link" al subirlo).
function urlFotoDrive(fileId, ancho) {
  if(!fileId) return null;
  return "https://drive.google.com/thumbnail?id="+fileId+"&sz=w"+(ancho||200);
}

// leerFotoComoBase64 — convierte el archivo elegido en la cámara/galería del
// celular a base64, para poder mandarlo al backend.
function leerFotoComoBase64(file) {
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(){
      var base64 = reader.result.split(",")[1];
      resolve({base64:base64, mimeType:file.type||"image/jpeg"});
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// abrirRecortadorFoto — recortador interactivo real: muestra la foto
// completa dentro de un visor circular, el usuario arrastra con el
// dedo para posicionarla y usa el control de zoom para acercar/alejar,
// hasta que el rostro (o la herramienta) quede exactamente donde
// quiere. Solo al confirmar se genera el recorte final — lo que se ve
// en pantalla es EXACTAMENTE lo que se va a guardar.
function abrirRecortadorFoto(file, onConfirm, titulo) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function(){
    var VP = Math.min(300, window.innerWidth - 48);
    var baseScale = Math.max(VP/img.naturalWidth, VP/img.naturalHeight);

    var overlay = document.createElement("div");
    overlay.id = "recortadorOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px";
    overlay.innerHTML =
      "<div style='color:#fff;font-size:14px;margin-bottom:12px;text-align:center;font-weight:bold'>"+(titulo||"Ajusta la foto dentro del círculo")+"</div>"+
      "<div id='recorteViewport' style='position:relative;width:"+VP+"px;height:"+VP+"px;overflow:hidden;border-radius:16px;touch-action:none;background:#111'>"+
        "<img id='recorteImg' draggable='false' style='position:absolute;left:0;top:0;transform-origin:0 0;user-select:none;-webkit-user-drag:none;pointer-events:none'>"+
        "<div style='position:absolute;inset:0;pointer-events:none;border-radius:50%;box-shadow:0 0 0 2000px rgba(0,0,0,.6);border:3px solid #F4B942'></div>"+
      "</div>"+
      "<div style='width:"+VP+"px;margin-top:16px;display:flex;align-items:center;gap:10px'>"+
        "<span style='color:#fff;font-size:15px'>🔍</span>"+
        "<input type='range' id='recorteZoom' min='100' max='300' value='100' style='flex:1;margin:0'>"+
      "</div>"+
      "<div style='color:#ccc;font-size:11px;margin-top:6px'>Arrastra la foto con el dedo para moverla</div>"+
      "<div style='display:flex;gap:10px;margin-top:16px'>"+
        "<button type='button' class='btn b-sec' id='recorteCancelar' style='width:auto;padding:11px 18px'>Cancelar</button>"+
        "<button type='button' class='btn b-ok' id='recorteConfirmar' style='width:auto;padding:11px 18px'>✅ Usar esta foto</button>"+
      "</div>";
    document.body.appendChild(overlay);

    var imgEl = document.getElementById("recorteImg");
    imgEl.src = url;
    var state = {
      scale: baseScale,
      offsetX: (VP - img.naturalWidth*baseScale)/2,
      offsetY: (VP - img.naturalHeight*baseScale)/2,
      dragging:false, lastX:0, lastY:0
    };

    function aplicar(){
      var minX = VP - img.naturalWidth*state.scale, maxX = 0;
      var minY = VP - img.naturalHeight*state.scale, maxY = 0;
      state.offsetX = Math.min(maxX, Math.max(minX, state.offsetX));
      state.offsetY = Math.min(maxY, Math.max(minY, state.offsetY));
      imgEl.style.width = (img.naturalWidth*state.scale)+"px";
      imgEl.style.height = (img.naturalHeight*state.scale)+"px";
      imgEl.style.transform = "translate("+state.offsetX+"px,"+state.offsetY+"px)";
    }
    aplicar();

    var viewport = document.getElementById("recorteViewport");
    viewport.addEventListener("pointerdown", function(e){
      state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY;
      try{ viewport.setPointerCapture(e.pointerId); }catch(err){}
    });
    viewport.addEventListener("pointermove", function(e){
      if(!state.dragging) return;
      state.offsetX += e.clientX - state.lastX;
      state.offsetY += e.clientY - state.lastY;
      state.lastX = e.clientX; state.lastY = e.clientY;
      aplicar();
    });
    ["pointerup","pointercancel","pointerleave"].forEach(function(ev){
      viewport.addEventListener(ev, function(){ state.dragging=false; });
    });

    document.getElementById("recorteZoom").addEventListener("input", function(e){
      var factor = parseInt(e.target.value,10)/100;
      var cx = VP/2, cy = VP/2;
      var natX = (cx - state.offsetX)/state.scale, natY = (cy - state.offsetY)/state.scale;
      state.scale = baseScale*factor;
      state.offsetX = cx - natX*state.scale;
      state.offsetY = cy - natY*state.scale;
      aplicar();
    });

    function cerrar(){
      URL.revokeObjectURL(url);
      if(overlay.parentNode) document.body.removeChild(overlay);
    }

    document.getElementById("recorteCancelar").addEventListener("click", cerrar);

    document.getElementById("recorteConfirmar").addEventListener("click", function(){
      var salida = 500;
      var canvas = document.createElement("canvas");
      canvas.width = salida; canvas.height = salida;
      var ctx = canvas.getContext("2d");
      var sx = -state.offsetX/state.scale, sy = -state.offsetY/state.scale;
      var swh = VP/state.scale;
      ctx.drawImage(img, sx, sy, swh, swh, 0, 0, salida, salida);
      var dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      cerrar();
      onConfirm({ base64: dataUrl.split(",")[1], mimeType:"image/jpeg", dataUrl: dataUrl });
    });
  };
  img.onerror = function(){ URL.revokeObjectURL(url); alert("No se pudo abrir esa imagen, intenta con otra."); };
  img.src = url;
}

function toggleMenuMas(){
  var m=document.getElementById("menuMas");
  m.style.display = (m.style.display==="block") ? "none" : "block";
}

function esc(s){return(s||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;");}

// escTexto — para texto que va DENTRO de un <textarea>...</textarea>
// (no como valor de atributo). esc() no alcanza ahí porque no escapa
// &, < ni > — si el trabajador tuviera algo como "</textarea>" en sus
// notas, cortaría el HTML a la mitad. Se usa en Alergias/notas de
// salud, que es texto libre.
function escTexto(s){return(s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

// escJS — para texto que se inserta como argumento de una función JS dentro
// de un onclick='...'. A diferencia de esc() (pensada para atributos HTML
// normales como value="..."), aquí el texto vive dentro de comillas dobles
// de JavaScript, así que hay que proteger la comilla doble para JS (\")
// Y el apóstrofe para que no rompa el atributo HTML de una sola comilla
// (&#39;) — esc() sola no cubre ambos casos a la vez, por eso las medidas
// con comillas de pulgada (3/4", 1/2") rompían el botón en silencio.
function escJS(s){
  return (s||"").toString()
    .replace(/\\/g,"\\\\")
    .replace(/"/g,'\\"')
    .replace(/'/g,"&#39;");
}
