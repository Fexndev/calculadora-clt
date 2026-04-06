# Calculadora de Rescisao CLT

Simulador de rescisao trabalhista com tabelas de **INSS e IRRF atualizadas para 2026**.

Calcula todas as verbas rescisorias para os 5 tipos de desligamento previstos na CLT, incluindo aviso previo proporcional, ferias, 13o, FGTS e descontos legais.

**[Acessar a Calculadora](https://fexndev.github.io/calculadora-clt/)**

---

## Tipos de rescisao

| Tipo | Aviso Previo | FGTS Multa | FGTS Saque | 13o | Ferias |
|------|-------------|-----------|-----------|-----|--------|
| Demissao sem justa causa | Sim (30 + 3/ano) | 40% | 100% | Sim | Sim |
| Pedido de demissao | Sim | - | - | Sim | Sim |
| Acordo mutuo (Art. 484-A) | 50% | 20% | 80% | Sim | Sim |
| Justa causa | - | - | - | - | Vencidas |
| Termino de contrato | - | - | 100% | Sim | Sim |

## Tabelas 2026

**INSS** (progressivo):
- 7,5% ate R$ 1.621,00
- 9% de R$ 1.621,01 a R$ 2.902,84
- 12% de R$ 2.902,85 a R$ 4.354,27
- 14% de R$ 4.354,28 a R$ 8.475,55

**IRRF**: isencao ate R$ 5.000/mes. Reducao gradual ate R$ 7.350.

## Stack

- HTML + CSS + JavaScript vanilla
- Sem dependencias externas
- GitHub Pages (estatico)

## Estrutura

```
calculadora-clt/
├── index.html    # Formulario e estrutura
├── app.js        # Motor de calculo CLT
├── styles.css    # Design dark/light mode
└── README.md
```
