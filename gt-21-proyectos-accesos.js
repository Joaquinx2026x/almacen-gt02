// ═══════════════════════════════════════════════════════════
//  PROYECTOS Y ACCESOS (v3.3.0)
//  1) Selector / cambio de proyecto para usuarios GLOBALES (los que tienen
//     acceso a varios proyectos): aparece después del login cuando entran por
//     el enlace de siempre, y desde el menú «Cambiar de proyecto».
//  2) Pantalla «Accesos y proyectos» (solo el administrador GENERAL): crear y
//     editar usuarios globales, decidir a qué proyectos entra cada uno, y ver
//     el enlace (con QR) de cada proyecto para repartirlo al personal.
//  Los datos de accesos viven en el Excel maestro, que es PRIVADO: esta
//  pantalla los lee y los cambia solo a través del servidor.
//  Servidor: 12_Proyectos.gs (seleccionarProyecto, listarAccesos, guardarAcceso).
// ═══════════════════════════════════════════════════════════
var ACC_DATOS=null, ACC_EDITANDO=null;

// ── Selector de proyecto ──
// inicial=true: justo después del login (la app todavía no se mostró).
function mostrarSelectorProyecto(inicial){
  var s=document.getElementById("proyectoSelScr"); if(!s) return;
  var lista=(SESION&&SESION.proyectos)||[];
  var actual=(SESION&&SESION.proyecto&&SESION.proyecto.codigo)||"";
  var h="<div class='login-box'><h2>🏗 Elige el proyecto</h2><p>Hola, "+esc(SESION.nombre)+". Tu usuario tiene acceso a varios proyectos.</p><div id='proyectoSelErr' class='login-err'></div>";
  lista.forEach(function(p){
    h+="<button type='button' data-cod=\""+pfAttr(p.codigo)+"\" onclick='elegirProyecto(this.getAttribute(\"data-cod\"),"+(inicial?"true":"false")+")' style='display:block;width:100%;text-align:left;margin-bottom:8px'>"+
       "<b>"+esc(p.nombre)+"</b> <span style='font-size:11px;opacity:.8'>"+esc(p.codigo)+(p.ubicacion?" · "+esc(p.ubicacion):"")+(p.codigo===actual?" · actual":"")+"</span></button>";
  });
  if(!inicial) h+="<button type='button' onclick='cerrarSelectorProyecto()' style='background:#6c757d;width:100%'>Cancelar</button>";
  h+="</div>";
  s.innerHTML=h; s.style.display="block";
  document.getElementById("loginScreen").style.display="none";
  document.getElementById("appContent").style.display="none";
}

function cerrarSelectorProyecto(){
  var s=document.getElementById("proyectoSelScr"); if(s) s.style.display="none";
  document.getElementById("appContent").style.display="block";
}

function abrirCambiarProyecto(){
  var m=document.getElementById("menuMas"); if(m) m.style.display="none";
  mostrarSelectorProyecto(false);
}

function elegirProyecto(codigo,inicial){
  var err=document.getElementById("proyectoSelErr"); if(err) err.style.display="none";
  var actual=(SESION&&SESION.proyecto&&SESION.proyecto.codigo)||"";
  if(codigo===actual){
    document.getElementById("proyectoSelScr").style.display="none";
    if(inicial) mostrarApp(); else cerrarSelectorProyecto();
    return;
  }
  gasPost("seleccionarProyecto",{codigo:codigo}).then(function(r){
    SESION.token=r.token; SESION.exp=r.exp; SESION.rol=r.rol; SESION.proyecto=r.proyecto; SESION.proyectos=r.proyectos||SESION.proyectos; SESION.global=true;
    localStorage.setItem("gt02_sesion",JSON.stringify(SESION));
    // Se deja el enlace apuntando al proyecto elegido y se recarga limpio (sin datos del proyecto anterior en memoria).
    try{ history.replaceState(null,"",location.pathname+"?p="+encodeURIComponent(r.proyecto.codigo)); }catch(e){}
    location.reload();
  }).catch(function(e){
    if(err){ err.textContent=e.message; err.style.display="block"; }
  });
}

// ── Pantalla de Accesos ──
function abrirAccesos(){
  if(!(SESION&&SESION.global&&((SESION.rol||"").toLowerCase()==="admin"))){ alert("Solo el administrador general puede gestionar accesos."); return; }
  navLimpiarTodo();
  var s=document.getElementById("accesosScr"); if(!s) return;
  s.classList.add("on");
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("on"); });
  ACC_EDITANDO=null;
  accCargar();
}

