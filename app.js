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

const DEDUCAO_DEPENDENTE = 189.59; // valor por dependente 2026
const DESCONTO_SIMPLIFICADO = 607.20; // 25% do limite da 1ª faixa

// Redutor IRRF 2026 para rendas entre R$ 5.000 e R$ 7.350
// Fórmula: 978.62 - (0.133145 × renda_bruta_mensal)
const IRRF_REDUTOR_LIMITE_INF = 5000;
const IRRF_REDUTOR_LIMITE_SUP = 7350;
const IRRF_REDUTOR_A = 978.62;
const IRRF_REDUTOR_B = 0.133145;

/* ─── CÁLCULO INSS ────────────────────── */

function calcINSS(salario) {
    let total = 0;
    let anterior = 0;
    for (const faixa of INSS_FAIXAS) {
        if (salario <= anterior) break;
        const base = Math.min(salario, faixa.limite) - anterior;
        total += base * faixa.aliquota;
        anterior = faixa.limite;
    }
    return Math.round(total * 100) / 100;
}

/* ─── CÁLCULO IRRF ────────────────────── */

function calcIRRF(salarioBruto, inss, dependentes = 0) {
    // Base: bruto - INSS - dependentes
    const deducaoDep = dependentes * DEDUCAO_DEPENDENTE;
    // Maior desconto entre simplificado e (INSS + dependentes)
    const deducaoLegal = inss + deducaoDep;
    const desconto = Math.max(deducaoLegal, DESCONTO_SIMPLIFICADO);
    const base = Math.max(salarioBruto - desconto, 0);

    // Tabela progressiva
    let irrf = 0;
    for (const faixa of IRRF_FAIXAS) {
        if (base <= faixa.limite) {
            irrf = base * faixa.aliquota - faixa.deducao;
            break;
        }
    }
    irrf = Math.max(irrf, 0);

    // Redutor para rendas entre R$ 5.000 e R$ 7.350
    if (salarioBruto <= IRRF_REDUTOR_LIMITE_INF) {
        irrf = 0; // isento
    } else if (salarioBruto <= IRRF_REDUTOR_LIMITE_SUP) {
        const redutor = IRRF_REDUTOR_A - (IRRF_REDUTOR_B * salarioBruto);
        irrf = Math.max(irrf - Math.max(redutor, 0), 0);
    }

    return Math.round(irrf * 100) / 100;
}

/* ─── UTILITÁRIOS ─────────────────────── */

