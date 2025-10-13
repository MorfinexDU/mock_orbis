const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/coeficientes - Listar coeficientes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, categoria, tipo, ativo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM tabelas_coeficientes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM tabelas_coeficientes WHERE 1=1';
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

    if (tipo) {
      query += ' AND tipo = ?';
      countQuery += ' AND tipo = ?';
      params.push(tipo);
    }

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      countQuery += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    // Ordenação e paginação
    query += ' ORDER BY categoria, nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const coeficientes = rows.map(row => ({
      ...row,
      valores: row.valores ? JSON.parse(row.valores) : {},
      ativo: Boolean(row.ativo)
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: coeficientes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
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
        error: 'Coeficiente não encontrado'
      });
    }

    const coeficiente = {
      ...row,
      valores: row.valores ? JSON.parse(row.valores) : {},
      ativo: Boolean(row.ativo)
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

// GET /orbis/coeficientes/categoria/:categoria - Buscar coeficientes por categoria
router.get('/categoria/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const rows = await getAllRows('SELECT * FROM tabelas_coeficientes WHERE categoria = ? ORDER BY nome', [categoria]);

    const coeficientes = rows.map(row => ({
      ...row,
      valores: row.valores ? JSON.parse(row.valores) : {},
      ativo: Boolean(row.ativo)
    }));

    res.json({
      success: true,
      data: coeficientes
    });
  } catch (error) {
    console.error('Erro ao buscar coeficientes por categoria:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/coeficientes/ativos - Listar apenas coeficientes ativos
router.get('/ativos', async (req, res) => {
  try {
    const rows = await getAllRows('SELECT * FROM tabelas_coeficientes WHERE ativo = 1 ORDER BY categoria, nome');

    const coeficientes = rows.map(row => ({
      ...row,
      valores: row.valores ? JSON.parse(row.valores) : {},
      ativo: Boolean(row.ativo)
    }));

    res.json({
      success: true,
      data: coeficientes
    });
  } catch (error) {
    console.error('Erro ao listar coeficientes ativos:', error);
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
    const { nome, categoria, tipo, descricao, valores, unidade, tabela_sap, ativo } = req.body;

    // Validações
    if (!nome || !categoria || !tipo) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, categoria, tipo'
      });
    }

    // Verificar se nome já existe na categoria
    const existing = await getRow('SELECT id FROM tabelas_coeficientes WHERE nome = ? AND categoria = ?', [nome, categoria]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um coeficiente com este nome nesta categoria'
      });
    }

    const query = `
      INSERT INTO tabelas_coeficientes 
      (nome, categoria, tipo, descricao, valores, unidade, tabela_sap, ativo, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      categoria,
      tipo,
      descricao || null,
      valores ? JSON.stringify(valores) : null,
      unidade || null,
      tabela_sap || null,
      ativo !== undefined ? (ativo ? 1 : 0) : 1
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [result.id]);
    const coeficiente = {
      ...newRecord,
      valores: newRecord.valores ? JSON.parse(newRecord.valores) : {},
      ativo: Boolean(newRecord.ativo)
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
    const { nome, categoria, tipo, descricao, valores, unidade, tabela_sap, ativo } = req.body;

    // Verificar se coeficiente existe
    const existing = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Coeficiente não encontrado'
      });
    }

    // Verificar se nome já existe na categoria (exceto o próprio registro)
    if (nome && categoria && (nome !== existing.nome || categoria !== existing.categoria)) {
      const nameExists = await getRow('SELECT id FROM tabelas_coeficientes WHERE nome = ? AND categoria = ? AND id != ?', [nome, categoria, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe um coeficiente com este nome nesta categoria'
        });
      }
    }

    const query = `
      UPDATE tabelas_coeficientes 
      SET nome = ?, categoria = ?, tipo = ?, descricao = ?, valores = ?, 
          unidade = ?, tabela_sap = ?, ativo = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      categoria || existing.categoria,
      tipo || existing.tipo,
      descricao !== undefined ? descricao : existing.descricao,
      valores !== undefined ? (valores ? JSON.stringify(valores) : null) : existing.valores,
      unidade !== undefined ? unidade : existing.unidade,
      tabela_sap !== undefined ? tabela_sap : existing.tabela_sap,
      ativo !== undefined ? (ativo ? 1 : 0) : existing.ativo,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    const coeficiente = {
      ...updatedRecord,
      valores: updatedRecord.valores ? JSON.parse(updatedRecord.valores) : {},
      ativo: Boolean(updatedRecord.ativo)
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

// DELETE /orbis/coeficientes/:id - Excluir coeficiente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se coeficiente existe
    const existing = await getRow('SELECT * FROM tabelas_coeficientes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Coeficiente não encontrado'
      });
    }

    await runQuery('DELETE FROM tabelas_coeficientes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Coeficiente excluído permanentemente'
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