require("./server");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

console.log("ぽっぽ v1.2.0");

if (!TOKEN || !CLIENT_ID) {
  throw new Error("DISCORD_TOKEN と DISCORD_CLIENT_ID を設定してください。");
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const finishPriority = {
  master: {
    "BULL": 200,
    "D16": 170,
    "D20": 150,
    "D18": 129,
    "D19": 118,
    "D17": 116,
    "D12": 116,
    "D14": 114,
    "D8": 104,
    "D4": 102,
    "T20": 95,
    "T19": 93,
    "T18": 92,
    "T17": 91,
    "T16": 90,
    "T15": 88,
    "D10": 88,
    "T14": 86,
    "D2": 84,
    "T12": 84,
    "D-BULL": 20
  },

  double: {
    "D16": 170,
    "D20": 150,
    "D18": 148,
    "D8": 146,
    "D4": 142,
    "D2": 130,
    "D12": 110,
    "D14": 105,
    "D10": 88,
    "D6": 86,
    "D19": 10,
    "D17": 10,
    "D13": 10,
    "D11": 10,
    "D9": 10,
    "D7": 10,
    "D5": 10,
    "D3": 10,
    "D1": 10,
    "D-BULL": 5,
  },

  open: {
    "D16": 110,
    "D20": 109,
    "D18": 108,
    "BULL": 105,
    "D12": 104,
    "D14": 103,
    "T20": 98,
    "T19": 96,
    "T18": 94,
    "T17": 92,
    "T16": 90,
    "D10": -300,
    "D9": -300,
    "D8": -300,
    "D7": -300,
    "D6": -300,
    "D5": -300,
    "D4": -300,
    "D3": -300,
    "D2": -300,
    "D1": -300,
  }
};

const firstDartPriority = {
  "BULL": 170,
  "T20": 130,
  "T19": 126,
  "T18": 122,
  "T17": 118,
  "T16": 114,
  "T15": 110,
  "S-BULL": -10,
  "D-BULL": -20
};

const goodRemainingBonus = {
  64: 75,
  82: 75,
  83: 70,
  89: 70,
  98: 70,
  101: 70,
  104: 70,
  107: 70,
  110: 70,
  93: 65,
  96: 65
};

const sameTargetBonus = {
  secondDart: {
    sameNumber: 15,
    sameType: 4,
    sameTarget: 70
  },
  thirdDart: {
    sameNumber: 10,
    sameType: 2,
    sameTarget: 45
  }
};

const tripleEase = {
  20: 115,
  19: 96,
  18: 92,
  17: 88,
  16: 84,
  15: 80,
  14: 75,
  13: 30,
  12: 65,
  11: 30,
  10: 55,
  9: 50,
  8: 45,
  7: 40,
  6: 35,
  5: 30,
  4: 25,
  3: 20,
  2: 15,
  1: 10
};

const doubleEase = {
  16: 105,
  20: 98,
  18: 96,
  12: 94,
  14: 92,
  19: 90,
  17: 88,
  8: 86,
  4: 84,
  10: 82,
  6: 80,
  2: 78,
  3: 76,
  7: 74,
  9: 72,
  11: 70,
  13: 68,
  15: 66,
  5: 64,
  1: 62
};

function createDarts(bullMode) {
  const darts = [];

  for (let n = 1; n <= 20; n++) {
    darts.push({
      name: `S${n}`,
      score: n,
      type: "single",
      number: n
    });

    darts.push({
      name: `D${n}`,
      score: n * 2,
      type: "double",
      number: n
    });

    darts.push({
      name: `T${n}`,
      score: n * 3,
      type: "triple",
      number: n
    });
  }

  if (bullMode === "fat") {
    darts.push({
      name: "BULL",
      score: 50,
      type: "bull",
      number: null
    });
  } else {
    darts.push({
      name: "S-BULL",
      score: 25,
      type: "singleBull",
      number: null
    });

    darts.push({
      name: "D-BULL",
      score: 50,
      type: "doubleBull",
      number: null
    });
  }

  return darts;
}

function isValidFinish(dart, outMode) {
  if (outMode === "open") {
    return true;
  }

  if (outMode === "double") {
    return dart.type === "double" || dart.type === "doubleBull";
  }

  if (outMode === "master") {
    return (
      dart.type === "double" ||
      dart.type === "triple" ||
      dart.type === "bull" ||
      dart.type === "doubleBull"
    );
  }

  return false;
}

function canContinueAfterDart(remaining, outMode) {
  if (remaining <= 0) {
    return false;
  }

  if ((outMode === "double" || outMode === "master") && remaining === 1) {
    return false;
  }

  return true;
}

function getTargetEase(dart) {
  if (dart.type === "bull" || dart.type === "doubleBull") {
    return 120;
  }

  if (dart.type === "singleBull") {
    return 67;
  }

  if (dart.type === "triple") {
    return tripleEase[dart.number];
  }

  if (dart.type === "double") {
    return doubleEase[dart.number];
  }

  return 58 + Math.max(0, 20 - Math.abs(20 - dart.number)) * 0.35;
}

function getFinishPreference(dart, outMode) {
  return finishPriority[outMode]?.[dart.name] || 0;
}

function getFirstDartPriority(dart) {
  return firstDartPriority[dart.name] || 0;
}


function getSameTargetBonus(route, index) {
  if (index === 0) {
    return 0;
  }

  const current = route[index];
  const previous = route[index - 1];

  const bonus =
    index === 1
      ? sameTargetBonus.secondDart
      : sameTargetBonus.thirdDart;

  let score = 0;

  if (
    current.number !== null &&
    previous.number !== null &&
    current.number === previous.number
  ) {
    score += bonus.sameNumber;
  }

  if (
    current.type === previous.type &&
    current.type !== "singleBull" &&
    current.type !== "doubleBull" &&
    current.type !== "bull"
  ) {
    score += bonus.sameType;
  }

  if (current.name === previous.name) {
    score += bonus.sameTarget;
  }

  return score;
}

function getPossibleMissScores(dart) {
  if (dart.type === "bull" || dart.type === "doubleBull") {
    return [dart.score];
  }

  if (dart.type === "singleBull") {
    return [25, 50];
  }

  if (dart.type === "triple") {
    return [
      dart.score,
      dart.number,
      dart.number * 2
    ];
  }

  if (dart.type === "double") {
    const scores = [
      dart.score,
      dart.number
    ];

    if (dart.number > 1) {
      scores.push(dart.number - 1);
    }

    if (dart.number < 20) {
      scores.push(dart.number + 1);
    }

    return scores;
  }

  const scores = [dart.score];

  if (dart.number > 1) {
    scores.push(dart.number - 1);
  }

  if (dart.number < 20) {
    scores.push(dart.number + 1);
  }

  return scores;
}

function getBestContinuationQuality(
  remaining,
  dartsLeft,
  bullMode,
  outMode,
  darts,
  cache
) {
  if (remaining === 0) {
    return 120;
  }

  if (remaining < 0 || dartsLeft <= 0) {
    return -100;
  }

  const key = `${remaining}|${dartsLeft}|${bullMode}|${outMode}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  let best = -100;

  for (const dart of darts) {
    if (dart.score > remaining) {
      continue;
    }

    const next = remaining - dart.score;

    if (next === 0) {
      if (!isValidFinish(dart, outMode)) {
        continue;
      }

      const value =
        100 +
        getTargetEase(dart) * 0.6 +
        getFinishPreference(dart, outMode) * 0.3;

      if (value > best) {
        best = value;
      }

      continue;
    }

    if (dartsLeft <= 1 || !canContinueAfterDart(next, outMode)) {
      continue;
    }

    const continuation =
      getBestContinuationQuality(
        next,
        dartsLeft - 1,
        bullMode,
        outMode,
        darts,
        cache
      );

    const value =
      getTargetEase(dart) * 0.35 +
      continuation * 0.65;

    if (value > best) {
      best = value;
    }
  }

  cache.set(key, best);

  return best;
}

function getStabilityScore(
  remaining,
  dart,
  dartsLeft,
  bullMode,
  outMode,
  darts,
  cache,
  stabilityCache
) {
  const key =
    `${remaining}|${dart.name}|${dartsLeft}|${bullMode}|${outMode}`;

  if (stabilityCache.has(key)) {
    return stabilityCache.get(key);
  }

  const possibleScores = getPossibleMissScores(dart);
  const qualities = [];

  for (const score of possibleScores) {
    const next = remaining - score;

    if (next < 0) {
      qualities.push(-80);
      continue;
    }

    if (next === 0) {
      qualities.push(
        isValidFinish(dart, outMode) ? 120 : -80
      );
      continue;
    }

    if (dartsLeft <= 1) {
      qualities.push(-80);
      continue;
    }

    qualities.push(
      getBestContinuationQuality(
        next,
        dartsLeft - 1,
        bullMode,
        outMode,
        darts,
        cache
      )
    );
  }

  if (qualities.length === 0) {
    stabilityCache.set(key, -80);
    return -80;
  }

  const best = Math.max(...qualities);
  const average =
    qualities.reduce((sum, value) => sum + value, 0) /
    qualities.length;

  const result =
    best * 0.55 +
    average * 0.45;

  stabilityCache.set(key, result);

  return result;
}

function scoreRoute(
  route,
  startScore,
  bullMode,
  outMode,
  darts,
  cache,
  stabilityCache
) {
  let remaining = startScore;
  let score = 0;

  const breakdown = {
    targetEase: 0,
    stability: 0,
    firstDartPriority: 0,
    sameTarget: 0,
    continuation: 0,
    finishPreference: 0,
    bullBonus: 0,
    singleBullBonus: 0,
    singleBonus: 0,
    doubleBonus: 0,
    tripleBonus: 0,
    goodRemainingBonus: 0,
    lengthBonus: 0
  };

  for (let i = 0; i < route.length; i++) {
    const dart = route[i];
    const dartsLeft = 3 - i;

    const targetEase = getTargetEase(dart) * 0.9;
    score += targetEase;
    breakdown.targetEase += targetEase;

    const stability =
      getStabilityScore(
        remaining,
        dart,
        dartsLeft,
        bullMode,
        outMode,
        darts,
        cache,
        stabilityCache
      ) * 0.75;

    score += stability;
    breakdown.stability += stability;

    if (i === 0) {
      const firstDartPriority = getFirstDartPriority(dart) * 1.5;
      score += firstDartPriority;
      breakdown.firstDartPriority += firstDartPriority;

      const remainingAfterFirst = remaining - dart.score;
      const goodRemaining = goodRemainingBonus[remainingAfterFirst] || 0;
      score += goodRemaining;
      breakdown.goodRemainingBonus += goodRemaining;
    }

    const sameTarget = getSameTargetBonus(route, i);
    score += sameTarget;
    breakdown.sameTarget += sameTarget;

    if (i === route.length - 1) {
      let finishPreference;
      if (dart.type === "double") {
        finishPreference = getFinishPreference(dart, outMode) * 0.6;
      } else {
        finishPreference = getFinishPreference(dart, outMode) * 0.25;
      }

      score += finishPreference;
      breakdown.finishPreference += finishPreference;
    } else {
      const nextRemaining = remaining - dart.score;

      const continuation =
        getBestContinuationQuality(
          nextRemaining,
          dartsLeft - 1,
          bullMode,
          outMode,
          darts,
          cache
        ) * 0.18;

      score += continuation;
      breakdown.continuation += continuation;
    }

    if (dart.type === "bull") {
      score += 18;
      breakdown.bullBonus += 18;
    }

    if (dart.type === "singleBull") {
      score += 8;
      breakdown.singleBullBonus += 8;
    }

    if (dart.type === "single") {
      if (route.length === 3) {
        if (i === 0) {
          score += 60;
          breakdown.singleBonus += 60;
        } else if (i === 1) {
          score += 75;
          breakdown.singleBonus += 75;
        }
      } else if (route.length === 2) {
        if (i === 0) {
          score += 250;
          breakdown.singleBonus += 250;
        }
      }
    }

    if (dart.type === "double") {
      if (i < route.length - 1) {
        score -= 80;
        breakdown.doubleBonus -= 80;
      }
    }

    if (dart.type === "triple" && route.length === 3) {
      if (bullMode === "fat") {
        if (i === 0) {
          score -= 50;
          breakdown.tripleBonus -= 50;
        } else if (i === 1) {
          score -= 40;
          breakdown.tripleBonus -= 40;
        }
      } else {
        if (i === 0) {
          score -= 20;
          breakdown.tripleBonus -= 20;
        } else if (i === 1) {
          score -= 30;
          breakdown.tripleBonus -= 30;
        }
      }
    }

    remaining -= dart.score;
  }

  if (route.length === 1) {
    score += 1000;
    breakdown.lengthBonus += 1000;
  } else if (route.length === 2) {
    score += 300;
    breakdown.lengthBonus += 300;
  }

  return {
    score,
    breakdown
  };
}

function findFinishes(startScore, bullMode, outMode) {
  const darts = createDarts(bullMode);
  const routes = [];
  const qualityCache = new Map();
  const stabilityCache = new Map();

  function search(remaining, route) {
    if (route.length >= 3) {
      return;
    }

    for (const dart of darts) {
      const next = remaining - dart.score;

      if (next < 0) {
        continue;
      }

      if (next === 0) {
        if (isValidFinish(dart, outMode)) {
          routes.push([...route, dart]);
        }

        continue;
      }

      if (
        route.length < 2 &&
        canContinueAfterDart(next, outMode)
      ) {
        search(next, [...route, dart]);
      }
    }
  }

  search(startScore, []);

  const unique = new Map();

  for (const route of routes) {
    const key = route.map(dart => dart.name).join(" → ");

    if (!unique.has(key)) {
      unique.set(key, route);
    }
  }

  const scoredRoutes = [...unique.values()].map(route => {
    const result = scoreRoute(
      route,
      startScore,
      bullMode,
      outMode,
      darts,
      qualityCache,
      stabilityCache
    );

    return {
      route,
      score: result.score,
      breakdown: result.breakdown
    };
  });

  scoredRoutes.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    if (a.route.length !== b.route.length) {
      return a.route.length - b.route.length;
    }

    return (
      b.route[b.route.length - 1].score -
      a.route[a.route.length - 1].score
    );
  });

  const selected = scoredRoutes.slice(0, 5);

  console.log(`\n[Finish] ${startScore} / ${bullMode} / ${outMode}`);

  selected.forEach((item, index) => {
    const b = item.breakdown;

    console.log(
      `${index + 1}. ${formatRoute(item.route)}`
    );

    console.log(
      `  total=${item.score.toFixed(2)}`,
      `targetEase=${b.targetEase.toFixed(2)}`,
      `stability=${b.stability.toFixed(2)}`,
      `firstDart=${b.firstDartPriority.toFixed(2)}`,
      `sameTarget=${b.sameTarget.toFixed(2)}`,
      `continuation=${b.continuation.toFixed(2)}`,
      `finish=${b.finishPreference.toFixed(2)}`,
      `bull=${b.bullBonus.toFixed(2)}`,
      `singleBull=${b.singleBullBonus.toFixed(2)}`,
      `single=${b.singleBonus.toFixed(2)}`,
      `double=${b.doubleBonus.toFixed(2)}`,
      `triple=${b.tripleBonus.toFixed(2)}`,
      `goodRemaining=${b.goodRemainingBonus.toFixed(2)}`,
      `length=${b.lengthBonus.toFixed(2)}`
    );
  });

  return selected.map(item => item.route);
}

function formatRoute(route) {
  return route
    .map(dart => `\`${dart.name}\``)
    .join(" → ");
}

