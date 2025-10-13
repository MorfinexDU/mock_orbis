# ORBIS Backend Mock

Backend mock desenvolvido em Node.js + Express + SQLite para simular o sistema ORBIS durante o desenvolvimento frontend.

## 🚀 Visão Geral

Este projeto implementa um backend completo com APIs REST idênticas às especificações da documentação do TI, permitindo desenvolvimento independente do frontend enquanto aguarda a entrega do backend oficial.

## 📋 Funcionalidades

- **7 APIs Completas**: Parâmetros, Etapas, Rotas, Operações, Coeficientes, Regras e Projetos
- **CRUD Completo**: Create, Read, Update, Delete para todas as entidades
- **Validações**: Campos obrigatórios, unicidade, tipos de dados
- **Filtros e Busca**: Paginação, filtros por categoria/tipo, busca textual
- **Dados de Exemplo**: Base de dados já populada para testes
- **CORS Habilitado**: Pronto para integração com frontend React
- **Logs Detalhados**: Monitoring completo de requests e errors

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite** - Banco de dados local
- **Helmet** - Security headers
- **Morgan** - Request logging
- **CORS** - Cross-origin resource sharing

## 📁 Estrutura do Projeto

```
backend_worbis_local/
├── server.js              # Servidor principal Express
├── init-db.js             # Script de inicialização do DB
├── package.json            # Dependências e scripts
├── database/
│   ├── connection.js       # Conexão SQLite
│   ├── init.js            # Criação de tabelas
│   ├── seed.js            # Dados de exemplo
│   └── orbis.db           # Banco SQLite (gerado)
├── routes/
│   ├── parametros.js      # API de parâmetros
│   ├── etapas.js          # API de etapas
│   ├── rotas.js           # API de rotas
│   ├── operacoes.js       # API de operações
│   ├── coeficientes.js    # API de coeficientes
│   ├── regras.js          # API de regras
│   └── projetos.js        # API de projetos
└── .github/
    └── copilot-instructions.md
```

## 🎯 Instalação e Execução

### 1. Instalar Dependências
```bash
npm install
```

### 2. Inicializar Banco de Dados
```bash
npm run init-db
```

### 3. Iniciar Servidor
```bash
npm start
```

### 4. Verificar Funcionamento
- Health Check: http://localhost:3001/health
- API Info: http://localhost:3001/orbis
- Documentação: http://localhost:3001/orbis/parametros

## 📊 Scripts NPM

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia servidor em produção |
| `npm run dev` | Inicia com nodemon (desenvolvimento) |
| `npm run init-db` | Inicializa banco e dados de exemplo |
| `npm run seed-db` | Apenas recarrega dados de exemplo |
| `npm run reset-db` | Reseta completamente o banco |

## 🔗 APIs Disponíveis

### Base URL: `http://localhost:3001/orbis`

#### 1. Parâmetros (`/parametros`)
- `GET /parametros` - Listar com paginação e filtros
- `GET /parametros/:id` - Buscar por ID
- `GET /parametros/nome/:nome` - Buscar por nome
- `POST /parametros` - Criar novo
- `PUT /parametros/:id` - Atualizar
- `DELETE /parametros/:id` - Excluir

#### 2. Etapas (`/etapas`)
- `GET /etapas` - Listar com paginação e filtros
- `GET /etapas/:id` - Buscar por ID
- `GET /etapas/categoria/:categoria` - Por categoria
- `POST /etapas` - Criar nova
- `PUT /etapas/:id` - Atualizar
- `DELETE /etapas/:id` - Excluir

#### 3. Rotas (`/rotas`)
- `GET /rotas` - Listar com paginação
- `GET /rotas/:id` - Buscar por ID
- `GET /rotas/nome/:nome` - Buscar por nome
- `GET /rotas/ativas` - Apenas rotas ativas
- `POST /rotas` - Criar nova
- `PUT /rotas/:id` - Atualizar
- `DELETE /rotas/:id` - Excluir

#### 4. Operações (`/operacoes`)
- `GET /operacoes` - Listar com filtros
- `GET /operacoes/:id` - Buscar por ID
- `GET /operacoes/categoria/:categoria` - Por categoria
- `GET /operacoes/tipo/:tipo_maquina` - Por tipo máquina
- `POST /operacoes` - Criar nova
- `PUT /operacoes/:id` - Atualizar
- `DELETE /operacoes/:id` - Excluir

