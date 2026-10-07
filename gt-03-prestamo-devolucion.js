var TIPO  = "Herramienta";

// ══════════════════════════════════════════════
//  BUSCAR TRABAJADOR — usa Sheets API directamente
// ══════════════════════════════════════════════
function buscaTWDirecto(val, mode) {
  sheetsGet(SHEET("Personal")+"!A2:J").then(function(resp){
    var rows = resp.values || [];
    var q = val.toString().trim().toLowerCase();
    var qNum = q.replace(/^0+/,"").replace("gt01/recper-","");
    var qDui = q.replace(/[^0-9]/g,""); // solo dígitos, para comparar DUI/DPI sin guiones ni espacios
    var res = [];
    for(var i=0;i<rows.length&&res.length<6;i++){
      var cod = (rows[i][0]||"").toString().trim();
      var nom = (rows[i][1]||"").toString().trim();
      var car = (rows[i][2]||"").toString().trim();
      var est = (rows[i][6]||"Activo").toString().trim();
      var dui = (rows[i][7]||"").toString().trim();
      var foto = (rows[i][9]||"").toString().trim();
      var duiNum = dui.replace(/[^0-9]/g,"");
      if(!cod) continue;
      var codNum = cod.toLowerCase().replace("gt01/recper-","").replace(/^0+/,"");
      var coincideDui = duiNum && qDui && duiNum===qDui;
      if(cod.toLowerCase().indexOf(q)>=0 || nom.toLowerCase().indexOf(q)>=0 || codNum===qNum || coincideDui){
        res.push({codigo:cod, nombre:nom||cod, cargo:car, estado:est, dui:dui, fotoId:foto});
      }
    }
    if(!res.length) return;
    if(res.length===1){
      mode===0?selTWPre(res[0]):selTWDev(res[0]);
      return;
    }
    mostrarSugTW(res, mode);
  }).catch(function(){});
}

var tTW;

function buscaTW(v, mode) {
  clearTimeout(tTW);
  var d=document.getElementById(mode===0?"st":"std");
  if(!v||v.length<1){d.style.display="none";return;}
  tTW=setTimeout(function(){ buscaTWDirecto(v, mode); }, 380);
}

function mostrarSugTW(data, mode) {
  var d=document.getElementById(mode===0?"st":"std");
  d.innerHTML=data.map(function(t){
    var fn=mode===0
      ?"selTWPre({codigo:'"+esc(t.codigo)+"',nombre:'"+esc(t.nombre)+"',cargo:'"+esc(t.cargo)+"',estado:'"+esc(t.estado)+"',fotoId:'"+esc(t.fotoId)+"'})"
      :"selTWDev({codigo:'"+esc(t.codigo)+"',nombre:'"+esc(t.nombre)+"',cargo:'"+esc(t.cargo)+"',fotoId:'"+esc(t.fotoId)+"'})";
    var mini=t.fotoId
      ?"<img src='"+urlFotoDrive(t.fotoId,60)+"' style='width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
      :"<div style='width:32px;height:32px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0'>👤</div>";
    var esInactivo = mode===0 && (t.estado||"Activo").toLowerCase()==="inactivo";
    var badgeInactivo = esInactivo ? " <span style='font-size:9px;color:#C00000;font-weight:bold'>· INACTIVO</span>" : "";
    return "<div class='sug-item' style='display:flex;align-items:center;gap:8px' onclick=\""+fn+"\">"+mini+"<div><div class='sug-nom'>"+(t.nombre||t.codigo)+badgeInactivo+"</div><div class='sug-cod'>"+t.codigo+" · "+(t.cargo||"—")+"</div></div></div>";
  }).join("");
  d.style.display="block";
}

