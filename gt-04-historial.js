// ══════════════════════════════════════════════
//  HISTORIAL — lee desde Sheets directamente
// ══════════════════════════════════════════════
var frActivo="";

function filtroRapido(tipo){
  frActivo=tipo;
  ["fr0","fr1","fr2","fr3"].forEach(function(id,i){
    document.getElementById(id).classList.toggle("on",["hoy","semana","abierto",""][i]===tipo);
  });
  document.getElementById("sh").value=(tipo==="abierto")?"abierto":"";
  cargarHist();
}

function cargarHist(){
  var q=document.getElementById("bh").value.toLowerCase().trim();
  var est=document.getElementById("sh").value.toLowerCase();
  document.getElementById("rh").innerHTML="<div class='loading'>🔄 Cargando...</div>";
  Promise.all([
    sheetsGet("Prestamos_Herramientas!A2:K"),
    sheetsGet("Prestamos_Detalle!A2:I"),
    sheetsGet(SHEET("Personal")+"!A2:J")
  ]).then(function(results){
    var dp=results[0].values||[];
    var dd=results[1].values||[];
    var dpers=results[2].values||[];
    // Mapa código → nombre/foto, de respaldo para registros viejos sin nombre guardado
    var mapaNom={};
    var mapaFoto={};
    for(var p=0;p<dpers.length;p++){
      var cP=(dpers[p][0]||"").toString().trim();
      var nP=(dpers[p][1]||"").toString().trim();
      var fP=(dpers[p][9]||"").toString().trim();
      if(cP&&nP) mapaNom[cP.toLowerCase()]=nP;
      if(cP&&fP) mapaFoto[cP.toLowerCase()]=fP;
    }
    // Filtrar
    var hoy=new Date();
    var dd2=String(hoy.getDate()).padStart(2,"0");
    var mm2=String(hoy.getMonth()+1).padStart(2,"0");
    var fechaHoy=dd2+"/"+mm2+"/"+hoy.getFullYear();
    var hace7=new Date(hoy.getTime()-7*24*60*60*1000);
    var lista=[];
    for(var i=dp.length-1;i>=0&&lista.length<30;i--){
      var estRow=(dp[i][7]||"").toString().toLowerCase().trim();
      var nom=(dp[i][3]||"").toString().toLowerCase();
      var cod=(dp[i][2]||"").toString().toLowerCase();
      var fecha=(dp[i][1]||"").toString();
      if(est&&estRow!==est) continue;
      if(q&&nom.indexOf(q)<0&&cod.indexOf(q)<0) continue;
      if(frActivo==="hoy"&&fecha!==fechaHoy) continue;
      if(frActivo==="semana"){
        var parts=fecha.split("/");
        if(parts.length===3){
          var fP=new Date(parts[2],parts[1]-1,parts[0]);
          if(fP<hace7) continue;
        }
      }
      var id=(dp[i][0]||"").toString();
      var items=[];
      for(var j=0;j<dd.length;j++){
        if((dd[j][1]||"").toString()===id){
          items.push({codigo:(dd[j][2]||"").toString(),descripcion:(dd[j][3]||"").toString(),tipo:(dd[j][5]||"Herramienta").toString(),detalle:(dd[j][6]||"").toString(),cantidad:(dd[j][7]||"").toString(),obs:(dd[j][8]||"").toString()});
        }
      }
      var nomGuardado=(dp[i][3]||"").toString().trim();
      var codActual=(dp[i][2]||"").toString().trim();
      var nomFinal=nomGuardado||mapaNom[codActual.toLowerCase()]||"";
      var fotoFinal=mapaFoto[codActual.toLowerCase()]||"";
      lista.push({
        idPrestamo:id,fecha:fecha,
        nombreTrabajador:nomFinal,
        codigoTrabajador:codActual,
        fotoId:fotoFinal,
        estado:estRow,
        horaSalida:(dp[i][5]||"").toString(),
        horaDevolucion:(dp[i][6]||"").toString(),
        recibidoPor:(dp[i][8]||"").toString(),
        entregadoPor:(dp[i][10]||"").toString(),
        items:items
      });
    }
    if(!lista.length){
      document.getElementById("rh").innerHTML="<div class='empty'><div class='ei'>🔍</div><p>Sin resultados</p></div>";return;
    }
    document.getElementById("rh").innerHTML=lista.map(function(p){
      var cls=p.estado==="cerrado"?"cerrado":"abierto";
      var badge=p.estado==="cerrado"
        ?"<span class='hist-est cerrado'>🟢 Cerrado</span>"
        :"<span class='hist-est abierto'>🟡 Abierto</span>";
      var badges=p.items.slice(0,4).map(function(it){
        var bc=it.tipo==="Herramienta"?"bh":(it.tipo==="Material"?"bm":"bi");
        return "<span class='badge "+bc+"' style='margin:1px'>"+it.descripcion.substring(0,15)+"</span>";
      }).join("")+(p.items.length>4?"<span style='color:#888;font-size:10px'> +"+( p.items.length-4)+" más</span>":"");
      var detallesTxt=p.items.map(function(it){
        var t=fmtDetalleItem(it);
        var base=(it.codigo?("["+it.codigo+"] "):"")+it.descripcion;
        return t?(base+": "+t):base;
      }).join(" · ");
      var btnDev=p.estado!=="cerrado"
        ?"<div style='margin-top:7px'><button class='btn b-warn' style='padding:7px;font-size:11px;margin:0' onclick='irADev(\""+escJS(p.codigoTrabajador)+"\",\""+escJS(p.nombreTrabajador)+"\")'>📥 Procesar devolución</button></div>"
        :"";
      var miniHist=p.fotoId
        ?"<img src='"+urlFotoDrive(p.fotoId,60)+"' style='width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0' onerror=\"this.style.display='none'\">"
        :"<div style='width:30px;height:30px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0'>👤</div>";
      return "<div class='hist-row "+cls+"'>" +
        "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:4px'><span style='font-size:11px;color:#888'>📄 "+p.idPrestamo+"</span>"+badge+"</div>" +
        "<div style='display:flex;align-items:center;gap:7px'>"+miniHist+"<div style='font-size:13px;font-weight:bold;color:#1B4332'>👷 "+(p.nombreTrabajador||"(sin nombre)")+" <span style='font-weight:normal;color:#666'>· "+p.codigoTrabajador+"</span></div>"+(p.codigoTrabajador?"<button type='button' class='b-sm pf-info' style='margin-left:auto' data-cod=\""+pfAttr(p.codigoTrabajador)+"\" onclick='abrirPerfilTrabajador(this.getAttribute(\"data-cod\"))' title='Ver perfil del trabajador'>ℹ️</button>":"")+"</div>" +
        "<div style='font-size:11px;margin-top:4px'>"+badges+"</div>" +
        (detallesTxt?"<div style='font-size:10px;color:#666;margin-top:2px;font-style:italic'>🔎 "+detallesTxt+"</div>":"")+
        "<div style='font-size:10px;color:#888;margin-top:3px'>📅 "+p.fecha+(p.horaSalida?" · "+p.horaSalida:"")+(p.horaDevolucion?" → "+p.horaDevolucion:"")+"</div>" +
        (p.entregadoPor?"<div style='font-size:10px;color:#888'>📤 Entregó: "+p.entregadoPor+"</div>":"")+
        (p.recibidoPor?"<div style='font-size:10px;color:#888'>📥 Recibió: "+p.recibidoPor+"</div>":"")+
        btnDev+"</div>";
    }).join("");
  }).catch(function(e){
    document.getElementById("rh").innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

// Arma el texto de detalle según el tipo de ítem: herramienta usa "detalle" (color/marca/serie),
// insumo/material usa cantidad + unidad; las observaciones se agregan siempre que existan.
function fmtDetalleItem(it){
  var partes=[];
  if(it.tipo==="Herramienta"){
    if(it.detalle) partes.push(it.detalle);
  } else {
    if(it.cantidad) partes.push("Cant: "+it.cantidad+(it.unidad?" "+it.unidad:""));
  }
  if(it.obs) partes.push("Obs: "+it.obs);
  return partes.join(" · ");
}

function irADev(codigo,nombre){
  goTab(1);
  document.getElementById("btd").value=nombre;
  cargarPA(codigo,nombre);
}
