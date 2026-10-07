// ═══════════════════════════════════════════════════════════
//  INVENTARIO AGRUPADO POR CATEGORÍA + ACTA DE INVENTARIO (v3.2.0)
//  Pantalla que se abre desde Inventario → «Vista agrupada». Muestra las
//  herramientas ordenadas Categoría → Subcategoría → herramienta, con
//  total, bajas, prestadas y disponibles, y permite:
//   • generar el ACTA DE INVENTARIO en PDF (con firmas), lista para auditoría;
//   • actualizar las hojas de auditoría del Excel (Aud_Inventario,
//     Aud_Nuevas y Aud_Bajas) con un clic (Supervisor y Admin).
//  Usa los datos que ya carga gt-06-inventario.js (INV_ITEMS), así que las
//  cifras son las mismas que ve el resto de la app.
//  Regla de códigos repetidos y filas sin código: ver invResolverRepetidos().
// ═══════════════════════════════════════════════════════════
var IA_ULTIMAS = ["Por revisar", "Sin categoría"];

function iaMayus(s){ s=(s||"").toString().trim(); return s?s.charAt(0).toUpperCase()+s.slice(1).toLowerCase():""; }

// Cifras de un ítem: total, bajas, prestadas y disponibles (igual que el servidor).
function iaCifras(it){
  var definido=(it.cantidadTotal!==""&&isFinite(Number(it.cantidadTotal)));
  var total=0;
  if(it.repetido){ total = it.totalAgregado!==undefined ? it.totalAgregado : 0; }
  else if(definido){ total=Number(it.cantidadTotal); }
  var bajas=it.bajasTotal||0, prest=it.prestadas||0;
  return {total:total, bajas:bajas, prestadas:prest, disp:total-bajas-prest, definido:definido, danadas:it.danadas||0, extraviadas:it.extraviadas||0};
}

// Devuelve [{nombre, subs:[{nombre, items:[]}], t:{total,bajas,prestadas,disp}, n}] más el total general.
function iaAgrupar(filtro){
  var q=(filtro||"").toString().trim().toLowerCase();
  var cats={};
  INV_ITEMS.forEach(function(it){
    if(it.tipo!=="Herramienta") return;
    if(q){
      var txt=(it.codigo+" "+it.descripcion+" "+it.categoria+" "+it.subcategoria+" "+it.marca).toLowerCase();
      if(txt.indexOf(q)<0) return;
    }
    var cat=(it.categoria||"").trim()||"Sin categoría", sub=(it.subcategoria||"").trim()||"Sin subcategoría";
    var c=cats[cat]=cats[cat]||{nombre:cat,subs:{},t:{total:0,bajas:0,prestadas:0,disp:0},n:0};
    var s=c.subs[sub]=c.subs[sub]||{nombre:sub,items:[]};
    s.items.push(it); c.n++;
    var f=iaCifras(it); c.t.total+=f.total; c.t.bajas+=f.bajas; c.t.prestadas+=f.prestadas; c.t.disp+=f.disp;
  });
  var nombres=Object.keys(cats).sort(function(a,b){
    var ua=IA_ULTIMAS.indexOf(a), ub=IA_ULTIMAS.indexOf(b);
    if(ua!==ub) return (ua<0?-1:ua)-(ub<0?-1:ub);
    return a.localeCompare(b,"es");
  });
  var tg={total:0,bajas:0,prestadas:0,disp:0}, n=0;
  var lista=nombres.map(function(nm){
    var c=cats[nm];
    c.subsLista=Object.keys(c.subs).sort(function(a,b){
      if(a==="Sin subcategoría") return 1; if(b==="Sin subcategoría") return -1; return a.localeCompare(b,"es");
    }).map(function(k){
      var s=c.subs[k]; s.items.sort(function(a,b){ return a.descripcion.localeCompare(b.descripcion,"es"); }); return s;
    });
    tg.total+=c.t.total; tg.bajas+=c.t.bajas; tg.prestadas+=c.t.prestadas; tg.disp+=c.t.disp; n+=c.n;
    return c;
  });
  return {cats:lista, t:tg, n:n};
}

