const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/coeficientes - Listar coeficientes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, ativo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM tabelas_coeficientes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM tabelas_coeficientes WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (nome LIKE ? OR descricao LIKE ?)';
      countQuery += ' AND (nome LIKE ? OR descricao LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (ativo !== undefined) {
      query += ' AND ativa = ?';
      countQuery += ' AND ativa = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    query += ' ORDER BY nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    const coeficientes = rows.map(row => ({
      ...row,
      parametros_condicao: row.parametros_condicao ? JSON.parse(row.parametros_condicao) : [],
      dados_coeficientes: row.dados_coeficientes ? JSON.parse(row.dados_coeficientes) : [],
      ativa: Boolean(row.ativa)
    }));

    res.json({
      success: true,
      data: coeficientes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar coeficientes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/coeficientes/:id - Buscar coeficiente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Tabela não encontrada'
      });
    }

    const coeficiente = {
      ...row,
      parametros_condicao: row.parametros_condicao ? JSON.parse(row.parametros_condicao) : [],
      dados_coeficientes: row.dados_coeficientes ? JSON.parse(row.dados_coeficientes) : [],
      ativa: Boolean(row.ativa)
    };

    res.json({
      success: true,
      data: coeficiente
    });
  } catch (error) {
    console.error('Erro ao buscar coeficiente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/coeficientes/nome/:nome - Buscar coeficiente por nome
router.get('/nome/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const row = await getRow('SELECT * FROM tabelas_coeficientes WHERE nome = ?', [nome]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Tabela não encontrada'
      });
    }

    const coeficiente = {
      ...row,
      parametros_condicao: row.parametros_condicao ? JSON.parse(row.parametros_condicao) : [],
      dados_coeficientes: row.dados_coeficientes ? JSON.parse(row.dados_coeficientes) : [],
      ativa: Boolean(row.ativa)
    };

    res.json({
      success: true,
      data: coeficiente
    });
  } catch (error) {
    console.error('Erro ao buscar coeficiente por nome:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/coeficientes - Criar novo coeficiente
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, parametros_condicao, dados_coeficientes, tabela_sap, ativa } = req.body;

    if (!nome || !parametros_condicao || !dados_coeficientes) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, parametros_condicao, dados_coeficientes'
      });
    }

    const existing = await getRow('SELECT id FROM tabelas_coeficientes WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma tabela de coeficientes com este nome'
      });
    }

    const query = `
      INSERT INTO tabelas_coeficientes 
      (nome, descricao, parametros_condicao, dados_coeficientes, tabela_sap, ativa, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      JSON.stringify(parametros_condicao),
      JSON.stringify(dados_coeficientes),
      tabela_sap || null,
      ativa !== undefined ? (ativa ? 1 : 0) : 1
    ]);

    const newRecord = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [result.id]);
    const coeficiente = {
      ...newRecord,
      parametros_condicao: JSON.parse(newRecord.parametros_condicao),
      dados_coeficientes: JSON.parse(newRecord.dados_coeficientes),
      ativa: Boolean(newRecord.ativa)
    };

    res.status(201).json({
      success: true,
      data: coeficiente
    });
  } catch (error) {
    console.error('Erro ao criar coeficiente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/coeficientes/:id - Atualizar coeficiente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, parametros_condicao, dados_coeficientes, tabela_sap, ativa } = req.body;

    const existing = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tabela de coeficientes não encontrada'
      });
    }

    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM tabelas_coeficientes WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma tabela de coeficientes com este nome'
        });
      }
    }

    const query = `
      UPDATE tabelas_coeficientes 
      SET nome = ?, descricao = ?, parametros_condicao = ?, dados_coeficientes = ?, 
          tabela_sap = ?, ativa = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      parametros_condicao !== undefined ? JSON.stringify(parametros_condicao) : existing.parametros_condicao,
      dados_coeficientes !== undefined ? JSON.stringify(dados_coeficientes) : existing.dados_coeficientes,
      tabela_sap !== undefined ? tabela_sap : existing.tabela_sap,
      ativa !== undefined ? (ativa ? 1 : 0) : existing.ativa,
      id
    ]);

    const updatedRecord = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    const coeficiente = {
      ...updatedRecord,
      parametros_condicao: JSON.parse(updatedRecord.parametros_condicao),
      dados_coeficientes: JSON.parse(updatedRecord.dados_coeficientes),
      ativa: Boolean(updatedRecord.ativa)
    };

    res.json({
      success: true,
      data: coeficiente
    });
  } catch (error) {
    console.error('Erro ao atualizar coeficiente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PATCH /orbis/coeficientes/:id/desativar - Desativar coeficiente
router.patch('/:id/desativar', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tabela de coeficientes não encontrada'
      });
    }

    await runQuery("UPDATE tabelas_coeficientes SET ativa = 0, data_modificacao = datetime('now') WHERE id = ?", [id]);

    res.json({
      success: true,
      message: 'Tabela de coeficientes desativada com sucesso',
      data: { id: parseInt(id), ativo: false }
    });
  } catch (error) {
    console.error('Erro ao desativar coeficiente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PATCH /orbis/coeficientes/:id/ativar - Ativar coeficiente
router.patch('/:id/ativar', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tabela de coeficientes não encontrada'
      });
    }

    await runQuery("UPDATE tabelas_coeficientes SET ativa = 1, data_modificacao = datetime('now') WHERE id = ?", [id]);

    res.json({
      success: true,
      message: 'Tabela de coeficientes ativada com sucesso',
      data: { id: parseInt(id), ativo: true }
    });
  } catch (error) {
    console.error('Erro ao ativar coeficiente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/coeficientes/:id - Excluir coeficiente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Tabela de coeficientes não encontrada'
      });
    }

    await runQuery('DELETE FROM tabelas_coeficientes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Tabela de coeficientes excluída permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir coeficiente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;
