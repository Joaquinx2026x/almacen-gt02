// ═══════════════════════════════════════════════════════════
//  PRÉSTAMOS ABIERTOS — revisar y cerrar (v3.2.0)
//  Menú ☰ → «Préstamos abiertos». Lista TODOS los préstamos que todavía
//  tienen herramientas con estado "Prestada", del más antiguo al más
//  nuevo, para regularizar los que quedaron sin devolución registrada.
//  Por cada herramienta se elige: sigue prestada / devuelta bien / con
//  daño / pérdida. Usa la misma acción que la pestaña Devolución
//  (cerrarPrestamo), así que el daño y la pérdida generan su baja solos.
//  También ofrece cerrar de una vez los préstamos "Abiertos" que ya no
//  tienen ninguna herramienta pendiente.
//  Valores del estado (iguales a Devolución): Bueno, Con daño, Perdida,
//  Pendiente (= sigue prestada, no se envía).
// ═══════════════════════════════════════════════════════════
var PD_PRESTAMOS=[], PD_SIN_PENDIENTE=[], PD_INACTIVOS={};

// ── Fechas (v3.2.0) ──
// En el Excel real, Google Sheets convirtió algunas fechas de préstamo con día
// del 1 al 12 al revés (1 de septiembre quedó como 9 de enero; ver
// 96_ReparoFechas.gs). Hasta que se ejecute el reparo, esta pantalla no se fía
// de una sola lectura: para cada fecha ambigua considera día/mes y mes/día y
// elige la que queda más cerca de los préstamos vecinos (los números de
// préstamo van en orden cronológico) y nunca en el futuro.
function pdCandidatos(txt){
  txt=(txt||"").toString().trim();
  var m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(txt), c=[];
  if(m){
    var a=Number(m[1]), b=Number(m[2]), y=Number(m[3]);
    if(a>=1&&a<=31&&b>=1&&b<=12) c.push(new Date(y,b-1,a));          // día/mes
    if(a>=1&&a<=12&&b>=1&&b<=31&&a!==b) c.push(new Date(y,a-1,b));   // mes/día
    return c;
  }
  var iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(txt);
  if(iso) c.push(new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3])));
  return c;
}
function pdNumId(id){ var m=/(\d+)\s*$/.exec((id||"").toString()); return m?Number(m[1]):0; }
// filas = filas de Prestamos_Herramientas; devuelve un arreglo de Date|null alineado con las filas.
function pdInferirFechas(filas){
  var hoy=new Date(); hoy.setHours(23,59,59,999);
  var orden=filas.map(function(r,i){ return {i:i,n:pdNumId(r[0]),c:pdCandidatos(r[1])}; }).sort(function(a,b){ return (a.n-b.n)||(a.i-b.i); });
  var res=filas.map(function(){ return null; });
  orden.forEach(function(o){
    var validas=o.c.filter(function(d){ return d<=hoy; });
    if(o.c.length===1) res[o.i]=o.c[0]; else if(validas.length===1) res[o.i]=validas[0];
  });
  orden.forEach(function(o,k){
    if(res[o.i]||!o.c.length) return;
    var ancla=null, j;
    for(j=k-1;j>=0;j--){ if(res[orden[j].i]){ ancla=res[orden[j].i]; break; } }
    if(!ancla) for(j=k+1;j<orden.length;j++){ if(res[orden[j].i]){ ancla=res[orden[j].i]; break; } }
    var cand=o.c.filter(function(d){ return d<=hoy; }); if(!cand.length) cand=o.c;
    if(!ancla){ res[o.i]=cand[0]; return; }
    cand.sort(function(a,b){ return Math.abs(a-ancla)-Math.abs(b-ancla); });
    res[o.i]=cand[0];
  });
  return res;
}
function pdFmtFecha(d){ return d?String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear():""; }
function pdDias(f){ if(!f) return null; var hoy=new Date(); hoy=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()); return Math.round((hoy-f)/86400000); }