function selTWPre(t){
  TWK=t;
  document.getElementById("st").style.display="none";
  document.getElementById("bt").value=t.nombre||t.codigo;
  var esInactivo = (t.estado||"Activo").toLowerCase()==="inactivo";
  var fotoHTML=t.fotoId
    ?"<img src='"+urlFotoDrive(t.fotoId,100)+"' style='width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
    :"<div style='width:42px;height:42px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0'>👤</div>";
  document.getElementById("tw").innerHTML=
    "<div class='tw-card'"+(esInactivo?" style='border-color:#C00000;background:#FCE4E4'":"")+">"+fotoHTML+"<div style='flex:1'><div class='tw-nom'>👷 "+(t.nombre||t.codigo)+"</div>"+
    "<div class='tw-cod'>"+t.codigo+" · "+(t.cargo||"—")+"</div></div>"+
    "<button type='button' class='b-sm pf-info' data-cod=\""+pfAttr(t.codigo)+"\" onclick='abrirPerfilTrabajador(this.getAttribute(\"data-cod\"))' title='Ver perfil del trabajador'>ℹ️</button>"+
    "<button class='b-warn b-sm' onclick='resetTW()'>✕ Cambiar</button></div>";
  document.getElementById("tw").style.display="block";
  if(esInactivo){
    document.getElementById("ci").style.display="none";
    document.getElementById("rp").innerHTML="<div class='msg-err'>⚠️ Este trabajador está marcado como INACTIVO — no se le pueden registrar nuevos préstamos. Para reactivarlo: Admin → Gestión de trabajadores.</div>";
  } else {
    document.getElementById("rp").innerHTML="";
    document.getElementById("ci").style.display="block";
  }
}

function resetTW(){
  if(ITEMS.length>0&&!confirm("¿Cambiar trabajador? Se perderán los ítems.")) return;
  TWK=null;ITEMS=[];
  document.getElementById("bt").value="";
  document.getElementById("tw").style.display="none";
  document.getElementById("ci").style.display="none";
  document.getElementById("rp").innerHTML="";
  renderItems();
}

function selTWDev(t){
  document.getElementById("std").style.display="none";
  document.getElementById("btd").value=t.nombre||t.codigo;
  cargarPA(t.codigo,t.nombre||t.codigo);
}

// ══════════════════════════════════════════════
//  TIPO — no resetea la lista
// ══════════════════════════════════════════════
function setTipo(tipo){
  TIPO=tipo;
  document.getElementById("tbh").className="tipo-btn"+(tipo==="Herramienta"?" on-h":"");
  document.getElementById("tbi").className="tipo-btn"+(tipo==="Insumo"?" on-i":"");
  document.getElementById("tbm").className="tipo-btn"+(tipo==="Material"?" on-m":"");
  document.getElementById("bi").value="";
  document.getElementById("si").style.display="none";
  var ph={Herramienta:"Buscar herramienta...",Insumo:"Buscar insumo (cinta, precaución...)",Material:"Buscar material o pernería..."};
  document.getElementById("bi").placeholder=ph[tipo];
}

// ══════════════════════════════════════════════
//  BUSCAR ÍTEM — usa Sheets API directamente
// ══════════════════════════════════════════════
var tI;

function buscaItem(v){
  clearTimeout(tI);
  var d=document.getElementById("si");
  if(!v||v.length<1){d.style.display="none";return;}
  tI=setTimeout(function(){
    var q=v.toString().trim().toLowerCase();
    var res=[];
    var promises=[];

    // Herramientas
    if(TIPO==="Herramienta"){
      promises.push(
        sheetsGet("Catalogo_Herramientas!A2:O").then(function(resp){
          var rows=resp.values||[];
          for(var i=0;i<rows.length&&res.length<8;i++){
            var cod=(rows[i][0]||"").toString().toLowerCase();
            var desc=(rows[i][1]||"").toString().toLowerCase();
            if(cod.indexOf(q)>=0||desc.indexOf(q)>=0){
              res.push({codigo:rows[i][0],descripcion:rows[i][1],tipo:"Herramienta",unidad:"und",fotoId:(rows[i][14]||"").toString(),maxCant:(Number(rows[i][6])>1?Number(rows[i][6]):1)});
            }
          }
        })
      );
    }

    // Insumos y Materiales — misma hoja, pero ahora SÍ se filtra por la
    // pestaña activa usando el tipo real guardado (antes buscaba en
    // toda la hoja sin distinguir, y le pegaba la etiqueta "Insumo" o
    // "Material" según qué botón tuvieras apretado — así que un
    // material podía aparecer listado como insumo, o viceversa, según
    // en qué pestaña estuvieras parado al buscar).
    if(TIPO==="Insumo"||TIPO==="Material"){
      promises.push(
        sheetsGet("Catalogo_Insumos!A2:J").then(function(resp){
          var rows=resp.values||[];
          for(var i=0;i<rows.length&&res.length<14;i++){
            var cod=(rows[i][0]||"").toString().toLowerCase();
            var desc=(rows[i][1]||"").toString().toLowerCase();
            if(cod.indexOf(q)<0&&desc.indexOf(q)<0) continue;
            var tipoReal = tipoRealInsumo(rows[i][2], rows[i][9]);
            if(tipoReal!==TIPO) continue;
            res.push({
              codigo:rows[i][0],
              descripcion:rows[i][1],
              tipo:tipoReal,
              unidad:(rows[i][3]||"und").toString(),
              fotoId:(rows[i][8]||"").toString()
            });
          }
        })
      );
    }

    Promise.all(promises).then(function(){
      if(!res.length){d.style.display="none";return;}
      d.innerHTML=res.map(function(it){
        var bc=it.tipo==="Herramienta"?"bh":(it.tipo==="Material"?"bm":"bi");
        var mini=it.fotoId
          ?"<img src='"+urlFotoDrive(it.fotoId,60)+"' style='width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
          :"<div style='width:36px;height:36px;border-radius:7px;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0'>🔧</div>";
        return "<div class='sug-item' style='display:flex;align-items:center;gap:8px' onclick='addItem(\""+escJS(it.codigo)+"\",\""+escJS(it.descripcion)+"\",\""+it.tipo+"\",\""+escJS(it.unidad)+"\",\""+escJS(it.fotoId)+"\","+(Number(it.maxCant)||1)+")'>" +
          mini+
          "<div><div class='sug-nom'>"+it.descripcion+"</div>" +
          "<div class='sug-cod'><span class='badge "+bc+"'>"+it.tipo+"</span> "+it.codigo+"</div></div></div>";
      }).join("");
      d.style.display="block";
    }).catch(function(){d.style.display="none";});
  },380);
}

