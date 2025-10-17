const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');
const { registrarLog } = require('../database/auditLog');

// GET /orbis/projetos - Listar projetos
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, centro, idrota } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM projetos WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM projetos WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND nome LIKE ?';
      countQuery += ' AND nome LIKE ?';
      params.push(`%${search}%`);
    }

    if (centro) {
      query += ' AND centro = ?';
      countQuery += ' AND centro = ?';
      params.push(centro);
    }

    if (idrota) {
      query += ' AND idrota = ?';
      countQuery += ' AND idrota = ?';
      params.push(idrota);
    }

    query += ' ORDER BY data_criacao DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    const projetos = rows.map(row => ({
      ...row,
      parametros: row.parametros ? JSON.parse(row.parametros) : {},
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    }));

    res.json({
      success: true,
      data: projetos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', message: error.message });
  }
});

// GET /orbis/projetos/:id - Buscar projeto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }

    const projeto = {
      ...row,
      parametros: row.parametros ? JSON.parse(row.parametros) : {},
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    };

    res.json({ success: true, data: projeto });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', message: error.message });
  }
});

// GET /orbis/projetos/nome/:nome - Buscar projeto por nome
router.get('/nome/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const row = await getRow('SELECT * FROM projetos WHERE nome = ?', [nome]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }

    const projeto = {
      ...row,
      parametros: row.parametros ? JSON.parse(row.parametros) : {},
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    };

    res.json({ success: true, data: projeto });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', message: error.message });
  }
});

// POST /orbis/projetos - Criar novo projeto
router.post('/', async (req, res) => {
  try {
    const { nome, parametros, roteiro, centro, rota, idrota, user_id } = req.body;

    if (!nome || !parametros) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: nome, parametros' });
    }

    const existing = await getRow('SELECT id FROM projetos WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Já existe um projeto com este nome' });
    }

    const query = `INSERT INTO projetos (nome, parametros, roteiro, centro, rota, idrota, data_criacao) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;

    const result = await runQuery(query, [
      nome,
      JSON.stringify(parametros),
      roteiro ? JSON.stringify(roteiro) : null,
      centro || null,
      rota || null,
      idrota || null
    ]);

    const newRecord = await getRow('SELECT * FROM projetos WHERE id = ?', [result.id]);
    const projeto = {
      ...newRecord,
      parametros: JSON.parse(newRecord.parametros),
      roteiro: newRecord.roteiro ? JSON.parse(newRecord.roteiro) : {}
    };

    await registrarLog('projetos', result.id, 'CREATE', null, projeto, user_id);

    res.status(201).json({ success: true, data: projeto });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', message: error.message });
  }
});

// PUT /orbis/projetos/:id - Atualizar projeto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, parametros, roteiro, centro, rota, idrota, user_id } = req.body;

    const existing = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }

    const valoresAnteriores = {
      ...existing,
      parametros: existing.parametros ? JSON.parse(existing.parametros) : {},
      roteiro: existing.roteiro ? JSON.parse(existing.roteiro) : {}
    };

    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM projetos WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({ success: false, error: 'Já existe um projeto com este nome' });
      }
    }

    const query = `UPDATE projetos SET nome = ?, parametros = ?, roteiro = ?, centro = ?, rota = ?, idrota = ?, data_modificacao = datetime('now') WHERE id = ?`;

    await runQuery(query, [
      nome || existing.nome,
      parametros !== undefined ? JSON.stringify(parametros) : existing.parametros,
      roteiro !== undefined ? (roteiro ? JSON.stringify(roteiro) : null) : existing.roteiro,
      centro !== undefined ? centro : existing.centro,
      rota !== undefined ? rota : existing.rota,
      idrota !== undefined ? idrota : existing.idrota,
      id
    ]);

    const updatedRecord = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);
    const projeto = {
      ...updatedRecord,
      parametros: JSON.parse(updatedRecord.parametros),
      roteiro: updatedRecord.roteiro ? JSON.parse(updatedRecord.roteiro) : {}
    };

    await registrarLog('projetos', id, 'UPDATE', valoresAnteriores, projeto, user_id);

    res.json({ success: true, data: projeto });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', message: error.message });
  }
});

// DELETE /orbis/projetos/:id - Excluir projeto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const existing = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
    }

    const valoresAnteriores = {
      ...existing,
      parametros: existing.parametros ? JSON.parse(existing.parametros) : {},
      roteiro: existing.roteiro ? JSON.parse(existing.roteiro) : {}
    };

    await runQuery('DELETE FROM projetos WHERE id = ?', [id]);
    await registrarLog('projetos', id, 'DELETE', valoresAnteriores, null, user_id);

    res.json({ success: true, message: 'Projeto excluído permanentemente' });
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', message: error.message });
  }
});

module.exports = router;
