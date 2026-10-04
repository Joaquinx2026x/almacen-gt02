// ══════════════════════════════════════════════
//  MÓDULO CONTROL DE EPP — una sola hoja nueva (EPP_Trabajador),
//  un registro por trabajador (se actualiza en el mismo lugar,
//  no es un historial de movimientos como Armado de pernos).
// ══════════════════════════════════════════════
var EPP_TRAB_ACTUAL = null; // {codigo, nombre}

// ══════════════════════════════════════════════
//  MÓDULO CONTROL DE EPP — todo se calcula a partir de la bitácora
//  EPP_Movimientos (una fila por cada entrega/devolución/cambio),
//  igual criterio que el stock de insumos: se suma/resta el
//  historial en vez de guardar un estado fijo.
// ══════════════════════════════════════════════
var EPP_TRAB_ACTUAL = null;

var EPP_MOVS_TRAB = [];

var EPP_MOVS_TODOS = null;

var EPP_CATALOGO = null; // catálogo de ítems de EPP (Admin → Catálogo de EPP)

function abrirEPP(){
  navLimpiarTodo(); // cierra cualquier otra pantalla/módulo antes de abrir este
  document.getElementById("menuMas").style.display="none";
  document.querySelector(".tabs").style.display="none";
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display="none"; });
  document.getElementById("eppScreen").style.display="block";
  EPP_CATALOGO=null; // se relee el catálogo cada vez que se abre el módulo
  eppCargarCatalogo().then(function(){ eppGoTab(0); });
}

// eppCargarCatalogo — trae el catálogo de EPP (qué ítems existen, ícono,
// tipo de comportamiento, si requiere talla). Antes esto era una lista
// fija de 6 ítems escrita en el HTML; ahora sale de la hoja
// EPP_Catalogo, así que agregar o desactivar un ítem (Admin → Catálogo
// de EPP) no requiere tocar código. Si la hoja todavía no existe (recién
// instalado, o un GT03 que copió el código pero no los datos), se crea
// sola con los 6 ítems de siempre antes de reintentar la lectura.
var EPP_MIGRACION_HECHA = false;

function eppCargarCatalogo(){
  if(EPP_CATALOGO) return Promise.resolve(EPP_CATALOGO);
  // Una sola vez por sesión se llama a asegurarCatalogoEPP ANTES de
  // leer la hoja. En el backend eso dispara la migración que aplica
  // los cambios de comportamiento que trae una versión nueva sobre
  // catálogos que ya existían (ej. Lentes pasando a "reincidente").
  // Sin este paso, cambiar el tipo por defecto en el código no tendría
  // ningún efecto: el catálogo real vive en la hoja, no en el código.
  var preparar = EPP_MIGRACION_HECHA
    ? Promise.resolve()
    : gasPost("asegurarCatalogoEPP",{}).then(function(){ EPP_MIGRACION_HECHA = true; }).catch(function(){});

  return preparar.then(function(){
    return sheetsGet("EPP_Catalogo!A2:F");
  }).then(function(resp){
    var rows = resp.values || [];
    if(!rows.length) throw new Error("vacio");
    EPP_CATALOGO = rows.filter(function(r){return r[0];}).map(eppFilaCatalogoAObjeto);
    return EPP_CATALOGO;
  }).catch(function(){
    return gasPost("asegurarCatalogoEPP",{}).then(function(){
      return sheetsGet("EPP_Catalogo!A2:F");
    }).then(function(resp){
      var rows = resp.values || [];
      EPP_CATALOGO = rows.filter(function(r){return r[0];}).map(eppFilaCatalogoAObjeto);
      return EPP_CATALOGO;
    }).catch(function(){
      // Último respaldo: si ni siquiera se pudo crear la hoja (sin
      // conexión, por ejemplo), seguimos con los 6 de siempre en
      // memoria para que la pantalla no quede vacía.
      EPP_CATALOGO = [
        {item:"Casco",icono:"⛑",tipo:"devuelve",requiereTalla:false,activo:true,orden:1},
        {item:"Chaleco",icono:"🦺",tipo:"devuelve",requiereTalla:false,activo:true,orden:2},
        {item:"Lentes",icono:"🥽",tipo:"reincidente",requiereTalla:false,activo:true,orden:3},
        {item:"Zapato",icono:"👞",tipo:"unico",requiereTalla:true,activo:true,orden:4},
        {item:"Camisa",icono:"👕",tipo:"acumulable",requiereTalla:true,activo:true,orden:5},
        {item:"Guantes",icono:"🧤",tipo:"reincidente",requiereTalla:false,activo:true,orden:6}
      ];
      return EPP_CATALOGO;
    });
  }).then(function(cat){
    eppPoblarSelectsCatalogo();
    return cat;
  });
}

function eppFilaCatalogoAObjeto(r){
  return {
    item:(r[0]||"").toString(), icono:r[1]||"🦺", tipo:r[2]||"unico",
    requiereTalla:(r[3]||"").toString().toLowerCase()==="si",
    activo:(r[4]===undefined || r[4]==="" ) ? true : (r[4]||"").toString().toLowerCase()==="si",
    orden:Number(r[5])||99
  };
}

function eppCatalogoActivos(){
  return (EPP_CATALOGO||[]).filter(function(c){return c.activo;}).sort(function(a,b){return a.orden-b.orden;});
}

function eppRequiereTalla(item){
  var c = (EPP_CATALOGO||[]).find(function(c){return c.item===item;});
  return c ? c.requiereTalla : false;
}

function eppEtiqueta(item){
  var c = (EPP_CATALOGO||[]).find(function(c){return c.item===item;});
  return c ? (c.icono+" "+c.item) : item;
}

// Llena los <select> de filtro (Reporte general) y de alta de stock
// con los ítems activos del catálogo, en vez de <option> fijas.
function eppPoblarSelectsCatalogo(){
  var activos = eppCatalogoActivos();
  var opts = activos.map(function(c){ return "<option value=\""+esc(c.item)+"\">"+esc(c.icono+" "+c.item)+"</option>"; }).join("");
  var selRep = document.getElementById("eppRepItem");
  if(selRep){ var actualRep = selRep.value; selRep.innerHTML = "<option value=''>Todos los EPP</option>" + opts; selRep.value = actualRep; }
  var selStock = document.getElementById("eppStockItem");
  if(selStock){ var actualStock = selStock.value; selStock.innerHTML = opts; if(actualStock) selStock.value = actualStock; }
}

function cerrarEPP(){
  document.getElementById("eppScreen").style.display="none";
  document.querySelector(".tabs").style.display="flex";
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display=""; });
  goTab(NAV_TAB_ACTUAL); // vuelve a la pestaña en la que estabas
}

