// ═══════════════════════════════════════════════════════════
//  CIERRE DE TRABAJADOR — baja con PAZ Y SALVO (v3.2.0)
//  Menú ☰ → ADMINISTRACIÓN → «Cierre de trabajador» (Supervisor y Admin).
//  Flujo: 1) buscar al trabajador  2) ver lo que todavía debe (herramientas
//  prestadas y EPP tipo "devuelve": casco, chaleco)  3) registrar las
//  devoluciones, con daño o pérdida si corresponde  4) dar de baja y
//  generar el PAZ Y SALVO en PDF.
//  Si queda algo pendiente, solo un ADMIN puede autorizar la baja, por
//  escrito; el pendiente aparece en el paz y salvo.
//  El servidor (65_CierreTrabajador.gs) vuelve a revisar todo: esta
//  pantalla solo guía.
//
//  ▶ TEXTOS DEL PAZ Y SALVO — edita aquí si quieres cambiar la redacción.
//    {proyecto} y {autoriza} se reemplazan solos.
// ═══════════════════════════════════════════════════════════
var PAZ_TEXTO_OK = "Por medio de la presente se hace constar que el trabajador arriba indicado ha cumplido con la devolución de las herramientas y del equipo de protección personal que le fueron asignados en el proyecto {proyecto}, por lo que no tiene obligaciones pendientes de entrega con el almacén a la fecha de este documento.";
var PAZ_TEXTO_PENDIENTE = "Se hace constar que, a la fecha de este documento, el trabajador arriba indicado tiene pendientes de devolución los bienes que se detallan a continuación. La baja fue autorizada con pendientes por {autoriza}; dichos bienes quedan sujetos a lo que disponga la empresa.";
var PAZ_FIRMAS = ["Trabajador", "Almacenista", "Supervisor / Autoriza"];
var CT_MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
var CT_MOTIVOS = ["Fin de contrato","Renuncia","Despido","Traslado a otro proyecto","Otro"];

var CT_PERSONAL=[], CT_TRAB=null, CT_PEND=null, CT_DEVUELTO=[], CT_CIERRES=[];

function ctEsAdmin(){ return ((SESION&&SESION.rol)||"").toLowerCase()==="admin"; }

function abrirCierreTrabajador(codigoPre){
  var rol=((SESION&&SESION.rol)||"").toLowerCase();
  if(rol!=="admin"&&rol!=="supervisor"){ alert("Solo un Admin o un Supervisor puede dar de baja a un trabajador."); return; }
  navLimpiarTodo();
  var s=document.getElementById("cierreTrabScr"); if(!s) return;
  s.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  CT_TRAB=null; CT_PEND=null; CT_DEVUELTO=[];
  document.getElementById("ctBuscar").value="";
  document.getElementById("ctResultados").innerHTML="";
  document.getElementById("ctDetalle").innerHTML="";
  document.getElementById("ctAviso").innerHTML="";
  ctCargarPersonal().then(function(){
    if(codigoPre) ctSeleccionar(codigoPre);
  });
  ctCargarHistorial();
}

function ctCargarPersonal(){
  return sheetsGet(SHEET("Personal")+"!A2:G").then(function(r){
    CT_PERSONAL=(r.values||[]).filter(function(x){ return x[0]; }).map(function(x){
      return {codigo:(x[0]||"").toString().trim(),nombre:(x[1]||"").toString(),cargo:(x[2]||"").toString(),estado:(x[6]||"Activo").toString().trim()||"Activo"};
    });
  }).catch(function(){ CT_PERSONAL=[]; });
}

