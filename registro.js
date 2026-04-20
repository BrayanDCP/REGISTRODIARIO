
// ══════════════════════════════════════════
//  CREDENCIALES
// ══════════════════════════════════════════
const CRED = { user: 'rossy22', pass: 'registro22' };
const SESSION_KEY = 'rossy_sesion_v1';

// ══════════════════════════════════════════
//  BACKEND: JSONBin.io
//  → Crea cuenta gratis en https://jsonbin.io
//  → Crea un Bin con contenido inicial: []
//  → Copia tu BIN_ID y API_KEY abajo
// ══════════════════════════════════════════
const JSONBIN_BIN_ID  = 'TU_BIN_ID_AQUI';
const JSONBIN_API_KEY = 'TU_API_KEY_AQUI';
const USE_CLOUD = JSONBIN_BIN_ID !== 'TU_BIN_ID_AQUI';
const LS_KEY = 'rossy_registros_v3';

// ── Estado global ──
let ventas = [], gastos = [], ventaId = 0, gastoId = 0;
let historialFiltrado = [];
let registroAEliminar = null; // fecha string, ID único real

// ══════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════
function checkSession() {
  return localStorage.getItem(SESSION_KEY) === '1';
}

function loginSubmit() {
  const u = document.getElementById('inp-usuario').value.trim();
  const p = document.getElementById('inp-pass').value;
  const err = document.getElementById('login-error');
  const spinner = document.getElementById('login-spinner');
  const btnText = document.getElementById('btn-login-text');
  const btn = document.getElementById('btn-login-submit');

  err.classList.remove('show');
  document.getElementById('inp-usuario').classList.remove('err');
  document.getElementById('inp-pass').classList.remove('err');

  if (u === CRED.user && p === CRED.pass) {
    spinner.classList.add('show');
    btnText.textContent = 'Ingresando...';
    btn.disabled = true;
    localStorage.setItem(SESSION_KEY, '1');
    setTimeout(mostrarApp, 650);
  } else {
    document.getElementById('inp-usuario').classList.add('err');
    document.getElementById('inp-pass').classList.add('err');
    err.classList.add('show');
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('screen-app').style.display = 'none';
  document.getElementById('screen-login').style.display = 'flex';
  document.getElementById('inp-usuario').value = '';
  document.getElementById('inp-pass').value = '';
  document.getElementById('btn-login-submit').disabled = false;
  document.getElementById('login-spinner').classList.remove('show');
  document.getElementById('btn-login-text').textContent = 'Ingresar';
}

function mostrarApp() {
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-app').style.display = 'block';
  initApp();
}

// ══════════════════════════════════════════
//  STORAGE
// ══════════════════════════════════════════
async function cargarRegistros() {
  if (USE_CLOUD) {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY, 'X-Bin-Meta': 'false' }
      });
      if (!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json();
      // JSONBin devuelve el record directamente cuando X-Bin-Meta: false
      const lista = Array.isArray(data) ? data : (Array.isArray(data.record) ? data.record : []);
      // Sincronizar caché local
      try { localStorage.setItem(LS_KEY, JSON.stringify(lista)); } catch(e) {}
      return lista;
    } catch(e) {
      console.warn('Cloud load failed, using local cache:', e);
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e2) { return []; }
    }
  }
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e) { return []; }
}

async function guardarRegistros(lista) {
  // Siempre guardar localmente primero
  try { localStorage.setItem(LS_KEY, JSON.stringify(lista)); } catch(e) {}

  if (USE_CLOUD) {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(lista)
      });
      if (!r.ok) throw new Error('HTTP '+r.status);
    } catch(e) {
      console.error('Cloud save failed:', e);
      toast('⚠️ Sin conexión. Guardado localmente.');
    }
  }
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Enter en campos de login
  ['inp-usuario','inp-pass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') loginSubmit();
    });
  });
  if (checkSession()) mostrarApp();
});

function initApp() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;
  document.getElementById('f-desde').value = hoy.substring(0,7) + '-01';
  document.getElementById('f-hasta').value = hoy;
  document.getElementById('r-desde').value = hoy.substring(0,7) + '-01';
  document.getElementById('r-hasta').value = hoy;
  ventas = []; gastos = []; ventaId = 0; gastoId = 0;
  addVenta();
}

// ── TABS ──
function showTab(t, btn) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  if (btn) btn.classList.add('active');
  if (t === 'historial') filtrarHistorial();
  if (t === 'resumen') calcResumen();
}