function abrirPendientes(){
  if(esUsuarioSoloLectura()){ alert("Tu usuario es de solo lectura."); return; }
  navLimpiarTodo();
  var s=document.getElementById("pendientesScr"); if(!s) return;
  s.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  pdCargar();
}

function pdCargar(){
  var box=document.getElementById("pdLista");
  box.innerHTML="<div class='loading'>🔄 Cargando préstamos abiertos...</div>";
  document.getElementById("pdAviso").innerHTML="";
  Promise.all([
    sheetsGet("Prestamos_Herramientas!A2:K"),
    sheetsGet("Prestamos_Detalle!A2:I"),
    sheetsGet(SHEET("Personal")+"!A2:G")
  ]).then(function(res){
    var dp=res[0].values||[], dd=res[1].values||[], per=res[2].values||[];
    PD_INACTIVOS={};
    per.forEach(function(r){ if((r[6]||"").toString().trim().toLowerCase()==="inactivo") PD_INACTIVOS[(r[0]||"").toString().trim().toLowerCase()]=1; });
    var porPrestamo={};
    dd.forEach(function(r){
      var id=(r[1]||"").toString().trim();
      (porPrestamo[id]=porPrestamo[id]||[]).push(r);
    });
    PD_PRESTAMOS=[]; PD_SIN_PENDIENTE=[];
    var fechasInf=pdInferirFechas(dp);
    dp.forEach(function(p,ix){
      if((p[7]||"").toString().trim().toLowerCase()!=="abierto") return;
      var id=(p[0]||"").toString().trim();
      var items=[];
      (porPrestamo[id]||[]).forEach(function(r){
        if((r[5]||"").toString().trim().toLowerCase()!=="herramienta") return;
        if((r[4]||"").toString().trim().toLowerCase()!=="prestada") return;
        items.push({idDetalle:(r[0]||"").toString().trim(),codigo:(r[2]||"").toString(),descripcion:(r[3]||"").toString(),cantidad:(Number(r[7])>1?Number(r[7]):1)});
      });
      if(!items.length){ PD_SIN_PENDIENTE.push(id); return; }
      var f=fechasInf[ix];
      PD_PRESTAMOS.push({id:id,fecha:f?pdFmtFecha(f):(p[1]||"").toString(),dias:pdDias(f),horaSalida:(p[5]||"").toString(),codigo:(p[2]||"").toString().trim(),nombre:(p[3]||"").toString(),items:items});
    });
    PD_PRESTAMOS.sort(function(a,b){ return (b.dias===null?-1:b.dias)-(a.dias===null?-1:a.dias); });
    pdRender();
  }).catch(function(e){ box.innerHTML="<div class='msg-err'>❌ No se pudo cargar: "+esc(e.message)+"</div>"; });
}

function pdFiltrados(){
  var f=(document.getElementById("pdFiltroDias")||{value:"0"}).value;
  var q=((document.getElementById("pdBuscar")||{value:""}).value||"").trim().toLowerCase();
  var soloInact=!!(document.getElementById("pdSoloInactivos")||{}).checked;
  var min=Number(f)||0;
  return PD_PRESTAMOS.map(function(p,i){ return {p:p,i:i}; }).filter(function(o){
    var p=o.p;
    if(min && !(p.dias!==null&&p.dias>min)) return false;
    if(q && (p.nombre+" "+p.codigo+" "+p.id).toLowerCase().indexOf(q)<0) return false;
    if(soloInact && !PD_INACTIVOS[p.codigo.toLowerCase()]) return false;
    return true;
  });
}