function abrirInventarioAgrupado(){
  navLimpiarTodo();
  var s=document.getElementById("invAgrupadoScr"); if(!s) return;
  s.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  var rol=((SESION&&SESION.rol)||"").toLowerCase();
  var b=document.getElementById("iaBtnAuditoria"); if(b) b.style.display=(rol==="admin"||rol==="supervisor")?"block":"none";
  iaCargar();
}

function iaCargar(){
  var box=document.getElementById("iaLista");
  box.innerHTML="<div class='loading'>🔄 Cargando inventario...</div>";
  document.getElementById("iaAviso").innerHTML="";
  Promise.resolve(invCargar()).then(function(){ iaRender(); }).catch(function(e){
    box.innerHTML="<div class='msg-err'>❌ No se pudo cargar: "+esc(e.message)+"</div>";
  });
}

function iaRender(){
  var q=(document.getElementById("iaBuscar")||{value:""}).value;
  var g=iaAgrupar(q), box=document.getElementById("iaLista");
  var repetidos={}, negativos=0;
  INV_ITEMS.forEach(function(it){
    if(it.tipo!=="Herramienta") return;
    if(it.repetido) repetidos[it.codigo.trim().toLowerCase()]=1;
    var f=iaCifras(it); if(f.definido&&f.disp<0&&!(it.repetido&&it.totalAgregado===0)) negativos++;
  });
  var avisos=[];
  if(negativos) avisos.push("⚠️ "+negativos+" herramienta(s) con más unidades prestadas o dadas de baja que su cantidad total (disponibles en rojo). Revisa los préstamos abiertos o corrige la cantidad.");
  if(Object.keys(repetidos).length) avisos.push("⚠️ "+Object.keys(repetidos).length+" código(s) repetido(s) en el catálogo (marcados «repetido»): sus cantidades se suman en la primera fila. Corrígelos en el Excel.");
  if(INV_SIN_CODIGO) avisos.push("ℹ️ "+INV_SIN_CODIGO+" fila(s) del catálogo no tienen código y no aparecen aquí (no se pueden prestar). Se listan en la hoja de auditoría.");
  var html="<div class='card' style='padding:10px'><div style='font-size:12px'><b>"+g.cats.length+"</b> categorías · <b>"+g.n+"</b> ítems · <b>"+g.t.total+"</b> unidades · "+
    "<b>"+g.t.prestadas+"</b> prestadas · <b>"+g.t.bajas+"</b> de baja · <b style='color:"+(g.t.disp<0?"#C00000":"#375623")+"'>"+g.t.disp+" disponibles</b></div>"+
    (avisos.length?"<div style='font-size:11px;color:#7A4B00;margin-top:6px;line-height:1.4'>"+avisos.map(esc).join("<br>")+"</div>":"")+"</div>";
  if(!g.cats.length) html+="<div class='empty'><p>No hay herramientas que coincidan.</p></div>";
  g.cats.forEach(function(c){
    html+="<details class='card' style='padding:0' "+(q?"open":"")+"><summary style='padding:10px 12px;cursor:pointer;font-weight:bold;color:#1B4332'>"+esc(c.nombre)+
      " <span style='font-weight:normal;font-size:11px;color:#666'>· "+c.n+" ítems · "+c.t.disp+" disp. / "+c.t.total+" total</span></summary><div style='padding:0 12px 10px'>";
    c.subsLista.forEach(function(s){
      html+="<div style='font-size:11px;font-weight:bold;color:#2D6A4F;margin:8px 0 3px;border-bottom:1px solid #D8F3DC'>"+esc(s.nombre)+"</div>";
      s.items.forEach(function(it){
        var f=iaCifras(it);
        var linea=(f.definido||it.repetido)?(f.total+" total"+(f.bajas?" · "+f.bajas+" de baja":"")+(f.prestadas?" · "+f.prestadas+" prestadas":"")):"sin cantidad definida"+(f.prestadas?" · "+f.prestadas+" prestadas":"");
        var dispTxt=(f.definido||it.repetido)?"<b style='color:"+(f.disp<0?"#C00000":"#375623")+"'>"+f.disp+"</b>":"<span style='color:#999'>—</span>";
        html+="<div style='display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:12px'>"+
          "<div style='min-width:0'>"+esc(it.descripcion)+" <span style='font-size:10px;color:#888'>"+esc(it.codigo)+"</span>"+
          (it.repetido?" <span style='font-size:10px;color:#C00000'>⚠ repetido</span>":"")+
          "<div style='font-size:10px;color:#777'>"+linea+(it.estado?" · "+esc(iaMayus(it.estado)):"")+"</div></div>"+
          "<div style='flex-shrink:0;text-align:right;font-size:10px;color:#777'>disp.<div style='font-size:14px'>"+dispTxt+"</div></div></div>";
      });
    });
    html+="</div></details>";
  });
  box.innerHTML=html;
}

