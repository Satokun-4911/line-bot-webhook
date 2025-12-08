import axios from "axios";

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN; // .envで管理

// Quick Reply: 開始日
async function sendStartDate(userId) {
  const message = {
    type: "text",
    text: "📅 開始日を入力してください",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "datetimepicker",
            label: "開始日を選択",
            data: "startDate",
            mode: "date"
          }
        }
      ]
    }
  };
  await pushMessage(userId, message);
}

// Quick Reply: 終了日
async function sendEndDate(userId) {
  const message = {
    type: "text",
    text: "📅 終了日を入力してください",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "datetimepicker",
            label: "終了日を選択",
            data: "endDate",
            mode: "date"
          }
        }
      ]
    }
  };
  await pushMessage(userId, message);
}

// 完成通知
async function sendCompletion(userId, startDate, endDate, sheetUrl) {
  const message = {
    type: "text",
    text: `✅ 導尿記録ブックを作成しました\nファイル名: 導尿記録（${startDate}～${endDate}）\n📊 スプレッドシートの保存先: ${sheetUrl}`
  };
  await pushMessage(userId, message);
}

// LINE Push API 呼び出し
async function pushMessage(userId, message) {
  try {
    await axios.post("https://api.line.me/v2/bot/message/push", {
      to: userId,
      messages: [message]
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    });
    console.log("Push success:", message.text || message);
  } catch (err) {
    console.error("LINE Push API Error:", err.response?.data || err.message);
  }
}

// Webhookハンドラ
export default async function handler(req, res) {
  if (req.method === "POST") {
    const event = req.body.events[0];
    const userId = event.source.userId;

    if (event.type === "message" && event.message.text === "開始") {
      // ユーザーが「開始」と送ったら開始日を聞く
      await sendStartDate(userId);
    }

    if (event.type === "postback") {
      if (event.postback.data === "startDate") {
        const startDate = event.postback.params.date;
        // 開始日を保存して終了日を聞く
        await sendEndDate(userId);

      } else if (event.postback.data === "endDate") {
        const endDate = event.postback.params.date;
        // GASにPOSTしてスプレッドシート生成
        await axios.post("https://script.google.com/macros/s/AKfycbx4DjtjnRpC9pFncijcH1YA4PFRx6861mcpHW9YPvTO-ERPshkCsrKkqnG50odyFQWtJQ/exec", {
          startDate: "2025/01/01", // 保存しておいた開始日を渡す
          endDate: endDate,
          uid: userId
        });
      }
    }

    res.status(200).send("OK");
  } else {
    res.status(405).send("Method Not Allowed");
  }
}