function pdRender(){
  var box=document.getElementById("pdLista");
  var lista=pdFiltrados();
  var unidades=0, viejos=0, inact=0;
  PD_PRESTAMOS.forEach(function(p){ p.items.forEach(function(it){ unidades+=it.cantidad; }); if(p.dias!==null&&p.dias>30) viejos++; if(PD_INACTIVOS[p.codigo.toLowerCase()]) inact++; });
  var html="<div class='card' style='padding:10px;font-size:12px'><b>"+PD_PRESTAMOS.length+"</b> préstamos con herramientas pendientes · <b>"+unidades+"</b> unidades · "+
    "<b style='color:"+(viejos?"#C00000":"#375623")+"'>"+viejos+"</b> con más de 30 días"+(inact?" · <b style='color:#C00000'>"+inact+"</b> de trabajadores dados de baja":"")+"</div>";
  if(PD_SIN_PENDIENTE.length){
    html+="<div class='card' style='padding:10px;border:1px solid #E67E22'><div style='font-size:12px'>⚠️ <b>"+PD_SIN_PENDIENTE.length+"</b> préstamo(s) figuran «Abierto» pero ya no tienen ninguna herramienta pendiente (probablemente solo insumos o devoluciones parciales sin cierre).</div>"+
      "<button class='btn b-warn b-sm' style='margin-top:6px' onclick='pdCerrarSinPendientes()'>Cerrar estos "+PD_SIN_PENDIENTE.length+" préstamos</button></div>";
  }
  if(!lista.length) html+="<div class='empty'><p>"+(PD_PRESTAMOS.length?"Ningún préstamo coincide con el filtro.":"✅ No hay préstamos con herramientas pendientes.")+"</p></div>";
  lista.forEach(function(o){
    var p=o.p, i=o.i, inactivo=!!PD_INACTIVOS[p.codigo.toLowerCase()];
    html+="<div class='card' style='padding:10px'>"+
      "<div style='display:flex;justify-content:space-between;gap:8px;align-items:flex-start'>"+
        "<div><b>"+esc(p.nombre||p.codigo)+"</b> <span style='font-size:10px;color:#888'>"+esc(p.codigo)+"</span>"+(inactivo?" <span style='background:#C00000;color:#fff;font-size:10px;padding:1px 6px;border-radius:8px'>DADO DE BAJA</span>":"")+
        "<div style='font-size:11px;color:#777'>"+esc(p.id)+" · "+esc(p.fecha)+(p.horaSalida?" "+esc(p.horaSalida):"")+"</div></div>"+
        "<div style='text-align:right;flex-shrink:0;font-size:12px;font-weight:bold;color:"+(p.dias!==null&&p.dias>30?"#C00000":(p.dias!==null&&p.dias>7?"#B7791F":"#375623"))+"'>"+(p.dias===null?"—":p.dias+" días")+"</div></div>";
    p.items.forEach(function(it){
      html+="<div style='margin-top:8px;padding-top:6px;border-top:1px solid #eee'>"+
        "<div style='font-size:12px'>🔨 "+esc(it.descripcion)+(it.cantidad>1?" <b>× "+it.cantidad+"</b>":"")+" <span style='font-size:10px;color:#888'>"+esc(it.codigo)+"</span></div>"+
        "<select id='pdEst-"+pfAttr(it.idDetalle)+"' onchange='pdToggleAfectadas(\""+pfAttr(it.idDetalle)+"\")'>"+
          "<option value='Pendiente'>⏳ Sigue prestada</option><option value='Bueno'>✅ Devuelta bien</option><option value='Con daño'>⚠️ Devuelta con daño</option><option value='Perdida'>❌ Pérdida</option></select>"+
        (it.cantidad>1?"<div id='pdAfeBox-"+pfAttr(it.idDetalle)+"' style='display:none'><label style='font-size:11px;color:#C0392B'>¿Cuántas de las "+it.cantidad+" se dañaron o se perdieron?</label><input type='number' id='pdAfe-"+pfAttr(it.idDetalle)+"' min='1' max='"+it.cantidad+"' value='1'></div>":"")+
      "</div>";
    });
    html+="<div style='display:flex;gap:8px;margin-top:8px'>"+
      "<button class='btn b-sec b-sm' style='flex:1' onclick='pdMarcarTodo("+i+")'>✅ Marcar todo devuelto</button>"+
      "<button class='btn b-ok b-sm' style='flex:1' onclick='pdProcesar("+i+")'>💾 Procesar</button></div>"+
      "<div id='pdMsg-"+i+"'></div></div>";
  });
  box.innerHTML=html;
}

