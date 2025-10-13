const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/rotas - Listar rotas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, ativo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM rotas WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM rotas WHERE 1=1';
    let params = [];

    // Filtros
    if (search) {
      query += ' AND (nome LIKE ? OR descricao LIKE ?)';
      countQuery += ' AND (nome LIKE ? OR descricao LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      countQuery += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    // Ordenação e paginação
    query += ' ORDER BY nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const rotas = rows.map(row => ({
      ...row,
      etapas: row.etapas ? JSON.parse(row.etapas) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {},
      ativo: Boolean(row.ativo)
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: rotas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar rotas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/rotas/:id - Buscar rota por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM rotas WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
      });
    }

    const rota = {
      ...row,
      etapas: row.etapas ? JSON.parse(row.etapas) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {},
      ativo: Boolean(row.ativo)
    };

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    console.error('Erro ao buscar rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/rotas/nome/:nome - Buscar rota por nome
router.get('/nome/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const row = await getRow('SELECT * FROM rotas WHERE nome = ?', [nome]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
      });
    }

    const rota = {
      ...row,
      etapas: row.etapas ? JSON.parse(row.etapas) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {},
      ativo: Boolean(row.ativo)
    };

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    console.error('Erro ao buscar rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/rotas/ativas - Listar apenas rotas ativas
router.get('/ativas', async (req, res) => {
  try {
    const rows = await getAllRows('SELECT * FROM rotas WHERE ativo = 1 ORDER BY nome');

    const rotas = rows.map(row => ({
      ...row,
      etapas: row.etapas ? JSON.parse(row.etapas) : [],
      configuracoes: row.configuracoes ? JSON.parse(row.configuracoes) : {},
      ativo: Boolean(row.ativo)
    }));

    res.json({
      success: true,
      data: rotas
    });
  } catch (error) {
    console.error('Erro ao listar rotas ativas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/rotas - Criar nova rota
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, etapas, configuracoes, observacoes, ativo } = req.body;

    // Validações
    if (!nome) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: nome'
      });
    }

    // Verificar se nome já existe
    const existing = await getRow('SELECT id FROM rotas WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma rota com este nome'
      });
    }

    // Validar estrutura das etapas
    if (etapas && Array.isArray(etapas)) {
      for (const etapa of etapas) {
        if (!etapa.etapa_id || typeof etapa.ordem !== 'number') {
          return res.status(400).json({
            success: false,
            error: 'Cada etapa deve ter etapa_id e ordem'
          });
        }
      }
    }

    const query = `
      INSERT INTO rotas 
      (nome, descricao, etapas, configuracoes, observacoes, ativo, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      etapas ? JSON.stringify(etapas) : null,
      configuracoes ? JSON.stringify(configuracoes) : null,
      observacoes || null,
      ativo !== undefined ? (ativo ? 1 : 0) : 1
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM rotas WHERE id = ?', [result.id]);
    const rota = {
      ...newRecord,
      etapas: newRecord.etapas ? JSON.parse(newRecord.etapas) : [],
      configuracoes: newRecord.configuracoes ? JSON.parse(newRecord.configuracoes) : {},
      ativo: Boolean(newRecord.ativo)
    };

    res.status(201).json({
      success: true,
      data: rota
    });
  } catch (error) {
    console.error('Erro ao criar rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/rotas/:id - Atualizar rota
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, etapas, configuracoes, observacoes, ativo } = req.body;

    // Verificar se rota existe
    const existing = await getRow('SELECT * FROM rotas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
      });
    }

    // Verificar se nome já existe (exceto o próprio registro)
    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM rotas WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma rota com este nome'
        });
      }
    }

    // Validar estrutura das etapas
    if (etapas && Array.isArray(etapas)) {
      for (const etapa of etapas) {
        if (!etapa.etapa_id || typeof etapa.ordem !== 'number') {
          return res.status(400).json({
            success: false,
            error: 'Cada etapa deve ter etapa_id e ordem'
          });
        }
      }
    }

    const query = `
      UPDATE rotas 
      SET nome = ?, descricao = ?, etapas = ?, configuracoes = ?, observacoes = ?, 
          ativo = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      etapas !== undefined ? (etapas ? JSON.stringify(etapas) : null) : existing.etapas,
      configuracoes !== undefined ? (configuracoes ? JSON.stringify(configuracoes) : null) : existing.configuracoes,
      observacoes !== undefined ? observacoes : existing.observacoes,
      ativo !== undefined ? (ativo ? 1 : 0) : existing.ativo,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM rotas WHERE id = ?', [id]);
    const rota = {
      ...updatedRecord,
      etapas: updatedRecord.etapas ? JSON.parse(updatedRecord.etapas) : [],
      configuracoes: updatedRecord.configuracoes ? JSON.parse(updatedRecord.configuracoes) : {},
      ativo: Boolean(updatedRecord.ativo)
    };

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/rotas/:id - Excluir rota
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se rota existe
    const existing = await getRow('SELECT * FROM rotas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
      });
    }

    await runQuery('DELETE FROM rotas WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Rota excluída permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;