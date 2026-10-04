// ══════════════════════════════════════════════
//  MÓDULO HORÓMETRO — independiente del resto de la app.
//  Se abre desde el menú ☰, no desde las 5 pestañas principales.
//
//  toggleMenuMas()   → abre/cierra el menú hamburguesa
//  abrirHorometro()  → oculta las pestañas normales, muestra este módulo
//  cerrarHorometro() → vuelve a las pestañas normales (restaura por CSS)
//  horGoTab(n)       → cambia entre "Registrar" y "Corte semanal"
//  horGuardar()      → ⭐ registra una lectura (envía a Code.gs)
//  horGenerarCorte() → arma la tabla semanal + botón de exportar PDF
// ══════════════════════════════════════════════
var HOR_MAQUINAS=[]; // catálogo de máquinas cargado de Maquinas_GT02

var HOR_CARGADO=false; // evita recargar catálogos cada vez que se abre

function abrirHorometro(){
  navLimpiarTodo(); // cierra cualquier otra pantalla/módulo antes de abrir este
  document.getElementById("menuMas").style.display="none";
  document.querySelector(".tabs").style.display="none"; // oculta la barra de pestañas principal (no la del sub-menú interno)
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display="none"; });
  document.getElementById("horometroScreen").style.display="block";
  horCargarCatalogos(); HOR_CARGADO=true; // se recarga cada vez que se abre (máquinas nuevas o editadas)
}

function cerrarHorometro(){
  document.getElementById("horometroScreen").style.display="none";
  document.querySelector(".tabs").style.display="flex";
  // Quita el "display:none" en línea que pusimos — la clase .scr/.scr.on
  // (que goTab() nunca dejó de controlar) vuelve a mandar, sin tocar
  // en qué pestaña estaba el usuario antes de entrar al módulo.
  document.querySelectorAll("#appContent > .scr").forEach(function(s){ s.style.display=""; });
  goTab(NAV_TAB_ACTUAL); // vuelve a la pestaña en la que estabas
}

function horGoTab(n){
  document.getElementById("horTab0").classList.toggle("on", n===0);
  document.getElementById("horTab1").classList.toggle("on", n===1);
  document.getElementById("horTab2").classList.toggle("on", n===2);
  document.getElementById("horScr0").classList.toggle("on", n===0);
  document.getElementById("horScr1").classList.toggle("on", n===1);
  document.getElementById("horScr2").classList.toggle("on", n===2);
}

// Carga el catálogo de máquinas (Maquinas_GT02, dado de alta desde
// Gestión de máquinas) para el selector del formulario.
// Corregido en v2.9.1: antes leía de "Maquinaria_GT01" (hoja que no
// existe en este proyecto, resto de la plantilla GT01), por lo que
// ninguna máquina agregada desde Admin aparecía nunca en este selector.
// Los operadores YA NO se cargan de Personal_GT02 (son personal externo, no
// trabajadores de SOLTECING) — ver HOR_OPERADORES_PROVISIONAL más abajo.
function horCargarCatalogos(){
  sheetsGet(SHEET("Maquinas")+"!A2:F").then(function(resp){
    var maq=resp.values||[];

    HOR_MAQUINAS = maq.filter(function(r){return r[0];}).map(function(r){
      return { codigo:(r[0]||"").toString(), nombre:(r[1]||"").toString(), tipo:(r[2]||"").toString().trim(), estado:(r[4]||"Activo").toString() };
    });

    var optsMaquina = "<option value=''>Selecciona la máquina...</option>" +
      HOR_MAQUINAS.filter(function(m){return m.estado!=="Inactivo";})
        .map(function(m){return "<option value='"+esc(m.codigo)+"'>"+esc(m.nombre)+"</option>";}).join("");
    document.getElementById("horMaquina").innerHTML = optsMaquina;
    // El selector de Corte semanal y el de Mantenimiento agregan
    // "Todas las máquinas" al inicio.
    var optsConTodas = "<option value='TODAS'>— Todas las máquinas —</option>" + optsMaquina.replace("<option value=''>Selecciona la máquina...</option>","");
    document.getElementById("horMaquinaCorte").innerHTML = optsConTodas;
    document.getElementById("horMantMaquina").innerHTML = optsConTodas;

    // Fecha de hoy por defecto
    var hoy=new Date();
    document.getElementById("horFecha").value = hoy.getFullYear()+"-"+String(hoy.getMonth()+1).padStart(2,"0")+"-"+String(hoy.getDate()).padStart(2,"0");
  }).catch(function(e){
    document.getElementById("horMsg").innerHTML="<div class='msg-err'>❌ No se pudo cargar el catálogo de máquinas.</div>";
  });
}

