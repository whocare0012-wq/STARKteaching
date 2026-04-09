const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { adminPassword, adminUsername, databasePath, snapshotsDir } = require('./config');
const { hashPassword } = require('./utils/password');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.mkdirSync(snapshotsDir, { recursive: true });

const db = new Database(databasePath);

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_teacher TEXT NOT NULL DEFAULT '',
    current_topic TEXT NOT NULL DEFAULT '',
    current_subject TEXT NOT NULL DEFAULT '',
    current_round TEXT NOT NULL DEFAULT '',
    scoring_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('USER', 'SUPER_ADMIN')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher TEXT NOT NULL DEFAULT '',
    user_id INTEGER,
    username TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    lesson_teacher TEXT NOT NULL DEFAULT '',
    lesson_topic TEXT NOT NULL DEFAULT '',
    lesson_subject TEXT NOT NULL DEFAULT '',
    evaluator TEXT NOT NULL,
    role TEXT NOT NULL,
    topic TEXT NOT NULL,
    language TEXT NOT NULL,
    other_language TEXT NOT NULL,
    lesson_date TEXT NOT NULL,
    round TEXT NOT NULL,
    highlights TEXT NOT NULL,
    suggestions TEXT NOT NULL,
    criteria_json TEXT NOT NULL,
    total_score INTEGER NOT NULL,
    snapshot_filename TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

ensureColumn('site_settings', 'current_teacher', "TEXT NOT NULL DEFAULT ''");
ensureColumn('site_settings', 'current_topic', "TEXT NOT NULL DEFAULT ''");
ensureColumn('site_settings', 'current_subject', "TEXT NOT NULL DEFAULT ''");
ensureColumn('site_settings', 'current_round', "TEXT NOT NULL DEFAULT ''");
ensureColumn('site_settings', 'scoring_enabled', 'INTEGER NOT NULL DEFAULT 0');

ensureColumn('submissions', 'user_id', 'INTEGER');
ensureColumn('submissions', 'teacher', "TEXT NOT NULL DEFAULT ''");
ensureColumn('submissions', 'username', "TEXT NOT NULL DEFAULT ''");
ensureColumn('submissions', 'display_name', "TEXT NOT NULL DEFAULT ''");
ensureColumn('submissions', 'lesson_teacher', "TEXT NOT NULL DEFAULT ''");
ensureColumn('submissions', 'lesson_topic', "TEXT NOT NULL DEFAULT ''");
ensureColumn('submissions', 'lesson_subject', "TEXT NOT NULL DEFAULT ''");

const now = new Date().toISOString();
db.prepare(
  `
    INSERT INTO site_settings (id, current_teacher, current_topic, current_subject, current_round, scoring_enabled, updated_at)
    VALUES (1, '', '', '', '', 0, ?)
    ON CONFLICT(id) DO NOTHING
  `,
).run(now);

function seedSuperAdmin() {
  const existing = db
    .prepare("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1")
    .get();

  if (existing) {
    return;
  }

  const createdAt = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO users (username, display_name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, 'SUPER_ADMIN', ?, ?)
    `,
  ).run(
    adminUsername,
    '超级管理员',
    hashPassword(adminPassword),
    createdAt,
    createdAt,
  );
}

seedSuperAdmin();

function normalizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSubmission(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    criteria: JSON.parse(row.criteria_json),
  };
}

function getLessonSettings() {
  const lesson = db
    .prepare(
      `
        SELECT
          current_teacher AS currentTeacher,
          current_topic AS currentTopic,
          current_subject AS currentSubject,
          current_round AS currentRound,
          scoring_enabled AS scoringEnabled,
          updated_at AS updatedAt
        FROM site_settings
        WHERE id = 1
      `,
    )
    .get();

  return {
    ...lesson,
    scoringEnabled: Boolean(lesson?.scoringEnabled),
  };
}

function updateLessonSettings(payload) {
  const updatedAt = new Date().toISOString();
  db.prepare(
    `
      UPDATE site_settings
      SET current_teacher = ?, current_topic = ?, current_subject = ?, current_round = ?, scoring_enabled = ?, updated_at = ?
      WHERE id = 1
    `,
  ).run(
    payload.currentTeacher,
    payload.currentTopic,
    payload.currentSubject,
    payload.currentRound,
    payload.scoringEnabled ? 1 : 0,
    updatedAt,
  );

  const lesson = getLessonSettings();
  return {
    ...lesson,
    scoringEnabled: Boolean(lesson.scoringEnabled),
  };
}

function getUserById(id) {
  const row = db
    .prepare(
      `
        SELECT id, username, display_name, password_hash, role, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
    )
    .get(id);

  if (!row) {
    return null;
  }

  return {
    ...normalizeUser(row),
    passwordHash: row.password_hash,
  };
}

