// ══════════════════════════════════════════════
// SALUD DEL TRABAJADOR — alergias/notas + stock y entrega de
// medicamentos. Mismo patrón de diseño que Control de EPP: el
// catálogo (qué medicamentos existen) sale de una hoja editable
// desde la app, y el "disponible" se calcula de un historial
// (ingresos − entregas vigentes), nunca se guarda fijo.
// ══════════════════════════════════════════════
var MED_CATALOGO = null;

var SALUD_TRAB_ACTUAL = null;

var SALUD_CANDIDATOS = {};

var SALUD_ENTREGAS_TRAB = [];

var SALUD_ENTREGAS_TODOS = null;

var MED_STOCK_ENTRADAS = null;

function abrirSalud(){
  navLimpiarTodo(); // cierra cualquier otra pantalla/módulo antes de abrir este
  document.getElementById("menuMas").style.display="none";
  document.querySelector(".tabs").style.display="none";
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display="none"; });
  document.getElementById("saludScreen").style.display="block";
  MED_CATALOGO=null; // se relee el catálogo cada vez que se abre el módulo
  saludCargarCatalogo().then(function(){ saludGoTab(0); });
}

function cerrarSalud(){
  document.getElementById("saludScreen").style.display="none";
  document.querySelector(".tabs").style.display="flex";
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display=""; });
  goTab(NAV_TAB_ACTUAL); // vuelve a la pestaña en la que estabas
}

function saludGoTab(n){
  document.getElementById("saludScrPersona").style.display = n===0?"block":"none";
  document.getElementById("saludScrReporte").style.display = n===1?"block":"none";
  document.getElementById("saludScrStock").style.display = n===2?"block":"none";
  document.getElementById("saludBtnPersona").className = "btn "+(n===0?"b-ok":"b-sec")+" b-sm";
  document.getElementById("saludBtnReporte").className = "btn "+(n===1?"b-ok":"b-sec")+" b-sm";
  document.getElementById("saludBtnStock").className = "btn "+(n===2?"b-ok":"b-sec")+" b-sm";
  if(n===1 && !SALUD_ENTREGAS_TODOS) saludCargarTodos();
  if(n===2) saludCargarStock();
}

// ── Catálogo de medicamentos (Admin → Catálogo de medicamentos) ──
function saludCargarCatalogo(){
  if(MED_CATALOGO) return Promise.resolve(MED_CATALOGO);
  return sheetsGet("Medicamentos_Catalogo!A2:C").then(function(resp){
    var rows = resp.values || [];
    if(!rows.length) throw new Error("vacio");
    MED_CATALOGO = rows.filter(function(r){return r[0];}).map(saludFilaCatalogoAObjeto);
    return MED_CATALOGO;
  }).catch(function(){
    return gasPost("asegurarCatalogoMedicamentos",{}).then(function(){
      return sheetsGet("Medicamentos_Catalogo!A2:C");
    }).then(function(resp){
      var rows = resp.values || [];
      MED_CATALOGO = rows.filter(function(r){return r[0];}).map(saludFilaCatalogoAObjeto);
      return MED_CATALOGO;
    }).catch(function(){
      MED_CATALOGO = [
        {nombre:"Acetaminofén", activo:true, orden:1},
        {nombre:"Ibuprofeno", activo:true, orden:2},
        {nombre:"Suero oral", activo:true, orden:3}
      ];
      return MED_CATALOGO;
    });
  }).then(function(cat){
    saludPoblarSelectsCatalogo();
    return cat;
  });
}

function saludFilaCatalogoAObjeto(r){
  return {
    nombre:(r[0]||"").toString(),
    activo:(r[1]===undefined || r[1]==="") ? true : (r[1]||"").toString().toLowerCase()==="si",
    orden:Number(r[2])||99
  };
}

function saludCatalogoActivos(){
  return (MED_CATALOGO||[]).filter(function(c){return c.activo;}).sort(function(a,b){return a.orden-b.orden;});
}

