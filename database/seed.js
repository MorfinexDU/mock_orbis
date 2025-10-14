const { runQuery } = require('./connection');

async function seedDatabase() {
  console.log('Populando banco de dados com dados de exemplo...');

  try {
    // Dados para parametros_processo
    const parametros = [
      {
        nome: 'temperatura_operacao',
        tipo: 'number',
        unidade: '°C',
        descricao: 'Temperatura de operação da máquina',
        valor_padrao: '150',
        obrigatorio: 1
      },
      {
        nome: 'velocidade_corte',
        tipo: 'number',
        unidade: 'm/min',
        descricao: 'Velocidade de corte da ferramenta',
        valor_padrao: '300',
        obrigatorio: 1
      },
      {
        nome: 'tipo_material',
        tipo: 'select',
        descricao: 'Tipo de material a ser processado',
        opcoes: JSON.stringify(['Aço 1020', 'Aço 4140', 'Alumínio 6061', 'Latão']),
        obrigatorio: 1
      },
      {
        nome: 'pressao_hidraulica',
        tipo: 'number',
        unidade: 'bar',
        descricao: 'Pressão do sistema hidráulico',
        valor_padrao: '200',
        obrigatorio: 0
      },
      {
        nome: 'refrigeracao_ativa',
        tipo: 'checkbox',
        descricao: 'Refrigeração ativa durante processo',
        valor_padrao: 'true',
        obrigatorio: 0
      }
    ];

    for (const param of parametros) {
      await runQuery(`
        INSERT OR IGNORE INTO parametros_processo 
        (nome, tipo, unidade, descricao, opcoes, valor_padrao, obrigatorio, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [param.nome, param.tipo, param.unidade, param.descricao, param.opcoes || null, param.valor_padrao, param.obrigatorio]);
    }

    // Dados para etapas
    const etapas = [
      {
        nome: 'CORTE LASER',
        descricao: 'Etapa de corte laser',
        centros: 'MP10',
        centros_trabalho: JSON.stringify(['MA303', 'MA301', 'DE103']),
        parametros_necessarios: JSON.stringify([
          'espessura_chapa',
          'material',
          'perimetro',
          'peso_peca',
          'qtd_recortes_laserchapa'
        ]),
        ativa: 1
      },
      {
        nome: 'DESTAQUE',
        descricao: 'Etapa de destaque das peças',
        centros: 'MP10',
        centros_trabalho: JSON.stringify(['DE101', 'DE102']),
        parametros_necessarios: JSON.stringify([
          'material',
          'espessura_chapa',
          'qtd_pecas'
        ]),
        ativa: 1
      },
      {
        nome: 'DOBRADEIRA',
        descricao: 'Etapa de dobra das peças',
        centros: 'MP20',
        centros_trabalho: JSON.stringify(['DB201', 'DB202', 'DB203']),
        parametros_necessarios: JSON.stringify([
          'material',
          'espessura_chapa',
          'angulo_dobra',
          'comprimento_dobra'
        ]),
        ativa: 1
      },
      {
        nome: 'MONTAGEM',
        descricao: 'Etapa de montagem final',
        centros: 'MP30',
        centros_trabalho: JSON.stringify(['MT301', 'MT302']),
        parametros_necessarios: JSON.stringify([
          'qtd_componentes',
          'tipo_fixacao',
          'tempo_montagem'
        ]),
        ativa: 1
      }
    ];

    for (const etapa of etapas) {
      await runQuery(`
        INSERT OR IGNORE INTO etapas 
        (nome, descricao, centros, centros_trabalho, parametros_necessarios, ativa, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [etapa.nome, etapa.descricao, etapa.centros, etapa.centros_trabalho, etapa.parametros_necessarios, etapa.ativa]);
    }

    // Dados para rotas
    const rotas = [
      {
        nome: 'CORTE LASER -> DOBRA -> MONTAGEM',
        descricao: 'Rota para peças cortadas em laser com dobra e montagem',
        sequencia_centros: 'MA303,DB201,MT301',
        centro_prod: 'MP10',
        etapas: JSON.stringify([1, 3, 4]),
        ativa: 1
      },
      {
        nome: 'CORTE LASER -> DESTAQUE',
        descricao: 'Rota simples para peças que precisam apenas de corte e destaque',
        sequencia_centros: 'MA303,DE101',
        centro_prod: 'MP10',
        etapas: JSON.stringify([1, 2]),
        ativa: 1
      },
      {
        nome: 'PROCESSO COMPLETO',
        descricao: 'Rota completa com todas as etapas de produção',
        sequencia_centros: 'MA303,DE101,DB201,MT301',
        centro_prod: 'MP10',
        etapas: JSON.stringify([1, 2, 3, 4]),
        ativa: 1
      }
    ];

    for (const rota of rotas) {
      await runQuery(`
        INSERT OR IGNORE INTO rotas 
        (nome, descricao, sequencia_centros, centro_prod, etapas, ativa, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [rota.nome, rota.descricao, rota.sequencia_centros, rota.centro_prod, rota.etapas, rota.ativa]);
    }

    // Dados para operacoes - Seguindo novo padrão SQL Server
    const operacoes = [
      {
        sequencia: '1',
        centro_producao: 'MP10',
        centro_trabalho: 'MA303',
        chave_controle: 'ZP11',
        chave_modelo: '174',
        descricao: 'Corte laser chapa',
        tempo_homem: 0.006,
        unidade_tempo_homem: 'MIN',
        tempo_maquina: 0.006,
        unidade_tempo_maquina: 'MIN',
        tempo_preparacao: 3,
        unidade_tempo_preparacao: 'MIN',
        formula_tempo_homem: 'perimetro*COEF(corte_laser)+0.014',
        formula_tempo_maquina: 'perimetro*COEF(corte_laser)+0.014',
        formula_tempo_preparacao: 'tempo_base * espessura_chapa',
        condicoes_aplicacao: JSON.stringify([
          { parametro: 'perimetro', operador: '>', valor: '0' },
          { parametro: 'espessura_chapa', operador: '>', valor: '0' }
        ]),
        explicacao_formula_homem: 'Tempo baseado no perímetro e coeficiente de material',
        explicacao_formula_maquina: 'Tempo baseado no perímetro e coeficiente de material',
        explicacao_formula_preparacao: 'Tempo de setup proporcional à espessura',
        regras_pos_calculo: JSON.stringify([
          { idRegraConfigurada: 2, nomeRegraConfigurada: 'ALTERAR_ULTIMA_OP', id_regra_configurada: 2, nome_regra: 'ALTERAR_ULTIMA_OP' }
        ]),
        validar_rota: 1,
        ativo: 1
      },
      {
        sequencia: '2',
        centro_producao: 'MP10',
        centro_trabalho: 'DE101',
        chave_controle: 'ZP12',
        chave_modelo: '175',
        descricao: 'Destaque de peças',
        tempo_homem: 0.5,
        unidade_tempo_homem: 'MIN',
        tempo_maquina: 0,
        unidade_tempo_maquina: 'MIN',
        tempo_preparacao: 1,
        unidade_tempo_preparacao: 'MIN',
        formula_tempo_homem: 'tempo_base * qtd_pecas',
        formula_tempo_maquina: 'tempo_base',
        formula_tempo_preparacao: 'tempo_base',
        condicoes_aplicacao: JSON.stringify([
          { parametro: 'qtd_pecas', operador: '>', valor: '0' }
        ]),
        explicacao_formula_homem: 'Tempo proporcional à quantidade de peças',
        explicacao_formula_maquina: 'Sem tempo de máquina',
        explicacao_formula_preparacao: 'Setup fixo',
        regras_pos_calculo: JSON.stringify([]),
        validar_rota: 1,
        ativo: 1
      }
    ];

    for (const operacao of operacoes) {
      await runQuery(`
        INSERT OR IGNORE INTO operacoes 
        (sequencia, centro_producao, centro_trabalho, chave_controle, chave_modelo, descricao,
         tempo_homem, unidade_tempo_homem, tempo_maquina, unidade_tempo_maquina,
         tempo_preparacao, unidade_tempo_preparacao, formula_tempo_homem, formula_tempo_maquina,
         formula_tempo_preparacao, condicoes_aplicacao, explicacao_formula_homem,
         explicacao_formula_maquina, explicacao_formula_preparacao, regras_pos_calculo,
         validar_rota, ativo, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        operacao.sequencia, operacao.centro_producao, operacao.centro_trabalho,
        operacao.chave_controle, operacao.chave_modelo, operacao.descricao,
        operacao.tempo_homem, operacao.unidade_tempo_homem, operacao.tempo_maquina,
        operacao.unidade_tempo_maquina, operacao.tempo_preparacao, operacao.unidade_tempo_preparacao,
        operacao.formula_tempo_homem, operacao.formula_tempo_maquina, operacao.formula_tempo_preparacao,
        operacao.condicoes_aplicacao, operacao.explicacao_formula_homem,
        operacao.explicacao_formula_maquina, operacao.explicacao_formula_preparacao,
        operacao.regras_pos_calculo, operacao.validar_rota, operacao.ativo
      ]);
    }

    // Dados para tabelas_coeficientes - Seguindo novo padrão SQL Server
    const coeficientes = [
      {
        nome: 'corte_laser',
        descricao: 'Tabela para coeficientes de corte laser chapa',
        parametros_condicao: JSON.stringify([
          { nome: 'material', operador: '==', tipo: 'texto' },
          { nome: 'espessura_chapa', operador: '==', tipo: 'numero_decimal' }
        ]),
        dados_coeficientes: JSON.stringify([
          { material: 'ALUZINC', espessura_chapa: '0.35', coeficiente: '0.00011675840000000' },
          { material: 'ALUZINC', espessura_chapa: '0.75', coeficiente: '0.00004086540000000' },
          { material: 'AÇO GALVANIZADO', espessura_chapa: '0.55', coeficiente: '0.00003669830000000' }
        ]),
        tabela_sap: 'Z_COEF_LASER_001',
        ativa: 1
      },
      {
        nome: 'dobra_chapa',
        descricao: 'Tabela para coeficientes de dobra de chapa',
        parametros_condicao: JSON.stringify([
          { nome: 'material', operador: '==', tipo: 'texto' },
          { nome: 'espessura_chapa', operador: 'ENTRE', tipo: 'numero_decimal' }
        ]),
        dados_coeficientes: JSON.stringify([
          { material: 'AÇO CARBONO', espessura_chapa: '0.5-2.0', coeficiente: '1.2' },
          { material: 'AÇO INOX', espessura_chapa: '0.5-2.0', coeficiente: '1.5' },
          { material: 'ALUMÍNIO', espessura_chapa: '0.5-3.0', coeficiente: '0.8' }
        ]),
        tabela_sap: 'Z_COEF_DOBRA_001',
        ativa: 1
      }
    ];

    for (const coef of coeficientes) {
      await runQuery(`
        INSERT OR IGNORE INTO tabelas_coeficientes 
        (nome, descricao, parametros_condicao, dados_coeficientes, tabela_sap, ativa, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [coef.nome, coef.descricao, coef.parametros_condicao, coef.dados_coeficientes, coef.tabela_sap, coef.ativa]);
    }

    // Dados para regras_pos_calculo - Seguindo novo padrão SQL Server
    const regras = [
      {
        nome: 'ALTERAR_ULTIMA_OP',
        descricao: 'Alterar chave de controle da última operação do roteiro',
        tipo_condicao: 'ultima_operacao',
        condicao_valor: null,
        condicoes_multiplas: JSON.stringify([]),
        operador_logico: 'E',
        acao: 'alterar_chave_controle',
        acao_valor: 'ZP99',
        ativo: 1
      },
      {
        nome: 'REMOVER_OPERACAO_DOBRA_SIMPLES',
        descricao: 'Remove operação de dobra quando qtd_dobras <= 2 e espessura < 1.0mm',
        tipo_condicao: 'multiplas',
        condicao_valor: null,
        condicoes_multiplas: JSON.stringify([
          { parametro: 'qtd_dobras', operador: '<=', valor: '2' },
          { parametro: 'espessura_chapa', operador: '<', valor: '1.0' }
        ]),
        operador_logico: 'E',
        acao: 'remover_operacao',
        acao_valor: 'DA101',
        ativo: 1
      }
    ];

    for (const regra of regras) {
      await runQuery(`
        INSERT OR IGNORE INTO regras_pos_calculo 
        (nome, descricao, tipo_condicao, condicao_valor, condicoes_multiplas, operador_logico, acao, acao_valor, ativo, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [regra.nome, regra.descricao, regra.tipo_condicao, regra.condicao_valor, regra.condicoes_multiplas, regra.operador_logico, regra.acao, regra.acao_valor, regra.ativo]);
    }

    // Dados para projetos
    const projetos = [
      {
        nome: 'Projeto Piloto - Peças Automotivas',
        descricao: 'Projeto piloto para produção de componentes automotivos',
        responsavel: 'João Silva',
        roteiro: JSON.stringify({
          rotas: [
            { rota_id: 1, sequencia: 1, quantidade: 50 },
            { rota_id: 2, sequencia: 2, quantidade: 10 }
          ],
          configuracoes_globais: {
            prazo_entrega: '2024-02-15',
            nivel_qualidade: 'Alto'
          }
        }),
        status: 'Em Andamento'
      },
      {
        nome: 'Desenvolvimento de Novo Processo',
        descricao: 'Desenvolvimento de processo para peças de precisão',
        responsavel: 'Maria Santos',
        roteiro: JSON.stringify({
          rotas: [
            { rota_id: 1, sequencia: 1, quantidade: 5 }
          ],
          configuracoes_globais: {
            prazo_entrega: '2024-03-01',
            nivel_qualidade: 'Muito Alto'
          }
        }),
        status: 'Planejamento'
      }
    ];

    for (const projeto of projetos) {
      await runQuery(`
        INSERT OR IGNORE INTO projetos 
        (nome, descricao, responsavel, roteiro, status, data_criacao)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [projeto.nome, projeto.descricao, projeto.responsavel, projeto.roteiro, projeto.status]);
    }

    console.log('✅ Banco de dados populado com dados de exemplo!');
    
  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error);
    throw error;
  }
}

module.exports = { seedDatabase };
