const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');
const { registrarLog } = require('../database/auditLog');

// GET /orbis/parametros - Listar parâmetros
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, tipo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM parametros_processo WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM parametros_processo WHERE 1=1';
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

    // Ordenação e paginação
    query += ' ORDER BY nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const parametros = rows.map(row => ({
      ...row,
      opcoes: row.opcoes ? JSON.parse(row.opcoes) : null,
      obrigatorio: Boolean(row.obrigatorio)
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: parametros,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar parâmetros:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/parametros/:id - Buscar parâmetro por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM parametros_processo WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Parâmetro não encontrado'
      });
    }

    const parametro = {
      ...row,
      opcoes: row.opcoes ? JSON.parse(row.opcoes) : null,
      obrigatorio: Boolean(row.obrigatorio)
    };

    res.json({
      success: true,
      data: parametro
    });
  } catch (error) {
    console.error('Erro ao buscar parâmetro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/parametros/nome/:nome - Buscar parâmetro por nome
router.get('/nome/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const row = await getRow('SELECT * FROM parametros_processo WHERE nome = ?', [nome]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Parâmetro não encontrado'
      });
    }

    const parametro = {
      ...row,
      opcoes: row.opcoes ? JSON.parse(row.opcoes) : null,
      obrigatorio: Boolean(row.obrigatorio)
    };

    res.json({
      success: true,
      data: parametro
    });
  } catch (error) {
    console.error('Erro ao buscar parâmetro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/parametros - Criar novo parâmetro
router.post('/', async (req, res) => {
  try {
    const { nome, tipo, unidade, descricao, opcoes, valor_padrao, obrigatorio, imagem_base64, user_id } = req.body;

    // Validações
    if (!nome || !tipo) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, tipo'
      });
    }

    // Verificar se nome já existe
    const existing = await getRow('SELECT id FROM parametros_processo WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um parâmetro com este nome'
      });
    }

    const query = `
      INSERT INTO parametros_processo 
      (nome, tipo, unidade, descricao, opcoes, valor_padrao, obrigatorio, imagem_base64, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      tipo,
      unidade || null,
      descricao || null,
      opcoes ? JSON.stringify(opcoes) : null,
      valor_padrao || null,
      obrigatorio ? 1 : 0,
      imagem_base64 || null
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM parametros_processo WHERE id = ?', [result.id]);
    const parametro = {
      ...newRecord,
      opcoes: newRecord.opcoes ? JSON.parse(newRecord.opcoes) : null,
      obrigatorio: Boolean(newRecord.obrigatorio)
    };

    await registrarLog('parametros_processo', result.id, 'CREATE', null, parametro, user_id);

    res.status(201).json({
      success: true,
      data: parametro
    });
  } catch (error) {
    console.error('Erro ao criar parâmetro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/parametros/:id - Atualizar parâmetro
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, unidade, descricao, opcoes, valor_padrao, obrigatorio, imagem_base64, user_id } = req.body;

    // Verificar se parâmetro existe
    const existing = await getRow('SELECT * FROM parametros_processo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Parâmetro não encontrado'
      });
    }

    const valoresAnteriores = {
      ...existing,
      opcoes: existing.opcoes ? JSON.parse(existing.opcoes) : null,
      obrigatorio: Boolean(existing.obrigatorio)
    };

    // Verificar se nome já existe (exceto o próprio registro)
    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM parametros_processo WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe um parâmetro com este nome'
        });
      }
    }

    const query = `
      UPDATE parametros_processo 
      SET nome = ?, tipo = ?, unidade = ?, descricao = ?, opcoes = ?, 
          valor_padrao = ?, obrigatorio = ?, imagem_base64 = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      tipo || existing.tipo,
      unidade !== undefined ? unidade : existing.unidade,
      descricao !== undefined ? descricao : existing.descricao,
      opcoes !== undefined ? (opcoes ? JSON.stringify(opcoes) : null) : existing.opcoes,
      valor_padrao !== undefined ? valor_padrao : existing.valor_padrao,
      obrigatorio !== undefined ? (obrigatorio ? 1 : 0) : existing.obrigatorio,
      imagem_base64 !== undefined ? imagem_base64 : existing.imagem_base64,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM parametros_processo WHERE id = ?', [id]);
    const parametro = {
      ...updatedRecord,
      opcoes: updatedRecord.opcoes ? JSON.parse(updatedRecord.opcoes) : null,
      obrigatorio: Boolean(updatedRecord.obrigatorio)
    };

    await registrarLog('parametros_processo', id, 'UPDATE', valoresAnteriores, parametro, user_id);

    res.json({
      success: true,
      data: parametro
    });
  } catch (error) {
    console.error('Erro ao atualizar parâmetro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/parametros/:id - Excluir parâmetro
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Verificar se parâmetro existe
    const existing = await getRow('SELECT * FROM parametros_processo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Parâmetro não encontrado'
      });
    }

    const valoresAnteriores = {
      ...existing,
      opcoes: existing.opcoes ? JSON.parse(existing.opcoes) : null,
      obrigatorio: Boolean(existing.obrigatorio)
    };

    await runQuery('DELETE FROM parametros_processo WHERE id = ?', [id]);
    await registrarLog('parametros_processo', id, 'DELETE', valoresAnteriores, null, user_id);

    res.json({
      success: true,
      message: 'Parâmetro excluído permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir parâmetro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;