// ══════════════════════════════════════════════
//  INVENTARIO — buscar, editar y agregar ítems del catálogo.
//
//  IMPORTANTE: estas columnas coinciden EXACTAMENTE con el Excel
//  real de Joaquín (confirmado por captura, julio 2026):
//
//  Catalogo_Herramientas (14 columnas, A→N):
//    A CodigoHerramienta  B Descripcion   C Categoria
//    D Subcategoria       E Marca         F Especificaciones
//    G CantidadTotal      H CantidadDisponible (en desuso, no se usa)
//    I CantidadPrestada   (en desuso, no se usa)
//    J Accesorios         K Contenedor    L Ubicacion
//    M Estado             N Observaciones
//
//  Catalogo_Insumos (originalmente 8 columnas, A→H — ahora con dos
//  columnas agregadas después, I y J):
//    A CodigoInsumo   B DescripcionInsumo   C Categoria
//    D Unidad         E StockActual         F StockMinimo
//    G Ubicacion      H Observaciones       I FotoId
//    J Tipo (Insumo/Material) — agregado en esta versión. Antes el
//      Tipo NO se guardaba en ningún lado: la pantalla "adivinaba" si
//      un ítem era Insumo o Material buscando la palabra "insumo" o
//      "consumib" dentro del texto libre de Categoría, así que un
//      ítem guardado como Insumo pero sin esa palabra en Categoría
//      terminaba mostrándose como Material. Ver tipoRealInsumo().
//
//  H e I de Herramientas (CantidadDisponible/CantidadPrestada) NO
//  se leen ni se escriben desde aquí a propósito — quedaron con
//  datos manuales inconsistentes. El tope de préstamos (pendiente,
//  próxima etapa) se calculará en vivo contra CantidadTotal, no
//  contra estos dos campos.
// ══════════════════════════════════════════════

var INV_ITEMS=[]; // lista combinada de ambos catálogos, cargada en memoria

var INV_ESTADOS=["Bueno","Nuevo","Regular","Dañado","Pendiente de revisar","De baja","Otro"];

// Carga ambos catálogos completos desde Sheets y arma una sola lista en memoria
// tipoRealInsumo — determina si un ítem de Catalogo_Insumos es Insumo o
// Material. Primero confía en la columna J (Tipo), que es donde se
// guarda explícito desde que se creó o editó el ítem por última vez.
// Si esa columna todavía está vacía (ítems antiguos, de antes de este
// cambio), cae al respaldo de siempre: buscar "insumo"/"consumib"
// dentro del texto libre de Categoría. Una sola función para que
// invCargar() y buscaItem() nunca puedan decidir cosas distintas
// sobre el mismo ítem.
function tipoRealInsumo(categoria, tipoGuardado){
  tipoGuardado = (tipoGuardado||"").toString().trim();
  if(tipoGuardado==="Insumo"||tipoGuardado==="Material") return tipoGuardado;
  var cat = (categoria||"").toString().toLowerCase();
  return (cat.indexOf("insumo")>=0 || cat.indexOf("consumib")>=0) ? "Insumo" : "Material";
}

