// ══════════════════════════════════════════════
//  GENERADOR DE CODIGOS QR — Trabajadores GT02
//  Adaptado del generador de GT01. Misma logica de
//  layout compartido entre vista previa (canvas) y PDF.
// ══════════════════════════════════════════════
var QR_LOGO_B64 = "data:image/png;base64,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";

var QR_LOGO_RATIO = 0.42; // alto/ancho aproximado del logo

var qrTRABAJADORES = [];

var QR_MODO = "sticker";

function qrCambiarModo(modo){
  QR_MODO = modo;
  var esSticker = modo==="sticker";
  document.getElementById("qrModoBtnSticker").className = "btn "+(esSticker?"b-ok":"b-sec")+" b-sm";
  document.getElementById("qrModoBtnCarnet").className = "btn "+(esSticker?"b-sec":"b-ok")+" b-sm";
  document.getElementById("qrCardTamanos").style.display = esSticker?"block":"none";
  document.getElementById("qrBtnGenStickers").style.display = esSticker?"block":"none";
  document.getElementById("qrBtnGenCarnets").style.display = esSticker?"none":"block";
  document.getElementById("qrAvisoModoCarnet").style.display = esSticker?"none":"block";
}

var qrSELECCIONADOS = {};

var qrMUESTRA_URL = null;

function abrirGeneradorQR() {
  document.getElementById("menuMas").style.display="none";
  navLimpiarTodo(); // cierra cualquier otro módulo o pantalla abierta
  var div = document.getElementById("generadorQRScr");
  if(!div) return;
  div.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  qrCargarTrabajadores();
  if(!qrMUESTRA_URL){
    qrGenerarQRDataURL("3594-45381-0101",300).then(function(url){ qrMUESTRA_URL=url; qrActualizarPreview(); });
  } else {
    qrActualizarPreview();
  }
}

function qrCargarTrabajadores(){
  var d = document.getElementById("qrLista");
  if(!d) return;
  d.innerHTML="<div style='padding:10px;font-size:12px;color:#888'>Cargando...</div>";
  sheetsGet(SHEET("Personal")+"!A2:K").then(function(data){
    var rows = data.values || [];
    qrTRABAJADORES = rows.map(function(row){
      return {codigo:(row[0]||"").toString().trim(), nombre:(row[1]||"").toString().trim(), cargo:(row[2]||"").toString().trim(), estado:(row[6]||"Activo").toString().trim(), dui:(row[7]||"").toString().trim(), fotoId:(row[9]||"").toString().trim(), vigenciaHasta:(row[10]||"").toString().trim()};
    }).filter(function(t){ return t.codigo; });
    qrFiltrar();
  }).catch(function(){
    d.innerHTML="<div class='msg-err'>❌ No se pudo cargar la lista. Verifica tu conexión.</div>";
  });
}