function saludPoblarSelectsCatalogo(){
  var activos = saludCatalogoActivos();
  var opts = activos.map(function(c){ return "<option value=\""+esc(c.nombre)+"\">"+esc(c.nombre)+"</option>"; }).join("");
  var selStock = document.getElementById("saludStockMed");
  if(selStock){ var actualStock = selStock.value; selStock.innerHTML = opts; if(actualStock) selStock.value = actualStock; }
  var selRep = document.getElementById("saludRepMed");
  if(selRep){ var actualRep = selRep.value; selRep.innerHTML = "<option value=''>Todos los medicamentos</option>" + opts; selRep.value = actualRep; }
  var selEntrega = document.getElementById("saludEntregaMed");
  if(selEntrega){ var actualEnt = selEntrega.value; selEntrega.innerHTML = opts; if(actualEnt) selEntrega.value = actualEnt; }
}

// ── Buscar trabajador (mismo patrón que Control de EPP) ──
var saludTBusca;

function saludBuscarTrabajadores(){
  clearTimeout(saludTBusca);
  var v = document.getElementById("saludBuscar").value.trim();
  var d = document.getElementById("saludSugTrab");
  if(v.length<1){ d.style.display="none"; return; }
  saludTBusca = setTimeout(function(){
    sheetsGet(SHEET("Personal")+"!A2:N").then(function(resp){
      var rows = resp.values || [];
      var q = v.toLowerCase();
      var res = [];
      for(var i=0;i<rows.length && res.length<8;i++){
        var cod=(rows[i][0]||"").toString().trim();
        var nom=(rows[i][1]||"").toString().trim();
        var est=(rows[i][6]||"Activo").toString().trim();
        if(!cod) continue;
        if(cod.toLowerCase().indexOf(q)>=0 || nom.toLowerCase().indexOf(q)>=0){
          res.push({codigo:cod, nombre:nom||cod, alergias:(rows[i][13]||"").toString(), estado:est, fotoId:(rows[i][9]||"").toString().trim()});
        }
      }
      if(!res.length){ d.style.display="none"; return; }
      res.forEach(function(t){ SALUD_CANDIDATOS[t.codigo]=t; });
      d.innerHTML = res.map(function(t){
        var mini=t.fotoId
          ?"<img src='"+urlFotoDrive(t.fotoId,60)+"' style='width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
          :"<div style='width:30px;height:30px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0'>👤</div>";
        var badgeInactivo = (t.estado||"Activo").toLowerCase()==="inactivo" ? " <span style='font-size:9px;color:#C00000;font-weight:bold'>· INACTIVO</span>" : "";
        return "<div class='sug-item' style='display:flex;align-items:center;gap:8px' onclick='saludSelTrab(\""+escJS(t.codigo)+"\")'>"+
          mini+"<div><div class='sug-nom'>"+t.nombre+badgeInactivo+"</div><div class='sug-cod'>"+t.codigo+"</div></div></div>";
      }).join("");
      d.style.display="block";
    }).catch(function(){ d.style.display="none"; });
  },300);
}

function saludFilaEntregaAObjeto(r){
  return {
    fecha: r[0] ? new Date(r[0]) : null,
    fechaStr: r[0] ? new Date(r[0]).toLocaleDateString("es-GT") : "",
    codigoTrabajador: (r[1]||"").toString().trim(), nombreTrabajador: r[2]||"",
    medicamento: r[3]||"", cantidad: Number(r[4])||0, observaciones: r[5]||"",
    idMovimiento: r[7]||""
  };
}

function saludSelTrab(codigo){
  var cand = SALUD_CANDIDATOS[codigo];
  SALUD_TRAB_ACTUAL = {codigo:codigo, nombre:(cand&&cand.nombre)||codigo, alergias:(cand&&cand.alergias)||"", estado:(cand&&cand.estado)||"Activo", fotoId:(cand&&cand.fotoId)||""};
  document.getElementById("saludSugTrab").style.display="none";
  document.getElementById("saludBuscar").value = SALUD_TRAB_ACTUAL.nombre;
  var cont = document.getElementById("saludFormContainer");
  cont.innerHTML = "<div class='card'><div class='loading'>🔄 Cargando historial...</div></div>";

  sheetsGet("Medicamentos_Entregas!A2:I").then(function(resp){
    var rows = resp.values || [];
    SALUD_ENTREGAS_TRAB = rows.map(saludFilaEntregaAObjeto).filter(function(m){
      return m.fecha && m.cantidad>0 && m.codigoTrabajador.toLowerCase() === codigo.toLowerCase();
    }).sort(function(a,b){ return b.fecha-a.fecha; });
    saludRenderEstado();
  }).catch(function(){
    SALUD_ENTREGAS_TRAB = [];
    saludRenderEstado();
  });
}