function eppGoTab(n){
  document.getElementById("eppScrPersona").style.display = n===0?"block":"none";
  document.getElementById("eppScrReporte").style.display = n===1?"block":"none";
  document.getElementById("eppScrStock").style.display = n===2?"block":"none";
  document.getElementById("eppBtnPersona").className = "btn "+(n===0?"b-ok":"b-sec")+" b-sm";
  document.getElementById("eppBtnReporte").className = "btn "+(n===1?"b-ok":"b-sec")+" b-sm";
  document.getElementById("eppBtnStock").className = "btn "+(n===2?"b-ok":"b-sec")+" b-sm";
  if(n===1) eppCargarTodos(); // siempre al día, también con entregas hechas desde otro celular
  if(n===2) eppCargarStock();
}

// ── Buscar trabajador (Paso 1, igual patrón que otros módulos) ──
var eppTBusca;

function eppBuscarTrabajadores(){
  clearTimeout(eppTBusca);
  var v = document.getElementById("eppBuscar").value.trim();
  var d = document.getElementById("eppSugTrab");
  if(v.length<1){ d.style.display="none"; return; }
  eppTBusca = setTimeout(function(){
    sheetsGet(SHEET("Personal")+"!A2:J").then(function(resp){
      var rows = resp.values || [];
      var q = v.toLowerCase();
      var res = [];
      for(var i=0;i<rows.length && res.length<8;i++){
        var cod=(rows[i][0]||"").toString().trim();
        var nom=(rows[i][1]||"").toString().trim();
        var est=(rows[i][6]||"Activo").toString().trim();
        var foto=(rows[i][9]||"").toString().trim();
        if(!cod) continue;
        if(cod.toLowerCase().indexOf(q)>=0 || nom.toLowerCase().indexOf(q)>=0){
          res.push({codigo:cod, nombre:nom||cod, estado:est, fotoId:foto});
        }
      }
      if(!res.length){ d.style.display="none"; return; }
      res.forEach(function(t){ EPP_CANDIDATOS_FOTO[t.codigo]=t.fotoId; EPP_CANDIDATOS_ESTADO[t.codigo]=t.estado; });
      d.innerHTML = res.map(function(t){
        var mini=t.fotoId
          ?"<img src='"+urlFotoDrive(t.fotoId,60)+"' style='width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
          :"<div style='width:30px;height:30px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0'>👤</div>";
        var badgeInactivo = (t.estado||"Activo").toLowerCase()==="inactivo" ? " <span style='font-size:9px;color:#C00000;font-weight:bold'>· INACTIVO</span>" : "";
        return "<div class='sug-item' style='display:flex;align-items:center;gap:8px' onclick='eppSelTrab(\""+escJS(t.codigo)+"\",\""+escJS(t.nombre)+"\")'>"+
          mini+"<div><div class='sug-nom'>"+t.nombre+badgeInactivo+"</div><div class='sug-cod'>"+t.codigo+"</div></div></div>";
      }).join("");
      d.style.display="block";
    }).catch(function(){ d.style.display="none"; });
  },300);
}

var EPP_CANDIDATOS_FOTO = {};

var EPP_CANDIDATOS_ESTADO = {};

function eppFilaAObjeto(r){
  return {
    fecha: r[0] ? new Date(r[0]) : null,
    fechaStr: r[0] ? new Date(r[0]).toLocaleDateString("es-GT") : "",
    codigoTrabajador: (r[1]||"").toString().trim(), nombreTrabajador: r[2]||"",
    item: r[3]||"", tipoMovimiento: r[4]||"",
    cantidad: Number(r[5])||1, talla: r[6]||"", motivo: r[7]||"",
    observaciones: r[8]||"",
    idMovimiento: r[10]||"", idAnulado: r[11]||""
  };
}

// eppFiltrarVigentes — quita del cálculo cualquier movimiento que haya
// sido anulado, y las propias filas de "Anulacion" (esas solo sirven
// para marcar, no son un evento de EPP en sí). El registro original
// sigue existiendo en la hoja para auditoría, simplemente no cuenta.
function eppFiltrarVigentes(movs){
  var anulados = {};
  movs.forEach(function(m){ if(m.tipoMovimiento==="Anulacion" && m.idAnulado) anulados[m.idAnulado]=true; });
  return movs.filter(function(m){ return m.tipoMovimiento!=="Anulacion" && !anulados[m.idMovimiento]; });
}

function eppSelTrab(codigo, nombre){
  EPP_TRAB_ACTUAL = {codigo:codigo, nombre:nombre, fotoId: EPP_CANDIDATOS_FOTO[codigo]||"", estado: EPP_CANDIDATOS_ESTADO[codigo]||"Activo"};
  document.getElementById("eppSugTrab").style.display="none";
  document.getElementById("eppBuscar").value = nombre;
  var cont = document.getElementById("eppFormContainer");
  cont.innerHTML = "<div class='card'><div class='loading'>🔄 Cargando historial de "+nombre+"...</div></div>";

  sheetsGet("EPP_Movimientos!A2:L").then(function(resp){
    var rows = resp.values || [];
    EPP_MOVS_TRAB = rows.map(eppFilaAObjeto).filter(function(m){
      return m.fecha && m.codigoTrabajador.toLowerCase() === codigo.toLowerCase();
    });
    eppRenderEstado();
  }).catch(function(err){
    cont.innerHTML = "<div class='card'><div class='msg-err'>"+err.message+"</div></div>";
  });
}

// ── Cálculo de estado a partir del historial (nunca se guarda fijo) ──
function eppEstadoItemSimple(item){
  // Casco y Chaleco: se pueden entregar y devolver más de una vez.
  var movs = eppFiltrarVigentes(EPP_MOVS_TRAB).filter(function(m){ return m.item===item; }).sort(function(a,b){return a.fecha-b.fecha;});
  var entregado=false, fechaEntregado="", fechaDevuelto="";
  movs.forEach(function(m){
    if(m.tipoMovimiento==="Entrega"){ entregado=true; fechaEntregado=m.fechaStr; fechaDevuelto=""; }
    if(m.tipoMovimiento==="Devolucion"){ entregado=false; fechaDevuelto=m.fechaStr; }
  });
  return {entregado:entregado, fechaEntregado:fechaEntregado, fechaDevuelto:fechaDevuelto};
}

function eppEstadoSoloEntrega(item){
  // Lentes y Zapato: se quedan con el trabajador, sin devolución.
  var movs = eppFiltrarVigentes(EPP_MOVS_TRAB).filter(function(m){ return m.item===item; }).sort(function(a,b){return b.fecha-a.fecha;});
  if(!movs.length) return {entregado:false};
  return {entregado:true, fecha:movs[0].fechaStr, talla:movs[0].talla};
}

function eppEstadoAcumulable(item){
  // Ítems tipo "acumulable" (ej. Camisa): se suman todas las entregas.
  var movs = eppFiltrarVigentes(EPP_MOVS_TRAB).filter(function(m){ return m.item===item; }).sort(function(a,b){return a.fecha-b.fecha;});
  var total = 0;
  movs.forEach(function(m){ total+=m.cantidad; });
  return {total:total, entregas:movs};
}

