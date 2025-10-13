# 🔗 Guia de Integração ORBIS

## Arquitetura Completa

```
Frontend React (widget-orbis)
    ↓ HTTP Calls
Backend Plataforma (integracoes_3dx) 
    ↓ Consome APIs ORBIS
Backend Mock ORBIS (localhost:3001)
    ↓ Migração Futura
Backend TI ORBIS (Production)
```

## 🎯 Próximos Passos no Backend da Plataforma

### 1. Cliente HTTP para ORBIS APIs
```javascript
// services/orbisClient.js
const ORBIS_BASE_URL = process.env.ORBIS_API_URL || 'http://localhost:3001/orbis';

class OrbisClient {
  async getParametros() {
    const response = await fetch(`${ORBIS_BASE_URL}/parametros`);
    return response.json();
  }
  
  async getEtapas() {
    const response = await fetch(`${ORBIS_BASE_URL}/etapas`);
    return response.json();
  }
  
  async getRotas() {
    const response = await fetch(`${ORBIS_BASE_URL}/rotas`);
    return response.json();
  }
  
  async getOperacoes() {
    const response = await fetch(`${ORBIS_BASE_URL}/operacoes`);
    return response.json();
  }
  
  async getCoeficientes() {
    const response = await fetch(`${ORBIS_BASE_URL}/coeficientes`);
    return response.json();
  }
  
  async getRegras() {
    const response = await fetch(`${ORBIS_BASE_URL}/regras`);
    return response.json();
  }
}

module.exports = new OrbisClient();
```

### 2. Engine de Cálculos ORBIS
```javascript
// services/orbisCalculator.js
const orbisClient = require('./orbisClient');

class OrbisCalculator {
  async calcularCustoProducao(dadosPeca) {
    // 1. Buscar dados necessários
    const parametros = await orbisClient.getParametros();
    const operacoes = await orbisClient.getOperacoes();
    const coeficientes = await orbisClient.getCoeficientes();
    const regras = await orbisClient.getRegras();
    
    // 2. Aplicar cálculos base
    let custoBase = this.calcularCustoBase(dadosPeca, operacoes);
    
    // 3. Aplicar coeficientes
    custoBase = this.aplicarCoeficientes(custoBase, coeficientes, dadosPeca);
    
    // 4. Aplicar regras pós-cálculo
    const custoFinal = this.aplicarRegras(custoBase, regras, dadosPeca);
    
    return {
      custoBase,
      custoFinal,
      detalhamento: this.gerarDetalhamento(dadosPeca)
    };
  }
  
  calcularCustoBase(dadosPeca, operacoes) {
    // Lógica de cálculo base
  }
  
  aplicarCoeficientes(custo, coeficientes, dadosPeca) {
    // Aplicar coeficientes de material, complexidade, etc.
  }
  
  aplicarRegras(custo, regras, dadosPeca) {
    // Aplicar regras de pós-cálculo
  }
}

module.exports = new OrbisCalculator();
```

### 3. Endpoints para Frontend
```javascript
// routes/orbis.js
const express = require('express');
const router = express.Router();
const orbisCalculator = require('../services/orbisCalculator');

// POST /api/orbis/calcular
router.post('/calcular', async (req, res) => {
  try {
    const { dadosPeca, configuracoes } = req.body;
    
    const resultado = await orbisCalculator.calcularCustoProducao(dadosPeca);
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/orbis/parametros - Proxy para ORBIS
router.get('/parametros', async (req, res) => {
  try {
    const parametros = await orbisClient.getParametros();
    res.json(parametros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 4. Configuração de Ambiente
```env
# .env
ORBIS_API_URL=http://localhost:3000/orbis
ORBIS_TIMEOUT=30000
```

## 🚀 Como Implementar

1. **No Backend da Plataforma:**
   - Criar pasta `services/orbis/`
   - Implementar cliente HTTP para APIs ORBIS
   - Criar engine de cálculos
   - Adicionar endpoints para o frontend

2. **Estrutura Sugerida:**
   ```
   integracoes_3dx/
   ├── services/
   │   └── orbis/
   │       ├── orbisClient.js
   │       ├── orbisCalculator.js
   │       └── orbisValidator.js
   ├── routes/
   │   └── orbis.js
   └── .env
   ```

3. **Testes:**
   - Testar conexão com mock ORBIS
   - Validar cálculos
   - Testar endpoints

## 📊 APIs ORBIS Disponíveis

- `GET /orbis/parametros` - Parâmetros de processo
- `GET /orbis/etapas` - Etapas de produção
- `GET /orbis/rotas` - Rotas de produção
- `GET /orbis/operacoes` - Operações de máquina
- `GET /orbis/coeficientes` - Coeficientes de cálculo
- `GET /orbis/regras` - Regras pós-cálculo
- `GET /orbis/projetos` - Projetos

**Backend Mock ORBIS rodando em:** `http://localhost:3001`

## 🔄 Migração Futura

Quando o backend TI estiver pronto, alterar apenas:
```env
ORBIS_API_URL=https://api-ti.empresa.com/orbis
```