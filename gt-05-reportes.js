// ══════════════════════════════════════════════
//  REPORTES — informe diario (solo lectura, genera PDF local)
// ══════════════════════════════════════════════
var REPORTE_ACTUAL=null;

function fmtItem(it){
  var t=fmtDetalleItem(it);
  var base=(it.codigo?("["+it.codigo+"] "):"")+it.descripcion;
  return t ? (base+" ("+t+")") : base;
}

// Rango de fechas activo por defecto: hoy
var RANGO_DESDE=null; // Date

var RANGO_HASTA=null; // Date

function fechaAInput(d){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function rangoRapido(tipo){
  ["ri0","ri1","ri2","ri3"].forEach(function(id,i){
    document.getElementById(id).classList.toggle("on",["hoy","semana","mes","personalizado"][i]===tipo);
  });
  var hoy=new Date();
  document.getElementById("rangoManual").style.display=(tipo==="personalizado")?"block":"none";
  if(tipo==="hoy"){
    RANGO_DESDE=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate());
    RANGO_HASTA=RANGO_DESDE;
  } else if(tipo==="semana"){
    var d=new Date(hoy);
    d.setDate(d.getDate()-6);
    RANGO_DESDE=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    RANGO_HASTA=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate());
  } else if(tipo==="mes"){
    RANGO_DESDE=new Date(hoy.getFullYear(),hoy.getMonth(),1);
    RANGO_HASTA=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate());
  } else {
    // personalizado: se toma de los inputs al generar
    RANGO_DESDE=null;RANGO_HASTA=null;
    document.getElementById("fechaDesde").value=fechaAInput(hoy);
    document.getElementById("fechaHasta").value=fechaAInput(hoy);
  }
}

function parseFechaDMY(str){
  var partes=(str||"").split("/");
  if(partes.length!==3) return null;
  var d=new Date(parseInt(partes[2],10),parseInt(partes[1],10)-1,parseInt(partes[0],10));
  return isNaN(d.getTime())?null:d;
}

