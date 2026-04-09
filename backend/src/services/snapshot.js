const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');
const { snapshotsDir } = require('../config');
const {
  escapeHtml,
  formatDisplayDate,
  getScoreLevel,
} = require('../utils/helpers');

function renderSnapshotHtml(submission) {
  const totalScore = submission.criteria.reduce(
    (sum, item) => sum + Number(item.score || 0),
    0,
  );
  const level = getScoreLevel(totalScore);

  const criteriaRows = submission.criteria
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title.replaceAll('<br>', ' '))}</td>
          <td>${escapeHtml(item.desc)}</td>
          <td class="score-cell">${item.score} / ${item.max}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>评分表快照</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 30px;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            background: #f8fafc;
            color: #0f172a;
          }
          .sheet {
            width: 1320px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
            border: 1px solid #e2e8f0;
            padding: 32px 36px 40px;
          }
          .top {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 22px;
          }
          .title {
            margin: 0 0 8px;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 1px;
          }
          .subtitle {
            margin: 0;
            color: #64748b;
            font-size: 15px;
          }
          .score-box {
            min-width: 180px;
            border-radius: 20px;
            padding: 18px;
            text-align: center;
            background: #eff6ff;
          }
          .score-box strong {
            display: block;
            font-size: 40px;
            line-height: 1;
            color: ${level.color};
          }
          .score-box span {
            display: block;
            margin-top: 10px;
            font-size: 15px;
            color: ${level.color};
            font-weight: 700;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px 18px;
            margin-top: 24px;
          }
          .field {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            padding: 14px 16px;
          }
          .label {
            color: #64748b;
            font-size: 13px;
            margin-bottom: 8px;
          }
          .value {
            font-size: 18px;
            font-weight: 600;
            min-height: 28px;
          }
          .section {
            margin-top: 26px;
          }
          .section h2 {
            margin: 0 0 12px;
            font-size: 20px;
            color: #1d4ed8;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          th, td {
            padding: 14px 16px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          th {
            background: #eff6ff;
            text-align: left;
            color: #334155;
            font-size: 14px;
          }
          td {
            color: #334155;
            font-size: 14px;
          }
          .score-cell {
            width: 150px;
            white-space: nowrap;
            font-weight: 700;
            color: #1d4ed8;
          }
          .feedback-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }
          .feedback-card {
            min-height: 180px;
            border-radius: 20px;
            padding: 18px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
          }
          .feedback-card.tip {
            background: #fffbeb;
            border-color: #fde68a;
          }
          .feedback-card h3 {
            margin: 0 0 10px;
            font-size: 15px;
          }
          .feedback-card p {
            margin: 0;
            white-space: pre-wrap;
            line-height: 1.7;
            color: #334155;
          }
          .footer {
            margin-top: 22px;
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="top">
            <div>
              <h1 class="title">STARK 教师授课评分表快照</h1>
              <p class="subtitle">系统根据提交结果自动生成，用于后台归档和打印。</p>
            </div>
            <div class="score-box">
              <strong>${totalScore}</strong>
              <span>${level.text}</span>
            </div>
          </div>

          <div class="grid">
            <div class="field"><div class="label">当前讲课老师</div><div class="value">${escapeHtml(submission.lessonTeacher)}</div></div>
            <div class="field"><div class="label">评分用户 / 权限</div><div class="value">${escapeHtml(submission.displayName)} / ${escapeHtml(submission.roleLabel)}</div></div>
            <div class="field"><div class="label">当前讲课内容</div><div class="value">${escapeHtml(submission.lessonTopic)}</div></div>
            <div class="field"><div class="label">当前讲课科目</div><div class="value">${escapeHtml(submission.lessonSubject)}</div></div>
            <div class="field"><div class="label">授课日期</div><div class="value">${escapeHtml(formatDisplayDate(submission.lessonDate))}</div></div>
            <div class="field"><div class="label">授课轮次 / 时间</div><div class="value">${escapeHtml(submission.round || '未填写')}</div></div>
          </div>

          <section class="section">
            <h2>评分细则</h2>
            <table>
              <thead>
                <tr>
                  <th>评价维度</th>
                  <th>评价指标及细则</th>
                  <th>得分</th>
                </tr>
              </thead>
              <tbody>${criteriaRows}</tbody>
            </table>
          </section>

          <section class="section">
            <h2>评课反馈</h2>
            <div class="feedback-grid">
              <div class="feedback-card">
                <h3>优点 / 核心亮点</h3>
                <p>${escapeHtml(submission.highlights || '未填写')}</p>
              </div>
              <div class="feedback-card tip">
                <h3>改进建议</h3>
                <p>${escapeHtml(submission.suggestions || '未填写')}</p>
              </div>
            </div>
          </section>

          <div class="footer">
            <span>生成时间：${escapeHtml(formatDisplayDate(submission.createdAt.slice(0, 10)))}</span>
            <span>STARK 教师听课评分系统</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function generateSnapshot(submission) {
  const filename = `submission-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.png`;
  const filePath = path.join(snapshotsDir, filename);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2400 },
      deviceScaleFactor: 1.5,
    });
    await page.setContent(renderSnapshotHtml(submission), {
      waitUntil: 'load',
    });
    await page.screenshot({
      path: filePath,
      type: 'png',
      fullPage: true,
    });
    return filename;
  } finally {
    await browser.close();
  }
}

async function removeSnapshot(filename) {
  if (!filename) {
    return;
  }

  const filePath = path.join(snapshotsDir, filename);
  await fs.rm(filePath, { force: true });
}

module.exports = {
  generateSnapshot,
  removeSnapshot,
};