function diffMeses(d1, d2) {
    // Meses completos entre duas datas
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function diffDias(d1, d2) {
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

function diasNoMes(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function mesesTrabalhados(admissao, demissao) {
    // Para 13º e férias: mês conta se trabalhou >= 15 dias
    let meses = diffMeses(admissao, demissao);
    const diaAdm = admissao.getDate();
    const diaDem = demissao.getDate();
    // Ajustar se o último mês teve >= 15 dias
    const diasUltimoMes = diaDem;
    if (diasUltimoMes >= 15) meses++;
    return meses;
}

function anosCompletos(admissao, demissao) {
    let anos = demissao.getFullYear() - admissao.getFullYear();
    if (demissao.getMonth() < admissao.getMonth() ||
        (demissao.getMonth() === admissao.getMonth() && demissao.getDate() < admissao.getDate())) {
        anos--;
    }
    return Math.max(anos, 0);
}

function formatBRL(v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/* ─── MOTOR DE CÁLCULO ───────────────── */

function calcularRescisao(params) {
    const { salario, admissao, demissao, tipo, avisoTipo, saldoFGTS, feriasVencidas, dependentes } = params;

    const resultado = {
        tipo,
        admissao,
        demissao,
        salario,
        verbas: [],    // { label, detail, valor, tipo: 'positivo'|'negativo'|'neutro' }
        totalBruto: 0,
        totalDescontos: 0,
        totalLiquido: 0,
        diasAviso: 0,
        mesesTrab: 0,
        anosComp: 0,
    };

    const anos = anosCompletos(admissao, demissao);
    resultado.anosComp = anos;

    // ─── AVISO PRÉVIO ────────────────────
    // 30 dias + 3 dias por ano trabalhado, máximo 90 dias
    const diasAviso = Math.min(30 + (anos * 3), 90);
    resultado.diasAviso = diasAviso;

    let dataFimContrato = new Date(demissao);
    let avisoValor = 0;

    const temAviso = tipo === 'sem_justa_causa' || tipo === 'pedido_demissao' || tipo === 'acordo_mutuo';

    if (temAviso && avisoTipo === 'indenizado') {
        if (tipo === 'acordo_mutuo') {
            // Acordo: 50% do aviso prévio
            avisoValor = (salario / 30) * diasAviso * 0.5;
            resultado.verbas.push({ label: 'Aviso previo indenizado (50%)', detail: `${diasAviso} dias x 50%`, valor: avisoValor, tipo: 'positivo' });
        } else if (tipo === 'sem_justa_causa' || tipo === 'pedido_demissao') {
            avisoValor = (salario / 30) * diasAviso;
            resultado.verbas.push({ label: 'Aviso previo indenizado', detail: `${diasAviso} dias`, valor: avisoValor, tipo: 'positivo' });
        }
        // Aviso indenizado projeta data para cálculo de férias e 13º
        dataFimContrato = new Date(demissao.getTime() + diasAviso * 24 * 60 * 60 * 1000);
    } else if (temAviso && avisoTipo === 'trabalhado') {
        // Trabalhado: já recebeu como salário, não entra na rescisão
        dataFimContrato = new Date(demissao.getTime() + diasAviso * 24 * 60 * 60 * 1000);
    }

    // ─── SALDO DE SALÁRIO ────────────────
    const diasTrabMes = demissao.getDate();
    const totalDiasMes = diasNoMes(demissao);
    const saldoSalario = (salario / totalDiasMes) * diasTrabMes;
    resultado.verbas.push({ label: 'Saldo de salario', detail: `${diasTrabMes}/${totalDiasMes} dias`, valor: saldoSalario, tipo: 'positivo' });

    // ─── 13º SALÁRIO PROPORCIONAL ────────
    const meses13 = dataFimContrato.getMonth() + 1; // meses do ano até a data fim
    // Ajustar: se trabalhou >= 15 dias no último mês, conta
    let avos13 = meses13;
    if (dataFimContrato.getDate() < 15) avos13--;
    avos13 = Math.max(avos13, 0);

    // Justa causa: não tem 13º proporcional
    if (tipo !== 'justa_causa' && avos13 > 0) {
        const decimo = (salario / 12) * avos13;
        resultado.verbas.push({ label: '13o salario proporcional', detail: `${avos13}/12 avos`, valor: decimo, tipo: 'positivo' });
    }

    // ─── FÉRIAS PROPORCIONAIS ────────────
    // Contar meses desde último período aquisitivo completo
    const mesesDesdeUltAniv = diffMeses(
        new Date(dataFimContrato.getFullYear(), admissao.getMonth(), admissao.getDate()),
        dataFimContrato
    );
    let avosFerias = mesesDesdeUltAniv;
    if (avosFerias < 0) avosFerias += 12;
    if (avosFerias > 12) avosFerias = 12;

    // Justa causa: sem férias proporcionais
    if (tipo !== 'justa_causa' && avosFerias > 0) {
        const feriasProps = (salario / 12) * avosFerias;
        const terco = feriasProps / 3;
        resultado.verbas.push({ label: 'Ferias proporcionais', detail: `${avosFerias}/12 avos`, valor: feriasProps, tipo: 'positivo' });
        resultado.verbas.push({ label: '1/3 constitucional (ferias prop.)', detail: '', valor: terco, tipo: 'positivo' });
    }

    // ─── FÉRIAS VENCIDAS ─────────────────
    if (feriasVencidas > 0) {
        for (let i = 0; i < feriasVencidas; i++) {
            resultado.verbas.push({ label: `Ferias vencidas (periodo ${i + 1})`, detail: '30 dias', valor: salario, tipo: 'positivo' });
            resultado.verbas.push({ label: `1/3 constitucional (vencidas ${i + 1})`, detail: '', valor: salario / 3, tipo: 'positivo' });
        }
    }

    // ─── TOTAL BRUTO ─────────────────────
    resultado.totalBruto = resultado.verbas.reduce((s, v) => s + v.valor, 0);

    // ─── DESCONTOS ───────────────────────

    // INSS sobre saldo de salário
    const inssBase = saldoSalario; // INSS incide sobre saldo de salário
    const inssValor = calcINSS(Math.min(inssBase, salario)); // proporcional mas limitado ao teto
    const inssEfetivo = (inssBase / salario) * calcINSS(salario); // proporcionalizado
    resultado.verbas.push({ label: 'INSS', detail: 'Sobre saldo de salario', valor: -Math.abs(inssEfetivo), tipo: 'negativo' });

    // INSS sobre 13º
    if (tipo !== 'justa_causa' && avos13 > 0) {
        const decimo = (salario / 12) * avos13;
        const inss13 = calcINSS(decimo);
        resultado.verbas.push({ label: 'INSS sobre 13o', detail: '', valor: -inss13, tipo: 'negativo' });
    }

    // IRRF sobre saldo + férias (férias indenizadas são isentas de IRRF na rescisão)
    const baseIRRF = saldoSalario;
    const irrfSaldo = calcIRRF(salario, calcINSS(salario), dependentes); // simula sobre salário cheio, proporcionaliza
    const irrfEfetivo = (baseIRRF / salario) * irrfSaldo;
    if (irrfEfetivo > 0) {
        resultado.verbas.push({ label: 'IRRF', detail: 'Sobre saldo de salario', valor: -irrfEfetivo, tipo: 'negativo' });
    }

    // IRRF sobre 13º (tributação exclusiva)
    if (tipo !== 'justa_causa' && avos13 > 0) {
        const decimo = (salario / 12) * avos13;
        const inss13 = calcINSS(decimo);
        const irrf13 = calcIRRF(decimo, inss13, dependentes);
        if (irrf13 > 0) {
            resultado.verbas.push({ label: 'IRRF sobre 13o', detail: 'Tributacao exclusiva', valor: -irrf13, tipo: 'negativo' });
        }
    }

    // ─── FGTS ────────────────────────────
    // FGTS não entra no valor líquido da rescisão (é pago via Caixa)
    // Mas calculamos a multa para informar

    let multaFGTS = 0;
    let fgtsSaque = false;

    if (tipo === 'sem_justa_causa') {
        multaFGTS = saldoFGTS * 0.40;
        fgtsSaque = true;
    } else if (tipo === 'acordo_mutuo') {
        multaFGTS = saldoFGTS * 0.20;
        fgtsSaque = true; // saque de 80% do saldo
    } else if (tipo === 'prazo_determinado') {
        fgtsSaque = true;
        multaFGTS = 0;
    }
    // Pedido de demissão e justa causa: sem multa, sem saque

    // ─── TOTAIS ──────────────────────────
    resultado.totalDescontos = resultado.verbas.filter(v => v.valor < 0).reduce((s, v) => s + v.valor, 0);
    resultado.totalLiquido = resultado.totalBruto + resultado.totalDescontos;
    resultado.mesesTrab = diffMeses(admissao, demissao);

    // FGTS info (não entra no líquido — pago separadamente)
    resultado.fgts = {
        saldo: saldoFGTS,
        multa: multaFGTS,
        saque: fgtsSaque,
        total: fgtsSaque ? (tipo === 'acordo_mutuo' ? saldoFGTS * 0.8 + multaFGTS : saldoFGTS + multaFGTS) : 0,
    };

    return resultado;
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

    const mesesLabel = r.mesesTrab >= 12
        ? `${Math.floor(r.mesesTrab / 12)} ano${Math.floor(r.mesesTrab / 12) > 1 ? 's' : ''} e ${r.mesesTrab % 12} mes${r.mesesTrab % 12 !== 1 ? 'es' : ''}`
        : `${r.mesesTrab} mes${r.mesesTrab !== 1 ? 'es' : ''}`;

    const verbasPos = r.verbas.filter(v => v.valor >= 0);
    const verbasNeg = r.verbas.filter(v => v.valor < 0);

    area.innerHTML = `
        <div class="result-header">
            <span class="result-tipo">${TIPO_LABELS[r.tipo]}</span>
            <span class="result-periodo">${mesesLabel} de contrato</span>
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
                <div class="info-box-label">Tempo</div>
                <div class="info-box-value">${r.anosComp} ano${r.anosComp !== 1 ? 's' : ''}</div>
            </div>
        </div>

        <div class="result-total-card">
            <div class="result-total-label">Total liquido da rescisao</div>
            <div class="result-total-value">${formatBRL(r.totalLiquido)}</div>
        </div>

        <div class="verbas-section">
            <div class="verbas-title">Verbas Rescisorias</div>
            ${verbasPos.map(v => `
                <div class="verba-row">
                    <div><div class="verba-label">${v.label}</div>${v.detail ? `<div class="verba-detail">${v.detail}</div>` : ''}</div>
                    <div class="verba-valor positivo">${formatBRL(v.valor)}</div>
                </div>
            `).join('')}
            <div class="verba-row total">
                <div class="verba-label">Total bruto</div>
                <div class="verba-valor positivo">${formatBRL(r.totalBruto)}</div>
            </div>
        </div>

        <div class="verbas-section">
            <div class="verbas-title">Descontos</div>
            ${verbasNeg.map(v => `
                <div class="verba-row">
                    <div><div class="verba-label">${v.label}</div>${v.detail ? `<div class="verba-detail">${v.detail}</div>` : ''}</div>
                    <div class="verba-valor negativo">${formatBRL(Math.abs(v.valor))}</div>
                </div>
            `).join('')}
            <div class="verba-row total">
                <div class="verba-label">Total descontos</div>
                <div class="verba-valor negativo">${formatBRL(Math.abs(r.totalDescontos))}</div>
            </div>
        </div>

        ${r.fgts.saldo > 0 ? `
        <div class="verbas-section">
            <div class="verbas-title">FGTS (pago via Caixa)</div>
            <div class="verba-row">
                <div class="verba-label">Saldo FGTS informado</div>
                <div class="verba-valor neutro">${formatBRL(r.fgts.saldo)}</div>
            </div>
            ${r.fgts.multa > 0 ? `
            <div class="verba-row">
                <div><div class="verba-label">Multa rescisoria</div><div class="verba-detail">${r.tipo === 'acordo_mutuo' ? '20% (acordo)' : '40%'}</div></div>
                <div class="verba-valor positivo">${formatBRL(r.fgts.multa)}</div>
            </div>` : ''}
            <div class="verba-row">
                <div class="verba-label">Direito a saque</div>
                <div class="verba-valor ${r.fgts.saque ? 'positivo' : 'negativo'}">${r.fgts.saque ? 'Sim' : 'Nao'}</div>
            </div>
            ${r.fgts.saque ? `
            <div class="verba-row total">
                <div class="verba-label">Total FGTS a receber</div>
                <div class="verba-valor positivo">${formatBRL(r.fgts.total)}</div>
            </div>` : ''}
        </div>` : ''}

        <div class="result-total-card" style="border-left-color: var(--accent-teal);">
            <div class="result-total-label">Total geral (rescisao + FGTS)</div>
            <div class="result-total-value">${formatBRL(r.totalLiquido + r.fgts.total)}</div>
        </div>
    `;
}

/* ─── EVENTOS ─────────────────────────── */

function init() {
    // Theme toggle
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('themeToggle').addEventListener('click', () => {
        const h = document.documentElement;
        const isDark = h.getAttribute('data-theme') !== 'light';
        h.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
        document.getElementById('themeToggle').textContent = isDark ? '\u263E' : '\u2606';
    });

    // Máscara de moeda nos inputs
    ['salario', 'saldoFGTS'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            let v = el.value.replace(/\D/g, '');
            if (!v) { el.value = ''; return; }
            v = (parseInt(v) / 100).toFixed(2);
            el.value = parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        });
    });

    // Data padrão: admissão 2 anos atrás, demissão hoje
    const hoje = new Date();
    const doisAnos = new Date(hoje.getFullYear() - 2, hoje.getMonth(), hoje.getDate());
    document.getElementById('dataDemissao').value = hoje.toISOString().slice(0, 10);
    document.getElementById('dataAdmissao').value = doisAnos.toISOString().slice(0, 10);

    // Tipo de rescisão muda opções de aviso prévio
    document.getElementById('tipoRescisao').addEventListener('change', () => {
        const tipo = document.getElementById('tipoRescisao').value;
        const avisoEl = document.getElementById('avisoTipo');
        if (tipo === 'justa_causa' || tipo === 'prazo_determinado') {
            avisoEl.value = 'dispensado';
            avisoEl.disabled = true;
        } else {
            avisoEl.disabled = false;
        }
    });

    // Calcular
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
        if (isNaN(admissao.getTime()) || isNaN(demissao.getTime())) { alert('Informe as datas corretamente.'); return; }
        if (demissao <= admissao) { alert('A data de demissao deve ser posterior a admissao.'); return; }

        const resultado = calcularRescisao({ salario, admissao, demissao, tipo, avisoTipo, saldoFGTS, feriasVencidas, dependentes });
        renderResultado(resultado);

        // Scroll suave até o resultado em mobile
        if (window.innerWidth <= 800) {
            document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

init();
