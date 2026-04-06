/* ═══════════════════════════════════════
   CALCULADORA DE RESCISÃO CLT — 2026
   Tabelas INSS/IRRF vigentes a partir de jan/2026
   ═══════════════════════════════════════ */

/* ─── TABELAS 2026 ────────────────────── */

const SALARIO_MINIMO = 1621.00;

// INSS 2026 — progressivo por faixa
const INSS_FAIXAS = [
    { limite: 1621.00, aliquota: 0.075 },
    { limite: 2902.84, aliquota: 0.09 },
    { limite: 4354.27, aliquota: 0.12 },
    { limite: 8475.55, aliquota: 0.14 },
];

// IRRF 2026 — tabela mensal
const IRRF_FAIXAS = [
    { limite: 2428.80, aliquota: 0,     deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { limite: 3751.05, aliquota: 0.15,  deducao: 394.16 },
    { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { limite: Infinity, aliquota: 0.275, deducao: 908.73 },
];

const DEDUCAO_DEPENDENTE = 189.59;
const DESCONTO_SIMPLIFICADO = 607.20;
const IRRF_REDUTOR_LIMITE_INF = 5000;
const IRRF_REDUTOR_LIMITE_SUP = 7350;
const IRRF_REDUTOR_A = 978.62;
const IRRF_REDUTOR_B = 0.133145;

/* ─── CÁLCULO INSS (progressivo por faixa) ── */

function calcINSS(salario) {
    let total = 0, anterior = 0;
    for (const faixa of INSS_FAIXAS) {
        if (salario <= anterior) break;
        total += (Math.min(salario, faixa.limite) - anterior) * faixa.aliquota;
        anterior = faixa.limite;
    }
    return Math.round(total * 100) / 100;
}

/* ─── CÁLCULO IRRF ────────────────────── */

function calcIRRF(salarioBruto, inss, dependentes = 0) {
    const deducaoDep = dependentes * DEDUCAO_DEPENDENTE;
    const deducaoLegal = inss + deducaoDep;
    const desconto = Math.max(deducaoLegal, DESCONTO_SIMPLIFICADO);
    const base = Math.max(salarioBruto - desconto, 0);

    let irrf = 0;
    for (const faixa of IRRF_FAIXAS) {
        if (base <= faixa.limite) { irrf = base * faixa.aliquota - faixa.deducao; break; }
    }
    irrf = Math.max(irrf, 0);

    // Redutor para rendas entre R$ 5.000 e R$ 7.350
    if (salarioBruto <= IRRF_REDUTOR_LIMITE_INF) {
        irrf = 0;
    } else if (salarioBruto <= IRRF_REDUTOR_LIMITE_SUP) {
        irrf = Math.max(irrf - Math.max(IRRF_REDUTOR_A - IRRF_REDUTOR_B * salarioBruto, 0), 0);
    }
    return Math.round(irrf * 100) / 100;
}

/* ─── UTILITÁRIOS ─────────────────────── */

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }

function anosCompletos(adm, dem) {
    let a = dem.getFullYear() - adm.getFullYear();
    if (dem.getMonth() < adm.getMonth() || (dem.getMonth() === adm.getMonth() && dem.getDate() < adm.getDate())) a--;
    return Math.max(a, 0);
}

function diffMeses(d1, d2) {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function formatBRL(v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

// Conta avos (meses com >= 15 dias trabalhados) entre duas datas
function contarAvos(inicio, fim) {
    if (fim <= inicio) return 0;
    let avos = 0;
    const d = new Date(inicio);
    while (d < fim) {
        const proxMes = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const diasNoMes = Math.min(Math.ceil((fim - d) / 86400000), Math.ceil((proxMes - d) / 86400000));
        if (diasNoMes >= 15) avos++;
        d.setMonth(d.getMonth() + 1);
    }
    return avos;
}

/* ─── MOTOR DE CÁLCULO ───────────────── */

function calcularRescisao(params) {
    const { salario, admissao, demissao, tipo, avisoTipo, saldoFGTS, feriasVencidas, dependentes } = params;

    const verbas = [];
    const descontos = [];
    const anos = anosCompletos(admissao, demissao);
    const diaria = salario / 30; // CLT: sempre /30

    // ═══ AVISO PRÉVIO ═══
    const diasAviso = Math.min(30 + anos * 3, 90);
    const temAviso = tipo === 'sem_justa_causa' || tipo === 'pedido_demissao' || tipo === 'acordo_mutuo';
    let avisoValor = 0;
    let dataProjetada = new Date(demissao); // data fim considerando projeção do aviso

    if (temAviso && (avisoTipo === 'indenizado' || avisoTipo === 'trabalhado')) {
        dataProjetada = addDays(demissao, diasAviso);
    }

    if (temAviso && avisoTipo === 'indenizado') {
        if (tipo === 'acordo_mutuo') {
            avisoValor = diaria * diasAviso * 0.5;
            verbas.push({ label: 'Aviso previo indenizado (50%)', detail: `${diasAviso} dias x 50%`, valor: avisoValor });
        } else {
            avisoValor = diaria * diasAviso;
            verbas.push({ label: 'Aviso previo indenizado', detail: `${diasAviso} dias (Lei 12.506/2011)`, valor: avisoValor });
        }
    }

    // ═══ SALDO DE SALÁRIO ═══
    const diasTrab = demissao.getDate(); // dias trabalhados no mês da demissão
    const saldoSalario = diaria * diasTrab;
    verbas.push({ label: 'Saldo de salario', detail: `${diasTrab}/30 dias`, valor: saldoSalario });

    // ═══ 13º SALÁRIO ═══
    if (tipo !== 'justa_causa') {
        // 13º proporcional: meses do ano até a demissão (>=15 dias no mês)
        const inicioAno = new Date(demissao.getFullYear(), 0, 1);
        const avos13prop = contarAvos(inicioAno, demissao);

        if (avos13prop > 0) {
            const val13p = (salario / 12) * avos13prop;
            verbas.push({ label: '13o salario proporcional', detail: `${avos13prop}/12 avos`, valor: val13p });
        }

        // 13º indenizado: meses adicionais do período do aviso
        if (temAviso && avisoTipo === 'indenizado' && dataProjetada > demissao) {
            const avos13total = contarAvos(inicioAno, dataProjetada);
            const avos13ind = Math.max(avos13total - avos13prop, 0);
            if (avos13ind > 0) {
                const val13i = (salario / 12) * avos13ind;
                verbas.push({ label: '13o indenizado (aviso)', detail: `${avos13ind}/12 avos`, valor: val13i });
            }
        }
    }

    // ═══ FÉRIAS ═══

    // Férias vencidas
    if (feriasVencidas > 0) {
        for (let i = 0; i < feriasVencidas; i++) {
            verbas.push({ label: `Ferias vencidas${feriasVencidas > 1 ? ` (${i + 1}o periodo)` : ''}`, detail: '30 dias', valor: salario });
            verbas.push({ label: `1/3 sobre ferias vencidas${feriasVencidas > 1 ? ` (${i + 1}o)` : ''}`, detail: '', valor: salario / 3 });
        }
    }

    // Férias proporcionais: meses desde último aniversário até demissão
    if (tipo !== 'justa_causa') {
        // Último aniversário do contrato antes da demissão
        let ultAniv = new Date(demissao.getFullYear(), admissao.getMonth(), admissao.getDate());
        if (ultAniv > demissao) ultAniv.setFullYear(ultAniv.getFullYear() - 1);

        const avosFerProp = contarAvos(ultAniv, demissao);
        if (avosFerProp > 0) {
            const ferProp = (salario / 12) * avosFerProp;
            verbas.push({ label: 'Ferias proporcionais', detail: `${avosFerProp}/12 avos`, valor: ferProp });
            verbas.push({ label: '1/3 sobre ferias proporcionais', detail: '', valor: ferProp / 3 });
        }

        // Férias indenizadas: meses adicionais do aviso
        if (temAviso && avisoTipo === 'indenizado' && dataProjetada > demissao) {
            const avosFerTotal = contarAvos(ultAniv, dataProjetada);
            const avosFerInd = Math.max(avosFerTotal - avosFerProp, 0);
            if (avosFerInd > 0) {
                const ferInd = (salario / 12) * avosFerInd;
                verbas.push({ label: 'Ferias indenizadas (aviso)', detail: `${avosFerInd}/12 avos`, valor: ferInd });
                verbas.push({ label: '1/3 sobre ferias indenizadas', detail: '', valor: ferInd / 3 });
            }
        }
    }

    // ═══ DESCONTOS ═══

    // INSS sobre salários (saldo + aviso prévio juntos)
    const baseSalarios = saldoSalario + avisoValor;
    const inssSaldo = calcINSS(saldoSalario);
    const inssSalarios = calcINSS(baseSalarios);
    const inssAviso = inssSalarios - inssSaldo;

    descontos.push({ label: 'INSS sobre saldo de salario', detail: '', valor: inssSaldo });
    if (avisoValor > 0) {
        descontos.push({ label: 'INSS sobre aviso previo', detail: '', valor: inssAviso });
    }

    // IRRF sobre salários (base = saldo - INSS saldo)
    // Férias rescisórias e aviso indenizado são ISENTOS de IRRF
    const irrfSalario = calcIRRF(saldoSalario, inssSaldo, dependentes);
    if (irrfSalario > 0) {
        descontos.push({ label: 'IRRF sobre salarios', detail: `Base: ${formatBRL(saldoSalario)} - ${formatBRL(inssSaldo)}`, valor: irrfSalario });
    }

    // INSS e IRRF sobre 13º (tributação exclusiva na fonte)
    if (tipo !== 'justa_causa') {
        const inicioAno = new Date(demissao.getFullYear(), 0, 1);
        const avos13prop = contarAvos(inicioAno, demissao);
        const val13p = (salario / 12) * avos13prop;
        if (val13p > 0) {
            const inss13 = calcINSS(val13p);
            descontos.push({ label: 'INSS sobre 13o', detail: '', valor: inss13 });
            const irrf13 = calcIRRF(val13p, inss13, dependentes);
            if (irrf13 > 0) {
                descontos.push({ label: 'IRRF sobre 13o', detail: 'Tributacao exclusiva', valor: irrf13 });
            }
        }
    }

    // Férias: ISENTAS de INSS e IRRF na rescisão

    // ═══ TOTAIS ═══
    const totalVerbas = verbas.reduce((s, v) => s + v.valor, 0);
    const totalDescontos = descontos.reduce((s, v) => s + v.valor, 0);
    const totalLiquido = totalVerbas - totalDescontos;

    // ═══ FGTS ═══
    let multaFGTS = 0, fgtsSaque = false, fgtsTotal = 0;
    if (tipo === 'sem_justa_causa') {
        multaFGTS = saldoFGTS * 0.40; fgtsSaque = true;
        fgtsTotal = saldoFGTS + multaFGTS;
    } else if (tipo === 'acordo_mutuo') {
        multaFGTS = saldoFGTS * 0.20; fgtsSaque = true;
        fgtsTotal = saldoFGTS * 0.8 + multaFGTS;
    } else if (tipo === 'prazo_determinado') {
        fgtsSaque = true; fgtsTotal = saldoFGTS;
    }

    return {
        tipo, salario, admissao, demissao, dataProjetada, diasAviso,
        anos, meses: diffMeses(admissao, demissao),
        verbas, descontos,
        totalVerbas, totalDescontos, totalLiquido,
        fgts: { saldo: saldoFGTS, multa: multaFGTS, saque: fgtsSaque, total: fgtsTotal },
    };
}

/* ─── RENDERIZAÇÃO ────────────────────── */

const TIPO_LABELS = {
    sem_justa_causa: 'Demissao sem justa causa',
    pedido_demissao: 'Pedido de demissao',
    acordo_mutuo: 'Acordo mutuo (Art. 484-A)',
    justa_causa: 'Demissao por justa causa',
    prazo_determinado: 'Termino de contrato',
};

function renderResultado(r) {
    const area = document.getElementById('resultArea');
    const t = r.meses;
    const mesesLabel = t >= 12
        ? `${Math.floor(t / 12)} ano${Math.floor(t / 12) > 1 ? 's' : ''} e ${t % 12} mes${t % 12 !== 1 ? 'es' : ''}`
        : `${t} mes${t !== 1 ? 'es' : ''}`;

    const fmtData = d => d.toLocaleDateString('pt-BR');

    area.innerHTML = `
        <div class="result-header">
            <span class="result-tipo">${TIPO_LABELS[r.tipo]}</span>
            <span class="result-periodo">${mesesLabel}</span>
        </div>

        <div class="info-row">
            <div class="info-box-sm">
                <div class="info-box-label">Salario base</div>
                <div class="info-box-value">${formatBRL(r.salario)}</div>
            </div>
            <div class="info-box-sm">
                <div class="info-box-label">Aviso previo</div>
                <div class="info-box-value">${r.diasAviso} dias</div>
            </div>
            <div class="info-box-sm">
                <div class="info-box-label">Data projetada</div>
                <div class="info-box-value" style="font-size:.82rem">${fmtData(r.dataProjetada)}</div>
            </div>
        </div>

        <div class="result-total-card">
            <div class="result-total-label">Total liquido da rescisao</div>
            <div class="result-total-value">${formatBRL(r.totalLiquido)}</div>
        </div>

        <div class="result-grid">
            <div class="verbas-section">
                <div class="verbas-title">Verbas Rescisorias</div>
                ${r.verbas.map(v => `
                    <div class="verba-row">
                        <div><div class="verba-label">${v.label}</div>${v.detail ? `<div class="verba-detail">${v.detail}</div>` : ''}</div>
                        <div class="verba-valor positivo">${formatBRL(v.valor)}</div>
                    </div>
                `).join('')}
                <div class="verba-row total">
                    <div class="verba-label">Total de vencimentos</div>
                    <div class="verba-valor positivo">${formatBRL(r.totalVerbas)}</div>
                </div>
            </div>

            <div class="verbas-section">
                <div class="verbas-title">Descontos</div>
                ${r.descontos.map(v => `
                    <div class="verba-row">
                        <div><div class="verba-label">${v.label}</div>${v.detail ? `<div class="verba-detail">${v.detail}</div>` : ''}</div>
                        <div class="verba-valor negativo">${formatBRL(v.valor)}</div>
                    </div>
                `).join('')}
                ${r.descontos.length === 0 ? '<div class="verba-row"><div class="verba-label">Nenhum desconto</div><div class="verba-valor neutro">R$ 0,00</div></div>' : ''}
                <div class="verba-row total">
                    <div class="verba-label">Total de descontos</div>
                    <div class="verba-valor negativo">${formatBRL(r.totalDescontos)}</div>
                </div>
            </div>
        </div>

        ${r.fgts.saldo > 0 ? `
        <div class="verbas-section">
            <div class="verbas-title">FGTS (pago via Caixa Economica)</div>
            <div class="verba-row">
                <div class="verba-label">Saldo FGTS informado</div>
                <div class="verba-valor neutro">${formatBRL(r.fgts.saldo)}</div>
            </div>
            ${r.fgts.multa > 0 ? `
            <div class="verba-row">
                <div><div class="verba-label">Multa rescisoria</div><div class="verba-detail">${r.tipo === 'acordo_mutuo' ? '20% (acordo mutuo)' : '40%'}</div></div>
                <div class="verba-valor positivo">${formatBRL(r.fgts.multa)}</div>
            </div>` : ''}
            <div class="verba-row">
                <div class="verba-label">Direito a saque</div>
                <div class="verba-valor ${r.fgts.saque ? 'positivo' : 'negativo'}">${r.fgts.saque ? (r.tipo === 'acordo_mutuo' ? 'Sim (80%)' : 'Sim (100%)') : 'Nao'}</div>
            </div>
            ${r.fgts.saque ? `
            <div class="verba-row total">
                <div class="verba-label">Total FGTS a receber</div>
                <div class="verba-valor positivo">${formatBRL(r.fgts.total)}</div>
            </div>` : ''}
        </div>` : ''}

        <div class="result-total-card" style="border-left-color: var(--accent-teal);">
            <div class="result-total-label">Total geral (rescisao${r.fgts.total > 0 ? ' + FGTS' : ''})</div>
            <div class="result-total-value">${formatBRL(r.totalLiquido + r.fgts.total)}</div>
        </div>

        <div class="verbas-section" style="font-size:.72rem;color:var(--text-muted);border:none;background:none;padding:8px 0">
            Memoria de calculo: salario/30 = ${formatBRL(r.salario / 30)}/dia &middot;
            Admissao: ${fmtData(r.admissao)} &middot;
            Demissao: ${fmtData(r.demissao)} &middot;
            Projecao aviso: ${fmtData(r.dataProjetada)} &middot;
            ${r.anos} ano${r.anos !== 1 ? 's' : ''} completo${r.anos !== 1 ? 's' : ''}
        </div>
    `;
}

/* ─── EVENTOS ─────────────────────────── */

/* ─── PROJEÇÃO 12 MESES ──────────────── */

const MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
let _projChart = null;

function calcularProjecao(params) {
    const pontos = [];
    for (let m = 0; m <= 12; m++) {
        const demProj = addMonths(params.demissao, m);
        const r = calcularRescisao({ ...params, demissao: demProj });
        const label = MESES_CURTO[demProj.getMonth()] + '/' + demProj.getFullYear();
        pontos.push({ mes: m, valor: r.totalLiquido, fgts: r.fgts.total, label });
    }
    return pontos;
}

function renderProjecao(params) {
    const area = document.getElementById('projecaoArea');
    if (!area || typeof Chart === 'undefined') return;

    const pontos = calcularProjecao(params);

    area.innerHTML = `
        <div class="proj-card">
            <div class="proj-title">Projecao de Rescisao — Proximos 12 Meses</div>
            <div class="proj-subtitle">Simulacao do valor liquido se a demissao ocorrer nos proximos meses, mantendo os mesmos parametros.</div>
            <div class="proj-chart"><canvas id="projCanvas"></canvas></div>
        </div>
    `;

    const ctx = document.getElementById('projCanvas');
    if (!ctx) return;

    if (_projChart) { _projChart.destroy(); _projChart = null; }

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();

    _projChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pontos.map(p => p.label),
            datasets: [
                {
                    label: 'Rescisao liquida',
                    data: pontos.map(p => p.valor),
                    borderColor: '#5eead4',
                    backgroundColor: 'rgba(94,234,212,.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#5eead4',
                    borderWidth: 2,
                },
                {
                    label: 'FGTS (saldo + multa)',
                    data: pontos.map(p => p.fgts),
                    borderColor: '#58a6ff',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#58a6ff',
                    borderWidth: 1.5,
                    borderDash: [5, 3],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: "'Inter'", size: 11 }, boxWidth: 12, padding: 16 },
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    titleFont: { family: "'Inter'", size: 12 },
                    bodyFont: { family: "'JetBrains Mono'", size: 11 },
                    callbacks: {
                        label: ctx => '  ' + ctx.dataset.label + ': ' + formatBRL(ctx.parsed.y),
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: mutedColor, font: { size: 10 } },
                    grid: { display: false },
                    border: { display: false },
                },
                y: { display: false },
            },
        },
    });
}