function accCargar(){
  var box=document.getElementById("accLista");
  box.innerHTML="<div class='loading'>🔄 Cargando accesos...</div>";
  document.getElementById("accForm").innerHTML="";
  gasPost("listarAccesos",{}).then(function(r){ ACC_DATOS=r; accRender(); }).catch(function(e){
    box.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>";
  });
}

function accRender(){
  var d=ACC_DATOS, box=document.getElementById("accLista");
  var h="<div class='card'><div class='ctit'>🔗 Enlace de cada proyecto</div>"+
    "<div style='font-size:11px;color:#777;margin-bottom:6px'>Cada proyecto tiene su enlace. Quien entra por él solo ve ese proyecto. También puede imprimirse como QR.</div>";
  d.proyectos.forEach(function(p,i){
    var link=accEnlace(p.codigo);
    h+="<div style='padding:8px 0;border-top:1px solid #eee;"+(p.activo?"":"opacity:.5")+"'><div style='font-size:13px'><b>"+esc(p.nombre)+"</b> <span style='font-size:11px;color:#888'>"+esc(p.codigo)+(p.activo?"":" · desactivado")+"</span></div>"+
      "<div style='font-size:11px;word-break:break-all;color:#1B4332;margin:3px 0'>"+esc(link)+"</div>"+
      "<div style='display:flex;gap:8px;align-items:center'><button class='btn b-sec b-sm' data-cod=\""+pfAttr(p.codigo)+"\" onclick='accCopiar(this.getAttribute(\"data-cod\"))'>📋 Copiar enlace</button>"+
      "<div id='accQR-"+i+"' style='width:90px;height:90px'></div></div></div>";
  });
  h+="</div><div class='card'><div class='ctit'>👤 Usuarios globales</div>"+
    "<div style='font-size:11px;color:#777;margin-bottom:6px'>Entran a varios proyectos con un solo usuario y PIN. Los usuarios de un solo proyecto se manejan en «Gestión de usuarios» de ese proyecto.</div>"+
    "<button class='btn b-ok b-sm' style='width:100%;margin-bottom:6px' onclick='accForm(null)'>➕ Nuevo usuario global</button>";
  d.usuarios.forEach(function(u,i){
    var proy=(u.proyectos||"").toLowerCase()==="todos"?"TODOS los proyectos":esc(u.proyectos||"—");
    h+="<div style='padding:8px 0;border-top:1px solid #eee;"+(u.activo?"":"opacity:.55")+"'>"+
      "<div style='font-size:13px'><b>"+esc(u.nombre||u.usuario)+"</b> <span style='font-size:11px;color:#888'>"+esc(u.usuario)+"</span> "+
      "<span style='font-size:10px;background:"+(u.rol==="Admin"?"#1B4332":u.rol==="Solo lectura"?"#6c757d":"#2D6A4F")+";color:#fff;padding:1px 7px;border-radius:8px'>"+esc(u.rol)+"</span>"+(u.activo?"":" <span style='font-size:10px;color:#C00000'>INACTIVO</span>")+"</div>"+
      "<div style='font-size:11px;color:#555;margin:3px 0'>Proyectos: "+proy+"</div>"+
      "<div style='display:flex;gap:6px'><button class='btn b-blue b-sm' onclick='accForm("+i+")'>✏️ Editar</button>"+
      "<button class='btn b-sec b-sm' onclick='accToggle("+i+")'>"+(u.activo?"⏸ Desactivar":"▶ Activar")+"</button></div></div>";
  });
  h+="</div>";
  box.innerHTML=h;
  // QR de cada enlace (si la librería de QR cargó)
  d.proyectos.forEach(function(p,i){
    var el=document.getElementById("accQR-"+i);
    if(el&&window.QRCode){ try{ new window.QRCode(el,{text:accEnlace(p.codigo),width:90,height:90}); }catch(e){} }
  });
}

function accEnlace(codigo){
  var base=location.origin+location.pathname;
  return base+"?p="+encodeURIComponent(codigo);
}

function accCopiar(codigo){
  var link=accEnlace(codigo);
  var listo=function(){ document.getElementById("accAviso").innerHTML="<div class='msg-ok'>✅ Enlace de "+esc(codigo)+" copiado.</div>"; };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(listo).catch(function(){ prompt("Copia el enlace:",link); }); }
  else prompt("Copia el enlace:",link);
}

