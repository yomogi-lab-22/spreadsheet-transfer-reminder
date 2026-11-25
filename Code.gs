
// Spreadsheet Transfer Reminder
// Google Sheets × Google Apps Script × Discord
// Developed with AI assistance (ChatGPT)
// Created: 2026-11-25

// 基本設定
const CONFIG = {
  sheetName: "資金繰り",
  targetColor: "#9fc5e8",
  startYear: 2026,
  timezone: "Asia/Tokyo",

  // 口座名と内容欄の列番号（0始まり）
  accounts: {
    3: "口座A",
    7: "口座B",
    11: "口座C",
    15: "口座D"
  }
};

// 指定日の資金移動予定を取得
function getTransfers(targetDate) {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(CONFIG.sheetName);

  const range = sheet.getDataRange();
  const values = range.getValues();
  const colors = range.getBackgrounds();

  let year = CONFIG.startYear;
  let month = 0;
  let day = 0;

  const transfers = [];

  for (let row = 2; row < values.length; row++) {

    // 月の取得と年またぎの判定
    if (values[row][0] !== "") {

      const newMonth = Number(values[row][0]);

      if (month === 12 && newMonth === 1) {
        year++;
      }

      month = newMonth;
    }

    // 日付が空欄の場合は直前の日付を引き継ぐ
    if (values[row][1] !== "") {
      day = Number(values[row][1]);
    }

    if (!month || !day) {
      continue;
    }

    const rowDate = Utilities.formatDate(
      new Date(year, month - 1, day),
      CONFIG.timezone,
      "yyyy-MM-dd"
    );

    if (rowDate !== targetDate) {
      continue;
    }

    for (const col of [3, 7, 11, 15]) {

      const amount = values[row][col + 2];

      // 指定色かつ支出金額があるセルのみ抽出
      if (
        colors[row][col] === CONFIG.targetColor &&
        typeof amount === "number" &&
        amount > 0
      ) {

        const from = CONFIG.accounts[col];
        const description = String(values[row][col]);

        let to = "移動先要確認";

        // 内容欄から移動先を判定
        for (const account of Object.values(CONFIG.accounts)) {

          if (
            account !== from &&
            description.includes(account)
          ) {
            to = account;
            break;
          }

        }

        transfers.push(
          "・" + from + " → " + to + "：" +
          amount.toLocaleString("ja-JP") + "円"
        );

      }

    }

  }

  return transfers;

}

// Discordへのメッセージ送信
function sendDiscord(content) {

  const webhookUrl = PropertiesService
    .getScriptProperties()
    .getProperty("DISCORD_WEBHOOK_URL");

  if (!webhookUrl) {
    throw new Error("Webhook URLが設定されていません。");
  }

  UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      content: content
    })
  });

}

// 指定日の資金移動通知
function sendTransferReminder(targetDate) {

  const transfers = getTransfers(targetDate);

  if (transfers.length === 0) {
    console.log("資金移動の予定はありません。");
    return;
  }

  const spreadsheetUrl = SpreadsheetApp
    .getActiveSpreadsheet()
    .getUrl();

  const message =
    "🔔 **資金移動のお知らせ**\n\n" +
    "予定日：" + targetDate + "\n\n" +
    transfers.join("\n") +
    "\n\n忘れずに資金移動してください！\n\n" +
    spreadsheetUrl;

  sendDiscord(message);

}

// 翌日の資金移動予定を自動通知
// 時間主導型トリガーで毎日実行
function dailyTransferReminder() {

  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDate = Utilities.formatDate(
    tomorrow,
    CONFIG.timezone,
    "yyyy-MM-dd"
  );

  sendTransferReminder(targetDate);

}

// Discord接続テスト
function testDiscord() {

  sendDiscord("🎉 接続テストに成功しました！");

}

// 指定日による通知テスト
function testTransferReminder() {

  sendTransferReminder("2026-12-01");

}