// ══════════════════════════════════════════════
//  AGREGAR ÍTEM
// ══════════════════════════════════════════════
// maxCant (v3.1.0): total de unidades del LOTE en el catálogo. Si es mayor a 1
// (ej. 10 palas), se pueden llevar varias unidades en un solo renglón; si es 1
// (herramienta de valor, ej. un taladro) funciona como siempre.
function addItem(cod,desc,tipo,unidad,fotoId,maxCant){
  document.getElementById("si").style.display="none";
  document.getElementById("bi").value="";
  maxCant=Number(maxCant)||1;
  if(tipo==="Herramienta"){
    var yaEsta=null;
    ITEMS.forEach(function(i){ if(i.codigo===cod) yaEsta=i; });
    if(yaEsta){
      if(maxCant>1){
        if(yaEsta.cantidad<maxCant){ yaEsta.cantidad++; renderItems(); }
        else alert("Ya agregaste las "+maxCant+" unidades del lote.");
        return;
      }
      alert("Esa herramienta ya está en la lista.");return;
    }
  }
  ITEMS.unshift({codigo:cod,descripcion:desc,tipo:tipo||TIPO,unidad:unidad||"und",cantidad:1,detalle:"",obs:"",fotoId:fotoId||"",maxCant:maxCant});
  renderItems();
}

function remItem(i){ITEMS.splice(i,1);renderItems();}