// ── VENTAS ──
function addVenta() { ventaId++; ventas.push({id:ventaId,detalle:'',precio:''}); renderVentas(); }
function removeVenta(id) { ventas=ventas.filter(v=>v.id!==id); renderVentas(); recalc(); }
function ventaChange(id, campo, val) { const v=ventas.find(x=>x.id===id); if(v) v[campo]=val; recalc(); }
function renderVentas() {
  const el = document.getElementById('ventas-list');
  if (!ventas.length) { el.innerHTML=''; return; }
  el.innerHTML = ventas.map((v,i) => `
    <div class="venta-item">
      <div class="venta-num">
        <span>Venta ${i+1}</span>
        <button class="btn-del" onclick="removeVenta(${v.id})">×</button>
      </div>
      <div class="field" style="margin-bottom:0.6rem">
        <textarea placeholder="Descripción: cantidad, modelo, código..." rows="2" oninput="ventaChange(${v.id},'detalle',this.value)">${escHtml(v.detalle)}</textarea>
      </div>
      <div class="field" style="margin-bottom:0">
        <div class="precio-wrap">
          <span class="precio-prefix">S/</span>
          <input type="number" placeholder="Precio total" step="0.01" min="0" value="${escHtml(v.precio)}" oninput="ventaChange(${v.id},'precio',this.value)">
        </div>
      </div>
    </div>`).join('');
  recalc();
}

// ── GASTOS ──
function addGasto() { gastoId++; gastos.push({id:gastoId,concepto:'',monto:'',tipo:'efectivo'}); renderGastos(); }
function removeGasto(id) { gastos=gastos.filter(g=>g.id!==id); renderGastos(); recalc(); }
function gastoChange(id, campo, val) { const g=gastos.find(x=>x.id===id); if(g) g[campo]=val; recalc(); }
function renderGastos() {
  const el = document.getElementById('gastos-list');
  if (!gastos.length) { el.innerHTML=''; return; }
  el.innerHTML = gastos.map(g => `
    <div class="gasto-item">
      <input type="text" placeholder="Concepto del gasto..." value="${escHtml(g.concepto)}" oninput="gastoChange(${g.id},'concepto',this.value)" style="flex:1 1 130px">
      <div class="precio-wrap g-monto" style="flex:0 0 105px;position:relative">
        <span class="precio-prefix">S/</span>
        <input type="number" placeholder="Monto" step="0.01" min="0" value="${escHtml(g.monto)}" oninput="gastoChange(${g.id},'monto',this.value)" style="padding-left:2.2rem">
      </div>
      <select onchange="gastoChange(${g.id},'tipo',this.value)" style="flex:0 0 105px;font-size:0.83rem;padding:0.6rem 0.6rem">
        <option value="efectivo" ${g.tipo==='efectivo'?'selected':''}>💵 Efectivo</option>
        <option value="yape" ${g.tipo==='yape'?'selected':''}>📱 Yape</option>
        <option value="otro" ${g.tipo==='otro'?'selected':''}>🔹 Otro</option>
      </select>
      <button class="btn-del" onclick="removeGasto(${g.id})">×</button>
    </div>`).join('');
  recalc();
}

// ── RECALCULAR ──
function recalc() {
  const caja = parseFloat(document.getElementById('caja').value)||0;
  const totalV = ventas.reduce((s,v)=>s+(parseFloat(v.precio)||0),0);
  const totalG = gastos.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
  const saldo = caja+totalV-totalG;
  document.getElementById('r-caja').textContent='S/ '+caja.toFixed(2);
  document.getElementById('r-ventas').textContent='S/ '+totalV.toFixed(2);
  document.getElementById('r-gastos').textContent='S/ '+totalG.toFixed(2);
  const sel=document.getElementById('r-saldo');
  sel.textContent='S/ '+saldo.toFixed(2);
  sel.className='res-saldo-valor '+(saldo>=0?'verde':'rojo');
}