function saludRenderEstado(){
  var cont = document.getElementById("saludFormContainer");
  var t = SALUD_TRAB_ACTUAL;
  var bloquearEntrega = (t.estado||"Activo").toLowerCase()==="inactivo";
  var opts = saludCatalogoActivos().map(function(c){ return "<option value=\""+esc(c.nombre)+"\">"+esc(c.nombre)+"</option>"; }).join("");
  var fotoHdr = t.fotoId
    ? "<img src='"+urlFotoDrive(t.fotoId,100)+"' style='width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
    : "<div style='width:42px;height:42px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0'>👤</div>";

  var html = "<div class='card'><div style='display:flex;align-items:center;gap:8px'>"+fotoHdr+"<div class='ctit' style='margin:0'>"+esc(t.nombre)+" · "+esc(t.codigo)+"</div></div>";
  if(bloquearEntrega){
    html += "<div class='msg-err' style='margin:8px 0'>⚠️ Trabajador INACTIVO — no se le pueden registrar entregas nuevas de medicamento.</div>";
  }
  html += "<label style='display:block;font-size:11px;color:#888;margin:8px 0 3px'>⚠️ Alergias / notas de salud</label>"+
    "<textarea id='saludAlergias' placeholder='Ej: alérgico a acetaminofén' style='min-height:50px'>"+escTexto(t.alergias)+"</textarea>"+
    "<button class='btn b-sec b-sm' onclick='saludGuardarAlergias()'>💾 Guardar alergias/notas</button>"+
    "<div id='saludAlergiasMsg'></div>"+
  "</div>";

  if(!bloquearEntrega){
    html += "<div class='card'><div class='ctit'>💊 Entregar medicamento</div>"+
      "<select id='saludEntregaMed'>"+opts+"</select>"+
      "<div style='display:flex;gap:8px'>"+
        "<input type='number' id='saludEntregaCantidad' placeholder='Cantidad' value='1' min='1' style='flex:1'>"+
        "<input type='text' id='saludEntregaObs' placeholder='Observaciones (opcional)' style='flex:2'>"+
      "</div>"+
      "<div id='saludEntregaMsg'></div>"+
      "<button class='btn b-ok' style='width:100%' onclick='saludRegistrarEntrega()'>✅ Registrar entrega</button>"+
    "</div>";
  }

  html += "<div class='card'><div class='ctit'>📜 Historial de este trabajador ("+SALUD_ENTREGAS_TRAB.length+")</div>"+
    (SALUD_ENTREGAS_TRAB.length ? SALUD_ENTREGAS_TRAB.map(function(m){
      return "<div style='padding:5px 0;border-bottom:1px solid #f2f2f2;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:6px'>"+
        "<span><b>"+m.fechaStr+"</b> — "+esc(m.medicamento)+" x"+m.cantidad+(m.observaciones?" · 📝 "+esc(m.observaciones):"")+"</span>"+
        "<button class='btn b-danger b-sm' style='flex-shrink:0' onclick='saludAnularEntrega(\""+escJS(m.idMovimiento)+"\",\""+escJS(m.fechaStr+" - "+m.medicamento+" x"+m.cantidad)+"\")'>Anular</button>"+
      "</div>";
    }).join("") : "<div style='font-size:12px;color:#888'>Sin entregas registradas todavía</div>")+
  "</div>";

  cont.innerHTML = html;
}