function qrFiltrar(){
  var q=(document.getElementById("qrBuscar")||{value:""}).value.toLowerCase().trim();
  var d=document.getElementById("qrLista");
  if(!d) return;
  var res=qrTRABAJADORES.filter(function(t){return !q || t.codigo.toLowerCase().indexOf(q)>=0 || t.nombre.toLowerCase().indexOf(q)>=0;});
  if(!res.length){ d.innerHTML="<div style='padding:10px;font-size:12px;color:#888'>Sin resultados</div>"; return; }
  d.innerHTML=res.map(function(t){
    var sinDui=!t.dui;
    var chk=qrSELECCIONADOS[t.codigo]?"checked":"";
    var dis=sinDui?"disabled":"";
    return "<div style='display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #eee;font-size:13px'>" +
      "<input type='checkbox' " + chk + " " + dis + " style='width:18px;height:18px;flex-shrink:0' onchange='qrToggleSel(\""+t.codigo.replace(/"/g,"&quot;")+"\", this.checked)'>" +
      "<div><div style='font-weight:bold;color:#1B4332'>" + (t.nombre||"(sin nombre)") + "</div>" +
      "<div style='color:#888;font-size:11px'>" + t.codigo + (sinDui?" · ⚠️ sin DUI cargado — no se puede generar":" · DUI: "+t.dui) + "</div></div>" +
      "</div>";
  }).join("");
}

function qrToggleSel(codigo, val){
  if(val) qrSELECCIONADOS[codigo]=true; else delete qrSELECCIONADOS[codigo];
  qrActualizarContador();
}

function qrSeleccionarTodosFiltrados(val){
  var q=(document.getElementById("qrBuscar")||{value:""}).value.toLowerCase().trim();
  qrTRABAJADORES.filter(function(t){return t.dui && (!q || t.codigo.toLowerCase().indexOf(q)>=0 || t.nombre.toLowerCase().indexOf(q)>=0);})
    .forEach(function(t){ if(val) qrSELECCIONADOS[t.codigo]=true; else delete qrSELECCIONADOS[t.codigo]; });
  qrFiltrar(); qrActualizarContador();
}

function qrSeleccionarPorRango(){
  var desdeEl = document.getElementById("qrRangoDesde");
  var hastaEl = document.getElementById("qrRangoHasta");
  var desde = parseInt(desdeEl.value, 10);
  var hasta = hastaEl.value ? parseInt(hastaEl.value, 10) : desde;
  if(!desde || isNaN(desde)){ alert("Escribe al menos el número 'Desde'."); return; }
  if(hasta < desde){ alert("El 'Hasta' no puede ser menor que el 'Desde'."); return; }
  var encontrados = 0;
  qrTRABAJADORES.forEach(function(t){
    var mn = (t.codigo||"").match(/\d+/g);
    var n = mn ? parseInt(mn[mn.length-1], 10) : NaN;
    if(n >= desde && n <= hasta && t.dui){ qrSELECCIONADOS[t.codigo] = true; encontrados++; }
  });
  qrFiltrar();
  qrActualizarContador();
  if(!encontrados) alert("No se encontró ningún trabajador con correlativo entre "+desde+" y "+hasta+" (o no tienen DUI cargado).");
}

function qrActualizarContador(){
  var n=Object.keys(qrSELECCIONADOS).length;
  var el=document.getElementById("qrContador");
  if(el) el.textContent=n+" trabajador"+(n===1?"":"es")+" seleccionado"+(n===1?"":"s");
}

function qrFormatDui(dui){
  var digitos=(dui||"").toString().replace(/[^0-9]/g,"");
  if(digitos.length===13) return digitos.substring(0,4)+"-"+digitos.substring(4,9)+"-"+digitos.substring(9,13);
  return dui;
}

function qrGenerarQRDataURL(texto, pxSize){
  return new Promise(function(resolve){
    var tmp=document.createElement("div");
    tmp.style.position="fixed"; tmp.style.left="-9999px";
    document.body.appendChild(tmp);
    new QRCode(tmp,{text:texto,width:pxSize,height:pxSize,correctLevel:QRCode.CorrectLevel.M});
    setTimeout(function(){
      var canvas=tmp.querySelector("canvas");
      var url = canvas ? canvas.toDataURL("image/png") : null;
      document.body.removeChild(tmp);
      resolve(url);
    },60);
  });
}

function qrCalcularLayout(cfg){
  var pad=2.5;
  var logoH=cfg.logoMm*QR_LOGO_RATIO;
  var headerH=Math.max(logoH, cfg.fSol*0.352*1.3);
  var y=pad;
  var headerY=y;
  y+=headerH+1.5;
  var qrY=y;
  y+=cfg.qrMm+1.5;
  var codY=y+cfg.fCod*0.352;
  y+=cfg.fCod*0.352+1.5;
  var nomY=y+cfg.fNomMax*0.352;
  var totalH=nomY+cfg.fNomMax*0.15+pad;
  return {pad:pad, logoH:logoH, headerY:headerY, headerH:headerH, qrY:qrY, codY:codY, nomY:nomY, totalH:totalH};
}

function qrLeerConfig(){
  return {
    cW:parseFloat((document.getElementById("qrCW")||{}).value)||35,
    cH:parseFloat((document.getElementById("qrCH")||{}).value)||57,
    logoMm:parseFloat((document.getElementById("qrCLogo")||{}).value)||5,
    fSol:parseFloat((document.getElementById("qrCFontSol")||{}).value)||7,
    qrMm:parseFloat((document.getElementById("qrCQR")||{}).value)||30,
    fCod:parseFloat((document.getElementById("qrCFontCod")||{}).value)||30,
    fNomMax:parseFloat((document.getElementById("qrCFontNom")||{}).value)||8
  };
}

function qrActualizarPreview(){
  var canvas=document.getElementById("qrPreviewCanvas");
  if(!canvas) return;
  var cfg=qrLeerConfig();
  var L=qrCalcularLayout(cfg);

  var avisoT=document.getElementById("qrAvisoTamano");
  if(avisoT){
    if(L.totalH>cfg.cH){
      var falta=(L.totalH-cfg.cH).toFixed(1);
      avisoT.innerHTML="<div class='msg-err'>⚠️ El contenido no cabe en el alto actual — faltan "+falta+" mm. Aumenta el alto a al menos "+Math.ceil(L.totalH)+" mm.</div>";
    } else {
      avisoT.innerHTML="";
    }
  }
  var escala=4;
  canvas.width=cfg.cW*escala; canvas.height=cfg.cH*escala;
  var ctx=canvas.getContext("2d");
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle="#1B4332"; ctx.lineWidth=1.3*escala/1.3; ctx.strokeRect(1.3*escala/2,1.3*escala/2,canvas.width-1.3*escala,canvas.height-1.3*escala);
  var inset=1.3*escala;
  ctx.strokeStyle="#F4B942"; ctx.lineWidth=0.5*escala/1.3;
  ctx.strokeRect(inset, inset, canvas.width-2*inset, canvas.height-2*inset);

  var logo=new Image();
  logo.onload=function(){
    var logoW=cfg.logoMm*escala, logoH=L.logoH*escala;
    ctx.font="bold "+cfg.fSol+"px Arial";
    var textoW=ctx.measureText("SOLTECING").width;
    var gap=4*escala/4;
    var bloqueW=logoW+gap+textoW;
    var startX=(canvas.width-bloqueW)/2;
    ctx.drawImage(logo, startX, L.headerY*escala, logoW, logoH);
    ctx.fillStyle="#3c3c3c";
    ctx.textAlign="left";
    ctx.textBaseline="middle";
    ctx.fillText("SOLTECING", startX+logoW+gap, L.headerY*escala+logoH/2);
    ctx.textBaseline="alphabetic";

    if(qrMUESTRA_URL){
      var img=new Image();
      img.onload=function(){
        var qrPx=cfg.qrMm*escala;
        ctx.drawImage(img, (canvas.width-qrPx)/2, L.qrY*escala, qrPx, qrPx);

        ctx.fillStyle="#141414";
        ctx.font="bold "+cfg.fCod+"px Arial";
        ctx.textAlign="center";
        ctx.fillText("002", canvas.width/2, L.codY*escala);

        var nombreMuestra="Derek Javier Sanchez Contreras";
        var maxWpx=(cfg.cW-2*L.pad)*escala;
        var fNom=cfg.fNomMax;
        ctx.font=fNom+"px Arial";
        while(ctx.measureText(nombreMuestra).width>maxWpx && fNom>4){
          fNom-=0.5;
          ctx.font=fNom+"px Arial";
        }
        ctx.fillStyle="#646464";
        ctx.fillText(nombreMuestra, canvas.width/2, L.nomY*escala);
      };
      img.src=qrMUESTRA_URL;
    }
  };
  logo.src=QR_LOGO_B64;
}

// qrGenerarPDFCarnets — genera el carnet completo (Opción 3 aprobada: foto
// grande, encabezado verde, franja dorada con el correlativo) para cada
// trabajador seleccionado en la misma lista que usa el generador de stickers.
// mostrarVistaPreviaPDF — en vez de descargar el archivo directamente,
// deja verlo primero (se abre en el visor de PDF del navegador/celular)
// y solo se descarga de verdad cuando el usuario confirma que le
// parece bien. Evita generar archivos "a ciegas".
// esReporte=false se usa SOLO para los PDFs de stickers/carnets físicos
// (grillas de tarjetas para imprimir y recortar), donde un pie de
// página de "reporte" no tiene sentido y estorbaría la cuadrícula.
function mostrarVistaPreviaPDF(doc, nombreArchivo, avisoBox, totalGenerados, etiqueta, esReporte){
  if(esReporte !== false){
    var totalPaginas = doc.internal.getNumberOfPages();
    var ahora = new Date();
    var fechaEmision = String(ahora.getDate()).padStart(2,"0")+"/"+String(ahora.getMonth()+1).padStart(2,"0")+"/"+ahora.getFullYear()+" "+String(ahora.getHours()).padStart(2,"0")+":"+String(ahora.getMinutes()).padStart(2,"0");
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    for(var p=1; p<=totalPaginas; p++){
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(140,140,140);
      doc.setFont(undefined,"normal");
      doc.text("Emitido: "+fechaEmision, 14, pageH-7);
      doc.text("Página "+p+" de "+totalPaginas, pageW-14, pageH-7, {align:"right"});
    }
  }
  var blobUrl = doc.output("bloburl");
  window["_pdfPendiente_"+nombreArchivo.replace(/[^a-zA-Z0-9]/g,"")] = {doc:doc, nombreArchivo:nombreArchivo};
  var idSafe = nombreArchivo.replace(/[^a-zA-Z0-9]/g,"");
  avisoBox.innerHTML =
    "<div class='msg-ok'>✅ Listo — "+totalGenerados+" "+etiqueta+" generados. Revíselo antes de descargar:</div>"+
    "<div style='display:flex;gap:8px;margin-top:8px'>"+
    "<a href='"+blobUrl+"' target='_blank' class='btn b-sec' style='flex:1;text-align:center;text-decoration:none;display:block'>👁️ Ver vista previa</a>"+
    "<button type='button' class='btn b-ok' style='flex:1' onclick='confirmarDescargaPDF(\""+idSafe+"\")'>⬇️ Descargar</button>"+
    "</div>";
}

function confirmarDescargaPDF(idSafe){
  var pendiente = window["_pdfPendiente_"+idSafe];
  if(!pendiente) return;
  pendiente.doc.save(pendiente.nombreArchivo);
}

function qrGenerarPDFCarnets(){
  var seleccionados=qrTRABAJADORES.filter(function(t){return qrSELECCIONADOS[t.codigo];});
  var avisoBox=document.getElementById("qrAvisoGen");
  if(!avisoBox) return;
  avisoBox.innerHTML="";
  if(!seleccionados.length){
    avisoBox.innerHTML="<div class='msg-err'>Selecciona al menos un trabajador.</div>";
    return;
  }
  avisoBox.innerHTML="<div class='msg-ok'>🔄 Generando carnets de "+seleccionados.length+" trabajadores...</div>";

  // Diseño compacto (v2.11): 2 columnas x 4 filas = 8 carnets por
  // hoja carta, foto y QR lado a lado para aprovechar mejor el ancho.
  // Tamaño de carnet FIJO 8.5cm x 5.5cm (tipo tarjeta de crédito/débito),
  // centrado en la hoja carta — no se estira para llenar la página.
  // Medidas verificadas para que la leyenda del pie NUNCA se superponga
  // con la fila de abajo (antes el pie quedaba cortado en la 2da fila).
  var doc=new window.jspdf.jsPDF({unit:"mm",format:"letter"});
  var pageW=215.9, pageH=279.4;
  var cols=2, rows=4;
  var cW=85, cH=55;           // tamaño fijo del carnet, en mm
  var gapX=6, gapY=6;         // separación entre carnets
  var contentW=cols*cW+(cols-1)*gapX;
  var contentH=rows*cH+(rows-1)*gapY;
  var marginX=(pageW-contentW)/2;   // centra el bloque de carnets en la hoja
  var marginY=(pageH-contentH)/2;
  var porPagina=cols*rows;

  var i=0;
  function siguiente(){
    if(i>=seleccionados.length){
      var fg=new Date();
      var nombreArchivo="Carnets_"+CONFIG.codigoProyecto+"_"+fg.getFullYear()+"-"+String(fg.getMonth()+1).padStart(2,"0")+"-"+String(fg.getDate()).padStart(2,"0")+"_"+String(fg.getHours()).padStart(2,"0")+String(fg.getMinutes()).padStart(2,"0")+".pdf";
      mostrarVistaPreviaPDF(doc, nombreArchivo, avisoBox, seleccionados.length, "carnets", false);
      return;
    }
    var t=seleccionados[i];
    var duiFmt=qrFormatDui(t.dui);

    Promise.all([
      qrGenerarQRDataURL(duiFmt, 300),
      t.fotoId ? gasPostBody("obtenerFotoBase64",{fileId:t.fotoId}).catch(function(){return null;}) : Promise.resolve(null)
    ]).then(function(res){
      var qrUrl = res[0];
      var fotoRes = res[1];

      var pos=i%porPagina;
      if(i>0 && pos===0) doc.addPage();
      var col=pos%cols, row=Math.floor(pos/cols);
      var x=marginX+col*(cW+gapX);
      var y=marginY+row*(cH+gapY);

      // Tarjeta base
      doc.setDrawColor(183,228,199);
      doc.setLineWidth(0.2);
      doc.rect(x,y,cW,cH);

      // Encabezado verde (compacto)
      var headH=8;
      doc.setFillColor(27,67,50);
      doc.rect(x, y, cW, headH, "F");

      // Logo de SOLTECING sobre una placa blanca redondeada (así el fondo
      // blanco del logo no se ve como un recuadro suelto sobre el verde)
      if(CONFIG.logoBase64){
        try{
          var logoSize=6.2, logoPad=0.7;
          doc.setFillColor(255,255,255);
          doc.roundedRect(x+2-logoPad, y+1-logoPad, logoSize+2*logoPad, logoSize+2*logoPad, 0.8, 0.8, "F");
          doc.addImage(CONFIG.logoBase64, "PNG", x+2, y+1, logoSize, logoSize);
        }catch(e){ /* si el formato no es compatible, se omite */ }
      }

      doc.setTextColor(255,255,255);
      doc.setFont(undefined,"bold");
      doc.setFontSize(8);
      doc.text(CONFIG.empresa, x+cW/2, y+4.1, {align:"center"});
      doc.setFont(undefined,"normal");
      doc.setFontSize(5.5);
      doc.setTextColor(149,213,178);
      doc.text("Proyecto "+CONFIG.codigoProyecto+" · "+CONFIG.ubicacion+", "+CONFIG.paisLegal, x+cW/2, y+7, {align:"center"});

      // Foto (izquierda) y QR (derecha), lado a lado — recortada en
      // círculo real usando clip() de jsPDF (probado y confirmado)
      var fotoSize=18, colIzqCentro=x+cW*0.25, rowTop=y+headH+1;
      var fotoCX=colIzqCentro, fotoCY=rowTop+fotoSize/2, fotoX=fotoCX-fotoSize/2, fotoY=fotoCY-fotoSize/2;
      doc.setFillColor(255,255,255);
      doc.circle(fotoCX, fotoCY, fotoSize/2, "F");
      if(fotoRes && fotoRes.ok){
        try{
          doc.saveGraphicsState();
          doc.circle(fotoCX, fotoCY, fotoSize/2, null);
          doc.clip();
          doc.discardPath();
          doc.addImage("data:"+fotoRes.mimeType+";base64,"+fotoRes.base64, "JPEG", fotoX, fotoY, fotoSize, fotoSize);
          doc.restoreGraphicsState();
          doc.setDrawColor(45,106,79);
          doc.setLineWidth(0.3);
          doc.circle(fotoCX, fotoCY, fotoSize/2);
        }catch(e){ /* si la imagen no es compatible, se deja el círculo vacío */ }
      } else {
        doc.setDrawColor(45,106,79);
        doc.setLineWidth(0.3);
        doc.circle(fotoCX, fotoCY, fotoSize/2);
        doc.setTextColor(45,106,79);
        doc.setFontSize(6);
        doc.text("FOTO", fotoCX, fotoCY+1.5, {align:"center"});
      }

      var qs=18, colDerCentro=x+cW*0.75, qy=rowTop, qx=colDerCentro-qs/2;
      if(qrUrl) doc.addImage(qrUrl,"PNG", qx, qy, qs, qs);

      // Nombre y cargo, bajo la foto — se achica la fuente si el nombre
      // es muy largo, NUNCA se recorta el texto.
      doc.setTextColor(27,67,50);
      doc.setFont(undefined,"bold");
      var fNomCarnet = 7, minFNom = 4.5;
      doc.setFontSize(fNomCarnet);
      var nombreCompleto = t.nombre || "";
      var maxWNombre = cW/2 - 3;
      while(doc.getTextWidth(nombreCompleto) > maxWNombre && fNomCarnet - 0.3 >= minFNom){
        fNomCarnet -= 0.3;
        doc.setFontSize(fNomCarnet);
      }
      var nombreY = fotoY+fotoSize+4;
      doc.text(nombreCompleto, colIzqCentro, nombreY, {align:"center"});
      doc.setFont(undefined,"normal");
      doc.setTextColor(136,136,136);
      doc.setFontSize(6);
      doc.text(t.cargo || "—", colIzqCentro, nombreY+3.8, {align:"center"});

      // Correlativo — franja dorada, bajo el QR
      var bandW=22, bandH=6, bandY=qy+qs+2;
      doc.setFillColor(244,185,66);
      doc.rect(colDerCentro-bandW/2, bandY, bandW, bandH, "F");
      doc.setTextColor(65,36,2);
      doc.setFont(undefined,"bold");
      doc.setFontSize(10);
      doc.text(t.codigo.replace(CONFIG.prefijoTrabajador+"-",""), colDerCentro, bandY+4.3, {align:"center"});
      doc.setFont(undefined,"normal");

      // Pie común a todo el ancho de la tarjeta: vigencia + leyenda.
      // Se ubica DESPUÉS de la columna más alta (foto+nombre+cargo vs.
      // QR+franja), así nunca se pisa con el borde inferior de la
      // tarjeta ni con la fila de abajo.
      var pieY = Math.max(nombreY+3.8, bandY+bandH) + 3.5;
      doc.setFontSize(5.5);
      doc.setTextColor(45,106,79);
      var textoVig = t.vigenciaHasta
        ? "Vigente hasta " + (function(){ var f=new Date(t.vigenciaHasta+"T00:00:00"); return isNaN(f)?t.vigenciaHasta:f.toLocaleDateString("es-GT"); })()
        : "Vigente mientras dure el proyecto";
      doc.setFont(undefined,"bold");
      doc.text(textoVig, x+cW/2, pieY, {align:"center"});

      doc.setFont(undefined,"normal");
      doc.setFontSize(4.3);
      doc.setTextColor(150,150,150);
      var leyendaLineas = doc.splitTextToSize(CONFIG.leyendaCarnet, cW-6);
      doc.text(leyendaLineas, x+cW/2, pieY+3, {align:"center"});

      i++;
      avisoBox.innerHTML="<div class='msg-ok'>🔄 Generando... "+i+" / "+seleccionados.length+"</div>";
      setTimeout(siguiente, 10);
    });
  }
  siguiente();
}

function qrGenerarPDFLote(){
  var seleccionados=qrTRABAJADORES.filter(function(t){return qrSELECCIONADOS[t.codigo];});
  var avisoBox=document.getElementById("qrAvisoGen");
  if(!avisoBox) return;
  avisoBox.innerHTML="";
  if(!seleccionados.length){
    avisoBox.innerHTML="<div class='msg-err'>Selecciona al menos un trabajador.</div>";
    return;
  }
  var cfg=qrLeerConfig();
  var L=qrCalcularLayout(cfg);
  if(L.totalH>cfg.cH){
    var falta=(L.totalH-cfg.cH).toFixed(1);
    avisoBox.innerHTML="<div class='msg-err'>⚠️ El contenido no cabe en el alto actual — faltan "+falta+" mm antes de generar.</div>";
    return;
  }
  avisoBox.innerHTML="<div class='msg-ok'>🔄 Generando PDF de "+seleccionados.length+" trabajadores...</div>";
  var doc=new window.jspdf.jsPDF({unit:"mm",format:"letter"});
  var pageW=215.9, pageH=279.4, margin=8, gap=4;
  var cols=Math.max(1,Math.floor((pageW-2*margin+gap)/(cfg.cW+gap)));
  var rows=Math.max(1,Math.floor((pageH-2*margin+gap)/(cfg.cH+gap)));
  var porPagina=cols*rows;

  var i=0;
  function siguiente(){
    if(i>=seleccionados.length){
      var fg=new Date();
      var nombreArchivo="QR_Trabajadores_GT02_"+fg.getFullYear()+"-"+String(fg.getMonth()+1).padStart(2,"0")+"-"+String(fg.getDate()).padStart(2,"0")+"_"+String(fg.getHours()).padStart(2,"0")+String(fg.getMinutes()).padStart(2,"0")+".pdf";
      mostrarVistaPreviaPDF(doc, nombreArchivo, avisoBox, seleccionados.length, "códigos", false);
      return;
    }
    var t=seleccionados[i];
    var duiFmt=qrFormatDui(t.dui);
    qrGenerarQRDataURL(duiFmt, 300).then(function(qrUrl){
      var pos=i%porPagina;
      if(i>0 && pos===0) doc.addPage();
      var col=pos%cols, row=Math.floor(pos/cols);
      var x=margin+col*(cfg.cW+gap);
      var y=margin+row*(cfg.cH+gap);

      doc.setDrawColor(27,67,50);
      doc.setLineWidth(0.46);
      doc.rect(x,y,cfg.cW,cfg.cH);
      doc.setDrawColor(244,185,66);
      doc.setLineWidth(0.18);
      doc.rect(x+1.3,y+1.3,cfg.cW-2.6,cfg.cH-2.6);

      doc.setFontSize(cfg.fSol);
      var textoW=doc.getTextWidth("SOLTECING");
      var logoW=cfg.logoMm, logoH=L.logoH;
      var gapMm=1.5;
      var bloqueW=logoW+gapMm+textoW;
      var startX=x+(cfg.cW-bloqueW)/2;
      doc.addImage(QR_LOGO_B64,"PNG", startX, y+L.headerY, logoW, logoH);
      doc.setTextColor(60,60,60);
      doc.text("SOLTECING", startX+logoW+gapMm, y+L.headerY+logoH/2, {baseline:"middle"});

      if(qrUrl) doc.addImage(qrUrl,"PNG", x+(cfg.cW-cfg.qrMm)/2, y+L.qrY, cfg.qrMm, cfg.qrMm);

      doc.setFontSize(cfg.fCod);
      doc.setTextColor(20,20,20);
      doc.setFont(undefined,"bold");
      doc.text(t.codigo.replace(CONFIG.prefijoTrabajador+"-",""), x+cfg.cW/2, y+L.codY, {align:"center"});
      doc.setFont(undefined,"normal");

      var nombre=t.nombre||"";
      var fNom=cfg.fNomMax;
      doc.setFontSize(fNom);
      var maxWmm=cfg.cW-2*L.pad;
      while(doc.getTextWidth(nombre)>maxWmm && fNom>4){
        fNom-=0.5;
        doc.setFontSize(fNom);
      }
      doc.setTextColor(100,100,100);
      doc.text(nombre, x+cfg.cW/2, y+L.nomY, {align:"center"});

      i++;
      avisoBox.innerHTML="<div class='msg-ok'>🔄 Generando... "+i+" / "+seleccionados.length+"</div>";
      setTimeout(siguiente, 10);
    });
  }
  siguiente();
}