function getUserByUsername(username) {
  const row = db
    .prepare(
      `
        SELECT id, username, display_name, password_hash, role, created_at, updated_at
        FROM users
        WHERE username = ?
      `,
    )
    .get(username);

  if (!row) {
    return null;
  }

  return {
    ...normalizeUser(row),
    passwordHash: row.password_hash,
  };
}

function listUsers() {
  return db
    .prepare(
      `
        SELECT id, username, display_name, role, created_at, updated_at
        FROM users
        ORDER BY role DESC, datetime(created_at) ASC, id ASC
      `,
    )
    .all()
    .map(normalizeUser);
}

function createUser(payload) {
  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `
        INSERT INTO users (username, display_name, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      payload.username,
      payload.displayName,
      payload.passwordHash,
      payload.role,
      createdAt,
      createdAt,
    );

  return getUserById(result.lastInsertRowid);
}

function updateUser(id, payload) {
  const current = getUserById(id);

  if (!current) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  db.prepare(
    `
      UPDATE users
      SET display_name = ?, password_hash = ?, role = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(
    payload.displayName ?? current.displayName,
    payload.passwordHash ?? current.passwordHash,
    payload.role ?? current.role,
    updatedAt,
    id,
  );

  return getUserById(id);
}

function createSubmission(payload) {
  const result = db
    .prepare(
      `
        INSERT INTO submissions (
          teacher,
          user_id,
          username,
          display_name,
          lesson_teacher,
          lesson_topic,
          lesson_subject,
          evaluator,
          role,
          topic,
          language,
          other_language,
          lesson_date,
          round,
          highlights,
          suggestions,
          criteria_json,
          total_score,
          snapshot_filename,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      payload.lessonTeacher,
      payload.userId,
      payload.username,
      payload.displayName,
      payload.lessonTeacher,
      payload.lessonTopic,
      payload.lessonSubject,
      payload.evaluator,
      payload.role,
      payload.topic,
      payload.language,
      payload.otherLanguage || '',
      payload.lessonDate,
      payload.round,
      payload.highlights,
      payload.suggestions,
      JSON.stringify(payload.criteria),
      payload.totalScore,
      payload.snapshotFilename,
      payload.createdAt,
    );

  return getSubmissionById(result.lastInsertRowid);
}

function getSubmissionById(id) {
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  return normalizeSubmission(row);
}

function listSubmissions(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.teacher) {
    conditions.push('lesson_teacher LIKE ?');
    params.push(`%${filters.teacher}%`);
  }

  if (filters.lessonDate) {
    conditions.push('lesson_date = ?');
    params.push(filters.lessonDate);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return db
    .prepare(
      `
        SELECT
          id,
          lesson_teacher,
          lesson_topic,
          lesson_subject,
          display_name,
          role,
          lesson_date,
          total_score,
          snapshot_filename,
          created_at
        FROM submissions
        ${whereClause}
        ORDER BY datetime(created_at) DESC, id DESC
      `,
    )
    .all(...params)
    .map((row) => ({
      id: row.id,
      teacher: row.lesson_teacher,
      topic: row.lesson_topic,
      subject: row.lesson_subject,
      evaluator: row.display_name,
      role: row.role,
      lesson_date: row.lesson_date,
      total_score: row.total_score,
      snapshot_filename: row.snapshot_filename,
      created_at: row.created_at,
    }));
}

function listSubmissionsForExport(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.teacher) {
    conditions.push('lesson_teacher LIKE ?');
    params.push(`%${filters.teacher}%`);
  }

  if (filters.lessonDate) {
    conditions.push('lesson_date = ?');
    params.push(filters.lessonDate);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return db
    .prepare(
      `
        SELECT *
        FROM submissions
        ${whereClause}
        ORDER BY datetime(created_at) DESC, id DESC
      `,
    )
    .all(...params)
    .map(normalizeSubmission);
}

function deleteSubmission(id) {
  return db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
}

function parseDateParts(dateString) {
  const [year, month, day] = String(dateString || '')
    .split('-')
    .map((value) => Number(value));

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

function formatUtcDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekRange(dateString) {
  const parts = parseDateParts(dateString);

  if (!parts) {
    return {
      weekStart: '',
      weekEnd: '',
      weekLabel: '未识别周次',
    };
  }

  const baseDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const weekDay = baseDate.getUTCDay();
  const offset = weekDay === 0 ? 6 : weekDay - 1;

  const weekStart = new Date(baseDate);
  weekStart.setUTCDate(baseDate.getUTCDate() - offset);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  const startText = formatUtcDate(weekStart);
  const endText = formatUtcDate(weekEnd);

  return {
    weekStart: startText,
    weekEnd: endText,
    weekLabel: `${startText} 至 ${endText}`,
  };
}

function listSubmissionSummaries(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.teacher) {
    conditions.push('lesson_teacher LIKE ?');
    params.push(`%${filters.teacher}%`);
  }

  if (filters.lessonDate) {
    conditions.push('lesson_date = ?');
    params.push(filters.lessonDate);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const rows = db
    .prepare(
      `
        SELECT
          id,
          username,
          display_name,
          role,
          lesson_teacher,
          lesson_topic,
          lesson_subject,
          lesson_date,
          round,
          highlights,
          suggestions,
          total_score,
          created_at
        FROM submissions
        ${whereClause}
        ORDER BY lesson_date DESC, round ASC, lesson_teacher ASC, datetime(created_at) ASC, id ASC
      `,
    )
    .all(...params);

  const weekMap = new Map();

  for (const row of rows) {
    const weekInfo = getWeekRange(row.lesson_date);
    const weekKey = weekInfo.weekStart || 'unknown-week';

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart: weekInfo.weekStart,
        weekEnd: weekInfo.weekEnd,
        weekLabel: weekInfo.weekLabel,
        reviewCount: 0,
        sessions: [],
        _sessionMap: new Map(),
      });
    }

    const weekBucket = weekMap.get(weekKey);
    const sessionKey = [
      row.lesson_date,
      row.round || '',
      row.lesson_teacher || '',
      row.lesson_subject || '',
      row.lesson_topic || '',
    ].join('||');

    if (!weekBucket._sessionMap.has(sessionKey)) {
      const session = {
        sessionKey,
        lessonDate: row.lesson_date,
        round: row.round,
        teacher: row.lesson_teacher,
        subject: row.lesson_subject,
        topic: row.lesson_topic,
        reviewCount: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        reviews: [],
        _totalScore: 0,
      };

      weekBucket._sessionMap.set(sessionKey, session);
      weekBucket.sessions.push(session);
    }

    const session = weekBucket._sessionMap.get(sessionKey);
    session.reviewCount += 1;
    session._totalScore += Number(row.total_score || 0);
    session.maxScore = session.reviewCount === 1
      ? Number(row.total_score || 0)
      : Math.max(session.maxScore, Number(row.total_score || 0));
    session.minScore = session.reviewCount === 1
      ? Number(row.total_score || 0)
      : Math.min(session.minScore, Number(row.total_score || 0));
    session.reviews.push({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      totalScore: Number(row.total_score || 0),
      highlights: row.highlights,
      suggestions: row.suggestions,
      createdAt: row.created_at,
    });

    weekBucket.reviewCount += 1;
  }

  return Array.from(weekMap.values()).map((weekBucket) => {
    const sessions = weekBucket.sessions.map((session) => ({
      sessionKey: session.sessionKey,
      lessonDate: session.lessonDate,
      round: session.round,
      teacher: session.teacher,
      subject: session.subject,
      topic: session.topic,
      reviewCount: session.reviewCount,
      averageScore: Number((session._totalScore / session.reviewCount).toFixed(1)),
      maxScore: session.maxScore,
      minScore: session.minScore,
      reviews: session.reviews,
    }));

    sessions.sort((left, right) => {
      if (left.lessonDate !== right.lessonDate) {
        return left.lessonDate < right.lessonDate ? 1 : -1;
      }
      return String(left.round || '').localeCompare(String(right.round || ''), 'zh-CN');
    });

    return {
      weekStart: weekBucket.weekStart,
      weekEnd: weekBucket.weekEnd,
      weekLabel: weekBucket.weekLabel,
      sessionCount: sessions.length,
      reviewCount: weekBucket.reviewCount,
      sessions,
    };
  });
}

module.exports = {
  createSubmission,
  createUser,
  deleteSubmission,
  getLessonSettings,
  getSubmissionById,
  getUserById,
  getUserByUsername,
  listSubmissions,
  listSubmissionSummaries,
  listSubmissionsForExport,
  listUsers,
  updateLessonSettings,
  updateUser,
};
