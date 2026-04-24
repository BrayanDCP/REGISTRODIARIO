// ══════════════════════════════════════════
//  ROSSY — CAJA DIARIA | app.js
//  Versión con todas las funciones activas
// ══════════════════════════════════════════

// ── CREDENCIALES ──
const CRED = { user: 'rossy22', pass: 'registro22' };
const SESSION_KEY = 'rossy_sesion_v2';

// ── ESTADO GLOBAL ──
let ventas = [], gastos = [], ventaId = 0, gastoId = 0;
let movimientos = [], movId = 0;
let historialFiltrado = [];
let registroAEliminar = null;

// ── MENSAJES MOTIVADORES ──
const MOTIVADORES = [
  { emoji: '🌸', msg: '¡Tú haces que cada día valga!' },
  { emoji: '✨', msg: '¡Vas increíble, sigue así!' },
  { emoji: '💪', msg: 'Tu esfuerzo se nota, ¡qué crack eres!' },
  { emoji: '🌟', msg: '¡Cada venta es un logro tuyo!' },
  { emoji: '💐', msg: '¡Registrado! Nada se te escapa 😊' },
  { emoji: '🎀', msg: '¡Muy bien! Tú controlas todo.' },
  { emoji: '🌺', msg: '¡Así se hace! Todo ordenadito.' },
  { emoji: '💖', msg: '¡Tu trabajo importa mucho!' },
  { emoji: '🦋', msg: '¡Día a día construyes algo grande!' },
  { emoji: '⭐', msg: '¡Eres la mejor! Sigue brillando.' },
  { emoji: '🌷', msg: '¡Bien apuntado! Tú eres todo.' },
  { emoji: '🍀', msg: '¡Hoy también la estás rompiendo!' },
];

let motivIdx = Math.floor(Math.random() * MOTIVADORES.length);
let motivTimer = null;
let motivBarEl = null;

function mostrarMotivador() {
  if (motivBarEl) {
    motivBarEl.remove();
    clearTimeout(motivTimer);
  }
  const m = MOTIVADORES[motivIdx % MOTIVADORES.length];
  motivIdx++;
  motivBarEl = document.createElement('div');
  motivBarEl.className = 'motiv-bar';
  motivBarEl.innerHTML = `<span class="motiv-emoji">${m.emoji}</span><span>${m.msg}</span>`;
  document.body.appendChild(motivBarEl);
  motivTimer = setTimeout(() => {
    if (motivBarEl) { motivBarEl.classList.add('hide'); setTimeout(() => { if(motivBarEl){motivBarEl.remove();motivBarEl=null;} }, 400); }
  }, 2800);
}

// ══════════════════════════════════════════
//  STORAGE (Firebase o localStorage)
// ══════════════════════════════════════════
async function cargarRegistros() {
  if (window._fbCargar) return await window._fbCargar();
  try { return JSON.parse(localStorage.getItem('rossy_v4') || '[]'); } catch(e) { return []; }
}

async function guardarRegistros(lista) {
  if (window._fbGuardar) return await window._fbGuardar(lista);
  try { localStorage.setItem('rossy_v4', JSON.stringify(lista)); } catch(e) {}
}

// ══════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════
function checkSession() { return localStorage.getItem(SESSION_KEY) === '1'; }

function loginSubmit() {
  const u = document.getElementById('inp-usuario').value.trim();
  const p = document.getElementById('inp-pass').value;
  const err = document.getElementById('login-error');
  err.classList.remove('show');
  document.getElementById('inp-usuario').classList.remove('err');
  document.getElementById('inp-pass').classList.remove('err');
  if (u === CRED.user && p === CRED.pass) {
    document.getElementById('login-spinner').classList.add('show');
    document.getElementById('btn-login-text').textContent = 'Ingresando...';
    document.getElementById('btn-login-submit').disabled = true;
    localStorage.setItem(SESSION_KEY, '1');
    setTimeout(mostrarApp, 600);
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
  updateSyncUI();
  setTimeout(() => mostrarMotivador(), 600);
}

function updateSyncUI() {
  const activo = window._isFirebaseActivo && window._isFirebaseActivo();
  document.getElementById('sync-dot-nav').className = 'dot ' + (activo ? '' : 'off');
  document.getElementById('sync-txt-nav').textContent = activo ? 'en línea' : 'local';
  document.getElementById('sync-dot-login').className = 'sync-dot ' + (activo ? '' : 'off');
  document.getElementById('sync-label-login').textContent = activo
    ? 'Sincronización activa — todos los dispositivos'
    : 'Solo local — configura Firebase para multi-dispositivo';
}

window._showToast = function(msg) { toast(msg); };

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  ['inp-usuario','inp-pass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') loginSubmit(); });
  });
  document.getElementById('modal-input-confirm').addEventListener('keydown', e => { if (e.key === 'Enter') ejecutarEliminacion(); });
  if (checkSession()) mostrarApp();
  setTimeout(updateSyncUI, 500);
});

