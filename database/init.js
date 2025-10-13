const { runQuery } = require('./connection');

async function createTables() {
  console.log('Criando tabelas do banco de dados...');

  try {
    // Tabela parametros_processo
    await runQuery(`
      CREATE TABLE IF NOT EXISTS parametros_processo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        tipo TEXT NOT NULL,
        unidade TEXT,
        descricao TEXT,
        opcoes TEXT, -- JSON array para campos select/checkbox
        valor_padrao TEXT,
        obrigatorio INTEGER DEFAULT 0, -- 0=false, 1=true
        imagem_base64 TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME
      )
    `);

    // Tabela etapas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS etapas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT NOT NULL,
        ordem INTEGER,
        tempo_estimado_minutos INTEGER,
        parametros_necessarios TEXT, -- JSON array dos parâmetros necessários
        configuracoes TEXT, -- JSON objeto com configurações específicas
        observacoes TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME,
        UNIQUE(nome, categoria)
      )
    `);

    // Tabela rotas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS rotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        etapas TEXT, -- JSON array com {etapa_id, ordem, parametros_customizados}
        configuracoes TEXT, -- JSON objeto com configurações da rota
        observacoes TEXT,
        ativo INTEGER DEFAULT 1, -- 0=false, 1=true
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME
      )
    `);

    // Tabela operacoes
    await runQuery(`
      CREATE TABLE IF NOT EXISTS operacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        descricao TEXT,
        tipo_maquina TEXT NOT NULL,
        tipo_operacao TEXT,
        codigo_sap TEXT,
        tempo_setup_min REAL,
        tempo_processamento_min REAL,
        custo_hora_operacao REAL,
        taxa_refugo_padrao REAL,
        condicoes_aplicacao TEXT, -- JSON objeto
        configuracoes_avancadas TEXT, -- JSON objeto
        parametros_processo TEXT, -- JSON array
        observacoes_tecnicas TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME,
        UNIQUE(nome, tipo_maquina)
      )
    `);

    // Tabela tabelas_coeficientes
    await runQuery(`
      CREATE TABLE IF NOT EXISTS tabelas_coeficientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        tipo TEXT NOT NULL,
        descricao TEXT,
        valores TEXT, -- JSON objeto com os valores dos coeficientes
        unidade TEXT,
        tabela_sap TEXT,
        ativo INTEGER DEFAULT 1, -- 0=false, 1=true
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME,
        UNIQUE(nome, categoria)
      )
    `);

    // Tabela regras_pos_calculo
    await runQuery(`
      CREATE TABLE IF NOT EXISTS regras_pos_calculo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        tipo TEXT NOT NULL,
        condicoes TEXT NOT NULL, -- JSON objeto com as condições
        acoes TEXT NOT NULL, -- JSON objeto com as ações
        ordem INTEGER,
        prioridade INTEGER DEFAULT 1,
        observacoes TEXT,
        ativo INTEGER DEFAULT 1, -- 0=false, 1=true
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME
      )
    `);

    // Tabela projetos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS projetos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        responsavel TEXT NOT NULL,
        roteiro TEXT, -- JSON objeto com rotas e configurações
        observacoes TEXT,
        status TEXT DEFAULT 'Planejamento',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME
      )
    `);

    console.log('✅ Todas as tabelas foram criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  }
}

module.exports = { createTables };