const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/operacoes - Listar operações
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, sequencia, centro_trabalho, centro_producao, ativo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM operacoes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM operacoes WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (descricao LIKE ? OR centro_trabalho LIKE ?)';
      countQuery += ' AND (descricao LIKE ? OR centro_trabalho LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sequencia) {
      query += ' AND sequencia = ?';
      countQuery += ' AND sequencia = ?';
      params.push(sequencia);
    }

    if (centro_trabalho) {
      query += ' AND centro_trabalho = ?';
      countQuery += ' AND centro_trabalho = ?';
      params.push(centro_trabalho);
    }

    if (centro_producao) {
      query += ' AND centro_producao = ?';
      countQuery += ' AND centro_producao = ?';
      params.push(centro_producao);
    }

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      countQuery += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    query += ' ORDER BY centro_producao, centro_trabalho, sequencia LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    const operacoes = rows.map(row => ({
      ...row,
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : [],
      regras_pos_calculo: row.regras_pos_calculo ? JSON.parse(row.regras_pos_calculo) : [],
      ativo: Boolean(row.ativo),
      validar_rota: Boolean(row.validar_rota)
    }));

    res.json({
      success: true,
      data: operacoes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
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
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : [],
      regras_pos_calculo: row.regras_pos_calculo ? JSON.parse(row.regras_pos_calculo) : [],
      ativo: Boolean(row.ativo),
      validar_rota: Boolean(row.validar_rota)
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

// GET /orbis/operacoes/centro_trabalho/:centro_trabalho - Buscar operações por centro de trabalho
router.get('/centro_trabalho/:centro_trabalho', async (req, res) => {
  try {
    const { centro_trabalho } = req.params;
    const rows = await getAllRows('SELECT * FROM operacoes WHERE centro_trabalho = ? ORDER BY sequencia', [centro_trabalho]);

    const operacoes = rows.map(row => ({
      ...row,
      condicoes_aplicacao: row.condicoes_aplicacao ? JSON.parse(row.condicoes_aplicacao) : [],
      regras_pos_calculo: row.regras_pos_calculo ? JSON.parse(row.regras_pos_calculo) : [],
      ativo: Boolean(row.ativo),
      validar_rota: Boolean(row.validar_rota)
    }));

    res.json({
      success: true,
      data: operacoes
    });
  } catch (error) {
    console.error('Erro ao buscar operações por centro de trabalho:', error);
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
      sequencia, centro_producao, centro_trabalho, chave_controle, chave_modelo, descricao,
      tempo_homem, unidade_tempo_homem, tempo_maquina, unidade_tempo_maquina,
      tempo_preparacao, unidade_tempo_preparacao, formula_tempo_homem, formula_tempo_maquina,
      formula_tempo_preparacao, condicoes_aplicacao, explicacao_formula_homem,
      explicacao_formula_maquina, explicacao_formula_preparacao, regras_pos_calculo,
      validar_rota, ativo
    } = req.body;

    if (!sequencia || !centro_producao || !centro_trabalho || !chave_controle || !chave_modelo || !descricao) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: sequencia, centro_producao, centro_trabalho, chave_controle, chave_modelo, descricao'
      });
    }

    const query = `
      INSERT INTO operacoes 
      (sequencia, centro_producao, centro_trabalho, chave_controle, chave_modelo, descricao,
       tempo_homem, unidade_tempo_homem, tempo_maquina, unidade_tempo_maquina,
       tempo_preparacao, unidade_tempo_preparacao, formula_tempo_homem, formula_tempo_maquina,
       formula_tempo_preparacao, condicoes_aplicacao, explicacao_formula_homem,
       explicacao_formula_maquina, explicacao_formula_preparacao, regras_pos_calculo,
       validar_rota, ativo, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      sequencia, centro_producao, centro_trabalho, chave_controle, chave_modelo, descricao,
      tempo_homem || 0, unidade_tempo_homem || 'MIN', tempo_maquina || 0, unidade_tempo_maquina || 'MIN',
      tempo_preparacao || 0, unidade_tempo_preparacao || 'MIN', 
      formula_tempo_homem || 'tempo_base', formula_tempo_maquina || 'tempo_base',
      formula_tempo_preparacao || 'tempo_base', 
      condicoes_aplicacao ? JSON.stringify(condicoes_aplicacao) : '[]',
      explicacao_formula_homem || '', explicacao_formula_maquina || '', explicacao_formula_preparacao || '',
      regras_pos_calculo ? JSON.stringify(regras_pos_calculo) : '[]',
      validar_rota !== undefined ? (validar_rota ? 1 : 0) : 1,
      ativo !== undefined ? (ativo ? 1 : 0) : 1
    ]);

    const newRecord = await getRow('SELECT * FROM operacoes WHERE id = ?', [result.id]);
    const operacao = {
      ...newRecord,
      condicoes_aplicacao: JSON.parse(newRecord.condicoes_aplicacao),
      regras_pos_calculo: JSON.parse(newRecord.regras_pos_calculo),
      ativo: Boolean(newRecord.ativo),
      validar_rota: Boolean(newRecord.validar_rota)
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
      sequencia, centro_producao, centro_trabalho, chave_controle, chave_modelo, descricao,
      tempo_homem, unidade_tempo_homem, tempo_maquina, unidade_tempo_maquina,
      tempo_preparacao, unidade_tempo_preparacao, formula_tempo_homem, formula_tempo_maquina,
      formula_tempo_preparacao, condicoes_aplicacao, explicacao_formula_homem,
      explicacao_formula_maquina, explicacao_formula_preparacao, regras_pos_calculo,
      validar_rota, ativo
    } = req.body;

    const existing = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operação não encontrada'
      });
    }

    const query = `
      UPDATE operacoes 
      SET sequencia = ?, centro_producao = ?, centro_trabalho = ?, chave_controle = ?, chave_modelo = ?, descricao = ?,
          tempo_homem = ?, unidade_tempo_homem = ?, tempo_maquina = ?, unidade_tempo_maquina = ?,
          tempo_preparacao = ?, unidade_tempo_preparacao = ?, formula_tempo_homem = ?, formula_tempo_maquina = ?,
          formula_tempo_preparacao = ?, condicoes_aplicacao = ?, explicacao_formula_homem = ?,
          explicacao_formula_maquina = ?, explicacao_formula_preparacao = ?, regras_pos_calculo = ?,
          validar_rota = ?, ativo = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      sequencia || existing.sequencia,
      centro_producao || existing.centro_producao,
      centro_trabalho || existing.centro_trabalho,
      chave_controle || existing.chave_controle,
      chave_modelo || existing.chave_modelo,
      descricao || existing.descricao,
      tempo_homem !== undefined ? tempo_homem : existing.tempo_homem,
      unidade_tempo_homem || existing.unidade_tempo_homem,
      tempo_maquina !== undefined ? tempo_maquina : existing.tempo_maquina,
      unidade_tempo_maquina || existing.unidade_tempo_maquina,
      tempo_preparacao !== undefined ? tempo_preparacao : existing.tempo_preparacao,
      unidade_tempo_preparacao || existing.unidade_tempo_preparacao,
      formula_tempo_homem || existing.formula_tempo_homem,
      formula_tempo_maquina || existing.formula_tempo_maquina,
      formula_tempo_preparacao || existing.formula_tempo_preparacao,
      condicoes_aplicacao !== undefined ? JSON.stringify(condicoes_aplicacao) : existing.condicoes_aplicacao,
      explicacao_formula_homem !== undefined ? explicacao_formula_homem : existing.explicacao_formula_homem,
      explicacao_formula_maquina !== undefined ? explicacao_formula_maquina : existing.explicacao_formula_maquina,
      explicacao_formula_preparacao !== undefined ? explicacao_formula_preparacao : existing.explicacao_formula_preparacao,
      regras_pos_calculo !== undefined ? JSON.stringify(regras_pos_calculo) : existing.regras_pos_calculo,
      validar_rota !== undefined ? (validar_rota ? 1 : 0) : existing.validar_rota,
      ativo !== undefined ? (ativo ? 1 : 0) : existing.ativo,
      id
    ]);

    const updatedRecord = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    const operacao = {
      ...updatedRecord,
      condicoes_aplicacao: JSON.parse(updatedRecord.condicoes_aplicacao),
      regras_pos_calculo: JSON.parse(updatedRecord.regras_pos_calculo),
      ativo: Boolean(updatedRecord.ativo),
      validar_rota: Boolean(updatedRecord.validar_rota)
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

// PATCH /orbis/operacoes/:id/desativar - Desativar operação
router.patch('/:id/desativar', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operação não encontrada'
      });
    }

    await runQuery("UPDATE operacoes SET ativo = 0, data_modificacao = datetime('now') WHERE id = ?", [id]);

    res.json({
      success: true,
      message: 'Operação desativada com sucesso',
      data: { id: parseInt(id), ativo: false }
    });
  } catch (error) {
    console.error('Erro ao desativar operação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PATCH /orbis/operacoes/:id/ativar - Ativar operação
router.patch('/:id/ativar', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getRow('SELECT * FROM operacoes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operação não encontrada'
      });
    }

    await runQuery("UPDATE operacoes SET ativo = 1, data_modificacao = datetime('now') WHERE id = ?", [id]);

    res.json({
      success: true,
      message: 'Operação ativada com sucesso',
      data: { id: parseInt(id), ativo: true }
    });
  } catch (error) {
    console.error('Erro ao ativar operação:', error);
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
