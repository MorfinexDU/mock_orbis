const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/etapas - Listar etapas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, ativa, centro } = req.query;
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

    if (ativa !== undefined) {
      query += ' AND ativa = ?';
      countQuery += ' AND ativa = ?';
      params.push(ativa === 'true' ? 1 : 0);
    }

    if (centro) {
      query += ' AND centros LIKE ?';
      countQuery += ' AND centros LIKE ?';
      params.push(`%${centro}%`);
    }

    // Ordenação e paginação
    query += ' ORDER BY nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    // Parse JSON fields
    const etapas = rows.map(row => ({
      ...row,
      centros_trabalho: row.centros_trabalho ? JSON.parse(row.centros_trabalho) : [],
      parametros_necessarios: row.parametros_necessarios ? JSON.parse(row.parametros_necessarios) : [],
      ativa: Boolean(row.ativa)
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
      centros_trabalho: row.centros_trabalho ? JSON.parse(row.centros_trabalho) : [],
      parametros_necessarios: row.parametros_necessarios ? JSON.parse(row.parametros_necessarios) : [],
      ativa: Boolean(row.ativa)
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

// GET /orbis/etapas?ids=1,2,3 - Buscar múltiplas etapas por IDs
router.get('/', async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim()));
      const placeholders = idArray.map(() => '?').join(',');
      const rows = await getAllRows(`SELECT * FROM etapas WHERE id IN (${placeholders})`, idArray);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Etapas não encontradas'
        });
      }

      const etapas = rows.map(row => ({
        ...row,
        centros_trabalho: row.centros_trabalho ? JSON.parse(row.centros_trabalho) : [],
        parametros_necessarios: row.parametros_necessarios ? JSON.parse(row.parametros_necessarios) : [],
        ativa: Boolean(row.ativa)
      }));

      return res.json({
        success: true,
        data: etapas
      });
    }

    // Continue with regular listing logic if no ids parameter
    // ... (rest of the listing logic would be here)
  } catch (error) {
    console.error('Erro ao buscar etapas:', error);
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
      centros, 
      centros_trabalho, 
      parametros_necessarios, 
      ativa = true 
    } = req.body;

    // Validações
    if (!nome || !centros || !centros_trabalho || !parametros_necessarios) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, centros, centros_trabalho, parametros_necessarios'
      });
    }

    // Verificar se nome já existe
    const existing = await getRow('SELECT id FROM etapas WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma etapa com este nome'
      });
    }

    const query = `
      INSERT INTO etapas 
      (nome, descricao, centros, centros_trabalho, parametros_necessarios, ativa, data_criacao, data_modificacao)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      centros,
      JSON.stringify(centros_trabalho),
      JSON.stringify(parametros_necessarios),
      ativa ? 1 : 0
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM etapas WHERE id = ?', [result.id]);
    const etapa = {
      ...newRecord,
      centros_trabalho: newRecord.centros_trabalho ? JSON.parse(newRecord.centros_trabalho) : [],
      parametros_necessarios: newRecord.parametros_necessarios ? JSON.parse(newRecord.parametros_necessarios) : [],
      ativa: Boolean(newRecord.ativa)
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
      centros, 
      centros_trabalho, 
      parametros_necessarios, 
      ativa 
    } = req.body;

    // Verificar se etapa existe
    const existing = await getRow('SELECT * FROM etapas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Etapa não encontrada'
      });
    }

    // Verificar se nome já existe (exceto o próprio registro)
    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM etapas WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma etapa com este nome'
        });
      }
    }

    const query = `
      UPDATE etapas 
      SET nome = ?, descricao = ?, centros = ?, centros_trabalho = ?, 
          parametros_necessarios = ?, ativa = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      centros || existing.centros,
      centros_trabalho !== undefined ? JSON.stringify(centros_trabalho) : existing.centros_trabalho,
      parametros_necessarios !== undefined ? JSON.stringify(parametros_necessarios) : existing.parametros_necessarios,
      ativa !== undefined ? (ativa ? 1 : 0) : existing.ativa,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM etapas WHERE id = ?', [id]);
    const etapa = {
      ...updatedRecord,
      centros_trabalho: updatedRecord.centros_trabalho ? JSON.parse(updatedRecord.centros_trabalho) : [],
      parametros_necessarios: updatedRecord.parametros_necessarios ? JSON.parse(updatedRecord.parametros_necessarios) : [],
      ativa: Boolean(updatedRecord.ativa)
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

// PATCH /orbis/etapas/:id/desativar - Desativar etapa
router.patch('/:id/desativar', async (req, res) => {
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

    await runQuery('UPDATE etapas SET ativa = 0, data_modificacao = datetime(\'now\') WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Etapa desativada com sucesso',
      data: {
        id: parseInt(id),
        ativa: false
      }
    });
  } catch (error) {
    console.error('Erro ao desativar etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PATCH /orbis/etapas/:id/ativar - Reativar etapa
router.patch('/:id/ativar', async (req, res) => {
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

    await runQuery('UPDATE etapas SET ativa = 1, data_modificacao = datetime(\'now\') WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Etapa ativada com sucesso',
      data: {
        id: parseInt(id),
        ativa: true
      }
    });
  } catch (error) {
    console.error('Erro ao ativar etapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/etapas/:id - Excluir etapa permanentemente
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