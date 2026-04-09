const dayjs = require('dayjs');

function formatDisplayDate(value) {
  if (!value) {
    return '';
  }

  return dayjs(value).isValid() ? dayjs(value).format('YYYY年MM月DD日') : value;
}

function getCurrentDateString() {
  return dayjs().format('YYYY-MM-DD');
}

function isDateWithinRange(date, startDate, endDate) {
  if (!date) {
    return false;
  }

  if (startDate && date < startDate) {
    return false;
  }

  if (endDate && date > endDate) {
    return false;
  }

  return true;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getScoreLevel(totalScore) {
  if (totalScore >= 90) {
    return { text: '优秀', color: '#0f766e' };
  }

  if (totalScore >= 80) {
    return { text: '良好', color: '#2563eb' };
  }

  if (totalScore >= 70) {
    return { text: '合格', color: '#d97706' };
  }

  return { text: '需改进', color: '#dc2626' };
}

module.exports = {
  escapeHtml,
  formatDisplayDate,
  getCurrentDateString,
  getScoreLevel,
  isDateWithinRange,
};
