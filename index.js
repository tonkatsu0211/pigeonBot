const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  throw new Error("DISCORD_TOKEN と DISCORD_CLIENT_ID を設定してください。");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const finishPriority = {
  "D16": 110,
  "D20": 109,
  "D18": 108,
  "T20": 107,
  "T19": 106,
  "T18": 105,
  "T17": 104,
  "T16": 103,
  "D8": 102,
  "D4": 101,
  "BULL": 100,
  "D-BULL": 70,
  "S-BULL": 50
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

  if (outMode === "double" || outMode === "master") {
    if (remaining === 1) {
      return false;
    }
  }

  return true;
}

function getPriority(dart) {
  return finishPriority[dart.name] || 0;
}

function compareRoutes(a, b) {
  if (a.length !== b.length) {
    return a.length - b.length;
  }

  const aFinish = getPriority(a[a.length - 1]);
  const bFinish = getPriority(b[b.length - 1]);

  if (aFinish !== bFinish) {
    return bFinish - aFinish;
  }

  for (let i = a.length - 2; i >= 0; i--) {
    const ap = getPriority(a[i]);
    const bp = getPriority(b[i]);

    if (ap !== bp) {
      return bp - ap;
    }
  }

  const aScore = a.reduce((sum, dart) => sum + dart.score, 0);
  const bScore = b.reduce((sum, dart) => sum + dart.score, 0);

  return bScore - aScore;
}

function findFinishes(startScore, bullMode, outMode) {
  const darts = createDarts(bullMode);
  const routes = [];

  function search(remaining, route) {
    if (route.length >= 3) {
      return;
    }

    for (const dart of darts) {
      const next = remaining - dart.score;

      if (next < 0) {
        continue;
      }

      const isLastDart = route.length === 2;

      if (next === 0) {
        if (isValidFinish(dart, outMode)) {
          routes.push([...route, dart]);
        }

        continue;
      }

      if (!isLastDart && canContinueAfterDart(next, outMode)) {
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

  return [...unique.values()].sort(compareRoutes).slice(0, 3);
}

function formatRoute(route) {
  return route.map(dart => `\`${dart.name}\``).join(" → ");
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

const command = new SlashCommandBuilder()
  .setName("finish")
  .setDescription("ダーツのフィニッシュアレンジを表示します")
  .addIntegerOption(option =>
    option
      .setName("score")
      .setDescription("残り点数")
      .setRequired(true)
      .setMinValue(2)
      .setMaxValue(170)
  )
  .addStringOption(option =>
    option
      .setName("bull")
      .setDescription("ブルオプション")
      .setRequired(false)
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
      .setRequired(false)
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

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
  if (GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      {
        body: [command.toJSON()]
      }
    );

    console.log("ギルドコマンドを登録しました。");
  } else {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: [command.toJSON()]
      }
    );

    console.log("グローバルコマンドを登録しました。");
  }
}

client.once("ready", () => {
  console.log(`${client.user.tag} でログインしました。`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "finish") {
    return;
  }

  const score = interaction.options.getInteger("score", true);
  const bullMode = interaction.options.getString("bull") || "fat";
  const outMode = interaction.options.getString("out") || "double";

  const routes = findFinishes(score, bullMode, outMode);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 ${score} フィニッシュ`)
    .addFields(
      {
        name: "ルール",
        value: `${getBullLabel(bullMode)} / ${getOutLabel(outMode)}`,
        inline: false
      }
    );

  if (routes.length === 0) {
    embed.addFields({
      name: "候補",
      value: "この条件でのフィニッシュはありません。"
    });
  } else {
    embed.addFields({
      name: "おすすめ",
      value: routes
        .map((route, index) => `${index + 1}. ${formatRoute(route)}`)
        .join("\n")
    });
  }

  await interaction.reply({
    embeds: [embed]
  });
});

registerCommands()
  .then(() => client.login(TOKEN))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```