// ── Acta de inventario en PDF ──
function iaGenerarActa(){
  var avisoBox=document.getElementById("iaAviso");
  var q=(document.getElementById("iaBuscar")||{value:""}).value;
  var g=iaAgrupar(q);
  if(!g.cats.length){ avisoBox.innerHTML="<div class='msg-err'>No hay herramientas para el acta con ese filtro.</div>"; return; }
  if(!(window.jspdf&&window.jspdf.jsPDF)){ avisoBox.innerHTML="<div class='msg-err'>No se cargó el generador de PDF. Revisa tu conexión y recarga.</div>"; return; }
  var doc=new window.jspdf.jsPDF({unit:"mm",format:"letter"});
  var pageW=doc.internal.pageSize.getWidth(), pageH=doc.internal.pageSize.getHeight();
  var hoy=new Date(), fecha=String(hoy.getDate()).padStart(2,"0")+"/"+String(hoy.getMonth()+1).padStart(2,"0")+"/"+hoy.getFullYear();
  doc.setFontSize(15); doc.setFont(undefined,"bold"); doc.setTextColor(27,67,50);
  doc.text("ACTA DE INVENTARIO DE HERRAMIENTAS",14,16);
  doc.setFontSize(9); doc.setFont(undefined,"normal"); doc.setTextColor(90,90,90);
  doc.text(CONFIG.nombreProyecto+" · "+CONFIG.empresa+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal,14,22);
  doc.text("Fecha: "+fecha+(q?"   ·   Filtro: \""+q+"\"":"")+"   ·   "+g.cats.length+" categorías, "+g.n+" ítems",14,27);

  var body=[];
  g.cats.forEach(function(c){
    body.push([{content:c.nombre.toUpperCase()+"  ("+c.n+" ítems)",colSpan:8,styles:{fillColor:[216,243,220],textColor:[27,67,50],fontStyle:"bold"}}]);
    c.subsLista.forEach(function(s){
      s.items.forEach(function(it){
        var f=iaCifras(it), conDato=(f.definido||it.repetido);
        body.push([it.codigo||"—", (s.nombre!=="Sin subcategoría"?s.nombre+": ":"")+it.descripcion+(it.repetido?" (código repetido)":""),
          conDato?f.total:"—", f.bajas||0, f.prestadas||0, conDato?f.disp:"—", iaMayus(it.estado)||"—", it.ubicacion||"—"]);
      });
    });
    body.push([{content:"Subtotal "+c.nombre,colSpan:2,styles:{fontStyle:"bold",fillColor:[242,242,242]}},
      {content:c.t.total,styles:{fontStyle:"bold",fillColor:[242,242,242]}},{content:c.t.bajas,styles:{fontStyle:"bold",fillColor:[242,242,242]}},
      {content:c.t.prestadas,styles:{fontStyle:"bold",fillColor:[242,242,242]}},{content:c.t.disp,styles:{fontStyle:"bold",fillColor:[242,242,242]}},
      {content:"",colSpan:2,styles:{fillColor:[242,242,242]}}]);
  });
  body.push([{content:"TOTAL GENERAL",colSpan:2,styles:{fontStyle:"bold",fillColor:[27,67,50],textColor:255}},
    {content:g.t.total,styles:{fontStyle:"bold",fillColor:[27,67,50],textColor:255}},{content:g.t.bajas,styles:{fontStyle:"bold",fillColor:[27,67,50],textColor:255}},
    {content:g.t.prestadas,styles:{fontStyle:"bold",fillColor:[27,67,50],textColor:255}},{content:g.t.disp,styles:{fontStyle:"bold",fillColor:[27,67,50],textColor:255}},
    {content:"",colSpan:2,styles:{fillColor:[27,67,50]}}]);
  doc.autoTable({
    startY:32, head:[["Código","Descripción","Total","Bajas","Prest.","Disp.","Estado","Ubicación"]], body:body,
    styles:{fontSize:7.5,cellPadding:1.6}, headStyles:{fillColor:[27,67,50],textColor:255},
    columnStyles:{2:{halign:"right"},3:{halign:"right"},4:{halign:"right"},5:{halign:"right"}}
  });
  var y=(doc.lastAutoTable&&doc.lastAutoTable.finalY?doc.lastAutoTable.finalY:40)+14;
  if(y>pageH-40){ doc.addPage(); y=30; }
  doc.setFontSize(8); doc.setTextColor(90,90,90);
  doc.text("Bajas = herramientas dañadas o extraviadas aún vigentes. Prest. = unidades prestadas al momento de generar el acta. Disp. = Total − Bajas − Prest.",14,y-6);
  doc.setDrawColor(120,120,120); doc.setTextColor(60,60,60); doc.setFontSize(9);
  [["Almacenista",14],["Supervisor del proyecto",78],["Auditor / Revisó",142]].forEach(function(p){
    doc.line(p[1],y+12,p[1]+54,y+12); doc.text(p[0],p[1],y+17);
    doc.text("Nombre y firma",p[1],y+22);
  });
  var nombreArchivo="Acta_Inventario_"+CONFIG.codigoProyecto+"_"+hoy.getFullYear()+"-"+String(hoy.getMonth()+1).padStart(2,"0")+"-"+String(hoy.getDate()).padStart(2,"0")+".pdf";
  mostrarVistaPreviaPDF(doc,nombreArchivo,avisoBox,g.n,"ítems en el acta");
}

