import { createClient } from '@supabase/supabase-js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import './style.css';
const url=import.meta.env.VITE_SUPABASE_URL, pub=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const db=(url&&pub&&!pub.startsWith('REEMPLAZAR'))?createClient(url,pub):null;
const app=document.querySelector('#app');
let session=null, result=null, current={};
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shell(inner){app.innerHTML='<header><div class="brand"><img class="brand-logo" src="'+import.meta.env.BASE_URL+'grafiplot-logo.png" alt="Logo de Grafiplot" onerror="this.style.display=\'none\'"/><div><strong>Sesiones <span>Grafiplot</span></strong><small>Sesiones de aprendizaje para docentes</small></div></div><span class="header-pill">Plataforma docente</span></header><main>'+inner+'</main><footer>Una iniciativa de Grafiplot · Biblioteca de sesiones • Supabase • Gemini</footer>'}
function message(txt,type='info'){let el=document.querySelector('#mensaje');if(el){el.textContent=txt;el.className='notice '+type}}
async function login(){shell('<section class="panel narrow"><h1>Acceso de docentes</h1><p>Ingresa con la cuenta habilitada por el administrador.</p><form id="login"><label>Correo<input id="email" type="email" required autocomplete="email"/></label><label>Contraseña<input id="password" type="password" required autocomplete="current-password"/></label><button>Ingresar</button></form><div id="mensaje"></div></section>');if(!db)message('Configura las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el servidor.','error');document.querySelector('#login').onsubmit=async e=>{e.preventDefault();if(!db)return;const {data,error}=await db.auth.signInWithPassword({email:document.querySelector('#email').value,password:document.querySelector('#password').value});if(error)return message(error.message,'error');session=data.session;editor()}}
const sections=[['proposito','Propósito'],['capacidad','Capacidades'],['desempeno','Desempeño'],['enfoque_transversal','Enfoque transversal'],['evidencia','Evidencia de aprendizaje'],['instrumento_evaluacion','Instrumento de evaluación'],['materiales','Materiales y recursos'],['competencia_sugerida','Competencia sugerida'],['inicio','Inicio'],['desarrollo','Desarrollo'],['cierre','Cierre'],['criterios_evaluacion','Criterios de evaluación']];
function editor(){shell('<div class="top"><div><h1>Crear sesión</h1><p>Selecciona tus requisitos. La biblioteca JSON se consulta automáticamente.</p></div><button id="logout" class="secondary">Cerrar sesión</button></div><div class="workspace"><section class="panel"><form id="generar"><div class="two"><label>Nivel<select name="nivel"><option>Primaria</option><option>Inicial</option><option>Secundaria</option></select></label><label>Grado<select name="grado">'+[1,2,3,4,5,6].map(n=>'<option value="'+n+'°" '+(n===4?'selected':'')+'>'+n+'°</option>').join('')+'</select></label></div><label>Área curricular<select name="area">'+['Educación Física','Matemática','Comunicación','Ciencia y Tecnología','Personal Social','Arte y Cultura'].map(a=>'<option>'+a+'</option>').join('')+'</select></label><details class="additional"><summary>Datos de la institución y estudiantes</summary><label>N.° de sesión<input name="numero_sesion" value="01"/></label><label>Director(a)<input name="director"/></label><label>Practicante<input name="practicante"/></label><label>Institución educativa<input name="institucion" placeholder="I.E. N.° …"/></label><div class="two"><label>DRE<input name="dre" placeholder="DRE"/></label><label>UGEL<input name="ugel" placeholder="UGEL"/></label></div><label>Docente<input name="docente" placeholder="Nombres y apellidos"/></label><div class="two"><label>Sección<input name="seccion" placeholder="A"/></label><label>Fecha<input name="fecha" type="date"/></label></div><label>Unidad didáctica<input name="unidad" placeholder="Unidad N.° …"/></label><label>Alumnos para la lista de cotejo<textarea name="alumnos" rows="5" placeholder="Un estudiante por línea"></textarea></label></details><label>Tema<input name="tema" required value="Pase y recepción del balón en fútbol"/></label><label>Duración (minutos)<input name="duracion_minutos" type="number" min="15" max="240" value="90" required/></label><div class="help">Plantilla predeterminada · Ficha de trabajo y observación incluidas · Puedes editar el resultado antes de exportarlo.</div><button id="btn-generar">✨ Generar sesión con IA</button><div id="mensaje" role="status"></div></form></section><section class="panel"><div class="preview-head"><h2>Vista previa A4</h2><div><button class="secondary" id="word" disabled>Word</button><button class="secondary" id="pdf" disabled>Imprimir / PDF</button></div></div><div id="preview" class="paper"><p class="placeholder">Aquí aparecerá tu sesión. Las fichas se incorporarán al final.</p></div></section></div>');document.querySelector('#logout').onclick=async()=>{await db?.auth.signOut();session=null;login()};document.querySelector('#generar').onsubmit=generate;document.querySelector('#pdf').onclick=()=>window.print();document.querySelector('#word').onclick=exportWord;}
async function generate(e){e.preventDefault();if(!db||!session)return message('Inicia sesión y configura Supabase.','error');const btn=document.querySelector('#btn-generar');btn.disabled=true;btn.textContent='Generando…';const fd=new FormData(e.target);current=Object.fromEntries(fd.entries());current.duracion_minutos=Number(current.duracion_minutos);message('Consultando biblioteca y solicitando IA… (diagnóstico v2)');try{const {data,error}=await db.functions.invoke('aula-generar-sesion',{body:current});if(error){let detalle=data?.error||error.message;try{const response=error.context;if(response && typeof response.text==='function'){const raw=await response.text();let info;try{info=JSON.parse(raw)}catch{info=null}if(info){detalle=[info.error,info.detalle,info.codigo?'HTTP '+info.codigo:null].filter(Boolean).join(' — ')||detalle}else if(raw)detalle=raw.slice(0,250)}}catch(ex){console.warn('No se pudo leer detalle de Edge Function',ex)}throw new Error(detalle)}if(!data?.resultado)throw new Error(data?.error||'No se recibió la sesión');result=data.resultado;renderResult(data.fuentes||[]);message(data.modo==='biblioteca'?'Sesión recuperada de tu biblioteca sin utilizar IA.': 'Sesión preparada con apoyo de Gemini. Revisa y edita antes de imprimir.','ok')}catch(err){message('No se pudo generar: '+err.message,'error')}finally{btn.disabled=false;btn.textContent='✨ Generar sesión con IA'}}

