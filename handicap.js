// オートハンディキャップの計算。数値は handicap.json から読み込む。
//
// handicap.json の01の表: [最大のレーティング差, 差1の開始点, 差2の開始点, ...]
//   レーティング差が d のとき、レーティングが低い側の開始点は d 番目の値。
//   差が表より大きい場合は、最後(いちばん大きなハンデ)の値を使う。
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "handicap.json");

// コマンドの形: /handicap dl1 singles、/handicap dl1 doubles、/handicap dl2
const MODE_LABELS = {
  dartslive2: "AUTO(DARTSLIVE2)",
  "dartslive-singles": "AUTO(DARTSLIVE) シングルス",
  "dartslive-doubles": "AUTO(DARTSLIVE) ダブルス"
};

const GAMES_01 = ["301", "501", "701", "901", "1101", "1501"];

function validateTable(label, table) {
  if (!Array.isArray(table) || table.length < 2) {
    throw new Error(`handicap.json: ${label} が配列ではありません。`);
  }

  const [count, ...values] = table;

  if (values.length !== count) {
    throw new Error(
      `handicap.json: ${label} の個数が合いません(先頭の数値: ${count}、実際: ${values.length})。`
    );
  }

  values.forEach((value, i) => {
    if (!Number.isInteger(value)) {
      throw new Error(`handicap.json: ${label} の ${i + 1} 番目が整数ではありません。`);
    }

    if (i > 0 && value >= values[i - 1]) {
      throw new Error(
        `handicap.json: ${label} の ${i + 1} 番目(${values[i - 1]} → ${value})が減っていません。`
      );
    }
  });
}

function validateCricket(label, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`handicap.json: ${label} が配列ではありません。`);
  }

  rows.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== 5 || !row.every(Number.isInteger)) {
      throw new Error(`handicap.json: ${label} の ${i + 1} 行目が「整数5個」ではありません。`);
    }
  });
}

// 起動時に読み込み、表の形式を検査して、数値の入力ミスを早めに見つける
function loadHandicapData() {
  let data;

  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (error) {
    throw new Error(`handicap.json を読み込めません: ${error.message}`);
  }

  for (const game of GAMES_01) {
    validateTable(`dartslive2 / ${game}`, data.dartslive2?.[game]);
    validateTable(`dartslive singles / ${game}`, data.dartslive?.singles?.[game]);
    validateTable(`dartslive doubles / ${game}`, data.dartslive?.doubles?.[game]);
  }

  validateCricket("dartslive2 / cricket", data.dartslive2?.cricket);
  validateCricket("dartslive / cricket", data.dartslive?.cricket);

  return data;
}

// クリケットの表の1行: [18のマーク数, 17のマーク数, 16のマーク数, 15のマーク数, 持ち点数]
const CRICKET_NUMBERS = [18, 17, 16, 15];

function formatCricketHandicap(row) {
  const parts = [];

  CRICKET_NUMBERS.forEach((number, i) => {
    if (row[i] > 0) {
      parts.push(`${number}×${row[i]}`);
    }
  });

  if (row[4] > 0) {
    parts.push(`持ち点${row[4]}点`);
  }

  return parts.length > 0 ? parts.join(" / ") : "なし";
}

const round2 = value => Math.round(value * 100) / 100;
const sum = list => list.reduce((total, value) => total + value, 0);

/**
 * ハンデを計算する。
 * side1 / side2: シングルスは数値、ダブルスは [1人目, 2人目] の配列。
 * ダブルスは、チーム2人のレーティングの合計どうしで比べる。
 * レーティングは、カードに表示される整数部(切り捨て)で判定する(1人ずつ切り捨ててから合計)。
 * start1 / start2 は、1人目(チーム1)・2人目(チーム2)の開始点。
 */
function calculateHandicap(mode, game, side1, side2) {
  const data = loadHandicapData();
  if (!MODE_LABELS[mode]) {
    return fail("ハンデの種類が正しくありません。");
  }

  const isCricket = game === "cricket";

  if (!isCricket && !GAMES_01.includes(game)) {
    return fail(`ゲームの種類が正しくありません: ${game}`);
  }

  const table = isCricket
    ? (mode === "dartslive2" ? data.dartslive2?.cricket : data.dartslive?.cricket)
    : getTable(data, mode, game);

  if (!table) {
    return fail(`ハンデ表がありません: ${MODE_LABELS[mode]} / ${game}`);
  }

  const list1 = Array.isArray(side1) ? side1 : [side1];
  const list2 = Array.isArray(side2) ? side2 : [side2];
  const members = mode === "dartslive-doubles" ? 2 : 1;

  if (list1.length !== members || list2.length !== members) {
    return fail("レーティングの数が正しくありません。");
  }

  if (![...list1, ...list2].every(Number.isFinite)) {
    return fail("レーティングを数値で入力してください。");
  }

  const gameScore = isCricket ? "なし" : Number(game);
  const total1 = round2(sum(list1));
  const total2 = round2(sum(list2));
  const diff = round2(Math.abs(total1 - total2));
  const rating1 = sum(list1.map(Math.floor));
  const rating2 = sum(list2.map(Math.floor));
  const steps = Math.abs(rating1 - rating2);

  if (isCricket) {
    // クリケットの表は、行の番号がレーティング差(1〜)。差が表より大きい場合は最後の行を使う
    if (steps === 0) {
      return {
        ok: true,
        handicap: "なし",
        unit: "",
        total1,
        total2,
        diff,
        steps,
        lowerSide: 0,
        start1: "なし",
        start2: "なし"
      };
    }

    const row = table[Math.min(steps, table.length) - 1];
    const lowerSide = rating1 < rating2 ? 1 : 2;
    const text = formatCricketHandicap(row);

    return {
      ok: true,
      handicap: text,
      unit: "",
      total1,
      total2,
      diff,
      steps,
      lowerSide,
      start1: lowerSide === 1 ? text : "なし",
      start2: lowerSide === 2 ? text : "なし",
      note:
        steps > table.length
          ? "レーティングの差が表の上限を超えているため、最大のハンデを適用しています。"
          : undefined
    };
  }

  if (steps === 0) {
    return {
      ok: true,
      handicap: "なし",
      unit: "",
      total1,
      total2,
      diff,
      steps,
      lowerSide: 0,
      start1: gameScore,
      start2: gameScore
    };
  }

  const [maxDiff, ...values] = table;
  const start = values[Math.min(steps, values.length) - 1];
  const lowerSide = rating1 < rating2 ? 1 : 2;

  return {
    ok: true,
    handicap: start,
    unit: "点スタート",
    total1,
    total2,
    diff,
    steps,
    lowerSide,
    start1: lowerSide === 1 ? start : gameScore,
    start2: lowerSide === 2 ? start : gameScore,
    note:
      steps > maxDiff
        ? "レーティングの差が表の上限を超えているため、最大のハンデを適用しています。"
        : undefined
  };
}

module.exports = { MODE_LABELS, loadHandicapData, listGames, calculateHandicap };
