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
        opcoes TEXT,
        valor_padrao TEXT,
        obrigatorio INTEGER DEFAULT 0,
        imagem_base64 TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME
      )
    `);

    // Tabela etapas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS etapas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        centros TEXT NOT NULL,
        centros_trabalho TEXT NOT NULL,
        parametros_necessarios TEXT NOT NULL,
        ativa INTEGER DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_etapas_nome ON etapas(nome)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_etapas_ativa ON etapas(ativa)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_etapas_centros ON etapas(centros)`);

    // Tabela rotas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS rotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        sequencia_centros TEXT NOT NULL,
        ativa INTEGER DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        centro_prod TEXT,
        etapas TEXT NOT NULL
      )
    `);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_rotas_nome ON rotas(nome)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_rotas_ativa ON rotas(ativa)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_rotas_centro_prod ON rotas(centro_prod)`);

    // Tabela operacoes
    await runQuery(`
      CREATE TABLE IF NOT EXISTS operacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequencia TEXT NOT NULL,
        centro_producao TEXT NOT NULL,
        centro_trabalho TEXT NOT NULL,
        chave_controle TEXT NOT NULL,
        chave_modelo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        tempo_homem REAL DEFAULT 0,
        unidade_tempo_homem TEXT DEFAULT 'MIN',
        tempo_maquina REAL DEFAULT 0,
        unidade_tempo_maquina TEXT DEFAULT 'MIN',
        tempo_preparacao REAL DEFAULT 0,
        unidade_tempo_preparacao TEXT DEFAULT 'MIN',
        formula_tempo_homem TEXT DEFAULT 'tempo_base',
        formula_tempo_maquina TEXT DEFAULT 'tempo_base',
        formula_tempo_preparacao TEXT DEFAULT 'tempo_base',
        condicoes_aplicacao TEXT DEFAULT '[]',
        ativo INTEGER DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        regras_pos_calculo TEXT DEFAULT '[]',
        validar_rota INTEGER DEFAULT 1,
        explicacao_formula_homem TEXT DEFAULT '',
        explicacao_formula_maquina TEXT DEFAULT '',
        explicacao_formula_preparacao TEXT DEFAULT ''
      )
    `);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_operacoes_centro_producao ON operacoes(centro_producao)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_operacoes_centro_trabalho ON operacoes(centro_trabalho)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_operacoes_ativo ON operacoes(ativo)`);

    // Tabela tabelas_coeficientes
    await runQuery(`
      CREATE TABLE IF NOT EXISTS tabelas_coeficientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        parametros_condicao TEXT NOT NULL,
        dados_coeficientes TEXT NOT NULL,
        tabela_sap TEXT,
        ativa INTEGER DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_coeficientes_nome ON tabelas_coeficientes(nome)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_coeficientes_ativa ON tabelas_coeficientes(ativa)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_coeficientes_tabela_sap ON tabelas_coeficientes(tabela_sap)`);

    // Tabela regras_pos_calculo
    await runQuery(`
      CREATE TABLE IF NOT EXISTS regras_pos_calculo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        tipo_condicao TEXT NOT NULL,
        condicao_valor TEXT,
        condicoes_multiplas TEXT,
        operador_logico TEXT,
        acao TEXT NOT NULL,
        acao_valor TEXT NOT NULL,
        ativo INTEGER DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_regras_nome ON regras_pos_calculo(nome)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_regras_ativo ON regras_pos_calculo(ativo)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_regras_tipo_condicao ON regras_pos_calculo(tipo_condicao)`);

    // Tabela projetos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS projetos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        responsavel TEXT NOT NULL,
        roteiro TEXT,
        observacoes TEXT,
        status TEXT DEFAULT 'Planejamento',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_modificacao DATETIME
      )
    `);

    // Tabela logs_auditoria
    await runQuery(`
      CREATE TABLE IF NOT EXISTS logs_auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabela_afetada TEXT NOT NULL,
        registro_id TEXT NOT NULL,
        operacao TEXT NOT NULL,
        campos_alterados TEXT,
        valores_anteriores TEXT,
        valores_novos TEXT,
        user_id TEXT NOT NULL,
        data_operacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        observacoes TEXT
      )
    `);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_tabela_data ON logs_auditoria(tabela_afetada, data_operacao DESC)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_usuario_data ON logs_auditoria(user_id, data_operacao DESC)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_registro ON logs_auditoria(tabela_afetada, registro_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_operacao ON logs_auditoria(operacao, data_operacao DESC)`);

    console.log('✅ Todas as tabelas foram criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  }
}

module.exports = { createTables };
