const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');
const { registrarLog } = require('../database/auditLog');

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, ativo } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM regras_pos_calculo WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM regras_pos_calculo WHERE 1=1';
    let params = [];

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

    query += ' ORDER BY nome LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    const regras = rows.map(row => ({
      ...row,
      condicoes_multiplas: row.condicoes_multiplas ? JSON.parse(row.condicoes_multiplas) : [],
      ativo: Boolean(row.ativo)
    }));

    res.json({
      success: true,
      data: regras,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
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
      condicoes_multiplas: row.condicoes_multiplas ? JSON.parse(row.condicoes_multiplas) : [],
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

router.get('/nome/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const row = await getRow('SELECT * FROM regras_pos_calculo WHERE nome = ?', [nome]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    const regra = {
      ...row,
      condicoes_multiplas: row.condicoes_multiplas ? JSON.parse(row.condicoes_multiplas) : [],
      ativo: Boolean(row.ativo)
    };

    res.json({
      success: true,
      data: regra
    });
  } catch (error) {
    console.error('Erro ao buscar regra por nome:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, descricao, tipo_condicao, condicao_valor, condicoes_multiplas, operador_logico, acao, acao_valor, ativo, user_id } = req.body;

    if (!nome || !tipo_condicao || !acao || !acao_valor) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, tipo_condicao, acao, acao_valor'
      });
    }

    const existing = await getRow('SELECT id FROM regras_pos_calculo WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma regra com este nome'
      });
    }

    const query = `
      INSERT INTO regras_pos_calculo 
      (nome, descricao, tipo_condicao, condicao_valor, condicoes_multiplas, operador_logico, acao, acao_valor, ativo, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      tipo_condicao,
      condicao_valor || null,
      condicoes_multiplas ? JSON.stringify(condicoes_multiplas) : null,
      operador_logico || null,
      acao,
      acao_valor,
      ativo !== undefined ? (ativo ? 1 : 0) : 1
    ]);

    await registrarLog('regras_pos_calculo', result.id, 'CREATE', null, req.body, user_id);

    const newRecord = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [result.id]);
    const regra = {
      ...newRecord,
      condicoes_multiplas: newRecord.condicoes_multiplas ? JSON.parse(newRecord.condicoes_multiplas) : [],
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

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, tipo_condicao, condicao_valor, condicoes_multiplas, operador_logico, acao, acao_valor, ativo, user_id } = req.body;

    const existing = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

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
      SET nome = ?, descricao = ?, tipo_condicao = ?, condicao_valor = ?, condicoes_multiplas = ?, 
          operador_logico = ?, acao = ?, acao_valor = ?, ativo = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      tipo_condicao || existing.tipo_condicao,
      condicao_valor !== undefined ? condicao_valor : existing.condicao_valor,
      condicoes_multiplas !== undefined ? JSON.stringify(condicoes_multiplas) : existing.condicoes_multiplas,
      operador_logico !== undefined ? operador_logico : existing.operador_logico,
      acao || existing.acao,
      acao_valor || existing.acao_valor,
      ativo !== undefined ? (ativo ? 1 : 0) : existing.ativo,
      id
    ]);

    await registrarLog('regras_pos_calculo', id, 'UPDATE', existing, req.body, user_id);

    const updatedRecord = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    const regra = {
      ...updatedRecord,
      condicoes_multiplas: updatedRecord.condicoes_multiplas ? JSON.parse(updatedRecord.condicoes_multiplas) : [],
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

router.patch('/:id/desativar', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const existing = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    await runQuery("UPDATE regras_pos_calculo SET ativo = 0, data_modificacao = datetime('now') WHERE id = ?", [id]);
    await registrarLog('regras_pos_calculo', id, 'DEACTIVATE', { ativo: existing.ativo }, { ativo: 0 }, user_id);

    res.json({
      success: true,
      message: 'Regra desativada com sucesso',
      data: { id: parseInt(id), ativo: false }
    });
  } catch (error) {
    console.error('Erro ao desativar regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

router.patch('/:id/ativar', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const existing = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    await runQuery("UPDATE regras_pos_calculo SET ativo = 1, data_modificacao = datetime('now') WHERE id = ?", [id]);
    await registrarLog('regras_pos_calculo', id, 'ACTIVATE', { ativo: existing.ativo }, { ativo: 1 }, user_id);

    res.json({
      success: true,
      message: 'Regra ativada com sucesso',
      data: { id: parseInt(id), ativo: true }
    });
  } catch (error) {
    console.error('Erro ao ativar regra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const existing = await getRow('SELECT * FROM regras_pos_calculo WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    await registrarLog('regras_pos_calculo', id, 'DELETE', existing, null, user_id);
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