#### 5. Coeficientes (`/coeficientes`)
- `GET /coeficientes` - Listar com filtros
- `GET /coeficientes/:id` - Buscar por ID
- `GET /coeficientes/categoria/:categoria` - Por categoria
- `GET /coeficientes/ativos` - Apenas ativos
- `POST /coeficientes` - Criar novo
- `PUT /coeficientes/:id` - Atualizar
- `DELETE /coeficientes/:id` - Excluir

#### 6. Regras (`/regras`)
- `GET /regras` - Listar com filtros
- `GET /regras/:id` - Buscar por ID
- `GET /regras/tipo/:tipo` - Por tipo
- `GET /regras/ativas` - Apenas ativas ordenadas
- `POST /regras` - Criar nova
- `PUT /regras/:id` - Atualizar
- `DELETE /regras/:id` - Excluir

#### 7. Projetos (`/projetos`)
- `GET /projetos` - Listar com paginação
- `GET /projetos/:id` - Buscar por ID
- `GET /projetos/nome/:nome` - Buscar por nome
- `GET /projetos/status/:status` - Por status
- `POST /projetos` - Criar novo
- `PUT /projetos/:id` - Atualizar
- `DELETE /projetos/:id` - Excluir

## 📝 Exemplos de Uso

### Listar Parâmetros com Filtros
```bash
curl "http://localhost:3001/orbis/parametros?page=1&limit=10&search=temperatura&tipo=number"
```

### Criar Novo Parâmetro
```bash
curl -X POST http://localhost:3001/orbis/parametros \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "novo_parametro",
    "tipo": "text",
    "descricao": "Descrição do parâmetro",
    "obrigatorio": true
  }'
```

### Buscar Etapas por Categoria
```bash
curl http://localhost:3001/orbis/etapas/categoria/Setup
```

## 🔄 Migração para Backend TI

Quando o backend oficial estiver pronto:

1. **Frontend**: Alterar apenas a variável de ambiente `API_BASE_URL`
2. **APIs**: Todas implementadas conforme especificação TI
3. **Dados**: Exportar/importar dados de desenvolvimento se necessário

### Configuração Frontend
```javascript
// .env.development
REACT_APP_API_BASE_URL=http://localhost:3001/orbis

// .env.production  
REACT_APP_API_BASE_URL=https://api-ti.empresa.com/orbis
```

## 📋 Dados de Exemplo Inclusos

O banco vem pré-populado com:

- **5 Parâmetros** (temperatura, velocidade, material, pressão, refrigeração)
- **4 Etapas** (preparação, corte, inspeção, limpeza)
- **2 Rotas** (processo padrão e expresso)
- **2 Operações** (torneamento e fresamento)
- **2 Coeficientes** (material e complexidade)
- **2 Regras** (ajuste material e desconto lote)
- **2 Projetos** (piloto automotivo e desenvolvimento)

## 🔧 Desenvolvimento

### Estrutura de Resposta Padrão
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Estrutura de Erro Padrão
```json
{
  "success": false,
  "error": "Mensagem do erro",
  "message": "Detalhes técnicos"
}
```

## 🚀 Deploy e Produção

Para usar em ambiente de desenvolvimento da equipe:

1. **Alterar porta** se necessário no `server.js`
2. **Configurar CORS** para URLs específicas
3. **Backup do banco** antes de atualizações
4. **Monitorar logs** para depuração

## 📚 Documentação Adicional

- **Documentação TI**: Pasta `DOCS_TI_FINAL/`
- **Esquemas SQL**: Arquivo `database/init.js`
- **Dados de Teste**: Arquivo `database/seed.js`

## 🆘 Troubleshooting

### Erro: Porta 3000 em uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou alterar porta no server.js
const PORT = process.env.PORT || 3001;
```

### Erro: Banco de dados corrompido
```bash
# Resetar completamente
npm run reset-db
```

### Erro: Dependências
```bash
# Reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

**Desenvolvido para projeto ORBIS** 🚀  
*Backend mock para desenvolvimento independente do frontend*