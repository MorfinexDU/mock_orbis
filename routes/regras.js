const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/regras - Listar regras
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, tipo, ativo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM regras_pos_calculo WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM regras_pos_calculo WHERE 1=1';
    let params = [];

    // Filtros
    if (search) {
      query += ' AND (nome LIKE ? OR descricao LIKE ?)';
      countQuery += ' AND (nome LIKE ? OR descricao LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
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
    query += ' ORDER BY ordem, nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const regras = rows.map(row => ({
      ...row,
      condicoes: row.condicoes ? JSON.parse(row.condicoes) : {},
      acoes: row.acoes ? JSON.parse(row.acoes) : {},
      ativo: Boolean(row.ativo)
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: regras,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar regras:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/regras/:id - Buscar regra por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    const regra = {
      ...row,
      condicoes: row.condicoes ? JSON.parse(row.condicoes) : {},
      acoes: row.acoes ? JSON.parse(row.acoes) : {},
      ativo: Boolean(row.ativo)
    };

    res.json({
      success: true,
      data: regra
    });
  } catch (error) {
    console.error('Erro ao buscar regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/regras/tipo/:tipo - Buscar regras por tipo
router.get('/tipo/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;
    const rows = await getAllRows('SELECT * FROM regras_pos_calculo WHERE tipo = ? ORDER BY ordem, nome', [tipo]);

    const regras = rows.map(row => ({
      ...row,
      condicoes: row.condicoes ? JSON.parse(row.condicoes) : {},
      acoes: row.acoes ? JSON.parse(row.acoes) : {},
      ativo: Boolean(row.ativo)
    }));

    res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    console.error('Erro ao buscar regras por tipo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/regras/ativas - Listar apenas regras ativas ordenadas por ordem
router.get('/ativas', async (req, res) => {
  try {
    const rows = await getAllRows('SELECT * FROM regras_pos_calculo WHERE ativo = 1 ORDER BY ordem, nome');

    const regras = rows.map(row => ({
      ...row,
      condicoes: row.condicoes ? JSON.parse(row.condicoes) : {},
      acoes: row.acoes ? JSON.parse(row.acoes) : {},
      ativo: Boolean(row.ativo)
    }));

    res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    console.error('Erro ao listar regras ativas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/regras - Criar nova regra
router.post('/', async (req, res) => {
  try {
    const { 
      nome, 
      descricao, 
      tipo, 
      condicoes, 
      acoes, 
      ordem, 
      prioridade, 
      observacoes, 
      ativo 
    } = req.body;

    // Validações
    if (!nome || !tipo || !condicoes || !acoes) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, tipo, condicoes, acoes'
      });
    }

    // Verificar se nome já existe
    const existing = await getRow('SELECT id FROM regras_pos_calculo WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma regra com este nome'
      });
    }

    const query = `
      INSERT INTO regras_pos_calculo 
      (nome, descricao, tipo, condicoes, acoes, ordem, prioridade, observacoes, ativo, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      tipo,
      JSON.stringify(condicoes),
      JSON.stringify(acoes),
      ordem || null,
      prioridade || 1,
      observacoes || null,
      ativo !== undefined ? (ativo ? 1 : 0) : 1
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [result.id]);
    const regra = {
      ...newRecord,
      condicoes: newRecord.condicoes ? JSON.parse(newRecord.condicoes) : {},
      acoes: newRecord.acoes ? JSON.parse(newRecord.acoes) : {},
      ativo: Boolean(newRecord.ativo)
    };

    res.status(201).json({
      success: true,
      data: regra
    });
  } catch (error) {
    console.error('Erro ao criar regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/regras/:id - Atualizar regra
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, 
      descricao, 
      tipo, 
      condicoes, 
      acoes, 
      ordem, 
      prioridade, 
      observacoes, 
      ativo 
    } = req.body;

    // Verificar se regra existe
    const existing = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    // Verificar se nome já existe (exceto o próprio registro)
    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM regras_pos_calculo WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma regra com este nome'
        });
      }
    }

    const query = `
      UPDATE regras_pos_calculo 
      SET nome = ?, descricao = ?, tipo = ?, condicoes = ?, acoes = ?, 
          ordem = ?, prioridade = ?, observacoes = ?, ativo = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      tipo || existing.tipo,
      condicoes !== undefined ? JSON.stringify(condicoes) : existing.condicoes,
      acoes !== undefined ? JSON.stringify(acoes) : existing.acoes,
      ordem !== undefined ? ordem : existing.ordem,
      prioridade !== undefined ? prioridade : existing.prioridade,
      observacoes !== undefined ? observacoes : existing.observacoes,
      ativo !== undefined ? (ativo ? 1 : 0) : existing.ativo,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    const regra = {
      ...updatedRecord,
      condicoes: updatedRecord.condicoes ? JSON.parse(updatedRecord.condicoes) : {},
      acoes: updatedRecord.acoes ? JSON.parse(updatedRecord.acoes) : {},
      ativo: Boolean(updatedRecord.ativo)
    };

    res.json({
      success: true,
      data: regra
    });
  } catch (error) {
    console.error('Erro ao atualizar regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/regras/:id - Excluir regra
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se regra existe
    const existing = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    await runQuery('DELETE FROM regras_pos_calculo WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Regra excluída permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;