// ── GUARDAR ──
async function guardar() {
  const fecha = document.getElementById('fecha').value;
  const caja = parseFloat(document.getElementById('caja').value)||0;
  if (!fecha) { toast('Por favor ingresa la fecha'); return; }
  const ventasValidas = ventas.filter(v=>v.detalle||v.precio);
  if (!ventasValidas.length) { toast('Agrega al menos una venta con datos'); return; }

  const btn = document.getElementById('btn-guardar');
  btn.textContent='Guardando...'; btn.disabled=true;

  const totalV=ventas.reduce((s,v)=>s+(parseFloat(v.precio)||0),0);
  const totalG=gastos.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
  const saldo=caja+totalV-totalG;

  // ID = fecha → único por día, sin conflictos numéricos en HTML
  const reg = { id:fecha, fecha, caja, ventas:ventas.map(v=>({...v})), gastos:gastos.map(g=>({...g})), totalVentas:totalV, totalGastos:totalG, saldo, ts:Date.now() };

  const lista = await cargarRegistros();
  const idx = lista.findIndex(r=>r.fecha===fecha);
  if (idx>=0) {
    if (!confirm('Ya existe un registro para este día. ¿Reemplazar?')) { btn.textContent='Guardar registro'; btn.disabled=false; return; }
    lista.splice(idx,1,reg);
  } else { lista.push(reg); }
  lista.sort((a,b)=>b.fecha.localeCompare(a.fecha));
  await guardarRegistros(lista);

  btn.textContent='Guardar registro'; btn.disabled=false;
  toast('✓ Registro guardado');
  setTimeout(()=>{
    ventas=[]; gastos=[]; ventaId=0; gastoId=0;
    document.getElementById('caja').value='';
    document.getElementById('fecha').value=new Date().toISOString().split('T')[0];
    renderVentas(); renderGastos(); recalc(); addVenta();
  }, 600);
}

// ── HISTORIAL ──
async function filtrarHistorial() {
  const desde=document.getElementById('f-desde').value;
  const hasta=document.getElementById('f-hasta').value;
  document.getElementById('historial-list').innerHTML='<div class="loading-state"><div class="loading-spinner"></div><p style="font-size:0.85rem">Cargando...</p></div>';
  const lista = await cargarRegistros();
  historialFiltrado = lista.filter(r=>{
    if (desde && r.fecha<desde) return false;
    if (hasta && r.fecha>hasta) return false;
    return true;
  });
  renderHistorial(historialFiltrado);
}

