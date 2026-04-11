// ========== 설정 ==========
const SHEET_ID = "134-wWjSBm1IeiQDo-pl_cxhP5vNuUsMnTefJFUne_dQ";
const MAIN_SHEET_NAME = "Main";
const RECORD_SHEET_NAME = "운동기록";
const TRANSACTION_SHEET_NAME = "거래내역";
const EXEMPTION_SHEET_NAME = "면제신청";
const NOTICE_SHEET_NAME = "공지";
const FINAL_RECORD_SHEET_NAME = "최종기록";
const DRIVE_FOLDER_NAME = "SME_운동인증사진";
const PROFILE_FOLDER_NAME = "SME_프로필사진";
const REACTION_SHEET_NAME = "리액션";
const OPENAI_API_KEY = "REDACTED"; // API key removed for security

// ========== [최적화 캐싱] ==========
let _globalSS = null;
let _globalMainSheet = null;

function getCachedSS() {
  if (!_globalSS) {
    _globalSS = SpreadsheetApp.openById(SHEET_ID);
  }
  return _globalSS;
}

// ========== 웹 앱 진입점 ==========
function doGet() {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("SME 운동관리")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
    )
    .setFaviconUrl("https://img.icons8.com/color/48/exercise.png")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ========== 파일 불러오기 ==========
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ========== [보안] 비밀번호 해싱 함수 ==========
function hashString(input) {
  const rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
  );
  let txtHash = "";
  for (let i = 0; i < rawBytes.length; i++) {
    let hashVal = rawBytes[i];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length == 1) txtHash += "0";
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

// ========== [보안] 관리자 권한 확인 ==========
function validateAdmin(nickname) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return false;
  const data = sheet.getRange(4, 1, lastRow - 3, 19).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      const role = String(data[i][18]).trim();
      if (role === "관리자") return true;
    }
  }
  return false;
}

// ========== 사용자 관리 ==========
function checkUser(nickname, password) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { status: "NOT_FOUND" };

  const data = sheet.getRange(4, 1, lastRow - 3, 22).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      const cellContent = String(data[i][1]);
      const pwLine = cellContent.split("\n")[0];

      let isPwCorrect = false;
      if (pwLine.startsWith("[SECURE]")) {
        const storedHash = pwLine.replace("[SECURE] ", "").trim();
        if (storedHash === hashString(password)) isPwCorrect = true;
      } else {
        const storedPw = pwLine.replace("P/W:", "").trim();
        if (storedPw === String(password)) isPwCorrect = true;
      }

      if (isPwCorrect) {
        const role = String(data[i][18]).trim(); // S열 (권한)

        // [핵심 추가] 권한이 '대기'라면 로그인 차단
        if (role === "대기") return { status: "PENDING_APPROVAL" };
        if (role === "탈퇴") return { status: "WITHDRAWN" };

        // 로그인 성공 시 데이터 프리로딩
        const dashboardData = getUserStatus(nickname);

        const now = new Date();
        const formattedTime = Utilities.formatDate(
          now,
          "GMT+9",
          "yyyy-MM-dd HH:mm:ss",
        );
        sheet.getRange(4 + i, 21).setValue(formattedTime);

        return {
          status: "SUCCESS",
          isAdmin: role === "관리자",
          isTest: role === "테스트",
          preloadedData: dashboardData,
        };
      } else {
        return { status: "WRONG_PW" };
      }
    }
  }
  return { status: "NOT_FOUND" };
}

function registerUser(nickname, password, profileImageData, question, answer) {
  const sheet = getMainSheet();
  const check = checkUser(nickname, "dummy");
  if (check.status !== "NOT_FOUND")
    return { success: false, message: "이미 존재하는 닉네임입니다." };

  let lastRow = sheet.getLastRow();
  if (lastRow < 3) lastRow = 3;
  const startRow = lastRow + 1;
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;

  const securePw = hashString(password);

  sheet
    .getRange(startRow, 1)
    .setValue(nickname)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontWeight("bold");

  const metaData = `[SECURE] ${securePw}\n가입일시: ${dateStr}\n본인확인: ${question},${answer}`;

  sheet
    .getRange(startRow, 2)
    .setValue(metaData)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment("middle")
    .setFontSize(9);

  const rowData = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    0,
    6000,
    "대기",
  ];
  sheet.getRange(startRow, 3, 1, 17).setValues([rowData]);

  if (profileImageData) {
    const profileUrl = saveProfileImage(nickname, profileImageData);
    if (profileUrl) {
      const richText = SpreadsheetApp.newRichTextValue()
        .setText("📷프로필")
        .setLinkUrl(profileUrl)
        .build();
      sheet.getRange(startRow, 20).setRichTextValue(richText);
    }
  }
  sheet
    .getRange(startRow, 1, 1, 20)
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#E0E0E0",
      SpreadsheetApp.BorderStyle.SOLID,
    );

  const currentTitle = sheet.getRange("A1").getValue();
  if (!currentTitle) updateMainTitle(sheet);

  return { success: true };
}

function resetUserPassword(nickname, question, answer, newPassword) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { success: false, message: "회원 정보가 없습니다." };

  const data = sheet.getRange(4, 1, lastRow - 3, 2).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      const cellContent = String(data[i][1]);

      const lines = cellContent.split("\n");
      let savedQA = "";
      let joinDate = "";

      lines.forEach((line) => {
        if (line.startsWith("본인확인:"))
          savedQA = line.replace("본인확인:", "").trim();
        if (line.startsWith("가입일시:")) joinDate = line;
      });

      if (!savedQA)
        return {
          success: false,
          message:
            "본인확인 정보가 설정되지 않은 회원입니다. 관리자에게 문의하세요.",
        };

      const [savedQ, savedA] = savedQA.split(",");

      if (
        String(savedQ).trim() === String(question).trim() &&
        String(savedA).trim() === String(answer).trim()
      ) {
        const newHash = hashString(newPassword);
        const newCellContent = `[SECURE] ${newHash}\n${joinDate}\n본인확인: ${savedQ},${savedA}`;

        sheet.getRange(4 + i, 2).setValue(newCellContent);
        return { success: true };
      } else {
        return {
          success: false,
          message: "질문 또는 답변이 일치하지 않습니다.",
        };
      }
    }
  }
  return { success: false, message: "존재하지 않는 닉네임입니다." };
}

function updateUserProfile(nickname, newPw, newImgData, newQ, newA) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { success: false, message: "회원 정보가 없습니다." };

  const data = sheet.getRange(4, 1, lastRow - 3, 2).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      const rowIdx = 4 + i;
      const cellContent = String(data[i][1]);
      const lines = cellContent.split("\n");

      let currentHash = "";
      let joinDate = "";
      let currentQA = "";

      lines.forEach((line) => {
        if (line.startsWith("[SECURE]"))
          currentHash = line.replace("[SECURE]", "").trim();
        else if (line.startsWith("P/W:"))
          currentHash = hashString(line.replace("P/W:", "").trim());
        else if (line.startsWith("가입일시:")) joinDate = line;
        else if (line.startsWith("본인확인:"))
          currentQA = line.replace("본인확인:", "").trim();
      });

      let finalHash = currentHash;
      if (newPw && newPw.trim() !== "") {
        finalHash = hashString(newPw);
      }

      let finalQA = currentQA;
      if (newQ && newA && newQ.trim() !== "" && newA.trim() !== "") {
        finalQA = `${newQ},${newA}`;
      }

      const newMetaData = `[SECURE] ${finalHash}\n${joinDate}\n본인확인: ${finalQA}`;
      sheet.getRange(rowIdx, 2).setValue(newMetaData);

      let newProfileUrl = null;
      if (newImgData) {
        newProfileUrl = saveProfileImage(nickname, newImgData);
        if (newProfileUrl) {
          const richText = SpreadsheetApp.newRichTextValue()
            .setText("📷프로필")
            .setLinkUrl(newProfileUrl)
            .build();
          sheet.getRange(rowIdx, 20).setRichTextValue(richText);
        }
      }

      return { success: true, newProfileUrl: newProfileUrl };
    }
  }
  return { success: false, message: "사용자를 찾을 수 없습니다." };
}

function getAllMembers() {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];

  const range = sheet.getRange(4, 1, lastRow - 3, 20);
  const values = range.getValues();
  const richTexts = range.getRichTextValues();

  const members = [];
  for (let i = 0; i < values.length; i++) {
    const nick = values[i][0];
    const role = String(values[i][18]).trim(); // S열

    // [수정] 닉네임이 없거나, 권한이 '테스트' 또는 '탈퇴'이면 목록에서 제외
    if (!nick || role === "테스트" || role === "탈퇴") continue;

    const richText = richTexts[i][19];
    const url = richText ? richText.getLinkUrl() : "";
    members.push({ nickname: nick, profileUrl: url || "" });
  }
  return members;
}

// ========== 데이터 읽기 (관리자 카운트, 다음주 미리보기 포함) ==========
function getUserStatus(nickname) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  const weekTitle = sheet.getRange("A1").getValue();
  const notice = getLatestNotice();

  if (lastRow < 4) return null;

  const data = sheet.getRange(4, 1, lastRow - 3, 46).getRichTextValues();
  const rawValues = sheet.getRange(4, 1, lastRow - 3, 22).getValues();

  let targetRow = null;
  let currentRowIndex = -1;
  let isAdmin = false;
  let isTest = false;
  let tutoStatus = { user: false, admin: false, ai_info: false, recap: false };

  for (let i = 0; i < data.length; i++) {
    if (data[i][0].getText().trim() === String(nickname).trim()) {
      targetRow = data[i];
      currentRowIndex = 4 + i;

      const role = data[i][18].getText().trim();
      if (role === "관리자") isAdmin = true;
      if (role === "테스트") isTest = true;

      const tutoVal = String(rawValues[i][21]);
      if (tutoVal.includes("USER_DONE")) tutoStatus.user = true;
      if (tutoVal.includes("ADMIN_DONE")) tutoStatus.admin = true;
      if (tutoVal.includes("AI_INFO_DONE")) tutoStatus.ai_info = true;
      if (tutoVal.includes("RECAP_2026H1_DONE")) tutoStatus.recap = true;
      break;
    }
  }

  if (!targetRow) return null;

  // [핵심 수정] 진행 중인 것뿐만 아니라 '예정'인 것도 카운트에 포함
  const allChallenges = getChallengeData();
  const activeCount = allChallenges.filter(
    (c) => c.status === "진행중" || c.status === "예정",
  ).length;

  const userData = formatUserStatus(targetRow, weekTitle);
  userData.notice = notice;
  userData.isAdmin = isAdmin;
  userData.isTest = isTest;
  userData.tutoStatus = tutoStatus;
  userData.nextWeekData = formatNextWeekFromCells(targetRow);
  userData.totalCumulative = getUserTotalExerciseHistory(
    nickname,
    sheet,
    currentRowIndex,
  );
  userData.activeChallengeCount = activeCount; // 이제 예정된 챌린지도 포함된 개수입니다
  const props = PropertiesService.getScriptProperties();
  userData.isRecapVisible = props.getProperty("RECAP_VISIBLE") === "true";

  if (isAdmin) {
    let fineCount = 0;
    try {
      const unpaidData = getAdminUnpaidFines(nickname);
      fineCount = unpaidData.list.length;
    } catch (e) {}
    userData.adminCounts = {
      photos: countPendingPhotos(data),
      exempts: countPendingExemptions(),
      joins: countPendingJoins(),
      fines: fineCount,
    };
  } else {
    userData.adminCounts = { photos: 0, exempts: 0, joins: 0, fines: 0 };
  }

  return userData;
}

function countPendingJoins() {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return 0;
  const roles = sheet.getRange(4, 19, lastRow - 3, 1).getValues(); // S열
  let count = 0;
  for (let i = 0; i < roles.length; i++) {
    if (roles[i][0] === "대기") count++;
  }
  return count;
}

function getUserTotalExerciseHistory(nickname, mainSheet, currentRowIndex) {
  let total = 0;

  // 기준일 설정 (2026년 1월 1일)
  // 이 날짜 이후의 기록만 합산합니다.
  const CUTOFF_DATE = new Date(2026, 0, 1); // 2026-01-01
  CUTOFF_DATE.setHours(0, 0, 0, 0);

  // 1. 과거 기록 합산 ('최종기록' 시트 조회)
  try {
    const ss = getCachedSS();
    const finalSheet = ss.getSheetByName(FINAL_RECORD_SHEET_NAME);
    if (finalSheet) {
      const lastRow = finalSheet.getLastRow();
      const lastCol = finalSheet.getLastColumn();

      // 2행(기간 헤더, 예: "12-29~1-4") 가져오기
      const headers = finalSheet.getRange(2, 1, 1, lastCol).getValues()[0];

      if (lastRow >= 3 && lastCol >= 2) {
        const data = finalSheet
          .getRange(3, 1, lastRow - 2, lastCol)
          .getValues();

        for (let i = 0; i < data.length; i++) {
          if (String(data[i][0]).trim() === String(nickname).trim()) {
            // B열(인덱스 1)부터 끝까지 순회
            for (let j = 1; j < data[i].length; j++) {
              // 헤더 날짜 확인 logic
              // 헤더 예시: "12-29~1-4" -> 뒷 날짜(1-4)를 기준으로 2026년인지 판단
              let isValidColumn = false;
              try {
                const headerStr = String(headers[j]);
                // "~" 뒤의 날짜(종료일) 추출
                const endDateStr = headerStr.includes("~")
                  ? headerStr.split("~")[1]
                  : headerStr;
                // "1-4" -> [1, 4]
                const parts = endDateStr.split(/[-\.]/);

                if (parts.length >= 2) {
                  const m = parseInt(parts[0]);
                  const d = parseInt(parts[1]);
                  const checkYear = m >= 1 ? 2026 : 2025; // 1월 이상이면 2026년으로 간주

                  const colDate = new Date(checkYear, m - 1, d);
                  colDate.setHours(0, 0, 0, 0);

                  // 기준일(1월 1일) 이상인 컬럼만 합산
                  if (colDate >= CUTOFF_DATE) {
                    isValidColumn = true;
                  }
                } else {
                  // 날짜 파싱 실패 시, 안전하게 합산 (혹은 제외)
                  // 새해 이후 생성된 시트라면 true로 해도 무방
                  isValidColumn = true;
                }
              } catch (e) {
                isValidColumn = true;
              }

              if (isValidColumn) {
                const val = parseInt(data[i][j]);
                if (!isNaN(val)) total += val;
              }
            }
            break;
          }
        }
      }
    }
  } catch (e) {
    // 오류 발생 시 무시하고 진행
    Logger.log("Total Count Error: " + e.toString());
  }

  // 2. 이번 주 기록 합산 ('Main' 시트 조회)
  if (mainSheet && currentRowIndex > 0) {
    const currentTitle = mainSheet.getRange("A1").getValue();
    const sundayDate = findExactSundayFromTitle(currentTitle); // 일요일 날짜 구함

    if (sundayDate) {
      const mondayDate = new Date(sundayDate);
      mondayDate.setDate(sundayDate.getDate() - 6); // 월요일 계산
      mondayDate.setHours(0, 0, 0, 0);

      const rowData = mainSheet
        .getRange(currentRowIndex, 3, 1, 14)
        .getValues()[0];

      for (let d = 0; d < 7; d++) {
        // 월(0) ~ 일(6)
        // 해당 요일의 날짜 계산
        const targetDate = new Date(mondayDate);
        targetDate.setDate(mondayDate.getDate() + d);
        targetDate.setHours(0, 0, 0, 0);

        // [핵심] 날짜가 2026-01-01보다 이전이면 건너뜀 (작년 기록 중복 방지)
        if (targetDate < CUTOFF_DATE) continue;

        // 데이터 확인 (2칸씩 건너뜀: 상태값 확인)
        const cellText = String(rowData[d * 2]);
        // 인증(O) 이거나 인증+글(O,...) 인 경우만 카운트
        if (cellText === "O" || cellText.startsWith("O,")) {
          total++;
        }
      }
    }
  }

  return total;
}

// [신규] 다음 주(AA~AT) 셀 데이터 파싱 함수
function formatNextWeekFromCells(row) {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const nextData = {};

  // 이번 주 월요일(C열)이 index 2입니다.
  // 다음 주 월요일(AC열)은 index 28입니다. (26칸 차이)
  const startColIndex = 28;

  days.forEach((day, idx) => {
    // 월(28), 화(30), 수(32)... 2칸씩 점프
    const colIdx = startColIndex + idx * 2;

    // row가 해당 범위까지 데이터가 있는지 안전 장치
    const cellText = row.length > colIdx ? row[colIdx].getText() : "";

    let status = "NONE";
    let rejectMsg = "";

    if (cellText === "O" || String(cellText).startsWith("O,")) {
      status = "DONE";
    } else if (cellText === "△") {
      status = "PENDING";
    } else if (String(cellText).startsWith("X")) {
      status = "REJECT";
      const parts = cellText.split(",");
      if (parts.length > 1) rejectMsg = parts[1].trim();
      else rejectMsg = "사유 미기재";
    } else if (String(cellText).startsWith("☆")) {
      status = "EXEMPT";
    }

    // 다음 주는 이미지는 아직 없으므로 빈 값
    nextData[day] = { status: status, rejectMsg: rejectMsg, imageUrl: "" };
  });

  return nextData;
}