function saludGuardarAlergias(){
  var btn = _botonDelEvento();
  var val = (document.getElementById("saludAlergias")||{value:""}).value.trim();
  var msg = document.getElementById("saludAlergiasMsg");
  if(!_bloquearBoton(btn, "saludGuardarAlergias")) return;
  gasPost("editarTrabajador",{codigo:SALUD_TRAB_ACTUAL.codigo, alergias:val}).then(function(r){
    _liberarBoton(btn, "saludGuardarAlergias");
    if(r&&r.ok){
      SALUD_TRAB_ACTUAL.alergias = val;
      if(SALUD_CANDIDATOS[SALUD_TRAB_ACTUAL.codigo]) SALUD_CANDIDATOS[SALUD_TRAB_ACTUAL.codigo].alergias = val;
      if(msg){ msg.innerHTML="<div class='msg-ok'>✅ Guardado</div>"; setTimeout(function(){msg.innerHTML="";},2000); }
    } else if(msg){ msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "saludGuardarAlergias"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function saludRegistrarEntrega(){
  var btn = _botonDelEvento();
  if((SALUD_TRAB_ACTUAL.estado||"Activo").toLowerCase()==="inactivo"){
    alert("Este trabajador está Inactivo — no se le pueden registrar entregas nuevas de medicamento.");
    return;
  }
  var medicamento = (document.getElementById("saludEntregaMed")||{value:""}).value;
  var cantidad = (document.getElementById("saludEntregaCantidad")||{value:"1"}).value;
  var obs = (document.getElementById("saludEntregaObs")||{value:""}).value.trim();
  var msg = document.getElementById("saludEntregaMsg");
  if(!medicamento){ if(msg)msg.innerHTML="<div class='msg-err'>Elige un medicamento</div>"; return; }
  if(!cantidad || Number(cantidad)<=0){ if(msg)msg.innerHTML="<div class='msg-err'>Cantidad inválida</div>"; return; }
  if(!_bloquearBoton(btn, "saludRegistrarEntrega")) return;
  gasPost("registrarEntregaMedicamento",{
    codigoTrabajador: SALUD_TRAB_ACTUAL.codigo,
    nombreTrabajador: SALUD_TRAB_ACTUAL.nombre,
    medicamento: medicamento,
    cantidad: cantidad,
    observaciones: obs,
    registradoPor: (SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    _liberarBoton(btn, "saludRegistrarEntrega");
    if(r&&r.ok){
      SALUD_ENTREGAS_TODOS = null; MED_STOCK_ENTRADAS = null;
      saludSelTrab(SALUD_TRAB_ACTUAL.codigo);
    } else if(msg){ msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error")+"</div>"; }
  }).catch(function(e){ _liberarBoton(btn, "saludRegistrarEntrega"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function saludAnularEntrega(idMovimiento, descripcion){
  if(!confirm("¿Anular este registro?\n\n"+descripcion+"\n\nQueda marcado como anulado en el historial y deja de contar en el stock disponible."))
    return;
  var motivo = prompt("Motivo de la anulación (ej. 'Registrado por error, duplicado'):","");
  if(motivo===null) return;
  gasPost("anularEntregaMedicamento",{idMovimiento:idMovimiento, motivo:motivo.trim()}).then(function(r){
    if(r&&r.ok){
      SALUD_ENTREGAS_TODOS = null; MED_STOCK_ENTRADAS = null;
      saludSelTrab(SALUD_TRAB_ACTUAL.codigo);
    } else alert("❌ "+(r&&r.error||"No se pudo anular"));
  }).catch(function(e){ alert("❌ "+e.message); });
}

// ── Reporte general ──
var SALUD_FOTOS_MAP = null;

function saludCargarTodos(){
  document.getElementById("saludRepLista").innerHTML = "<div class='loading'>🔄 Cargando...</div>";
  Promise.all([
    sheetsGet("Medicamentos_Entregas!A2:I"),
    sheetsGet(SHEET("Personal")+"!A2:J").catch(function(){ return {values:[]}; })
  ]).then(function(results){
    var rows = results[0].values || [];
    SALUD_ENTREGAS_TODOS = rows.map(saludFilaEntregaAObjeto).filter(function(m){ return m.fecha && m.cantidad>0; });
    SALUD_FOTOS_MAP = {};
    (results[1].values||[]).forEach(function(r){
      var cod=(r[0]||"").toString().trim().toLowerCase();
      var foto=(r[9]||"").toString().trim();
      if(cod && foto) SALUD_FOTOS_MAP[cod]=foto;
    });
    saludPoblarFiltroTrab();
    saludCalcularReporte();
  }).catch(function(){
    document.getElementById("saludRepLista").innerHTML = "<div class='msg-err'>No se pudo cargar (¿ya registró alguna entrega?)</div>";
  });
}

function saludPoblarFiltroTrab(){
  var sel = document.getElementById("saludRepTrab");
  var actual = sel.value;
  var nombres = {};
  (SALUD_ENTREGAS_TODOS||[]).forEach(function(m){ if(m.nombreTrabajador) nombres[m.nombreTrabajador]=true; });
  sel.innerHTML = "<option value=''>Todos los trabajadores</option>" +
    Object.keys(nombres).sort().map(function(n){ return "<option value=\""+esc(n)+"\">"+n+"</option>"; }).join("");
  if(nombres[actual]) sel.value = actual;
}

function saludFiltrarTodos(){
  var desdeVal = document.getElementById("saludRepDesde").value;
  var hastaVal = document.getElementById("saludRepHasta").value;
  var desde = desdeVal ? new Date(desdeVal+"T00:00:00") : null;
  var hasta = hastaVal ? new Date(hastaVal+"T23:59:59") : null;
  var medSel = document.getElementById("saludRepMed").value;
  var trabSel = document.getElementById("saludRepTrab").value;
  return (SALUD_ENTREGAS_TODOS||[]).filter(function(m){
    if(desde && m.fecha < desde) return false;
    if(hasta && m.fecha > hasta) return false;
    if(medSel && m.medicamento !== medSel) return false;
    if(trabSel && m.nombreTrabajador !== trabSel) return false;
    return true;
  });
}

function saludCalcularReporte(){
  if(!SALUD_ENTREGAS_TODOS) return;
  var filtrados = saludFiltrarTodos().sort(function(a,b){ return b.fecha-a.fecha; });
  document.getElementById("saludRepLista").innerHTML = filtrados.length ? filtrados.map(function(m){
    var foto=(SALUD_FOTOS_MAP||{})[(m.codigoTrabajador||"").toLowerCase()];
    var mini=foto
      ?"<img src='"+urlFotoDrive(foto,50)+"' style='width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
      :"<div style='width:24px;height:24px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0'>👤</div>";
    return "<div style='display:flex;align-items:center;gap:7px;padding:6px 0;border-bottom:1px solid #f2f2f2;font-size:12px'>"+mini+
      "<span><b>"+m.fechaStr+"</b> — "+esc(m.nombreTrabajador)+" — "+esc(m.medicamento)+" x"+m.cantidad+
      (m.observaciones?" · "+esc(m.observaciones):"")+
    "</span></div>";
  }).join("") : "<div style='font-size:12px;color:#888'>Sin registros con ese filtro</div>";
}

// saludExportarReportePDF — mismo criterio que eppExportarReportePDF:
// trae en base64 la foto de cada trabajador único ANTES de armar el
// PDF (jsPDF necesita los bytes, no la URL de Drive), y la dibuja con
// didDrawCell porque autoTable no soporta imágenes en celdas.
function saludExportarReportePDF(){
  var aviso = document.getElementById("saludRepAviso");
  var filtrados = saludFiltrarTodos().sort(function(a,b){ return a.fecha-b.fecha; });
  if(!filtrados.length){ aviso.innerHTML="<div class='msg-err'>No hay registros con ese filtro.</div>"; return; }
  aviso.innerHTML = "<div class='msg-ok'>🔄 Generando PDF...</div>";

  var fotosAPedir = {};
  filtrados.forEach(function(m){
    var cod=(m.codigoTrabajador||"").toLowerCase();
    var fid=(SALUD_FOTOS_MAP||{})[cod];
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
    doc.text("Historial de Salud — "+CONFIG.nombreProyecto, 14, 15);
    doc.setFontSize(9); doc.setFont(undefined,"normal"); doc.setTextColor(100,100,100);
    doc.text(CONFIG.empresa+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal+" · "+filtrados.length+" entregas", 14, 21);

    var codigosPorFila = filtrados.map(function(m){ return (m.codigoTrabajador||"").toLowerCase(); });
    var filas = filtrados.map(function(m){
      return ["", m.fechaStr, m.nombreTrabajador, m.medicamento, m.cantidad, m.observaciones||"—"];
    });
    doc.autoTable({
      startY: 26,
      head: [["Foto","Fecha","Trabajador","Medicamento","Cant.","Observaciones"]],
      body: filas,
      styles:{fontSize:8, minCellHeight:8},
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
    var nombreArchivo="Historial_Salud_"+CONFIG.codigoProyecto+"_"+fg.getFullYear()+"-"+String(fg.getMonth()+1).padStart(2,"0")+"-"+String(fg.getDate()).padStart(2,"0")+".pdf";
    mostrarVistaPreviaPDF(doc, nombreArchivo, aviso, filtrados.length, "entregas");
  });
}

// ── Stock disponible ──
function saludCalcularStock(){
  var entradas = MED_STOCK_ENTRADAS || [];
  var entregas = SALUD_ENTREGAS_TODOS || [];
  var stock = {};
  function asegurar(med){
    if(!stock[med]) stock[med] = {medicamento:med, entradas:0, entregas:0};
    return stock[med];
  }
  entradas.forEach(function(e){ asegurar(e.medicamento).entradas += e.cantidad; });
  entregas.forEach(function(m){ asegurar(m.medicamento).entregas += m.cantidad; });
  return Object.keys(stock).map(function(k){
    var s = stock[k];
    s.disponible = s.entradas - s.entregas;
    return s;
  }).sort(function(a,b){ return a.medicamento.localeCompare(b.medicamento); });
}

function saludCargarStock(){
  document.getElementById("saludStockTabla").innerHTML = "<div class='loading'>🔄 Cargando...</div>";
  Promise.all([
    sheetsGet("Medicamentos_Stock_Entradas!A2:E").catch(function(){ return {values:[]}; }),
    SALUD_ENTREGAS_TODOS ? Promise.resolve({values:null}) : sheetsGet("Medicamentos_Entregas!A2:I").catch(function(){ return {values:[]}; })
  ]).then(function(res){
    var filasEntradas = res[0].values || [];
    MED_STOCK_ENTRADAS = filasEntradas.map(function(r){
      return { fecha: r[0]?new Date(r[0]):null, medicamento:r[1]||"", cantidad:Number(r[2])||0, observaciones:r[3]||"" };
    }).filter(function(e){ return e.medicamento; });

    if(!SALUD_ENTREGAS_TODOS && res[1].values){
      SALUD_ENTREGAS_TODOS = res[1].values.map(saludFilaEntregaAObjeto).filter(function(m){ return m.fecha && m.cantidad>0; });
      saludPoblarFiltroTrab();
    }
    saludRenderStockTabla();
  }).catch(function(err){
    document.getElementById("saludStockTabla").innerHTML = "<div class='msg-err'>"+err.message+"</div>";
  });
}

function saludRenderStockTabla(){
  var filas = saludCalcularStock();
  document.getElementById("saludStockTabla").innerHTML = filas.length ? filas.map(function(s){
    var bajo = s.disponible <= 10;
    return "<div style='display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f2f2f2'>"+
      "<div><b style='font-size:13px'>"+esc(s.medicamento)+"</b>"+
      "<div style='font-size:10px;color:#888'>Ingresos: "+s.entradas+" · Entregados: "+s.entregas+"</div></div>"+
      "<div style='font-size:18px;font-weight:bold;color:"+(bajo?"#C00000":"#375623")+"'>"+s.disponible+"</div>"+
    "</div>";
  }).join("") : "<div style='font-size:12px;color:#888'>Todavía no hay ingresos de medicamentos registrados</div>";
}

function saludRegistrarEntradaStock(){
  var btn = _botonDelEvento();
  var msg = document.getElementById("saludStockMsg");
  msg.innerHTML = "";
  var medicamento = document.getElementById("saludStockMed").value;
  var cantidad = document.getElementById("saludStockCantidad").value;
  var obs = document.getElementById("saludStockObs").value.trim();
  if(!medicamento){ msg.innerHTML = "<div class='msg-err'>Elige un medicamento</div>"; return; }
  if(!cantidad || Number(cantidad)<=0){ msg.innerHTML = "<div class='msg-err'>Escribe una cantidad válida</div>"; return; }
  if(!_bloquearBoton(btn, "saludRegistrarEntradaStock")) return;
  gasPost("registrarEntradaMedicamento",{
    medicamento:medicamento, cantidad:cantidad, observaciones:obs,
    registradoPor:(SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    _liberarBoton(btn, "saludRegistrarEntradaStock");
    if(r && r.ok){
      msg.innerHTML = "<div class='msg-ok'>✅ Ingreso registrado</div>";
      document.getElementById("saludStockCantidad").value="";
      document.getElementById("saludStockObs").value="";
      MED_STOCK_ENTRADAS = null;
      saludCargarStock();
      setTimeout(function(){ msg.innerHTML=""; },2000);
    } else {
      msg.innerHTML = "<div class='msg-err'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){
    _liberarBoton(btn, "saludRegistrarEntradaStock");
    msg.innerHTML = "<div class='msg-err'>"+e.message+"</div>";
  });
}

// ── Admin: Catálogo de medicamentos ──
function abrirGestionCatalogoMed() {
  toggleMenuMas();
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("gestionCatalogoMedScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  MED_CATALOGO = null; // recargar por si se editó desde otra pestaña/sesión
  saludCargarCatalogo().then(cargarCatalogoMedAdmin);
}

function cargarCatalogoMedAdmin() {
  var div = document.getElementById("medLista");
  if(!div) return;
  var todos = (MED_CATALOGO||[]).slice().sort(function(a,b){return a.orden-b.orden;});
  if(!todos.length){ div.innerHTML="<div class='empty'><div class='ei'>💊</div><p>No hay medicamentos en el catálogo</p></div>"; return; }
  div.innerHTML = todos.map(function(c){
    return "<div class='card' style='margin-bottom:7px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px'>" +
      "<div><b>💊 "+esc(c.nombre)+"</b> <span class='badge bm'>"+(c.activo?"Activo":"Inactivo")+"</span></div>" +
      "<button class='btn b-sec b-sm' onclick='toggleActivoItemMed(\""+escJS(c.nombre)+"\","+(c.activo?"false":"true")+")'>"+(c.activo?"Desactivar":"Activar")+"</button>" +
    "</div>";
  }).join("");
}

function nuevoItemMedForm() {
  var formDiv = document.getElementById("medFormCat");
  if(!formDiv) return;
  formDiv.innerHTML =
    "<div class='card'><div class='ctit'>➕ Agregar medicamento</div>" +
    "<input type='text' id='medNombre' placeholder='Nombre del medicamento (ej. Dolofín) *'>" +
    "<div id='medMsg'></div>" +
    "<div style='display:flex;gap:8px'>" +
    "<button class='btn b-ok' onclick='guardarNuevoItemMed()'>💾 Agregar</button>" +
    "<button class='btn b-sec' onclick='cancelarFormMed()'>Cancelar</button>" +
    "</div></div>";
}

function guardarNuevoItemMed() {
  var btn = _botonDelEvento();
  var nombre = (document.getElementById("medNombre")||{value:""}).value.trim();
  var msg = document.getElementById("medMsg");
  if(!nombre){ if(msg)msg.innerHTML="<div class='msg-err'>El nombre es requerido</div>"; return; }
  if((MED_CATALOGO||[]).some(function(c){return c.nombre.toLowerCase()===nombre.toLowerCase();})){
    if(msg)msg.innerHTML="<div class='msg-err'>Ya existe un medicamento con ese nombre</div>"; return;
  }
  if(!_bloquearBoton(btn, "guardarNuevoItemMed")) return;
  gasPost("guardarItemMedicamentoCatalogo",{nombre:nombre, activo:true}).then(function(r){
    _liberarBoton(btn, "guardarNuevoItemMed");
    if(r&&r.ok){
      cancelarFormMed();
      MED_CATALOGO = null;
      saludCargarCatalogo().then(cargarCatalogoMedAdmin);
    } else if(msg){
      msg.innerHTML="<div class='msg-err'>"+(r&&r.error||"Error al guardar")+"</div>";
    }
  }).catch(function(e){ _liberarBoton(btn, "guardarNuevoItemMed"); if(msg)msg.innerHTML="<div class='msg-err'>"+e.message+"</div>"; });
}

function toggleActivoItemMed(nombre, nuevoActivo) {
  var actual = (MED_CATALOGO||[]).find(function(c){return c.nombre===nombre;});
  if(!actual) return;
  if(!confirm((nuevoActivo?"¿Activar ":"¿Desactivar ")+nombre+"?"+(nuevoActivo?"":"\n\nDejará de aparecer en Salud, pero su historial no se pierde."))) return;
  gasPost("guardarItemMedicamentoCatalogo",{nombre:actual.nombre, activo:nuevoActivo, orden:actual.orden}).then(function(r){
    if(r&&r.ok){
      MED_CATALOGO = null;
      saludCargarCatalogo().then(cargarCatalogoMedAdmin);
    } else {
      alert("❌ "+(r&&r.error||"No se pudo actualizar"));
    }
  }).catch(function(e){ alert("❌ "+e.message); });
}

function cancelarFormMed() {
  var f = document.getElementById("medFormCat");
  if(f) f.innerHTML="";
}