function initApp() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;
  document.getElementById('f-desde').value = hoy.substring(0,7) + '-01';
  document.getElementById('f-hasta').value = hoy;
  document.getElementById('r-desde').value = hoy.substring(0,7) + '-01';
  document.getElementById('r-hasta').value = hoy;
  ventas = []; gastos = []; ventaId = 0; gastoId = 0;
  movimientos = []; movId = 0;
  addVenta();
  renderMovimientos();
}

// ── TABS ──
function showTab(t, btn) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
  if (btn) btn.classList.add('active');
  if (t === 'historial') filtrarHistorial();
  if (t === 'resumen') calcResumen();
}

// ══════════════════════════════════════════
//  VENTAS
// ══════════════════════════════════════════
function addVenta() {
  ventaId++;
  ventas.push({ id: ventaId, detalle: '', precio: '', pago: 'efectivo' });
  renderVentas();
}

function removeVenta(id) {
  ventas = ventas.filter(v => v.id !== id);
  renderVentas(); recalc();
}

function ventaChange(id, campo, val) {
  const v = ventas.find(x => x.id === id);
  if (v) { v[campo] = val; recalc(); }
}

function setPago(id, tipo) {
  const v = ventas.find(x => x.id === id);
  if (!v) return;
  v.pago = tipo;
  // Actualizar botones
  const ef = document.getElementById('pago-ef-' + id);
  const yp = document.getElementById('pago-yp-' + id);
  const note = document.getElementById('yape-note-' + id);
  if (ef && yp) {
    ef.className = 'pago-btn' + (tipo === 'efectivo' ? ' activo-efectivo' : '');
    yp.className = 'pago-btn' + (tipo === 'yape' ? ' activo-yape' : '');
  }
  if (note) note.className = 'yape-note' + (tipo === 'yape' ? ' show' : '');
  recalc();
}

function renderVentas() {
  const el = document.getElementById('ventas-list');
  if (!ventas.length) { el.innerHTML = ''; return; }
  el.innerHTML = ventas.map((v, i) => `
    <div class="venta-item">
      <div class="venta-num">
        <span>Venta ${i + 1}</span>
        <button class="btn-del" onclick="removeVenta(${v.id})">×</button>
      </div>
      <div class="field" style="margin-bottom:0.5rem">
        <textarea placeholder="Descripción: cantidad, modelo, código..." rows="2"
          oninput="ventaChange(${v.id},'detalle',this.value)">${escHtml(v.detalle)}</textarea>
      </div>
      <div class="field" style="margin-bottom:0.5rem">
        <div class="precio-wrap">
          <span class="precio-prefix">S/</span>
          <input type="number" placeholder="Precio total" step="0.01" min="0" inputmode="decimal"
            value="${escHtml(v.precio)}" oninput="ventaChange(${v.id},'precio',this.value)">
        </div>
      </div>
      <div class="pago-selector">
        <button class="pago-btn${v.pago==='efectivo'?' activo-efectivo':''}" id="pago-ef-${v.id}" onclick="setPago(${v.id},'efectivo')">
          💵 Efectivo
        </button>
        <button class="pago-btn${v.pago==='yape'?' activo-yape':''}" id="pago-yp-${v.id}" onclick="setPago(${v.id},'yape')">
          📱 Yape
        </button>
      </div>
      <div class="yape-note${v.pago==='yape'?' show':''}" id="yape-note-${v.id}">
        Este pago va directo a la cuenta — no cuenta en tu efectivo en mano 💙
      </div>
    </div>`).join('');
  recalc();
}

// ══════════════════════════════════════════
//  GASTOS
// ══════════════════════════════════════════
function addGasto() {
  gastoId++;
  gastos.push({ id: gastoId, concepto: '', monto: '', tipo: 'efectivo' });
  renderGastos();
}