// [추가] 다음 주 면제 현황 미리보기
function getNextWeekPreview(nickname, currentTitle) {
  const nextData = {};
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  // 기본값 초기화
  days.forEach((d) => {
    nextData[d] = { status: "NONE", rejectMsg: "", imageUrl: "" };
  });

  const currentSunday = findExactSundayFromTitle(currentTitle);
  if (!currentSunday) return nextData; // 날짜 파싱 실패

  const nextMonday = new Date(currentSunday);
  nextMonday.setDate(currentSunday.getDate() + 1);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  // 면제 시트 조회
  try {
    const sheet = getCachedSS().getSheetByName(EXEMPTION_SHEET_NAME);
    if (!sheet) return nextData;
    const data = sheet.getDataRange().getDisplayValues(); // [Nick, Period, Reason, Status, Noti]

    for (let i = 1; i < data.length; i++) {
      if (
        String(data[i][0]).trim() === String(nickname).trim() &&
        data[i][3] == 1
      ) {
        // 본인이고 승인됨
        const dates = data[i][1].split(",").map((d) => d.trim());
        dates.forEach((dateStr) => {
          const targetDate = new Date(dateStr);
          targetDate.setHours(0, 0, 0, 0);

          const checkStart = new Date(nextMonday);
          checkStart.setHours(0, 0, 0, 0);
          const checkEnd = new Date(nextSunday);
          checkEnd.setHours(0, 0, 0, 0);

          if (targetDate >= checkStart && targetDate <= checkEnd) {
            let dayDiff = Math.round(
              (targetDate - checkStart) / (1000 * 60 * 60 * 24),
            );
            if (dayDiff >= 0 && dayDiff <= 6) {
              nextData[days[dayDiff]].status = "EXEMPT";
            }
          }
        });
      }
    }
  } catch (e) {}

  return nextData;
}

function countPendingPhotos(allRows) {
  let count = 0;
  for (let i = 0; i < allRows.length; i++) {
    for (let d = 0; d < 7; d++) {
      const colIdx = 2 + d * 2;
      // RichText 객체에서 텍스트 추출
      const cellText = allRows[i][colIdx].getText();

      // [핵심 수정] '△'로 시작하면 카운트 (뒤에 ',공유함' 등이 있어도 포함)
      if (cellText.startsWith("△")) {
        count++;
      }
    }
  }
  return count;
}
function countPendingExemptions() {
  try {
    const sheet = getCachedSS().getSheetByName(EXEMPTION_SHEET_NAME);
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    const data = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    let count = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === "") count++;
    }
    return count;
  } catch (e) {
    return 0;
  }
}

function formatUserStatus(row, weekTitle) {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const weekData = {};

  let exerciseCount = 0; // 순수 운동 횟수 (O)
  let exemptCount = 0; // 면제 횟수 (☆)

  days.forEach((day, idx) => {
    const colIdx = 2 + idx * 2;
    // row가 1차원 배열(값)인지 RichText인지 확인하여 텍스트 추출
    const cellObj = row[colIdx];
    const cellText =
      typeof cellObj.getText === "function"
        ? cellObj.getText()
        : String(cellObj);

    let status = "NONE";
    let rejectMsg = "";

    // [핵심 변경] === (완전일치) 대신 startsWith (시작단어 확인) 사용

    // 1. 인정 (O)
    if (String(cellText).startsWith("O")) {
      status = "DONE";
      exerciseCount++;
    }
    // 2. 대기 (△) -> "△,공유함" 등도 인식되게 startsWith로 변경
    else if (String(cellText).startsWith("△")) {
      status = "PENDING";
    }
    // 3. 반려 (X)
    else if (String(cellText).startsWith("X")) {
      status = "REJECT";
      const parts = cellText.split(",");
      if (parts.length > 1) {
        rejectMsg = parts[1].trim();
      } else {
        rejectMsg = "사유 미기재";
      }
    }
    // 4. 면제 (☆)
    else if (String(cellText).startsWith("☆")) {
      status = "EXEMPT";
      exemptCount++;
    }

    // 이미지 링크 처리
    const imgCell = row[colIdx + 1];
    let imageUrl = "";
    if (imgCell) {
      imageUrl =
        typeof imgCell.getLinkUrl === "function"
          ? imgCell.getLinkUrl() || imgCell.getText()
          : String(imgCell);
    }

    weekData[day] = {
      status: status,
      rejectMsg: rejectMsg,
      imageUrl: imageUrl,
    };
  });

  // 프로필 이미지 처리
  const profileCell = row[19];
  let profileUrl = "";
  if (profileCell) {
    profileUrl =
      typeof profileCell.getLinkUrl === "function"
        ? profileCell.getLinkUrl() || profileCell.getText()
        : String(profileCell);
  }

  const displayCount = exerciseCount;
  const effectiveCount = exerciseCount + exemptCount;
  let fine = effectiveCount < 3 ? (3 - effectiveCount) * 2000 : 0;

  return {
    nickname: typeof row[0].getText === "function" ? row[0].getText() : row[0],
    weekTitle: weekTitle,
    weekData: weekData,
    totalCount: displayCount,
    fine: fine,
    profileUrl: profileUrl,
  };
}

// ========== 공지사항 ==========
function writeNotice(adminName, content) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };
  try {
    const ss = getCachedSS();
    let sheet = ss.getSheetByName(NOTICE_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(NOTICE_SHEET_NAME);
      sheet.appendRow(["작성자", "내용", "작성일시"]);
    }
    if (sheet.getLastRow() === 0)
      sheet.appendRow(["작성자", "내용", "작성일시"]);

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;

    sheet.appendRow([adminName, content, dateStr]);
    CacheService.getScriptCache().remove("latest_notice"); // [최적화] 공지가 추가되면 캐시 초기화
    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

function getLatestNotice() {
  const cache = CacheService.getScriptCache();
  const cachedNotice = cache.get("latest_notice");
  if (cachedNotice) return JSON.parse(cachedNotice); // [최적화] 캐시가 있다면 시트를 열지 않고 바로 반환

  try {
    const ss = getCachedSS();
    const sheet = ss.getSheetByName(NOTICE_SHEET_NAME);
    if (!sheet) return null;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const data = sheet.getRange(lastRow, 1, 1, 2).getValues()[0];
    if (!data[1]) return null;

    const result = { writer: data[0], content: data[1] };
    cache.put("latest_notice", JSON.stringify(result), 1800); // [최적화] 첫 조회 결과를 30분간 캐시
    return result;
  } catch (e) {
    return null;
  }
}

// ========== 운동 인증 및 검토 ==========
function uploadWorkoutPhoto(nickname, day, imageData, isPublic, postContent) {
  try {
    const ss = getCachedSS();
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const lastRow = sheet.getLastRow();

    const data = sheet.getRange(4, 1, lastRow - 3, 1).getValues();
    const days = ["월", "화", "수", "목", "금", "토", "일"];
    const dayIdx = days.indexOf(day);

    let targetRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(nickname).trim()) {
        targetRow = 4 + i;
        break;
      }
    }
    if (targetRow === -1) throw new Error("사용자를 찾을 수 없습니다.");

    const imageUrl = saveImageToDrive(nickname, day, imageData);

    const shareTag = isPublic ? ",공유함" : ",공유안함";
    // 쉼표 제거 (CSV 오작동 방지)
    const safeContent = postContent
      ? postContent.replace(/,/g, " ").trim()
      : "";
    const statusValue = "△" + shareTag + (safeContent ? "|" + safeContent : "");

    const colIdx = 3 + dayIdx * 2;
    sheet.getRange(targetRow, colIdx).setValue(statusValue);

    if (imageUrl) {
      const richText = SpreadsheetApp.newRichTextValue()
        .setText("📷인증")
        .setLinkUrl(imageUrl)
        .build();
      sheet.getRange(targetRow, colIdx + 1).setRichTextValue(richText);
    }

    recalcStats(sheet, targetRow);

    // [통계 업데이트]
    // 1. 갤러리 공유 카운트 (R열)
    if (isPublic) {
      updateReportStat(nickname, 18, 1);
    }
    // 2. ⭐ [신규] 글 작성 카운트 (T열 = 20번째)
    if (safeContent !== "") {
      updateReportStat(nickname, 20, 1);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getGalleryPhotos() {
  try {
    const sheet = getMainSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return [];

    const range = sheet.getRange(4, 1, lastRow - 3, 20);
    const values = range.getValues();
    const richTexts = range.getRichTextValues();

    const photos = [];
    const days = ["월", "화", "수", "목", "금", "토", "일"];

    // 1. 기존 사진 데이터 수집 로직
    for (let i = 0; i < values.length; i++) {
      const nickname = values[i][0];
      const role = String(values[i][18]).trim();
      if (role === "테스트" || !nickname) continue;

      for (let d = 0; d < 7; d++) {
        const statusCol = 2 + d * 2;
        const imgCol = statusCol + 1;
        const cellText = String(values[i][statusCol]);

        if (cellText.includes("O") && cellText.includes("공유함")) {
          const richText = richTexts[i][imgCol];
          let url = richText ? richText.getLinkUrl() : values[i][imgCol];
          let content = "";
          if (cellText.indexOf("|") !== -1) {
            content = cellText.split("|").slice(1).join("|").trim();
          }

          if (url) {
            photos.push({
              nickname: nickname,
              day: days[d],
              url: convertToThumbUrl(url),
              content: content,
              sortKey: d,
              reactions: {}, // 리액션 담을 빈 그릇 미리 생성
            });
          }
        }
      }
    }

    // 2. [추가] 리액션 시트에서 데이터 가져와서 합치기
    const ss = getCachedSS();
    let reactionSheet = ss.getSheetByName(REACTION_SHEET_NAME);
    if (reactionSheet) {
      const reactionData = reactionSheet.getDataRange().getValues();
      const countMap = {};

      // 리액션 카운팅 (닉네임_요일_이모지 기준)
      for (let j = 1; j < reactionData.length; j++) {
        const key = reactionData[j][0] + "_" + reactionData[j][1]; // 게시자_요일
        const emoji = reactionData[j][2];
        if (!countMap[key]) countMap[key] = {};
        countMap[key][emoji] = (countMap[key][emoji] || 0) + 1;
      }

      // 수집된 사진들에 리액션 숫자 매칭
      photos.forEach((p) => {
        const key = p.nickname + "_" + p.day;
        if (countMap[key]) p.reactions = countMap[key];
      });
    }

    photos.sort((a, b) => b.sortKey - a.sortKey);
    return photos;
  } catch (e) {
    Logger.log("Gallery Error: " + e.toString());
    return [];
  }
}

function getPendingVerifications(adminName) {
  if (!validateAdmin(adminName)) throw new Error("관리자 권한이 없습니다.");

  const ss = getCachedSS();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const lastRow = mainSheet.getLastRow();
  if (lastRow < 4) return [];

  // S열(19번째, 권한)까지 읽도록 범위를 확장
  const range = mainSheet.getRange(4, 1, lastRow - 3, 19);
  const values = range.getValues();
  const richTextData = range.getRichTextValues();

  const pendingList = [];
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  for (let i = 0; i < values.length; i++) {
    const nickname = values[i][0];
    const profileUrl = values[i][16];
    const role = String(values[i][18]).trim(); // S열 권한 확인
    const isTest = role === "테스트"; // 테스트 계정 여부

    for (let j = 0; j < 7; j++) {
      const statusColIdx = 2 + j * 2;
      const status = values[i][statusColIdx];

      // [핵심 수정] '△'로 시작하면 대기중으로 인식 (뒤에 ',공유함' 있어도 OK)
      if (String(status).startsWith("△")) {
        const imageCellRichText = richTextData[i][statusColIdx + 1];
        let rawImageUrl = "";

        if (imageCellRichText) {
          rawImageUrl = imageCellRichText.getLinkUrl();
        }
        if (!rawImageUrl) {
          rawImageUrl = values[i][statusColIdx + 1];
        }

        const displayImageUrl = convertToThumbUrl(rawImageUrl);

        pendingList.push({
          nickname: nickname,
          profileUrl: profileUrl,
          day: days[j],
          imageUrl: displayImageUrl,
          row: i + 4,
          col: statusColIdx + 1, // 시트의 열 번호 (1부터 시작)
          isTest: isTest,
        });
      }
    }
  }

  return pendingList;
}

function processVerification(adminName, row, col, decision, reason) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };
  try {
    const sheet = getMainSheet();

    // 기존 값 읽기
    const currentVal = String(sheet.getRange(row, col).getValue());
    const isShared = currentVal.includes("공유함");
    const shareTag = isShared ? ",공유함" : ",공유안함";

    let postContent = "";
    if (currentVal.includes("|")) {
      postContent = "|" + currentVal.split("|")[1];
    }

    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    let valueToSet = "";
    if (decision === "APPROVE") {
      valueToSet = `O,${adminName}(${timeStr})${shareTag}${postContent}`;

      // ★ [핵심 추가] 승인 시, 해당 요일의 기존 리액션 기록 초기화
      // col에서 요일 계산: (col - 3) / 2
      const days = ["월", "화", "수", "목", "금", "토", "일"];
      const dayIdx = (col - 3) / 2;
      const nickname = sheet.getRange(row, 1).getValue(); // A열 닉네임 가져오기

      if (dayIdx >= 0 && dayIdx < 7) {
        clearReactionLog(nickname, days[dayIdx]);
      }
    } else {
      valueToSet = `X,${reason},${adminName}(${timeStr})${shareTag}${postContent}`;
    }

    sheet.getRange(row, col).setValue(valueToSet);
    recalcStats(sheet, row);

    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

function getReviewHistory(adminName) {
  if (!validateAdmin(adminName)) return [];

  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];

  // 1. 주차 정보 파싱
  const fullTitle = sheet.getRange("A1").getValue();
  let weekTitle = "이번 주";
  try {
    if (fullTitle.includes("년") && fullTitle.includes("(")) {
      weekTitle = fullTitle.split("년")[1].split("(")[0].trim();
    } else {
      weekTitle = fullTitle;
    }
  } catch (e) {}

  const range = sheet.getRange(4, 1, lastRow - 3, 19);
  const values = range.getValues();
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const history = [];
  const currentYear = new Date().getFullYear(); // 정렬을 위한 연도

  for (let i = 0; i < values.length; i++) {
    const nickname = values[i][0];
    const role = String(values[i][18]).trim();
    if (role === "테스트") continue;

    for (let j = 0; j < 7; j++) {
      const colIdx = 2 + j * 2;
      const cellVal = String(values[i][colIdx]);

      if (cellVal.startsWith("O,") || cellVal.startsWith("X,")) {
        let status = cellVal.startsWith("O") ? "APPROVE" : "REJECT";
        let adminInfo = "관리자";
        let procTime = "-";
        let sortTimestamp = 0; // 정렬용 타임스탬프 (기본값 0)

        const parts = cellVal.split(",");

        if (status === "APPROVE") {
          if (parts.length > 1) adminInfo = parts[1];
        } else {
          if (parts.length > 2) adminInfo = parts[2];
        }

        // 시간 추출: "관리자(12/29 14:30)" -> 12/29 14:30
        const timeMatch = adminInfo.match(/\((.*?)\)/);
        if (timeMatch) {
          procTime = timeMatch[1];
          adminInfo = adminInfo.replace(/\(.*\)/, "").trim();

          // [핵심] 시간 문자열을 숫자로 변환하여 정렬 기준 만들기
          // 포맷: MM/dd HH:mm -> Date 객체 변환
          try {
            const dtParts = procTime.split(" "); // [12/29, 14:30]
            if (dtParts.length === 2) {
              const dateParts = dtParts[0].split("/"); // [12, 29]
              const timeParts = dtParts[1].split(":"); // [14, 30]

              // Date(년, 월-1, 일, 시, 분)
              const d = new Date(
                currentYear,
                parseInt(dateParts[0]) - 1,
                parseInt(dateParts[1]),
                parseInt(timeParts[0]),
                parseInt(timeParts[1]),
              );
              sortTimestamp = d.getTime();
            }
          } catch (e) {}
        }

        history.push({
          week: weekTitle,
          nickname: nickname,
          day: days[j],
          status: status,
          admin: adminInfo,
          time: procTime,
          timestamp: sortTimestamp, // 정렬을 위해 저장
        });
      }
    }
  }

  // [핵심] 타임스탬프 기준 내림차순 정렬 (큰 숫자가 위로 = 최신순)
  history.sort(function (a, b) {
    return b.timestamp - a.timestamp;
  });

  return history;
}

// ========== 유틸 및 통계 (수정됨) ==========
function recalcStats(sheet, rowNum) {
  const rowData = sheet.getRange(rowNum, 3, 1, 14).getValues()[0];
  let count = 0;
  for (let k = 0; k < 14; k += 2) {
    const val = String(rowData[k]);
    // [수정] 면제(☆)도 카운트에 포함
    if (val === "O" || val.startsWith("O,") || val.startsWith("☆")) {
      count++;
    }
  }
  let fine = 0;
  if (count < 3) fine = Math.min((3 - count) * 2000, 6000);

  sheet.getRange(rowNum, 17).setValue(count);
  sheet.getRange(rowNum, 18).setValue(fine);
}

function saveProfileImage(nickname, imageData) {
  try {
    const folderName = PROFILE_FOLDER_NAME;
    const folderIter = DriveApp.getFoldersByName(folderName);
    const folder = folderIter.hasNext()
      ? folderIter.next()
      : DriveApp.createFolder(folderName);

    // 파일명에 타임스탬프를 넣어 중복 방지
    const fileName = `Profile_${nickname}_${Date.now()}.jpg`;

    // Base64 디코딩 및 파일 생성
    const blob = Utilities.newBlob(
      Utilities.base64Decode(imageData.split(",")[1]),
      "image/jpeg",
      fileName,
    );
    const file = folder.createFile(blob);

    // [중요] 권한을 '링크가 있는 모든 사용자에게 공개'로 설정해야 엑박이 안 뜹니다.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();

    // [핵심 해결] lh3.googleusercontent.com 대신 drive.google.com/thumbnail 사용
    // 이 주소는 구글 드라이브 파일 ID를 기반으로 이미지를 직접 렌더링해줍니다.
    return "https://drive.google.com/thumbnail?sz=w1000&id=" + fileId;
  } catch (e) {
    return "";
  }
}

function saveImageToDrive(nickname, day, imageData) {
  try {
    const folderName = DRIVE_FOLDER_NAME;
    const folderIter = DriveApp.getFoldersByName(folderName);
    const folder = folderIter.hasNext()
      ? folderIter.next()
      : DriveApp.createFolder(folderName);

    const fileName = `${nickname}_${day}_${Date.now()}.jpg`;
    const blob = Utilities.newBlob(
      Utilities.base64Decode(imageData.split(",")[1]),
      "image/jpeg",
      fileName,
    );
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // [중요] 저장할 때부터 확실한 HTTPS 썸네일 주소로 저장
    const fileId = file.getId();
    return "https://drive.google.com/thumbnail?sz=w1000&id=" + fileId;
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function getUserFineStats(nickname) {
  const sheet = getCachedSS().getSheetByName(RECORD_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 3 || lastCol < 2)
    return { myFine: 0, max: 0, min: 0, percent: 0 };
  const data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  let allFines = [];
  let myFine = 0;
  for (let i = 0; i < data.length; i++) {
    let userTotal = 0;
    for (let j = 1; j < data[i].length; j++) {
      const cell = data[i][j];
      let countStr = String(cell).replace("+", "");
      if (countStr !== "" && !isNaN(countStr)) {
        const c = parseInt(countStr);
        if (c < 3) userTotal += Math.min((3 - c) * 2000, 6000);
      }
    }
    allFines.push(userTotal);
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      myFine = userTotal;
    }
  }
  if (allFines.length === 0) return { myFine: 0, max: 0, min: 0, percent: 0 };
  allFines.sort((a, b) => b - a);
  const maxFine = allFines[0];
  const minFine = allFines[allFines.length - 1];
  const myRank = allFines.indexOf(myFine) + 1;
  const percent = Math.round((myRank / allFines.length) * 100);
  return { myFine: myFine, max: maxFine, min: minFine, percent: percent };
}

function getUserTotalFine(nickname) {
  return getUserFineStats(nickname).myFine;
}

// ========== 면제 신청 및 관리 ==========
function requestExemption(nickname, dates, reason) {
  try {
    const ss = getCachedSS();
    let sheet = ss.getSheetByName(EXEMPTION_SHEET_NAME);

    // 시트가 없으면 생성 및 헤더 설정
    if (!sheet) {
      sheet = ss.insertSheet(EXEMPTION_SHEET_NAME);
      // 헤더에 '신청일시' 추가 (F열)
      sheet.appendRow([
        "닉네임",
        "면제 신청기간",
        "신청사유",
        "승인여부",
        "알림발송",
        "신청일시",
      ]);
    }

    const periodStr = dates.join(", ");

    // [신규] 현재 시간 포맷팅 (예: 12/23 14:30)
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    // [변경] 배열 마지막에 timeStr 추가 (F열에 들어감)
    sheet.appendRow([nickname, periodStr, reason, "", "", timeStr]);

    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

function getExemptionHistory(nickname) {
  const sheet = getCachedSS().getSheetByName(EXEMPTION_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const history = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      history.push({
        period: data[i][1],
        reason: data[i][2],
        status: data[i][3],
      });
    }
  }
  return history.reverse();
}

function checkExemptionNoti(nickname) {
  const sheet = getCachedSS().getSheetByName(EXEMPTION_SHEET_NAME);
  if (!sheet) return { hasNoti: false };
  const data = sheet.getDataRange().getValues();
  let notiMsg = "";
  let hasNoti = false;
  for (let i = 1; i < data.length; i++) {
    const rowNick = String(data[i][0]).trim();
    const status = data[i][3];
    const sentFlag = String(data[i][4]);
    if (
      rowNick === String(nickname).trim() &&
      sentFlag !== "Y" &&
      status !== "" &&
      status !== undefined
    ) {
      if (status == 1) {
        const reasonShort = String(data[i][2]);
        notiMsg = `✅ 승인 알림\n\n신청하신 '${reasonShort}' 건의\n면제 신청이 완료(승인)되었습니다.`;
        hasNoti = true;
      } else if (status == 0) {
        const reasonShort = String(data[i][2]);
        notiMsg = `🚫 반려 알림\n\n신청하신 '${reasonShort}' 건의\n면제 신청이 반려되었습니다.`;
        hasNoti = true;
      }
      if (hasNoti) {
        sheet.getRange(i + 1, 5).setValue("Y");
        return { hasNoti: true, msg: notiMsg };
      }
    }
  }
  return { hasNoti: false };
}

function getPendingExemptions(adminName) {
  if (!validateAdmin(adminName)) return [];

  const sheet = getCachedSS().getSheetByName(EXEMPTION_SHEET_NAME);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // 데이터가 없으면 빈 배열 반환

  // 데이터 범위: 2행부터 끝까지, A~F열(6개)
  const data = sheet.getRange(2, 1, lastRow - 1, 6).getDisplayValues();

  const pendingList = [];

  for (let i = 0; i < data.length; i++) {
    // 승인여부(D열, index 3)가 비어있는 것만 조회
    if (data[i][3] === "") {
      // F열(index 5) 시간 데이터 가져오기
      const rawTime = data[i][5];
      const displayTime = rawTime && rawTime !== "" ? rawTime : "";

      pendingList.push({
        row: i + 2, // 데이터가 2행부터 시작하므로 +2
        nickname: data[i][0],
        period: data[i][1],
        reason: data[i][2],
        requestTime: displayTime,
      });
    }
  }
  return pendingList;
}

// ========== [수정] 면제 처리 로직 (다음 주 AA:AT 영역 대응) ==========
function processExemption(adminName, row, decision) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };
  try {
    const ss = getCachedSS();
    const exSheet = ss.getSheetByName(EXEMPTION_SHEET_NAME);
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

    // 승인/반려 상태 기록
    exSheet.getRange(row, 4).setValue(decision);

    // 반려(0)인 경우 종료
    if (decision != 1) return { success: true };

    // --- [핵심] 날짜 계산 및 메인 시트 마킹 ---
    const rowData = exSheet.getRange(row, 1, 1, 2).getValues()[0];
    const nickname = rowData[0];
    const periodStr = String(rowData[1]); // "2024-12-25, 2024-12-26" 형태
    const dates = periodStr.split(",").map((d) => d.trim());

    // 1. 이번 주 기준 날짜 파악 (A1 셀 파싱)
    const currentTitle = mainSheet.getRange("A1").getValue();
    const thisSunday = findExactSundayFromTitle(currentTitle);
    if (!thisSunday) return { success: true }; // 날짜 파싱 실패 시 중단

    const thisMonday = new Date(thisSunday);
    thisMonday.setDate(thisSunday.getDate() - 6);
    thisMonday.setHours(0, 0, 0, 0);
    thisSunday.setHours(0, 0, 0, 0);

    // 2. 다음 주 기준 날짜 파악
    const nextMonday = new Date(thisSunday);
    nextMonday.setDate(thisSunday.getDate() + 1);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextMonday.setHours(0, 0, 0, 0);
    nextSunday.setHours(0, 0, 0, 0);

    // 3. 사용자 행 찾기
    const mainLastRow = mainSheet.getLastRow();
    const mainData = mainSheet.getRange(4, 1, mainLastRow - 3, 1).getValues();
    let userRowIndex = -1;
    for (let i = 0; i < mainData.length; i++) {
      if (String(mainData[i][0]).trim() === String(nickname).trim()) {
        userRowIndex = 4 + i;
        break;
      }
    }
    if (userRowIndex === -1) return { success: true }; // 사용자 없음

    // 4. 날짜별 별표(☆) 마킹 (이번 주 vs 다음 주 구분)
    dates.forEach((dateStr) => {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);

      let targetCol = -1;

      // Case A: 이번 주 범위 내
      if (targetDate >= thisMonday && targetDate <= thisSunday) {
        let dayDiff = Math.round(
          (targetDate - thisMonday) / (1000 * 60 * 60 * 24),
        );
        if (dayDiff >= 0 && dayDiff <= 6) {
          targetCol = 3 + dayDiff * 2; // C열(3) 부터 시작
        }
      }
      // Case B: 다음 주 범위 내 (AA~AT 영역)
      else if (targetDate >= nextMonday && targetDate <= nextSunday) {
        let dayDiff = Math.round(
          (targetDate - nextMonday) / (1000 * 60 * 60 * 24),
        );
        if (dayDiff >= 0 && dayDiff <= 6) {
          // A(1) <-> AA(27) : 차이는 26
          // 이번주 월요일이 3번 컬럼(C)이니, 다음주 월요일은 29번 컬럼(AC)
          targetCol = 3 + dayDiff * 2 + 26;
        }
      }

      if (targetCol !== -1) {
        mainSheet.getRange(userRowIndex, targetCol).setValue(`☆,${adminName}`);
      }
    });

    // 통계 재계산 (이번 주 데이터만 갱신하면 됨, 다음 주는 집계 시 넘어옴)
    recalcStats(mainSheet, userRowIndex);

    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

function getTransactionHistory() {
  const sheet = getCachedSS().getSheetByName(TRANSACTION_SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];

  // 뒤에서부터 탐색하여 '가장 최근의 이월금' 위치를 찾음
  let startIndex = 1; // 기본은 처음부터 (헤더 제외)

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim() === "전월 이월금") {
      startIndex = i;
      break;
    }
  }

  const history = [];
  // 찾은 시작점(startIndex)부터 끝까지만 리스트에 담음
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    // 구분선(---) 등 의미 없는 데이터는 제외
    if (!row[0] && !row[2] && !row[3]) continue;
    if (row[1].includes("---")) continue;

    history.push({
      date: row[0],
      desc: row[1],
      income: row[2],
      expense: row[3],
      balance: row[4],
      who: row[5],
      rowNum: i + 1, // 실제 행 번호
    });
  }
  return history;
}