function invCargar(){
  document.getElementById("invLista").innerHTML="<div class='loading'>🔄 Cargando inventario...</div>";
  Promise.all([
    sheetsGet("Catalogo_Herramientas!A2:O"),
    sheetsGet("Catalogo_Insumos!A2:J"),
    sheetsGet("Movimientos_Insumos!A2:M")
  ]).then(function(results){
    var h=results[0].values||[];
    var ins=results[1].values||[];
    var movs=results[2].values||[];
    INV_ITEMS=[];

    // Calcula el stock real de cada insumo sumando Entradas y restando
    // Salidas de Movimientos_Insumos. Si un código no tiene NINGÚN
    // movimiento todavía, queda como "null" — en ese caso se sigue
    // mostrando el StockActual manual viejo, hasta que se le haga la
    // carga inicial (ver botón "Registrar entrada").
    var stockCalc={};
    movs.forEach(function(m){
      var cod=(m[3]||"").toString().trim();
      if(!cod) return;
      var tipo=(m[2]||"").toString().trim().toLowerCase();
      var cant=Number(m[5])||0;
      if(stockCalc[cod]===undefined) stockCalc[cod]=0;
      stockCalc[cod] += (tipo==="entrada") ? cant : -cant;
    });

    // Herramientas — una fila = un ítem, tal como está en la hoja real
    h.forEach(function(r){
      if(!r[0]) return; // fila sin código, se ignora
      INV_ITEMS.push({
        tipo:"Herramienta",
        codigo:(r[0]||"").toString(), descripcion:(r[1]||"").toString(),
        categoria:(r[2]||"").toString(), subcategoria:(r[3]||"").toString(),
        marca:(r[4]||"").toString(), especificaciones:(r[5]||"").toString(),
        cantidadTotal:(r[6]!==undefined&&r[6]!==""?r[6]:""),
        accesorios:(r[9]||"").toString(), contenedor:(r[10]||"").toString(),
        ubicacion:(r[11]||"").toString(), estado:(r[12]||"Pendiente de revisar").toString(),
        observaciones:(r[13]||"").toString(), fotoId:(r[14]||"").toString()
      });
    });

    // Insumos/Materiales — misma hoja para ambos. El Tipo (Insumo o
    // Material) que elegiste al crear el ítem se guarda explícito en
    // la columna J. Antes NO se guardaba en ningún lado — la pantalla
    // "adivinaba" el tipo buscando la palabra "insumo" o "consumib"
    // dentro del texto libre de Categoría, así que si esa palabra no
    // aparecía ahí (o el campo quedaba vacío), el ítem se mostraba
    // como Material aunque hubieras elegido Insumo. Para ítems viejos
    // que todavía no tengan la columna J llena, se mantiene esa misma
    // adivinanza como respaldo — y se corrige sola la próxima vez que
    // se guarde el ítem (crear o editar).
    ins.forEach(function(r){
      if(!r[0]) return;
      var cod=(r[0]||"").toString();
      var cat=(r[2]||"").toString();
      var tipoFinal = tipoRealInsumo(cat, r[9]);
      INV_ITEMS.push({
        tipo: tipoFinal,
        codigo:cod, descripcion:(r[1]||"").toString(),
        categoria:cat, unidad:(r[3]||"und").toString(),
        stockActual:(r[4]!==undefined&&r[4]!==""?r[4]:""),
        stockMinimo:(r[5]!==undefined&&r[5]!==""?r[5]:""),
        ubicacion:(r[6]||"").toString(), observaciones:(r[7]||"").toString(),
        stockCalculado: stockCalc[cod]!==undefined ? stockCalc[cod] : null,
        fotoId:(r[8]||"").toString()
      });
    });

    invFiltrar();
  }).catch(function(e){
    document.getElementById("invLista").innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

// Filtra la lista en memoria por lo escrito en el buscador (código o descripción)
var INV_EXPLORAR_LISTA = [];

var INV_EXPLORAR_IDX = 0;

function _invFiltrados(){
  var q = document.getElementById("invBuscar").value.toLowerCase().trim();
  return INV_ITEMS.filter(function(it){
    return !q || it.codigo.toLowerCase().indexOf(q)>=0 || it.descripcion.toLowerCase().indexOf(q)>=0;
  });
}

function abrirExploradorInv(){
  INV_EXPLORAR_LISTA = _invFiltrados();
  if(!INV_EXPLORAR_LISTA.length){ alert("No hay ítems para explorar con ese filtro."); return; }
  INV_EXPLORAR_IDX = 0;
  var v = document.getElementById("invExplorador");
  v.style.display="block";
  invExplorarMostrar();
  v.scrollIntoView({behavior:"smooth", block:"start"});
}

function cerrarExploradorInv(){
  var v = document.getElementById("invExplorador");
  if(v) v.style.display="none";
}

function invExplorarMostrar(){
  var it = INV_EXPLORAR_LISTA[INV_EXPLORAR_IDX];
  if(!it) return;
  document.getElementById("invExpTitulo").textContent = it.descripcion || "(sin descripción)";
  document.getElementById("invExpCodigo").textContent = it.codigo + " · " + it.tipo;
  document.getElementById("invExpContador").textContent = (INV_EXPLORAR_IDX+1)+" de "+INV_EXPLORAR_LISTA.length;
  var fotoDiv = document.getElementById("invExpFoto");
  fotoDiv.innerHTML = it.fotoId
    ? "<img src='"+urlFotoDrive(it.fotoId,220)+"' style='width:100%;height:100%;object-fit:cover'>"
    : "<span style='font-size:34px'>🔧</span>";
  var det = "";
  if(it.categoria) det += "<div>📂 "+it.categoria+(it.subcategoria?" / "+it.subcategoria:"")+"</div>";
  if(it.marca) det += "<div>🏷️ "+it.marca+"</div>";
  det += "<div>🔢 Cantidad: "+(it.cantidadTotal!==""?it.cantidadTotal:"sin definir")+"</div>";
  if(it.ubicacion) det += "<div>📍 "+it.ubicacion+"</div>";
  det += "<div>Estado: "+it.estado+"</div>";
  if(it.accesorios) det += "<div>Accesorios: "+it.accesorios+"</div>";
  if(it.observaciones) det += "<div>📝 "+it.observaciones+"</div>";
  document.getElementById("invExpDetalle").innerHTML = det;
}

function invExplorarSiguiente(){ INV_EXPLORAR_IDX=(INV_EXPLORAR_IDX+1)%INV_EXPLORAR_LISTA.length; invExplorarMostrar(); }

function invExplorarAnterior(){ INV_EXPLORAR_IDX=(INV_EXPLORAR_IDX-1+INV_EXPLORAR_LISTA.length)%INV_EXPLORAR_LISTA.length; invExplorarMostrar(); }

function invExplorarPrimero(){ INV_EXPLORAR_IDX=0; invExplorarMostrar(); }

function invExplorarUltimo(){ INV_EXPLORAR_IDX=INV_EXPLORAR_LISTA.length-1; invExplorarMostrar(); }

function invExplorarEditar(){
  var it = INV_EXPLORAR_LISTA[INV_EXPLORAR_IDX];
  if(!it) return;
  cerrarExploradorInv();
  var idx = INV_ITEMS.indexOf(it);
  if(idx>=0) invEditar(idx);
}

// invExportarPDF — exporta a PDF los ítems que coincidan con el filtro
// actual del buscador (o todos, si está vacío). Usa la misma vista
// previa antes de descargar que ya tienen los stickers y carnets.
function invExportarPDF(){
  var res = _invFiltrados();
  var avisoBox = document.getElementById("invExportAviso");
  if(!res.length){ avisoBox.innerHTML="<div class='msg-err'>No hay ítems para exportar con ese filtro.</div>"; return; }
  avisoBox.innerHTML="<div class='msg-ok'>🔄 Generando PDF de "+res.length+" ítems...</div>";

  var doc = new window.jspdf.jsPDF({unit:"mm", format:"letter"});
  var q = document.getElementById("invBuscar").value.trim();
  doc.setFontSize(14); doc.setFont(undefined,"bold"); doc.setTextColor(27,67,50);
  doc.text("Inventario — "+CONFIG.nombreProyecto, 14, 15);
  doc.setFontSize(9); doc.setFont(undefined,"normal"); doc.setTextColor(100,100,100);
  doc.text(CONFIG.empresa+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal+(q?"  ·  Filtro: \""+q+"\"":"")+"  ·  "+res.length+" ítems", 14, 21);

  var filas = res.map(function(it){
    return [it.codigo, it.descripcion, it.tipo, it.categoria||"—", (it.cantidadTotal!==""?it.cantidadTotal:"—")+"", it.ubicacion||"—", it.estado||"—"];
  });
  doc.autoTable({
    startY: 26,
    head: [["Código","Descripción","Tipo","Categoría","Cant.","Ubicación","Estado"]],
    body: filas,
    styles: {fontSize:8, cellPadding:2},
    headStyles: {fillColor:[27,67,50], textColor:255},
    alternateRowStyles: {fillColor:[216,243,220]}
  });

  var fg=new Date();
  var nombreArchivo="Inventario_GT02_"+fg.getFullYear()+"-"+String(fg.getMonth()+1).padStart(2,"0")+"-"+String(fg.getDate()).padStart(2,"0")+"_"+String(fg.getHours()).padStart(2,"0")+String(fg.getMinutes()).padStart(2,"0")+".pdf";
  mostrarVistaPreviaPDF(doc, nombreArchivo, avisoBox, res.length, "ítems del inventario");
}

function invFiltrar(){
  var q=document.getElementById("invBuscar").value.toLowerCase().trim();
  var res=INV_ITEMS.filter(function(it){
    return !q || it.codigo.toLowerCase().indexOf(q)>=0 || it.descripcion.toLowerCase().indexOf(q)>=0;
  });
  var d=document.getElementById("invLista");
  if(!res.length){ d.innerHTML="<div class='empty'><div class='ei'>📦</div><p>Sin resultados</p></div>"; return; }

  d.innerHTML=res.map(function(it){
    var i=INV_ITEMS.indexOf(it);
    var bc=it.tipo==="Herramienta"?"bh":(it.tipo==="Material"?"bm":"bi");
    if(it.tipo==="Herramienta"){
      var deBaja = it.estado==="De baja";
      var cant = it.cantidadTotal===""? "sin cantidad definida" : it.cantidadTotal+" total";
      var miniaturaH = it.fotoId
        ? "<img src='"+urlFotoDrive(it.fotoId,80)+"' style='width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
        : "<div style='width:44px;height:44px;border-radius:8px;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0'>🔧</div>";
      return "<div class='card' style='padding:10px;margin-bottom:8px;"+(deBaja?"opacity:.55":"")+"'>"+
        "<div style='display:flex;justify-content:space-between;align-items:start;gap:8px'>"+
        "<div style='display:flex;gap:8px;align-items:start'>"+miniaturaH+
        "<div><span class='badge "+bc+"'>"+it.tipo+"</span> <b>"+it.descripcion+"</b>"+
        "<div style='font-size:11px;color:#888;margin-top:3px'>"+it.codigo+" · "+cant+(it.ubicacion?" · 📍 "+it.ubicacion:"")+"</div>"+
        "<div style='font-size:11px;color:#888'>Estado: "+it.estado+(it.marca?" · "+it.marca:"")+"</div></div></div>"+
        "<button class='btn b-blue b-sm' style='flex-shrink:0' onclick='invEditar("+i+")'>✏️ Editar</button>"+
        "</div></div>";
    } else {
      // Si ya tiene movimientos registrados, se muestra el stock calculado
      // (Entradas - Salidas), que es el número confiable. Si todavía no
      // tiene ningún movimiento, se muestra el StockActual manual viejo,
      // con un aviso de que está pendiente de iniciar el conteo real.
      var tieneCalculo = it.stockCalculado!==null && it.stockCalculado!==undefined;
      var stockMostrar = tieneCalculo ? it.stockCalculado : it.stockActual;
      var etiquetaStock = tieneCalculo ? "Stock (calculado)" : "Stock (manual, sin movimientos aún)";
      var bajoStock = stockMostrar!=="" && it.stockMinimo!=="" && Number(stockMostrar) < Number(it.stockMinimo);
      return "<div class='card' style='padding:10px;margin-bottom:8px'>"+
        "<div style='display:flex;justify-content:space-between;align-items:start'>"+
        "<div><span class='badge "+bc+"'>"+it.tipo+"</span> <b>"+it.descripcion+"</b>"+
        "<div style='font-size:11px;color:#888;margin-top:3px'>"+it.codigo+" · "+etiquetaStock+": "+(stockMostrar===""?"—":stockMostrar)+" "+it.unidad+
        (bajoStock?" <span style='color:#c0392b'>⚠️ bajo mínimo</span>":"")+(it.ubicacion?" · 📍 "+it.ubicacion:"")+"</div></div>"+
        "<div style='display:flex;flex-direction:column;gap:4px'>"+
        "<button class='btn b-blue b-sm' style='flex-shrink:0' onclick='invEditar("+i+")'>✏️ Editar</button>"+
        "<button class='btn b-ok' style='padding:6px 10px;font-size:11px' onclick='invMostrarEntrada("+i+")'>📥 Entrada</button>"+
        "</div></div></div>";
    }
  }).join("");
}

function invNuevo(){
  invMostrarForm({
    tipo:"Herramienta", codigo:"", descripcion:"", categoria:"", subcategoria:"", marca:"",
    especificaciones:"", cantidadTotal:"", accesorios:"", contenedor:"", ubicacion:"",
    estado:"Pendiente de revisar", observaciones:"", unidad:"und", stockActual:"", stockMinimo:""
  }, false);
}

function invEditar(idx){ invMostrarForm(INV_ITEMS[idx], true); }

// Arma el formulario de edición/creación, con campos distintos según el tipo
function invMostrarForm(it, esEdicion){
  var f=document.getElementById("invForm");
  var esHerr = it.tipo==="Herramienta" || (!esEdicion && it.tipo==="Herramienta");

  var camposHerramienta =
    "<input type='text' id='ivCategoria' placeholder='Categoría' value=\""+esc(it.categoria||"")+"\">"+
    "<input type='text' id='ivSubcategoria' placeholder='Subcategoría' value=\""+esc(it.subcategoria||"")+"\">"+
    "<input type='text' id='ivMarca' placeholder='Marca' value=\""+esc(it.marca||"")+"\">"+
    "<input type='text' id='ivEspecificaciones' placeholder='Especificaciones (ej. 20V, 1/2\")' value=\""+esc(it.especificaciones||"")+"\">"+
    "<input type='number' id='ivCantidad' placeholder='Cantidad total' value=\""+esc((it.cantidadTotal!==undefined?it.cantidadTotal:"").toString())+"\">"+
    "<input type='text' id='ivAccesorios' placeholder='Accesorios (ej. 1 cargador, 1 batería)' value=\""+esc(it.accesorios||"")+"\">"+
    "<input type='text' id='ivContenedor' placeholder='Contenedor (Suelto, Caja, etc.)' value=\""+esc(it.contenedor||"")+"\">"+
    "<select id='ivEstado'>"+INV_ESTADOS.map(function(e){return "<option value='"+e+"'"+(it.estado===e?" selected":"")+">"+e+"</option>";}).join("")+"</select>"+
    "<input type='text' id='ivEstadoOtro' placeholder='Detalle del estado (si elegiste \"Otro\")' style='display:"+(it.estado==="Otro"?"block":"none")+"' value=\""+(it.estado==="Otro"?esc(it.observaciones||""):"")+"\">";

  var camposInsumo =
    "<input type='text' id='ivCategoriaIns' placeholder='Categoría (Insumo, Consumible...)' value=\""+esc(it.categoria||"")+"\">"+
    "<input type='text' id='ivUnidad' placeholder='Unidad (und, rollo, saco...)' value=\""+esc(it.unidad||"und")+"\">"+
    "<input type='number' id='ivStockActual' placeholder='Stock actual' value=\""+esc((it.stockActual!==undefined?it.stockActual:"").toString())+"\">"+
    "<input type='number' id='ivStockMinimo' placeholder='Stock mínimo' value=\""+esc((it.stockMinimo!==undefined?it.stockMinimo:"").toString())+"\">";

  var fotoHTML = "";
  if (esEdicion) {
    var tipoBackend = it.tipo==="Herramienta" ? "herramienta" : "insumo";
    var iconoVacio = it.tipo==="Herramienta" ? "🔧" : "📦";
    fotoHTML =
      "<div style='display:flex;gap:10px;align-items:center;margin-bottom:10px'>" +
        "<div id='ivFotoPrev' style='width:56px;height:56px;border-radius:10px;flex-shrink:0;background:#D8F3DC;display:flex;align-items:center;justify-content:center;overflow:hidden'>" +
          (it.fotoId ? "<img src='"+urlFotoDrive(it.fotoId,120)+"' style='width:100%;height:100%;object-fit:cover'>" : "<span style='font-size:22px'>"+iconoVacio+"</span>") +
        "</div>" +
        "<div style='flex:1;display:flex;flex-direction:column;gap:5px'>" +
          "<input type='file' accept='image/*' capture='environment' id='ivFotoInputCam' style='display:none' onchange='subirFotoHerramienta(\""+esc(it.codigo)+"\",this,\""+tipoBackend+"\")'>" +
          "<input type='file' accept='image/*' id='ivFotoInputGal' style='display:none' onchange='subirFotoHerramienta(\""+esc(it.codigo)+"\",this,\""+tipoBackend+"\")'>" +
          "<div style='display:flex;gap:5px'>" +
            "<button type='button' class='btn b-sec b-sm' style='flex:1' onclick=\"document.getElementById('ivFotoInputCam').click()\">📷 Tomar foto</button>" +
            "<button type='button' class='btn b-sec b-sm' style='flex:1' onclick=\"document.getElementById('ivFotoInputGal').click()\">🖼️ Galería</button>" +
          "</div>" +
          "<div id='ivFotoMsg' style='font-size:11px'></div>" +
        "</div>" +
      "</div>";
  }

  f.innerHTML=
    "<div class='card'>"+
    "<div class='ctit'>"+(esEdicion?"✏️ Editar ítem":"➕ Nuevo ítem")+"</div>"+
    fotoHTML+
    "<select id='ivTipo' onchange='invToggleTipoCampos()' "+(esEdicion&&it.tipo==="Herramienta"?"disabled":"")+">"+
      "<option value='Herramienta'"+(it.tipo==="Herramienta"?" selected":"")+">Herramienta</option>"+
      "<option value='Insumo'"+(it.tipo==="Insumo"?" selected":"")+">Insumo</option>"+
      "<option value='Material'"+(it.tipo==="Material"?" selected":"")+">Material</option>"+
    "</select>"+
    (esEdicion&&it.tipo==="Herramienta"?"<div style='font-size:10px;color:#888;margin:-4px 0 6px'>Una herramienta no se puede cambiar a Insumo/Material desde aquí — viven en hojas distintas del Excel. Si fue un error, crea el ítem correcto y desactiva este.</div>":"")+
    "<input type='text' id='ivCodigo' placeholder='Código' value=\""+esc(it.codigo)+"\">"+
    "<input type='text' id='ivDescripcion' placeholder='Descripción' value=\""+esc(it.descripcion)+"\">"+
    "<div id='ivCamposHerramienta' style='display:"+(it.tipo==="Herramienta"?"block":"none")+"'>"+camposHerramienta+"</div>"+
    "<div id='ivCamposInsumo' style='display:"+(it.tipo!=="Herramienta"?"block":"none")+"'>"+camposInsumo+"</div>"+
    "<input type='text' id='ivUbicacion' placeholder='Ubicación en bodega' value=\""+esc(it.ubicacion||"")+"\">"+
    "<input type='text' id='ivObservaciones' placeholder='Observaciones' value=\""+esc(it.tipo==="Herramienta"&&it.estado==="Otro"?"":(it.observaciones||""))+"\">"+
    "<div id='ivMsg'></div>"+
    "<div style='display:flex;gap:8px;margin-top:6px'>"+
      "<button class='btn b-ok' style='flex:1' onclick='invGuardar("+(esEdicion?"\""+escJS(it.codigo)+"\"":"null")+")'>💾 Guardar</button>"+
      "<button class='btn b-sec' style='flex:0' onclick='document.getElementById(\"invForm\").innerHTML=\"\"'>Cancelar</button>"+
    "</div></div>";

  // Muestra/oculta el campo libre de "Otro" según el estado elegido
  var selEstado=document.getElementById("ivEstado");
  if(selEstado) selEstado.addEventListener("change",function(){
    document.getElementById("ivEstadoOtro").style.display = (this.value==="Otro")?"block":"none";
  });

  f.scrollIntoView({behavior:"smooth"});
}

// Alterna qué grupo de campos se ve según el tipo elegido (solo al crear un ítem nuevo)
function invToggleTipoCampos(){
  var tipo=document.getElementById("ivTipo").value;
  document.getElementById("ivCamposHerramienta").style.display = (tipo==="Herramienta")?"block":"none";
  document.getElementById("ivCamposInsumo").style.display = (tipo==="Herramienta")?"none":"block";
}

// Junta los datos del formulario según el tipo, y los manda a guardar al backend
function subirFotoHerramienta(codigo, inputEl, tipoBackend) {
  var file = inputEl.files && inputEl.files[0];
  if(!file) return;
  tipoBackend = tipoBackend || "herramienta";
  abrirRecortadorFoto(file, function(r){
    var msg = document.getElementById("ivFotoMsg");
    var prev = document.getElementById("ivFotoPrev");
    if(prev) prev.innerHTML = "<img src='"+r.dataUrl+"' style='width:100%;height:100%;object-fit:cover'>";
    if(msg) msg.innerHTML = "🔄 Subiendo foto...";
    gasPostBody("subirFoto", {tipo:tipoBackend, codigo:codigo, base64:r.base64, mimeType:r.mimeType}).then(function(res){
      if(res && res.ok){
        if(msg) msg.innerHTML = "<span style='color:#375623'>✅ Foto guardada</span>";
        var item = INV_ITEMS.find(function(x){ return x.codigo===codigo; });
        if(item) item.fotoId = res.fileId;
      } else {
        if(msg) msg.innerHTML = "<span style='color:#C00000'>❌ "+(res&&res.error||"Error al subir")+"</span>";
      }
    }).catch(function(e){
      if(msg) msg.innerHTML = "<span style='color:#C00000'>❌ "+e.message+"</span>";
    });
  }, "Encuadra bien el ítem dentro del círculo");
}

function invGuardar(codigoOriginal){
  var btn = _botonDelEvento();
  var msg=document.getElementById("ivMsg");
  msg.innerHTML="";
  var tipo=document.getElementById("ivTipo").value;
  var codigo=document.getElementById("ivCodigo").value.trim();
  var descripcion=document.getElementById("ivDescripcion").value.trim();
  var ubicacion=document.getElementById("ivUbicacion").value.trim();
  var observacionesInput=document.getElementById("ivObservaciones").value.trim();

  if(!codigo||!descripcion){
    msg.innerHTML="<div class='msg-err'>Código y descripción son obligatorios.</div>";
    return;
  }

  var data={ tipo:tipo, codigo:codigo, codigoOriginal:codigoOriginal||"", descripcion:descripcion, ubicacion:ubicacion };

  if(tipo==="Herramienta"){
    var estadoSel=document.getElementById("ivEstado").value;
    var estadoOtro=document.getElementById("ivEstadoOtro")?document.getElementById("ivEstadoOtro").value.trim():"";
    data.categoria=document.getElementById("ivCategoria").value.trim();
    data.subcategoria=document.getElementById("ivSubcategoria").value.trim();
    data.marca=document.getElementById("ivMarca").value.trim();
    data.especificaciones=document.getElementById("ivEspecificaciones").value.trim();
    data.cantidadTotal=document.getElementById("ivCantidad").value.trim();
    data.accesorios=document.getElementById("ivAccesorios").value.trim();
    data.contenedor=document.getElementById("ivContenedor").value.trim();
    data.estado=estadoSel;
    // Si el estado es "Otro", el detalle escrito se guarda en Observaciones junto a lo que ya había
    data.observaciones = (estadoSel==="Otro" && estadoOtro) ? (estadoOtro+(observacionesInput?" · "+observacionesInput:"")) : observacionesInput;
  } else {
    data.categoria=document.getElementById("ivCategoriaIns").value.trim();
    data.unidad=document.getElementById("ivUnidad").value.trim();
    data.stockActual=document.getElementById("ivStockActual").value.trim();
    data.stockMinimo=document.getElementById("ivStockMinimo").value.trim();
    data.observaciones=observacionesInput;
  }

  if(!_bloquearBoton(btn, "invGuardar")) return;
  gasPost("guardarItemCatalogo",data).then(function(r){
    _liberarBoton(btn, "invGuardar");
    if(r.error){ msg.innerHTML="<div class='msg-err'>❌ "+r.error+"</div>"; return; }
    document.getElementById("invForm").innerHTML="<div class='msg-ok'>✅ Guardado correctamente.</div>";
    setTimeout(function(){document.getElementById("invForm").innerHTML="";},1500);
    invCargar();
  }).catch(function(e){
    _liberarBoton(btn, "invGuardar");
    msg.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

// ── Registrar ENTRADA de stock (compra o carga inicial) ──
// Se usa una por una, a propósito — cada entrada queda como su propio
// registro en Movimientos_Insumos, con su motivo, para mantener un
// historial honesto (ver conversación sobre la carga inicial de bridas).
function invMostrarEntrada(idx){
  var it=INV_ITEMS[idx];
  var f=document.getElementById("invForm");
  f.innerHTML=
    "<div class='card'>"+
    "<div class='ctit'>📥 Registrar entrada — "+esc(it.descripcion)+"</div>"+
    "<select id='ieTipo'>"+
      "<option value='Entrada'>Entrada (compra / stock inicial)</option>"+
      "<option value='Salida'>Salida (ajuste manual)</option>"+
    "</select>"+
    "<input type='number' id='ieCantidad' placeholder='Cantidad'>"+
    "<input type='text' id='ieMotivo' placeholder='Motivo (ej. Inventario inicial, Compra, Ajuste)'>"+
    "<input type='text' id='ieFactura' placeholder='N° de factura (opcional)'>"+
    "<input type='text' id='ieObs' placeholder='Observaciones (opcional)'>"+
    "<div id='ieMsg'></div>"+
    "<div style='display:flex;gap:8px;margin-top:6px'>"+
      "<button class='btn b-ok' style='flex:1' onclick='invGuardarEntrada("+idx+")'>💾 Registrar</button>"+
      "<button class='btn b-sec' style='flex:0' onclick='document.getElementById(\"invForm\").innerHTML=\"\"'>Cancelar</button>"+
    "</div></div>";
  f.scrollIntoView({behavior:"smooth"});
}

function invGuardarEntrada(idx){
  var it=INV_ITEMS[idx];
  var msg=document.getElementById("ieMsg");
  msg.innerHTML="";
  var cantidad=document.getElementById("ieCantidad").value.trim();
  var motivo=document.getElementById("ieMotivo").value.trim();
  if(!cantidad || Number(cantidad)<=0){
    msg.innerHTML="<div class='msg-err'>La cantidad es obligatoria y debe ser mayor a 0.</div>";
    return;
  }
  if(!motivo){
    msg.innerHTML="<div class='msg-err'>El motivo es obligatorio (ej. \"Inventario inicial\", \"Compra\").</div>";
    return;
  }
  var data={
    codigoInsumo: it.codigo,
    descripcionInsumo: it.descripcion,
    cantidad: cantidad,
    unidad: it.unidad,
    tipoMovimiento: document.getElementById("ieTipo").value,
    motivo: motivo,
    numeroFactura: document.getElementById("ieFactura").value.trim(),
    registradoPor: (SESION&&SESION.nombre)||"Almacenista",
    observaciones: document.getElementById("ieObs").value.trim()
  };
  gasPost("registrarMovimientoInsumo",data).then(function(r){
    if(r.error){ msg.innerHTML="<div class='msg-err'>❌ "+r.error+"</div>"; return; }
    document.getElementById("invForm").innerHTML="<div class='msg-ok'>✅ Movimiento registrado ("+r.idMovimiento+").</div>";
    setTimeout(function(){document.getElementById("invForm").innerHTML="";},1800);
    invCargar();
  }).catch(function(e){
    msg.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}