function readable(value){if(Array.isArray(value))return value.map(readable).join('\n');if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>k+': '+readable(v)).join('\n');return String(value??'')}
function td(value){return '<td contenteditable="true">'+h(readable(value)).replace(/\n/g,'<br>')+'</td>'}
function renderResult(){
 const p=document.querySelector('#preview'),r=result,criteria=Array.isArray(r.ficha_observacion)?r.ficha_observacion:[];
 const datos=[['UGEL',current.ugel],['I.E.',current.institucion],['Director(a)',current.director],['Nivel',current.nivel],['Área',current.area],['Grado y sección',[current.grado,current.seccion].filter(Boolean).join(' ')],['Docente',current.docente],['Practicante',current.practicante],['Fecha',current.fecha],['Duración',current.duracion_minutos+' minutos']].filter(([k,v])=>v);
 const t=(x)=>'<h3>'+x+'</h3>';
 const rows=datos.map(([a,b])=>'<tr><th>'+h(a)+'</th>'+td(b)+'</tr>').join('');
 const minutes=Number(current.duracion_minutos)||90,ini=Math.round(minutes*20/135),cie=Math.round(minutes*15/135),des=minutes-ini-cie;
 p.innerHTML='<div class="document-heading">SESIÓN DE APRENDIZAJE N.° '+h(current.numero_sesion||'01')+'</div>'+
 '<h2 contenteditable="true" data-field="titulo">'+h(r.titulo||current.tema)+'</h2>'+
 '<table class="meta-table"><tbody>'+rows+'</tbody></table>'+
 t('PROPÓSITOS DE APRENDIZAJE')+'<div class="editable" contenteditable="true" data-field="proposito">'+h(readable(r.proposito))+'</div>'+
 '<table class="curricular"><thead><tr><th>Competencia</th><th>Capacidad</th><th>Desempeño precisado</th><th>Criterios de evaluación</th><th>Evidencias</th></tr></thead><tbody><tr>'+
 [r.competencia_sugerida,r.capacidad,r.desempeno,r.criterios_evaluacion,r.evidencia].map(td).join('')+'</tr></tbody></table>'+
 '<table class="curricular"><thead><tr><th>Competencia transversal</th><th>Desempeño</th></tr></thead><tbody><tr>'+td(r.competencia_transversal||'')+td(r.desempeno_transversal||'')+'</tr></tbody></table>'+
 '<table class="curricular"><thead><tr><th>Enfoque transversal</th><th>Valores</th><th>Actitudes demostrables</th></tr></thead><tbody><tr>'+td(r.enfoque_transversal)+td(r.valores||'')+td(r.actitudes_demostrables||'')+'</tr></tbody></table>'+
 t('I. RECURSOS QUE UTILIZAR')+'<table class="curricular"><thead><tr><th>¿Qué necesitamos hacer antes de la sesión?</th><th>¿Qué recursos o materiales se utilizarán?</th></tr></thead><tbody><tr>'+td(r.preparacion_previa||'Seleccionar y preparar el ambiente de aprendizaje.')+td(r.materiales)+'</tr></tbody></table>'+
 t('II. MOMENTOS PEDAGÓGICOS')+
 '<table class="moments"><thead><tr><th>Momentos pedagógicos</th><th>Procesos pedagógicos y actividades</th><th>Tiempo</th></tr></thead><tbody>'+
 '<tr><th>INICIO<br>Motivación, saberes previos, conflicto cognitivo, propósito y organización</th>'+td(r.inicio)+'<td contenteditable="true">'+ini+' min</td></tr>'+
 '<tr><th>DESARROLLO<br>Gestión y acompañamiento del aprendizaje</th>'+td(r.desarrollo)+'<td contenteditable="true">'+des+' min</td></tr>'+
 '<tr><th>CIERRE<br>Metacognición, reflexión, retroalimentación y transferencia</th>'+td(r.cierre)+'<td contenteditable="true">'+cie+' min</td></tr></tbody></table>'+
 '<table class="curricular"><tbody><tr><th>Trabajo de extensión</th>'+td(r.trabajo_extension||'Practicar lo aprendido.')+'</tr><tr><th>Instrumento de evaluación</th>'+td(r.instrumento_evaluacion||'Lista de cotejo')+'</tr></tbody></table>'+
 '<div class="signatures"><span>______________________<br>DOCENTE DE ÁREA</span><span>______________________<br>DIRECTOR(A)</span><span>______________________<br>PRACTICANTE</span></div>'+
 '<div class="page-break"></div>'+t('ANEXO 1. FICHA DE TRABAJO')+
 '<h3 contenteditable="true">'+h(r.ficha_trabajo?.titulo||current.tema)+'</h3>'+
 '<p>Estudiante: __________________________ Grado: ______ Fecha: __________</p>'+
 '<p contenteditable="true" data-field="indicaciones">'+h(readable(r.ficha_trabajo?.indicaciones||''))+'</p>'+
 '<div id="preguntas">'+(Array.isArray(r.ficha_trabajo?.preguntas)?r.ficha_trabajo.preguntas:[]).map((q,i)=>'<div class="question"><b>'+(i+1)+'.</b> <span contenteditable="true">'+h(readable(q))+'</span><div class="lines">________________________________________________<br>________________________________________________</div></div>').join('')+'</div>'+
 '<div class="page-break"></div>'+t('ANEXO 2. FICHA DE OBSERVACIÓN / LISTA DE COTEJO')+
 '<p>Estudiante: __________________________ Grado: ______</p>'+
 '<table><thead><tr><th>Criterio observable</th><th>Sí</th><th>En proceso</th><th>No</th></tr></thead><tbody>'+
 criteria.map(q=>'<tr><td contenteditable="true">'+h(readable(q))+'</td><td>☐</td><td>☐</td><td>☐</td></tr>').join('')+'</tbody></table>'+
 '<p class="source">Formato inspirado en el documento de referencia proporcionado por el usuario. Revisar competencias y actividades antes de aplicar.</p>';
 document.querySelector('#word').disabled=false;document.querySelector('#pdf').disabled=false;
}
async function exportWord(){
 if(!result)return;
 const {Table,TableRow,TableCell,WidthType,AlignmentType,BorderStyle,ShadingType,PageBreak}=await import('docx');
 const grab=(selector)=>document.querySelector(selector)?.innerText?.trim()||'';
 const str=(v)=>readable(v).trim();
 const para=(x,bold=false)=>new Paragraph({children:[new TextRun({text:String(x??''),bold,size:19,font:'Arial'})],spacing:{after:90,line:260}});
 const heading=(x)=>new Paragraph({children:[new TextRun({text:x,bold:true,size:22,font:'Arial'})],spacing:{before:210,after:105}});
 const black={style:BorderStyle.SINGLE,size:6,color:'222222'};
 const borders={top:black,bottom:black,left:black,right:black,insideHorizontal:black,insideVertical:black};
 const table=(rows,weights=null,firstHeader=true)=>{
  const cols=Math.max(...rows.map(r=>r.length));
  const widths=(weights&&weights.length===cols?weights:Array(cols).fill(1/cols)).map(v=>Math.round(v*100));
  return new Table({
   width:{size:100,type:WidthType.PERCENTAGE},
   borders,
   layout:'fixed',
   rows:rows.map((values,i)=>new TableRow({tableHeader:firstHeader&&i===0,cantSplit:true,children:Array.from({length:cols},(_,j)=>new TableCell({
    width:{size:widths[j],type:WidthType.PERCENTAGE},
    borders,
    margins:{top:85,bottom:85,left:90,right:90},
    shading:firstHeader&&i===0?{type:ShadingType.CLEAR,fill:'E8ECEF'}:undefined,
    children:[para(str(values[j]??''),firstHeader&&i===0)]
   }))}))
  });
 };
 const getEditable=(value,selector)=>grab(selector)||str(value);
 const data=[['UGEL',current.ugel],['I.E.',current.institucion],['Director(a)',current.director],['Nivel',current.nivel],['Área',current.area],['Grado y sección',[current.grado,current.seccion].filter(Boolean).join(' ')],['Docente',current.docente],['Practicante',current.practicante],['Fecha',current.fecha],['Duración',current.duracion_minutos+' minutos']].filter(x=>x[1]);
 const minutes=Number(current.duracion_minutos)||90,ini=Math.round(minutes*20/135),cie=Math.round(minutes*15/135);
 const editRow=(selector,values)=>Array.from(document.querySelectorAll(selector)).map((el,i)=>el.innerText?.trim()||str(values[i]));
 const curricularFallback=[result.competencia_sugerida,result.capacidad,result.desempeno,result.criterios_evaluacion,result.evidencia];
 const curricular=editRow('.curricular:first-of-type tbody td',curricularFallback);
 const bodyMoments=Array.from(document.querySelectorAll('.moments tbody tr')).map((tr,i)=>{
  const cells=tr.querySelectorAll('th,td');return [cells[0]?.innerText?.trim()||['INICIO','DESARROLLO','CIERRE'][i],cells[1]?.innerText?.trim()||str([result.inicio,result.desarrollo,result.cierre][i]),cells[2]?.innerText?.trim()||[ini,minutes-ini-cie,cie][i]+' min'];
 });
 const children=[
  new Paragraph({children:[new TextRun({text:'SESIÓN DE APRENDIZAJE N.° '+(current.numero_sesion||'01'),bold:true,size:27,font:'Arial'})],alignment:AlignmentType.CENTER,spacing:{after:130}}),
  new Paragraph({children:[new TextRun({text:getEditable(result.titulo,'[data-field="titulo"]'),bold:true,size:24,font:'Arial'})],alignment:AlignmentType.CENTER,spacing:{after:200}}),
  table(data,[.27,.73],false),
  heading('PROPÓSITOS DE APRENDIZAJE'),
  para(getEditable(result.proposito,'[data-field="proposito"]')),
  table([['Competencia','Capacidad','Desempeño precisado','Criterios de evaluación','Evidencias'],curricular.length===5?curricular:curricularFallback],[.19,.18,.24,.22,.17]),
  heading('COMPETENCIAS TRANSVERSALES'),
  table([['Competencia transversal','Desempeño'],[result.competencia_transversal,result.desempeno_transversal]],[.38,.62]),
  heading('ENFOQUE TRANSVERSAL'),
  table([['Enfoque transversal','Valores','Actitudes demostrables'],[result.enfoque_transversal,result.valores,result.actitudes_demostrables]],[.33,.22,.45]),
  heading('I. RECURSOS QUE UTILIZAR'),
  table([['¿Qué necesitamos hacer antes de la sesión?','¿Qué recursos o materiales se utilizarán?'],[result.preparacion_previa||'Seleccionar y preparar el ambiente de aprendizaje.',result.materiales]],[.5,.5]),
  heading('II. MOMENTOS PEDAGÓGICOS'),
  table([['Momentos pedagógicos','Procesos pedagógicos y actividades','Tiempo'],...bodyMoments],[.23,.65,.12]),
  heading('EXTENSIÓN Y EVALUACIÓN'),
  table([['Trabajo de extensión',result.trabajo_extension||'Practicar lo aprendido.'],['Instrumento de evaluación',result.instrumento_evaluacion||'Lista de cotejo']],[.32,.68],false),
  para(' '),para('______________________           ______________________           ______________________'),
  para('DOCENTE DE ÁREA                          DIRECTOR(A)                           PRACTICANTE'),
  new Paragraph({children:[new PageBreak()]}),
  heading('ANEXO 1. FICHA DE TRABAJO'),
  para(result.ficha_trabajo?.titulo||current.tema),
  para('Estudiante: ___________________________________   Grado y sección: __________'),
  para(getEditable(result.ficha_trabajo?.indicaciones,'[data-field="indicaciones"]'))
 ];
 document.querySelectorAll('#preguntas .question span').forEach((el,i)=>{children.push(para((i+1)+'. '+el.innerText),para('________________________________________________________________________'))});
 children.push(new Paragraph({children:[new PageBreak()]}),heading('ANEXO 2. FICHA DE OBSERVACIÓN / LISTA DE COTEJO'),para('Estudiante: ___________________________________   Fecha: ______________'));
 const criteria=Array.from(document.querySelectorAll('#preview table:last-of-type tbody tr td:first-child')).map(el=>el.innerText.trim());
 const obs=criteria.length?criteria:(Array.isArray(result.ficha_observacion)?result.ficha_observacion.map(str):[]);
 children.push(table([['Criterio observable','Sí','En proceso','No'],...obs.map(x=>[x,'☐','☐','☐'])],[.67,.11,.11,.11]));
 const doc=new Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:850,right:850,bottom:850,left:850}}},children}]});
 const blob=await Packer.toBlob(doc),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sesion-grafiplot-en-cuadros.docx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
if(db){db.auth.getSession().then(({data,error})=>{if(error)console.warn('Supabase Auth:',error.message);session=data?.session||null;if(session)editor();else login()}).catch(err=>{console.error(err);login()})}else login();