function eppEstadoReincidente(item){
  // Ítems tipo "reincidente" (ej. Guantes): historial completo de
  // cambios, con motivo, para ver reincidencia.
  var movs = eppFiltrarVigentes(EPP_MOVS_TRAB).filter(function(m){ return m.item===item; }).sort(function(a,b){return b.fecha-a.fecha;});
  return {total:movs.length, ultimo:movs[0]||null, historial:movs};
}

// ── Registrar un movimiento (llamado desde los botones de acción) ──
function eppRegistrar(item, tipoMovimiento, extra){
  var btn = _botonDelEvento();
  if(tipoMovimiento==="Entrega" && (EPP_TRAB_ACTUAL.estado||"Activo").toLowerCase()==="inactivo"){
    alert("Este trabajador está Inactivo — no se le pueden registrar entregas nuevas de EPP.");
    return;
  }
  if(!_bloquearBoton(btn, "eppRegistrar")) return;
  extra = extra || {};
  gasPost("registrarMovimientoEPP", {
    codigoTrabajador: EPP_TRAB_ACTUAL.codigo,
    nombreTrabajador: EPP_TRAB_ACTUAL.nombre,
    item: item,
    tipoMovimiento: tipoMovimiento,
    cantidad: extra.cantidad || 1,
    talla: extra.talla || "",
    motivo: extra.motivo || "",
    observaciones: extra.observaciones || "",
    fecha: extra.fecha || "",
    idAnulado: extra.idAnulado || "",
    registradoPor: (SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    _liberarBoton(btn, "eppRegistrar");
    if(r && r.ok){
      EPP_MOVS_TODOS = null; // invalida la caché del reporte general
      eppSelTrab(EPP_TRAB_ACTUAL.codigo, EPP_TRAB_ACTUAL.nombre);
    } else {
      alert("❌ "+(r&&r.error||"No se pudo guardar"));
    }
  }).catch(function(e){ _liberarBoton(btn, "eppRegistrar"); alert("❌ "+e.message); });
}

// eppAccionSimple — Casco/Chaleco (tipo "devuelve"): no piden talla ni
// motivo, así que se registra de UN toque, con la fecha de hoy — sin
// diálogos encadenados. Para corregir fecha/observaciones de un
// registro ya hecho, o para dejar uno con fecha atrasada, está el
// botón 🗓️ (eppAccionSimpleFecha) que sí abre un formulario en línea.
function eppAccionSimple(item, tipoMovimiento){
  eppRegistrar(item, tipoMovimiento, {fecha:new Date().toISOString().slice(0,10), observaciones:""});
}

// eppAccionSimpleFecha — variante con formulario en línea (fecha +
// observaciones) para cuando la entrega/devolución no fue hoy, o hace
// falta dejar un comentario.
function eppAccionSimpleFecha(item, tipoMovimiento, etiqueta){
  eppMostrarFormRapido(item, tipoMovimiento, "devuelve", false, etiqueta);
}

// eppAccionGenerica — reemplaza las funciones que antes existían una
// por cada ítem (eppEntregarLentes, eppEntregarZapato, etc.). Ahora el
// comportamiento (si pide talla, si pide cantidad, si pide motivo) sale
// del "tipo" del ítem en el catálogo, así que un ítem de EPP nuevo
// (ej. un brazalete) no necesita ninguna función propia — alcanza con
// darlo de alta en Admin → Catálogo de EPP con el tipo correcto.
// En vez de encadenar 2-3 prompt() (talla, cantidad/motivo, fecha,
// comentario) — lentos y fáciles de tocar mal en el celular — se
// muestra UN solo formulario en línea con todo junto.
function eppAccionGenerica(item, tipo, requiereTalla){
  eppMostrarFormRapido(item, "Entrega", tipo, requiereTalla, "Entrega de "+item);
}

// eppMostrarFormRapido — arma el formulario en línea, insertándolo
// justo arriba de la lista de EPP, con solo los campos que ese tipo
// de ítem necesita (talla / cantidad / motivo), fecha de hoy por
// defecto y observaciones opcionales.
function eppMostrarFormRapido(item, tipoMovimiento, tipo, requiereTalla, etiquetaAccion){
  var hoy = new Date().toISOString().slice(0,10);
  var camposExtra = "";
  if(requiereTalla) camposExtra += "<input type='text' id='eppFTalla' placeholder='Talla de "+esc(item)+" *'>";
  if(tipo==="acumulable") camposExtra += "<input type='number' id='eppFCantidad' placeholder='Cantidad' value='1' min='1'>";
  if(tipo==="reincidente") camposExtra +=
    "<select id='eppFMotivo'>"+
      "<option value='Entrega inicial'>Entrega inicial</option>"+
      "<option value='Dañado por uso'>Dañado por uso</option>"+
      "<option value='Extraviado'>Extraviado</option>"+
      "<option value='Otro'>Otro</option>"+
    "</select>";
  var html = "<div class='card' id='eppFormRapido' style='border:2px solid #2D6A4F'>"+
    "<div class='ctit' style='margin:0 0 6px'>"+esc(etiquetaAccion)+"</div>"+
    camposExtra+
    "<input type='date' id='eppFFecha' value='"+hoy+"'>"+
    "<input type='text' id='eppFObs' placeholder='Observaciones (opcional)'>"+
    "<div style='display:flex;gap:8px'>"+
      "<button class='btn b-ok' style='flex:1' onclick='eppConfirmarFormRapido(\""+escJS(item)+"\",\""+tipoMovimiento+"\",\""+tipo+"\")'>✅ Confirmar</button>"+
      "<button class='btn b-sec' style='flex:1' onclick='eppCancelarFormRapido()'>Cancelar</button>"+
    "</div></div>";
  eppCancelarFormRapido();
  document.getElementById("eppFormContainer").insertAdjacentHTML("afterbegin", html);
  document.getElementById("eppFormRapido").scrollIntoView({behavior:"smooth", block:"center"});
}

function eppCancelarFormRapido(){
  var f = document.getElementById("eppFormRapido");
  if(f) f.remove();
}

function eppConfirmarFormRapido(item, tipoMovimiento, tipo){
  var talla = "";
  var campoTalla = document.getElementById("eppFTalla");
  if(campoTalla){
    talla = campoTalla.value.trim();
    if(!talla){ alert("Falta la talla de "+item); return; }
  }
  var cantidad = 1;
  if(tipo==="acumulable"){
    cantidad = (document.getElementById("eppFCantidad")||{value:"1"}).value;
    if(!Number(cantidad) || Number(cantidad)<=0){ alert("Cantidad inválida"); return; }
  }
  var motivo = tipo==="reincidente" ? (document.getElementById("eppFMotivo")||{value:""}).value : "";
  var hoy = new Date().toISOString().slice(0,10);
  var fecha = (document.getElementById("eppFFecha")||{value:hoy}).value || hoy;
  var obs = (document.getElementById("eppFObs")||{value:""}).value.trim();
  eppCancelarFormRapido();
  eppRegistrar(item, tipoMovimiento, {talla:talla, cantidad:cantidad, motivo:motivo, fecha:fecha, observaciones:obs});
}

// eppAnular — NUNCA borra: agrega un registro de anulación que hace
// que el estado calculado ignore el movimiento original, dejando
// rastro completo de qué se corrigió, cuándo y por qué (mismo
// criterio que usan las empresas grandes para su control de activos).
function eppAnular(idMovimiento, item, descripcion){
  if(!confirm("¿Anular este registro?\n\n"+descripcion+"\n\nNo se borra — queda marcado como anulado en el historial, dejando rastro de la corrección."))
    return;
  var motivo = prompt("Motivo de la anulación (ej. 'Registrado por error, duplicado'):","");
  if(motivo===null) return;
  eppRegistrar(item, "Anulacion", {idAnulado:idMovimiento, motivo:motivo.trim()});
}

// ── Bloques visuales reutilizables ──
function eppBloqueDevuelve(item, etiqueta, estado, bloquearEntrega){
  var tipoMov = estado.entregado ? "Devolucion" : "Entrega";
  var etiquetaAccion = (estado.entregado?"Devolución de ":"Entrega de ")+etiqueta.replace(/^[^ ]+ /,"");
  var puedeEntregar = !bloquearEntrega || estado.entregado; // devolver siempre se permite, aunque esté inactivo
  var accionBtn = estado.entregado
    ? "<button class='btn b-sec b-sm' onclick='eppAccionSimple(\""+item+"\",\"Devolucion\")'>↩️ Devolver</button>"
    : (puedeEntregar ? "<button class='btn b-ok b-sm' onclick='eppAccionSimple(\""+item+"\",\"Entrega\")'>✅ Entregar</button>" : "");
  var linkFecha = puedeEntregar
    ? "<div style='font-size:10px;color:#2D6A4F;text-align:right;margin-top:2px;cursor:pointer' onclick='eppAccionSimpleFecha(\""+item+"\",\""+tipoMov+"\",\""+escJS(etiquetaAccion)+"\")'>🗓️ Otra fecha / comentario</div>"
    : "";
  var estadoTxt = estado.entregado ? "Entregado ("+estado.fechaEntregado+")" : (estado.fechaDevuelto ? "Devuelto ("+estado.fechaDevuelto+")" : "No entregado");
  return "<div style='padding:8px 0;border-bottom:1px solid #f2f2f2'>"+
    "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px'>"+
    "<div><div style='font-weight:bold;font-size:13px'>"+etiqueta+"</div><div style='font-size:11px;color:#888'>"+estadoTxt+"</div></div>"+
    accionBtn+
    "</div>"+linkFecha+
  "</div>";
}

function eppBloqueSolo(item, etiqueta, estado, tipo, requiereTalla, bloquearEntrega){
  var accionBtn = (estado.entregado || bloquearEntrega) ? "" : "<button class='btn b-ok b-sm' onclick='eppAccionGenerica(\""+item+"\",\""+tipo+"\","+(requiereTalla?"true":"false")+")'>✅ Entregar</button>";
  var estadoTxt = estado.entregado ? "Entregado ("+estado.fecha+")"+(estado.talla?" — talla "+estado.talla:"") : "No entregado";
  return "<div style='display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f2f2f2;gap:8px'>"+
    "<div><div style='font-weight:bold;font-size:13px'>"+etiqueta+"</div><div style='font-size:11px;color:#888'>"+estadoTxt+"</div></div>"+
    accionBtn+
  "</div>";
}

function eppRenderEstado(){
  var cont = document.getElementById("eppFormContainer");
  var bloquearEntrega = (EPP_TRAB_ACTUAL.estado||"Activo").toLowerCase()==="inactivo";
  var fotoHdr = EPP_TRAB_ACTUAL.fotoId
    ? "<img src='"+urlFotoDrive(EPP_TRAB_ACTUAL.fotoId,100)+"' style='width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
    : "<div style='width:42px;height:42px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0'>👤</div>";
  var html = "<div class='card'><div style='display:flex;align-items:center;gap:8px'>"+fotoHdr+"<div class='ctit' style='margin:0'>"+EPP_TRAB_ACTUAL.nombre+" · "+EPP_TRAB_ACTUAL.codigo+"</div></div>";
  if(bloquearEntrega){
    html += "<div class='msg-err' style='margin:8px 0'>⚠️ Trabajador INACTIVO — no se pueden registrar entregas nuevas. Sí se puede recibir devolución de lo que ya tenía asignado.</div>";
  }
  html += "<div style='font-size:11px;color:#888;margin:8px 0 6px'>El comportamiento de cada ítem (si se devuelve, si pide talla) se define en Admin → Catálogo de EPP.</div>";

  eppCatalogoActivos().forEach(function(c){
    var etiqueta = c.icono+" "+c.item;
    if(c.tipo==="devuelve"){
      html += eppBloqueDevuelve(c.item, etiqueta, eppEstadoItemSimple(c.item), bloquearEntrega);
    } else if(c.tipo==="unico"){
      html += eppBloqueSolo(c.item, etiqueta, eppEstadoSoloEntrega(c.item), c.tipo, c.requiereTalla, bloquearEntrega);
    } else if(c.tipo==="acumulable"){
      var ac = eppEstadoAcumulable(c.item);
      html += "<div style='padding:8px 0;border-bottom:1px solid #f2f2f2'>"+
        "<div style='font-weight:bold;font-size:13px'>"+etiqueta+" — Total entregado: "+ac.total+"</div>"+
        (ac.entregas.length ? "<div style='font-size:11px;color:#888;margin:3px 0'>"+ac.entregas.map(function(m){return m.fechaStr+": "+m.cantidad+(m.talla?" (talla "+m.talla+")":"");}).join(" · ")+"</div>" : "")+
        (bloquearEntrega ? "" : "<button class='btn b-sec b-sm' onclick='eppAccionGenerica(\""+c.item+"\",\"acumulable\","+(c.requiereTalla?"true":"false")+")'>➕ Registrar entrega de "+c.item.toLowerCase()+"</button>")+
      "</div>";
    } else if(c.tipo==="reincidente"){
      var rc = eppEstadoReincidente(c.item);
      html += "<div style='padding:8px 0;border-bottom:1px solid #f2f2f2'>"+
        "<div style='font-weight:bold;font-size:13px'>"+etiqueta+" — Cambios registrados: "+rc.total+"</div>"+
        (rc.ultimo ? "<div style='font-size:11px;color:#888;margin:3px 0'>Último: "+rc.ultimo.fechaStr+" — "+(rc.ultimo.motivo||"Entrega inicial")+"</div>" : "")+
        (bloquearEntrega ? "" : "<button class='btn b-sec b-sm' onclick='eppAccionGenerica(\""+c.item+"\",\"reincidente\","+(c.requiereTalla?"true":"false")+")'>➕ Registrar entrega/cambio de "+c.item.toLowerCase()+"</button>")+
      "</div>";
    }
  });
  html += "</div>";

  html += "<div class='card'><button class='btn b-sec b-sm' style='width:100%' onclick='eppToggleHistorialCompleto()'>📜 Ver historial completo ("+EPP_MOVS_TRAB.length+")</button>"+
    "<div id='eppHistCompleto' style='display:none;margin-top:8px'></div></div>";

  html += "<div class='card'><button class='btn b-ok' style='width:100%' onclick='eppGenerarPDFPersona()'>📄 Generar hoja de responsabilidad (PDF)</button></div>";

  cont.innerHTML = html;
}

function eppToggleHistorialCompleto(){
  var div = document.getElementById("eppHistCompleto");
  if(!div) return;
  if(div.style.display==="none"){
    var anulados = {};
    EPP_MOVS_TRAB.forEach(function(m){ if(m.tipoMovimiento==="Anulacion" && m.idAnulado) anulados[m.idAnulado]=true; });
    var ordenado = EPP_MOVS_TRAB.slice().filter(function(m){ return m.tipoMovimiento!=="Anulacion"; }).sort(function(a,b){return b.fecha-a.fecha;});
    div.innerHTML = ordenado.length ? ordenado.map(function(m){
      var fueAnulado = m.idMovimiento && anulados[m.idMovimiento];
      var texto = "<b>"+m.fechaStr+"</b> — "+m.item+" ("+m.tipoMovimiento+")"+(m.cantidad>1?" x"+m.cantidad:"")+
        (m.talla?" · talla "+m.talla:"")+(m.motivo?" · "+m.motivo:"")+(m.observaciones?" · 📝 "+m.observaciones:"");
      var btnAnular = fueAnulado
        ? "<span style='font-size:10px;color:#C00000;font-weight:bold'>ANULADO</span>"
        : (m.idMovimiento ? "<button class='btn b-danger b-sm' style='flex-shrink:0' onclick='eppAnular(\""+escJS(m.idMovimiento)+"\",\""+escJS(m.item)+"\",\""+escJS(m.fechaStr+" - "+m.item+" ("+m.tipoMovimiento+")")+"\")'>Anular</button>" : "");
      return "<div style='padding:5px 0;border-bottom:1px solid #f2f2f2;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:6px'>"+
        "<span style='"+(fueAnulado?"text-decoration:line-through;color:#999":"")+"'>"+texto+"</span>"+btnAnular+
      "</div>";
    }).join("") : "<div style='font-size:12px;color:#888'>Sin movimientos todavía</div>";
    div.style.display="block";
  } else {
    div.style.display="none";
  }
}

// ── PDF de responsabilidad individual (con espacio de firma) ──
function eppGenerarPDFPersona(){
  if(!EPP_TRAB_ACTUAL) return;
  var filas = eppFiltrarVigentes(EPP_MOVS_TRAB).sort(function(a,b){return a.fecha-b.fecha;}).map(function(m){
    return [m.fechaStr, m.item, m.tipoMovimiento==="Entrega"?"Entrega":"Devolución", m.cantidad, m.talla||"—", m.motivo||"—"];
  });
  if(!filas.length){ alert("Este trabajador todavía no tiene ningún movimiento de EPP registrado."); return; }

  var avisoDiv = document.createElement("div");
  avisoDiv.className="card";
  avisoDiv.innerHTML = "<div class='loading'>🔄 Generando PDF...</div>";
  document.getElementById("eppFormContainer").appendChild(avisoDiv);
  avisoDiv.scrollIntoView({behavior:"smooth"});

  // Si el trabajador tiene foto cargada, se trae en base64 ANTES de armar
  // el PDF — jsPDF necesita los bytes de la imagen, no solo la URL.
  var fotoPromise = EPP_TRAB_ACTUAL.fotoId
    ? gasPostBody("obtenerFotoBase64",{fileId:EPP_TRAB_ACTUAL.fotoId}).catch(function(){ return null; })
    : Promise.resolve(null);

  fotoPromise.then(function(fotoRes){
    var doc = new window.jspdf.jsPDF({unit:"mm", format:"letter"});
    doc.setFontSize(14); doc.setFont(undefined,"bold"); doc.setTextColor(27,67,50);
    doc.text("Hoja de Responsabilidad de EPP", 14, 15);
    doc.setFontSize(9); doc.setFont(undefined,"normal"); doc.setTextColor(100,100,100);
    doc.text(CONFIG.nombreProyecto+" · "+CONFIG.empresa+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal, 14, 21);

    // Foto del trabajador, arriba a la derecha, con doble anillo
    // (verde institucional + dorado) para que combine con el carnet.
    // Si no tiene foto cargada, se dibuja un marcador discreto en su
    // lugar en vez de dejar el espacio vacío.
    var fs=24, fcx=190-fs/2, fcy=12+fs/2;
    if(fotoRes && fotoRes.ok){
      try{
        doc.saveGraphicsState();
        doc.circle(fcx, fcy, fs/2, null);
        doc.clip();
        doc.discardPath();
        doc.addImage("data:"+fotoRes.mimeType+";base64,"+fotoRes.base64, "JPEG", fcx-fs/2, fcy-fs/2, fs, fs);
        doc.restoreGraphicsState();
        doc.setDrawColor(27,67,50); doc.setLineWidth(0.7);
        doc.circle(fcx, fcy, fs/2);
        doc.setDrawColor(244,185,66); doc.setLineWidth(0.3);
        doc.circle(fcx, fcy, fs/2+0.9);
      }catch(e){ /* si la imagen no es compatible, se omite y sigue el resto del PDF */ }
    } else {
      doc.setFillColor(240,244,248);
      doc.circle(fcx, fcy, fs/2, "F");
      doc.setDrawColor(183,228,199); doc.setLineWidth(0.4);
      doc.circle(fcx, fcy, fs/2);
      doc.setFontSize(7); doc.setTextColor(150,150,150);
      doc.text("SIN FOTO", fcx, fcy+1, {align:"center"});
    }

    doc.setFontSize(11); doc.setTextColor(0,0,0); doc.setFont(undefined,"bold");
    doc.text("Trabajador: "+EPP_TRAB_ACTUAL.nombre, 14, 32);
    doc.text("Código: "+EPP_TRAB_ACTUAL.codigo, 14, 38);
    doc.setFont(undefined,"normal");

    doc.autoTable({
      startY: 44,
      head: [["Fecha","EPP","Movimiento","Cant.","Talla","Motivo"]],
      body: filas,
      styles:{fontSize:8},
      headStyles:{fillColor:[27,67,50], textColor:255}
    });

    var y = doc.lastAutoTable.finalY + 25;
    if(y > 255){ doc.addPage(); y = 30; }
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
    doc.line(14, y, 90, y);
    doc.line(120, y, 196, y);
    doc.setFontSize(9);
    doc.text("Firma del trabajador", 14, y+5);
    doc.text("Firma de bodega/entrega", 120, y+5);
    doc.setFontSize(8); doc.setTextColor(120,120,120);
    doc.text("Fecha de firma: ______________________", 14, y+14);

    var fg=new Date();
    var nombreArchivo="EPP_"+EPP_TRAB_ACTUAL.codigo.replace(/[\/\\]/g,"-")+"_"+fg.getFullYear()+"-"+String(fg.getMonth()+1).padStart(2,"0")+"-"+String(fg.getDate()).padStart(2,"0")+".pdf";
    mostrarVistaPreviaPDF(doc, nombreArchivo, avisoDiv, filas.length, "movimientos de EPP");
  });
  avisoDiv.scrollIntoView({behavior:"smooth"});
}

// ── Reporte general (todos los trabajadores, con filtros) ──
var EPP_FOTOS_MAP = null;

function eppCargarTodos(){
  document.getElementById("eppRepLista").innerHTML = "<div class='loading'>🔄 Cargando...</div>";
  Promise.all([
    sheetsGet("EPP_Movimientos!A2:L"),
    sheetsGet(SHEET("Personal")+"!A2:J").catch(function(){ return {values:[]}; })
  ]).then(function(results){
    var rows = results[0].values || [];
    EPP_MOVS_TODOS = rows.map(eppFilaAObjeto).filter(function(m){ return m.fecha; });
    EPP_FOTOS_MAP = {};
    (results[1].values||[]).forEach(function(r){
      var cod=(r[0]||"").toString().trim().toLowerCase();
      var foto=(r[9]||"").toString().trim();
      if(cod && foto) EPP_FOTOS_MAP[cod]=foto;
    });
    eppPoblarFiltroTrab();
    eppCalcularReporte();
  }).catch(function(){
    document.getElementById("eppRepLista").innerHTML = "<div class='msg-err'>No se pudo cargar (¿ya registró algún EPP?)</div>";
  });
}

function eppPoblarFiltroTrab(){
  var sel = document.getElementById("eppRepTrab");
  var actual = sel.value;
  var nombres = {};
  EPP_MOVS_TODOS.forEach(function(m){ if(m.nombreTrabajador) nombres[m.nombreTrabajador]=true; });
  sel.innerHTML = "<option value=''>Todos los trabajadores</option>" +
    Object.keys(nombres).sort().map(function(n){ return "<option value=\""+esc(n)+"\">"+n+"</option>"; }).join("");
  if(nombres[actual]) sel.value = actual;
}

// eppActualizarFiltroTalla — el filtro de talla solo tiene sentido para
// Camisa y Zapato (los únicos EPP con talla variable), así que se
// muestra/oculta según el ítem elegido, y se llena con las tallas que
// REALMENTE existen en los datos (no una lista fija) — si alguien
// registró "38" y "40" para zapato, son esas las que aparecen acá.
function eppActualizarFiltroTalla(){
  var itemSel = document.getElementById("eppRepItem").value;
  var selTalla = document.getElementById("eppRepTalla");
  if(itemSel!=="Camisa" && itemSel!=="Zapato"){
    selTalla.style.display="none";
    selTalla.value="";
    return;
  }
  var actual = selTalla.value;
  var tallas = {};
  (EPP_MOVS_TODOS||[]).forEach(function(m){
    if(m.item===itemSel) tallas[m.talla||"Sin talla"]=true;
  });
  selTalla.innerHTML = "<option value=''>Todas las tallas</option>" +
    Object.keys(tallas).sort().map(function(t){ return "<option value=\""+esc(t)+"\">"+t+"</option>"; }).join("");
  if(tallas[actual]) selTalla.value = actual;
  selTalla.style.display="block";
}

function eppFiltrarTodos(){
  var desdeVal = document.getElementById("eppRepDesde").value;
  var hastaVal = document.getElementById("eppRepHasta").value;
  var desde = desdeVal ? new Date(desdeVal+"T00:00:00") : null;
  var hasta = hastaVal ? new Date(hastaVal+"T23:59:59") : null;
  var itemSel = document.getElementById("eppRepItem").value;
  var tallaSel = (document.getElementById("eppRepTalla")||{value:""}).value;
  var trabSel = document.getElementById("eppRepTrab").value;
  var movSel = (document.getElementById("eppRepMovimiento")||{value:""}).value;
  return eppFiltrarVigentes(EPP_MOVS_TODOS||[]).filter(function(m){
    if(desde && m.fecha < desde) return false;
    if(hasta && m.fecha > hasta) return false;
    if(itemSel && m.item !== itemSel) return false;
    if(tallaSel && (m.talla||"Sin talla") !== tallaSel) return false;
    if(trabSel && m.nombreTrabajador !== trabSel) return false;
    if(movSel && m.tipoMovimiento !== movSel) return false;
    return true;
  });
}

function eppCalcularReporte(){
  if(!EPP_MOVS_TODOS) return;
  var filtrados = eppFiltrarTodos().sort(function(a,b){ return b.fecha-a.fecha; });

  document.getElementById("eppRepLista").innerHTML = filtrados.length ? filtrados.map(function(m){
    var foto=(EPP_FOTOS_MAP||{})[(m.codigoTrabajador||"").toLowerCase()];
    var mini=foto
      ?"<img src='"+urlFotoDrive(foto,50)+"' style='width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
      :"<div style='width:24px;height:24px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0'>👤</div>";
    return "<div style='display:flex;align-items:center;gap:7px;padding:6px 0;border-bottom:1px solid #f2f2f2;font-size:12px'>"+mini+
      "<span><b>"+m.fechaStr+"</b> — "+m.nombreTrabajador+" — "+m.item+" ("+m.tipoMovimiento+")"+
      (m.cantidad>1?" x"+m.cantidad:"")+(m.talla?" · talla "+m.talla:"")+(m.motivo?" · "+m.motivo:"")+
      "</span></div>";
  }).join("") : "<div style='font-size:12px;color:#888'>Sin registros con ese filtro</div>";

  var itemsReinc = (EPP_CATALOGO||[]).filter(function(c){return c.tipo==="reincidente";}).map(function(c){return c.item;});
  var reinc = {};
  eppFiltrarVigentes(EPP_MOVS_TODOS).filter(function(m){ return itemsReinc.indexOf(m.item)>=0 && m.motivo && m.motivo!=="Entrega inicial"; })
    .forEach(function(m){ reinc[m.nombreTrabajador] = (reinc[m.nombreTrabajador]||0)+1; });
  var listaReinc = Object.keys(reinc).sort(function(a,b){return reinc[b]-reinc[a];});
  document.getElementById("eppReincidencia").innerHTML = listaReinc.length ? listaReinc.map(function(n){
    return "<div style='display:flex;justify-content:space-between;padding:4px 0;font-size:12px'><span>"+n+"</span><b>"+reinc[n]+" cambio(s)</b></div>";
  }).join("") : "<div style='font-size:12px;color:#888'>Sin cambios por daño/extravío registrados</div>";
}

function eppExportarReportePDF(){
  var aviso = document.getElementById("eppRepAviso");
  var filtrados = eppFiltrarTodos().sort(function(a,b){ return a.fecha-b.fecha; });
  if(!filtrados.length){ aviso.innerHTML="<div class='msg-err'>No hay registros con ese filtro.</div>"; return; }
  aviso.innerHTML = "<div class='msg-ok'>🔄 Generando PDF...</div>";

  // Trae en base64 la foto de cada trabajador único que aparece en el
  // reporte, ANTES de armar el PDF — jsPDF necesita los bytes de la
  // imagen, no solo la URL de Drive. Se piden en paralelo y solo una
  // vez por trabajador (no una vez por movimiento).
  var fotosAPedir = {};
  filtrados.forEach(function(m){
    var cod=(m.codigoTrabajador||"").toLowerCase();
    var fid=(EPP_FOTOS_MAP||{})[cod];
    if(cod && fid) fotosAPedir[cod]=fid;
  });
  var fotoCache = {};
  var pendientes = Object.keys(fotosAPedir).map(function(cod){
    return gasPostBody("obtenerFotoBase64",{fileId:fotosAPedir[cod]}).then(function(r){
      if(r && r.ok) fotoCache[cod]=r;
    }).catch(function(){});
  });

  Promise.all(pendientes).then(function(){
    var doc = new window.jspdf.jsPDF({unit:"mm", format:"letter"});
    doc.setFontSize(14); doc.setFont(undefined,"bold"); doc.setTextColor(27,67,50);
    doc.text("Historial de EPP — "+CONFIG.nombreProyecto, 14, 15);
    doc.setFontSize(9); doc.setFont(undefined,"normal"); doc.setTextColor(100,100,100);
    doc.text(CONFIG.empresa+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal+" · "+filtrados.length+" movimientos", 14, 21);

    var siguienteY = 26;

    // Consolidado por talla — SOLO tiene sentido para Camisa y Zapato,
    // que son los únicos EPP con talla variable. Se muestra primero,
    // antes del detalle línea por línea, para dar el panorama rápido.
    //
    // Se arma en DOS tablas lado a lado (camisa a la izquierda, zapato
    // a la derecha) en vez de una sola lista vertical: antes, con una
    // sola tabla angosta, quedaba media hoja en blanco a la derecha y
    // el consolidado se comía casi una página entera. Así ocupa
    // aproximadamente la mitad del alto y aprovecha todo el ancho.
    var conTalla = filtrados.filter(function(m){ return (m.item==="Camisa"||m.item==="Zapato") && m.tipoMovimiento==="Entrega"; });
    if(conTalla.length){
      var porItem = {Camisa:{}, Zapato:{}};
      conTalla.forEach(function(m){
        var talla = m.talla||"Sin talla";
        porItem[m.item][talla] = (porItem[m.item][talla]||0) + m.cantidad;
      });

      // Ordena las tallas de zapato numéricamente (36, 37... 43) y las
      // de camisa por talla lógica (S, M, L, XL), no alfabéticamente —
      // así "XL" no queda antes de "S", como pasaría con sort() normal.
      var ORDEN_CAMISA = ["XS","S","M","L","XL","XXL","XXXL"];
      function ordenarTallas(item, tallas){
        return Object.keys(tallas).sort(function(a,b){
          if(item==="Camisa"){
            var ia=ORDEN_CAMISA.indexOf(a.toUpperCase()), ib=ORDEN_CAMISA.indexOf(b.toUpperCase());
            if(ia>=0 && ib>=0) return ia-ib;
            if(ia>=0) return -1;
            if(ib>=0) return 1;
          }
          var na=parseFloat(a), nb=parseFloat(b);
          if(!isNaN(na) && !isNaN(nb)) return na-nb;
          return a.localeCompare(b);
        });
      }

      doc.setFontSize(10); doc.setFont(undefined,"bold"); doc.setTextColor(27,67,50);
      doc.text("Consolidado por talla", 14, siguienteY);
      doc.setFont(undefined,"normal");

      var finalYs = [];
      [
        {item:"Camisa", titulo:"👕 Camisas", margen:{left:14, right:112}},
        {item:"Zapato", titulo:"👞 Zapatos", margen:{left:110, right:16}}
      ].forEach(function(cfg){
        var tallas = porItem[cfg.item];
        var claves = ordenarTallas(cfg.item, tallas);
        if(!claves.length) return;
        var total = claves.reduce(function(s,k){ return s+tallas[k]; }, 0);
        doc.autoTable({
          startY: siguienteY+3,
          head: [[cfg.titulo.replace(/^[^ ]+ /,""), "Cant."]],
          body: claves.map(function(k){ return ["Talla "+k, String(tallas[k])]; }),
          foot: [["TOTAL", String(total)]],
          styles:{fontSize:8, cellPadding:1.4},
          headStyles:{fillColor:[45,106,79], textColor:255},
          footStyles:{fillColor:[216,243,220], textColor:[27,67,50], fontStyle:"bold"},
          columnStyles:{1:{halign:"right", cellWidth:16}},
          margin: cfg.margen
        });
        finalYs.push(doc.lastAutoTable.finalY);
      });
      siguienteY = (finalYs.length ? Math.max.apply(null, finalYs) : siguienteY) + 9;
    }

    // Columna "Foto" al inicio de la tabla — texto vacío, la imagen se
    // dibuja aparte con didDrawCell porque autoTable no soporta
    // imágenes en celdas de forma nativa.
    var codigosPorFila = filtrados.map(function(m){ return (m.codigoTrabajador||"").toLowerCase(); });
    var filas = filtrados.map(function(m){
      return ["", m.fechaStr, m.nombreTrabajador, m.item, m.tipoMovimiento, m.cantidad, m.talla||"—", m.motivo||"—"];
    });
    doc.setFontSize(10); doc.setFont(undefined,"bold"); doc.setTextColor(27,67,50);
    doc.text("Detalle de movimientos", 14, siguienteY);
    doc.autoTable({
      startY: siguienteY+3,
      head: [["Foto","Fecha","Trabajador","EPP","Movimiento","Cant.","Talla","Motivo"]],
      body: filas,
      styles:{fontSize:7.5, minCellHeight:8},
      headStyles:{fillColor:[27,67,50], textColor:255},
      columnStyles:{0:{cellWidth:9}},
      didDrawCell: function(data){
        if(data.section!=="body" || data.column.index!==0) return;
        var cod = codigosPorFila[data.row.index];
        var foto = cod ? fotoCache[cod] : null;
        if(!foto) return;
        try{
          var d = Math.min(data.cell.height-1.5, 6.5);
          var cx = data.cell.x + data.cell.width/2;
          var cy = data.cell.y + data.cell.height/2;
          doc.saveGraphicsState();
          doc.circle(cx, cy, d/2, null);
          doc.clip();
          doc.discardPath();
          doc.addImage("data:"+foto.mimeType+";base64,"+foto.base64, "JPEG", cx-d/2, cy-d/2, d, d);
          doc.restoreGraphicsState();
        }catch(e){ /* si la imagen no es compatible, se omite y sigue el resto del PDF */ }
      }
    });

    var fg=new Date();
    var nombreArchivo="Historial_EPP_"+CONFIG.codigoProyecto+"_"+fg.getFullYear()+"-"+String(fg.getMonth()+1).padStart(2,"0")+"-"+String(fg.getDate()).padStart(2,"0")+".pdf";
    mostrarVistaPreviaPDF(doc, nombreArchivo, aviso, filtrados.length, "movimientos");
  });
}

// ── Stock disponible por ítem y talla ──
var EPP_STOCK_ENTRADAS = null;

// eppClaveStock — agrupa por talla solo en los ítems marcados
// "RequiereTalla" en el catálogo; el resto se agrupa como "Única".
function eppClaveStock(item, talla){
  var necesitaTalla = eppRequiereTalla(item);
  return item + "|" + (necesitaTalla ? (talla||"Sin talla") : "Única");
}

function eppCalcularStock(){
  var entradas = EPP_STOCK_ENTRADAS || [];
  var movs = eppFiltrarVigentes(EPP_MOVS_TODOS || []);
  var stock = {};
  function asegurar(item, talla){
    var clave = eppClaveStock(item, talla);
    if(!stock[clave]) stock[clave] = {
      item:item,
      talla: eppRequiereTalla(item) ? (talla||"Sin talla") : "Única",
      entradas:0, entregas:0, devoluciones:0
    };
    return stock[clave];
  }
  entradas.forEach(function(e){ asegurar(e.item, e.talla).entradas += e.cantidad; });
  movs.forEach(function(m){
    var s = asegurar(m.item, m.talla);
    if(m.tipoMovimiento==="Entrega") s.entregas += m.cantidad;
    if(m.tipoMovimiento==="Devolucion") s.devoluciones += m.cantidad;
  });
  return Object.keys(stock).map(function(k){
    var s = stock[k];
    s.disponible = s.entradas - s.entregas + s.devoluciones;
    return s;
  }).sort(function(a,b){
    return a.item===b.item ? a.talla.localeCompare(b.talla) : a.item.localeCompare(b.item);
  });
}

function eppCargarStock(){
  document.getElementById("eppStockTabla").innerHTML = "<div class='loading'>🔄 Cargando...</div>";
  Promise.all([
    sheetsGet("EPP_Stock_Entradas!A2:F").catch(function(){ return {values:[]}; }),
    EPP_MOVS_TODOS ? Promise.resolve({values:null}) : sheetsGet("EPP_Movimientos!A2:L").catch(function(){ return {values:[]}; })
  ]).then(function(res){
    var filasEntradas = res[0].values || [];
    EPP_STOCK_ENTRADAS = filasEntradas.map(function(r){
      return { fecha: r[0]?new Date(r[0]):null, item:r[1]||"", talla:r[2]||"", cantidad:Number(r[3])||0, observaciones:r[4]||"" };
    }).filter(function(e){ return e.item; });

    if(!EPP_MOVS_TODOS && res[1].values){
      EPP_MOVS_TODOS = res[1].values.map(eppFilaAObjeto).filter(function(m){ return m.fecha; });
      eppPoblarFiltroTrab();
    }
    eppRenderStockTabla();
  }).catch(function(err){
    document.getElementById("eppStockTabla").innerHTML = "<div class='msg-err'>"+err.message+"</div>";
  });
}

function eppRenderStockTabla(){
  var filas = eppCalcularStock();
  document.getElementById("eppStockTabla").innerHTML = filas.length ? filas.map(function(s){
    var bajo = s.disponible <= 3;
    return "<div style='display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f2f2f2'>"+
      "<div><b style='font-size:13px'>"+eppEtiqueta(s.item)+(s.talla!=="Única"?" — talla "+s.talla:"")+"</b>"+
      "<div style='font-size:10px;color:#888'>Ingresos: "+s.entradas+" · Entregados: "+s.entregas+" · Devueltos: "+s.devoluciones+"</div></div>"+
      "<div style='font-size:18px;font-weight:bold;color:"+(bajo?"#C00000":"#375623")+"'>"+s.disponible+"</div>"+
    "</div>";
  }).join("") : "<div style='font-size:12px;color:#888'>Todavía no hay ingresos de EPP registrados</div>";
}

function eppRegistrarEntradaStock(){
  var btn = _botonDelEvento();
  var msg = document.getElementById("eppStockMsg");
  msg.innerHTML = "";
  var item = document.getElementById("eppStockItem").value;
  var talla = document.getElementById("eppStockTalla").value.trim();
  var cantidad = document.getElementById("eppStockCantidad").value;
  var obs = document.getElementById("eppStockObs").value.trim();
  if(eppRequiereTalla(item) && !talla){
    msg.innerHTML = "<div class='msg-err'>Para "+item+" hace falta indicar la talla</div>";
    return;
  }
  if(!cantidad || Number(cantidad)<=0){
    msg.innerHTML = "<div class='msg-err'>Escribe una cantidad válida</div>";
    return;
  }
  if(!_bloquearBoton(btn, "eppRegistrarEntradaStock")) return;
  gasPost("registrarEntradaEPP",{
    item:item, talla:talla, cantidad:cantidad, observaciones:obs,
    registradoPor:(SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    _liberarBoton(btn, "eppRegistrarEntradaStock");
    if(r && r.ok){
      msg.innerHTML = "<div class='msg-ok'>✅ Ingreso registrado</div>";
      document.getElementById("eppStockTalla").value="";
      document.getElementById("eppStockCantidad").value="";
      document.getElementById("eppStockObs").value="";
      EPP_STOCK_ENTRADAS = null;
      eppCargarStock();
      setTimeout(function(){ msg.innerHTML=""; },2000);
    } else {
      msg.innerHTML = "<div class='msg-err'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){
    _liberarBoton(btn, "eppRegistrarEntradaStock");
    msg.innerHTML = "<div class='msg-err'>"+e.message+"</div>";
  });
}
