# Calculadora de Rescisao CLT

Simulador de rescisao trabalhista com tabelas de **INSS e IRRF atualizadas para 2026**.

Calcula todas as verbas rescisorias para os 5 tipos de desligamento previstos na CLT, com grafico de projecao dos proximos 12 meses e opcao de impressao/PDF.

**[Acessar a Calculadora](https://fexndev.github.io/calculadora-clt/)**

---

## Funcionalidades

- **5 tipos de rescisao**: sem justa causa, pedido de demissao, acordo mutuo (Art. 484-A), justa causa, termino de contrato
- **Calculo completo**: saldo de salario, aviso previo proporcional (Lei 12.506/2011), 13o proporcional + indenizado, ferias proporcionais + indenizadas + vencidas + 1/3, FGTS multa 40%/20%
- **Descontos**: INSS progressivo por faixa, IRRF com redutor 2026, tributacao exclusiva do 13o
- **Grafico de projecao**: simula o valor da rescisao para os proximos 12 meses com os mesmos parametros
- **Impressao/PDF**: layout otimizado para 1 folha A4 com grafico em alta resolucao
- **Interface**: form hero que transiciona para sidebar + dashboard apos calcular
- **Dark/light mode** com persistencia

## Tipos de rescisao

| Tipo | Aviso Previo | FGTS Multa | FGTS Saque | 13o | Ferias |
|------|-------------|-----------|-----------|-----|--------|
| Sem justa causa | 30 + 3/ano (max 90) | 40% | 100% | Sim | Sim |
| Pedido de demissao | 30 dias | - | - | Sim | Sim |
| Acordo mutuo (484-A) | 50% do aviso | 20% | 80% | Sim | Sim |
| Justa causa | - | - | - | - | Vencidas |
| Termino de contrato | - | - | 100% | Sim | Sim |

## Tabelas 2026

**INSS** (progressivo por faixa):
- 7,5% ate R$ 1.621,00
- 9% de R$ 1.621,01 a R$ 2.902,84
- 12% de R$ 2.902,85 a R$ 4.354,27
- 14% de R$ 4.354,28 a R$ 8.475,55

**IRRF**: isencao ate R$ 5.000/mes, reducao gradual ate R$ 7.350.

## Stack

- HTML + CSS + JavaScript vanilla + Chart.js
- GitHub Pages (estatico)
- Layout responsivo + impressao A4

## Estrutura

```
calculadora-clt/
├── index.html    # Formulario e estrutura
├── app.js        # Motor de calculo + projecao + impressao
├── styles.css    # Design dark/light + @media print
└── README.md
```