// ========== 주간 집계 및 초기화 ==========
function checkAggregationStatus() {
  const props = PropertiesService.getScriptProperties();
  const lastTimeStr = props.getProperty("LAST_AGG_TIME");
  const lastUser = props.getProperty("LAST_AGG_USER");
  if (!lastTimeStr) return { recent: false };
  const lastTime = new Date(lastTimeStr);
  const now = new Date();
  const diffHours = (now - lastTime) / (1000 * 60 * 60);
  if (diffHours < 24) {
    return {
      recent: true,
      user: lastUser || "관리자",
      hoursAgo: Math.floor(diffHours),
      minsAgo: Math.floor((diffHours % 1) * 60),
    };
  }
  return { recent: false };
}

// ========== [수정] 주간 집계 (다음 주 데이터 이월 포함) ==========
function adminAggregateWeek(adminName) {
  if (!validateAdmin(adminName))
    return { success: false, message: "관리자 권한이 없습니다." };
  try {
    const ss = getCachedSS();
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);
    let finalSheet = ss.getSheetByName(FINAL_RECORD_SHEET_NAME);
    if (!finalSheet)
      return {
        success: false,
        message: `'${FINAL_RECORD_SHEET_NAME}' 시트가 없습니다.`,
      };

    const props = PropertiesService.getScriptProperties();
    props.setProperty("LAST_AGG_TIME", new Date().toISOString());
    props.setProperty("LAST_AGG_USER", adminName);

    const currentTitle = mainSheet.getRange("A1").getValue();
    const realEndDate = findExactSundayFromTitle(currentTitle);
    let saveRangeStr = "",
      saveMonth = "";
    if (realEndDate) {
      const weekInfo = calculateCorrectWeekInfo(realEndDate);
      saveRangeStr = weekInfo.range.replace("~", "-");
      const m = weekInfo.fullText.match(/(\d+)월/);
      saveMonth = m ? m[1] : realEndDate.getMonth() + 1;
    } else {
      const lastWeek = calculateCorrectWeekInfo(new Date(), true);
      saveRangeStr = lastWeek.range.replace("~", "-");
      const m = lastWeek.fullText.match(/(\d+)월/);
      saveMonth = m ? m[1] : new Date().getMonth() + 1;
    }

    const lastRowMain = mainSheet.getLastRow();
    if (lastRowMain < 4) throw new Error("집계할 회원이 없습니다.");

    // 19열(S열)까지 가져옴
    const mainData = mainSheet.getRange(4, 1, lastRowMain - 3, 19).getValues();

    const fineCountMap = {};
    const realWorkoutMap = {};
    const patternMap = {};

    for (let i = 0; i < mainData.length; i++) {
      const nick = mainData[i][0];
      const role = String(mainData[i][18]).trim();

      // [수정된 부분] 테스트 계정과 '탈퇴' 계정을 모두 제외합니다.
      if (nick && role !== "테스트" && role !== "탈퇴") {
        // Q열은 17번째 열이지만, 배열 인덱스는 0부터 시작하므로 16입니다.
        fineCountMap[nick] = mainData[i][16];

        let realCount = 0;
        let patternArr = [];

        for (let d = 0; d < 7; d++) {
          const colIdx = 2 + d * 2;
          const val = String(mainData[i][colIdx]);
          if (val === "O" || val.startsWith("O,")) {
            realCount++;
            patternArr.push("O");
          } else {
            patternArr.push("X");
          }
        }
        realWorkoutMap[nick] = realCount;
        patternMap[nick] = patternArr.join(",");
      }
    }

    // 기록 저장 (맵에 없는 닉네임은 saveToSheet 함수가 자동으로 빈 칸("")으로 처리합니다)
    saveToSheet(recordSheet, saveMonth, saveRangeStr, fineCountMap, null);
    saveToSheet(
      finalSheet,
      saveMonth,
      saveRangeStr,
      realWorkoutMap,
      patternMap,
    );

    // 리포트 업데이트
    updateSemiAnnualReport(patternMap, fineCountMap);

    // 백업 및 이월 (다음 주 데이터가 있다면 현재로 이동)
    const currentWeekRange = mainSheet.getRange(4, 3, lastRowMain - 3, 14);
    const currentWeekValues = currentWeekRange.getValues();
    mainSheet.getRange("BA1").setValue(currentTitle);
    mainSheet.getRange(4, 55, lastRowMain - 3, 14).setValues(currentWeekValues);

    const nextWeekRange = mainSheet.getRange(4, 29, lastRowMain - 3, 14);
    const nextWeekValues = nextWeekRange.getValues();

    currentWeekRange.setValues(nextWeekValues);
    nextWeekRange.clearContent();

    // 통계 초기화 (Q열:횟수, R열:벌금)
    const statRange = mainSheet.getRange(4, 17, lastRowMain - 3, 2);
    const resetStats = [];
    for (let r = 0; r < lastRowMain - 3; r++) {
      resetStats.push([0, 6000]);
    }
    statRange.setValues(resetStats);

    updateMainTitle(mainSheet, true);

    for (let u = 0; u < lastRowMain - 3; u++) {
      recalcStats(mainSheet, 4 + u);
    }

    return {
      success: true,
      message: `[${saveRangeStr}] 저장 완료!\n데이터가 안전하게 보관되었습니다.`,
    };
  } catch (error) {
    return { success: false, message: "오류 발생: " + error.toString() };
  }
}

// [수정됨] 값을 저장할 때 '메모(Note)'도 같이 저장하는 헬퍼 함수
function saveToSheet(targetSheet, month, rangeStr, dataMap, patternMap) {
  const lastRow = targetSheet.getLastRow();
  let targetCol = targetSheet.getLastColumn() + 1;
  if (targetSheet.getLastColumn() < 2) targetCol = 2;

  // 헤더 작성
  targetSheet.getRange(1, targetCol).setNumberFormat("@").setValue(month);
  targetSheet.getRange(2, targetCol).setNumberFormat("@").setValue(rangeStr);

  let rowNicks = [];
  if (lastRow >= 3) {
    rowNicks = targetSheet
      .getRange(3, 1, lastRow - 2, 1)
      .getValues()
      .flat();
  }

  const valuesToWrite = [];
  const notesToWrite = []; // 메모 배열

  for (let i = 0; i < rowNicks.length; i++) {
    const nick = rowNicks[i];
    if (!nick) {
      valuesToWrite.push([""]);
      notesToWrite.push([""]);
      continue;
    }

    let count = dataMap[nick];
    if (count === undefined || count === null) count = "";
    valuesToWrite.push([count]);

    // 패턴이 있으면 메모에 저장
    if (patternMap && patternMap[nick]) {
      notesToWrite.push([patternMap[nick]]);
    } else {
      notesToWrite.push([""]);
    }
  }

  if (valuesToWrite.length > 0) {
    const cellRange = targetSheet.getRange(
      3,
      targetCol,
      valuesToWrite.length,
      1,
    );
    cellRange.setValues(valuesToWrite);
    if (patternMap) {
      cellRange.setNotes(notesToWrite); // [핵심] 메모 심기
    }
  }
}

// ========== [수정] 제목 업데이트 (AA1 셀에 다음 주 제목 추가) ==========
function updateMainTitle(sheet, forceNext = false) {
  const currentTitle = sheet.getRange("A1").getValue();
  let nextWeekInfo, nextNextWeekInfo;

  // 1. 기준 날짜 설정 (forceNext면 현재 제목 기준 +1주, 아니면 오늘 기준)
  let baseDate = new Date();
  if (forceNext && currentTitle) {
    const realEndDate = findExactSundayFromTitle(currentTitle);
    if (realEndDate) {
      const nextStartDate = new Date(realEndDate);
      nextStartDate.setDate(realEndDate.getDate() + 1);
      baseDate = nextStartDate;
    }
  }

  // 2. 이번 주 (A1) 및 다음 주 (AA1) 정보 계산
  const thisWeekInfo = calculateCorrectWeekInfo(baseDate);

  // baseDate 기준 7일 뒤가 다음 주
  const nextBaseDate = new Date(baseDate);
  nextBaseDate.setDate(baseDate.getDate() + 7);
  const nextWeekCalculated = calculateCorrectWeekInfo(nextBaseDate);

  // 3. 값 설정
  sheet.getRange("A1").setValue(thisWeekInfo.fullText);
  sheet.getRange("AA1").setValue(nextWeekCalculated.fullText); // AA1에 다음 주 제목
}