// ── Operadores de maquinaria — lista PROVISIONAL, escrita directo aquí ──
// Son personas externas a SOLTECING (no están en Personal_GT02), y todavía
// no ameritan una hoja de Excel propia. Para agregar un operador nuevo,
// simplemente sumá su nombre a este arreglo. El campo de texto también
// acepta escribir un nombre que NO esté en esta lista (por si llega
// alguien nuevo antes de actualizar el código) — no bloquea nada.
var HOR_OPERADORES_PROVISIONAL = ["Anderson Reyes", "Marlon Alexander Orozco Felipe"];

function horBuscarOperador(val){
  var box=document.getElementById("horOperadorSug");
  var q=val.toLowerCase().trim();
  if(!q){ box.innerHTML=""; box.style.display="none"; return; }
  var coincidencias=HOR_OPERADORES_PROVISIONAL.filter(function(n){
    return n.toLowerCase().indexOf(q)>=0;
  });
  if(!coincidencias.length){ box.innerHTML=""; box.style.display="none"; return; }
  box.innerHTML=coincidencias.map(function(n){
    return "<div class='sug-item' onclick='horSelOperador(\""+escJS(n)+"\")'><div class='sug-nom'>"+esc(n)+"</div></div>";
  }).join("");
  box.style.display="block";
}

function horSelOperador(nombre){
  document.getElementById("horOperador").value=nombre;
  document.getElementById("horOperadorSug").innerHTML="";
  document.getElementById("horOperadorSug").style.display="none";
}

// ── Memoria del último operador por máquina (solo en este celular) ──
// Se guarda en localStorage — no toca el Excel ni el backend. Sirve
// porque, en la práctica, la misma persona suele operar la misma
// máquina día tras día. Siempre se puede sobreescribir a mano.
function horAutocompletarOperador(){
  var maquinaCod=document.getElementById("horMaquina").value;
  if(!maquinaCod) return;
  var recordado=localStorage.getItem("gt01_ultimo_operador_"+maquinaCod);
  if(recordado) document.getElementById("horOperador").value=recordado;
}

function horRecordarOperador(maquinaCod, nombreOperador){
  if(!maquinaCod || !nombreOperador) return;
  localStorage.setItem("gt01_ultimo_operador_"+maquinaCod, nombreOperador);
}

// ── Prevención de duplicados: una sola lectura por máquina por día ──
// Se dispara al cambiar la máquina o la fecha. Si ya existe una lectura
// guardada para esa combinación exacta, el formulario se precarga con
// esos datos (modo edición) — no se puede crear un duplicado, solo
// corregir el que ya existe. El backend (Code.gs) también lo verifica
// de forma independiente, como respaldo final.
var HOR_EDITANDO_ID = null;

function horMaquinaOFechaCambio(){
  horAutocompletarOperador();
  horVerificarExistente();
  horActualizarPreview("hor"); // el mínimo a pagar depende de la máquina elegida
}

function horVerificarExistente(){
  var maquinaCod=document.getElementById("horMaquina").value;
  var fechaVal=document.getElementById("horFecha").value; // yyyy-mm-dd
  var btn=document.getElementById("horBtnGuardar");
  var msg=document.getElementById("horMsg");

  if(!maquinaCod || !fechaVal){
    HOR_EDITANDO_ID=null;
    if(btn) btn.textContent="💾 Registrar lectura";
    return;
  }
  var partes=fechaVal.split("-");
  var fechaFmt=partes[2]+"/"+partes[1]+"/"+partes[0]; // dd/mm/yyyy, como el resto de la app

  sheetsGet("Horometro_Registros!A2:K").then(function(resp){
    var rows=resp.values||[];
    var existente=null;
    for(var i=0;i<rows.length;i++){
      if((rows[i][2]||"").toString().trim()===maquinaCod && (rows[i][1]||"").toString().trim()===fechaFmt){
        existente=rows[i];
        break;
      }
    }
    if(existente){
      HOR_EDITANDO_ID=existente[0];
      document.getElementById("horInicio").value=existente[4];
      document.getElementById("horFin").value=existente[5];
      document.getElementById("horOperador").value=(existente[8]||"").toString();
      document.getElementById("horObs").value=(existente[10]||"").toString();
      if(btn) btn.textContent="✏️ Actualizar lectura";
      msg.innerHTML="<div class='aviso'>ℹ️ Ya existe una lectura para esta máquina en esta fecha — se cargaron sus datos, podés corregirlos.</div>";
      horActualizarPreview();
    } else {
      HOR_EDITANDO_ID=null;
      if(btn) btn.textContent="💾 Registrar lectura";
      msg.innerHTML="";
    }
  }).catch(function(){});
}

