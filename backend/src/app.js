const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const XLSX = require('xlsx');
const { cookieSecure, frontendDistPath, frontendUrl } = require('./config');
const {
  createSubmission,
  createUser,
  deleteSubmission,
  getLessonSettings,
  getSubmissionById,
  getUserByUsername,
  listSubmissions,
  listSubmissionSummaries,
  listSubmissionsForExport,
  listUsers,
  updateLessonSettings,
  updateUser,
} = require('./db');
const { requireAuth, requireSuperAdmin } = require('./middleware/auth');
const {
  createUserSchema,
  lessonSettingsSchema,
  loginSchema,
  submissionSchema,
  updateUserSchema,
} = require('./schemas');
const { generateSnapshot, removeSnapshot } = require('./services/snapshot');
const { signSessionToken } = require('./utils/auth');
const { getCurrentDateString } = require('./utils/helpers');
const { hashPassword, verifyPassword } = require('./utils/password');

function roleLabel(role) {
  return role === 'SUPER_ADMIN' ? '超级管理员' : '普通用户';
}

function sanitizeSessionUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    roleLabel: roleLabel(user.role),
  };
}

function buildExportRows(submissions) {
  return submissions.map((item) => {
    const criteriaMap = {};

    item.criteria.forEach((criterion, index) => {
      criteriaMap[`评分项${index + 1}`] = criterion.title;
      criteriaMap[`评分项${index + 1}得分`] = `${criterion.score}/${criterion.max}`;
    });

    return {
      记录ID: item.id,
      讲课老师: item.lesson_teacher,
      讲课内容: item.lesson_topic,
      讲课科目: item.lesson_subject,
      评分用户: item.display_name,
      用户账号: item.username,
      用户权限: roleLabel(item.role),
      授课日期: item.lesson_date,
      授课轮次: item.round,
      总分: item.total_score,
      优点亮点: item.highlights,
      改进建议: item.suggestions,
      提交时间: item.created_at,
      ...criteriaMap,
    };
  });
}