function removeGasto(id) {
  gastos = gastos.filter(g => g.id !== id);
  renderGastos(); recalc();
}

function gastoChange(id, campo, val) {
  const g = gastos.find(x => x.id === id);
  if (g) { g[campo] = val; recalc(); }
}

function renderGastos() {
  const el = document.getElementById('gastos-list');
  if (!gastos.length) { el.innerHTML = ''; return; }
  el.innerHTML = gastos.map(g => `
    <div class="gasto-item">
      <div class="gasto-concepto">
        <input type="text" placeholder="Concepto del gasto..."
          value="${escHtml(g.concepto)}" oninput="gastoChange(${g.id},'concepto',this.value)">
      </div>
      <div class="gasto-row2">
        <div class="precio-wrap">
          <span class="precio-prefix">S/</span>
          <input type="number" placeholder="Monto" step="0.01" min="0" inputmode="decimal"
            value="${escHtml(g.monto)}" oninput="gastoChange(${g.id},'monto',this.value)" style="padding-left:2.1rem">
        </div>
        <select onchange="gastoChange(${g.id},'tipo',this.value)">
          <option value="efectivo" ${g.tipo==='efectivo'?'selected':''}>💵 Efectivo</option>
          <option value="yape" ${g.tipo==='yape'?'selected':''}>📱 Yape</option>
          <option value="otro" ${g.tipo==='otro'?'selected':''}>🔹 Otro</option>
        </select>
        <button class="btn-del" onclick="removeGasto(${g.id})">×</button>
      </div>
    </div>`).join('');
  recalc();
}

// ══════════════════════════════════════════
//  MOVIMIENTOS DE INVENTARIO (Entrada/Salida)
// ══════════════════════════════════════════
let tipoMovActual = 'entrada'; // 'entrada' | 'salida'

function setTipoMov(tipo) {
  tipoMovActual = tipo;
  document.getElementById('mov-tab-entrada').className = 'mov-tab' + (tipo === 'entrada' ? ' activo-entrada' : '');
  document.getElementById('mov-tab-salida').className = 'mov-tab' + (tipo === 'salida' ? ' activo-salida' : '');
}

function addMovimiento() {
  movId++;
  movimientos.push({ id: movId, tipo: tipoMovActual, codigo: '', descripcion: '', cantidad: '' });
  renderMovimientos();
  mostrarMotivador();
}

function removeMovimiento(id) {
  movimientos = movimientos.filter(m => m.id !== id);
  renderMovimientos();
}

function movChange(id, campo, val) {
  const m = movimientos.find(x => x.id === id);
  if (m) m[campo] = val;
}