function pdToggleAfectadas(idDetalle){
  var est=(document.getElementById("pdEst-"+idDetalle)||{value:""}).value;
  var b=document.getElementById("pdAfeBox-"+idDetalle); if(b) b.style.display=devEsAfectado(est)?"block":"none";
}

function pdMarcarTodo(i){
  PD_PRESTAMOS[i].items.forEach(function(it){
    var s=document.getElementById("pdEst-"+it.idDetalle); if(s){ s.value="Bueno"; pdToggleAfectadas(it.idDetalle); }
  });
}

function pdHoy(){ var h=new Date(); return String(h.getDate()).padStart(2,"0")+"/"+String(h.getMonth()+1).padStart(2,"0")+"/"+h.getFullYear(); }

function pdProcesar(i){
  var p=PD_PRESTAMOS[i], msg=document.getElementById("pdMsg-"+i);
  var marcados=[];
  p.items.forEach(function(it){
    var est=(document.getElementById("pdEst-"+it.idDetalle)||{value:"Pendiente"}).value;
    if(est==="Pendiente") return;
    var o={idDetalle:it.idDetalle,estado:est,obs:"Regularización de préstamo abierto — "+pdHoy()+(p.dias!==null?" ("+p.dias+" días)":"")};
    if(it.cantidad>1&&devEsAfectado(est)){
      var af=parseInt((document.getElementById("pdAfe-"+it.idDetalle)||{value:"1"}).value)||1;
      o.cantidadAfectada=Math.min(Math.max(af,1),it.cantidad);
    }
    marcados.push(o);
  });
  if(!marcados.length){ msg.innerHTML="<div class='msg-err'>Marca al menos una herramienta como devuelta, con daño o perdida.</div>"; return; }
  var bajas=marcados.filter(function(m){ return devEsAfectado(m.estado); }).length;
  if(!confirm("Se registrarán "+marcados.length+" herramienta(s) de "+(p.nombre||p.codigo)+(bajas?" ("+bajas+" con daño o pérdida: generan baja)":"")+". ¿Continuar?")) return;
  var btn=_botonDelEvento();
  if(!_bloquearBoton(btn,"pdProcesar","⏳ Procesando...")) return;
  gasPost("cerrarPrestamo",{idPrestamo:p.id,items:marcados,recibidoPor:(SESION&&SESION.nombre)||"Almacenista"}).then(function(r){
    _liberarBoton(btn,"pdProcesar");
    document.getElementById("pdAviso").innerHTML="<div class='msg-ok'>✅ "+esc(p.nombre||p.codigo)+": "+(r.cerrado?"préstamo cerrado":"devolución parcial, quedan herramientas pendientes")+(r.bajasCreadas?" · "+r.bajasCreadas+" baja(s) registrada(s)":"")+".</div>";
    pdCargar();
  }).catch(function(e){
    _liberarBoton(btn,"pdProcesar");
    msg.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>";
  });
}

function pdCerrarSinPendientes(){
  if(!confirm("Se cerrarán "+PD_SIN_PENDIENTE.length+" préstamos que ya no tienen herramientas pendientes. No se modifica ninguna herramienta. ¿Continuar?")) return;
  var ids=PD_SIN_PENDIENTE.slice(), hechos=0, fallos=0, quien=(SESION&&SESION.nombre)||"Almacenista";
  var aviso=document.getElementById("pdAviso");
  aviso.innerHTML="<div class='msg-ok'>🔄 Cerrando préstamos...</div>";
  ids.reduce(function(cadena,id){
    return cadena.then(function(){
      return gasPost("cerrarPrestamo",{idPrestamo:id,items:[],recibidoPor:quien}).then(function(){ hechos++; }).catch(function(){ fallos++; });
    });
  },Promise.resolve()).then(function(){
    aviso.innerHTML="<div class='"+(fallos?"msg-err":"msg-ok")+"'>"+(fallos?"⚠️ ":"✅ ")+hechos+" préstamo(s) cerrado(s)"+(fallos?", "+fallos+" con error (reintenta)":"")+".</div>";
    pdCargar();
  });
}