// Vista previa en vivo: se recalcula cada vez que cambian los horómetros
// o la máquina elegida, para que Joaquín vea "horas trabajadas" vs.
// "horas a pagar" ANTES de guardar — con el MISMO mínimo que aplica
// Code.gs al guardar (varía según el tipo de máquina: Retroexcavadora
// = 6h, el resto = 5h). Antes esta vista previa tenía el 5 fijo a mano,
// sin mirar el tipo de máquina — por eso mostraba "mínimo de 5" incluso
// para una Retroexcavadora.
// Sirve para los dos formularios que tienen horómetro inicio/fin:
// "Registrar" (ids horInicio/horFin/horPreview, con selector propio de
// máquina) y "Mantenimiento" (ids horMantInicio/horMantFin/
// horMantPreview, que usa la máquina del registro que se está viendo).
var MINIMOS_POR_TIPO_JS = { "Retroexcavadora": 6 }; // debe coincidir siempre con Code.gs

var MINIMO_POR_DEFECTO_JS = 5;

function horMinimoDeMaquina(codigoMaquina){
  var m = HOR_MAQUINAS.find(function(x){ return x.codigo===codigoMaquina; });
  var tipo = m ? m.tipo : "";
  return MINIMOS_POR_TIPO_JS[tipo] !== undefined ? MINIMOS_POR_TIPO_JS[tipo] : MINIMO_POR_DEFECTO_JS;
}

function horActualizarPreview(prefijo){
  prefijo = prefijo || "hor";
  var ini=parseFloat(document.getElementById(prefijo+"Inicio").value);
  var fin=parseFloat(document.getElementById(prefijo+"Fin").value);
  var box=document.getElementById(prefijo+"Preview");
  if(isNaN(ini)||isNaN(fin)){ box.textContent=""; return; }
  if(fin<ini){ box.innerHTML="<span style='color:#c0392b'>⚠️ El horómetro de fin no puede ser menor al de inicio</span>"; return; }
  var trabajadas=Math.round((fin-ini)*100)/100;

  var codigoMaquina = prefijo==="hor"
    ? (document.getElementById("horMaquina")||{value:""}).value
    : ((HOR_MANT_LISTA[HOR_MANT_INDICE]||{}).codigoMaquina||"");
  var minimo = horMinimoDeMaquina(codigoMaquina);

  var aPagar = trabajadas<minimo ? minimo : trabajadas;
  var nota = trabajadas<minimo ? " (se ajusta al mínimo de "+minimo+"h para esta máquina)" : "";
  box.innerHTML="Horas trabajadas: <b>"+trabajadas+"</b> — Horas a pagar: <b>"+aPagar+"</b>"+nota;
}

document.addEventListener("input", function(e){
  if(e.target && (e.target.id==="horInicio" || e.target.id==="horFin")) horActualizarPreview("hor");
  if(e.target && (e.target.id==="horMantInicio" || e.target.id==="horMantFin")) horActualizarPreview("horMant");
});