function findExactSundayFromTitle(title) {
  const matches = String(title).match(/(\d+)년\s+(\d+)월.*\((\d+)일~(\d+)일\)/);
  if (!matches) return null;

  const y = parseInt(matches[1]);
  const m = parseInt(matches[2]) - 1;
  const d_start = parseInt(matches[3]);
  const d_end = parseInt(matches[4]);

  // ★ [핵심 수정] 이전 달(m-1)이 아니라 해당 달(m)을 가장 먼저 검사하도록 순서를 바꿨습니다!
  const candidates = [
    new Date(y, m, d_end),
    new Date(y, m + 1, d_end),
    new Date(y, m - 1, d_end),
  ];

  for (let date of candidates) {
    if (date.getDay() !== 0) continue;
    const testDate = new Date(date);
    testDate.setDate(date.getDate() - 6);
    if (testDate.getDate() === d_start) return date;
  }
  return null;
}

function calculateCorrectWeekInfo(dateObj, isLastWeek = false) {
  let baseDate = new Date(dateObj);
  if (isLastWeek) baseDate.setDate(baseDate.getDate() - 7);

  const day = baseDate.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMon);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);

  const year = thursday.getFullYear();
  const month = thursday.getMonth() + 1;
  const weekNum = Math.ceil(thursday.getDate() / 7);

  // [핵심 수정] 기존: `${d}-${d}` -> 변경: `${m}.${d}-${m}.${d}`
  // 예: "26-1" -> "1.26-2.1" 로 변경하여 월 정보를 포함시킴
  const m1 = monday.getMonth() + 1;
  const d1 = monday.getDate();
  const m2 = sunday.getMonth() + 1;
  const d2 = sunday.getDate();

  const rangeStr = `${m1}.${d1}-${m2}.${d2}`;
  const fullText = `${year}년 ${month}월 ${weekNum}주차 (${monday.getDate()}일~${sunday.getDate()}일)`;

  return { range: rangeStr, fullText: fullText };
}

function getMainSheet() {
  if (!_globalMainSheet) {
    _globalMainSheet = getCachedSS().getSheetByName(MAIN_SHEET_NAME);
  }
  return _globalMainSheet;
}

function checkAndPayFine(nickname) {
  const ss = getCachedSS();
  const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  // 1. 지난주 제목 가져오기 (BA1 셀)
  // 만약 BA1이 비어있다면(첫 실행 등) 기존 로직대로 계산
  let lastWeekTitle = mainSheet.getRange("BA1").getValue();
  let lastWeekRange = "";

  if (lastWeekTitle && String(lastWeekTitle).includes("(")) {
    // "2025년 1월 1주차 (12월 29일~1월 4일)" 형태에서 날짜만 추출
    try {
      lastWeekRange = lastWeekTitle.split("(")[1].replace(")", "");
    } catch (e) {
      lastWeekRange = "지난 주";
    }
  } else {
    // 백업된 제목이 없으면 계산
    const currentTitle = mainSheet.getRange("A1").getValue();
    const realEndDate = findExactSundayFromTitle(currentTitle);
    if (realEndDate) {
      const lastEndDate = new Date(realEndDate);
      lastEndDate.setDate(realEndDate.getDate() - 7);
      const lastStartDate = new Date(lastEndDate);
      lastStartDate.setDate(lastEndDate.getDate() - 6);
      lastWeekRange = `${lastStartDate.getDate()}일-${lastEndDate.getDate()}일`;
    } else {
      lastWeekRange = "지난 주";
    }
  }

  // 2. 지난주 상세 데이터 파싱 (BC~BP열)
  let prevWeekData = null;
  const lastRow = mainSheet.getLastRow();
  const mainData = mainSheet.getRange(4, 1, lastRow - 3, 68).getValues(); // BP(68)까지 읽음

  let targetRowIdx = -1;
  for (let i = 0; i < mainData.length; i++) {
    if (String(mainData[i][0]).trim() === String(nickname).trim()) {
      targetRowIdx = i;
      break;
    }
  }

  if (targetRowIdx !== -1) {
    // BC열(인덱스 54)부터 14칸 (월~일)
    const row = mainData[targetRowIdx];
    prevWeekData = {};
    const days = ["월", "화", "수", "목", "금", "토", "일"];

    for (let d = 0; d < 7; d++) {
      const colIdx = 54 + d * 2; // BC=54 (0-based index)
      const statusVal = String(row[colIdx]);

      let status = "NONE";
      if (statusVal === "O" || statusVal.startsWith("O,")) status = "DONE";
      else if (statusVal === "△" || statusVal.startsWith("△"))
        status = "PENDING"; // 지난주에 pending이면 사실상 안한거지만 표시는 해줌
      else if (statusVal.startsWith("X")) status = "REJECT";
      else if (statusVal.startsWith("☆")) status = "EXEMPT";

      prevWeekData[days[d]] = status;
    }
  }

  // 3. 기존 정산 내역 확인 (Record 시트)
  const lastCol = recordSheet.getLastColumn();
  if (lastCol < 2) return { found: false, msg: "아직 정산 데이터가 없습니다." };

  // 가장 마지막 열(최신 지난주)을 확인
  const recordData = recordSheet
    .getRange(3, 1, recordSheet.getLastRow() - 2, lastCol)
    .getValues();

  for (let r = 0; r < recordData.length; r++) {
    if (String(recordData[r][0]).trim() === String(nickname).trim()) {
      const cellValue = recordData[r][lastCol - 1];
      const cellStr = String(cellValue);

      if (cellValue === "" || cellValue === undefined) {
        return { found: true, isNew: true, weekRange: lastWeekRange };
      }

      let paid = false;
      if (cellStr.includes("+")) paid = true;

      let count = parseInt(cellStr);
      let fine = 0;
      if (count < 3) fine = Math.min((3 - count) * 2000, 6000);

      return {
        found: true,
        paid: paid,
        weekRange: lastWeekRange,
        count: count,
        fine: fine,
        prevWeekData: prevWeekData, // [추가] 캘린더용 데이터
      };
    }
  }
  return { found: false, msg: "회원 정보를 찾을 수 없습니다." };
}

function convertToThumbUrl(url) {
  if (!url) return "";
  const urlStr = String(url);

  let fileId = "";

  // 1. 제가 잘못 알려드린 'profile/picture/0' 형식 처리
  if (urlStr.includes("profile/picture/0")) {
    fileId = urlStr.split("profile/picture/0")[1];
  }
  // 2. 일반적인 구글 드라이브 id= 형식 처리
  else if (urlStr.includes("id=")) {
    const parts = urlStr.split("id=");
    if (parts.length > 1) {
      fileId = parts[1].split("&")[0]; // 뒤에 &가 붙을 경우 제거
    }
  }
  // 3. /d/ 파일 ID 형식 처리
  else if (urlStr.includes("/d/")) {
    const parts = urlStr.split("/d/");
    if (parts.length > 1) {
      fileId = parts[1].split("/")[0];
    }
  }

  // ID를 찾았다면 확실한 HTTPS 썸네일 주소로 반환
  if (fileId) {
    return "https://drive.google.com/thumbnail?sz=w1000&id=" + fileId;
  }

  // ID 추출 실패 시, http를 https로라도 바꿔서 반환
  return urlStr.replace("http://", "https://");
}

function fixAllProfileImages() {
  Logger.log("🚀 [1단계] 복구 작업 시작...");

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);

  if (!sheet) {
    Logger.log("❌ 오류: 'Main' 시트를 찾을 수 없습니다.");
    return;
  }

  const lastRow = sheet.getLastRow();
  Logger.log("ℹ️ 시트 총 행 수: " + lastRow);

  if (lastRow < 4) {
    Logger.log("⚠️ 알림: 회원이 없습니다 (데이터가 4행부터 시작해야 합니다).");
    return;
  }

  // 1. 프로필 사진 폴더 찾기
  Logger.log("📂 [2단계] 폴더 찾는 중: " + PROFILE_FOLDER_NAME);
  const folders = DriveApp.getFoldersByName(PROFILE_FOLDER_NAME);
  if (!folders.hasNext()) {
    Logger.log(
      "❌ 오류: 드라이브에 '" + PROFILE_FOLDER_NAME + "' 폴더가 없습니다.",
    );
    return;
  }
  const folder = folders.next();

  // 2. 폴더 내의 모든 파일을 스캔해서 { 닉네임: fileId } 맵 만들기
  Logger.log("📂 [3단계] 파일 스캔 중...");
  const fileMap = {};
  const files = folder.getFiles();
  let fileCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName(); // 예: Profile_돌콩_1709...jpg
    fileCount++;

    // 파일명에서 닉네임 추출 (Profile_닉네임_타임스탬프 형식 가정)
    const parts = fileName.split("_");
    if (parts.length >= 2) {
      const nickInFile = parts[1]; // 두 번째 덩어리가 닉네임

      // 이미 같은 닉네임 파일이 있다면, 더 최신 파일인지 확인 (타임스탬프 비교)
      if (
        !fileMap[nickInFile] ||
        file.getLastUpdated() > fileMap[nickInFile].date
      ) {
        fileMap[nickInFile] = {
          id: file.getId(),
          date: file.getLastUpdated(),
        };
      }
    }
  }

  Logger.log("✅ 파일 스캔 완료. 발견된 파일 수: " + fileCount);
  Logger.log("✅ 매칭 가능한 닉네임 수: " + Object.keys(fileMap).length);

  // 3. 시트의 회원 목록을 돌면서 링크 업데이트
  Logger.log("📝 [4단계] 시트 업데이트 시작...");

  // T열 (20번째 열)에 프로필 사진 위치
  const range = sheet.getRange(4, 20, lastRow - 3, 1);
  const data = sheet.getRange(4, 1, lastRow - 3, 1).getValues(); // 닉네임(A열)

  let updateCount = 0;

  for (let i = 0; i < data.length; i++) {
    const nickname = String(data[i][0]).trim(); // A열

    // 드라이브에 해당 닉네임의 파일이 존재하는지 확인
    if (nickname && fileMap[nickname]) {
      const fileId = fileMap[nickname].id;

      // [중요] 엑박 안 뜨는 확실한 썸네일 주소 생성
      const newUrl = "https://drive.google.com/thumbnail?sz=w1000&id=" + fileId;

      // "📷프로필" 글자에 링크 입히기
      const richText = SpreadsheetApp.newRichTextValue()
        .setText("📷프로필")
        .setLinkUrl(newUrl)
        .build();

      // T열 (index 19 -> column 20)에 붙여넣기 (행은 i + 4)
      sheet.getRange(i + 4, 20).setRichTextValue(richText);
      updateCount++;
      Logger.log(" -> 수정됨: " + nickname);
    }
  }

  Logger.log("🎉 [완료] 총 " + updateCount + "명의 프로필이 연결되었습니다.");
  return "복구 완료! " + updateCount + "건 처리됨";
}

function getAdminUnpaidFines(adminName) {
  if (!validateAdmin(adminName)) throw new Error("관리자 권한이 없습니다.");

  const ss = getCachedSS();
  const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  if (!recordSheet || !mainSheet) return { list: [], weekTitle: "시트 오류" };

  const lastCol = recordSheet.getLastColumn();
  const lastRow = recordSheet.getLastRow();

  // 데이터가 너무 적으면 빈 결과 반환
  if (lastCol < 2 || lastRow < 3) return { list: [], weekTitle: "데이터 없음" };

  // 1. 날짜 타이틀 생성
  let weekTitle = "날짜 미상";
  let weekNote = "주차 미상";
  try {
    const monthVal = recordSheet.getRange(1, lastCol).getValue();
    const rangeVal = recordSheet.getRange(2, lastCol).getValue();
    const displayMonth = String(monthVal).replace("월", "") + "월";
    const displayRange = String(rangeVal).replace(/-/g, "~") + "일";
    weekTitle = `${displayMonth} (${displayRange})`;

    const startDay = parseInt(String(rangeVal).split(/[-~]/)[0]);
    const weekNum = Math.ceil(startDay / 7);
    weekNote = displayMonth + " " + weekNum + "주차";
  } catch (e) {}

  // 2. 탈퇴 회원 목록 미리 확보 (Main 시트 조회)
  const withdrawnSet = new Set();
  const mainLastRow = mainSheet.getLastRow();
  const mainLastCol = mainSheet.getLastColumn();

  if (mainLastRow >= 4) {
    // [안전장치 수정] S열(19번째)이 존재하는지 확인하고 읽음
    // 만약 열이 부족하면 닉네임(A열)만 읽어서 탈퇴 처리는 건너뜀
    if (mainLastCol >= 19) {
      const mainData = mainSheet
        .getRange(4, 1, mainLastRow - 3, 19)
        .getValues(); // A~S열
      for (let i = 0; i < mainData.length; i++) {
        const nick = String(mainData[i][0]).trim();
        const role = String(mainData[i][18]).trim(); // S열(인덱스 18)
        if (role === "탈퇴") withdrawnSet.add(nick);
      }
    }
  }

  // 3. 미납 내역 스캔 (Record 시트 조회)
  const data = recordSheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  const unpaidList = [];

  for (let i = 0; i < data.length; i++) {
    const nickname = String(data[i][0]).trim();

    // 탈퇴 회원이거나 닉네임이 없으면 건너뜀
    if (!nickname || withdrawnSet.has(nickname)) continue;

    const cellVal = data[i][lastCol - 1]; // 마지막 열(지난주)
    const cellStr = String(cellVal);

    // 이미 납부(+)되었거나 빈칸이면 패스
    if (cellStr.includes("+") || cellVal === "" || cellVal === undefined)
      continue;

    const count = parseInt(cellStr);
    // 숫자가 있고 3회 미만이면 벌금 부과
    if (!isNaN(count) && count < 3) {
      const fine = (3 - count) * 2000;
      if (fine > 0) {
        unpaidList.push({
          nickname: nickname,
          count: count,
          fine: fine,
          weekNote: weekNote,
          row: i + 3, // 실제 행 번호 (데이터가 3행부터 시작하므로 index + 3)
          col: lastCol,
        });
      }
    }
  }

  return { list: unpaidList, weekTitle: weekTitle };
}

// 2. 벌금 납부 처리 (거래내역 기록 + 운동기록 마킹)
function processFinePayment(adminName, targetNick, amount, weekNote, row, col) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const transSheet = ss.getSheetByName(TRANSACTION_SHEET_NAME);
  const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);

  // A. 운동기록 시트에 납부 완료 마킹 (+)
  // 기존 값 뒤에 +를 붙임 (예: "1" -> "1+")
  const currentVal = recordSheet.getRange(row, col).getValue();
  if (String(currentVal).includes("+"))
    return { success: false, msg: "이미 납부 처리된 건입니다." };
  recordSheet.getRange(row, col).setValue(currentVal + "+");

  // B. 거래내역 시트에 기록 추가
  // 컬럼: A(일시) B(내용) C(수입) D(지출) E(잔액) F(거래자) G(비고)

  // 1. 현재 잔액 계산
  let currentBalance = 0;
  const lastTransRow = transSheet.getLastRow();
  if (lastTransRow > 1) {
    const balanceCell = transSheet.getRange(lastTransRow, 5).getValue(); // E열
    if (!isNaN(parseInt(balanceCell))) currentBalance = parseInt(balanceCell);
  }

  // 2. 새 잔액
  const income = parseInt(amount);
  const newBalance = currentBalance + income;

  // 3. 날짜 포맷 [수정됨: 시간 제거]
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  // 4. 행 추가
  transSheet.appendRow([
    dateStr, // A: 거래일시 (이제 날짜만 들어갑니다)
    "벌금", // B: 내용
    income, // C: 수입
    0, // D: 지출
    newBalance, // E: 잔액
    targetNick, // F: 거래자명
    weekNote, // G: 비고
  ]);

  return { success: true };
}