function getBullLabel(mode) {
  return mode === "fat" ? "ファットブル" : "セパレートブル";
}

function getOutLabel(mode) {
  if (mode === "master") {
    return "マスターアウト";
  }

  if (mode === "double") {
    return "ダブルアウト";
  }

  return "オープンアウト";
}

const finish = new SlashCommandBuilder()
  .setName("finish")
  .setDescription("ダーツのフィニッシュアレンジを表示します")
  .addIntegerOption(option =>
    option
      .setName("score")
      .setDescription("残り点数")
      .setRequired(true)
      .setMinValue(2)
      .setMaxValue(180)
  )
  .addStringOption(option =>
    option
      .setName("bull")
      .setDescription("ブルオプション")
      .setRequired(true)
      .addChoices(
        {
          name: "ファットブル",
          value: "fat"
        },
        {
          name: "セパレートブル",
          value: "separate"
        }
      )
  )
  .addStringOption(option =>
    option
      .setName("out")
      .setDescription("アウトオプション")
      .setRequired(true)
      .addChoices(
        {
          name: "マスターアウト",
          value: "master"
        },
        {
          name: "ダブルアウト",
          value: "double"
        },
        {
          name: "オープンアウト",
          value: "open"
        }
      )
  );

const dice = new SlashCommandBuilder()
  .setName("dice")
  .setDescription("サイコロを振ります")
  .addStringOption(option =>
    option
      .setName("dice")
      .setDescription("サイコロの種類(例: 1d6, 1d100)")
      .setRequired(true)
  );