function horGuardar(){
  var msg=document.getElementById("horMsg");
  msg.innerHTML="";
  var maquinaCod=document.getElementById("horMaquina").value;
  var maquinaObj=HOR_MAQUINAS.find(function(m){return m.codigo===maquinaCod;});
  var fechaVal=document.getElementById("horFecha").value; // yyyy-mm-dd
  var operador=document.getElementById("horOperador").value;
  var ini=document.getElementById("horInicio").value;
  var fin=document.getElementById("horFin").value;
  var obs=document.getElementById("horObs").value.trim();

  if(!maquinaCod||!fechaVal||!operador||!ini||!fin){
    msg.innerHTML="<div class='msg-err'>Todos los campos son obligatorios, salvo observaciones.</div>";
    return;
  }
  var partes=fechaVal.split("-");
  var fechaFmt=partes[2]+"/"+partes[1]+"/"+partes[0]; // dd/mm/yyyy, como el resto de la app

  var btn = document.getElementById("horBtnGuardar");
  if(!_bloquearBoton(btn, "horGuardar", btn?btn.textContent:"⏳ Guardando...")) return;
  gasPost("guardarLecturaHorometro",{
    codigoMaquina: maquinaCod,
    nombreMaquina: maquinaObj?maquinaObj.nombre:"",
    fecha: fechaFmt,
    operador: operador,
    horometroInicio: ini,
    horometroFin: fin,
    observaciones: obs,
    registradoPor: (SESION&&SESION.nombre)||"Almacenista"
  }).then(function(r){
    _liberarBoton(btn, "horGuardar");
    if(r.error){ msg.innerHTML="<div class='msg-err'>❌ "+r.error+"</div>"; return; }
    horRecordarOperador(maquinaCod, operador);
    var accion = r.editado ? "Actualizado" : "Registrado";
    msg.innerHTML="<div class='msg-ok'>✅ "+accion+" — "+r.horasTrabajadas+" h trabajadas, "+r.horasAPagar+" h a pagar.</div>";
    document.getElementById("horInicio").value="";
    document.getElementById("horFin").value="";
    document.getElementById("horObs").value="";
    document.getElementById("horPreview").textContent="";
    HOR_EDITANDO_ID=null;
    if(btn) btn.dataset.textoOriginal = "💾 Registrar lectura";
    document.getElementById("horBtnGuardar").textContent="💾 Registrar lectura";
  }).catch(function(e){
    _liberarBoton(btn, "horGuardar");
    msg.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

// ── Corte semanal (lunes a sábado) ──
var HOR_RANGO_DESDE=null, HOR_RANGO_HASTA=null;

function horRangoRapido(tipo){
  document.getElementById("hc0").classList.toggle("on", tipo==="semana");
  document.getElementById("hc1").classList.toggle("on", tipo==="pasada");
  document.getElementById("hc2").classList.toggle("on", tipo==="personalizado");
  document.getElementById("horRangoManual").style.display = (tipo==="personalizado") ? "block" : "none";

  var hoy=new Date();
  if(tipo==="personalizado"){
    // El rango real se toma de los inputs al momento de generar el corte
    document.getElementById("horFechaDesde").value = fechaAInput(hoy);
    document.getElementById("horFechaHasta").value = fechaAInput(hoy);
    return;
  }
  // Se quita la hora del día ANTES de calcular el lunes — "hoy" trae la
  // hora exacta en que se abrió la pantalla (ej. 14:32), y los registros
  // se comparan siempre a medianoche (00:00:00). Sin este ajuste, el
  // lunes de esta semana quedaba con esa misma hora (21/09 14:32) y el
  // registro del lunes (21/09 00:00) parecía "anterior" al rango y se
  // excluía del corte — aunque sí estuviera dentro de la semana.
  var hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  var diaSemana=hoySinHora.getDay(); // 0=domingo, 1=lunes...
  // Retrocede hasta el lunes de la semana actual
  var diasDesdeLunes = (diaSemana===0) ? 6 : diaSemana-1;
  var lunes=new Date(hoySinHora); lunes.setDate(hoySinHora.getDate()-diasDesdeLunes);
  var sabado=new Date(lunes); sabado.setDate(lunes.getDate()+5);
  if(tipo==="pasada"){
    lunes.setDate(lunes.getDate()-7);
    sabado.setDate(sabado.getDate()-7);
  }
  HOR_RANGO_DESDE=lunes; HOR_RANGO_HASTA=sabado;
}

function horGenerarCorte(){
  var maquinaCod=document.getElementById("horMaquinaCorte").value;
  var d=document.getElementById("horCorteResultado");
  if(!maquinaCod){ d.innerHTML="<div class='msg-err'>Selecciona una máquina (o \"Todas las máquinas\").</div>"; return; }

  // Si el rango es personalizado, se toma de los inputs de fecha en este momento
  var esPersonalizado=document.getElementById("hc2").classList.contains("on");
  if(esPersonalizado){
    var vd=document.getElementById("horFechaDesde").value;
    var vh=document.getElementById("horFechaHasta").value;
    if(!vd||!vh){ d.innerHTML="<div class='msg-err'>Selecciona ambas fechas.</div>"; return; }
    var pd=vd.split("-"), ph=vh.split("-");
    HOR_RANGO_DESDE=new Date(parseInt(pd[0]),parseInt(pd[1])-1,parseInt(pd[2]));
    HOR_RANGO_HASTA=new Date(parseInt(ph[0]),parseInt(ph[1])-1,parseInt(ph[2]));
  }
  if(HOR_RANGO_DESDE>HOR_RANGO_HASTA){ d.innerHTML="<div class='msg-err'>La fecha 'Desde' no puede ser mayor que 'Hasta'.</div>"; return; }

  d.innerHTML="<div class='loading'>🔄 Generando corte...</div>";

  sheetsGet("Horometro_Registros!A2:K").then(function(resp){
    var rows=resp.values||[];
    var todasMaquinas = (maquinaCod==="TODAS");

    // Arma un arreglo de registros por cada máquina que corresponda mostrar.
    // Si es "Todas", se agrupa una tabla por máquina; si es una sola, es un solo grupo.
    var maquinasAMostrar = todasMaquinas
      ? HOR_MAQUINAS.filter(function(m){return m.estado!=="Inactivo";})
      : HOR_MAQUINAS.filter(function(m){return m.codigo===maquinaCod;});

    var grupos = maquinasAMostrar.map(function(m){
      var registros = rows.filter(function(r){
        if(!r[0]||r[2]!==m.codigo) return false;
        var fp=parseFechaDMY((r[1]||"").toString());
        return fp && fp>=HOR_RANGO_DESDE && fp<=HOR_RANGO_HASTA;
      }).map(function(r){
        return { fecha:(r[1]||"").toString(), inicio:r[4], fin:r[5], trabajadas:r[6], aPagar:r[7], operador:(r[8]||"").toString() };
      });
      var totalPagar = Math.round(registros.reduce(function(s,r){return s+(Number(r.aPagar)||0);},0)*100)/100;
      var totalTrabajadas = Math.round(registros.reduce(function(s,r){return s+(Number(r.trabajadas)||0);},0)*100)/100;
      // Si TODO el periodo lo trabajó la misma persona (el caso normal),
      // el nombre se muestra una sola vez arriba de la tabla en vez de
      // repetirse en cada fila — así la tabla queda más limpia y con
      // menos texto que envolver en pantallas angostas. Si hubo más de
      // un operador distinto, se mantiene la columna para no perder
      // esa información.
      var nombresDistintos = {};
      registros.forEach(function(r){ if(r.operador) nombresDistintos[r.operador]=true; });
      var listaNombres = Object.keys(nombresDistintos);
      var operadorUnico = listaNombres.length===1 ? listaNombres[0] : null;
      return { maquina:m.nombre, registros:registros, totalPagar:totalPagar, totalTrabajadas:totalTrabajadas, operadorUnico:operadorUnico };
    });

    var rangoTxt = fechaLegible(HOR_RANGO_DESDE)+" al "+fechaLegible(HOR_RANGO_HASTA);
    var html="<div class='card'><div class='rep-meta'>📅 "+rangoTxt+(todasMaquinas?" · Todas las máquinas":" · "+grupos[0].maquina)+"</div>";

    grupos.forEach(function(g){
      html+="<div class='rep-sec'><div class='rep-tit'>🚜 "+g.maquina+"</div>";
      if(!g.registros.length){
        html+="<div class='empty'><div class='ei'>📭</div><p>Sin registros en este rango</p></div>";
      } else {
        if(g.operadorUnico){
          html+="<div style='font-size:12px;color:#555;margin-bottom:6px'>👤 Operador: <b>"+g.operadorUnico+"</b></div>";
          html+="<table class='rep-tabla'><tr><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Trabajadas</th><th>A pagar</th></tr>"+
            g.registros.map(function(r){
              return "<tr><td>"+r.fecha+"</td><td>"+r.inicio+"</td><td>"+r.fin+"</td><td>"+r.trabajadas+"</td><td><b>"+r.aPagar+"</b></td></tr>";
            }).join("")+"</table>";
        } else {
          html+="<table class='rep-tabla'><tr><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Trabajadas</th><th>A pagar</th><th>Operador</th></tr>"+
            g.registros.map(function(r){
              return "<tr><td>"+r.fecha+"</td><td>"+r.inicio+"</td><td>"+r.fin+"</td><td>"+r.trabajadas+"</td><td><b>"+r.aPagar+"</b></td><td>"+r.operador+"</td></tr>";
            }).join("")+"</table>";
        }
        html+=
          "<div style='display:flex;gap:8px;margin-top:8px'>"+
            "<div style='flex:1;min-width:0;background:#EBF7ED;border:2px solid #2D6A4F;border-radius:8px;padding:9px 4px;text-align:center;box-sizing:border-box'>"+
              "<div style='font-size:10px;color:#2D6A4F;font-weight:bold;letter-spacing:.3px'>TOTAL TRABAJADAS</div>"+
              "<div style='font-size:19px;font-weight:bold;color:#1B4332;white-space:nowrap'>"+g.totalTrabajadas.toFixed(2)+" h</div>"+
            "</div>"+
            "<div style='flex:1;min-width:0;background:#FFF9E6;border:2px solid #F4B942;border-radius:8px;padding:9px 4px;text-align:center;box-sizing:border-box'>"+
              "<div style='font-size:10px;color:#7B5800;font-weight:bold;letter-spacing:.3px'>TOTAL A PAGAR</div>"+
              "<div style='font-size:19px;font-weight:bold;color:#412402;white-space:nowrap'>"+g.totalPagar.toFixed(2)+" h</div>"+
            "</div>"+
          "</div>";
      }
      html+="</div>";
    });

    html+="<button class='btn b-ok' style='width:100%;margin-top:10px' onclick='horDescargarPDF()'>📄 Descargar PDF</button></div>";
    d.innerHTML=html;

    HOR_CORTE_ACTUAL={grupos:grupos, rangoTxt:rangoTxt, todasMaquinas:todasMaquinas};
  }).catch(function(e){
    d.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

var HOR_CORTE_ACTUAL=null;

function horDescargarPDF(){
  if(!HOR_CORTE_ACTUAL || !window.jspdf){ alert("Genera el corte primero."); return; }
  var c=HOR_CORTE_ACTUAL;
  var doc=new window.jspdf.jsPDF();

  doc.setFontSize(14);
  doc.text(c.todasMaquinas ? "Corte de horómetro — Todas las máquinas" : "Corte de horómetro — "+c.grupos[0].maquina,14,15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Periodo: "+c.rangoTxt+"   ·   Generado: "+new Date().toLocaleString("es-GT"),14,21);

  // Un PDF combinado: una tabla por máquina, una debajo de la otra, cada
  // una con sus dos totales destacados en recuadros de color (igual
  // criterio visual que la vista en pantalla) — así resaltan mucho más
  // que una fila de pie de tabla en texto plano. Si toda la máquina la
  // operó la misma persona en el periodo, su nombre va una sola vez
  // arriba de la tabla (en vez de una columna repetida en cada fila).
  var y=28;
  c.grupos.forEach(function(g,i){
    if(i>0 && y>235){ doc.addPage(); y=20; }
    doc.setFontSize(11); doc.setFont(undefined,"bold");
    doc.setTextColor(20,20,20);
    doc.text(g.maquina,14,y);
    doc.setFont(undefined,"normal");
    var yTabla=y+3;
    if(g.operadorUnico){
      doc.setFontSize(9); doc.setTextColor(90,90,90);
      doc.text("Operador: "+g.operadorUnico,14,y+7);
      yTabla=y+10;
    }
    doc.autoTable({
      startY:yTabla,
      head: g.operadorUnico ? [["Fecha","Inicio","Fin","Trabajadas","A pagar"]] : [["Fecha","Inicio","Fin","Trabajadas","A pagar","Operador"]],
      body:g.registros.length? g.registros.map(function(r){
        return g.operadorUnico
          ? [r.fecha,String(r.inicio),String(r.fin),String(r.trabajadas),String(r.aPagar)]
          : [r.fecha,String(r.inicio),String(r.fin),String(r.trabajadas),String(r.aPagar),r.operador];
      }):[ g.operadorUnico ? ["Sin registros en este periodo","","","",""] : ["Sin registros en este periodo","","","","",""] ],
      styles:{fontSize:9},headStyles:{fillColor:[31,56,100]},margin:{left:14,right:14}
    });
    y=doc.lastAutoTable.finalY+5;

    if(y>250){ doc.addPage(); y=20; }
    var boxW=88, boxH=16, gap=6, boxX1=14, boxX2=14+boxW+gap;
    doc.setFillColor(216,243,220); doc.setDrawColor(45,106,79); doc.setLineWidth(0.5);
    doc.roundedRect(boxX1, y, boxW, boxH, 2, 2, "FD");
    doc.setFillColor(255,249,230); doc.setDrawColor(244,185,66);
    doc.roundedRect(boxX2, y, boxW, boxH, 2, 2, "FD");

    doc.setFont(undefined,"bold"); doc.setFontSize(8);
    doc.setTextColor(45,106,79);
    doc.text("TOTAL TRABAJADAS", boxX1+boxW/2, y+5, {align:"center"});
    doc.setTextColor(123,88,0);
    doc.text("TOTAL A PAGAR", boxX2+boxW/2, y+5, {align:"center"});

    doc.setFontSize(15);
    doc.setTextColor(27,67,50);
    doc.text(g.totalTrabajadas.toFixed(2)+" h", boxX1+boxW/2, y+13, {align:"center"});
    doc.setTextColor(65,36,2);
    doc.text(g.totalPagar.toFixed(2)+" h", boxX2+boxW/2, y+13, {align:"center"});
    doc.setFont(undefined,"normal");

    y += boxH + 10;
  });

  var ahora=new Date();
  var sufijo = c.todasMaquinas ? "Todas" : c.grupos[0].maquina.replace(/\s+/g,"_");
  var nombreArchivo="Horometro_"+sufijo+"_"+ahora.getFullYear()+"-"+String(ahora.getMonth()+1).padStart(2,"0")+"-"+String(ahora.getDate()).padStart(2,"0")+"_"+String(ahora.getHours()).padStart(2,"0")+String(ahora.getMinutes()).padStart(2,"0")+".pdf";
  doc.save(nombreArchivo);
}

// ══════════════════════════════════════════════
//  MANTENIMIENTO DEL HORÓMETRO — buscar, navegar
//  (primero/anterior/siguiente/último), editar y eliminar
//  un registro puntual. Es la ÚNICA sección de la app con
//  capacidad de eliminar — a propósito contenida solo aquí.
// ══════════════════════════════════════════════
var HOR_MANT_LISTA=[];

var HOR_MANT_INDICE=0;

function horMantCargar(){
  var maquinaCod=document.getElementById("horMantMaquina").value;
  var texto=document.getElementById("horMantBuscar").value.toLowerCase().trim();
  var vacio=document.getElementById("horMantVacio");
  var nav=document.getElementById("horMantNav");

  if(!maquinaCod){
    vacio.innerHTML="<div class='msg-err'>Selecciona una máquina (o \"Todas las máquinas\").</div>";
    nav.style.display="none";
    return;
  }
  vacio.innerHTML="<div class='loading'>🔄 Cargando registros...</div>";
  nav.style.display="none";

  sheetsGet("Horometro_Registros!A2:K").then(function(resp){
    var rows=resp.values||[];
    var lista=rows.filter(function(r){
      if(!r[0]) return false;
      if(maquinaCod!=="TODAS" && (r[2]||"").toString().trim()!==maquinaCod) return false;
      if(texto){
        var fecha=(r[1]||"").toString().toLowerCase();
        var operador=(r[8]||"").toString().toLowerCase();
        var maquina=(r[3]||"").toString().toLowerCase();
        if(fecha.indexOf(texto)<0 && operador.indexOf(texto)<0 && maquina.indexOf(texto)<0) return false;
      }
      return true;
    }).map(function(r){
      return {
        id:(r[0]||"").toString(), fecha:(r[1]||"").toString(), fechaObj:parseFechaDMY((r[1]||"").toString()),
        codigoMaquina:(r[2]||"").toString(), nombreMaquina:(r[3]||"").toString(),
        inicio:r[4], fin:r[5], trabajadas:r[6], aPagar:r[7],
        operador:(r[8]||"").toString(), registradoPor:(r[9]||"").toString(), observaciones:(r[10]||"").toString()
      };
    });

    // Orden cronológico: "Primero" = el más antiguo, "Último" = el más reciente
    lista.sort(function(a,b){
      if(!a.fechaObj||!b.fechaObj) return 0;
      return a.fechaObj-b.fechaObj;
    });

    HOR_MANT_LISTA=lista;
    if(!lista.length){
      vacio.innerHTML="<div class='empty'><div class='ei'>📭</div><p>Sin registros que coincidan con la búsqueda</p></div>";
      nav.style.display="none";
      return;
    }
    vacio.innerHTML="";
    nav.style.display="block";
    HOR_MANT_INDICE=lista.length-1; // arranca mostrando el más reciente
    horMantMostrarActual();
  }).catch(function(e){
    vacio.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

function horMantMostrarActual(){
  var r=HOR_MANT_LISTA[HOR_MANT_INDICE];
  if(!r) return;
  document.getElementById("horMantPos").textContent="Registro "+(HOR_MANT_INDICE+1)+" de "+HOR_MANT_LISTA.length;
  document.getElementById("horMantFechaMaquina").textContent="📅 "+r.fecha+" · 🚜 "+r.nombreMaquina;
  document.getElementById("horMantOperador").value=r.operador;
  document.getElementById("horMantInicio").value=r.inicio;
  document.getElementById("horMantFin").value=r.fin;
  document.getElementById("horMantObs").value=r.observaciones;
  document.getElementById("horMantMsg").innerHTML="";
  horActualizarPreview("horMant");
}

function horMantPrimero(){ HOR_MANT_INDICE=0; horMantMostrarActual(); }

function horMantAnterior(){ if(HOR_MANT_INDICE>0){ HOR_MANT_INDICE--; horMantMostrarActual(); } }

function horMantSiguiente(){ if(HOR_MANT_INDICE<HOR_MANT_LISTA.length-1){ HOR_MANT_INDICE++; horMantMostrarActual(); } }

function horMantUltimo(){ HOR_MANT_INDICE=HOR_MANT_LISTA.length-1; horMantMostrarActual(); }

function horMantGuardar(){
  var btn = _botonDelEvento();
  var r=HOR_MANT_LISTA[HOR_MANT_INDICE];
  var msg=document.getElementById("horMantMsg");
  msg.innerHTML="";
  if(!r) return;

  var operador=document.getElementById("horMantOperador").value.trim();
  var ini=document.getElementById("horMantInicio").value;
  var fin=document.getElementById("horMantFin").value;
  var obs=document.getElementById("horMantObs").value.trim();

  if(!operador||!ini||!fin){
    msg.innerHTML="<div class='msg-err'>Operador, horómetro de inicio y de fin son obligatorios.</div>";
    return;
  }
  if(!_bloquearBoton(btn, "horMantGuardar")) return;

  // Se envía la MISMA máquina+fecha del registro actual — Code.gs va a
  // encontrar que ya existe y va a ACTUALIZAR esa fila, no crear una nueva.
  gasPost("guardarLecturaHorometro",{
    codigoMaquina: r.codigoMaquina,
    nombreMaquina: r.nombreMaquina,
    fecha: r.fecha,
    operador: operador,
    horometroInicio: ini,
    horometroFin: fin,
    observaciones: obs,
    registradoPor: (SESION&&SESION.nombre)||"Almacenista"
  }).then(function(res){
    _liberarBoton(btn, "horMantGuardar");
    if(res.error){ msg.innerHTML="<div class='msg-err'>❌ "+res.error+"</div>"; return; }
    // Actualiza el registro en memoria, sin recargar toda la lista
    r.operador=operador; r.inicio=ini; r.fin=fin; r.observaciones=obs;
    r.trabajadas=res.horasTrabajadas; r.aPagar=res.horasAPagar;
    msg.innerHTML="<div class='msg-ok'>✅ Cambios guardados — "+res.horasTrabajadas+" h trabajadas, "+res.horasAPagar+" h a pagar.</div>";
  }).catch(function(e){
    _liberarBoton(btn, "horMantGuardar");
    msg.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}

function horMantEliminar(){
  var btn = _botonDelEvento();
  var r=HOR_MANT_LISTA[HOR_MANT_INDICE];
  if(!r) return;
  if(!confirm("¿Eliminar el registro de "+r.nombreMaquina+" del "+r.fecha+"? Esta acción no se puede deshacer.")) return;
  if(!_bloquearBoton(btn, "horMantEliminar")) return;

  var msg=document.getElementById("horMantMsg");
  gasPost("eliminarLecturaHorometro",{id:r.id}).then(function(res){
    _liberarBoton(btn, "horMantEliminar");
    if(res.error){ msg.innerHTML="<div class='msg-err'>❌ "+res.error+"</div>"; return; }
    HOR_MANT_LISTA.splice(HOR_MANT_INDICE,1);
    if(!HOR_MANT_LISTA.length){
      document.getElementById("horMantNav").style.display="none";
      document.getElementById("horMantVacio").innerHTML="<div class='empty'><div class='ei'>📭</div><p>Sin registros — se eliminó el último de la búsqueda actual</p></div>";
      return;
    }
    if(HOR_MANT_INDICE>=HOR_MANT_LISTA.length) HOR_MANT_INDICE=HOR_MANT_LISTA.length-1;
    horMantMostrarActual();
  }).catch(function(e){
    _liberarBoton(btn, "horMantEliminar");
    msg.innerHTML="<div class='msg-err'>❌ Error: "+e.message+"</div>";
  });
}