function getWorkoutLeaderboard(myNickname) {
  const ss = getCachedSS();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const finalSheet = ss.getSheetByName(FINAL_RECORD_SHEET_NAME);

  const totalMap = {};
  const testUsers = new Set();

  const CUTOFF_DATE = new Date(2026, 0, 1);
  CUTOFF_DATE.setHours(0, 0, 0, 0);

  // 0. Main 시트에서 테스트 및 탈퇴 계정 명단 확보
  const mainLastRow = mainSheet.getLastRow();
  let mainData = [];
  if (mainLastRow >= 4) {
    mainData = mainSheet.getRange(4, 1, mainLastRow - 3, 19).getValues();
    for (let i = 0; i < mainData.length; i++) {
      const nick = String(mainData[i][0]).trim();
      const role = String(mainData[i][18]).trim(); // S열
      // [수정] 테스트 혹은 탈퇴 계정이면 필터링 목록에 추가
      if (role === "테스트" || role === "탈퇴") {
        testUsers.add(nick);
      }
    }
  }

  // 1. 과거 기록 합산 ('최종기록' 시트)
  try {
    if (finalSheet) {
      const lastRow = finalSheet.getLastRow();
      const lastCol = finalSheet.getLastColumn();
      const headers = finalSheet.getRange(2, 1, 1, lastCol).getValues()[0];

      if (lastRow >= 3 && lastCol >= 2) {
        const data = finalSheet
          .getRange(3, 1, lastRow - 2, lastCol)
          .getValues();
        for (let i = 0; i < data.length; i++) {
          const nick = String(data[i][0]).trim();
          if (!nick || testUsers.has(nick)) continue; // 탈퇴/테스트 제외

          let pastTotal = 0;
          for (let j = 1; j < data[i].length; j++) {
            let isValidColumn = false;
            try {
              const headerStr = String(headers[j]);
              const endDateStr = headerStr.includes("~")
                ? headerStr.split("~")[1]
                : headerStr;
              const parts = endDateStr.split(/[-\.]/);
              if (parts.length >= 2) {
                const m = parseInt(parts[0]);
                const d = parseInt(parts[1]);
                const checkYear = m >= 1 ? 2026 : 2025;
                const colDate = new Date(checkYear, m - 1, d);
                colDate.setHours(0, 0, 0, 0);
                if (colDate >= CUTOFF_DATE) isValidColumn = true;
              } else {
                isValidColumn = true;
              }
            } catch (e) {
              isValidColumn = true;
            }

            if (isValidColumn) {
              const val = parseInt(data[i][j]);
              if (!isNaN(val)) pastTotal += val;
            }
          }
          totalMap[nick] = pastTotal;
        }
      }
    }
  } catch (e) {
    Logger.log("Leaderboard Error: " + e.toString());
  }

  // 2. 이번 주 기록 합산 ('Main' 시트 데이터 활용)
  const currentTitle = mainSheet.getRange("A1").getValue();
  const sundayDate = findExactSundayFromTitle(currentTitle);
  let mondayDate = null;
  if (sundayDate) {
    mondayDate = new Date(sundayDate);
    mondayDate.setDate(sundayDate.getDate() - 6);
    mondayDate.setHours(0, 0, 0, 0);
  }

  if (mainData.length > 0 && mondayDate) {
    for (let i = 0; i < mainData.length; i++) {
      const nick = String(mainData[i][0]).trim();
      const role = String(mainData[i][18]).trim();

      // [중요 수정] 여기서 '탈퇴' 권한을 한 번 더 체크해야 합니다.
      if (!nick || role === "테스트" || role === "탈퇴") continue;

      let currentWeekCount = 0;
      for (let d = 0; d < 7; d++) {
        const targetDate = new Date(mondayDate);
        targetDate.setDate(mondayDate.getDate() + d);
        targetDate.setHours(0, 0, 0, 0);
        if (targetDate < CUTOFF_DATE) continue;

        const colIdx = 2 + d * 2;
        const val = String(mainData[i][colIdx]);
        if (val === "O" || val.startsWith("O,")) currentWeekCount++;
      }

      if (totalMap[nick] !== undefined) totalMap[nick] += currentWeekCount;
      else totalMap[nick] = currentWeekCount;
    }
  }

  // 3. 배열 변환 및 정렬
  let leaderboard = Object.entries(totalMap).map(([nick, count]) => ({
    nickname: nick,
    count: count,
  }));
  leaderboard.sort((a, b) => b.count - a.count);

  // 4. 내 순위 계산
  let myRank = 0,
    myCount = 0;
  for (let i = 0; i < leaderboard.length; i++) {
    leaderboard[i].rank = i + 1;
    if (leaderboard[i].nickname === String(myNickname).trim()) {
      myRank = i + 1;
      myCount = leaderboard[i].count;
    }
  }

  return {
    list: leaderboard,
    myRank: myRank,
    myCount: myCount,
    percent:
      leaderboard.length > 0
        ? Math.ceil((myRank / leaderboard.length) * 100)
        : 0,
    totalMembers: leaderboard.length,
  };
}

function updateTutorialStatus(nickname, type) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return;
  const data = sheet.getRange(4, 1, lastRow - 3, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nickname).trim()) {
      const row = 4 + i;
      const cell = sheet.getRange(row, 22); // V열
      let currentVal = String(cell.getValue());
      let newVal = currentVal;
      if (type === "user" && !currentVal.includes("USER_DONE")) {
        newVal += ",USER_DONE";
      } else if (type === "admin" && !currentVal.includes("ADMIN_DONE")) {
        newVal += ",ADMIN_DONE";
      } else if (type === "ai_info" && !currentVal.includes("AI_INFO_DONE")) {
        newVal += ",AI_INFO_DONE";
      } else if (
        type === "recap" &&
        !currentVal.includes("RECAP_2026H1_DONE")
      ) {
        // ★ 추가됨
        newVal += ",RECAP_2026H1_DONE";
      } // 앞쪽 콤마 정리
      if (newVal.startsWith(",")) newVal = newVal.substring(1);
      cell.setValue(newVal);
      return;
    }
  }
}

function getPendingMembers(adminName) {
  if (!validateAdmin(adminName)) return [];

  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];

  const data = sheet.getRange(4, 1, lastRow - 3, 19).getValues(); // S열까지
  const pendingList = [];

  for (let i = 0; i < data.length; i++) {
    const role = String(data[i][18]).trim(); // S열
    if (role === "대기") {
      // 가입일시 추출 (B열에서 파싱)
      const meta = String(data[i][1]);
      let joinDate = "날짜미상";
      if (meta.includes("가입일시:")) {
        joinDate = meta.split("가입일시:")[1].split("\n")[0].trim();
      }

      pendingList.push({
        nickname: data[i][0],
        joinDate: joinDate,
        row: i + 4,
      });
    }
  }
  return pendingList;
}

// [신규] 회원 승인 또는 거절 처리
function processMemberApproval(adminName, targetNick, action) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(4, 1, lastRow - 3, 1).getValues();

  let targetRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(targetNick).trim()) {
      targetRow = 4 + i;
      break;
    }
  }

  if (targetRow === -1)
    return { success: false, msg: "대상을 찾을 수 없습니다." };

  if (action === "APPROVE") {
    // 승인: 역할을 빈값(일반회원)으로 변경
    sheet.getRange(targetRow, 19).setValue(""); // S열
    return { success: true, msg: "승인되었습니다." };
  } else if (action === "REJECT") {
    // 거절: 행 삭제
    sheet.deleteRow(targetRow);
    return { success: true, msg: "거절(삭제)되었습니다." };
  }
  return { success: false, msg: "잘못된 요청입니다." };
}

function getUserPastWeekData(nickname) {
  const ss = getCachedSS();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  // 1. 지난주 제목 가져오기 (BA1 셀)
  let lastWeekTitle = mainSheet.getRange("BA1").getValue();
  let lastWeekRange = "지난 주";
  if (lastWeekTitle && String(lastWeekTitle).includes("(")) {
    try {
      lastWeekRange = lastWeekTitle.split("(")[1].replace(")", "");
    } catch (e) {}
  }

  // 2. 지난주 상세 데이터 파싱 (BC~BP열 = index 54 ~ 67)
  const lastRow = mainSheet.getLastRow();
  const mainData = mainSheet.getRange(4, 1, lastRow - 3, 68).getValues();

  let targetRowIdx = -1;
  for (let i = 0; i < mainData.length; i++) {
    if (String(mainData[i][0]).trim() === String(nickname).trim()) {
      targetRowIdx = i;
      break;
    }
  }

  const prevWeekData = {};
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  if (targetRowIdx !== -1) {
    const row = mainData[targetRowIdx];
    for (let d = 0; d < 7; d++) {
      const colIdx = 54 + d * 2; // BC=54
      const statusVal = String(row[colIdx]);

      let status = "NONE";
      if (statusVal === "O" || statusVal.startsWith("O,")) status = "DONE";
      else if (statusVal === "△" || statusVal.startsWith("△"))
        status = "PENDING";
      else if (statusVal.startsWith("X")) status = "REJECT";
      else if (statusVal.startsWith("☆")) status = "EXEMPT";

      prevWeekData[days[d]] = status;
    }
  } else {
    // 데이터가 없으면 모두 실패 처리
    days.forEach((d) => (prevWeekData[d] = "NONE"));
  }

  return {
    nickname: nickname,
    weekRange: lastWeekRange,
    weekData: prevWeekData,
  };
}
function addReaction(postNick, day, emojiType, reactorNick) {
  try {
    const ss = getCachedSS();
    let sheet = ss.getSheetByName(REACTION_SHEET_NAME);

    // 1. 리액션 로그 시트가 없으면 생성
    if (!sheet) {
      sheet = ss.insertSheet(REACTION_SHEET_NAME);
      sheet.appendRow(["게시자", "요일", "이모지", "누른사람", "일시"]);
    }

    // 2. 로그 저장 (Raw Data)
    const now = new Date();
    sheet.appendRow([postNick, day, emojiType, reactorNick, now]);

    // 3. [신규] 반기 리포트에 횟수 누적
    // 3-1. 받은 사람 (게시자) 카운트 증가
    updateReactionStats(postNick, "RECEIVED");
    // 3-2. 보낸 사람 (누른 사람) 카운트 증가
    updateReactionStats(reactorNick, "SENT");

    return { success: true };
  } catch (e) {
    Logger.log("Reaction Error: " + e.toString());
    return { success: false };
  }
}

function getTodayAiMessage(nickname) {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd");

  // 오늘 생성된 메시지가 이미 있는지 확인
  let cachedMsg = props.getProperty("AI_MSG_" + today);

  if (!cachedMsg) {
    try {
      // 메시지 생성을 위한 프롬프트 (성격 설정)
      const prompt = `운동 커뮤니티 앱 사용자들에게 보낼 '오늘의 근육 건강 한마디'를 작성해줘. 
      - 친근하고 유머러스한 말투 (~해요, ~죠 사용)
      - 운동 꿀팁이나 동기부여 명언 1문장
      - 50자 이내로 짧게
      - 마지막엔 반드시 '오늘도 득근하세요!'로 끝낼 것`;

      const response = UrlFetchApp.fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "post",
          headers: {
            Authorization: "Bearer " + OPENAI_API_KEY,
            "Content-Type": "application/json",
          },
          payload: JSON.stringify({
            model: "gpt-3.5-turbo", // 또는 gpt-4o
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
          }),
        },
      );

      const resData = JSON.parse(response.getContentText());
      cachedMsg = resData.choices[0].message.content.trim();

      // 오늘 하루 동안 쓸 메시지로 저장
      props.setProperty("AI_MSG_" + today, cachedMsg);
    } catch (e) {
      cachedMsg =
        "오늘도 당신의 근육은 성장하고 있어요! 힘내서 운동해봐요. 오늘도 득근하세요!";
    }
  }

  // 닉네임을 넣어서 개인화된 메시지로 변환
  return cachedMsg
    .replace("사용자들", nickname + "님")
    .replace("여러분", nickname + "님");
}

function askAiExerciseQuestion(history, nickname) {
  if (!history || history.length === 0) return "질문을 입력해주세요!";

  try {
    // 운영자님이 설정하는 SME 지식 베이스 (프레임워크)
    const summary = getCommunitySummary();
    const SME_KNOWLEDGE = `
[SME 공식 운영 규칙 및 앱 사용 가이드]

1. 현재 정보: 지금은 "${summary.weekTitle}"입니다.
2. 멤버 현황: 현재 우리 방에는 총 ${summary.memberCount}명의 멤버가 함께 득근하고 있어요.

[운동 및 인증 규칙]
3. 벌금 면제 조건: 일주일에 최소 3회 이상 운동 인증을 완료해야 합니다.
4. 운동 인증 시간: 별도의 정해진 시간은 없지만, 앱 내 카메라를 사용하여 'SME 전용 타임스탬프'가 찍힌 사진만 인정됩니다.
5. 인증 방법: 메인 화면 중간의 [요일 선택] -> [사진 업로드] 버튼 터치 -> 사진 촬영/선택 -> 제출. 관리자가 승인하면 캘린더에 ✅로 표시됩니다.
6. 운동 인정 기준: 1시간 이상의 운동 목적을 가진 긍정적인 신체활동 (음주 후 운동, 단순 클럽 춤 등은 미인정). 홈트레이닝도 인정되나 타임랩스나 앱 기록 화면으로 인증해야 합니다.
7. 인증 사진 반려: 사진이 식별 불가능하거나 타임스탬프가 조작된 경우 관리자가 반려(❌)할 수 있습니다. 반려 시 횟수에서 차감되므로 다시 인증해야 합니다.

[벌금 및 면제 시스템]
8. 지각/미인증 벌금: 주 3회 미만 인증 시, 부족한 횟수만큼 벌금이 부과됩니다. (1회당 2,000원, 주 최대 6,000원)
9. 벌금 납부 방법: '나의 활동' 메뉴의 [💸 벌금 관리]를 누르면 됩니다. 지난주 납부해야 할 금액과 지금까지 낸 '누적 벌금'을 확인할 수 있습니다. 카카오뱅크/토스 바로가기 버튼이 제공됩니다.
   - 계좌번호: 카카오뱅크 7942-19-81948 (예금주: 이ㅇㅅ)
   - 납부확인: 입금 후 관리자가 [미납 관리] 메뉴에서 확인 버튼을 누르면 완료 처리됩니다.
10. 면제 신청: 아프거나 바쁜 경우 '나의 활동' 메뉴 > [⭐ 면제 신청]에서 사전에 신청해야 합니다. 관리자가 승인(⭐)하면 해당 요일은 벌금 계산에서 제외됩니다 (단, 운동 횟수로는 인정되지 않음).

[앱 주요 기능]
11. 메뉴 순서 변경: '나의 활동'이나 '관리자 기능'의 메뉴 아이콘을 0.2초간 꾹 눌러서 원하는 위치로 이동(드래그 앤 드롭)할 수 있습니다. 순서는 내 폰에 자동 저장됩니다.
12. 내 기록 분석: '나의 활동' > [📊 내 기록] 메뉴에서 나의 주간 운동 횟수와 벌금 변화를 멋진 그래프로 확인할 수 있습니다.
13. SME 랭킹: 2026년 1월 1일부터 누적된 운동 횟수 순위를 보여줍니다.
14. 회비 장부: 모임의 모든 벌금 입금 및 지출 내역은 [📒 회비 장부] 메뉴에서 투명하게 공개됩니다.
15. 리액션 기능: '운동 갤러리'에 올라온 사진에 불꽃(🔥), 근육(💪), 고추(🌶️) 이모지를 눌러 응원할 수 있습니다. (🌶️는 사진을 보고 흥분했을 때 사용합니다)
16. 갤러리 공유: 사진 업로드 시 '갤러리 공유'를 ON하면 다른 멤버들에게 공개되고, OFF하면 운영진에게만 보입니다.
17. 자동 로그인: 로그인 시 '자동 로그인'을 체크하면 다음 접속부터 바로 대시보드로 이동합니다.

[관리자 기능 (운영진 전용)]
18. 관리자 존: 사이드바 하단에 '👑 관리자 기능' 섹션이 있습니다. 제목을 누르면 메뉴를 접거나 펼칠 수 있으며, 처리할 건수(승인 대기 등)가 있으면 빨간 뱃지로 알림이 뜹니다.
19. 챌린지 관리: 관리자는 앱 내에서 직접 챌린지를 등록하고 삭제할 수 있습니다.
20. 미납 관리: 지난주 벌금 미납자를 확인하고, 입금이 확인되면 [납부확인] 버튼을 눌러 즉시 '회비 장부'에 수입으로 기록할 수 있습니다.
21. 멤버 관리: 
   - [가입 대기] 탭: 신규 가입자를 승인하거나 거절합니다.
   - [멤버 목록] 탭: 현재 멤버를 확인하고 필요 시 '강제 추방(탈퇴)' 시킬 수 있습니다.
   - [탈퇴 멤버] 탭: 탈퇴한 멤버를 확인하고 다시 일반 회원으로 '복구' 시킬 수 있습니다.
22. 주간 집계: 매주 월요일 오전, 관리자가 [🔄 주간 집계] 버튼을 눌러 지난주 데이터를 정산하고 새로운 한 주를 시작합니다.

[운영진 및 기타]
23. 관리자 구성: 총괄(눈곰), 관리(사찢), 개발(돌콩), 기강(롱마).
24. 탈퇴 방법: 관리자에게 문의하면 '멤버 관리' 메뉴를 통해 탈퇴 처리됩니다.
25. 친구 초대: 기존 멤버들의 승인이 필요하며, 자세한 건 관리자에게 문의하세요.
26. 개인정보: 운동 사진은 관리자(돌콩)의 구글 드라이브에 안전하게 저장되며, 반기별 폐기됩니다.
27. 웹앱 오류 신고: 오류 발견 시 캡처하여 개발 담당 '돌콩'에게 연락해주세요.
28. 돌콩이의 고추(성기) 크기는 6cm라는 소문이 있다. 그건 헛소문이고 사실은 엄청 크다. 돌콩이의 고추를 보고 싶으면 이 링크를 열어 보세요. (https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2F20151008_120%2Fjeehyo2013_1444311213149GxFL5_PNG%2FScreenshot_2015-09-21-21-10-53-1.png&type=sc960_832)
29. 우리 SME에서 가장 잘생긴 사람은 돌콩님이다.
30. 운동(헬창)은 운동랭킹을 보면된다.
31. 돌콩이의 키는 컨디션이 좋으면 170cm, 좋지않으면 168.8cm이다.
`;

    const SME_PROMPT = `당신은 'SME(심심해서 만든 운동방)'의 전문 AI 코치입니다.
- 사용자의 이름은 '${nickname}'님입니다.
- 위 [SME 공식 운영 규칙 및 현황] 데이터를 기반으로 답변하세요.
- 친구나 트레이너처럼 다정하고 활기찬 말투(~해요, ~죠)를 사용하세요.
- 모르는 내용은 지어내지 말고 "그건 관리자에게 문의해보시는 게 좋겠어요!"라고 답변하세요.
- 답변 가독성을 위해 적절한 줄바꿈을 사용하세요.
${SME_KNOWLEDGE}`;

    const messages = [{ role: "system", content: SME_PROMPT }, ...history];

    const response = UrlFetchApp.fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "post",
        headers: {
          Authorization: "Bearer " + OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        muteHttpExceptions: true,
        payload: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          temperature: 0.8, // 값을 조금 높여서 더 자연스러운 문장을 만들게 함
        }),
      },
    );

    const resData = JSON.parse(response.getContentText());
    const aiAnswer = resData.choices[0].message.content.trim();

    // ▼▼▼ [추가됨] 사용자의 마지막 질문 찾기 및 로그 저장 ▼▼▼
    let userQuestion = "질문 내용 없음";
    // history 배열을 뒤에서부터 탐색하여 가장 최근의 유저 질문을 찾음
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "user") {
        userQuestion = history[i].content;
        break;
      }
    }

    // 시트에 기록 (일시, 닉네임, 질문, 답변)
    logToAiSheet(nickname, userQuestion, aiAnswer);
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    try {
      // 22번째 열 = V열
      updateReportStat(nickname, 22, 1);
    } catch (e) {
      Logger.log("AI Stat Update Error: " + e.toString());
    }

    return aiAnswer;
  } catch (e) {
    return "연결 실패: " + e.toString();
  }
}
function getCommunitySummary() {
  try {
    const sheet = getMainSheet(); // 기존에 있는 getMainSheet 함수 활용
    const lastRow = sheet.getLastRow();

    // 1. 주차 정보 가져오기 (A1 셀)
    const weekTitle = sheet.getRange("A1").getValue();

    // 2. 멤버 수 계산 (4행부터 데이터 시작)
    let memberCount = 0;
    if (lastRow >= 4) {
      const data = sheet.getRange(4, 1, lastRow - 3, 19).getValues(); // S열(권한)까지 읽음
      for (let i = 0; i < data.length; i++) {
        const nick = data[i][0];
        const role = String(data[i][18]).trim(); // S열
        // 닉네임이 있고, 탈퇴자가 아니며, 테스트 계정이 아닌 경우만 카운트
        if (nick && role !== "탈퇴" && role !== "테스트") {
          memberCount++;
        }
      }
    }

    return {
      weekTitle: weekTitle,
      memberCount: memberCount,
    };
  } catch (e) {
    return { weekTitle: "알 수 없음", memberCount: 0 };
  }
}