/* ─── EVENTOS ─────────────────────────── */

function init() {
    // Theme
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('themeToggle').addEventListener('click', () => {
        const h = document.documentElement;
        const isDark = h.getAttribute('data-theme') !== 'light';
        h.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
        document.getElementById('themeToggle').textContent = isDark ? '\u263E' : '\u2606';
    });

    // Máscara de moeda
    ['salario', 'saldoFGTS'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            let v = el.value.replace(/\D/g, '');
            if (!v) { el.value = ''; return; }
            v = (parseInt(v) / 100).toFixed(2);
            el.value = parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        });
    });

    // Datas padrão
    const hoje = new Date();
    const doisAnos = new Date(hoje.getFullYear() - 2, hoje.getMonth(), hoje.getDate());
    document.getElementById('dataDemissao').value = hoje.toISOString().slice(0, 10);
    document.getElementById('dataAdmissao').value = doisAnos.toISOString().slice(0, 10);

    // Tipo de rescisão controla aviso prévio
    document.getElementById('tipoRescisao').addEventListener('change', () => {
        const tipo = document.getElementById('tipoRescisao').value;
        const avisoEl = document.getElementById('avisoTipo');
        avisoEl.disabled = (tipo === 'justa_causa' || tipo === 'prazo_determinado');
        if (avisoEl.disabled) avisoEl.value = 'dispensado';
    });

    // Calcular
    // Botão editar: volta ao estado inicial
    document.getElementById('btnEditar').addEventListener('click', () => {
        document.querySelector('.main').classList.remove('calculated');
        document.getElementById('resultArea').innerHTML = '';
        document.getElementById('projecaoArea').innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnCalcular').addEventListener('click', () => {
        const salario = parseBRL(document.getElementById('salario').value);
        const admissao = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00');
        const demissao = new Date(document.getElementById('dataDemissao').value + 'T00:00:00');
        const tipo = document.getElementById('tipoRescisao').value;
        const avisoTipo = document.getElementById('avisoTipo').value;
        const saldoFGTS = parseBRL(document.getElementById('saldoFGTS').value);
        const feriasVencidas = parseInt(document.getElementById('feriasVencidas').value) || 0;
        const dependentes = parseInt(document.getElementById('dependentes').value) || 0;

        if (!salario || salario <= 0) { alert('Informe o salario bruto.'); return; }
        if (isNaN(admissao.getTime()) || isNaN(demissao.getTime())) { alert('Informe as datas.'); return; }
        if (demissao <= admissao) { alert('Data de demissao deve ser posterior a admissao.'); return; }

        const r = calcularRescisao({ salario, admissao, demissao, tipo, avisoTipo, saldoFGTS, feriasVencidas, dependentes });
        const calcParams = { salario, admissao, demissao, tipo, avisoTipo, saldoFGTS, feriasVencidas, dependentes };
        document.querySelector('.main').classList.add('calculated');
        renderResultado(r);
        renderProjecao(calcParams);

        if (window.innerWidth <= 768) {
            document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

init();
