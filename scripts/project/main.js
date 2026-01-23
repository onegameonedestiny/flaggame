import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, get, update, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// 您的專屬設定
const firebaseConfig = {
    apiKey: "AIzaSyA3Ecj9bNgARAhzrq6_BD4AeiegAku3wak",
    authDomain: "lineweb-24cc1.firebaseapp.com",
    databaseURL: "https://lineweb-24cc1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lineweb-24cc1",
    storageBucket: "lineweb-24cc1.firebasestorage.app",
    messagingSenderId: "97364985402",
    appId: "1:97364985402:web:e3f124780c76f522bd1703"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ====================================================
//  設定房間與路徑
// ====================================================
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomParam = urlParams.get('ROOM');
const ROOM_ID = roomParam ? roomParam : "room_01";

console.log(`🚀 房間 ID 設定為: ${ROOM_ID}`);

// 我們現在主要操作這個根路徑
const PATH_ROOM = `game/${ROOM_ID}`;

runOnStartup(runtime => {

    console.log(`🚀 連線模組啟動 (${ROOM_ID})`);

    // ====================================================
    //  功能 1：單一監聽 (核心修改)
    //  只要資料庫有變動 (旗子、時間)，這裡就會觸發
    // ====================================================
    runtime.JS_ListenRoomStatus = () => {
        
        // 監聽整個房間的資料
        onValue(ref(db, PATH_ROOM), (snapshot) => {
            const data = snapshot.val();
            
            // 取得自己在 C3 的玩家編號 (1~4)
            // 注意：請確保 C3 的 globalVars.playerNB 已經有值
            const myNB = runtime.globalVars.playerNB; 

            // 預設值：如果是空的，或找不到自己的旗子，就給 "9" (待機)
            let myFlag = "9";
            let startTime = 0;

            if (data) {
                // 1. 抓旗子
                if (data.flag && data.flag[myNB]) {
                    myFlag = String(data.flag[myNB]);
                }
                // 2. 抓時間
                if (data.startTime) {
                    startTime = Number(data.startTime);
                }
            }

            // 回傳給 C3 處理
            // 參數 1: 我的旗子 (例如 "5" 或 "9")
            // 參數 2: 開始時間戳記 (例如 173759xxxxx 或 0)
            runtime.callFunction("OnGameUpdate", myFlag, startTime);
        });
    };

    // ====================================================
    //  功能 2：計算經過時間 (C3 Loop 呼叫用)
    //  現在 JS 不主動讀資料庫，而是由 C3 傳入剛剛收到的 startTime 來算
    // ====================================================
    runtime.JS_GetElapsedTime = (startTime) => {
        if (!startTime || startTime == 0) {
            runtime.callFunction("OnTimeResult", "0.0");
            return;
        }
        const now = Date.now();
        const elapsed = ((now - startTime) / 1000).toFixed(1);
        runtime.callFunction("OnTimeResult", elapsed);
    };

    // ====================================================
    //  GM 模式 A：開始解謎 (隨機出題 0~9 + 啟動時間)
    // ====================================================
    runtime.JS_GM_StartLevel = (stageNum) => {
        
        // 1. 準備 1~8 的數字池 (排除 0美國, 9愛爾蘭)
        // 這樣玩家只會拿到中間的旗子
        let pool = [1, 2, 3, 4, 5, 6, 7, 8];
        
        // 洗牌
        pool.sort(() => Math.random() - 0.5);

        // 2. 分配旗子 並 計算答案 (左到右排序)
        const flagObj = {};
        const tempList = [];

        for (let i = 0; i < 4; i++) {
            const val = pool[i];
            const playerID = i + 1;
            flagObj[playerID] = String(val);
            tempList.push({ id: playerID, value: val });
        }

        // 算答案 (由小到大 = 由左到右)
        // 雖然數字只剩 1~8，但邏輯不變：越小的數字代表越靠近美國(左邊)
        tempList.sort((a, b) => a.value - b.value);
        const answerStr = tempList.map(item => item.id).join("");
        
        // 3. 打包上傳
        const gameData = {
            stage: String(stageNum),
            startTime: Date.now(),    // 設定現在為開始時間
            flag: flagObj,
            answer: answerStr
        };
            runtime.callFunction("GetAnswer", answerStr);


        // 4. 設定斷線保護
        const disconnectData = {
            flag: {1:"9", 2:"9", 3:"9", 4:"9"},
            stage: "0"
        };
        onDisconnect(ref(db, PATH_ROOM)).update(disconnectData);

        // 5. 正式寫入資料
        update(ref(db, PATH_ROOM), gameData)
            .then(() => console.log(`✅ 第 ${stageNum} 關啟動 (1~8中選4, Ans: ${answerStr})`));
    };

    // ====================================================
    //  GM 模式 B：待機/重置 (旗子全設為 9，刪除時間)
    // ====================================================
    runtime.JS_GM_Reset = () => {
        
        const resetData = {
            stage: "0",
            startTime: 1769204312610, // 設為 null 會在 Firebase 中刪除此欄位
            flag: {
                1: "9",
                2: "9",
                3: "9",
                4: "9"
            },
            answer: ""
        };

        update(ref(db, PATH_ROOM), resetData)
            .then(() => console.log("⏸️ 遊戲重置 (待機模式)"));
    };

});