function renderHistorial(lista) {
  const el=document.getElementById('historial-list');
  if (!lista.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">🌸</div><p>Sin registros en este período</p></div>'; return; }
  // Usamos idx solo para IDs de DOM; para eliminar siempre usamos r.fecha
  el.innerHTML = lista.map((r,idx) => `
    <div class="hist-item" id="hi-${idx}">
      <div class="hist-item-header" onclick="toggleDetail(${idx})">
        <div class="hist-fecha">${formatFecha(r.fecha)}</div>
        <div class="hist-meta">
          <span>Caja: S/${(r.caja||0).toFixed(2)}</span>
          <span>${r.ventas.length} venta${r.ventas.length!==1?'s':''}</span>
          ${r.gastos.length?`<span>${r.gastos.length} gasto${r.gastos.length!==1?'s':''}</span>`:''}
        </div>
        <div class="hist-saldo-row">
          <span class="hist-saldo-label">Saldo final</span>
          <span class="hist-saldo-val ${r.saldo>=0?'verde-t':'rojo-t'}">S/ ${(r.saldo||0).toFixed(2)}</span>
        </div>
      </div>
      <div class="hist-detail" id="hd-${idx}">
        <div class="det-title">Ventas</div>
        ${r.ventas.map((v,i)=>`
          <div class="hist-venta-row">
            <span>${i+1}. ${escHtml(v.detalle)||'—'}</span>
            <span style="font-weight:600;color:var(--marsala);flex-shrink:0;margin-left:0.5rem">S/ ${(parseFloat(v.precio)||0).toFixed(2)}</span>
          </div>`).join('')}
        <div class="hist-venta-row" style="font-weight:600;color:var(--marsala-2)">
          <span>Total ventas</span><span>S/ ${(r.totalVentas||0).toFixed(2)}</span>
        </div>
        ${r.gastos.length?`
          <div class="det-title">Gastos</div>
          ${r.gastos.map(g=>`
            <div class="hist-gasto-row">
              <span>${escHtml(g.concepto)||'—'}</span>
              <div style="display:flex;gap:0.4rem;align-items:center;flex-shrink:0">
                <span class="badge-tipo badge-${g.tipo}">${g.tipo}</span>
                <span>S/ ${(parseFloat(g.monto)||0).toFixed(2)}</span>
              </div>
            </div>`).join('')}
          <div class="hist-gasto-row" style="font-weight:600;color:#7a5c5a;margin-top:0.2rem">
            <span>Total gastos</span><span>S/ ${(r.totalGastos||0).toFixed(2)}</span>
          </div>` : ''}
        <div class="btn-eliminar-reg">
          <button onclick="abrirModalEliminar('${r.fecha}', '${escHtml(formatFecha(r.fecha))}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Eliminar registro
          </button>
        </div>
      </div>
    </div>`).join('');
}

function toggleDetail(idx) {
  document.getElementById('hd-'+idx).classList.toggle('open');
  document.getElementById('hi-'+idx).classList.toggle('expanded');
}

// ── MODAL ELIMINAR ──
function abrirModalEliminar(fechaId, fechaTexto) {
  registroAEliminar = fechaId;
  document.getElementById('modal-desc').innerHTML =
    `Estás por eliminar el registro del<br><strong>${fechaTexto}</strong>.<br><br>Para confirmar, escribe <strong>CONFIRMAR</strong> abajo.`;
  const inp = document.getElementById('modal-input-confirm');
  inp.value=''; inp.classList.remove('error');
  document.getElementById('btn-confirm-del').classList.remove('activo');
  document.getElementById('modal-eliminar').classList.add('open');
  setTimeout(()=>inp.focus(),150);
}

function cerrarModal() {
  document.getElementById('modal-eliminar').classList.remove('open');
  registroAEliminar=null;
}

function verificarConfirm(val) {
  document.getElementById('modal-input-confirm').classList.remove('error');
  const ok = val.trim().toUpperCase()==='CONFIRMAR';
  document.getElementById('btn-confirm-del').classList.toggle('activo',ok);
}

async function ejecutarEliminacion() {
  if (!registroAEliminar) return;
  const val = document.getElementById('modal-input-confirm').value.trim().toUpperCase();
  if (val !== 'CONFIRMAR') { document.getElementById('modal-input-confirm').classList.add('error'); return; }

  const btn = document.getElementById('btn-confirm-del');
  btn.textContent='Eliminando...'; btn.style.pointerEvents='none';

  const fechaAEliminar = registroAEliminar;
  cerrarModal();

  try {
    const lista = await cargarRegistros();
    const nueva = lista.filter(r => r.fecha !== fechaAEliminar);
    await guardarRegistros(nueva);
    toast('✓ Registro eliminado');
    await filtrarHistorial();
  } catch(e) {
    toast('Error al eliminar. Intenta de nuevo.');
  } finally {
    btn.textContent='Eliminar'; btn.style.pointerEvents='';
  }
}

document.getElementById('modal-eliminar').addEventListener('click', function(e){ if(e.target===this) cerrarModal(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') cerrarModal(); });

// ── RESUMEN ──
async function calcResumen() {
  const desde=document.getElementById('r-desde').value;
  const hasta=document.getElementById('r-hasta').value;
  const lista=(await cargarRegistros()).filter(r=>{
    if(desde&&r.fecha<desde) return false;
    if(hasta&&r.fecha>hasta) return false;
    return true;
  });
  const el=document.getElementById('stats-container');
  if (!lista.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">🌸</div><p>Sin registros en este período</p></div>'; return; }
  const totalV=lista.reduce((s,r)=>s+(r.totalVentas||0),0);
  const totalG=lista.reduce((s,r)=>s+(r.totalGastos||0),0);
  const totalS=lista.reduce((s,r)=>s+(r.saldo||0),0);
  const promV=totalV/lista.length;
  el.innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Días registrados</div><div class="stat-val">${lista.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total ventas</div><div class="stat-val">S/${totalV.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Total gastos</div><div class="stat-val" style="color:var(--rosewater-2)">S/${totalG.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Saldo total</div><div class="stat-val" style="color:${totalS>=0?'var(--marsala)':'#c0392b'}">S/${totalS.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Promedio/día</div><div class="stat-val">S/${promV.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Mejor día</div><div class="stat-val">S/${Math.max(...lista.map(r=>r.totalVentas||0)).toFixed(2)}</div></div>
    </div>
    <div class="card" style="margin-top:0">
      <div class="card-head">Detalle por día</div>
      ${lista.map(r=>`
        <div style="display:flex;justify-content:space-between;padding:0.45rem 0;border-bottom:1px dashed var(--ivory-2);font-size:0.88rem">
          <span style="color:var(--gris-texto)">${formatFechaCorta(r.fecha)}</span>
          <span>Ventas: <b>S/${(r.totalVentas||0).toFixed(2)}</b></span>
          <span style="color:${r.saldo>=0?'var(--marsala)':'#c0392b'};font-weight:600">Saldo S/${(r.saldo||0).toFixed(2)}</span>
        </div>`).join('')}
    </div>`;
}

// ── PDF ──
async function descargarPDF() {
  if (!historialFiltrado.length) { toast('No hay registros para exportar'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth(); let y=0; const M=15,col=W-M*2;
  const checkPage=n=>{ if(y+n>275){doc.addPage();y=15;} };

  doc.setFillColor(102,56,53); doc.rect(0,0,W,28,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(249,225,224);
  doc.text('ROSSY',W/2,13,{align:'center'});
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(222,179,173);
  doc.text('REGISTRO DE CAJA DIARIA',W/2,20,{align:'center'});
  const desde=document.getElementById('f-desde').value, hasta=document.getElementById('f-hasta').value;
  doc.text(`Período: ${formatFechaCorta(desde)} al ${formatFechaCorta(hasta)}`,W/2,25.5,{align:'center'});
  y=36;

  const totalV=historialFiltrado.reduce((s,r)=>s+(r.totalVentas||0),0);
  const totalG=historialFiltrado.reduce((s,r)=>s+(r.totalGastos||0),0);
  const totalS=historialFiltrado.reduce((s,r)=>s+(r.saldo||0),0);
  doc.setFillColor(245,232,232); doc.roundedRect(M,y,col,18,3,3,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(102,56,53);
  const cw=col/3;
  doc.text('TOTAL VENTAS',M+cw*0+cw/2,y+6,{align:'center'});
  doc.text('TOTAL GASTOS',M+cw*1+cw/2,y+6,{align:'center'});
  doc.text('SALDO PERÍODO',M+cw*2+cw/2,y+6,{align:'center'});
  doc.setFontSize(11); doc.setTextColor(77,41,38);
  doc.text('S/'+totalV.toFixed(2),M+cw*0+cw/2,y+14,{align:'center'});
  doc.text('S/'+totalG.toFixed(2),M+cw*1+cw/2,y+14,{align:'center'});
  doc.setTextColor(totalS>=0?27:180,totalS>=0?100:20,totalS>=0?50:20);
  doc.text('S/'+totalS.toFixed(2),M+cw*2+cw/2,y+14,{align:'center'});
  y+=24;

  historialFiltrado.forEach(r=>{
    checkPage(28);
    doc.setFillColor(125,69,66); doc.roundedRect(M,y,col,9,2,2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(249,225,224);
    doc.text(formatFecha(r.fecha).toUpperCase(),M+4,y+6);
    doc.text('Caja: S/'+(r.caja||0).toFixed(2),M+col-35,y+6);
    y+=12;
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(122,92,90);
    doc.text('VENTAS',M+2,y); y+=4;
    r.ventas.forEach((v,i)=>{
      checkPage(7);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(60,40,38);
      const det=v.detalle?(v.detalle.length>55?v.detalle.substring(0,52)+'...':v.detalle):'—';
      doc.text(`${i+1}. ${det}`,M+4,y);
      doc.setFont('helvetica','bold'); doc.text('S/'+((parseFloat(v.precio)||0).toFixed(2)),W-M,y,{align:'right'});
      y+=5.5;
    });
    doc.setDrawColor(222,179,173); doc.line(M+4,y,W-M,y); y+=3;
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(102,56,53);
    doc.text('Subtotal ventas:',M+4,y); doc.text('S/'+(r.totalVentas||0).toFixed(2),W-M,y,{align:'right'}); y+=6;
    if (r.gastos.length) {
      checkPage(6);
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(122,92,90);
      doc.text('GASTOS',M+2,y); y+=4;
      r.gastos.forEach(g=>{
        checkPage(6);
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(80,60,58);
        doc.text(`• ${g.concepto||'—'} [${g.tipo}]`,M+4,y);
        doc.setFont('helvetica','bold'); doc.text('S/'+((parseFloat(g.monto)||0).toFixed(2)),W-M,y,{align:'right'}); y+=5.5;
      });
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(102,56,53);
      doc.text('Subtotal gastos:',M+4,y); doc.text('S/'+(r.totalGastos||0).toFixed(2),W-M,y,{align:'right'}); y+=6;
    }
    checkPage(10);
    doc.setFillColor(r.saldo>=0?240:255,r.saldo>=0?248:235,r.saldo>=0?240:235);
    doc.roundedRect(M,y,col,8,2,2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setTextColor(r.saldo>=0?27:180,r.saldo>=0?100:20,r.saldo>=0?50:20);
    doc.text('SALDO FINAL: S/'+(r.saldo||0).toFixed(2),W/2,y+5.5,{align:'center'}); y+=12;
  });

  const tp=doc.internal.getNumberOfPages();
  for(let i=1;i<=tp;i++){
    doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(180,160,158);
    doc.text(`ROSSY — Generado el ${new Date().toLocaleDateString('es-PE')} — Pág ${i}/${tp}`,W/2,291,{align:'center'});
  }
  doc.save(`ROSSY_${desde}_${hasta}.pdf`);
  toast('✓ PDF descargado');
}

// ── HELPERS ──
function formatFecha(f){if(!f)return'—';const d=new Date(f+'T12:00:00');return d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function formatFechaCorta(f){if(!f)return'—';const d=new Date(f+'T12:00:00');return d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