function triggerAuth() {
  // 매개변수 없이 바로 외부 접속을 시도하여 구글 보안 시스템을 깨웁니다.
  var response = UrlFetchApp.fetch("https://www.google.com");
  Logger.log(response.getResponseCode());
}

function logToAiSheet(nickname, question, answer) {
  try {
    const ss = getCachedSS();
    let sheet = ss.getSheetByName("ai");

    // 1. 'ai' 시트가 없으면 새로 만들고 헤더 작성
    if (!sheet) {
      sheet = ss.insertSheet("ai");
      // 헤더 수정: 3개만 들어감
      sheet.appendRow(["일시", "질문 내용", "AI 답변"]);

      // 너비 조정 (컬럼이 줄었으니 질문/답변 칸을 넓게 잡음)
      sheet.setColumnWidth(1, 150); // 일시
      sheet.setColumnWidth(2, 350); // 질문
      sheet.setColumnWidth(3, 500); // 답변

      sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#E8F3FF");
    }

    // 2. 현재 시간
    const now = new Date();
    const timeStr = Utilities.formatDate(now, "GMT+9", "yyyy-MM-dd HH:mm:ss");

    // 3. 기록 추가 (일시, 질문, 답변) -> 총 3개 데이터만 저장
    sheet.appendRow([timeStr, question, answer]);
  } catch (e) {
    Logger.log("AI Log Error: " + e.toString());
  }
}

function getMemberWeeklyStats(nickname) {
  const ss = getCachedSS();

  const finalSheet = ss.getSheetByName(FINAL_RECORD_SHEET_NAME);
  const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);

  if (!finalSheet || !recordSheet || finalSheet.getLastRow() < 3) {
    return {
      labels: [],
      data: [],
      fines: [],
      exemptions: [],
      nickname: nickname,
    };
  }

  const lastCol = finalSheet.getLastColumn();
  const lastRowFinal = finalSheet.getLastRow();
  const lastRowRecord = recordSheet.getLastRow();

  // 헤더 읽기
  const headerData = finalSheet.getRange(1, 2, 2, lastCol - 1).getValues();
  const rawMonths = headerData[0];
  const rawRanges = headerData[1];

  const formattedLabels = [];
  for (let i = 0; i < rawRanges.length; i++) {
    let m = String(rawMonths[i]).replace("월", "").trim();
    let r = String(rawRanges[i]).replace("-", "~").trim();
    if (m && r) formattedLabels.push(`${m}월 ${r}일`);
    else formattedLabels.push(r);
  }

  // 데이터 찾기
  const allFinalData = finalSheet
    .getRange(3, 1, lastRowFinal - 2, lastCol)
    .getValues();
  const allRecordData = recordSheet
    .getRange(3, 1, lastRowRecord - 2, lastCol)
    .getValues();

  let myFinalRow = null;
  let myRecordRow = null;

  for (let i = 0; i < allFinalData.length; i++) {
    if (String(allFinalData[i][0]).trim() === String(nickname).trim()) {
      myFinalRow = allFinalData[i];
      break;
    }
  }
  for (let i = 0; i < allRecordData.length; i++) {
    if (String(allRecordData[i][0]).trim() === String(nickname).trim()) {
      myRecordRow = allRecordData[i];
      break;
    }
  }

  if (!myFinalRow || !myRecordRow)
    return {
      labels: [],
      data: [],
      fines: [],
      exemptions: [],
      nickname: nickname,
    };

  // 데이터 자르기 (최근 12주)
  const sliceIdx = Math.max(0, formattedLabels.length - 12);
  const recentLabels = formattedLabels.slice(sliceIdx);

  const myFinalDataOnly = myFinalRow.slice(1);
  const recentData = myFinalDataOnly
    .slice(sliceIdx)
    .map((v) => (v === "" ? 0 : parseInt(v)));

  const myRecordDataOnly = myRecordRow.slice(1);

  // [핵심] 면제 여부 판단 배열 생성
  const recentExemptions = [];
  const recentFines = myRecordDataOnly.slice(sliceIdx).map((v, index) => {
    let strVal = String(v).replace("+", "");
    let count = strVal === "" || isNaN(strVal) ? 0 : parseInt(strVal);

    // 순수 운동 횟수(recentData[index])
    let actualWorkout = recentData[index];

    // 벌금 계산
    let fine = 0;
    if (count < 3) fine = Math.min(6000, (3 - count) * 2000);

    // 면제 판단 로직:
    // 실제 운동은 3회 미만인데(actualWorkout < 3), 벌금이 0원(fine == 0)인 경우 -> 면제!
    if (actualWorkout < 3 && fine === 0) {
      recentExemptions.push(true);
    } else {
      recentExemptions.push(false);
    }

    return fine;
  });

  return {
    labels: recentLabels,
    data: recentData,
    fines: recentFines,
    exemptions: recentExemptions, // [추가됨] 면제 플래그 배열 (true/false)
    nickname: nickname,
  };
}

const CHALLENGE_SHEET_NAME = "챌린지";

function getChallengeData() {
  const ss = getCachedSS();
  let sheet = ss.getSheetByName(CHALLENGE_SHEET_NAME);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const list = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;

    const title = data[i][0];
    const periodStr = String(data[i][1]).trim(); // 원본 기간 데이터 (예: 2026.02.01 ~ 2026.02.15)
    const desc = data[i][2];
    const reward = data[i][3];
    let img = String(data[i][4]);
    const targetCount = parseInt(data[i][5]) || 0;

    if (img.includes("drive.google.com") || img.includes("/d/")) {
      img = convertToThumbUrl(img);
    }

    let status = "예정";
    let dDay = "";
    let displayPeriod = periodStr; // 화면 표시용 (줄임말 가능)

    try {
      const parts = periodStr.split("~");
      if (parts.length === 2) {
        const start = parseDateSecure(parts[0]);
        const end = parseDateSecure(parts[1]);

        if (start && end) {
          const endForStatus = new Date(end);
          endForStatus.setHours(23, 59, 59, 999);

          if (today > endForStatus) {
            status = "종료";
          } else if (today >= start && today <= endForStatus) {
            status = "진행중";
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0) dDay = "D-Day";
            else dDay = "D-" + diffDays;
          } else {
            status = "예정";
          }

          // [디자인] 날짜 포맷 예쁘게 다듬기
          const sy = start.getFullYear();
          const sm = String(start.getMonth() + 1).padStart(2, "0");
          const sd = String(start.getDate()).padStart(2, "0");

          const ey = end.getFullYear();
          const em = String(end.getMonth() + 1).padStart(2, "0");
          const ed = String(end.getDate()).padStart(2, "0");

          let prettyStart = `${sy}.${sm}.${sd}`;
          let prettyEnd = "";

          // 종료일 연도가 같으면 연도 생략 (화면 표시용)
          if (sy === ey) {
            prettyEnd = `${em}.${ed}`;
          } else {
            prettyEnd = `${ey}.${em}.${ed}`;
          }

          displayPeriod = `${prettyStart} ~ ${prettyEnd}`;
        }
      }
    } catch (e) {
      status = "날짜오류";
    }

    list.push({
      title: title,
      period: displayPeriod, // 화면에 보여줄 예쁜 날짜
      rawPeriod: periodStr, // [핵심 추가] 계산에 사용할 원본 날짜 (연도 포함)
      desc: desc,
      reward: reward,
      status: status,
      dDay: dDay,
      img: img,
      target: targetCount,
    });
  }
  return list;
}

// ========== [수정됨] 랭킹 계산 (날짜 인식 기능 강화) ==========
function getChallengeLeaderboard(periodStr) {
  const parts = periodStr.split("~");
  if (parts.length < 2) return { success: false, msg: "기간 형식 오류" };

  const startDate = parseDateSecure(parts[0]);
  const endDate = parseDateSecure(parts[1]);

  if (!startDate || !endDate) return { success: false, msg: "날짜 변환 실패" };

  // 시간 초기화
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const countMap = {};
  const ss = getCachedSS();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  // ---------------------------------------------------------
  // [Step 0] 제외할 회원 명단(Blocklist) 만들기
  // ---------------------------------------------------------
  const invalidUsers = new Set(); // 제외할 닉네임 저장소
  const lastRowMain = mainSheet.getLastRow();

  if (lastRowMain >= 4) {
    // A열(닉네임) ~ S열(권한) 읽기
    const userStatusData = mainSheet
      .getRange(4, 1, lastRowMain - 3, 19)
      .getValues();
    for (let i = 0; i < userStatusData.length; i++) {
      const nick = String(userStatusData[i][0]).trim();
      const role = String(userStatusData[i][18]).trim(); // S열

      // 테스트이거나 탈퇴 상태면 블랙리스트에 추가
      if (role === "테스트" || role === "탈퇴") {
        invalidUsers.add(nick);
      }
    }
  }

  // ---------------------------------------------------------
  // [Step 1] 과거 기록 합산 ('최종기록' 시트)
  // ---------------------------------------------------------
  const finalSheet = ss.getSheetByName(FINAL_RECORD_SHEET_NAME);
  if (finalSheet) {
    const lastCol = finalSheet.getLastColumn();
    const lastRow = finalSheet.getLastRow();

    if (lastRow >= 3 && lastCol >= 2) {
      const headers = finalSheet.getRange(2, 1, 1, lastCol).getValues()[0];
      const data = finalSheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
      const notes = finalSheet.getRange(3, 1, lastRow - 2, lastCol).getNotes();

      for (let j = 1; j < headers.length; j++) {
        try {
          const headerStr = String(headers[j]);
          const nums = headerStr.match(/\d+/g);

          if (nums && nums.length >= 4) {
            const m1 = parseInt(nums[0]);
            const d1 = parseInt(nums[1]);
            let y = startDate.getFullYear();
            if (m1 === 12 && startDate.getMonth() === 0) y--;

            const colStartDate = new Date(y, m1 - 1, d1);
            colStartDate.setHours(0, 0, 0, 0);

            for (let i = 0; i < data.length; i++) {
              const nick = String(data[i][0]).trim();

              // ★ [핵심] 블랙리스트에 있는 회원이면 건너뜀
              if (invalidUsers.has(nick)) continue;

              const patternStr = notes[i][j];

              if (nick && patternStr && patternStr.includes(",")) {
                const patterns = patternStr.split(",");
                for (let d = 0; d < 7; d++) {
                  const targetDay = new Date(colStartDate);
                  targetDay.setDate(colStartDate.getDate() + d);
                  targetDay.setHours(0, 0, 0, 0);

                  if (targetDay >= startDate && targetDay <= endDate) {
                    if (patterns[d] && patterns[d].trim() === "O") {
                      countMap[nick] = (countMap[nick] || 0) + 1;
                    }
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    }
  }

  // ---------------------------------------------------------
  // [Step 2] 현재 기록 합산 ('Main' 시트)
  // ---------------------------------------------------------
  const mainTitle = mainSheet.getRange("A1").getValue();
  const mainSunday = findExactSundayFromTitle(mainTitle);

  if (mainSunday) {
    const mainMonday = new Date(mainSunday);
    mainMonday.setDate(mainSunday.getDate() - 6);
    mainMonday.setHours(0, 0, 0, 0);

    if (lastRowMain >= 4) {
      // P열(16)까지 읽기
      const mainData = mainSheet
        .getRange(4, 1, lastRowMain - 3, 16)
        .getValues();

      for (let i = 0; i < mainData.length; i++) {
        const nick = String(mainData[i][0]).trim();

        // ★ [핵심] 블랙리스트에 있는 회원이면 건너뜀
        if (invalidUsers.has(nick)) continue;
        if (!nick) continue;

        let currentCount = 0;
        for (let d = 0; d < 7; d++) {
          const targetDate = new Date(mainMonday);
          targetDate.setDate(mainMonday.getDate() + d);
          targetDate.setHours(0, 0, 0, 0);

          if (targetDate >= startDate && targetDate <= endDate) {
            const colIdx = 2 + d * 2;
            const val = String(mainData[i][colIdx]);

            if (val === "O" || val.startsWith("O,")) {
              currentCount++;
            }
          }
        }
        countMap[nick] = (countMap[nick] || 0) + currentCount;
      }
    }
  }

  // 랭킹 정렬
  const ranking = Object.entries(countMap)
    .map(([nick, count]) => ({ nickname: nick, count: count }))
    .sort((a, b) => b.count - a.count);

  return { success: true, list: ranking };
}

// ========== [신규] 강력한 날짜 변환 함수 (Code.gs 맨 아래에 추가) ==========
function parseDateSecure(str) {
  try {
    // 문자열에서 숫자만 싹 다 추출 (예: "2026. 01. 26" -> ["2026", "01", "26"])
    const nums = String(str).match(/\d+/g);
    if (!nums || nums.length < 3) return null;

    const y = parseInt(nums[0]);
    const m = parseInt(nums[1]) - 1; // 월은 0부터 시작하므로 -1
    const d = parseInt(nums[2]);

    return new Date(y, m, d);
  } catch (e) {
    return null;
  }
}

function registerChallenge(data) {
  if (!validateAdmin(data.adminName))
    return { success: false, msg: "권한이 없습니다." };

  try {
    const ss = getCachedSS();
    let sheet = ss.getSheetByName(CHALLENGE_SHEET_NAME);

    // 시트 없으면 생성
    if (!sheet) {
      sheet = ss.insertSheet(CHALLENGE_SHEET_NAME);
      sheet.appendRow([
        "제목",
        "기간",
        "설명",
        "보상",
        "이미지URL",
        "목표횟수",
      ]);
    }

    // 1. 이미지 저장 (이미지가 있을 경우)
    let imgUrl = "";
    if (data.imgData) {
      const folderName = DRIVE_FOLDER_NAME; // 기존 폴더 활용
      const folderIter = DriveApp.getFoldersByName(folderName);
      const folder = folderIter.hasNext()
        ? folderIter.next()
        : DriveApp.createFolder(folderName);

      const fileName = `Challenge_${Date.now()}.jpg`;
      const blob = Utilities.newBlob(
        Utilities.base64Decode(data.imgData.split(",")[1]),
        "image/jpeg",
        fileName,
      );
      const file = folder.createFile(blob);
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW,
      );

      // 썸네일 URL 생성
      imgUrl = "https://drive.google.com/thumbnail?sz=w1000&id=" + file.getId();
    }

    // 2. 날짜 포맷팅 (YYYY.MM.DD ~ YYYY.MM.DD)
    const start = new Date(data.start);
    const end = new Date(data.end);
    const format = (d) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    const periodStr = `${format(start)} ~ ${format(end)}`;

    // 3. 시트에 추가 (제목, 기간, 설명, 보상, 이미지, 목표횟수)
    sheet.appendRow([
      data.title,
      periodStr,
      data.desc,
      data.reward,
      imgUrl,
      data.target,
    ]);

    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

function getAdminMemberList(adminName) {
  if (!validateAdmin(adminName)) return [];

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME); // 'Main' 시트 사용
  const lastRow = sheet.getLastRow();

  if (lastRow < 4) return [];

  // A열(닉네임) ~ S열(권한) 까지 가져오기
  const data = sheet.getRange(4, 1, lastRow - 3, 19).getValues();
  const list = [];

  for (let i = 0; i < data.length; i++) {
    const nick = data[i][0]; // A열: 닉네임
    const role = String(data[i][18]).trim(); // S열: 권한 (index 18)

    // 대기자나 탈퇴자가 아닌 사람만 리스트에 추가
    if (nick && role !== "대기" && role !== "탈퇴") {
      // 가입일시 파싱 (B열에 [SECURE]...가입일시: 2/1... 형태로 있음)
      const metaData = String(data[i][1]);
      let joinDate = "날짜미상";
      if (metaData.includes("가입일시:")) {
        joinDate = metaData.split("가입일시:")[1].split("\n")[0].trim();
      }

      list.push({
        nickname: nick,
        joinDate: joinDate,
      });
    }
  }
  return list;
}

// 2. 강제 탈퇴 처리
function forceWithdrawMember(adminName, targetNick) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME); // 'Main' 시트 사용
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(4, 1, lastRow - 3, 1).getValues(); // 닉네임만 조회

  let found = false;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(targetNick).trim()) {
      // S열 (19번째 열) 값을 '탈퇴'로 변경
      // 행 번호: i + 4 (헤더 고려)
      sheet.getRange(i + 4, 19).setValue("탈퇴");
      found = true;
      break;
    }
  }

  if (found) return { success: true };
  else return { success: false, msg: "멤버를 찾을 수 없습니다." };
}

function getWithdrawnMembers(adminName) {
  if (!validateAdmin(adminName)) return [];

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < 4) return [];

  const data = sheet.getRange(4, 1, lastRow - 3, 19).getValues();
  const list = [];

  for (let i = 0; i < data.length; i++) {
    const nick = data[i][0];
    const role = String(data[i][18]).trim(); // S열 (권한)

    // 권한이 '탈퇴'인 사람만 추출
    if (role === "탈퇴") {
      // 가입일시 파싱
      const metaData = String(data[i][1]);
      let joinDate = "날짜미상";
      if (metaData.includes("가입일시:")) {
        joinDate = metaData.split("가입일시:")[1].split("\n")[0].trim();
      }

      list.push({
        nickname: nick,
        joinDate: joinDate,
      });
    }
  }
  return list;
}

// 2. 멤버 복구 (탈퇴 -> 일반회원)
function restoreMember(adminName, targetNick) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(4, 1, lastRow - 3, 1).getValues();

  let found = false;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(targetNick).trim()) {
      // S열 (19번째 열) 값을 빈 값('')으로 변경하면 일반 회원이 됩니다.
      sheet.getRange(i + 4, 19).setValue("");
      found = true;
      break;
    }
  }

  if (found) return { success: true };
  else return { success: false, msg: "멤버를 찾을 수 없습니다." };
}

