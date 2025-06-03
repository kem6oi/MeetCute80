const pool = require('../config/db');
const { insertAdminLog } = require('../utils/adminLogger');

exports.getDashboardStats = async (req, res) => {
  const client = await pool.connect();
  try {
    const [
      totalUsers,
      activeUsers,
      premiumUsers,
      revenueData
    ] = await Promise.all([
      client.query('SELECT COUNT(*) FROM users'),
      client.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['premium']),
      client.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(DISTINCT user_id) as paying_users
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `)
    ]);

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      activeUsers: parseInt(activeUsers.rows[0].count),
      premiumUsers: parseInt(premiumUsers.rows[0].count),
      monthlyRevenue: parseFloat(revenueData.rows[0].total_revenue) || 0,
      payingUsers: parseInt(revenueData.rows[0].paying_users) || 0
    });
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
    res.status(500).json({ message: 'Failed to get dashboard stats' });
  } finally {
    client.release();
  }
};

exports.getAllUsers = async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('Executing getAllUsers query...');
    const result = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.is_active,
        u.is_suspended,
        u.suspension_reason,
        u.suspended_at,
        u.created_at,
        p.first_name,
        p.last_name,
        u.profile_complete,
        COALESCE(
          (SELECT SUM(amount) 
           FROM transactions 
           WHERE user_id = u.id AND created_at >= NOW() - INTERVAL '30 days'
          ), 0
        ) as monthly_revenue
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
    `);
    console.log(`Found ${result.rows.length} users`);

    const users = result.rows.map(user => {
      let status = 'active';
      if (user.is_suspended) {
        status = 'suspended';
      } else if (!user.is_active) {
        status = 'banned';
      }

      return {
        id: user.id,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Anonymous',
        email: user.email,
        status,
        role: user.role,
        joined: new Date(user.created_at).toISOString().split('T')[0],
        lastActive: user.profile_complete ? 'Active' : 'Never',
        revenue: parseFloat(user.monthly_revenue),
        suspension_details: user.is_suspended ? {
          reason: user.suspension_reason,
          suspended_at: user.suspended_at ? new Date(user.suspended_at).toISOString() : null
        } : null
      };
    });

    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      dataType: err.dataType,
      constraint: err.constraint
    });
    res.status(500).json({ message: 'Failed to get users', error: err.message });
  } finally {
    client.release();
  }
};

exports.updateUserStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (status === 'active') {
      // Activate user
      await client.query(
        `UPDATE users 
         SET is_active = true,
             is_suspended = false,
             suspension_reason = NULL,
             suspended_at = NULL
         WHERE id = $1`,
        [id]
      );
    } else if (status === 'suspended') {
      // Suspend user
      await client.query(
        `UPDATE users 
         SET is_active = true,
             is_suspended = true,
             suspension_reason = $2,
             suspended_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, reason || 'Violation of community guidelines']
      );
    } else if (status === 'banned') {
      // Ban user (sets both inactive and suspended)
      await client.query(
        `UPDATE users 
         SET is_active = false,
             is_suspended = true,
             suspension_reason = $2,
             suspended_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, reason || 'Account banned permanently']
      );
    }

    // Log the status change
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'UPDATE_USER_STATUS', id, `Status changed to ${status}${reason ? `: ${reason}` : ''}`]
    );

    await client.query('COMMIT');
    res.json({ message: 'User status updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating user status:', err);
    res.status(500).json({ message: 'Failed to update user status' });
  } finally {
    client.release();
  }
};

exports.getRevenueStats = async (req, res) => {
  const client = await pool.connect();
  try {
    const [monthly, subscriptions, gifts] = await Promise.all([
      client.query(`
        SELECT DATE_TRUNC('month', created_at) as month,
               SUM(amount) as total
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month DESC
      `),
      client.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'subscription'
        AND created_at >= NOW() - INTERVAL '30 days'
      `),
      client.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'gift'
        AND created_at >= NOW() - INTERVAL '30 days'
      `)
    ]);

    res.json({
      monthlyTrend: monthly.rows.map(row => ({
        month: row.month,
        amount: parseFloat(row.total)
      })),
      lastMonth: {
        total: parseFloat(monthly.rows[0]?.total || 0),
        subscriptions: parseFloat(subscriptions.rows[0]?.total || 0),
        gifts: parseFloat(gifts.rows[0]?.total || 0)
      }
    });
  } catch (err) {
    console.error('Error getting revenue stats:', err);
    res.status(500).json({ message: 'Failed to get revenue stats' });
  } finally {
    client.release();
  }
};