function buildSummaryExportRows(summaryWeeks) {
  return summaryWeeks.flatMap((week) =>
    week.sessions.flatMap((session) =>
      session.reviews.map((review) => ({
        周次: week.weekLabel,
        讲课日期: session.lessonDate,
        讲课场次: session.round || '',
        讲课老师: session.teacher || '',
        讲课科目: session.subject || '',
        讲课内容: session.topic || '',
        该场评分人数: session.reviewCount,
        平均分: session.averageScore,
        最高分: session.maxScore,
        最低分: session.minScore,
        评分人: review.displayName || '',
        评分账号: review.username || '',
        评分权限: review.role || '',
        总分: review.totalScore,
        优点亮点: review.highlights || '',
        改进建议: review.suggestions || '',
        提交时间: review.createdAt,
      })),
    ),
  );
}

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || '请输入账号和密码。' });
    }

    const user = getUserByUsername(parsed.data.username);

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return res.status(401).json({ message: '账号或密码错误。' });
    }

    res.cookie('session_token', signSessionToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: '登录成功。',
      user: sanitizeSessionUser(user),
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('session_token');
    res.json({ message: '已退出登录。' });
  });

  app.get('/api/auth/session', requireAuth, (req, res) => {
    res.json({
      authenticated: true,
      user: sanitizeSessionUser(req.user),
      lesson: getLessonSettings(),
      today: getCurrentDateString(),
    });
  });

  app.get('/api/score-sheet/context', requireAuth, (req, res) => {
    res.json({
      user: sanitizeSessionUser(req.user),
      lesson: getLessonSettings(),
      today: getCurrentDateString(),
    });
  });

  app.post('/api/score-sheet/submissions', requireAuth, async (req, res) => {
    const parsed = submissionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || '评分表数据不正确。',
      });
    }

    const lesson = getLessonSettings();

    if (!lesson.scoringEnabled) {
      return res.status(403).json({
        message: '当前未开放评分，暂时不能提交评分。',
      });
    }

    if (!lesson.currentTeacher || !lesson.currentTopic || !lesson.currentSubject || !lesson.currentRound) {
      return res.status(400).json({
        message: '当前讲课信息尚未由超级管理员设置，暂时不能提交评分。',
      });
    }

    const payload = parsed.data;
    const createdAt = new Date().toISOString();
    const totalScore = payload.criteria.reduce(
      (sum, item) => sum + Number(item.score || 0),
      0,
    );

    try {
      const snapshotFilename = await generateSnapshot({
        displayName: req.user.displayName,
        roleLabel: roleLabel(req.user.role),
        lessonTeacher: lesson.currentTeacher,
        lessonTopic: lesson.currentTopic,
        lessonSubject: lesson.currentSubject,
        lessonDate: payload.lessonDate,
        round: lesson.currentRound,
        highlights: payload.highlights,
        suggestions: payload.suggestions,
        criteria: payload.criteria,
        createdAt,
      });

      const submission = createSubmission({
        userId: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName,
        lessonTeacher: lesson.currentTeacher,
        lessonTopic: lesson.currentTopic,
        lessonSubject: lesson.currentSubject,
        evaluator: req.user.displayName,
        role: roleLabel(req.user.role),
        topic: lesson.currentTopic,
        language: lesson.currentSubject,
        otherLanguage: '',
        lessonDate: payload.lessonDate,
        round: lesson.currentRound,
        highlights: payload.highlights,
        suggestions: payload.suggestions,
        criteria: payload.criteria,
        totalScore,
        snapshotFilename,
        createdAt,
      });

      return res.status(201).json({
        id: submission.id,
        message: '评分提交成功，快照已生成。',
      });
    } catch (error) {
      const browserHint = String(error?.message || '').includes('Executable doesn')
        ? '请先在服务器环境安装 Playwright 浏览器依赖。'
        : '请稍后重试。';

      return res.status(500).json({
        message: `提交失败，快照生成未完成。${browserHint}`,
      });
    }
  });

  app.get('/api/admin/lesson', requireAuth, requireSuperAdmin, (_req, res) => {
    res.json(getLessonSettings());
  });

  app.put('/api/admin/lesson', requireAuth, requireSuperAdmin, (req, res) => {
    const parsed = lessonSettingsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || '当前讲课信息不正确。',
      });
    }

    return res.json(updateLessonSettings(parsed.data));
  });

  app.get('/api/admin/users', requireAuth, requireSuperAdmin, (_req, res) => {
    res.json(listUsers());
  });

  app.post('/api/admin/users', requireAuth, requireSuperAdmin, (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || '用户信息填写不正确。',
      });
    }

    if (getUserByUsername(parsed.data.username)) {
      return res.status(409).json({ message: '该账号已存在。' });
    }

    const user = createUser({
      ...parsed.data,
      passwordHash: hashPassword(parsed.data.password),
    });

    return res.status(201).json({
      message: '用户创建成功。',
      user: sanitizeSessionUser(user),
    });
  });

  app.put('/api/admin/users/:id', requireAuth, requireSuperAdmin, (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || '用户更新信息不正确。',
      });
    }

    const targetId = Number(req.params.id);
    const updatedUser = updateUser(targetId, {
      displayName: parsed.data.displayName,
      passwordHash: parsed.data.password
        ? hashPassword(parsed.data.password)
        : undefined,
      role: parsed.data.role,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: '未找到该用户。' });
    }

    return res.json({
      message: '用户信息已更新。',
      user: sanitizeSessionUser(updatedUser),
    });
  });

  app.get('/api/admin/submissions', requireAuth, requireSuperAdmin, (req, res) => {
    res.json(
      listSubmissions({
        teacher: req.query.teacher || '',
        lessonDate: req.query.lessonDate || '',
      }),
    );
  });

  app.get('/api/admin/submissions/summary', requireAuth, requireSuperAdmin, (req, res) => {
    res.json(
      listSubmissionSummaries({
        teacher: req.query.teacher || '',
        lessonDate: req.query.lessonDate || '',
      }),
    );
  });

  app.get('/api/admin/submissions/export', requireAuth, requireSuperAdmin, (req, res) => {
    const workbook = XLSX.utils.book_new();
    const rows = buildExportRows(
      listSubmissionsForExport({
        teacher: req.query.teacher || '',
        lessonDate: req.query.lessonDate || '',
      }),
    );
    const sheet = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(workbook, sheet, '评分记录');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stark-submissions-${getCurrentDateString()}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  });

  app.get('/api/admin/submissions/summary/export', requireAuth, requireSuperAdmin, (req, res) => {
    const workbook = XLSX.utils.book_new();
    const rows = buildSummaryExportRows(
      listSubmissionSummaries({
        teacher: req.query.teacher || '',
        lessonDate: req.query.lessonDate || '',
      }),
    );
    const sheet = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(workbook, sheet, '每周场次汇总');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stark-weekly-summary-${getCurrentDateString()}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  });

  app.get('/api/admin/submissions/:id', requireAuth, requireSuperAdmin, (req, res) => {
    const submission = getSubmissionById(Number(req.params.id));

    if (!submission) {
      return res.status(404).json({ message: '未找到该评分记录。' });
    }

    res.json(submission);
  });

  app.get('/api/admin/submissions/:id/snapshot', requireAuth, requireSuperAdmin, (req, res) => {
    const submission = getSubmissionById(Number(req.params.id));

    if (!submission) {
      return res.status(404).json({ message: '未找到该评分记录。' });
    }

    const filePath = path.resolve(
      path.join(require('./config').snapshotsDir, submission.snapshot_filename),
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '快照文件不存在。' });
    }

    res.sendFile(filePath);
  });

  app.delete('/api/admin/submissions/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    const submission = getSubmissionById(Number(req.params.id));

    if (!submission) {
      return res.status(404).json({ message: '未找到该评分记录。' });
    }

    await removeSnapshot(submission.snapshot_filename);
    deleteSubmission(submission.id);

    res.json({ message: '评分记录和快照已删除。' });
  });

  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  return app;
}

module.exports = {
  createApp,
};