// ══════════════════════════════════════════════
//  RENDER LISTA
// ══════════════════════════════════════════════
function renderItems(){
  var d=document.getElementById("li");
  if(!ITEMS.length){
    d.innerHTML="<div class='empty'><div class='ei'>📋</div><p>Agrega herramientas, insumos o materiales</p></div>";
    document.getElementById("bguard").style.display="none";return;
  }
  var cH=ITEMS.filter(function(i){return i.tipo==="Herramienta";}).length;
  var cI=ITEMS.filter(function(i){return i.tipo==="Insumo";}).length;
  var cM=ITEMS.filter(function(i){return i.tipo==="Material";}).length;
  var res="";
  if(cH) res+="<span class='badge bh'>"+cH+" herramienta"+(cH>1?"s":"")+"</span> ";
  if(cI) res+="<span class='badge bi'>"+cI+" insumo"+(cI>1?"s":"")+"</span> ";
  if(cM) res+="<span class='badge bm'>"+cM+" material"+(cM>1?"es":"")+"</span>";
  var html="<div class='items-resumen'>"+res+"</div>";
  ITEMS.forEach(function(it,i){
    var bc=it.tipo==="Herramienta"?"bh":(it.tipo==="Material"?"bm":"bi");
    var mini=it.fotoId
      ?"<img src='"+urlFotoDrive(it.fotoId,60)+"' style='width:38px;height:38px;border-radius:7px;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
      :"<div style='width:38px;height:38px;border-radius:7px;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0'>🔧</div>";
    html+="<div class='item-row r-"+it.tipo+"'>" +
      mini+
      "<div class='item-info'>" +
      "<div class='item-cod'><span class='badge "+bc+"'>"+it.tipo+"</span> "+it.codigo+"</div>" +
      "<div class='item-desc'>"+it.descripcion+"</div>" +
      "<div class='item-sub'>" +
      (it.tipo==="Herramienta"&&it.maxCant>1?"<div class='qty-row'><input type='number' min='1' max='"+it.maxCant+"' value='"+it.cantidad+"' onchange='ITEMS["+i+"].cantidad=Math.min(Math.max(parseInt(this.value)||1,1),"+it.maxCant+");this.value=ITEMS["+i+"].cantidad'><span class='qty-unit'>unidades (lote de "+it.maxCant+")</span></div>":"") +
      (it.tipo==="Herramienta"?"<input type='text' placeholder='Descripción: color, marca, serie...' value='"+esc(it.detalle)+"' onchange='ITEMS["+i+"].detalle=this.value'>":"") +
      (it.tipo!=="Herramienta"?"<div class='qty-row'><input type='number' min='1' value='"+it.cantidad+"' onchange='ITEMS["+i+"].cantidad=parseInt(this.value)||1'><span class='qty-unit'>"+it.unidad+"</span></div>":"") +
      "<input type='text' placeholder='Observación (opcional)' value='"+esc(it.obs)+"' onchange='ITEMS["+i+"].obs=this.value'>" +
      "</div></div>" +
      "<button class='b-danger b-sm' onclick='remItem("+i+")'>✕</button></div>";
  });
  d.innerHTML=html;
  document.getElementById("bguard").style.display="block";
}

// ══════════════════════════════════════════════
//  GUARDAR PRÉSTAMO — via Apps Script (escritura)
//
//  Esta es la función que se dispara al tocar "Registrar préstamo
//  completo" en la pestaña Préstamo. Junta al trabajador (TWK) y
//  todos los ítems agregados (ITEMS), y se los manda a Code.gs
//  (acción "guardarPrestamo") para que escriba las filas nuevas
//  en Prestamos_Herramientas y Prestamos_Detalle.
//
//  Blindajes que tiene: ENVIANDO_PRESTAMO evita el doble toque,
//  y "idemKey" (una clave única por intento) evita que un reintento
//  de red duplique el registro — ver el mismo mecanismo en Code.gs.
// ══════════════════════════════════════════════
var ENVIANDO_PRESTAMO=false; // evita doble registro por doble toque o reintento de red