const help = new SlashCommandBuilder()
  .setName("help")
  .setDescription("コマンド一覧を表示します");

const ping = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("botの応答速度を計測します")

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
  if (GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      {
        body: [help.toJSON(), finish.toJSON(), dice.toJSON(), ping.toJSON()]
      }
    );

    console.log("ギルドコマンドを登録しました。");
  } else {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: [help.toJSON(), finish.toJSON(), dice.toJSON(), ping.toJSON()]
      }
    );

    console.log("グローバルコマンドを登録しました。");
  }
}

client.once("clientReady", () => {
  console.log(
    `ログインしました。username=${client.user.username}, globalName=${client.user.globalName}, displayName=${client.user.displayName}`
  );
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  
  if (interaction.commandName === "finish") {
    console.log("command:  finish")
    await interaction.deferReply();

    const score = interaction.options.getInteger("score", true);
    const bullMode =
      interaction.options.getString("bull") || "fat";
    const outMode =
      interaction.options.getString("out") || "double";

    const routes = findFinishes(
      score,
      bullMode,
      outMode
    );
    
    let color;
    if (routes.length === 0) {
      color = null;
    } else if (score == 180) {
      color = 0xb9860a;
    } else if (score >= 170) {
      color = 0xfcec3f;
    } else if (score >= 160) {
      color = 0xfed537;
    } else if (score >= 150) {
      color = 0xffa52a;
    } else if (score > 140) {
      color = 0xff9801;
    } else if (score > 130) {
      color = 0xfb8b01;
    } else if (score > 120) {
      color = 0xf67c01;
    } else if (score > 110) {
      color = 0xef6c00;
    } else if (score >= 100) {
      color = 0xe65100; 
    } else if (score > 90) {
      color = 0x45289f; 
    } else if (score > 80) {
      color = 0x5120a7;
    } else if (score > 70) {
      color = 0x5e34b0;
    } else if (score > 60) {
      color = 0x673bb7;
    } else if (score > 50) {
      color = 0x1665c1;
    } else if (score > 40) {
      color = 0x1b76d1;
    } else if (score > 30) {
      color = 0x1f88e4;
    } else if (score > 20) {
      color = 0x2095f4;
    } else {
      color = 0x42a5f6;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎯 ${score} フィニッシュ`)
      .addFields({
        name: "ゲームオプション",
        value: `${getBullLabel(bullMode)} / ${getOutLabel(outMode)}`,
        inline: false
      });

    if (routes.length === 0) {
      embed.addFields({
        name: "フィニッシュ不可",
        value: "この条件でのフィニッシュはありません。"
      });
    } else {
      embed.addFields({
        name: "おすすめ",
        value: `1. ${formatRoute(routes[0])}`
      });
      if (routes.length > 1) {
        embed.addFields({
          name: "他の候補",
          value: routes
            .slice(1, 5)
            .map(
              (route, index) =>
                `${index + 2}. ${formatRoute(route)}`
            )
            .join("\n")
        });
      }
    }

    await interaction.editReply({
      embeds: [embed]
    });
  } else if (interaction.commandName === "dice") {
    console.log("command: dice")
    const diceType = interaction.options.getString("dice", true);
    const match = diceType.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) {
      await interaction.reply({
        content: "diceの値が不正です",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    const count = Number(match[1]);
    const sides = Number(match[2]);
    const modifier = match[3]
      ? Number(match[3])
      : 0;
    const rolls = [];

    if (count > 100 || count < 1) {
      await interaction.reply({
        content: "diceの個数は1〜100個にしてください",
        flags: MessageFlags.Ephemeral
      });
   
      return;
    }
    if (sides > 500 || sides < 3) {
      await interaction.reply({
        content: "diceの面数は3〜500にしてください",
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    for (let i = 0; i < count; i++) {
      rolls.push(
        Math.floor(Math.random() * sides) + 1
      );
    }

    const total =
      rolls.reduce((sum, value) => sum + value, 0) +
      modifier;
    const rollText = rolls.join(", ");

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(diceType)
      .addFields({
        name: "結果",
        value: count === 1 ? String(total) : rollText,
        inline: true
      });
    if (count > 1) {
      embed.addFields({
        name: "合計",
        value: String(total),
        inline: true
      })
    }

    await interaction.reply({
      embeds: [embed]
    });
  } else if (interaction.commandName === "help") {
    console.log("command: help")
    const embed = new EmbedBuilder()
      .setColor(0x00aaff)
      .setTitle("ヘルプ")
      .addFields({
        name: "コマンド一覧",
        value: "\`/finish\` ダーツの残り2〜180点のフィニッシュを最大5つ表示します。\n\`/dice\` サイコロを振ります。\n\`/ping\` botの応答速度を計測します。\n\`/help\` コマンド一覧を表示します。",
        inline: false
      });

    await interaction.reply({
      embeds: [embed]
    });
  } else if (interaction.commandName === "ping") {
    console.log("command: help")
    const websocketPing = client.ws.ping;

    await interaction.reply({
      content: `Pong!(${websocketPing}ms)`
    });
  } else {
    return;
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  
  if (message.content.includes("ぽっぽ") || message.content.includes("鳩")) {
    console.log("ぽっぽ検出");
    await message.react("<:pigeon_af:1557656470420594770>");
    await message.reply("ぽっぽ<:pigeon_af:1557656470420594770>");
  }
  if (message.content.includes("うゆゆ")) {
    console.log("うゆゆ検出");
    await message.react("<:uyuyu:1557651030966149180>");
    await message.reply("うゆゆ<:uyuyu:1557651030966149180>");
  }
});

registerCommands()
  .then(() => client.login(TOKEN))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