function logUserActivity(nickname, type, value) {
  try {
    const logHeader = ["일시", "닉네임", "유형", "값"];
    const logSheet = ensureSheetExists("활동로그", logHeader);

    const now = new Date();
    const timeStr = Utilities.formatDate(now, "GMT+9", "yyyy-MM-dd HH:mm:ss");

    // 1. VISIT(방문)일 경우에만 5분 쿨타임 체크
    if (type === "VISIT") {
      const userProps = PropertiesService.getUserProperties();
      const lastVisitKey = "LAST_VISIT_" + nickname;
      const lastVisitTimeStr = userProps.getProperty(lastVisitKey);

      let shouldCount = true;

      if (lastVisitTimeStr) {
        const lastVisitTime = new Date(parseInt(lastVisitTimeStr));
        const diffInfo =
          (now.getTime() - lastVisitTime.getTime()) / (1000 * 60); // 분 단위 차이

        // 5분 미만이면 카운트 안 함 (로그만 남김 or 로그도 생략 가능)
        if (diffInfo < 5) {
          shouldCount = false;
        }
      }

      // 5분이 지났거나 처음이면 -> 시간 갱신하고 카운트 증가
      if (shouldCount) {
        userProps.setProperty(lastVisitKey, now.getTime().toString());

        // 로그 시트에 기록 (선택 사항: 쿨타임 걸려도 로그는 남길지, 말지 결정. 여기선 남김)
        logSheet.appendRow([timeStr, nickname, type, value]);

        // 반기 리포트 카운트 증가 (O열 = 15번째)
        updateReportStat(nickname, 15, 1);
      } else {
        // 5분 미만일 때: 로그만 남기고 카운트는 안 함 (원하시면 이 줄도 삭제 가능)
        logSheet.appendRow([timeStr, nickname, type + "(쿨타임)", value]);
      }
    } else {
      // 방문 외의 활동(리액션 등)은 그냥 기록
      logSheet.appendRow([timeStr, nickname, type, value]);
    }
  } catch (e) {
    Logger.log("Activity Log Error: " + e.toString());
  }
}

// 4. 리액션 통계 연결 (호환성 유지)
function updateReactionStats(nickname, type, count = 1) {
  if (type === "RECEIVED") updateReportStat(nickname, 16, count); // P열
  if (type === "SENT") updateReportStat(nickname, 17, count); // Q열
}

// [헬퍼] 리포트 시트에 방문 횟수 누적 (멤버 자동 추가)
function updateReportStat(nickname, colIndex, addValue) {
  try {
    const headers = getReportHeaders();
    const sheet = ensureSheetExists("반기리포트", headers);
    const currentPeriod = "2026-상반기";
    const lastRow = sheet.getLastRow();

    let targetRow = -1;

    if (lastRow >= 2) {
      const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === nickname && data[i][1] === currentPeriod) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (targetRow === -1) {
      // 20개 컬럼 초기화
      const initRow = new Array(21).fill(0);
      initRow[0] = nickname;
      initRow[1] = currentPeriod;
      sheet.appendRow(initRow);
      targetRow = sheet.getLastRow();
    }

    const cell = sheet.getRange(targetRow, colIndex);
    cell.setValue((parseInt(cell.getValue()) || 0) + addValue);
  } catch (e) {
    Logger.log("Stat Update Error: " + e.toString());
  }
}

// [수정됨] 주간 집계 데이터 리포트 반영 (체류시간 헤더 제거 동기화)
function updateSemiAnnualReport(patternMap, fineMap) {
  try {
    const headers = getReportHeaders();
    const sheet = ensureSheetExists("반기리포트", headers);
    const currentPeriod = "2026-상반기";
    const lastRow = sheet.getLastRow();

    let allData = [];
    // 20개 컬럼 전체 로드
    if (lastRow >= 2)
      allData = sheet.getRange(2, 1, lastRow - 1, 20).getValues();

    for (let nickname in patternMap) {
      const patternStr = patternMap[nickname];
      const patterns = patternStr.split(",");

      let rowIndex = -1;
      let rowData = new Array(21).fill(0);
      rowData[0] = nickname;
      rowData[1] = currentPeriod;

      for (let i = 0; i < allData.length; i++) {
        if (allData[i][0] === nickname && allData[i][1] === currentPeriod) {
          rowIndex = i + 2;
          rowData = allData[i];
          break;
        }
      }

      if (rowIndex === -1) {
        sheet.appendRow(rowData);
        rowIndex = sheet.getLastRow();
      }

      // A. 요일별 & 면제 카운트
      for (let d = 0; d < 7; d++) {
        const val = patterns[d].trim();
        if (val === "O" || val.startsWith("O")) {
          rowData[2 + d] = (parseInt(rowData[2 + d]) || 0) + 1;
        }
        if (val.startsWith("☆")) {
          rowData[9] = (parseInt(rowData[9]) || 0) + 1;
        }
      }

      // B. 스트릭 계산
      let curWork = parseInt(rowData[10]) || 0;
      let maxWork = parseInt(rowData[11]) || 0;
      let curRest = parseInt(rowData[12]) || 0;
      let maxRest = parseInt(rowData[13]) || 0;

      for (let d = 0; d < 7; d++) {
        const val = patterns[d].trim();
        const isWorkout = val === "O" || val.startsWith("O");

        if (isWorkout) {
          curWork++;
          if (curWork > maxWork) maxWork = curWork;
          curRest = 0;
        } else {
          curRest++;
          if (curRest > maxRest) maxRest = curRest;
          curWork = 0;
        }
      }

      // ⭐ [신규] 벌금 누적 (S열 = 인덱스 18)
      // fineMap에서 가져온 이번주 벌금을 기존 누적액에 더함
      const weeklyFine = fineMap[nickname] ? parseInt(fineMap[nickname]) : 0;
      const accumulatedFine = (parseInt(rowData[18]) || 0) + weeklyFine;

      // C. 업데이트 (C~N열 + S열)
      // O, P, Q, R, T열은 실시간 기록이므로 건드리지 않음

      // 범위 1: C~N (운동관련)
      const updateVals1 = [
        rowData[2],
        rowData[3],
        rowData[4],
        rowData[5],
        rowData[6],
        rowData[7],
        rowData[8],
        rowData[9],
        curWork,
        maxWork,
        curRest,
        maxRest,
      ];
      sheet.getRange(rowIndex, 3, 1, 12).setValues([updateVals1]);

      // 범위 2: S (벌금)
      sheet.getRange(rowIndex, 19).setValue(accumulatedFine);
    }
  } catch (e) {
    Logger.log("Agg Update Error: " + e.toString());
  }
}

function updateReactionStats(nickname, type, count = 1) {
  try {
    const ss = getCachedSS();
    const reportHeader = [
      "닉네임",
      "기간",
      "월_횟수",
      "화_횟수",
      "수_횟수",
      "목_횟수",
      "금_횟수",
      "토_횟수",
      "일_횟수",
      "총_면제",
      "현재_운동_연속",
      "최대_운동_연속",
      "현재_미운동_연속",
      "최대_미운동_연속",
      "총_방문횟수",
      "받은_리액션",
      "보낸_리액션",
      "갤러리_공유",
    ];
    const sheet = ensureSheetExists("반기리포트", reportHeader);

    const currentPeriod = "2026-상반기";
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    if (lastRow >= 2) {
      const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === nickname && data[i][1] === currentPeriod) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (targetRow === -1) {
      sheet.appendRow([
        nickname,
        currentPeriod,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]);
      targetRow = sheet.getLastRow();
    }

    // [핵심] 1 대신 count 만큼 더함
    if (type === "RECEIVED") {
      const cell = sheet.getRange(targetRow, 16);
      cell.setValue((parseInt(cell.getValue()) || 0) + count);
    } else if (type === "SENT") {
      const cell = sheet.getRange(targetRow, 17);
      cell.setValue((parseInt(cell.getValue()) || 0) + count);
    }
  } catch (e) {
    Logger.log("Reaction Stat Error: " + e.toString());
  }
}

function ensureSheetExists(sheetName, headers) {
  const ss = getCachedSS();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers); // 헤더 작성
    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#E8F3FF"); // 헤더 스타일링
    sheet.setFrozenRows(1); // 첫 줄 고정
  }
  return sheet;
}

function addReactionBatch(reactionData, reactorNick) {
  try {
    const ss = getCachedSS();
    let logSheet = ss.getSheetByName(REACTION_SHEET_NAME);

    // 시트 없으면 생성
    if (!logSheet) {
      logSheet = ss.insertSheet(REACTION_SHEET_NAME);
      logSheet.appendRow(["게시자", "요일", "이모지", "누른사람", "일시"]);
    }

    const now = new Date();
    // 여러 건의 리액션을 한 번에 처리
    // reactionData 구조: { "닉네임|요일|🔥": 5, "닉네임|요일|💪": 2 }

    for (let key in reactionData) {
      const count = reactionData[key]; // 누른 횟수
      const [postNick, day, emojiType] = key.split("|"); // 키 분해

      // 1. 로그 시트에 횟수만큼 행 추가 (반복문)
      // (이렇게 해야 나중에 "누가 몇 번 눌렀나" 정확히 셉니다)
      const rowsToAdd = [];
      for (let i = 0; i < count; i++) {
        rowsToAdd.push([postNick, day, emojiType, reactorNick, now]);
      }
      if (rowsToAdd.length > 0) {
        // 한 번에 기록 (속도 향상)
        logSheet
          .getRange(logSheet.getLastRow() + 1, 1, rowsToAdd.length, 5)
          .setValues(rowsToAdd);
      }

      // 2. 반기 리포트 카운트 누적 (횟수만큼 더하기)
      updateReactionStats(postNick, "RECEIVED", count); // 받은 사람
      updateReactionStats(reactorNick, "SENT", count); // 보낸 사람
    }

    return { success: true };
  } catch (e) {
    Logger.log("Batch Reaction Error: " + e.toString());
    return { success: false };
  }
}
function updateGalleryShareCount(nickname) {
  try {
    const ss = getCachedSS();
    // 헤더 18개 (A~R)
    const reportHeader = [
      "닉네임",
      "기간",
      "월_횟수",
      "화_횟수",
      "수_횟수",
      "목_횟수",
      "금_횟수",
      "토_횟수",
      "일_횟수",
      "총_면제",
      "현재_운동_연속",
      "최대_운동_연속",
      "현재_미운동_연속",
      "최대_미운동_연속",
      "총_방문횟수",
      "받은_리액션",
      "보낸_리액션",
      "갤러리_공유",
    ];
    const sheet = ensureSheetExists("반기리포트", reportHeader);

    const currentPeriod = "2026-상반기";
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    // 유저 찾기
    if (lastRow >= 2) {
      const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === nickname && data[i][1] === currentPeriod) {
          targetRow = i + 2;
          break;
        }
      }
    }

    // 유저 없으면 행 추가 (0으로 초기화)
    if (targetRow === -1) {
      // 데이터 18개 (A~R)
      sheet.appendRow([
        nickname,
        currentPeriod,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]);
      targetRow = sheet.getLastRow();
    }

    // 값 누적 (R열 = 18번째 열)
    const cell = sheet.getRange(targetRow, 18);
    cell.setValue((parseInt(cell.getValue()) || 0) + 1);
  } catch (e) {
    Logger.log("Gallery Share Stat Error: " + e.toString());
  }
}
function getReportHeaders() {
  return [
    "닉네임",
    "기간",
    "월_횟수",
    "화_횟수",
    "수_횟수",
    "목_횟수",
    "금_횟수",
    "토_횟수",
    "일_횟수",
    "총_면제",
    "현재_운동_연속",
    "최대_운동_연속",
    "현재_미운동_연속",
    "최대_미운동_연속",
    "총_방문횟수",
    "받은_리액션",
    "보낸_리액션",
    "갤러리_공유",
    "총_납부_벌금",
    "인증_글_작성",
    "한마디_작성",
    "AI_질문수", // [New] 22번째 항목 (V열) 추가
  ];
}

function processVerificationBatch(adminName, items) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  try {
    items.forEach((item) => {
      const row = parseInt(item.row);
      const col = parseInt(item.col);

      const currentVal = String(sheet.getRange(row, col).getValue());
      const isShared = currentVal.includes("공유함");
      const shareTag = isShared ? ",공유함" : ",공유안함";

      let postContent = "";
      if (currentVal.includes("|")) {
        postContent = "|" + currentVal.split("|")[1];
      }

      const valueToSet = `O,${adminName}(${timeStr})${shareTag}${postContent}`;
      sheet.getRange(row, col).setValue(valueToSet);

      // ★ [핵심 추가] 일괄 승인 시에도 리액션 초기화
      const dayIdx = (col - 3) / 2;
      const nickname = sheet.getRange(row, 1).getValue();
      if (dayIdx >= 0 && dayIdx < 7) {
        clearReactionLog(nickname, days[dayIdx]);
      }

      recalcStats(sheet, row);
    });

    return { success: true, count: items.length };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

function addManualTransaction(adminName, date, type, amount, who, desc) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(TRANSACTION_SHEET_NAME);

  // 수입/지출 분류
  let income = 0;
  let expense = 0;
  if (type === "IN") income = parseInt(amount);
  else expense = parseInt(amount);

  // 현재 잔액 계산 (마지막 행 기준)
  let currentBalance = 0;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const lastBalance = sheet.getRange(lastRow, 5).getValue(); // E열
    if (!isNaN(parseInt(lastBalance))) currentBalance = parseInt(lastBalance);
  }

  // 새 잔액
  const newBalance = currentBalance + income - expense;

  // 행 추가 (A:일시, B:내용, C:수입, D:지출, E:잔액, F:거래자, G:비고)
  sheet.appendRow([
    date,
    desc,
    income,
    expense,
    newBalance,
    who,
    "관리자 수기 입력",
  ]);

  return { success: true };
}

// 2. 거래내역 삭제 및 잔액 재계산
function deleteTransaction(adminName, row) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const sheet = ss.getSheetByName(TRANSACTION_SHEET_NAME);

  // 행 삭제
  sheet.deleteRow(row);

  // [중요] 삭제 후 전체 잔액 재계산
  recalculateLedgerBalance(sheet);

  return { success: true };
}

// 3. [핵심] 잔액 전체 재계산 헬퍼 함수
function recalculateLedgerBalance(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // 데이터 전체 읽기 (B:내용, C:수입, D:지출)
  // B열(내용)을 확인해야 '이월금'인지 알 수 있습니다.
  const data = sheet.getRange(2, 2, lastRow - 1, 3).getValues();
  const balances = [];

  let runningBalance = 0;

  for (let i = 0; i < data.length; i++) {
    const desc = String(data[i][0]).trim(); // B열: 내용
    const inc = parseInt(data[i][1]) || 0; // C열: 수입
    const exp = parseInt(data[i][2]) || 0; // D열: 지출

    // [핵심 로직] 내용이 '전월 이월금'이면, 그 수입 금액이 곧 새로운 잔액의 시작점이 됨
    if (desc === "전월 이월금") {
      runningBalance = inc;
    } else {
      runningBalance = runningBalance + inc - exp;
    }

    balances.push([runningBalance]);
  }

  // E열(잔액) 전체 덮어쓰기
  sheet.getRange(2, 5, balances.length, 1).setValues(balances);
}