// ── Hojas de auditoría en el Excel ──
function iaActualizarAuditoria(){
  var avisoBox=document.getElementById("iaAviso");
  if(!confirm("Se (re)crean en tu Excel las hojas Aud_Inventario, Aud_Nuevas y Aud_Bajas. No se modifica ninguna otra hoja. ¿Continuar?")) return;
  var btn=_botonDelEvento();
  if(!_bloquearBoton(btn,"iaActualizarAuditoria","⏳ Generando...")) return;
  avisoBox.innerHTML="<div class='msg-ok'>🔄 Generando hojas de auditoría...</div>";
  gasPost("generarHojaAuditoria",{}).then(function(r){
    _liberarBoton(btn,"iaActualizarAuditoria");
    avisoBox.innerHTML="<div class='msg-ok'>✅ Hojas actualizadas en tu Excel: <b>Aud_Inventario</b> ("+r.items+" ítems en "+r.categorias+" categorías), <b>Aud_Nuevas</b> ("+r.nuevas+"), <b>Aud_Bajas</b> ("+r.bajas+").<br>"+
      "<small>Ábrelas en el Excel para imprimir o entregar."+(r.repetidos?" Hay "+r.repetidos+" código(s) repetido(s) y "+r.sinCodigo+" fila(s) sin código por corregir.":(r.sinCodigo?" Hay "+r.sinCodigo+" fila(s) sin código por corregir.":""))+"</small></div>";
  }).catch(function(e){
    _liberarBoton(btn,"iaActualizarAuditoria");
    avisoBox.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>";
  });
}