function generarInforme(){
  var desde=RANGO_DESDE, hasta=RANGO_HASTA;
  var elPersonalizado=document.getElementById("ri3").classList.contains("on");
  if(elPersonalizado){
    var vd=document.getElementById("fechaDesde").value;
    var vh=document.getElementById("fechaHasta").value;
    if(!vd||!vh){alert("Selecciona ambas fechas.");return;}
    var pd=vd.split("-"),ph=vh.split("-");
    desde=new Date(parseInt(pd[0]),parseInt(pd[1])-1,parseInt(pd[2]));
    hasta=new Date(parseInt(ph[0]),parseInt(ph[1])-1,parseInt(ph[2]));
  }
  if(!desde||!hasta){alert("Selecciona un rango de fechas.");return;}
  if(desde>hasta){alert("La fecha 'Desde' no puede ser mayor que 'Hasta'.");return;}

  var filtroTrab=document.getElementById("riTrab").value.toLowerCase().trim();
  var filtroTipo=document.getElementById("riTipo").value;

  document.getElementById("ri").innerHTML="<div class='loading'>🔄 Generando informe...</div>";

  Promise.all([
    sheetsGet("Prestamos_Herramientas!A2:H"),
    sheetsGet("Prestamos_Detalle!A2:I"),
    sheetsGet(SHEET("Personal")+"!A2:C")
  ]).then(function(results){
    var dp=results[0].values||[];
    var dd=results[1].values||[];
    var dpers=results[2].values||[];

    var mapaNom={};
    for(var p=0;p<dpers.length;p++){
      var cP=(dpers[p][0]||"").toString().trim();
      var nP=(dpers[p][1]||"").toString().trim();
      if(cP&&nP) mapaNom[cP.toLowerCase()]=nP;
    }

    function itemsDe(id){
      var out=[];
      for(var j=0;j<dd.length;j++){
        if((dd[j][1]||"").toString()!==id) continue;
        var tipoIt=(dd[j][5]||"Herramienta").toString();
        if(filtroTipo&&tipoIt!==filtroTipo) continue;
        out.push({codigo:(dd[j][2]||"").toString(),descripcion:(dd[j][3]||"").toString(),tipo:tipoIt,detalle:(dd[j][6]||"").toString(),cantidad:(dd[j][7]||"").toString(),obs:(dd[j][8]||"").toString()});
      }
      return out;
    }

    var movimientosPeriodo=[];
    var enCampo=[];

    for(var i=0;i<dp.length;i++){
      var id=(dp[i][0]||"").toString();
      if(!id) continue;
      var fechaStr=(dp[i][1]||"").toString().trim();
      var fechaObj=parseFechaDMY(fechaStr);
      var codigo=(dp[i][2]||"").toString().trim();
      var nomGuardado=(dp[i][3]||"").toString().trim();
      var nombre=nomGuardado||mapaNom[codigo.toLowerCase()]||"";
      var horaSalida=(dp[i][5]||"").toString();
      var horaDevolucion=(dp[i][6]||"").toString();
      var estado=(dp[i][7]||"").toString().toLowerCase().trim();

      if(filtroTrab && nombre.toLowerCase().indexOf(filtroTrab)<0 && codigo.toLowerCase().indexOf(filtroTrab)<0) continue;

      var items=itemsDe(id);
      if(filtroTipo && !items.length) continue; // no tiene items de ese tipo, se descarta del reporte

      if(fechaObj && fechaObj>=desde && fechaObj<=hasta){
        movimientosPeriodo.push({idPrestamo:id,nombre:nombre,codigo:codigo,fecha:fechaStr,fechaObj:fechaObj,horaSalida:horaSalida,horaDevolucion:horaDevolucion,estado:estado,items:items});
      }
      if(estado==="abierto" && items.length){
        enCampo.push({idPrestamo:id,nombre:nombre,codigo:codigo,fecha:fechaStr,fechaObj:fechaObj,horaSalida:horaSalida,items:items});
      }
    }

    // Resumen por trabajador (lo que sigue en campo)
    var resumenMap={};
    enCampo.forEach(function(pr){
      var key=pr.codigo||pr.nombre;
      if(!resumenMap[key]) resumenMap[key]={nombre:pr.nombre,codigo:pr.codigo,cantidad:0};
      resumenMap[key].cantidad+=pr.items.length;
    });
    var resumen=Object.keys(resumenMap).map(function(k){return resumenMap[k];})
      .sort(function(a,b){return b.cantidad-a.cantidad;});

    // ── Consolidado numérico ──
    var totalMovimientos=movimientosPeriodo.length;
    var conteoItem={};
    var conteoTrab={};
    movimientosPeriodo.forEach(function(pr){
      var keyT=pr.codigo||pr.nombre;
      conteoTrab[keyT]=(conteoTrab[keyT]||0)+pr.items.length;
      pr.items.forEach(function(it){
        conteoItem[it.descripcion]=(conteoItem[it.descripcion]||0)+1;
      });
    });
    var itemsDistintos=Object.keys(conteoItem).length;
    var itemTop=Object.keys(conteoItem).sort(function(a,b){return conteoItem[b]-conteoItem[a];})[0]||null;
    var trabTopKey=Object.keys(conteoTrab).sort(function(a,b){return conteoTrab[b]-conteoTrab[a];})[0]||null;
    var trabTopNom=null;
    if(trabTopKey){
      var found=movimientosPeriodo.find(function(pr){return (pr.codigo||pr.nombre)===trabTopKey;});
      trabTopNom=found?(found.nombre||found.codigo):trabTopKey;
    }
    var hoyRef=new Date();
    var atrasados=enCampo.filter(function(pr){
      if(!pr.fechaObj) return false;
      var dias=Math.floor((hoyRef-pr.fechaObj)/86400000);
      return dias>=7;
    }).length;

    var consolidado={
      totalMovimientos:totalMovimientos,
      itemsDistintos:itemsDistintos,
      itemTop:itemTop?(itemTop+" ("+conteoItem[itemTop]+")"):"—",
      trabTop:trabTopNom?(trabTopNom+" ("+conteoTrab[trabTopKey]+")"):"—",
      totalEnCampo:enCampo.reduce(function(s,pr){return s+pr.items.length;},0),
      atrasados:atrasados
    };

    REPORTE_ACTUAL={desde:desde,hasta:hasta,movimientosPeriodo:movimientosPeriodo,enCampo:enCampo,resumen:resumen,consolidado:consolidado,filtroTrab:filtroTrab,filtroTipo:filtroTipo};
    mostrarInforme(REPORTE_ACTUAL);
  }).catch(function(e){
    document.getElementById("ri").innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

function fechaLegible(d){
  return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();
}

function mostrarInforme(r){
  var d=document.getElementById("ri");
  var html="";
  var rangoTxt=(r.desde.getTime()===r.hasta.getTime())?fechaLegible(r.desde):(fechaLegible(r.desde)+" al "+fechaLegible(r.hasta));

  html+="<div class='card'><div class='rep-meta'>📅 Periodo: "+rangoTxt+" · generado el "+new Date().toLocaleString("es-GT")+"</div>";
  html+="<button class='btn b-ok' onclick='descargarPDF()'>📄 Descargar PDF</button></div>";

  // Consolidado numérico
  var c=r.consolidado;
  html+="<div class='card rep-sec'><div class='rep-tit'>📈 Consolidado del periodo</div>"+
    "<table class='rep-tabla'>"+
    "<tr><td>Total de movimientos registrados</td><td style='text-align:right;font-weight:bold'>"+c.totalMovimientos+"</td></tr>"+
    "<tr><td>Ítems distintos que rotaron</td><td style='text-align:right;font-weight:bold'>"+c.itemsDistintos+"</td></tr>"+
    "<tr><td>Ítem más solicitado</td><td style='text-align:right;font-weight:bold'>"+c.itemTop+"</td></tr>"+
    "<tr><td>Trabajador con más préstamos</td><td style='text-align:right;font-weight:bold'>"+c.trabTop+"</td></tr>"+
    "<tr><td>Total de ítems actualmente en campo</td><td style='text-align:right;font-weight:bold'>"+c.totalEnCampo+"</td></tr>"+
    "<tr><td>Préstamos con 7+ días sin devolver ⚠️</td><td style='text-align:right;font-weight:bold;color:"+(c.atrasados>0?"#c0392b":"#333")+"'>"+c.atrasados+"</td></tr>"+
    "</table></div>";

  // Bloque 1: movimientos del periodo
  html+="<div class='card rep-sec'><div class='rep-tit'>📦 Movimientos del periodo ("+r.movimientosPeriodo.length+")</div>";
  if(!r.movimientosPeriodo.length){
    html+="<div class='empty'><div class='ei'>📭</div><p>Sin movimientos en este periodo</p></div>";
  } else {
    html+="<table class='rep-tabla'><tr><th>Trabajador</th><th>Ítems</th><th>Fecha</th><th>Salida</th><th>Devolución</th></tr>"+
      r.movimientosPeriodo.map(function(p){
        var itemsTxt=p.items.map(fmtItem).join(", ")||"—";
        return "<tr><td>"+(p.nombre||"(sin nombre)")+" · "+p.codigo+"</td><td>"+itemsTxt+"</td><td>"+p.fecha+"</td><td>"+(p.horaSalida||"—")+"</td><td>"+(p.horaDevolucion||"—")+"</td></tr>";
      }).join("")+"</table>";
  }
  html+="</div>";

  // Bloque 2: en campo (estado actual)
  html+="<div class='card rep-sec'><div class='rep-tit'>🟡 Herramientas actualmente en campo ("+r.enCampo.length+")</div>";
  if(!r.enCampo.length){
    html+="<div class='empty'><div class='ei'>✅</div><p>No hay herramientas pendientes de devolución</p></div>";
  } else {
    html+="<table class='rep-tabla'><tr><th>Trabajador</th><th>Ítems</th><th>Desde</th></tr>"+
      r.enCampo.map(function(p){
        var itemsTxt=p.items.map(fmtItem).join(", ")||"—";
        return "<tr><td>"+(p.nombre||"(sin nombre)")+" · "+p.codigo+"</td><td>"+itemsTxt+"</td><td>"+p.fecha+" "+(p.horaSalida||"")+"</td></tr>";
      }).join("")+"</table>";
  }
  html+="</div>";

  // Bloque 3: resumen por trabajador
  html+="<div class='card rep-sec'><div class='rep-tit'>👷 Resumen por trabajador (con pendientes)</div>";
  if(!r.resumen.length){
    html+="<div class='empty'><div class='ei'>✅</div><p>Nadie tiene herramientas pendientes</p></div>";
  } else {
    html+="<table class='rep-tabla'><tr><th>Trabajador</th><th>Código</th><th>Cant.</th></tr>"+
      r.resumen.map(function(x){
        return "<tr><td>"+(x.nombre||"(sin nombre)")+"</td><td>"+x.codigo+"</td><td>"+x.cantidad+"</td></tr>";
      }).join("")+"</table>";
  }
  html+="</div>";

  d.innerHTML=html;
}

function descargarPDF(){
  if(!REPORTE_ACTUAL){alert("Primero genera el informe.");return;}
  if(!window.jspdf){alert("No se pudo cargar el generador de PDF. Verifica tu conexión e intenta de nuevo.");return;}
  var r=REPORTE_ACTUAL;
  var doc=new window.jspdf.jsPDF();
  var ahora=new Date();
  var fechaGen=ahora.getFullYear()+"-"+String(ahora.getMonth()+1).padStart(2,"0")+"-"+String(ahora.getDate()).padStart(2,"0");
  var horaGen=String(ahora.getHours()).padStart(2,"0")+String(ahora.getMinutes()).padStart(2,"0");
  var rangoTxt=(r.desde.getTime()===r.hasta.getTime())?fechaLegible(r.desde):(fechaLegible(r.desde)+" al "+fechaLegible(r.hasta));

  doc.setFontSize(14);
  doc.text("Informe — "+CONFIG.nombreProyecto+" "+CONFIG.ubicacion,14,15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Periodo: "+rangoTxt+"   ·   Generado: "+ahora.toLocaleString("es-GT"),14,21);

  var c=r.consolidado;
  var y=28;
  doc.setFontSize(11);doc.setTextColor(20);
  doc.text("Consolidado del periodo",14,y);
  doc.autoTable({
    startY:y+3,
    head:[["Indicador","Valor"]],
    body:[
      ["Total de movimientos",String(c.totalMovimientos)],
      ["Items distintos que rotaron",String(c.itemsDistintos)],
      ["Item mas solicitado",c.itemTop],
      ["Trabajador con mas prestamos",c.trabTop],
      ["Total de items en campo",String(c.totalEnCampo)],
      ["Prestamos con 7+ dias sin devolver",String(c.atrasados)]
    ],
    styles:{fontSize:8},headStyles:{fillColor:[31,56,100]},margin:{left:14,right:14}
  });
  y=doc.lastAutoTable.finalY+10;

  doc.setFontSize(11);
  doc.text("Movimientos del periodo ("+r.movimientosPeriodo.length+")",14,y);
  doc.autoTable({
    startY:y+3,
    head:[["Trabajador","Codigo","Items","Fecha","Salida","Devolucion"]],
    body:r.movimientosPeriodo.length? r.movimientosPeriodo.map(function(p){
      return[p.nombre||"(sin nombre)",p.codigo,p.items.map(fmtItem).join(", ")||"-",p.fecha,p.horaSalida||"-",p.horaDevolucion||"-"];
    }):[["Sin movimientos en este periodo","","","","",""]],
    styles:{fontSize:8},headStyles:{fillColor:[31,56,100]},margin:{left:14,right:14}
  });
  y=doc.lastAutoTable.finalY+10;

  if(y>250){doc.addPage();y=20;}
  doc.setFontSize(11);
  doc.text("Herramientas actualmente en campo ("+r.enCampo.length+")",14,y);
  doc.autoTable({
    startY:y+3,
    head:[["Trabajador","Codigo","Items","Desde"]],
    body:r.enCampo.length? r.enCampo.map(function(p){
      return[p.nombre||"(sin nombre)",p.codigo,p.items.map(fmtItem).join(", ")||"-",p.fecha+" "+(p.horaSalida||"")];
    }):[["Nada pendiente","","",""]],
    styles:{fontSize:8},headStyles:{fillColor:[244,185,66],textColor:[50,40,0]},margin:{left:14,right:14}
  });
  y=doc.lastAutoTable.finalY+10;

  if(y>250){doc.addPage();y=20;}
  doc.setFontSize(11);
  doc.text("Resumen por trabajador",14,y);
  doc.autoTable({
    startY:y+3,
    head:[["Trabajador","Codigo","Cantidad"]],
    body:r.resumen.length? r.resumen.map(function(x){
      return[x.nombre||"(sin nombre)",x.codigo,String(x.cantidad)];
    }):[["Nadie tiene pendientes","",""]],
    styles:{fontSize:8},headStyles:{fillColor:[55,86,35]},margin:{left:14,right:14}
  });

  doc.save("Informe_"+CONFIG.codigoProyecto+"_"+fechaGen+"_"+horaGen+".pdf");
}
