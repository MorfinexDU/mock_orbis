const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/operacoes - Listar operações
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, categoria, tipo_maquina, tipo_operacao } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM operacoes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM operacoes WHERE 1=1';
    let params = [];

    // Filtros
    if (search) {
      query += ' AND (nome LIKE ? OR descricao LIKE ?)';
      countQuery += ' AND (nome LIKE ? OR descricao LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoria) {
      query += ' AND categoria = ?';
      countQuery += ' AND categoria = ?';
      params.push(categoria);
    }

    if (tipo_maquina) {
      query += ' AND tipo_maquina = ?';
      countQuery += ' AND tipo_maquina = ?';
      params.push(tipo_maquina);
    }

    if (tipo_operacao) {
      query += ' AND tipo_operacao = ?';
      countQuery += ' AND tipo_operacao = ?';
      params.push(tipo_operacao);
    }

    // Ordenação e paginação
    query += ' ORDER BY categoria, nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const operacoes = rows.map(row => ({
      ...row,
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : {},
      configuracoes_avancadas: row.configuracoes_avancadas ? JSON.parse(row.configuracoes_avancadas) : {},
      parametros_processo: row.parametros_processo ? JSON.parse(row.parametros_processo) : []
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: operacoes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar operações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/operacoes/:id - Buscar operação por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Operação não encontrada'
      });
    }

    const operacao = {
      ...row,
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : {},
      configuracoes_avancadas: row.configuracoes_avancadas ? JSON.parse(row.configuracoes_avancadas) : {},
      parametros_processo: row.parametros_processo ? JSON.parse(row.parametros_processo) : []
    };

    res.json({
      success: true,
      data: operacao
    });
  } catch (error) {
    console.error('Erro ao buscar operação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/operacoes/categoria/:categoria - Buscar operações por categoria
router.get('/categoria/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const rows = await getAllRows('SELECT * FROM operacoes WHERE categoria = ? ORDER BY nome', [categoria]);

    const operacoes = rows.map(row => ({
      ...row,
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : {},
      configuracoes_avancadas: row.configuracoes_avancadas ? JSON.parse(row.configuracoes_avancadas) : {},
      parametros_processo: row.parametros_processo ? JSON.parse(row.parametros_processo) : []
    }));

    res.json({
      success: true,
      data: operacoes
    });
  } catch (error) {
    console.error('Erro ao buscar operações por categoria:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/operacoes/tipo/:tipo_maquina - Buscar operações por tipo de máquina
router.get('/tipo/:tipo_maquina', async (req, res) => {
  try {
    const { tipo_maquina } = req.params;
    const rows = await getAllRows('SELECT * FROM operacoes WHERE tipo_maquina = ? ORDER BY categoria, nome', [tipo_maquina]);

    const operacoes = rows.map(row => ({
      ...row,
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : {},
      configuracoes_avancadas: row.configuracoes_avancadas ? JSON.parse(row.configuracoes_avancadas) : {},
      parametros_processo: row.parametros_processo ? JSON.parse(row.parametros_processo) : []
    }));

    res.json({
      success: true,
      data: operacoes
    });
  } catch (error) {
    console.error('Erro ao buscar operações por tipo de máquina:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/operacoes - Criar nova operação
router.post('/', async (req, res) => {
  try {
    const { 
      nome,
      categoria,
      descricao,
      tipo_maquina,
      tipo_operacao,
      codigo_sap,
      tempo_setup_min,
      tempo_processamento_min,
      custo_hora_operacao,
      taxa_refugo_padrao,
      condicoes_aplicacao,
      configuracoes_avancadas,
      parametros_processo,
      observacoes_tecnicas
    } = req.body;

    // Validações
    if (!nome || !categoria || !tipo_maquina) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, categoria, tipo_maquina'
      });
    }

    // Verificar se já existe operação com mesmo nome e tipo de máquina
    const existing = await getRow(
      'SELECT id FROM operacoes WHERE nome = ? AND tipo_maquina = ?', 
      [nome, tipo_maquina]
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma operação com este nome para este tipo de máquina'
      });
    }

    const query = `
      INSERT INTO operacoes 
      (nome, categoria, descricao, tipo_maquina, tipo_operacao, codigo_sap, tempo_setup_min, 
       tempo_processamento_min, custo_hora_operacao, taxa_refugo_padrao, condicoes_aplicacao, 
       configuracoes_avancadas, parametros_processo, observacoes_tecnicas, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      categoria,
      descricao || null,
      tipo_maquina,
      tipo_operacao || null,
      codigo_sap || null,
      tempo_setup_min || null,
      tempo_processamento_min || null,
      custo_hora_operacao || null,
      taxa_refugo_padrao || null,
      condicoes_aplicacao ? JSON.stringify(condicoes_aplicacao) : null,
      configuracoes_avancadas ? JSON.stringify(configuracoes_avancadas) : null,
      parametros_processo ? JSON.stringify(parametros_processo) : null,
      observacoes_tecnicas || null
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM operacoes WHERE id = ?', [result.id]);
    const operacao = {
      ...newRecord,
      condicoes_aplicacao: newRecord.condicoes_aplicacao ? JSON.parse(newRecord.condicoes_aplicacao) : {},
      configuracoes_avancadas: newRecord.configuracoes_avancadas ? JSON.parse(newRecord.configuracoes_avancadas) : {},
      parametros_processo: newRecord.parametros_processo ? JSON.parse(newRecord.parametros_processo) : []
    };

    res.status(201).json({
      success: true,
      data: operacao
    });
  } catch (error) {
    console.error('Erro ao criar operação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/operacoes/:id - Atualizar operação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome,
      categoria,
      descricao,
      tipo_maquina,
      tipo_operacao,
      codigo_sap,
      tempo_setup_min,
      tempo_processamento_min,
      custo_hora_operacao,
      taxa_refugo_padrao,
      condicoes_aplicacao,
      configuracoes_avancadas,
      parametros_processo,
      observacoes_tecnicas
    } = req.body;

    // Verificar se operação existe
    const existing = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operação não encontrada'
      });
    }

    // Verificar se já existe operação com mesmo nome e tipo de máquina (exceto o próprio registro)
    if (nome && tipo_maquina && (nome !== existing.nome || tipo_maquina !== existing.tipo_maquina)) {
      const nameExists = await getRow(
        'SELECT id FROM operacoes WHERE nome = ? AND tipo_maquina = ? AND id != ?', 
        [nome, tipo_maquina, id]
      );
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma operação com este nome para este tipo de máquina'
        });
      }
    }

    const query = `
      UPDATE operacoes 
      SET nome = ?, categoria = ?, descricao = ?, tipo_maquina = ?, tipo_operacao = ?, 
          codigo_sap = ?, tempo_setup_min = ?, tempo_processamento_min = ?, custo_hora_operacao = ?, 
          taxa_refugo_padrao = ?, condicoes_aplicacao = ?, configuracoes_avancadas = ?, 
          parametros_processo = ?, observacoes_tecnicas = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      categoria || existing.categoria,
      descricao !== undefined ? descricao : existing.descricao,
      tipo_maquina || existing.tipo_maquina,
      tipo_operacao !== undefined ? tipo_operacao : existing.tipo_operacao,
      codigo_sap !== undefined ? codigo_sap : existing.codigo_sap,
      tempo_setup_min !== undefined ? tempo_setup_min : existing.tempo_setup_min,
      tempo_processamento_min !== undefined ? tempo_processamento_min : existing.tempo_processamento_min,
      custo_hora_operacao !== undefined ? custo_hora_operacao : existing.custo_hora_operacao,
      taxa_refugo_padrao !== undefined ? taxa_refugo_padrao : existing.taxa_refugo_padrao,
      condicoes_aplicacao !== undefined ? (condicoes_aplicacao ? JSON.stringify(condicoes_aplicacao) : null) : existing.condicoes_aplicacao,
      configuracoes_avancadas !== undefined ? (configuracoes_avancadas ? JSON.stringify(configuracoes_avancadas) : null) : existing.configuracoes_avancadas,
      parametros_processo !== undefined ? (parametros_processo ? JSON.stringify(parametros_processo) : null) : existing.parametros_processo,
      observacoes_tecnicas !== undefined ? observacoes_tecnicas : existing.observacoes_tecnicas,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    const operacao = {
      ...updatedRecord,
      condicoes_aplicacao: updatedRecord.condicoes_aplicacao ? JSON.parse(updatedRecord.condicoes_aplicacao) : {},
      configuracoes_avancadas: updatedRecord.configuracoes_avancadas ? JSON.parse(updatedRecord.configuracoes_avancadas) : {},
      parametros_processo: updatedRecord.parametros_processo ? JSON.parse(updatedRecord.parametros_processo) : []
    };

    res.json({
      success: true,
      data: operacao
    });
  } catch (error) {
    console.error('Erro ao atualizar operação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/operacoes/:id - Excluir operação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se operação existe
    const existing = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operação não encontrada'
      });
    }

    await runQuery('DELETE FROM operacoes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Operação excluída permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir operação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;