function accForm(idx){
  var d=ACC_DATOS, u=(idx===null)?null:d.usuarios[idx]; ACC_EDITANDO=u?u.usuario:null;
  var todos=u&&(u.proyectos||"").toLowerCase()==="todos";
  var elegidos=u&&!todos?(u.proyectos||"").split(/[,;]/).map(function(x){ return x.trim().toLowerCase(); }):[];
  var h="<div class='card' style='border:2px solid #2D6A4F'><div class='ctit'>"+(u?"✏️ Editar "+esc(u.usuario):"➕ Nuevo usuario global")+"</div>"+
    "<input type='text' id='accUsuario' placeholder='Usuario' value=\""+pfAttr(u?u.usuario:"")+"\" "+(u?"disabled":"")+">"+
    "<input type='text' id='accNombre' placeholder='Nombre completo' value=\""+pfAttr(u?u.nombre:"")+"\">"+
    "<input type='password' id='accPin' placeholder='"+(u?"PIN nuevo (vacío = no cambia)":"PIN (mínimo 4)")+"' autocomplete='new-password'>"+
    "<select id='accRol'>"+["Admin","Supervisor","Operador","Solo lectura"].map(function(r){ return "<option value=\""+pfAttr(r)+"\""+((u?u.rol:"Solo lectura")===r?" selected":"")+">"+esc(r)+"</option>"; }).join("")+"</select>"+
    "<div style='font-size:12px;font-weight:bold;margin:6px 0 2px'>Proyectos a los que entra</div>"+
    "<label style='display:flex;gap:8px;font-size:12px;margin:3px 0'><input type='checkbox' id='accTodos' style='width:auto' "+(todos?"checked":"")+" onchange='accToggleTodos()'> <span><b>TODOS</b> (incluye los que se creen después)</span></label>";
  d.proyectos.filter(function(p){ return p.activo; }).forEach(function(p,i){
    h+="<label style='display:flex;gap:8px;font-size:12px;margin:3px 0'><input type='checkbox' class='accProy' value=\""+pfAttr(p.codigo)+"\" style='width:auto' "+(elegidos.indexOf(p.codigo.toLowerCase())>=0?"checked":"")+(todos?" disabled":"")+"> <span>"+esc(p.nombre)+" <span style='color:#888'>("+esc(p.codigo)+")</span></span></label>";
  });
  h+="<div id='accMsg'></div><div style='display:flex;gap:8px;margin-top:8px'><button class='btn b-ok' style='flex:1' onclick='accGuardar()'>💾 Guardar</button>"+
    "<button class='btn b-sec' style='flex:0' onclick='document.getElementById(\"accForm\").innerHTML=\"\"'>Cancelar</button></div></div>";
  document.getElementById("accForm").innerHTML=h;
  document.getElementById("accForm").scrollIntoView&&document.getElementById("accForm").scrollIntoView({behavior:"smooth"});
}

function accToggleTodos(){
  var t=document.getElementById("accTodos").checked;
  document.querySelectorAll(".accProy").forEach(function(c){ c.disabled=t; if(t) c.checked=false; });
}

function accGuardar(){
  var msg=document.getElementById("accMsg"); msg.innerHTML="";
  var usuario=(document.getElementById("accUsuario").value||"").trim();
  var pin=(document.getElementById("accPin").value||"").trim();
  var todos=document.getElementById("accTodos").checked;
  var sel=[].slice.call(document.querySelectorAll(".accProy:checked")).map(function(c){ return c.value; });
  if(!usuario){ msg.innerHTML="<div class='msg-err'>Escribe el usuario.</div>"; return; }
  if(!ACC_EDITANDO&&pin.length<4){ msg.innerHTML="<div class='msg-err'>El PIN debe tener al menos 4 caracteres.</div>"; return; }
  if(!todos&&!sel.length){ msg.innerHTML="<div class='msg-err'>Elige al menos un proyecto (o marca TODOS).</div>"; return; }
  var datos={usuario:usuario,nombre:(document.getElementById("accNombre").value||"").trim(),rol:document.getElementById("accRol").value,proyectos:todos?"TODOS":sel};
  if(pin) datos.pin=pin;
  var btn=_botonDelEvento();
  if(!_bloquearBoton(btn,"accGuardar")) return;
  gasPost("guardarAcceso",datos).then(function(){
    _liberarBoton(btn,"accGuardar");
    document.getElementById("accAviso").innerHTML="<div class='msg-ok'>✅ Acceso guardado: "+esc(usuario)+".</div>";
    accCargar();
  }).catch(function(e){
    _liberarBoton(btn,"accGuardar");
    msg.innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>";
  });
}

function accToggle(idx){
  var u=ACC_DATOS.usuarios[idx];
  if(!confirm((u.activo?"¿Desactivar a ":"¿Activar a ")+u.usuario+"?")) return;
  gasPost("guardarAcceso",{usuario:u.usuario,activo:!u.activo}).then(function(){ accCargar(); }).catch(function(e){ document.getElementById("accAviso").innerHTML="<div class='msg-err'>❌ "+esc(e.message)+"</div>"; });
}