exports.getTickets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        u.email as user_email,
        p.first_name,
        p.last_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY t.created_at DESC
    `);

    const tickets = result.rows.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      user: {
        id: ticket.user_id,
        email: ticket.user_email,
        name: ticket.first_name && ticket.last_name ? 
          `${ticket.first_name} ${ticket.last_name}` : 'Anonymous'
      },
      createdAt: new Date(ticket.created_at).toLocaleString(),
      updatedAt: ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : null
    }));

    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
};

// New admin controller methods

exports.deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the deletion
    await insertAdminLog({
      adminId: req.user.id,
      action: 'DELETE_USER',
      targetUserId: id,
      details: `User deleted: ${userCheck.rows[0].email}`
    });
    
    // Delete user (will cascade to profiles, etc.)
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  } finally {
    client.release();
  }
};

exports.getRevenueSummary = async (req, res) => {
  const client = await pool.connect();
  try {
    // Get revenue by time period
    const revenueByPeriod = await client.query(`
      SELECT 
        SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as today,
        SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as week,
        SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as month,
        SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '365 days') as year,
        SUM(amount) as all_time
      FROM transactions
    `);
    
    // Get revenue by type
    const revenueByType = await client.query(`
      SELECT 
        type,
        COUNT(*) as transaction_count,
        SUM(amount) as total
      FROM transactions
      GROUP BY type
      ORDER BY total DESC
    `);
    
    // Get top spending users
    const topUsers = await client.query(`
      SELECT 
        t.user_id,
        u.email,
        p.first_name,
        p.last_name,
        SUM(t.amount) as total_spent,
        COUNT(*) as transaction_count
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      GROUP BY t.user_id, u.email, p.first_name, p.last_name
      ORDER BY total_spent DESC
      LIMIT 10
    `);
    
    res.json({
      byPeriod: {
        today: parseFloat(revenueByPeriod.rows[0].today || 0),
        week: parseFloat(revenueByPeriod.rows[0].week || 0),
        month: parseFloat(revenueByPeriod.rows[0].month || 0),
        year: parseFloat(revenueByPeriod.rows[0].year || 0),
        allTime: parseFloat(revenueByPeriod.rows[0].all_time || 0)
      },
      byType: revenueByType.rows.map(row => ({
        type: row.type,
        count: parseInt(row.transaction_count),
        total: parseFloat(row.total)
      })),
      topUsers: topUsers.rows.map(user => ({
        id: user.user_id,
        email: user.email,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Anonymous',
        totalSpent: parseFloat(user.total_spent),
        transactionCount: parseInt(user.transaction_count)
      }))
    });
  } catch (err) {
    console.error('Error getting revenue summary:', err);
    res.status(500).json({ message: 'Failed to get revenue summary' });
  } finally {
    client.release();
  }
};

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM user_subscriptions WHERE package_id = p.id AND status = 'active') as active_subscribers,
        (SELECT json_agg(f.*) FROM subscription_features f WHERE f.package_id = p.id) as features
      FROM subscription_packages p
      ORDER BY p.price ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting subscription plans:', err);
    res.status(500).json({ message: 'Failed to get subscription plans' });
  }
};

exports.createSubscriptionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, price, billingInterval, features } = req.body;
    
    // Create package
    const packageResult = await client.query(
      `INSERT INTO subscription_packages (name, price, billing_interval, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name, price, billingInterval || 'monthly']
    );
    
    const packageId = packageResult.rows[0].id;
    
    // Add features if provided
    if (features && features.length) {
      for (const feature of features) {
        await client.query(
          `INSERT INTO subscription_features (package_id, feature_name, feature_description)
           VALUES ($1, $2, $3)`,
          [packageId, feature.name, feature.description]
        );
      }
    }
    
    // Log the action
    await insertAdminLog({
      adminId: req.user.id,
      action: 'CREATE_SUBSCRIPTION_PLAN',
      details: `Created subscription plan: ${name} ($${price}/${billingInterval || 'monthly'})`
    });
    
    await client.query('COMMIT');
    
    res.status(201).json({
      id: packageId,
      name,
      price,
      billingInterval: billingInterval || 'monthly',
      isActive: true,
      features: features || []
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating subscription plan:', err);
    res.status(500).json({ message: 'Failed to create subscription plan' });
  } finally {
    client.release();
  }
};