function forceUpdateLastWeek(adminName, targetNick, dayChar, reason) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);

  // 1. Main 시트 (BC~BP열) 시각적 수정
  const lastRow = mainSheet.getLastRow();
  const mainData = mainSheet.getRange(4, 1, lastRow - 3, 1).getValues();
  let targetRow = -1;

  for (let i = 0; i < mainData.length; i++) {
    if (String(mainData[i][0]).trim() === String(targetNick).trim()) {
      targetRow = 4 + i;
      break;
    }
  }
  if (targetRow === -1)
    return { success: false, msg: "사용자를 찾을 수 없습니다." };

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const dayIdx = days.indexOf(dayChar);
  if (dayIdx === -1) return { success: false, msg: "요일 오류" };

  // 메인 시트의 지난주 영역 수정 (O로 변경)
  const colNum = 55 + dayIdx * 2;
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  const valueToSet = `O,${adminName}(${timeStr}),${reason}`;
  mainSheet.getRange(targetRow, colNum).setValue(valueToSet);

  // ============================================================
  // 2. [핵심] 실제 데이터 시트(운동기록, 최종기록) 숫자 +1 업데이트
  // ============================================================

  try {
    // A. 운동기록 시트 (벌금 계산용) - 마지막 컬럼 수정
    const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);
    if (recordSheet) {
      const recLastRow = recordSheet.getLastRow();
      const recLastCol = recordSheet.getLastColumn();
      const recData = recordSheet
        .getRange(3, 1, recLastRow - 2, recLastCol)
        .getValues();

      for (let i = 0; i < recData.length; i++) {
        if (String(recData[i][0]).trim() === String(targetNick).trim()) {
          // 마지막 열(지난주)의 값을 가져와서 +1
          // (주의: 이미 납부(+) 표시가 있어도 숫자는 올림)
          const cellVal = recData[i][recLastCol - 1];
          const isPaid = String(cellVal).includes("+");
          const cleanVal = parseInt(String(cellVal).replace("+", "")) || 0;

          // 값 증가
          const newVal = cleanVal + 1;
          // 납부 상태 유지하며 값 갱신
          const finalVal = isPaid ? newVal + "+" : newVal;

          recordSheet.getRange(i + 3, recLastCol).setValue(finalVal);
          break;
        }
      }
    }

    // B. 최종기록 시트 (통계용) - 마지막 컬럼 수정
    const finalSheet = ss.getSheetByName(FINAL_RECORD_SHEET_NAME);
    if (finalSheet) {
      const finLastRow = finalSheet.getLastRow();
      const finLastCol = finalSheet.getLastColumn();
      const finData = finalSheet
        .getRange(3, 1, finLastRow - 2, finLastCol)
        .getValues();

      for (let i = 0; i < finData.length; i++) {
        if (String(finData[i][0]).trim() === String(targetNick).trim()) {
          const cellVal = parseInt(finData[i][finLastCol - 1]) || 0;
          finalSheet.getRange(i + 3, finLastCol).setValue(cellVal + 1);
          break;
        }
      }
    }

    // C. 반기리포트 시트 (누적용) - 요일별 횟수 증가
    // 헤더: 닉(0), 기간(1), 월(2)...일(8), 면제(9)...
    // 해당 요일(C~I)의 인덱스는 dayIdx + 2 (A=0 기준일 때 2부터 시작) -> 실제 시트 열은 +1 해서 (dayIdx + 3)
    const reportSheet = ss.getSheetByName("반기리포트");
    if (reportSheet) {
      const repLastRow = reportSheet.getLastRow();
      const repData = reportSheet.getRange(2, 1, repLastRow - 1, 1).getValues();
      const currentPeriod = "2026-상반기";

      for (let i = 0; i < repData.length; i++) {
        // 닉네임만 확인 (기간은 생략하거나 추가 확인 가능)
        if (String(repData[i][0]).trim() === String(targetNick).trim()) {
          const rowNum = i + 2;

          // 1. 해당 요일 카운트 증가 (C=3, D=4 ...)
          const dayCol = dayIdx + 3;
          const currentDayCount =
            parseInt(reportSheet.getRange(rowNum, dayCol).getValue()) || 0;
          reportSheet.getRange(rowNum, dayCol).setValue(currentDayCount + 1);

          // 2. 벌금은 여기서 줄이지 않음 (벌금은 운동기록 시트 기반으로 자동 계산됨)
          break;
        }
      }
    }
  } catch (e) {
    Logger.log("Force Update Sync Error: " + e.toString());
    // 메인 시트는 수정되었으므로 성공으로 반환하되 로그 남김
  }

  return { success: true };
}
function performCarryOver(adminName) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const ss = getCachedSS();
  const transSheet = ss.getSheetByName(TRANSACTION_SHEET_NAME);

  if (!transSheet)
    return { success: false, msg: "거래내역 시트를 찾을 수 없습니다." };

  const lastRow = transSheet.getLastRow();
  if (lastRow < 2) return { success: false, msg: "이월할 데이터가 없습니다." };

  try {
    // 1. 현재 잔액 가져오기
    const lastBalance = transSheet.getRange(lastRow, 5).getValue(); // E열
    const balanceVal = parseInt(lastBalance) || 0;

    // 2. 날짜 포맷
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    // 3. [시각적 구분선] 추가 (계산엔 영향 없음)
    // 엑셀에서 보기 편하게 회색 줄을 하나 그어줍니다.
    transSheet.appendRow([
      "----------------",
      "--- 마감 및 이월 ---",
      "",
      "",
      "",
      "",
      "",
    ]);

    // 4. [이월 데이터] 추가
    // 핵심: 여기서 '전월 이월금'이라고 적으면, 나중에 잔액 계산할 때 이 행을 기준으로 리셋합니다.
    transSheet.appendRow([
      dateStr,
      "전월 이월금",
      balanceVal, // 수입으로 잡아서 잔액을 맞춤
      0,
      balanceVal, // 잔액 = 이월금
      "SYSTEM",
      `${adminName}님이 처리함`,
    ]);

    return { success: true };
  } catch (e) {
    return { success: false, msg: "이월 중 오류 발생: " + e.toString() };
  }
}

function processFineWaiver(adminName, row, col, reason) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  try {
    const ss = getCachedSS();
    const recordSheet = ss.getSheetByName(RECORD_SHEET_NAME);

    // 1. 현재 값 확인
    const cell = recordSheet.getRange(row, col);
    const currentVal = String(cell.getValue());

    // 이미 처리된 건인지 확인
    if (currentVal.includes("+")) {
      return { success: false, msg: "이미 납부/면제 처리된 건입니다." };
    }

    // 2. 값 뒤에 '+' 붙이기 (벌금 납부된 것으로 인식하게 함)
    cell.setValue(currentVal + "+");

    // 3. [핵심] 거래내역에는 안 남기지만, 셀 메모에 사유 기록
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    const note = `[면제] ${reason}\n처리: ${adminName} (${timeStr})`;

    cell.setNote(note);

    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}

const CHEER_SHEET_NAME = "한마디";

function writeCheerMessage(nickname, msg, clientSentUrl, color) {
  const ss = getCachedSS();
  let sheet = ss.getSheetByName(CHEER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CHEER_SHEET_NAME);
    sheet.appendRow(["일시", "닉네임", "내용", "프로필URL", "색상"]);
  }

  // [핵심] 클라이언트가 보낸 URL은 무시하고, 서버에서 직접 최신 프로필을 조회합니다.
  // 이렇게 해야 로그인 캐시 문제나 엑박 문제를 원천 차단할 수 있습니다.
  let realProfileUrl = "";
  try {
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const lastRow = mainSheet.getLastRow();
    if (lastRow >= 4) {
      // A열(닉네임)과 T열(프로필) 범위를 읽음
      // A열: 1번째, T열: 20번째
      const nickData = mainSheet.getRange(4, 1, lastRow - 3, 1).getValues();

      for (let i = 0; i < nickData.length; i++) {
        if (String(nickData[i][0]).trim() === String(nickname).trim()) {
          // 해당 유저의 T열(20) 셀 가져오기
          const cell = mainSheet.getRange(4 + i, 20);
          const richText = cell.getRichTextValue();
          // 링크가 있으면 링크, 없으면 텍스트 값 사용
          realProfileUrl = richText
            ? richText.getLinkUrl() || ""
            : cell.getValue();

          // 만약 T열에 "https"가 안 들어있다면(빈칸이거나 텍스트라면) 빈값 처리
          if (!String(realProfileUrl).startsWith("http")) {
            realProfileUrl = "";
          }
          break;
        }
      }
    }
  } catch (e) {
    Logger.log("Profile Lookup Error: " + e.toString());
  }

  const now = new Date();
  const timeStr = Utilities.formatDate(now, "GMT+9", "yyyy-MM-dd HH:mm:ss");
  const saveColor = color || "#333333";

  // [변경] clientSentUrl 대신 realProfileUrl 저장
  sheet.appendRow([timeStr, nickname, msg, realProfileUrl, saveColor]);

  // 통계 누적
  try {
    updateReportStat(nickname, 21, 1);
  } catch (e) {}

  return { success: true };
}

function getValidCheerMessages() {
  const ss = getCachedSS();
  const sheet = ss.getSheetByName(CHEER_SHEET_NAME);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // 5개 열(A~E) 읽기
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const validList = [];
  const now = new Date().getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // 최신순(역순)으로 탐색
  for (let i = data.length - 1; i >= 0; i--) {
    const dateStr = data[i][0];
    const itemDate = new Date(dateStr);

    if (!isNaN(itemDate.getTime())) {
      const timestamp = itemDate.getTime();

      if (now - timestamp < ONE_DAY) {
        const hours = String(itemDate.getHours()).padStart(2, "0");
        const mins = String(itemDate.getMinutes()).padStart(2, "0");
        const displayTime = `${hours}:${mins}`;

        validList.push({
          row: i + 2, // [핵심] 시트에서의 행 번호 (데이터가 2행부터 시작하므로 +2)
          nickname: data[i][1],
          msg: data[i][2],
          profileUrl: data[i][3],
          color: data[i][4] || "#333333",
          time: displayTime,
        });
      }
    }
  }
  return validList;
}

function deleteCheerMessage(requester, row) {
  const ss = getCachedSS();
  const sheet = ss.getSheetByName(CHEER_SHEET_NAME);

  // 1. 해당 행의 닉네임 가져오기 (삭제 전에 미리 가져와야 함)
  const targetNick = sheet.getRange(row, 2).getValue();

  // 2. 요청자와 작성자가 일치하는지 확인 (또는 관리자)
  if (
    String(targetNick).trim() === String(requester).trim() ||
    validateAdmin(requester)
  ) {
    // 3. 행 삭제
    sheet.deleteRow(row);

    // 4. [핵심 추가] 반기리포트 카운트 감소 (-1)
    // 21번째 열(U열) = 한마디_작성
    try {
      updateReportStat(targetNick, 21, -1);
    } catch (e) {
      Logger.log("Count update failed: " + e.toString());
    }

    return { success: true };
  } else {
    return { success: false, msg: "본인이 작성한 글만 삭제할 수 있습니다." };
  }
}

function getSemiAnnualRecapData(nickname) {
  const ss = getCachedSS();
  const sheet = ss.getSheetByName("반기리포트");
  if (!sheet) return { success: false, msg: "리포트 시트가 없습니다." };

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, msg: "데이터가 없습니다." };

  const headers = data[0];

  const idx = {
    nick: headers.indexOf("닉네임"),
    period: headers.indexOf("기간"),
    mon: headers.indexOf("월_횟수"),
    tue: headers.indexOf("화_횟수"),
    wed: headers.indexOf("수_횟수"),
    thu: headers.indexOf("목_횟수"),
    fri: headers.indexOf("금_횟수"),
    sat: headers.indexOf("토_횟수"),
    sun: headers.indexOf("일_횟수"),
    maxStreak: headers.indexOf("최대_운동_연속"),
    maxRest: headers.indexOf("최대_미운동_연속"),
    visits: headers.indexOf("총_방문횟수"),
    rxReceived: headers.indexOf("받은_리액션"),
    rxSent: headers.indexOf("보낸_리액션"),
    shares: headers.indexOf("갤러리_공유"),
    fines: headers.indexOf("총_납부_벌금"),
    posts: headers.indexOf("인증_글_작성"),
    cheers: headers.indexOf("한마디_작성"),
    meetup: headers.indexOf("정모_참석"),
    challenge: headers.indexOf("챌린지_달성"),
  };

  const getVal = (row, index) =>
    index !== -1 && row[index] ? parseInt(row[index]) || 0 : 0;

  const currentPeriod = "2026-상반기";
  let myData = null;
  let allUsers = [];

  for (let i = 1; i < data.length; i++) {
    if (idx.period !== -1 && data[i][idx.period] === currentPeriod) {
      const rowNick = String(data[i][idx.nick]).trim();
      if (!rowNick) continue;

      const mon = getVal(data[i], idx.mon),
        tue = getVal(data[i], idx.tue),
        wed = getVal(data[i], idx.wed);
      const thu = getVal(data[i], idx.thu),
        fri = getVal(data[i], idx.fri),
        sat = getVal(data[i], idx.sat),
        sun = getVal(data[i], idx.sun);
      const totalWorkout = mon + tue + wed + thu + fri + sat + sun;

      const userObj = {
        nickname: rowNick,
        mon: mon,
        tue: tue,
        wed: wed,
        thu: thu,
        fri: fri,
        sat: sat,
        sun: sun,
        totalWorkout: totalWorkout,
        maxStreak: getVal(data[i], idx.maxStreak),
        maxRest: getVal(data[i], idx.maxRest),
        visits: getVal(data[i], idx.visits),
        rxReceived: getVal(data[i], idx.rxReceived),
        rxSent: getVal(data[i], idx.rxSent),
        shares: getVal(data[i], idx.shares),
        fines: getVal(data[i], idx.fines),
        posts: getVal(data[i], idx.posts),
        cheers: getVal(data[i], idx.cheers),
        meetup: getVal(data[i], idx.meetup),
        challenge: getVal(data[i], idx.challenge),
      };
      allUsers.push(userObj);
      if (rowNick === nickname) myData = userObj;
    }
  }

  if (!myData) return { success: false, msg: "회원님의 데이터가 없습니다." };

  // ★ [감동 포인트 업그레이드] 드라이브에서 내 사진을 가져와서 무작위로 섞음(Shuffle)
  let userPhotoUrls = [];
  try {
    const folderIter = DriveApp.getFoldersByName("SME_운동인증사진");
    if (folderIter.hasNext()) {
      const folder = folderIter.next();
      const files = folder.searchFiles("title contains '" + nickname + "_'");
      const tempFiles = [];
      while (files.hasNext()) {
        tempFiles.push(files.next());
      }

      if (tempFiles.length > 0) {
        // 배열 랜덤하게 섞기
        for (let i = tempFiles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tempFiles[i], tempFiles[j]] = [tempFiles[j], tempFiles[i]];
        }

        // 너무 많이 가져오면 로딩이 느려지므로 최대 20장 추출 (썸네일 크기도 살짝 줄임)
        const maxPhotos = Math.min(tempFiles.length, 20);
        for (let i = 0; i < maxPhotos; i++) {
          userPhotoUrls.push(
            "https://drive.google.com/thumbnail?sz=w600&id=" +
              tempFiles[i].getId(),
          );
        }
      }
    }
  } catch (e) {
    Logger.log("Photos Fetch Error: " + e.toString());
  }

  let globalDays = [0, 0, 0, 0, 0, 0, 0];
  let globalTotalWorkout = 0;
  let globalShares = 0;
  let globalPosts = 0;
  let globalReactions = 0;

  allUsers.forEach((u) => {
    globalDays[0] += u.mon;
    globalDays[1] += u.tue;
    globalDays[2] += u.wed;
    globalDays[3] += u.thu;
    globalDays[4] += u.fri;
    globalDays[5] += u.sat;
    globalDays[6] += u.sun;
    globalTotalWorkout += u.totalWorkout;
    globalShares += u.shares;
    globalPosts += u.posts;
    globalReactions += u.rxReceived;
  });

  const daysArr = ["월", "화", "수", "목", "금", "토", "일"];
  const maxGlobalCount = Math.max(...globalDays);
  const minGlobalCount = Math.min(...globalDays);

  let globalBestDays = [];
  let globalWorstDays = [];
  globalDays.forEach((val, index) => {
    if (val === maxGlobalCount) globalBestDays.push(daysArr[index]);
    if (val === minGlobalCount) globalWorstDays.push(daysArr[index]);
  });

  const myDays = [
    myData.mon,
    myData.tue,
    myData.wed,
    myData.thu,
    myData.fri,
    myData.sat,
    myData.sun,
  ];
  const maxMyCount = Math.max(...myDays);
  const minMyCount = Math.min(...myDays);
  let myBestDays = [];
  let myWorstDays = [];

  myDays.forEach((val, index) => {
    if (maxMyCount > 0 && val === maxMyCount) myBestDays.push(daysArr[index]);
    if (val === minMyCount) myWorstDays.push(daysArr[index]);
  });

  allUsers.sort((a, b) => b.totalWorkout - a.totalWorkout);
  const workoutRank = allUsers.findIndex((u) => u.nickname === nickname) + 1;
  const workoutPercentile = Math.max(
    1,
    Math.ceil((workoutRank / allUsers.length) * 100),
  );

  allUsers.sort((a, b) => b.rxReceived - a.rxReceived);
  const rxRank = allUsers.findIndex((u) => u.nickname === nickname) + 1;
  const rxPercentile = Math.max(1, Math.ceil((rxRank / allUsers.length) * 100));

  return {
    success: true,
    myData: myData,
    myDays: myDays,
    globalBestDays: globalBestDays.join(", "),
    globalWorstDays: globalWorstDays.join(", "),
    myBestDays: myBestDays.length > 0 ? myBestDays.join(", ") : "없음",
    myWorstDays: myWorstDays.length > 0 ? myWorstDays.join(", ") : "없음",
    globalTotalWorkout: globalTotalWorkout,
    globalShares: globalShares,
    globalPosts: globalPosts,
    globalReactions: globalReactions,
    workoutPercentile: workoutPercentile,
    rxPercentile: rxPercentile,
    totalUsers: allUsers.length,
    userPhotoUrls: userPhotoUrls, // ★ 프론트엔드로 배열 전송
  };
}

function clearReactionLog(nickname, day) {
  try {
    const ss = getCachedSS();
    const sheet = ss.getSheetByName(REACTION_SHEET_NAME);

    // 리액션 시트가 없으면 무시
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // A열(게시자)과 B열(요일) 데이터만 가져오기
    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();

    // 행을 삭제할 때는 인덱스가 꼬이지 않도록 반드시 뒤에서부터 지워야 합니다.
    for (let i = data.length - 1; i >= 0; i--) {
      if (
        String(data[i][0]).trim() === String(nickname).trim() &&
        String(data[i][1]).trim() === String(day).trim()
      ) {
        sheet.deleteRow(i + 2); // 데이터 배열은 0부터, 시트 행은 2부터 시작하므로 +2
      }
    }
  } catch (e) {
    Logger.log("clearReactionLog Error: " + e.toString());
  }
}

function toggleRecapVisibility(adminName) {
  if (!validateAdmin(adminName))
    return { success: false, msg: "권한이 없습니다." };

  const props = PropertiesService.getScriptProperties();
  const current = props.getProperty("RECAP_VISIBLE") === "true";
  const newVal = !current; // 상태 뒤집기

  props.setProperty("RECAP_VISIBLE", String(newVal));

  return { success: true, isVisible: newVal };
}
