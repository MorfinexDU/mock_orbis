const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/rotas - Listar rotas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, ativa, centro_prod } = req.query;
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

    if (ativa !== undefined) {
      query += ' AND ativa = ?';
      countQuery += ' AND ativa = ?';
      params.push(ativa === 'true' ? 1 : 0);
    }

    if (centro_prod) {
      query += ' AND centro_prod = ?';
      countQuery += ' AND centro_prod = ?';
      params.push(centro_prod);
    }

    // Ordenação e paginação
    query += ' ORDER BY nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    // Parse JSON fields
    const rotas = rows.map(row => ({
      ...row,
      etapas: row.etapas ? JSON.parse(row.etapas) : [],
      ativa: Boolean(row.ativa)
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
      ativa: Boolean(row.ativa)
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

// GET /orbis/rotas/descricao/:descricao - Buscar rota por descrição
router.get('/descricao/:descricao', async (req, res) => {
  try {
    const { descricao } = req.params;
    const rows = await getAllRows('SELECT * FROM rotas WHERE descricao LIKE ? ORDER BY nome', [`%${descricao}%`]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma rota encontrada'
      });
    }

    const rotas = rows.map(row => ({
      ...row,
      etapas: row.etapas ? JSON.parse(row.etapas) : [],
      ativa: Boolean(row.ativa)
    }));

    res.json({
      success: true,
      data: rotas
    });
  } catch (error) {
    console.error('Erro ao buscar rotas por descrição:', error);
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
    const { 
      nome, 
      descricao, 
      sequencia_centros, 
      centro_prod, 
      etapas, 
      ativa = true 
    } = req.body;

    // Validações
    if (!nome || !sequencia_centros || !etapas) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, sequencia_centros, etapas'
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

    const query = `
      INSERT INTO rotas 
      (nome, descricao, sequencia_centros, centro_prod, etapas, ativa, data_criacao, data_modificacao)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      sequencia_centros,
      centro_prod || null,
      JSON.stringify(etapas),
      ativa ? 1 : 0
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM rotas WHERE id = ?', [result.id]);
    const rota = {
      ...newRecord,
      etapas: newRecord.etapas ? JSON.parse(newRecord.etapas) : [],
      ativa: Boolean(newRecord.ativa)
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
    const { 
      nome, 
      descricao, 
      sequencia_centros, 
      centro_prod, 
      etapas, 
      ativa 
    } = req.body;

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

    const query = `
      UPDATE rotas 
      SET nome = ?, descricao = ?, sequencia_centros = ?, centro_prod = ?, 
          etapas = ?, ativa = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      sequencia_centros || existing.sequencia_centros,
      centro_prod !== undefined ? centro_prod : existing.centro_prod,
      etapas !== undefined ? JSON.stringify(etapas) : existing.etapas,
      ativa !== undefined ? (ativa ? 1 : 0) : existing.ativa,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM rotas WHERE id = ?', [id]);
    const rota = {
      ...updatedRecord,
      etapas: updatedRecord.etapas ? JSON.parse(updatedRecord.etapas) : [],
      ativa: Boolean(updatedRecord.ativa)
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

// PATCH /orbis/rotas/:id/desativar - Desativar rota
router.patch('/:id/desativar', async (req, res) => {
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

    await runQuery('UPDATE rotas SET ativa = 0, data_modificacao = datetime(\'now\') WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Rota desativada com sucesso',
      data: {
        id: parseInt(id),
        ativa: false
      }
    });
  } catch (error) {
    console.error('Erro ao desativar rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PATCH /orbis/rotas/:id/ativar - Reativar rota
router.patch('/:id/ativar', async (req, res) => {
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

    await runQuery('UPDATE rotas SET ativa = 1, data_modificacao = datetime(\'now\') WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Rota ativada com sucesso',
      data: {
        id: parseInt(id),
        ativa: true
      }
    });
  } catch (error) {
    console.error('Erro ao ativar rota:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/rotas/:id - Excluir rota permanentemente
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