exports.updateSubscriptionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, price, billingInterval, isActive, features } = req.body;
    
    // Check if plan exists
    const planCheck = await client.query('SELECT * FROM subscription_packages WHERE id = $1', [id]);
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    // Update package
    await client.query(
      `UPDATE subscription_packages 
       SET name = $1, price = $2, billing_interval = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, price, billingInterval, isActive, id]
    );
    
    // Handle features if provided
    if (features && features.length) {
      // Remove existing features
      await client.query('DELETE FROM subscription_features WHERE package_id = $1', [id]);
      
      // Add new features
      for (const feature of features) {
        await client.query(
          `INSERT INTO subscription_features (package_id, feature_name, feature_description)
           VALUES ($1, $2, $3)`,
          [id, feature.name, feature.description]
        );
      }
    }
    
    // Log the action
    await insertAdminLog({
      adminId: req.user.id,
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      details: `Updated subscription plan ID ${id}: ${name}`
    });
    
    await client.query('COMMIT');
    
    res.json({ message: 'Subscription plan updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating subscription plan:', err);
    res.status(500).json({ message: 'Failed to update subscription plan' });
  } finally {
    client.release();
  }
};

exports.deleteSubscriptionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Check if plan exists
    const planCheck = await client.query('SELECT * FROM subscription_packages WHERE id = $1', [id]);
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    // Check if plan has active subscribers
    const subscribersCheck = await client.query(
      'SELECT COUNT(*) FROM user_subscriptions WHERE package_id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (parseInt(subscribersCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete plan with active subscribers. Deactivate it instead.' 
      });
    }
    
    // Delete plan (will cascade to features)
    await client.query('DELETE FROM subscription_packages WHERE id = $1', [id]);
    
    // Log the action
    await insertAdminLog({
      adminId: req.user.id,
      action: 'DELETE_SUBSCRIPTION_PLAN',
      details: `Deleted subscription plan ID ${id}: ${planCheck.rows[0].name}`
    });
    
    await client.query('COMMIT');
    
    res.json({ message: 'Subscription plan deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting subscription plan:', err);
    res.status(500).json({ message: 'Failed to delete subscription plan' });
  } finally {
    client.release();
  }
};

exports.getReportedContent = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        r.*,
        reporter.email as reporter_email,
        reported.email as reported_email,
        p.first_name as reported_first_name,
        p.last_name as reported_last_name,
        reviewer.email as reviewer_email
      FROM reported_content r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      LEFT JOIN profiles p ON reported.id = p.user_id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      query += ' WHERE r.status = $1';
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const result = await pool.query(query, params);
    
    const reports = result.rows.map(report => ({
      id: report.id,
      type: report.type,
      reason: report.reason,
      status: report.status,
      contentId: report.content_id,
      reporter: {
        id: report.reporter_id,
        email: report.reporter_email
      },
      reportedUser: {
        id: report.reported_user_id,
        email: report.reported_email,
        name: report.reported_first_name && report.reported_last_name ? 
          `${report.reported_first_name} ${report.reported_last_name}` : 'Anonymous'
      },
      reviewer: report.reviewer_email ? {
        id: report.reviewed_by,
        email: report.reviewer_email
      } : null,
      notes: report.notes,
      createdAt: new Date(report.created_at).toLocaleString(),
      reviewedAt: report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : null
    }));
    
    res.json(reports);
  } catch (err) {
    console.error('Error getting reported content:', err);
    res.status(500).json({ message: 'Failed to get reported content' });
  }
};

exports.updateReportStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status, notes, action } = req.body;
    
    // Check if report exists
    const reportCheck = await client.query('SELECT * FROM reported_content WHERE id = $1', [id]);
    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Update report status
    await client.query(
      `UPDATE reported_content 
       SET status = $1, notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, notes, req.user.id, id]
    );
    
    // Handle action if specified
    if (action) {
      const reportedUserId = reportCheck.rows[0].reported_user_id;
      
      if (action === 'suspend') {
        await client.query(
          `UPDATE users 
           SET is_suspended = true, suspension_reason = $1, suspended_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [notes || 'Violation of community guidelines', reportedUserId]
        );
      } else if (action === 'ban') {
        await client.query(
          `UPDATE users 
           SET is_active = false, is_suspended = true, suspension_reason = $1, suspended_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [notes || 'Account banned permanently', reportedUserId]
        );
      } else if (action === 'warning') {
        // In a real app, this might send an email warning
        console.log(`Warning issued to user ${reportedUserId}`);
      }
    }
    
    // Log the action
    await insertAdminLog({
      adminId: req.user.id,
      action: 'UPDATE_REPORT_STATUS',
      targetUserId: reportCheck.rows[0].reported_user_id,
      details: `Updated report ID ${id} status to ${status}${action ? ` with action: ${action}` : ''}`
    });
    
    await client.query('COMMIT');
    
    res.json({ message: 'Report status updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating report status:', err);
    res.status(500).json({ message: 'Failed to update report status' });
  } finally {
    client.release();
  }
};

exports.getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, adminId, action, category } = req.query;
    const offset = (page - 1) * parseInt(limit);
    const params = [];
    let whereClause = '';
    
    if (adminId) {
      params.push(adminId);
      whereClause += `WHERE admin_id = $${params.length}`;
    }
    
    if (action) {
      params.push(action);
      whereClause += whereClause ? ` AND action = $${params.length}` : `WHERE action = $${params.length}`;
    }
    
    if (category) {
      params.push(`%${category}%`);
      whereClause += whereClause ? ` AND action ILIKE $${params.length}` : `WHERE action ILIKE $${params.length}`;
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM admin_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalLogs = parseInt(countResult.rows[0].count);
    
    // Get paginated logs
    params.push(parseInt(limit));
    params.push(offset);
    
    const logsQuery = `
      SELECT 
        al.*,
        a.email as admin_email,
        u.email as target_user_email
      FROM 
        admin_logs al
        LEFT JOIN users a ON al.admin_id = a.id
        LEFT JOIN users u ON al.target_user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    const logsResult = await pool.query(logsQuery, params);
    
    res.json({
      logs: logsResult.rows,
      total: totalLogs,
      pages: Math.ceil(totalLogs / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('Error getting admin logs:', err);
    res.status(500).json({ message: 'Failed to get admin logs' });
  }
};