function ctBuscarInput(){
  var q=(document.getElementById("ctBuscar").value||"").trim().toLowerCase();
  var box=document.getElementById("ctResultados");
  if(q.length<2){ box.innerHTML=""; return; }
  var res=CT_PERSONAL.filter(function(t){ return t.estado.toLowerCase()==="activo" && (t.nombre+" "+t.codigo).toLowerCase().indexOf(q)>=0; }).slice(0,8);
  box.innerHTML=res.length?res.map(function(t){
    return "<div class='sug' style='padding:8px;border-bottom:1px solid #eee;cursor:pointer' data-cod=\""+pfAttr(t.codigo)+"\" onclick='ctSeleccionar(this.getAttribute(\"data-cod\"))'>👷 <b>"+esc(t.nombre)+"</b> <span style='font-size:11px;color:#888'>"+esc(t.codigo)+(t.cargo?" · "+esc(t.cargo):"")+"</span></div>";
  }).join(""):"<div class='empty'><p>Ningún trabajador activo coincide.</p></div>";
}

function ctSeleccionar(codigo){
  var cod=(codigo||"").toString().trim().toLowerCase();
  var t=CT_PERSONAL.filter(function(x){ return x.codigo.toLowerCase()===cod; })[0];
  if(!t){ document.getElementById("ctDetalle").innerHTML="<div class='msg-err'>No se encontró al trabajador "+esc(codigo)+".</div>"; return; }
  if(t.estado.toLowerCase()==="inactivo"){ document.getElementById("ctDetalle").innerHTML="<div class='msg-err'>"+esc(t.nombre)+" ya está dado de baja.</div>"; return; }
  CT_TRAB=t; CT_DEVUELTO=[];
  document.getElementById("ctResultados").innerHTML=""; document.getElementById("ctBuscar").value="";
  document.getElementById("ctAviso").innerHTML="";
  ctCargarPendientes();
}

// Calcula lo que debe (misma regla que el servidor).
function ctCalcular(cod, dp, dd, cat, mov){
  var c=cod.toLowerCase(), ids={}, res={herramientas:[],epp:[]};
  dp.forEach(function(r){ if((r[2]||"").toString().trim().toLowerCase()===c) ids[(r[0]||"").toString().trim()]=1; });
  dd.forEach(function(r){
    if(!ids[(r[1]||"").toString().trim()]) return;
    if((r[5]||"").toString().trim().toLowerCase()!=="herramienta"||(r[4]||"").toString().trim().toLowerCase()!=="prestada") return;
    res.herramientas.push({idPrestamo:(r[1]||"").toString().trim(),idDetalle:(r[0]||"").toString().trim(),codigo:(r[2]||"").toString(),descripcion:(r[3]||"").toString(),cantidad:(Number(r[7])>1?Number(r[7]):1)});
  });
  var devuelve={};
  cat.forEach(function(r){ if((r[2]||"").toString().trim().toLowerCase()==="devuelve") devuelve[(r[0]||"").toString().trim().toLowerCase()]=(r[0]||"").toString().trim(); });
  var anulados={}, neto={};
  mov.forEach(function(r){ if((r[4]||"")==="Anulacion"&&r[11]) anulados[r[11].toString()]=1; });
  mov.forEach(function(r){
    if((r[1]||"").toString().trim().toLowerCase()!==c) return;
    var it=(r[3]||"").toString().trim().toLowerCase(); if(!devuelve[it]) return;
    var tipo=(r[4]||"").toString(); if(tipo!=="Entrega"&&tipo!=="Devolucion") return;
    if(anulados[(r[10]||"").toString()]) return;
    var n=Number(r[5])||1; neto[it]=(neto[it]||0)+(tipo==="Entrega"?n:-n);
  });
  Object.keys(neto).forEach(function(it){ if(neto[it]>0) res.epp.push({item:devuelve[it],cantidad:neto[it]}); });
  return res;
}

