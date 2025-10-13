const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/etapas - Listar etapas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, categoria } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM etapas WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM etapas WHERE 1=1';
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

    // Ordenação e paginação
    query += ' ORDER BY categoria, ordem, nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const etapas = rows.map(row => ({
      ...row,
      parametros_necessarios: row.parametros_necessarios ? JSON.parse(row.parametros_necessarios) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {}
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: etapas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar etapas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/etapas/:id - Buscar etapa por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM etapas WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Etapa não encontrada'
      });
    }

    const etapa = {
      ...row,
      parametros_necessarios: row.parametros_necessarios ? JSON.parse(row.parametros_necessarios) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {}
    };

    res.json({
      success: true,
      data: etapa
    });
  } catch (error) {
    console.error('Erro ao buscar etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/etapas/categoria/:categoria - Buscar etapas por categoria
router.get('/categoria/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const rows = await getAllRows('SELECT * FROM etapas WHERE categoria = ? ORDER BY ordem, nome', [categoria]);

    const etapas = rows.map(row => ({
      ...row,
      parametros_necessarios: row.parametros_necessarios ? JSON.parse(row.parametros_necessarios) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {}
    }));

    res.json({
      success: true,
      data: etapas
    });
  } catch (error) {
    console.error('Erro ao buscar etapas por categoria:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/etapas - Criar nova etapa
router.post('/', async (req, res) => {
  try {
    const { 
      nome, 
      descricao, 
      categoria, 
      ordem, 
      tempo_estimado_minutos, 
      parametros_necessarios, 
      configuracoes, 
      observacoes 
    } = req.body;

    // Validações
    if (!nome || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, categoria'
      });
    }

    // Verificar se nome já existe na categoria
    const existing = await getRow('SELECT id FROM etapas WHERE nome = ? AND categoria = ?', [nome, categoria]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma etapa com este nome nesta categoria'
      });
    }

    const query = `
      INSERT INTO etapas 
      (nome, descricao, categoria, ordem, tempo_estimado_minutos, parametros_necessarios, configuracoes, observacoes, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      categoria,
      ordem || null,
      tempo_estimado_minutos || null,
      parametros_necessarios ? JSON.stringify(parametros_necessarios) : null,
      configuracoes ? JSON.stringify(configuracoes) : null,
      observacoes || null
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM etapas WHERE id = ?', [result.id]);
    const etapa = {
      ...newRecord,
      parametros_necessarios: newRecord.parametros_necessarios ? JSON.parse(newRecord.parametros_necessarios) : [],
      configuracoes: newRecord.configuracoes ? JSON.parse(newRecord.configuracoes) : {}
    };

    res.status(201).json({
      success: true,
      data: etapa
    });
  } catch (error) {
    console.error('Erro ao criar etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/etapas/:id - Atualizar etapa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, 
      descricao, 
      categoria, 
      ordem, 
      tempo_estimado_minutos, 
      parametros_necessarios, 
      configuracoes, 
      observacoes 
    } = req.body;

    // Verificar se etapa existe
    const existing = await getRow('SELECT * FROM etapas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Etapa não encontrada'
      });
    }

    // Verificar se nome já existe na categoria (exceto o próprio registro)
    if (nome && categoria && (nome !== existing.nome || categoria !== existing.categoria)) {
      const nameExists = await getRow('SELECT id FROM etapas WHERE nome = ? AND categoria = ? AND id != ?', [nome, categoria, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma etapa com este nome nesta categoria'
        });
      }
    }

    const query = `
      UPDATE etapas 
      SET nome = ?, descricao = ?, categoria = ?, ordem = ?, tempo_estimado_minutos = ?, 
          parametros_necessarios = ?, configuracoes = ?, observacoes = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      categoria || existing.categoria,
      ordem !== undefined ? ordem : existing.ordem,
      tempo_estimado_minutos !== undefined ? tempo_estimado_minutos : existing.tempo_estimado_minutos,
      parametros_necessarios !== undefined ? (parametros_necessarios ? JSON.stringify(parametros_necessarios) : null) : existing.parametros_necessarios,
      configuracoes !== undefined ? (configuracoes ? JSON.stringify(configuracoes) : null) : existing.configuracoes,
      observacoes !== undefined ? observacoes : existing.observacoes,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM etapas WHERE id = ?', [id]);
    const etapa = {
      ...updatedRecord,
      parametros_necessarios: updatedRecord.parametros_necessarios ? JSON.parse(updatedRecord.parametros_necessarios) : [],
      configuracoes: updatedRecord.configuracoes ? JSON.parse(updatedRecord.configuracoes) : {}
    };

    res.json({
      success: true,
      data: etapa
    });
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/etapas/:id - Excluir etapa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se etapa existe
    const existing = await getRow('SELECT * FROM etapas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Etapa não encontrada'
      });
    }

    await runQuery('DELETE FROM etapas WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Etapa excluída permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;