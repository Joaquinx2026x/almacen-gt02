// ═══════════════════════════════════════════════════════════
//  PERFIL DEL TRABAJADOR — vista previa (v3.0.0)
//  Ventana emergente de SOLO LECTURA que se abre con el botón ℹ️ junto
//  al trabajador (en Préstamo y en Historial). Muestra lo necesario para
//  reconocer a la persona: foto, nombre, código, cargo, estado, tallas y
//  vigencia del carnet. A propósito NO muestra DUI, teléfono, alergias ni
//  observaciones (datos sensibles que ve cualquier usuario del sistema).
//  Para cambiar algo, el botón "Editar" (solo Admin/Supervisor) lleva a
//  la pantalla real de edición en Gestión de trabajadores.
//  Depende de: sheetsGet, SHEET, urlFotoDrive, SESION (gt-01 / gt-02),
//  abrirGestionTrabajadores, editarTrabajadorForm, TRAB_CACHE (gt-12).
// ═══════════════════════════════════════════════════════════
function pfAttr(s){ // texto seguro para meter dentro de un atributo HTML
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function pfTxt(s){ return pfAttr(s); }

function pfAsegurarEstilos(){
  if(document.getElementById("pfEstilos")) return;
  var st=document.createElement("style"); st.id="pfEstilos";
  st.textContent=
    ".pf-info{background:#E8F4EA;color:#1B4332;border:1px solid #B7D9C0;border-radius:50%;width:30px;height:30px;padding:0;font-size:14px;line-height:1;flex-shrink:0;cursor:pointer}"+
    "#perfilTrabajadorOv{display:none;position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}"+
    ".pf-card{background:#fff;border-radius:12px;max-width:340px;width:100%;max-height:90vh;overflow:auto;padding:16px;box-shadow:0 6px 24px rgba(0,0,0,.35);box-sizing:border-box}"+
    ".pf-fila{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}"+
    ".pf-fila span:first-child{color:#777}.pf-fila span:last-child{font-weight:bold;color:#1B4332;text-align:right}";
  document.head.appendChild(st);
}

function pfOverlay(){
  pfAsegurarEstilos();
  var ov=document.getElementById("perfilTrabajadorOv");
  if(!ov){
    ov=document.createElement("div"); ov.id="perfilTrabajadorOv";
    ov.addEventListener("click",function(e){ if(e.target===ov) cerrarPerfilTrabajador(); });
    document.body.appendChild(ov);
    document.addEventListener("keydown",function(e){ if(e.key==="Escape") cerrarPerfilTrabajador(); });
  }
  return ov;
}

function cerrarPerfilTrabajador(){
  var ov=document.getElementById("perfilTrabajadorOv");
  if(ov) ov.style.display="none";
}

function abrirPerfilTrabajador(codigo){
  codigo=(codigo||"").toString().trim();
  if(!codigo) return;
  var ov=pfOverlay();
  ov.innerHTML="<div class='pf-card'><div class='loading'>🔄 Cargando perfil...</div></div>";
  ov.style.display="flex";
  sheetsGet(SHEET("Personal")+"!A2:N").then(function(r){
    var rows=r.values||[], f=null, buscado=codigo.toLowerCase();
    for(var i=0;i<rows.length;i++){
      if((rows[i][0]||"").toString().trim().toLowerCase()===buscado){ f=rows[i]; break; }
    }
    if(!f){
      ov.innerHTML="<div class='pf-card'><div class='msg-err'>No se encontró este trabajador en el listado de personal.</div>"+
        "<button type='button' class='btn b-sec' style='margin-top:10px' onclick='cerrarPerfilTrabajador()'>Cerrar</button></div>";
      return;
    }
    var cod=(f[0]||"").toString().trim();
    var nombre=(f[1]||"").toString().trim()||cod;
    var cargo=(f[2]||"").toString().trim()||"—";
    var estado=(f[6]||"Activo").toString().trim()||"Activo";
    var foto=(f[9]||"").toString().trim();
    var vigencia=(f[10]||"").toString().trim()||"Mientras dure el proyecto";
    var tCamisa=(f[11]||"").toString().trim()||"—";
    var tZapato=(f[12]||"").toString().trim()||"—";
    var activo=estado.toLowerCase()==="activo";
    var rol=((typeof SESION!=="undefined"&&SESION&&SESION.rol)||"").toLowerCase();
    var puedeEditar=(rol==="admin"||rol==="supervisor");
    var fotoHTML=foto
      ?"<img src='"+urlFotoDrive(foto,240)+"' style='width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #B7D9C0' onerror=\"this.style.display='none'\">"
      :"<div style='width:96px;height:96px;border-radius:50%;background:#D8F3DC;color:#2D6A4F;display:flex;align-items:center;justify-content:center;font-size:40px'>👤</div>";
    var badge="<span style='display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:bold;color:#fff;background:"+(activo?"#2D6A4F":"#C00000")+"'>"+pfTxt(estado.toUpperCase())+"</span>";
    ov.innerHTML=
      "<div class='pf-card'>"+
        "<div style='text-align:center;margin-bottom:10px'>"+fotoHTML+
          "<div style='font-size:16px;font-weight:bold;color:#1B4332;margin-top:8px'>"+pfTxt(nombre)+"</div>"+
          "<div style='font-size:12px;color:#777;margin:2px 0 6px'>"+pfTxt(cod)+"</div>"+badge+"</div>"+
        "<div class='pf-fila'><span>Cargo</span><span>"+pfTxt(cargo)+"</span></div>"+
        "<div class='pf-fila'><span>Talla de camisa</span><span>"+pfTxt(tCamisa)+"</span></div>"+
        "<div class='pf-fila'><span>Talla de zapato</span><span>"+pfTxt(tZapato)+"</span></div>"+
        "<div class='pf-fila'><span>Vigencia del carnet</span><span>"+pfTxt(vigencia)+"</span></div>"+
        "<div style='display:flex;gap:8px;margin-top:14px'>"+
          (puedeEditar?"<button type='button' class='btn b-blue' style='flex:1;margin:0' data-cod=\""+pfAttr(cod)+"\" onclick='perfilIrAEditar(this.getAttribute(\"data-cod\"))'>✏️ Editar</button>":"")+
          "<button type='button' class='btn b-sec' style='flex:1;margin:0' onclick='cerrarPerfilTrabajador()'>Cerrar</button>"+
        "</div>"+
      "</div>";
  }).catch(function(){
    ov.innerHTML="<div class='pf-card'><div class='msg-err'>No se pudo cargar el perfil. Revisa tu conexión.</div>"+
      "<button type='button' class='btn b-sec' style='margin-top:10px' onclick='cerrarPerfilTrabajador()'>Cerrar</button></div>";
  });
}

// Lleva a Admin → Gestión de trabajadores y abre el formulario de edición
// de ESE trabajador, apenas termine de cargar la lista.
function perfilIrAEditar(codigo){
  cerrarPerfilTrabajador();
  TRAB_CACHE={}; // se vacía para saber cuándo terminó la carga nueva
  abrirGestionTrabajadores();
  var intentos=0;
  var t=setInterval(function(){
    intentos++;
    if(TRAB_CACHE[codigo]){
      clearInterval(t);
      editarTrabajadorForm(codigo);
      var fm=document.getElementById("trabForm");
      if(fm&&fm.scrollIntoView) fm.scrollIntoView({behavior:"smooth",block:"start"});
    } else if(intentos>40){ clearInterval(t); } // 10 segundos y se rinde
  },250);
}