function guardar(){
  if(ENVIANDO_PRESTAMO) return; // ya hay un guardado en curso, ignora el toque repetido
  if(!TWK||!ITEMS.length){alert("Selecciona trabajador y agrega ítems.");return;}
  if((TWK.estado||"Activo").toLowerCase()==="inactivo"){alert("Este trabajador está Inactivo — no se le pueden registrar préstamos nuevos.");return;}
  ENVIANDO_PRESTAMO=true;
  var btn=document.getElementById("bguard");
  btn.textContent="⏳ Guardando...";btn.disabled=true;
  // Clave única por intento — el backend la usa para detectar y bloquear duplicados
  var idemKey=Date.now()+"-"+Math.random().toString(36).slice(2,10);
  gasPost("guardarPrestamo",{
    codigoTrabajador:TWK.codigo,
    nombreTrabajador:TWK.nombre||TWK.codigo,
    cargoTrabajador: TWK.cargo||"",
    items:ITEMS,
    idemKey:idemKey,
    entregadoPor: (SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    var hora=new Date().toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit"});
    var cH=ITEMS.filter(function(i){return i.tipo==="Herramienta";}).length;
    var cI=ITEMS.filter(function(i){return i.tipo==="Insumo";}).length;
    var cM=ITEMS.filter(function(i){return i.tipo==="Material";}).length;
    var det=[cH?cH+" herramienta"+(cH>1?"s":""):null,cI?cI+" insumo"+(cI>1?"s":""):null,cM?cM+" material"+(cM>1?"es":""):null].filter(Boolean).join(", ");
    document.getElementById("rp").innerHTML="<div class='msg-ok'>✅ "+(r.idPrestamo||"")+" registrado — "+hora+"<br><small>"+(TWK.nombre||TWK.codigo)+" · "+det+"</small></div>";
    TWK=null;ITEMS=[];
    document.getElementById("bt").value="";
    document.getElementById("tw").style.display="none";
    document.getElementById("ci").style.display="none";
    renderItems();
    setTimeout(function(){document.getElementById("rp").innerHTML="";},6000);
    btn.textContent="✅ Registrar préstamo completo";btn.disabled=false;
    ENVIANDO_PRESTAMO=false;
  }).catch(function(e){
    document.getElementById("rp").innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
    btn.textContent="✅ Registrar préstamo completo";btn.disabled=false;
    ENVIANDO_PRESTAMO=false;
  });
}

// ══════════════════════════════════════════════
//  DEVOLUCIÓN
//
//  cargarPA(cod,nom) — lee de Sheets qué herramientas tiene
//  pendientes ese trabajador ahora mismo, y las muestra en pantalla.
//  Se vuelve a llamar automáticamente después de cada devolución,
//  para que la lista quede actualizada sin vaciarse (ver el bug
//  que corregimos: antes se limpiaba la pantalla en vez de refrescar).
//
//  confirmarDev(id,items) — ⭐ es la que REALMENTE registra la
//  devolución: manda a Code.gs (acción "cerrarPrestamo") cuáles
//  ítems se devuelven. Si el trabajador se queda con algunos
//  (devolución parcial), el préstamo sigue "Abierto"; si devuelve
//  todo, pasa a "Cerrado".
// ══════════════════════════════════════════════
// Trabajador actualmente mostrado en la pantalla de Devolución (para refrescar tras confirmar)
var TWD_COD="";

var TWD_NOM="";

function cargarPA(cod,nom){
  TWD_COD=cod;
  TWD_NOM=nom;
  document.getElementById("pa").innerHTML="<div class='loading'>🔄 Cargando préstamos...</div>";
  // Leer ambas hojas en paralelo
  Promise.all([
    sheetsGet("Prestamos_Herramientas!A2:H"),
    sheetsGet("Prestamos_Detalle!A2:I")
  ]).then(function(results){
    var dp=results[0].values||[];
    var dd=results[1].values||[];
    var prestamos=[];
    for(var i=0;i<dp.length;i++){
      var codRow=(dp[i][2]||"").toString().trim();
      var est=(dp[i][7]||"").toString().toLowerCase().trim();
      if(codRow!==cod.trim()) continue;
      if(est!=="abierto") continue;
      var id=(dp[i][0]||"").toString();
      var items=[];
      for(var j=0;j<dd.length;j++){
        if((dd[j][1]||"").toString().trim()!==id) continue;
        var tipoIt=(dd[j][5]||"Herramienta").toString().trim();
        var estIt=(dd[j][4]||"").toString().toLowerCase().trim();
        if(tipoIt!=="Herramienta") continue;
        if(estIt!=="prestada") continue;
        items.push({
          idDetalle:(dd[j][0]||"").toString().trim(),
          codigo:(dd[j][2]||"").toString(),
          descripcion:(dd[j][3]||"").toString(),
          detalle:(dd[j][6]||"").toString(),
          cantidad:(Number(dd[j][7])>1?Number(dd[j][7]):1)
        });
      }
      if(items.length>0){
        prestamos.push({idPrestamo:id,fecha:(dp[i][1]||"").toString(),horaSalida:(dp[i][5]||"").toString(),items:items});
      }
    }
    mostrarPA(prestamos,nom,cod);
  }).catch(function(e){
    document.getElementById("pa").innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

function mostrarPA(data,nom,cod){
  var d=document.getElementById("pa");
  var etiqueta=(nom||cod)+(cod?" · "+cod:"");
  if(!data.length){
    d.innerHTML="<div class='empty'><div class='ei'>✅</div><p>"+etiqueta+" no tiene herramientas pendientes</p></div>";return;
  }
  d.innerHTML=data.map(function(p){
    var filas=p.items.map(function(it){
      return "<div class='dev-item'>" +
        "<div class='dev-item-title'>🔨 "+it.descripcion+(it.cantidad>1?" <b>× "+it.cantidad+"</b>":"")+" <span class='badge bh'>"+it.codigo+"</span>" +
        (it.detalle?"<span style='font-size:10px;color:#888;display:block'>"+it.detalle+"</span>":"")+"</div>" +
        "<select id='est-"+it.idDetalle+"'"+(it.cantidad>1?" onchange='devToggleAfectadas(\""+it.idDetalle+"\")'":"")+">" +
        "<option value='Bueno'>✅ Bueno</option>" +
        "<option value='Con daño'>⚠️ Con daño</option>" +
        "<option value='Perdida'>❌ Pérdida</option>" +
        "<option value='Pendiente'>⏳ Pendiente</option>" +
        "</select>" +
        (it.cantidad>1?"<div id='afeBox-"+it.idDetalle+"' style='display:none;margin:4px 0'><label style='font-size:11px;color:#C0392B'>¿Cuántas de las "+it.cantidad+" quedaron con daño o se perdieron?</label><input type='number' id='afe-"+it.idDetalle+"' min='1' max='"+it.cantidad+"' value='1'></div>":"")+
        "<input type='text' id='obs-"+it.idDetalle+"' placeholder='Observación (opcional)' style='margin-bottom:0'>" +
        "</div>";
    }).join("");
    return "<div class='pa-card'>" +
      "<div style='display:flex;justify-content:space-between;font-size:11px;color:#888;margin-bottom:5px'><span>📄 "+p.idPrestamo+"</span><span>📅 "+p.fecha+(p.horaSalida?" · "+p.horaSalida:"")+"</span></div>" +
      "<div style='font-size:14px;font-weight:bold;color:#1B4332;margin-bottom:8px'>👷 "+etiqueta+"</div>" +
      filas+
      "<button class='btn b-ok' style='margin-top:6px' onclick='confirmarDev(\""+p.idPrestamo+"\","+JSON.stringify(p.items).replace(/"/g,"&quot;")+")'>📥 Confirmar devolución</button>" +
      "</div>";
  }).join("");
}

// Muestra el campo "¿cuántas se dañaron?" solo cuando el renglón trae varias
// unidades y el estado elegido es daño o pérdida.
// El <select> de estado usa los valores "Bueno", "Con daño", "Perdida" (sin tilde)
// y "Pendiente". Esta función acepta también "Pérdida" por si algún día se cambia.
function devEsAfectado(est){ return est==="Con daño"||est==="Perdida"||est==="Pérdida"; }

function devToggleAfectadas(idDetalle){
  var est=(document.getElementById("est-"+idDetalle)||{value:""}).value;
  var box=document.getElementById("afeBox-"+idDetalle);
  if(box) box.style.display=devEsAfectado(est)?"block":"none";
}

function confirmarDev(id,items){
  var btn = _botonDelEvento();
  if(!_bloquearBoton(btn, "confirmarDev", "⏳ Procesando...")) return;
  var dev=items.map(function(it){
    var est=(document.getElementById("est-"+it.idDetalle)||{value:"Bueno"}).value;
    var o={
      idDetalle:it.idDetalle,
      estado:est,
      obs:(document.getElementById("obs-"+it.idDetalle)||{value:""}).value
    };
    if(it.cantidad>1 && devEsAfectado(est)){
      var af=parseInt((document.getElementById("afe-"+it.idDetalle)||{value:"1"}).value)||1;
      o.cantidadAfectada=Math.min(Math.max(af,1),it.cantidad);
    }
    return o;
  });
  var aDevolver=dev.filter(function(d){return d.estado!=="Pendiente";});
  if(!aDevolver.length){alert("Selecciona al menos una herramienta para devolver.");_liberarBoton(btn,"confirmarDev");return;}
  gasPost("cerrarPrestamo",{idPrestamo:id,items:aDevolver,recibidoPor:(SESION&&SESION.nombre)||"Almacenista"}).then(function(r){
    _liberarBoton(btn,"confirmarDev");
    var msg=r.pendientes?"✅ Devolución parcial — quedan herramientas pendientes":"✅ Préstamo cerrado — todas las herramientas devueltas";
    if(r.bajasCreadas) msg+="<br><small>⚠️ "+r.bajasCreadas+" baja"+(r.bajasCreadas>1?"s":"")+" registrada"+(r.bajasCreadas>1?"s":"")+" (daño o pérdida) — se descuenta"+(r.bajasCreadas>1?"n":"")+" del inventario disponible.</small>";
    document.getElementById("rd").innerHTML="<div class='msg-ok'>"+msg+"</div>";
    setTimeout(function(){document.getElementById("rd").innerHTML="";},6000);
    // Refresca la lista con el estado real y actualizado, en vez de vaciarla
    if(TWD_COD) cargarPA(TWD_COD,TWD_NOM);
  }).catch(function(e){
    _liberarBoton(btn,"confirmarDev");
    document.getElementById("rd").innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}
