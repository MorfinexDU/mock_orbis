const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/projetos - Listar projetos
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM projetos WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM projetos WHERE 1=1';
    let params = [];

    // Filtros
    if (search) {
      query += ' AND (nome LIKE ? OR descricao LIKE ? OR responsavel LIKE ?)';
      countQuery += ' AND (nome LIKE ? OR descricao LIKE ? OR responsavel LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

    // Ordenação e paginação
    query += ' ORDER BY data_criacao DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2)) // Remove limit e offset do count
    ]);

    // Parse JSON fields
    const projetos = rows.map(row => ({
      ...row,
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    }));

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: projetos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/projetos/:id - Buscar projeto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
    }

    const projeto = {
      ...row,
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    };

    res.json({
      success: true,
      data: projeto
    });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/projetos/nome/:nome - Buscar projeto por nome
router.get('/nome/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const row = await getRow('SELECT * FROM projetos WHERE nome = ?', [nome]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
    }

    const projeto = {
      ...row,
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    };

    res.json({
      success: true,
      data: projeto
    });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/projetos/status/:status - Buscar projetos por status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const rows = await getAllRows('SELECT * FROM projetos WHERE status = ? ORDER BY data_criacao DESC', [status]);

    const projetos = rows.map(row => ({
      ...row,
      roteiro: row.roteiro ? JSON.parse(row.roteiro) : {}
    }));

    res.json({
      success: true,
      data: projetos
    });
  } catch (error) {
    console.error('Erro ao buscar projetos por status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /orbis/projetos - Criar novo projeto
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, responsavel, roteiro, observacoes, status } = req.body;

    // Validações
    if (!nome || !responsavel) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: nome, responsavel'
      });
    }

    // Verificar se nome já existe
    const existing = await getRow('SELECT id FROM projetos WHERE nome = ?', [nome]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um projeto com este nome'
      });
    }

    // Validar estrutura do roteiro
    if (roteiro) {
      if (!roteiro.rotas || !Array.isArray(roteiro.rotas)) {
        return res.status(400).json({
          success: false,
          error: 'Roteiro deve conter um array de rotas'
        });
      }
    }

    const query = `
      INSERT INTO projetos 
      (nome, descricao, responsavel, roteiro, observacoes, status, data_criacao)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const result = await runQuery(query, [
      nome,
      descricao || null,
      responsavel,
      roteiro ? JSON.stringify(roteiro) : null,
      observacoes || null,
      status || 'Planejamento'
    ]);

    // Buscar o registro criado
    const newRecord = await getRow('SELECT * FROM projetos WHERE id = ?', [result.id]);
    const projeto = {
      ...newRecord,
      roteiro: newRecord.roteiro ? JSON.parse(newRecord.roteiro) : {}
    };

    res.status(201).json({
      success: true,
      data: projeto
    });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /orbis/projetos/:id - Atualizar projeto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, responsavel, roteiro, observacoes, status } = req.body;

    // Verificar se projeto existe
    const existing = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
    }

    // Verificar se nome já existe (exceto o próprio registro)
    if (nome && nome !== existing.nome) {
      const nameExists = await getRow('SELECT id FROM projetos WHERE nome = ? AND id != ?', [nome, id]);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: 'Já existe um projeto com este nome'
        });
      }
    }

    // Validar estrutura do roteiro
    if (roteiro) {
      if (!roteiro.rotas || !Array.isArray(roteiro.rotas)) {
        return res.status(400).json({
          success: false,
          error: 'Roteiro deve conter um array de rotas'
        });
      }
    }

    const query = `
      UPDATE projetos 
      SET nome = ?, descricao = ?, responsavel = ?, roteiro = ?, observacoes = ?, 
          status = ?, data_modificacao = datetime('now')
      WHERE id = ?
    `;

    await runQuery(query, [
      nome || existing.nome,
      descricao !== undefined ? descricao : existing.descricao,
      responsavel || existing.responsavel,
      roteiro !== undefined ? (roteiro ? JSON.stringify(roteiro) : null) : existing.roteiro,
      observacoes !== undefined ? observacoes : existing.observacoes,
      status || existing.status,
      id
    ]);

    // Buscar o registro atualizado
    const updatedRecord = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);
    const projeto = {
      ...updatedRecord,
      roteiro: updatedRecord.roteiro ? JSON.parse(updatedRecord.roteiro) : {}
    };

    res.json({
      success: true,
      data: projeto
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// DELETE /orbis/projetos/:id - Excluir projeto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se projeto existe
    const existing = await getRow('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
    }

    await runQuery('DELETE FROM projetos WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Projeto excluído permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;