function renderMovimientos() {
  const el = document.getElementById('movimientos-list');
  if (!movimientos.length) { el.innerHTML = ''; return; }
  el.innerHTML = movimientos.map((m, i) => `
    <div class="mov-item">
      <div class="mov-item-head">
        <span>${m.tipo === 'entrada' ? '📥' : '📤'} Ítem ${i + 1}
          <span class="badge-${m.tipo==='entrada'?'entrada':'salida'}" style="margin-left:0.4rem">${m.tipo}</span>
        </span>
        <button class="btn-del" onclick="removeMovimiento(${m.id})">×</button>
      </div>
      <div class="mov-fields">
        <input class="mov-cod" type="text" placeholder="Cód." inputmode="numeric"
          value="${escHtml(m.codigo)}" oninput="movChange(${m.id},'codigo',this.value)"
          title="Código de la prenda, ej: 1365">
        <input class="mov-desc" type="text" placeholder="Descripción, ej: manga larga de conchita"
          value="${escHtml(m.descripcion)}" oninput="movChange(${m.id},'descripcion',this.value)">
        <input class="mov-cant" type="number" placeholder="Cant." inputmode="numeric" min="0"
          value="${escHtml(m.cantidad)}" oninput="movChange(${m.id},'cantidad',this.value)"
          title="Cantidad">
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════
//  RECALCULAR RESUMEN
// ══════════════════════════════════════════
function recalc() {
  const caja = parseFloat(document.getElementById('caja').value) || 0;
  const totalV = ventas.reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);
  const totalG = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
  const totalYape = ventas.filter(v => v.pago === 'yape').reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);
  const ventasEfectivo = totalV - totalYape;
  const saldo = caja + totalV - totalG;
  const efectivoEnMano = caja + ventasEfectivo - totalG;

  document.getElementById('r-caja').textContent = 'S/ ' + caja.toFixed(2);
  document.getElementById('r-ventas').textContent = 'S/ ' + totalV.toFixed(2);
  document.getElementById('r-gastos').textContent = 'S/ ' + totalG.toFixed(2);
  const sel = document.getElementById('r-saldo');
  sel.textContent = 'S/ ' + saldo.toFixed(2);
  sel.className = 'res-saldo-valor ' + (saldo >= 0 ? 'verde' : 'rojo');

  // Efectivo en mano
  const emEl = document.getElementById('r-efectivo-mano');
  if (emEl) emEl.textContent = 'S/ ' + efectivoEnMano.toFixed(2);
  const yapeEl = document.getElementById('r-yape-total');
  if (yapeEl) yapeEl.textContent = totalYape > 0 ? 'S/ ' + totalYape.toFixed(2) + ' →' : '—';
}

// ══════════════════════════════════════════
//  GUARDAR
// ══════════════════════════════════════════
async function guardar() {
  const fecha = document.getElementById('fecha').value;
  const caja = parseFloat(document.getElementById('caja').value) || 0;
  if (!fecha) { toast('Por favor ingresa la fecha'); return; }
  const ventasValidas = ventas.filter(v => v.detalle || v.precio);
  if (!ventasValidas.length) { toast('Agrega al menos una venta con datos'); return; }

  const btn = document.getElementById('btn-guardar');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  const totalV = ventas.reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);
  const totalG = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
  const totalYape = ventas.filter(v => v.pago === 'yape').reduce((s, v) => s + (parseFloat(v.precio) || 0), 0);
  const saldo = caja + totalV - totalG;
  const efectivoEnMano = caja + (totalV - totalYape) - totalG;

  const reg = {
    id: fecha, fecha, caja,
    ventas: ventas.map(v => ({...v})),
    gastos: gastos.map(g => ({...g})),
    movimientos: movimientos.map(m => ({...m})),
    totalVentas: totalV,
    totalGastos: totalG,
    totalYape,
    efectivoEnMano,
    saldo,
    ts: Date.now()
  };

  const lista = await cargarRegistros();
  const idx = lista.findIndex(r => r.fecha === fecha);
  if (idx >= 0) {
    if (!confirm('Ya existe un registro para este día. ¿Reemplazar?')) {
      btn.textContent = 'Guardar registro'; btn.disabled = false; return;
    }
    lista.splice(idx, 1, reg);
  } else { lista.push(reg); }
  lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  await guardarRegistros(lista);

  btn.textContent = 'Guardar registro'; btn.disabled = false;
  toast('✓ Registro guardado');
  mostrarMotivador();

  setTimeout(() => {
    ventas = []; gastos = []; ventaId = 0; gastoId = 0;
    movimientos = []; movId = 0;
    document.getElementById('caja').value = '';
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    renderVentas(); renderGastos(); renderMovimientos(); recalc(); addVenta();
  }, 500);
}

// ══════════════════════════════════════════
//  HISTORIAL
// ══════════════════════════════════════════
async function filtrarHistorial() {
  const desde = document.getElementById('f-desde').value;
  const hasta = document.getElementById('f-hasta').value;
  document.getElementById('historial-list').innerHTML =
    '<div class="loading-state"><div class="loading-spinner"></div><p style="font-size:0.82rem">Cargando...</p></div>';
  const lista = await cargarRegistros();
  historialFiltrado = lista.filter(r => {
    if (desde && r.fecha < desde) return false;
    if (hasta && r.fecha > hasta) return false;
    return true;
  });
  renderHistorial(historialFiltrado);
}

function renderHistorial(lista) {
  const el = document.getElementById('historial-list');
  if (!lista.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌸</div><p>Sin registros en este período</p></div>';
    return;
  }
  el.innerHTML = lista.map((r, idx) => {
    const tieneMovs = r.movimientos && r.movimientos.length > 0;
    const entradas = tieneMovs ? r.movimientos.filter(m => m.tipo === 'entrada') : [];
    const salidas = tieneMovs ? r.movimientos.filter(m => m.tipo === 'salida') : [];
    return `
    <div class="hist-item" id="hi-${idx}">
      <div class="hist-item-header" onclick="toggleDetail(${idx})">
        <div class="hist-fecha">${formatFecha(r.fecha)}</div>
        <div class="hist-meta">
          <span>Caja inicial: S/${(r.caja||0).toFixed(2)}</span>
          <span>${r.ventas.length} venta${r.ventas.length!==1?'s':''}</span>
          ${r.gastos.length?`<span>${r.gastos.length} gasto${r.gastos.length!==1?'s':''}</span>`:''}
          ${tieneMovs?`<span>${entradas.length} entrada${entradas.length!==1?'s':''}, ${salidas.length} salida${salidas.length!==1?'s':''}</span>`:''}
        </div>
        <div class="hist-saldo-row">
          <span class="hist-saldo-label">Saldo final</span>
          <span class="hist-saldo-val ${r.saldo>=0?'verde-t':'rojo-t'}">S/ ${(r.saldo||0).toFixed(2)}</span>
        </div>
        ${r.efectivoEnMano !== undefined ? `
        <div style="display:flex;justify-content:space-between;padding-top:0.3rem;font-size:0.77rem;color:var(--gris-texto)">
          <span>💵 Efectivo en mano</span>
          <span style="font-weight:600;color:#2e7d32">S/ ${(r.efectivoEnMano||0).toFixed(2)}</span>
        </div>` : ''}
      </div>
      <div class="hist-detail" id="hd-${idx}">
        <div class="det-title">Ventas</div>
        ${r.ventas.map((v, i) => `
          <div class="hist-venta-row">
            <span>${i+1}. ${escHtml(v.detalle)||'—'}</span>
            <div style="display:flex;align-items:center;gap:0.35rem;flex-shrink:0">
              ${v.pago==='yape'?'<span class="badge-tipo badge-yape">Yape</span>':'<span class="badge-tipo badge-efectivo">Efect.</span>'}
              <span style="font-weight:600;color:var(--marsala)">S/ ${(parseFloat(v.precio)||0).toFixed(2)}</span>
            </div>
          </div>`).join('')}
        <div class="hist-venta-row" style="font-weight:600;color:var(--marsala-2)">
          <span>Total ventas</span><span>S/ ${(r.totalVentas||0).toFixed(2)}</span>
        </div>
        ${r.totalYape ? `
        <div class="hist-venta-row" style="font-size:0.78rem;color:var(--gris-texto)">
          <span>📱 Yape (va a tu cuenta)</span><span style="color:var(--verde-yape,#0095c8)">S/ ${(r.totalYape||0).toFixed(2)}</span>
        </div>` : ''}
        ${r.gastos.length ? `
          <div class="det-title">Gastos</div>
          ${r.gastos.map(g => `
            <div class="hist-gasto-row">
              <span>${escHtml(g.concepto)||'—'}</span>
              <div style="display:flex;gap:0.35rem;align-items:center;flex-shrink:0">
                <span class="badge-tipo badge-${g.tipo}">${g.tipo}</span>
                <span>S/ ${(parseFloat(g.monto)||0).toFixed(2)}</span>
              </div>
            </div>`).join('')}
          <div class="hist-gasto-row" style="font-weight:600;margin-top:0.15rem">
            <span>Total gastos</span><span>S/ ${(r.totalGastos||0).toFixed(2)}</span>
          </div>` : ''}
        ${tieneMovs ? `
          <div class="det-title">Movimientos de inventario</div>
          ${r.movimientos.map(m => `
            <div class="hist-mov-row">
              <span>
                ${m.tipo==='entrada'?'📥':'📤'}
                ${m.codigo ? `<strong>[${escHtml(m.codigo)}]</strong> ` : ''}
                ${escHtml(m.descripcion)||'—'}
              </span>
              <span style="flex-shrink:0;font-weight:600">× ${escHtml(m.cantidad)||0}</span>
            </div>`).join('')}` : ''}
        <div class="btn-eliminar-reg">
          <button onclick="abrirModalEliminar('${r.fecha}','${escHtml(formatFecha(r.fecha))}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Eliminar registro
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleDetail(idx) {
  document.getElementById('hd-' + idx).classList.toggle('open');
  document.getElementById('hi-' + idx).classList.toggle('expanded');
}

// ── MODAL ELIMINAR ──
function abrirModalEliminar(fechaId, fechaTexto) {
  registroAEliminar = fechaId;
  document.getElementById('modal-desc').innerHTML =
    `Registro del <strong>${fechaTexto}</strong>.<br><br>Escribe <strong>CONFIRMAR</strong> para eliminar.`;
  const inp = document.getElementById('modal-input-confirm');
  inp.value = ''; inp.classList.remove('error');
  document.getElementById('btn-confirm-del').classList.remove('activo');
  document.getElementById('modal-eliminar').classList.add('open');
  setTimeout(() => inp.focus(), 150);
}

function cerrarModal() {
  document.getElementById('modal-eliminar').classList.remove('open');
  registroAEliminar = null;
}

function verificarConfirm(val) {
  document.getElementById('modal-input-confirm').classList.remove('error');
  document.getElementById('btn-confirm-del').classList.toggle('activo', val.trim().toUpperCase() === 'CONFIRMAR');
}

async function ejecutarEliminacion() {
  if (!registroAEliminar) return;
  const val = document.getElementById('modal-input-confirm').value.trim().toUpperCase();
  if (val !== 'CONFIRMAR') { document.getElementById('modal-input-confirm').classList.add('error'); return; }
  const btn = document.getElementById('btn-confirm-del');
  btn.textContent = 'Eliminando...'; btn.style.pointerEvents = 'none';
  const fechaAEliminar = registroAEliminar;
  cerrarModal();
  try {
    if (window._fbEliminar) {
      await window._fbEliminar(fechaAEliminar);
    } else {
      const lista = await cargarRegistros();
      await guardarRegistros(lista.filter(r => r.fecha !== fechaAEliminar));
    }
    toast('✓ Registro eliminado');
    await filtrarHistorial();
  } catch(e) {
    toast('Error al eliminar. Intenta de nuevo.');
  } finally {
    btn.textContent = 'Eliminar'; btn.style.pointerEvents = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const m = document.getElementById('modal-eliminar');
  if (m) m.addEventListener('click', function(e) { if (e.target === this) cerrarModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
});

// ── RESUMEN ──
async function calcResumen() {
  const desde = document.getElementById('r-desde').value;
  const hasta = document.getElementById('r-hasta').value;
  const lista = (await cargarRegistros()).filter(r => {
    if (desde && r.fecha < desde) return false;
    if (hasta && r.fecha > hasta) return false;
    return true;
  });
  const el = document.getElementById('stats-container');
  if (!lista.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌸</div><p>Sin registros en este período</p></div>';
    return;
  }
  const totalV = lista.reduce((s, r) => s + (r.totalVentas || 0), 0);
  const totalG = lista.reduce((s, r) => s + (r.totalGastos || 0), 0);
  const totalS = lista.reduce((s, r) => s + (r.saldo || 0), 0);
  const totalYape = lista.reduce((s, r) => s + (r.totalYape || 0), 0);
  const totalEfectivo = lista.reduce((s, r) => s + (r.efectivoEnMano || 0), 0);
  const promV = totalV / lista.length;
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Días registrados</div><div class="stat-val">${lista.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total ventas</div><div class="stat-val">S/${totalV.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Total gastos</div><div class="stat-val" style="color:var(--rosewater-2)">S/${totalG.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Saldo total</div><div class="stat-val" style="color:${totalS>=0?'var(--marsala)':'#c0392b'}">S/${totalS.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Promedio/día</div><div class="stat-val">S/${promV.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Mejor día</div><div class="stat-val">S/${Math.max(...lista.map(r=>r.totalVentas||0)).toFixed(2)}</div></div>
    </div>
    ${totalYape > 0 ? `
    <div class="card" style="margin-top:0;background:linear-gradient(135deg,#e3f2fd,#fff)">
      <div class="card-head" style="color:#0095c8">📱 Resumen Yape</div>
      <div style="display:flex;justify-content:space-between;font-size:0.88rem;padding:0.25rem 0">
        <span style="color:var(--gris-texto)">Total cobrado vía Yape (va a tu cuenta)</span>
        <span style="font-weight:700;color:#0095c8">S/${totalYape.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.88rem;padding:0.25rem 0">
        <span style="color:var(--gris-texto)">💵 Total efectivo en mano</span>
        <span style="font-weight:700;color:#2e7d32">S/${totalEfectivo.toFixed(2)}</span>
      </div>
    </div>` : ''}
    <div class="card" style="margin-top:0">
      <div class="card-head">Detalle por día</div>
      ${lista.map(r => `
        <div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px dashed var(--ivory-2);font-size:0.85rem;gap:0.5rem">
          <span style="color:var(--gris-texto);flex-shrink:0">${formatFechaCorta(r.fecha)}</span>
          <span>S/${(r.totalVentas||0).toFixed(2)}</span>
          <span style="color:${r.saldo>=0?'var(--marsala)':'#c0392b'};font-weight:600">Saldo S/${(r.saldo||0).toFixed(2)}</span>
        </div>`).join('')}
    </div>`;
}

// ── PDF ──
async function descargarPDF() {
  if (!historialFiltrado.length) { toast('No hay registros para exportar'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(); let y = 0; const M = 15, col = W - M * 2;
  const checkPage = n => { if (y + n > 275) { doc.addPage(); y = 15; } };

  doc.setFillColor(102, 56, 53); doc.rect(0, 0, W, 28, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(249, 225, 224);
  doc.text('ROSSY', W / 2, 13, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(222, 179, 173);
  doc.text('REGISTRO DE CAJA DIARIA', W / 2, 20, { align: 'center' });
  const desde = document.getElementById('f-desde').value, hasta = document.getElementById('f-hasta').value;
  doc.text(`Período: ${formatFechaCorta(desde)} al ${formatFechaCorta(hasta)}`, W / 2, 25.5, { align: 'center' });
  y = 36;

  const totalV = historialFiltrado.reduce((s, r) => s + (r.totalVentas || 0), 0);
  const totalG = historialFiltrado.reduce((s, r) => s + (r.totalGastos || 0), 0);
  const totalS = historialFiltrado.reduce((s, r) => s + (r.saldo || 0), 0);
  doc.setFillColor(245, 232, 232); doc.roundedRect(M, y, col, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(102, 56, 53);
  const cw = col / 3;
  doc.text('TOTAL VENTAS', M + cw * 0 + cw / 2, y + 6, { align: 'center' });
  doc.text('TOTAL GASTOS', M + cw * 1 + cw / 2, y + 6, { align: 'center' });
  doc.text('SALDO PERÍODO', M + cw * 2 + cw / 2, y + 6, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(77, 41, 38);
  doc.text('S/' + totalV.toFixed(2), M + cw * 0 + cw / 2, y + 14, { align: 'center' });
  doc.text('S/' + totalG.toFixed(2), M + cw * 1 + cw / 2, y + 14, { align: 'center' });
  doc.setTextColor(totalS >= 0 ? 27 : 180, totalS >= 0 ? 100 : 20, totalS >= 0 ? 50 : 20);
  doc.text('S/' + totalS.toFixed(2), M + cw * 2 + cw / 2, y + 14, { align: 'center' });
  y += 24;

  historialFiltrado.forEach(r => {
    checkPage(28);
    doc.setFillColor(125, 69, 66); doc.roundedRect(M, y, col, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(249, 225, 224);
    doc.text(formatFecha(r.fecha).toUpperCase(), M + 4, y + 6);
    doc.text('Caja: S/' + (r.caja || 0).toFixed(2), M + col - 35, y + 6);
    y += 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(122, 92, 90);
    doc.text('VENTAS', M + 2, y); y += 4;
    r.ventas.forEach((v, i) => {
      checkPage(7);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 40, 38);
      const det = v.detalle ? (v.detalle.length > 50 ? v.detalle.substring(0, 47) + '...' : v.detalle) : '—';
      const pago = v.pago === 'yape' ? ' [Yape]' : ' [Efect.]';
      doc.text(`${i + 1}. ${det}${pago}`, M + 4, y);
      doc.setFont('helvetica', 'bold'); doc.text('S/' + ((parseFloat(v.precio) || 0).toFixed(2)), W - M, y, { align: 'right' });
      y += 5.5;
    });
    doc.setDrawColor(222, 179, 173); doc.line(M + 4, y, W - M, y); y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(102, 56, 53);
    doc.text('Subtotal ventas:', M + 4, y); doc.text('S/' + (r.totalVentas || 0).toFixed(2), W - M, y, { align: 'right' }); y += 5.5;
    if (r.totalYape) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(0, 130, 200);
      doc.text('Yape (cuenta dueña): S/' + (r.totalYape || 0).toFixed(2), M + 4, y);
      doc.text('Efectivo en mano: S/' + (r.efectivoEnMano || 0).toFixed(2), W - M, y, { align: 'right' }); y += 5.5;
    }
    if (r.gastos.length) {
      checkPage(6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(122, 92, 90);
      doc.text('GASTOS', M + 2, y); y += 4;
      r.gastos.forEach(g => {
        checkPage(6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 60, 58);
        doc.text(`• ${g.concepto || '—'} [${g.tipo}]`, M + 4, y);
        doc.setFont('helvetica', 'bold'); doc.text('S/' + ((parseFloat(g.monto) || 0).toFixed(2)), W - M, y, { align: 'right' }); y += 5.5;
      });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(102, 56, 53);
      doc.text('Subtotal gastos:', M + 4, y); doc.text('S/' + (r.totalGastos || 0).toFixed(2), W - M, y, { align: 'right' }); y += 6;
    }
    if (r.movimientos && r.movimientos.length) {
      checkPage(8);
      // Título sección inventario
      doc.setFillColor(240, 245, 240);
      doc.roundedRect(M, y, col, 7, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(46, 125, 50);
      doc.text('MOVIMIENTO DE INVENTARIO', M + 4, y + 4.8);
      y += 10;

      // Entradas primero
      const entsPDF = r.movimientos.filter(m => m.tipo === 'entrada');
      const salsPDF = r.movimientos.filter(m => m.tipo === 'salida');

      if (entsPDF.length) {
        checkPage(6);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(46, 125, 50);
        doc.text('ENTRADAS', M + 4, y); y += 4;
        entsPDF.forEach(m => {
          checkPage(6);
          const cod = m.codigo ? '[' + String(m.codigo) + '] ' : '';
          const rawDesc = String(m.descripcion || '—');
          const maxLen = 52 - cod.length;
          const desc = rawDesc.length > maxLen ? rawDesc.substring(0, maxLen - 3) + '...' : rawDesc;
          const cant = 'x' + String(m.cantidad || 0);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(46, 125, 50);
          doc.text('+', M + 4, y);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 60, 40);
          doc.text(cod + desc, M + 9, y);
          doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50);
          doc.text(cant, W - M, y, { align: 'right' });
          y += 5.5;
        });
        y += 1;
      }

      if (salsPDF.length) {
        checkPage(6);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(230, 81, 0);
        doc.text('SALIDAS', M + 4, y); y += 4;
        salsPDF.forEach(m => {
          checkPage(6);
          const cod = m.codigo ? '[' + String(m.codigo) + '] ' : '';
          const rawDesc = String(m.descripcion || '—');
          const maxLen = 52 - cod.length;
          const desc = rawDesc.length > maxLen ? rawDesc.substring(0, maxLen - 3) + '...' : rawDesc;
          const cant = 'x' + String(m.cantidad || 0);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(230, 81, 0);
          doc.text('-', M + 4, y);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 40, 20);
          doc.text(cod + desc, M + 9, y);
          doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 81, 0);
          doc.text(cant, W - M, y, { align: 'right' });
          y += 5.5;
        });
        y += 1;
      }
    }
    checkPage(10);
    doc.setFillColor(r.saldo >= 0 ? 240 : 255, r.saldo >= 0 ? 248 : 235, r.saldo >= 0 ? 240 : 235);
    doc.roundedRect(M, y, col, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(r.saldo >= 0 ? 27 : 180, r.saldo >= 0 ? 100 : 20, r.saldo >= 0 ? 50 : 20);
    doc.text('SALDO FINAL: S/' + (r.saldo || 0).toFixed(2), W / 2, y + 5.5, { align: 'center' }); y += 12;
  });

  const tp = doc.internal.getNumberOfPages();
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 160, 158);
    doc.text(`ROSSY — Generado el ${new Date().toLocaleDateString('es-PE')} — Pág ${i}/${tp}`, W / 2, 291, { align: 'center' });
  }
  doc.save(`ROSSY_${desde}_${hasta}.pdf`);
  toast('✓ PDF descargado');
}

// ── HELPERS ──
function formatFecha(f) {
  if (!f) return '—';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatFechaCorta(f) {
  if (!f) return '—';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}