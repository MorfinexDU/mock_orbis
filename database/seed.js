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
        nome: 'Preparação da Máquina',
        categoria: 'Setup',
        ordem: 1,
        tempo_estimado_minutos: 30,
        parametros_necessarios: JSON.stringify(['temperatura_operacao', 'pressao_hidraulica']),
        configuracoes: JSON.stringify({ verificar_niveis: true, calibrar_sensores: true })
      },
      {
        nome: 'Corte Primário',
        categoria: 'Produção',
        ordem: 1,
        tempo_estimado_minutos: 15,
        parametros_necessarios: JSON.stringify(['velocidade_corte', 'tipo_material', 'refrigeracao_ativa']),
        configuracoes: JSON.stringify({ tolerancia_dimensional: 0.1, acabamento_superficial: 'Ra 1.6' })
      },
      {
        nome: 'Inspeção Dimensional',
        categoria: 'Qualidade',
        ordem: 1,
        tempo_estimado_minutos: 10,
        parametros_necessarios: JSON.stringify([]),
        configuracoes: JSON.stringify({ pontos_medicao: 5, instrumento: 'Paquímetro digital' })
      },
      {
        nome: 'Limpeza Final',
        categoria: 'Acabamento',
        ordem: 1,
        tempo_estimado_minutos: 5,
        parametros_necessarios: JSON.stringify([]),
        configuracoes: JSON.stringify({ metodo_limpeza: 'Ar comprimido', verificar_rebarbas: true })
      }
    ];

    for (const etapa of etapas) {
      await runQuery(`
        INSERT OR IGNORE INTO etapas 
        (nome, categoria, ordem, tempo_estimado_minutos, parametros_necessarios, configuracoes, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [etapa.nome, etapa.categoria, etapa.ordem, etapa.tempo_estimado_minutos, etapa.parametros_necessarios, etapa.configuracoes]);
    }

    // Dados para rotas
    const rotas = [
      {
        nome: 'Processo Padrão de Usinagem',
        descricao: 'Rota padrão para peças usinadas simples',
        etapas: JSON.stringify([
          { etapa_id: 1, ordem: 1, parametros_customizados: {} },
          { etapa_id: 2, ordem: 2, parametros_customizados: {} },
          { etapa_id: 3, ordem: 3, parametros_customizados: {} },
          { etapa_id: 4, ordem: 4, parametros_customizados: {} }
        ]),
        configuracoes: JSON.stringify({ tempo_total_estimado: 60, nivel_complexidade: 'Básico' }),
        ativo: 1
      },
      {
        nome: 'Processo Expresso',
        descricao: 'Rota rápida para produção urgente',
        etapas: JSON.stringify([
          { etapa_id: 1, ordem: 1, parametros_customizados: { tempo_estimado_minutos: 15 } },
          { etapa_id: 2, ordem: 2, parametros_customizados: { velocidade_corte: 400 } }
        ]),
        configuracoes: JSON.stringify({ tempo_total_estimado: 30, nivel_complexidade: 'Rápido' }),
        ativo: 1
      }
    ];

    for (const rota of rotas) {
      await runQuery(`
        INSERT OR IGNORE INTO rotas 
        (nome, descricao, etapas, configuracoes, ativo, data_criacao)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [rota.nome, rota.descricao, rota.etapas, rota.configuracoes, rota.ativo]);
    }

    // Dados para operacoes
    const operacoes = [
      {
        nome: 'Torneamento Cilíndrico',
        categoria: 'Usinagem',
        tipo_maquina: 'Torno CNC',
        tipo_operacao: 'Torneamento',
        codigo_sap: 'OP001',
        tempo_setup_min: 45,
        tempo_processamento_min: 12,
        custo_hora_operacao: 120.50,
        taxa_refugo_padrao: 0.02,
        condicoes_aplicacao: JSON.stringify({
          material_compativel: ['Aço 1020', 'Aço 4140'],
          diametro_max: 200,
          comprimento_max: 500
        }),
        configuracoes_avancadas: JSON.stringify({
          rpm_recomendado: 1200,
          avanco_mm_rev: 0.3,
          profundidade_corte: 2.0
        }),
        parametros_processo: JSON.stringify(['velocidade_corte', 'tipo_material', 'refrigeracao_ativa'])
      },
      {
        nome: 'Fresamento de Face',
        categoria: 'Usinagem',
        tipo_maquina: 'Centro de Usinagem',
        tipo_operacao: 'Fresamento',
        codigo_sap: 'OP002',
        tempo_setup_min: 30,
        tempo_processamento_min: 8,
        custo_hora_operacao: 150.00,
        taxa_refugo_padrao: 0.015,
        condicoes_aplicacao: JSON.stringify({
          material_compativel: ['Aço 1020', 'Alumínio 6061'],
          area_max: 400,
          espessura_max: 50
        }),
        configuracoes_avancadas: JSON.stringify({
          rpm_recomendado: 2500,
          avanco_mm_min: 800,
          profundidade_corte: 1.5
        }),
        parametros_processo: JSON.stringify(['velocidade_corte', 'tipo_material'])
      }
    ];

    for (const operacao of operacoes) {
      await runQuery(`
        INSERT OR IGNORE INTO operacoes 
        (nome, categoria, tipo_maquina, tipo_operacao, codigo_sap, tempo_setup_min, 
         tempo_processamento_min, custo_hora_operacao, taxa_refugo_padrao, 
         condicoes_aplicacao, configuracoes_avancadas, parametros_processo, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        operacao.nome, operacao.categoria, operacao.tipo_maquina, operacao.tipo_operacao,
        operacao.codigo_sap, operacao.tempo_setup_min, operacao.tempo_processamento_min,
        operacao.custo_hora_operacao, operacao.taxa_refugo_padrao, operacao.condicoes_aplicacao,
        operacao.configuracoes_avancadas, operacao.parametros_processo
      ]);
    }

    // Dados para tabelas_coeficientes
    const coeficientes = [
      {
        nome: 'Fator Dificuldade Material',
        categoria: 'Material',
        tipo: 'tabela',
        descricao: 'Coeficientes de dificuldade por tipo de material',
        valores: JSON.stringify({
          'Aço 1020': 1.0,
          'Aço 4140': 1.3,
          'Alumínio 6061': 0.7,
          'Latão': 0.8
        }),
        unidade: 'fator',
        tabela_sap: 'MAT_COEF_001',
        ativo: 1
      },
      {
        nome: 'Fator Complexidade Geométrica',
        categoria: 'Geometria',
        tipo: 'escalonado',
        descricao: 'Coeficientes baseados na complexidade da peça',
        valores: JSON.stringify({
          'Simples': 1.0,
          'Média': 1.4,
          'Complexa': 1.8,
          'Muito Complexa': 2.5
        }),
        unidade: 'fator',
        tabela_sap: 'GEO_COEF_001',
        ativo: 1
      }
    ];

    for (const coef of coeficientes) {
      await runQuery(`
        INSERT OR IGNORE INTO tabelas_coeficientes 
        (nome, categoria, tipo, descricao, valores, unidade, tabela_sap, ativo, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [coef.nome, coef.categoria, coef.tipo, coef.descricao, coef.valores, coef.unidade, coef.tabela_sap, coef.ativo]);
    }

    // Dados para regras_pos_calculo
    const regras = [
      {
        nome: 'Ajuste por Material Difícil',
        tipo: 'condicional',
        condicoes: JSON.stringify({
          material: ['Aço 4140'],
          operacao_tipo: 'Torneamento'
        }),
        acoes: JSON.stringify({
          multiplicar_tempo: 1.3,
          adicionar_setup: 15,
          observacao: 'Material de alta dureza requer setup adicional'
        }),
        ordem: 1,
        prioridade: 2,
        ativo: 1
      },
      {
        nome: 'Desconto para Lote Grande',
        tipo: 'economia_escala',
        condicoes: JSON.stringify({
          quantidade: { maior_que: 100 }
        }),
        acoes: JSON.stringify({
          multiplicar_custo: 0.85,
          observacao: 'Desconto de 15% para lotes acima de 100 peças'
        }),
        ordem: 2,
        prioridade: 1,
        ativo: 1
      }
    ];

    for (const regra of regras) {
      await runQuery(`
        INSERT OR IGNORE INTO regras_pos_calculo 
        (nome, tipo, condicoes, acoes, ordem, prioridade, ativo, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [regra.nome, regra.tipo, regra.condicoes, regra.acoes, regra.ordem, regra.prioridade, regra.ativo]);
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