function ctCargarPendientes(){
  var box=document.getElementById("ctDetalle");
  box.innerHTML="<div class='loading'>🔄 Revisando lo que debe "+esc(CT_TRAB.nombre)+"...</div>";
  Promise.all([
    sheetsGet("Prestamos_Herramientas!A2:K"), sheetsGet("Prestamos_Detalle!A2:I"),
    sheetsGet("EPP_Catalogo!A2:F").catch(function(){ return {values:[]}; }),
    sheetsGet("EPP_Movimientos!A2:M").catch(function(){ return {values:[]}; })
  ]).then(function(r){
    CT_PEND=ctCalcular(CT_TRAB.codigo,r[0].values||[],r[1].values||[],r[2].values||[],r[3].values||[]);
    ctRenderDetalle();
  }).catch(function(e){ box.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>"; });
}

function ctRenderDetalle(){
  var t=CT_TRAB, p=CT_PEND, box=document.getElementById("ctDetalle");
  var n=p.herramientas.length+p.epp.length, esAdmin=ctEsAdmin();
  var h="<div class='card'><div class='ctit'>🚪 Baja de "+esc(t.nombre)+"</div><div style='font-size:11px;color:#888;margin-bottom:6px'>"+esc(t.codigo)+(t.cargo?" · "+esc(t.cargo):"")+"</div>";
  if(!n){
    h+="<div class='msg-ok'>✅ No debe herramientas ni EPP por devolver.</div>";
  } else {
    h+="<div style='font-size:12px;color:#7A4B00;margin-bottom:6px'>⚠️ Todavía debe <b>"+p.herramientas.length+"</b> herramienta(s) y <b>"+p.epp.length+"</b> ítem(s) de EPP. Marca lo que devuelve ahora:</div>";
    p.herramientas.forEach(function(it){
      h+="<div style='padding:6px 0;border-top:1px solid #eee'><div style='font-size:12px'>🔨 "+esc(it.descripcion)+(it.cantidad>1?" <b>× "+it.cantidad+"</b>":"")+" <span style='font-size:10px;color:#888'>"+esc(it.codigo)+" · "+esc(it.idPrestamo)+"</span></div>"+
        "<select id='ctEst-"+pfAttr(it.idDetalle)+"' onchange='ctToggleAfectadas(\""+pfAttr(it.idDetalle)+"\")'><option value='Pendiente'>⏳ Sigue pendiente</option><option value='Bueno'>✅ Devuelta bien</option><option value='Con daño'>⚠️ Devuelta con daño</option><option value='Perdida'>❌ Pérdida</option></select>"+
        (it.cantidad>1?"<div id='ctAfeBox-"+pfAttr(it.idDetalle)+"' style='display:none'><label style='font-size:11px;color:#C0392B'>¿Cuántas de las "+it.cantidad+" se dañaron o se perdieron?</label><input type='number' id='ctAfe-"+pfAttr(it.idDetalle)+"' min='1' max='"+it.cantidad+"' value='1'></div>":"")+"</div>";
    });
    p.epp.forEach(function(e){
      h+="<div style='padding:6px 0;border-top:1px solid #eee'><div style='font-size:12px'>🦺 "+esc(e.item)+(e.cantidad>1?" <b>× "+e.cantidad+"</b>":"")+" <span style='font-size:10px;color:#888'>EPP sin devolver</span></div>"+
        "<select id='ctEpp-"+pfAttr(e.item)+"'><option value='Pendiente'>⏳ Sigue pendiente</option><option value='Devuelve'>✅ Lo devuelve</option></select></div>";
    });
    h+="<button class='btn b-blue' style='width:100%;margin-top:8px' onclick='ctRegistrarDevoluciones()'>💾 Registrar lo marcado como devuelto</button><div id='ctMsgDev'></div>";
  }
  if(CT_DEVUELTO.length) h+="<div style='font-size:11px;color:#375623;margin-top:8px'><b>Devuelto en este cierre:</b><br>"+CT_DEVUELTO.map(esc).join("<br>")+"</div>";
  h+="</div><div class='card'><div class='ctit'>Dar de baja</div>"+
    "<select id='ctMotivo'>"+CT_MOTIVOS.map(function(m){ return "<option value='"+pfAttr(m)+"'>"+esc(m)+"</option>"; }).join("")+"</select>"+
    "<textarea id='ctObs' rows='2' placeholder='Observaciones"+(n&&esAdmin?" (obligatorio si autorizas la baja con pendientes)":" (opcional)")+"' style='width:100%;box-sizing:border-box'></textarea>";
  if(n){
    if(esAdmin) h+="<label style='display:flex;gap:8px;align-items:flex-start;font-size:12px;margin:6px 0'><input type='checkbox' id='ctAutoriza' style='width:auto;margin-top:2px'> <span>Autorizo la baja <b>con pendientes</b>. Quedarán anotados en el paz y salvo.</span></label>";
    else h+="<div class='msg-err' style='margin:6px 0'>Mientras tenga pendientes solo un Admin puede autorizar la baja. Registra las devoluciones o pídele a un Admin que la autorice.</div>";
  }
  if(!n||esAdmin) h+="<button class='btn b-warn' style='width:100%' onclick='ctDarDeBaja()'>🚪 Dar de baja y generar paz y salvo</button>";
  h+="<div id='ctMsgBaja'></div></div>";
  box.innerHTML=h;
}

function ctToggleAfectadas(id){
  var est=(document.getElementById("ctEst-"+id)||{value:""}).value;
  var b=document.getElementById("ctAfeBox-"+id); if(b) b.style.display=devEsAfectado(est)?"block":"none";
}

function ctRegistrarDevoluciones(){
  var msg=document.getElementById("ctMsgDev"), p=CT_PEND, quien=(SESION&&SESION.nombre)||"Almacenista";
  var grupos={}, textos=[], epp=[];
  p.herramientas.forEach(function(it){
    var est=(document.getElementById("ctEst-"+it.idDetalle)||{value:"Pendiente"}).value;
    if(est==="Pendiente") return;
    var o={idDetalle:it.idDetalle,estado:est,obs:"Devuelta en el cierre de "+CT_TRAB.nombre};
    var txt=it.descripcion+" ("+it.codigo+")"+(it.cantidad>1?" x"+it.cantidad:"");
    if(it.cantidad>1&&devEsAfectado(est)){
      var af=Math.min(Math.max(parseInt((document.getElementById("ctAfe-"+it.idDetalle)||{value:"1"}).value)||1,1),it.cantidad);
      o.cantidadAfectada=af; txt+=" — "+af+" de "+it.cantidad+(est==="Con daño"?" con daño":" perdidas");
    } else txt+=est==="Bueno"?" — devuelta en buen estado":(est==="Con daño"?" — devuelta con daño":" — pérdida");
    (grupos[it.idPrestamo]=grupos[it.idPrestamo]||[]).push(o); textos.push(txt);
  });
  p.epp.forEach(function(e){
    var v=(document.getElementById("ctEpp-"+e.item)||{value:"Pendiente"}).value;
    if(v==="Devuelve"){ epp.push(e); textos.push(e.item+(e.cantidad>1?" x"+e.cantidad:"")+" — devuelto"); }
  });
  if(!textos.length){ msg.innerHTML="<div class='msg-err'>Marca al menos un ítem como devuelto.</div>"; return; }
  var btn=_botonDelEvento();
  if(!_bloquearBoton(btn,"ctRegistrarDevoluciones","⏳ Registrando...")) return;
  var pasos=[];
  Object.keys(grupos).forEach(function(idPr){ pasos.push(function(){ return gasPost("cerrarPrestamo",{idPrestamo:idPr,items:grupos[idPr],recibidoPor:quien}); }); });
  epp.forEach(function(e){ pasos.push(function(){ return gasPost("registrarMovimientoEPP",{codigoTrabajador:CT_TRAB.codigo,nombreTrabajador:CT_TRAB.nombre,item:e.item,tipoMovimiento:"Devolucion",cantidad:e.cantidad,motivo:"Cierre de trabajador"}); }); });
  pasos.reduce(function(c,f){ return c.then(f); },Promise.resolve()).then(function(){
    _liberarBoton(btn,"ctRegistrarDevoluciones");
    CT_DEVUELTO=CT_DEVUELTO.concat(textos);
    ctCargarPendientes();
  }).catch(function(e){
    _liberarBoton(btn,"ctRegistrarDevoluciones");
    msg.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+" — lo ya registrado queda guardado; actualiza para ver el estado real.</div>";
    CT_DEVUELTO=CT_DEVUELTO.concat(textos); // pudo quedar algo registrado
  });
}

function ctTextoPendientes(p){
  var t=[];
  p.herramientas.forEach(function(h){ t.push(h.descripcion+" ("+h.codigo+")"+(h.cantidad>1?" x"+h.cantidad:"")); });
  p.epp.forEach(function(e){ t.push(e.item+(e.cantidad>1?" x"+e.cantidad:"")); });
  return t;
}

function ctDarDeBaja(){
  var msg=document.getElementById("ctMsgBaja"); msg.innerHTML="";
  var n=CT_PEND.herramientas.length+CT_PEND.epp.length;
  var motivo=document.getElementById("ctMotivo").value, obs=(document.getElementById("ctObs").value||"").trim();
  var autoriza=!!(document.getElementById("ctAutoriza")||{}).checked;
  if(n&&!autoriza){ msg.innerHTML="<div class='msg-err'>Todavía debe "+n+" ítem(s). Regístralos como devueltos o marca «Autorizo la baja con pendientes».</div>"; return; }
  if(n&&autoriza&&!obs){ msg.innerHTML="<div class='msg-err'>Escribe en Observaciones por qué autorizas la baja con pendientes.</div>"; return; }
  if(!confirm("¿Dar de baja a "+CT_TRAB.nombre+"? Quedará Inactivo y no se le podrán registrar entregas nuevas.")) return;
  var btn=_botonDelEvento();
  if(!_bloquearBoton(btn,"ctDarDeBaja","⏳ Procesando...")) return;
  var quien=(SESION&&SESION.nombre)||"";
  gasPost("cerrarTrabajador",{codigoTrabajador:CT_TRAB.codigo,motivo:motivo,observaciones:obs,detalleDevuelto:CT_DEVUELTO.join(" | "),autorizarPendientes:(n&&autoriza)?true:false}).then(function(r){
    _liberarBoton(btn,"ctDarDeBaja");
    var reg={fecha:new Date(),idCierre:r.idCierre,codigo:CT_TRAB.codigo,nombre:CT_TRAB.nombre,cargo:CT_TRAB.cargo,motivo:motivo,
      devuelto:CT_DEVUELTO.slice(),pendientes:r.pendientesAutorizados?ctTextoPendientes(r.pendientesAutorizados):[],autorizado:!!r.pendientesAutorizados,
      autorizadoPor:r.pendientesAutorizados?quien:"",observaciones:obs,registradoPor:quien};
    document.getElementById("ctDetalle").innerHTML="";
    document.getElementById("ctAviso").innerHTML="<div class='msg-ok'>✅ "+esc(CT_TRAB.nombre)+" quedó dado de baja ("+esc(r.idCierre)+").</div><div id='ctPdfBox'></div>";
    ctPazYSalvoPDF(reg,document.getElementById("ctPdfBox"));
    CT_TRAB=null; CT_PEND=null; CT_DEVUELTO=[];
    ctCargarPersonal(); ctCargarHistorial();
  }).catch(function(e){
    _liberarBoton(btn,"ctDarDeBaja");
    msg.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>";
  });
}

function ctFechaLarga(d){ d=d||new Date(); return d.getDate()+" de "+CT_MESES[d.getMonth()]+" de "+d.getFullYear(); }

// PDF del paz y salvo. reg = {fecha,idCierre,codigo,nombre,cargo,motivo,devuelto[],pendientes[],autorizado,autorizadoPor,observaciones,registradoPor}
function ctPazYSalvoPDF(reg,avisoBox){
  if(!(window.jspdf&&window.jspdf.jsPDF)){ avisoBox.innerHTML="<div class='msg-err'>No se cargó el generador de PDF. Revisa tu conexión y recarga.</div>"; return; }
  var doc=new window.jspdf.jsPDF({unit:"mm",format:"letter"});
  var pageW=doc.internal.pageSize.getWidth(), pageH=doc.internal.pageSize.getHeight(), mx=20, ancho=pageW-2*mx;
  var conPend=reg.pendientes&&reg.pendientes.length>0;
  doc.setFont(undefined,"bold"); doc.setFontSize(10); doc.setTextColor(27,67,50);
  doc.text(CONFIG.empresa,mx,18);
  doc.setFont(undefined,"normal"); doc.setFontSize(9); doc.setTextColor(100,100,100);
  doc.text(CONFIG.nombreProyecto+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal,mx,23);
  doc.setDrawColor(27,67,50); doc.setLineWidth(0.6); doc.line(mx,26,pageW-mx,26);
  doc.setFont(undefined,"bold"); doc.setFontSize(20); doc.setTextColor(27,67,50);
  doc.text("PAZ Y SALVO",pageW/2,40,{align:"center"});
  doc.setFont(undefined,"normal"); doc.setFontSize(10); doc.setTextColor(80,80,80);
  doc.text("Almacén — "+ctFechaLarga(reg.fecha instanceof Date?reg.fecha:new Date(reg.fecha)),pageW/2,47,{align:"center"});
  doc.autoTable({
    startY:54, theme:"plain", styles:{fontSize:10,cellPadding:1.8,textColor:[40,40,40]},
    columnStyles:{0:{fontStyle:"bold",cellWidth:42}},
    body:[["Trabajador",reg.nombre],["Código",reg.codigo],["Cargo",reg.cargo||"—"],["Motivo de la baja",reg.motivo]],
    margin:{left:mx,right:mx}
  });
  var y=doc.lastAutoTable.finalY+8;
  doc.setFontSize(10.5); doc.setTextColor(30,30,30);
  var texto=(conPend?PAZ_TEXTO_PENDIENTE:PAZ_TEXTO_OK).replace("{proyecto}",CONFIG.nombreProyecto).replace("{autoriza}",reg.autorizadoPor||"un Admin");
  var lineas=doc.splitTextToSize(texto,ancho); doc.text(lineas,mx,y); y+=lineas.length*5+4;
  if(reg.devuelto&&reg.devuelto.length){
    doc.autoTable({startY:y,head:[["Devuelto al cerrar su cuenta"]],body:reg.devuelto.map(function(x){ return [x]; }),styles:{fontSize:9,cellPadding:1.6},headStyles:{fillColor:[27,67,50],textColor:255},margin:{left:mx,right:mx}});
    y=doc.lastAutoTable.finalY+6;
  }
  if(conPend){
    doc.autoTable({startY:y,head:[["Pendientes (baja autorizada)"]],body:reg.pendientes.map(function(x){ return [x]; }),styles:{fontSize:9,cellPadding:1.6},headStyles:{fillColor:[192,57,43],textColor:255},margin:{left:mx,right:mx}});
    y=doc.lastAutoTable.finalY+4;
    if(reg.observaciones){ doc.setFontSize(9); doc.setTextColor(80,80,80); var ol=doc.splitTextToSize("Motivo de la autorización: "+reg.observaciones,ancho); doc.text(ol,mx,y+3); y+=ol.length*4.5+4; }
  } else if(reg.observaciones){
    doc.setFontSize(9); doc.setTextColor(80,80,80); var o2=doc.splitTextToSize("Observaciones: "+reg.observaciones,ancho); doc.text(o2,mx,y+3); y+=o2.length*4.5+4;
  }
  var yf=Math.max(y+22,pageH-62); if(yf>pageH-30){ doc.addPage(); yf=60; }
  doc.setDrawColor(100,100,100); doc.setLineWidth(0.3); doc.setFontSize(9); doc.setTextColor(60,60,60);
  var w=(ancho-2*8)/3;
  PAZ_FIRMAS.forEach(function(nombre,i){
    var x=mx+i*(w+8); doc.line(x,yf,x+w,yf); doc.text(nombre,x+w/2,yf+5,{align:"center"});
    if(i===1&&reg.registradoPor) doc.text(reg.registradoPor,x+w/2,yf+10,{align:"center"});
    if(i===0) doc.text(reg.nombre,x+w/2,yf+10,{align:"center"});
    if(i===2&&reg.autorizadoPor) doc.text(reg.autorizadoPor,x+w/2,yf+10,{align:"center"});
  });
  doc.setFontSize(7.5); doc.setTextColor(140,140,140);
  doc.text("Cierre "+(reg.idCierre||"")+" · "+reg.codigo,mx,pageH-10);
  var f=(reg.fecha instanceof Date)?reg.fecha:new Date(reg.fecha);
  var nombreArchivo="PazYSalvo_"+(reg.codigo||"").replace(/[^A-Za-z0-9]/g,"")+"_"+f.getFullYear()+String(f.getMonth()+1).padStart(2,"0")+String(f.getDate()).padStart(2,"0")+".pdf";
  mostrarVistaPreviaPDF(doc,nombreArchivo,avisoBox,1,"paz y salvo",false);
}

function ctCargarHistorial(){
  var box=document.getElementById("ctHistorial");
  sheetsGet("Cierres_Trabajador!A2:L").catch(function(){ return {values:[]}; }).then(function(r){
    CT_CIERRES=(r.values||[]).filter(function(x){ return x[1]; }).reverse().slice(0,15);
    box.innerHTML=CT_CIERRES.length?CT_CIERRES.map(function(x,i){
      var f=x[0]?new Date(x[0]):null;
      return "<div style='display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #eee;font-size:12px'>"+
        "<div style='min-width:0'><b>"+esc((x[3]||"").toString())+"</b> <span style='font-size:10px;color:#888'>"+esc((x[2]||"").toString())+"</span>"+
        "<div style='font-size:10px;color:#777'>"+(f&&!isNaN(f)?f.toLocaleDateString("es-GT"):"")+" · "+esc((x[5]||"").toString())+((x[8]||"")==="Si"?" · <span style='color:#C00000'>con pendientes autorizados</span>":"")+"</div></div>"+
        "<button class='btn b-sec b-sm' style='flex-shrink:0' onclick='ctReimprimir("+i+")'>🖨 Paz y salvo</button></div>";
    }).join(""):"<div class='empty'><p>Todavía no hay bajas registradas.</p></div>";
  });
}

function ctReimprimir(i){
  var x=CT_CIERRES[i]; if(!x) return;
  var partir=function(t){ return (t||"").toString().split(" | ").filter(function(s){ return s.trim(); }); };
  var reg={fecha:x[0]?new Date(x[0]):new Date(),idCierre:(x[1]||"").toString(),codigo:(x[2]||"").toString(),nombre:(x[3]||"").toString(),cargo:(x[4]||"").toString(),motivo:(x[5]||"").toString(),
    devuelto:partir(x[6]),pendientes:partir(x[7]),autorizado:(x[8]||"")==="Si",autorizadoPor:(x[9]||"").toString(),observaciones:(x[10]||"").toString(),registradoPor:(x[11]||"").toString()};
  document.getElementById("ctAviso").innerHTML="<div id='ctPdfBox'></div>";
  ctPazYSalvoPDF(reg,document.getElementById("ctPdfBox"));
  window.scrollTo(0,0);
}
