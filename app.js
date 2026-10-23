/******************************************************************************
 * Stroop Test Pro - Core JavaScript Application Logic (4 Conditions Mode)
 * Condition 1: Thai Prompt -> Answer English (Congruent)
 * Condition 2: Thai Prompt -> Answer English (Incongruent)
 * Condition 3: Eng Prompt -> Answer Thai (Congruent)
 * Condition 4: Eng Prompt -> Answer Thai (Incongruent)
 ******************************************************************************/

document.addEventListener('DOMContentLoaded', () => {

  // --- COLOR DEFINITIONS (ตัดคำว่า 'สี' ออกแล้ว) ---
  const COLOR_PALETTE = [
    { key: 'red', english: 'RED', thai: 'แดง', hex: '#ef4444' },
    { key: 'blue', english: 'BLUE', thai: 'น้ำเงิน', hex: '#3b82f6' },
    { key: 'green', english: 'GREEN', thai: 'เขียว', hex: '#10b981' },
    { key: 'yellow', english: 'YELLOW', thai: 'เหลือง', hex: '#eab308' }
  ];

  const CONDITION_META = {
    'C1': { code: 'C1', title: 'C1: Thai ➔ Eng (Congruent)', promptLang: 'TH', answerLang: 'ENG', isCongruent: true },
    'C2': { code: 'C2', title: 'C2: Thai ➔ Eng (Incongruent)', promptLang: 'TH', answerLang: 'ENG', isCongruent: false },
    'C3': { code: 'C3', title: 'C3: Eng ➔ Thai (Congruent)', promptLang: 'ENG', answerLang: 'TH', isCongruent: true },
    'C4': { code: 'C4', title: 'C4: Eng ➔ Thai (Incongruent)', promptLang: 'ENG', answerLang: 'TH', isCongruent: false }
  };

  // --- PRACTICE TRIALS DATA (4 ข้อซ้อมสอนทำ) ---
  const PRACTICE_TRIALS = [
    {
      trialNo: 1,
      condCode: 'C1',
      condTitle: 'C1: Thai ➔ Eng (Congruent)',
      answerLang: 'ENG',
      promptText: 'แดง',
      inkColorKey: 'red',
      inkColorHex: '#ef4444',
      correctAnswerText: 'RED',
      isCongruent: true,
      explanationCorrect: '✓ ถูกต้องครับ! คำไทยคือ "แดง" พิมพ์ด้วยหมึกสีแดง (ตรงคำ) คำตอบภาษาอังกฤษที่ถูกต้องคือ "RED"',
      explanationWrong: '💡 คำแนะนำ: คำไทยคือ "แดง" พิมพ์ด้วยหมึกสีแดง ให้ตอบปุ่มภาษาอังกฤษตามสีหมึกคือ "RED"'
    },
    {
      trialNo: 2,
      condCode: 'C2',
      condTitle: 'C2: Thai ➔ Eng (Incongruent)',
      answerLang: 'ENG',
      promptText: 'แดง',
      inkColorKey: 'green',
      inkColorHex: '#10b981',
      correctAnswerText: 'GREEN',
      isCongruent: false,
      explanationCorrect: '✓ ถูกต้องแม่นยำ! คำไทยเขียนว่า "แดง" แต่พิมพ์ด้วยหมึกสีเขียว (ไม่ตรงคำ) คุณเลือกตอบสีหมึก "GREEN" ถูกต้องแล้ว',
      explanationWrong: '💡 คำแนะนำ: อย่าถูกความหมายคำหลอก ให้มองเฉพาะ "สีของหมึก" (ข้อนี้หมึกสีเขียว คำตอบที่ถูกต้องคือ "GREEN")'
    },
    {
      trialNo: 3,
      condCode: 'C3',
      condTitle: 'C3: Eng ➔ Thai (Congruent)',
      answerLang: 'TH',
      promptText: 'BLUE',
      inkColorKey: 'blue',
      inkColorHex: '#3b82f6',
      correctAnswerText: 'น้ำเงิน',
      isCongruent: true,
      explanationCorrect: '✓ ถูกต้องครับ! คำอังกฤษคือ "BLUE" พิมพ์ด้วยหมึกสีน้ำเงิน คุณเลือกตอบปุ่มภาษาไทยว่า "น้ำเงิน" ถูกต้องแล้ว',
      explanationWrong: '💡 คำแนะนำ: คำอังกฤษคือ "BLUE" พิมพ์ด้วยหมึกสีน้ำเงิน คำตอบภาษาไทยที่ตรงกับสีหมึกคือ "น้ำเงิน"'
    },
    {
      trialNo: 4,
      condCode: 'C4',
      condTitle: 'C4: Eng ➔ Thai (Incongruent)',
      answerLang: 'TH',
      promptText: 'GREEN',
      inkColorKey: 'yellow',
      inkColorHex: '#eab308',
      correctAnswerText: 'เหลือง',
      isCongruent: false,
      explanationCorrect: '✓ เยี่ยมมาก! คำอังกฤษคือ "GREEN" แต่พิมพ์ด้วยหมึกสีเหลือง คุณเลือกปุ่มภาษาไทยตามสีหมึกว่า "เหลือง" ถูกต้องแล้ว',
      explanationWrong: '💡 คำแนะนำ: คำอังกฤษเขียนว่า "GREEN" แต่พิมพ์ด้วยหมึกสีเหลือง คุณต้องตอบปุ่มภาษาไทยตามสีหมึกคือ "เหลือง"'
    }
  ];

  // --- STATE VARIABLES ---
  let currentParticipantName = '';
  let currentSessionPhase = 'PRE'; // 'PRE' or 'POST'
  let currentSessionData = null; // Stored completed session object
  let totalTrialCount = 15;
  let selectedConditionMode = 'ALL_MIXED';
  let trialTimeLimitSec = 4;
  let timeLimitTimer = null;
  let stimulusHideTimer = null;
  let currentTrialIndex = 0;
  let trialList = [];
  let userResponses = [];
  let trialStartTime = 0;
  let liveTimerInterval = null;
  let soundEnabled = true;
  let isTrialActive = false;
  let audioCtx = null;

  // Practice Mode States
  let isPracticeMode = false;
  let practiceTrialIndex = 0;

  // --- DOM ELEMENTS ---
  const screenStart = document.getElementById('screen-start');
  const screenTest = document.getElementById('screen-test');
  const screenResults = document.getElementById('screen-results');

  const formStartTest = document.getElementById('form-start-test');
  const participantNameInput = document.getElementById('participant-name');
  const testSessionSelect = document.getElementById('test-session-select');
  const trialCountSelect = document.getElementById('trial-count-select');
  const conditionModeSelect = document.getElementById('condition-mode-select');
  const timeLimitSelect = document.getElementById('time-limit-select');
  const stimulusDurationSelect = document.getElementById('stimulus-duration-select');

  // Test Arena Elements
  const testProgressBar = document.getElementById('test-progress-bar');
  const stimulusDisplay = document.getElementById('stimulus-display');
  const feedbackIndicator = document.getElementById('feedback-indicator');
  const answerButtonsGrid = document.getElementById('answer-buttons-grid');

  // Results Dashboard Elements
  const resParticipantName = document.getElementById('res-participant-name');
  const resSessionBadge = document.getElementById('res-session-badge');
  const resSessionName = document.getElementById('res-session-name');
  const resDateTime = document.getElementById('res-date-time');
  const resModeName = document.getElementById('res-mode-name');
  const resAccuracyPct = document.getElementById('res-accuracy-pct');
  const resAccuracyCount = document.getElementById('res-accuracy-count');
  const resAvgCorrectRtSec = document.getElementById('res-avg-correct-rt-sec');
  const resAvgCorrectRtMs = document.getElementById('res-avg-correct-rt-ms');
  const resFastestRt = document.getElementById('res-fastest-rt');
  const resSlowestRt = document.getElementById('res-slowest-rt');
  const resStroopEffect = document.getElementById('res-stroop-effect');
  const resStroopDetail = document.getElementById('res-stroop-detail');

  const condTableBody = document.getElementById('cond-table-body');
  const trialsTableBody = document.getElementById('trials-table-body');

  // Action Buttons
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const btnHistory = document.getElementById('btn-history');
  const btnRestart = document.getElementById('btn-restart');
  const btnExportResearchCsv = document.getElementById('btn-export-research-csv');
  const btnCopyResearchTable = document.getElementById('btn-copy-research-table');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const historyCount = document.getElementById('history-count');
  const historyModalCount = document.getElementById('history-modal-count');

  // Modal Elements
  const modalHistory = document.getElementById('modal-history');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const tabBtnMaster = document.getElementById('tab-btn-master');
  const tabBtnSessions = document.getElementById('tab-btn-sessions');
  const tabPaneMaster = document.getElementById('tab-pane-master');
  const tabPaneSessions = document.getElementById('tab-pane-sessions');
  const masterResearchTableBody = document.getElementById('master-research-table-body');
  const btnCopyMasterTable = document.getElementById('btn-copy-master-table');
  const btnExportMasterSummaryCsv = document.getElementById('btn-export-master-summary-csv');
  const historyTableBody = document.getElementById('history-table-body');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnExportAllCsv = document.getElementById('btn-export-all-csv');
  const btnExportAllJson = document.getElementById('btn-export-all-json');

  // Theme Switcher Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeMenu = document.getElementById('theme-menu');
  const themeOpts = document.querySelectorAll('.theme-opt');

  // Practice Modals Elements
  const btnStartPractice = document.getElementById('btn-start-practice');
  const practiceHudBanner = document.getElementById('practice-hud-banner');
  const practiceTrialNum = document.getElementById('practice-trial-num');
  const modalPracticeFeedback = document.getElementById('modal-practice-feedback');
  const modalPracticeComplete = document.getElementById('modal-practice-complete');
  const practiceStepTag = document.getElementById('practice-step-tag');
  const practiceResultTitle = document.getElementById('practice-result-title');
  const practiceExplanationText = document.getElementById('practice-explanation-text');
  const btnNextPractice = document.getElementById('btn-next-practice');
  const btnStartRealFromPractice = document.getElementById('btn-start-real-from-practice');
  const btnRestartPractice = document.getElementById('btn-restart-practice');



  initApp();

  function initApp() {
    initTheme();
    updateHistoryCount();
    attachEventListeners();
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('stroop_pro_theme') || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('stroop_pro_theme', themeName);
    
    themeOpts.forEach(opt => {
      if (opt.dataset.theme === themeName) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  function attachEventListeners() {
    formStartTest.addEventListener('submit', handleStartTest);

    if (btnStartPractice) {
      btnStartPractice.addEventListener('click', startPracticeMode);
    }
    if (btnNextPractice) {
      btnNextPractice.addEventListener('click', nextPracticeTrial);
    }
    if (btnStartRealFromPractice) {
      btnStartRealFromPractice.addEventListener('click', startRealFromPractice);
    }
    if (btnRestartPractice) {
      btnRestartPractice.addEventListener('click', startPracticeMode);
    }



    if (btnThemeToggle && themeMenu) {
      btnThemeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        themeMenu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!themeMenu.contains(e.target) && e.target !== btnThemeToggle) {
          themeMenu.classList.remove('active');
        }
      });

      themeOpts.forEach(opt => {
        opt.addEventListener('click', () => {
          setTheme(opt.dataset.theme);
          themeMenu.classList.remove('active');
        });
      });
    }

    btnSoundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      btnSoundToggle.innerHTML = soundEnabled 
        ? '<i class="fa-solid fa-volume-high"></i>' 
        : '<i class="fa-solid fa-volume-xmark"></i>';
    });

    btnHistory.addEventListener('click', openHistoryModal);
    btnCloseModal.addEventListener('click', () => modalHistory.classList.remove('active'));
    btnClearHistory.addEventListener('click', clearAllHistory);

    if (btnExportAllCsv) btnExportAllCsv.addEventListener('click', exportAllToCSV);
    if (btnExportAllJson) btnExportAllJson.addEventListener('click', exportAllToJSON);

    btnRestart.addEventListener('click', () => switchScreen(screenStart));
    btnExportCsv.addEventListener('click', exportToCSV);
    btnExportJson.addEventListener('click', exportToJSON);

    if (btnExportResearchCsv) {
      btnExportResearchCsv.addEventListener('click', () => exportSingleSessionResearchCSV(currentSessionData));
    }
    if (btnCopyResearchTable) {
      btnCopyResearchTable.addEventListener('click', copyCurrentSessionResearchTable);
    }

    if (tabBtnMaster) {
      tabBtnMaster.addEventListener('click', () => switchModalTab('master'));
    }
    if (tabBtnSessions) {
      tabBtnSessions.addEventListener('click', () => switchModalTab('sessions'));
    }
    if (btnCopyMasterTable) {
      btnCopyMasterTable.addEventListener('click', copyMasterResearchTable);
    }
    if (btnExportMasterSummaryCsv) {
      btnExportMasterSummaryCsv.addEventListener('click', exportMasterSummaryCSV);
    }

    // Keyboard Shortcuts (EN: 1, 2, 3, 4 | TH: ๅ, /, -, ภ | Numpad: 1-4)
    const KEY_MAP = {
      'Digit1': 0, '1': 0, 'ๅ': 0, 'Numpad1': 0,
      'Digit2': 1, '2': 1, '/': 1, 'Numpad2': 1,
      'Digit3': 2, '3': 2, '-': 2, 'Numpad3': 2,
      'Digit4': 3, '4': 3, 'ภ': 3, 'Numpad4': 3
    };

    document.addEventListener('keydown', (e) => {
      if (!isTrialActive || !screenTest.classList.contains('active')) return;
      
      let btnIndex = undefined;
      if (e.code && e.code in KEY_MAP) {
        btnIndex = KEY_MAP[e.code];
      } else if (e.key && e.key in KEY_MAP) {
        btnIndex = KEY_MAP[e.key];
      }

      if (btnIndex !== undefined) {
        const buttons = answerButtonsGrid.querySelectorAll('.color-btn');
        if (buttons[btnIndex] && answerButtonsGrid.style.pointerEvents !== 'none') {
          buttons[btnIndex].classList.add('active-key-press');
          setTimeout(() => buttons[btnIndex].classList.remove('active-key-press'), 150);
          buttons[btnIndex].click();
        }
      }
    });
  }

  function switchScreen(targetScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    targetScreen.classList.add('active');

    // Hide main header during test arena for 100% focused clean UI
    if (targetScreen === screenTest) {
      document.body.classList.add('in-test-mode');
    } else {
      document.body.classList.remove('in-test-mode');
    }
  }

  // --- TRIAL GENERATION FOR 4 CONDITIONS ---
  function generateTrials(count, mode) {
    const trials = [];
    let conditionPool = [];

    if (mode === 'ALL_MIXED') {
      const keys = ['C1', 'C2', 'C3', 'C4'];
      for (let i = 0; i < count; i++) {
        conditionPool.push(keys[i % keys.length]);
      }
      conditionPool = shuffleArray(conditionPool);
    } else {
      for (let i = 0; i < count; i++) {
        conditionPool.push(mode);
      }
    }

    for (let i = 0; i < count; i++) {
      const condCode = conditionPool[i];
      const meta = CONDITION_META[condCode];

      const wordObj = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      
      let inkObj;
      if (meta.isCongruent) {
        inkObj = wordObj;
      } else {
        const others = COLOR_PALETTE.filter(c => c.key !== wordObj.key);
        inkObj = others[Math.floor(Math.random() * others.length)];
      }

      const promptText = meta.promptLang === 'TH' ? wordObj.thai : wordObj.english;
      const correctAnswerText = meta.answerLang === 'TH' ? inkObj.thai : inkObj.english;

      trials.push({
        trialNo: i + 1,
        condCode: condCode,
        condTitle: meta.title,
        promptLang: meta.promptLang,
        answerLang: meta.answerLang,
        isCongruent: meta.isCongruent,
        wordKey: wordObj.key,
        promptText: promptText,
        inkColorKey: inkObj.key,
        inkColorHex: inkObj.hex,
        correctAnswerText: correctAnswerText
      });
    }

    return trials;
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Handle Start Real Test
  function handleStartTest(e) {
    if (e) e.preventDefault();
    isPracticeMode = false;
    currentParticipantName = participantNameInput.value.trim() || 'ผู้ทดสอบ';
    currentSessionPhase = testSessionSelect ? testSessionSelect.value : 'PRE';
    totalTrialCount = parseInt(trialCountSelect.value, 10) || 15;
    selectedConditionMode = conditionModeSelect.value;
    trialTimeLimitSec = parseFloat(timeLimitSelect ? timeLimitSelect.value : '4');

    trialList = generateTrials(totalTrialCount, selectedConditionMode);
    currentTrialIndex = 0;
    userResponses = [];

    switchScreen(screenTest);
    startTrial();
  }

  // Handle Start Practice Mode
  function startPracticeMode() {
    isPracticeMode = true;
    practiceTrialIndex = 0;
    currentParticipantName = participantNameInput.value.trim() || 'ผู้ทดสอบ (ซ้อมทำ)';
    trialTimeLimitSec = parseFloat(timeLimitSelect ? timeLimitSelect.value : '4');

    switchScreen(screenTest);
    startTrial();
  }

  // Start Individual Trial
  function startTrial() {
    clearTimeout(timeLimitTimer);
    clearTimeout(stimulusHideTimer);

    if (isPracticeMode) {
      if (practiceTrialIndex >= PRACTICE_TRIALS.length) {
        finishPractice();
        return;
      }
      if (practiceHudBanner) practiceHudBanner.style.display = 'flex';
      if (practiceTrialNum) practiceTrialNum.textContent = practiceTrialIndex + 1;
    } else {
      if (practiceHudBanner) practiceHudBanner.style.display = 'none';
      if (currentTrialIndex >= trialList.length) {
        finishTest();
        return;
      }
    }

    isTrialActive = true;
    const currentTrial = isPracticeMode ? PRACTICE_TRIALS[practiceTrialIndex] : trialList[currentTrialIndex];

    // Reset Feedback
    feedbackIndicator.className = 'feedback-indicator';
    feedbackIndicator.textContent = '';

    // Render Stimulus Word (โจทย์ขึ้นก่อนและค้างอยู่ตลอด ไม่ถูกซ่อน)
    stimulusDisplay.textContent = currentTrial.promptText;
    stimulusDisplay.style.color = currentTrial.inkColorHex;
    stimulusDisplay.style.visibility = 'visible';
    stimulusDisplay.style.opacity = '1';

    // Render Answer Buttons
    renderAnswerButtons(currentTrial.answerLang);

    // Sequence logic: Prompt appears first, then choice buttons appear below it (Prompt stays visible!)
    const val = stimulusDurationSelect ? stimulusDurationSelect.value : '0.5';
    if (val === 'always') {
      answerButtonsGrid.style.visibility = 'visible';
      answerButtonsGrid.style.opacity = '1';
      answerButtonsGrid.style.pointerEvents = 'auto';
    } else {
      const delaySec = parseFloat(val) || 0.5;
      answerButtonsGrid.style.visibility = 'hidden';
      answerButtonsGrid.style.opacity = '0';
      answerButtonsGrid.style.pointerEvents = 'none';

      stimulusHideTimer = setTimeout(() => {
        if (isTrialActive) {
          // Choice buttons become visible and active! Prompt word remains 100% visible!
          answerButtonsGrid.style.visibility = 'visible';
          answerButtonsGrid.style.opacity = '1';
          answerButtonsGrid.style.pointerEvents = 'auto';
        }
      }, delaySec * 1000);
    }

    // Start Precision Timer
    trialStartTime = performance.now();
    startLiveTimer();

    // Time Limit Timeout Setup per item
    if (trialTimeLimitSec > 0) {
      timeLimitTimer = setTimeout(() => {
        if (isTrialActive) {
          handleTimeout();
        }
      }, trialTimeLimitSec * 1000);
    }
  }

  function renderAnswerButtons(lang) {
    answerButtonsGrid.innerHTML = '';
    COLOR_PALETTE.forEach((colorObj) => {
      const btnText = lang === 'ENG' ? colorObj.english : colorObj.thai;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-btn';
      btn.dataset.color = colorObj.key;
      btn.innerHTML = `<span>${btnText}</span>`;
      btn.addEventListener('click', () => handleUserAnswer(btnText));
      answerButtonsGrid.appendChild(btn);
    });
  }

  function handleTimeout() {
    handleUserAnswer('ไม่ได้ตอบ (Timeout)');
  }

  function startLiveTimer() {
    clearInterval(liveTimerInterval);
  }

  function stopLiveTimer() {
    clearInterval(liveTimerInterval);
  }

  // Handle Response Click / Timeout
  function handleUserAnswer(selectedAnswer) {
    if (!isTrialActive) return;
    isTrialActive = false;
    clearTimeout(timeLimitTimer);
    clearTimeout(stimulusHideTimer);

    const endTime = performance.now();
    stopLiveTimer();

    const currentTrial = isPracticeMode ? PRACTICE_TRIALS[practiceTrialIndex] : trialList[currentTrialIndex];
    const isTimeout = selectedAnswer === 'ไม่ได้ตอบ (Timeout)';
    const reactionTimeMs = isTimeout ? (trialTimeLimitSec * 1000) : (endTime - trialStartTime);
    const reactionTimeSec = (reactionTimeMs / 1000).toFixed(3);
    const isCorrect = !isTimeout && (selectedAnswer === currentTrial.correctAnswerText);

    playSound(isCorrect);

    if (isPracticeMode) {
      practiceTrialIndex++;
      setTimeout(() => {
        startTrial();
      }, 450);
      return;
    }


    userResponses.push({
      trialNo: currentTrial.trialNo,
      condCode: currentTrial.condCode,
      condTitle: currentTrial.condTitle,
      promptText: currentTrial.promptText,
      inkColorKey: currentTrial.inkColorKey,
      correctAnswerText: currentTrial.correctAnswerText,
      userAnswerText: selectedAnswer,
      isCorrect: isCorrect,
      reactionTimeMs: reactionTimeMs,
      reactionTimeSec: parseFloat(reactionTimeSec),
      isCongruent: currentTrial.isCongruent,
      isTimeout: isTimeout
    });

    currentTrialIndex++;
    setTimeout(() => {
      startTrial();
    }, 450);
  }



  function finishPractice() {
    if (modalPracticeComplete) modalPracticeComplete.classList.add('active');
  }

  function startRealFromPractice() {
    if (modalPracticeComplete) modalPracticeComplete.classList.remove('active');
    isPracticeMode = false;
    handleStartTest(null);
  }



  // Finish Test & Process Results
  function finishTest() {
    stopLiveTimer();
    clearTimeout(timeLimitTimer);
    clearTimeout(stimulusHideTimer);
    isTrialActive = false;
    if (testProgressBar) testProgressBar.style.width = '100%';

    const totalCount = userResponses.length;
    const correctResponses = userResponses.filter(r => r.isCorrect);
    const correctCount = correctResponses.length;
    const accuracyPct = totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(1) : '0.0';

    let avgRtMs = 0;
    let avgRtSec = '0.000';
    let fastestRtSec = '0.000';
    let slowestRtSec = '0.000';

    if (totalCount > 0) {
      const totalMs = userResponses.reduce((acc, r) => acc + r.reactionTimeMs, 0);
      avgRtMs = Math.round(totalMs / totalCount);
      avgRtSec = (avgRtMs / 1000).toFixed(3);

      const timesSec = userResponses.map(r => r.reactionTimeSec);
      fastestRtSec = Math.min(...timesSec).toFixed(3);
      slowestRtSec = Math.max(...timesSec).toFixed(3);
    }

    const congResponses = userResponses.filter(r => r.isCongruent);
    const incongResponses = userResponses.filter(r => !r.isCongruent);

    const congCorrect = congResponses.filter(r => r.isCorrect);
    const incongCorrect = incongResponses.filter(r => r.isCorrect);

    // Calculate Reaction Time for Correct Trials Only (Standard Research Protocol)
    const congAvgMs = congCorrect.length > 0
      ? Math.round(congCorrect.reduce((a, r) => a + r.reactionTimeMs, 0) / congCorrect.length)
      : (congResponses.length > 0 ? Math.round(congResponses.reduce((a, r) => a + r.reactionTimeMs, 0) / congResponses.length) : 0);

    const incongAvgMs = incongCorrect.length > 0
      ? Math.round(incongCorrect.reduce((a, r) => a + r.reactionTimeMs, 0) / incongCorrect.length)
      : (incongResponses.length > 0 ? Math.round(incongResponses.reduce((a, r) => a + r.reactionTimeMs, 0) / incongResponses.length) : 0);

    const stroopInterferenceMs = incongAvgMs - congAvgMs;
    const stroopInterferenceSec = (stroopInterferenceMs / 1000).toFixed(3);

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

    resParticipantName.textContent = currentParticipantName;
    resDateTime.textContent = dateFormatted;

    const isPost = currentSessionPhase === 'POST';
    const phaseLabel = isPost ? 'Post-test' : 'Pre-test';

    if (resSessionBadge) {
      resSessionBadge.className = isPost ? 'badge-tag session-post' : 'badge-tag session-pre';
      resSessionBadge.innerHTML = isPost 
        ? '<i class="fa-solid fa-circle-check"></i> Post-test (หลังการทดลอง)' 
        : '<i class="fa-solid fa-circle-play"></i> Pre-test (ก่อนการทดลอง)';
    }

    if (resSessionName) {
      resSessionName.textContent = isPost ? 'Post-test (หลังการทดลอง)' : 'Pre-test (ก่อนการทดลอง)';
    }

    const modeLabels = {
      'ALL_MIXED': '🔀 สุ่มคละทั้ง 4 เงื่อนไข',
      'C1': 'เงื่อนไข 1 (Thai ➔ Eng Congruent)',
      'C2': 'เงื่อนไข 2 (Thai ➔ Eng Incongruent)',
      'C3': 'เงื่อนไข 3 (Eng ➔ Thai Congruent)',
      'C4': 'เงื่อนไข 4 (Eng ➔ Thai Incongruent)'
    };
    resModeName.textContent = modeLabels[selectedConditionMode] || selectedConditionMode;

    resAccuracyPct.textContent = `${accuracyPct}%`;
    resAccuracyCount.textContent = `ตอบถูก ${correctCount} จาก ${totalCount} ข้อ`;

    resAvgCorrectRtSec.textContent = `${avgRtSec} s`;
    resAvgCorrectRtMs.textContent = `(${avgRtMs.toLocaleString()} ms)`;

    resFastestRt.textContent = `เร็วสุด: ${fastestRtSec} s (${Math.round(fastestRtSec * 1000)} ms)`;
    resSlowestRt.textContent = `ช้าสุด: ${slowestRtSec} s (${Math.round(slowestRtSec * 1000)} ms)`;

    resStroopEffect.textContent = `${stroopInterferenceSec > 0 ? '+' : ''}${stroopInterferenceSec} s`;
    resStroopDetail.textContent = `(ส่วนต่างเวลาสับสนสี D = I - C: ${stroopInterferenceMs > 0 ? '+' : ''}${stroopInterferenceMs} ms)`;

    populate4ConditionsTable();
    populateTrialTable();

    currentSessionData = {
      id: Date.now(),
      participantName: currentParticipantName,
      sessionPhase: currentSessionPhase,
      phaseLabel: phaseLabel,
      modeName: modeLabels[selectedConditionMode] || selectedConditionMode,
      dateTimeStr: dateFormatted,
      totalCount: totalCount,
      correctCount: correctCount,
      accuracyPct: accuracyPct,
      congAvgMs: congAvgMs,
      incongAvgMs: incongAvgMs,
      diffD: stroopInterferenceMs,
      avgRtSec: avgRtSec,
      avgRtMs: avgRtMs,
      avgCorrectRtSec: avgRtSec,
      avgCorrectRtMs: avgRtMs,
      responses: [...userResponses]
    };

    saveSessionToHistory(currentSessionData);

    switchScreen(screenResults);
  }

  // Populate 4 Conditions Breakdown Table
  function populate4ConditionsTable() {
    condTableBody.innerHTML = '';

    ['C1', 'C2', 'C3', 'C4'].forEach(cCode => {
      const meta = CONDITION_META[cCode];
      const condResponses = userResponses.filter(r => r.condCode === cCode);
      const totalInCond = condResponses.length;
      const correctInCond = condResponses.filter(r => r.isCorrect);

      let avgSec = '0.000';
      let avgMs = 0;

      if (totalInCond > 0) {
        const sumMs = condResponses.reduce((acc, r) => acc + r.reactionTimeMs, 0);
        avgMs = Math.round(sumMs / totalInCond);
        avgSec = (avgMs / 1000).toFixed(3);
      }

      const langText = meta.promptLang === 'TH' ? 'ไทย ➔ อังกฤษ' : 'อังกฤษ ➔ ไทย';
      const congTag = meta.isCongruent 
        ? '<span class="type-tag congruent"><i class="fa-solid fa-link"></i> ตรงกับคำ (Congruent)</span>' 
        : '<span class="type-tag incongruent"><i class="fa-solid fa-link-slash"></i> ไม่ตรงคำ (Incongruent)</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${meta.title}</strong></td>
        <td>${langText}</td>
        <td>${congTag}</td>
        <td>${correctInCond.length} / ${totalInCond}</td>
        <td class="num-font highlight">${avgSec} s</td>
        <td class="num-font">${avgMs} ms</td>
      `;
      condTableBody.appendChild(tr);
    });
  }

  function populateTrialTable() {
    trialsTableBody.innerHTML = '';
    userResponses.forEach(r => {
      const tr = document.createElement('tr');
      const statusBadge = r.isCorrect
        ? '<span class="badge-tag success"><i class="fa-solid fa-check"></i> ถูกต้อง</span>'
        : (r.isTimeout 
          ? '<span class="badge-tag danger"><i class="fa-solid fa-clock"></i> หมดเวลา</span>' 
          : '<span class="badge-tag danger"><i class="fa-solid fa-xmark"></i> ผิด</span>');

      const colorMap = { red: 'แดง', blue: 'น้ำเงิน', green: 'เขียว', yellow: 'เหลือง' };

      tr.innerHTML = `
        <td class="num-font">ข้อ ${r.trialNo}</td>
        <td><span class="cond-tag">${r.condCode}</span></td>
        <td><strong>${r.promptText}</strong></td>
        <td><span class="chip ${r.inkColorKey}"><i class="fa-solid fa-circle"></i> ${colorMap[r.inkColorKey]}</span></td>
        <td>${r.userAnswerText}</td>
        <td>${statusBadge}</td>
        <td class="num-font highlight">${r.reactionTimeSec.toFixed(3)} s</td>
        <td class="num-font">${Math.round(r.reactionTimeMs)} ms</td>
      `;
      trialsTableBody.appendChild(tr);
    });
  }

  // --- LOCALSTORAGE HISTORY & PARTICIPANT DATA MANAGEMENT ---
  function getHistory() {
    try {
      const data = localStorage.getItem('stroop_pro_history');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveSessionToHistory(sessionData) {
    const history = getHistory();
    history.unshift(sessionData);
    try {
      localStorage.setItem('stroop_pro_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history', e);
    }
    updateHistoryCount();
  }

  function updateHistoryCount() {
    const history = getHistory();
    if (historyCount) historyCount.textContent = history.length;
    if (historyModalCount) historyModalCount.textContent = history.length;
  }

  function openHistoryModal() {
    switchModalTab('master');
    modalHistory.classList.add('modal', 'active');
  }

  function switchModalTab(tabName) {
    if (tabName === 'master') {
      if (tabBtnMaster) tabBtnMaster.classList.add('active');
      if (tabBtnSessions) tabBtnSessions.classList.remove('active');
      if (tabPaneMaster) tabPaneMaster.classList.add('active');
      if (tabPaneSessions) tabPaneSessions.classList.remove('active');
      renderMasterResearchTable();
    } else {
      if (tabBtnMaster) tabBtnMaster.classList.remove('active');
      if (tabBtnSessions) tabBtnSessions.classList.add('active');
      if (tabPaneMaster) tabPaneMaster.classList.remove('active');
      if (tabPaneSessions) tabPaneSessions.classList.add('active');
      renderHistoryTable();
    }
  }

  // --- RESEARCH CALCULATION HELPERS ---
  function calcCongFromResponses(responses) {
    if (!responses || responses.length === 0) return '-';
    const cong = responses.filter(r => r.isCongruent);
    const correct = cong.filter(r => r.isCorrect);
    const target = correct.length > 0 ? correct : cong;
    if (target.length === 0) return '-';
    return Math.round(target.reduce((a, r) => a + r.reactionTimeMs, 0) / target.length);
  }

  function calcIncongFromResponses(responses) {
    if (!responses || responses.length === 0) return '-';
    const incong = responses.filter(r => !r.isCongruent);
    const correct = incong.filter(r => r.isCorrect);
    const target = correct.length > 0 ? correct : incong;
    if (target.length === 0) return '-';
    return Math.round(target.reduce((a, r) => a + r.reactionTimeMs, 0) / target.length);
  }

  // --- TAB 1: RENDER MASTER RESEARCH PRE/POST SUMMARY TABLE ---
  function renderMasterResearchTable() {
    if (!masterResearchTableBody) return;
    const history = getHistory();
    masterResearchTableBody.innerHTML = '';

    if (history.length === 0) {
      masterResearchTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
            ยังไม่มีข้อมูลประวัติผู้ทดสอบในระบบ กรุณาเริ่มทดสอบรอบ Pre-test หรือ Post-test ก่อน
          </td>
        </tr>
      `;
      return;
    }

    // Group sessions by Participant ID / Name
    const participantMap = new Map();
    // history is ordered newest first; we want the latest Pre and latest Post
    history.forEach(item => {
      const name = (item.participantName || 'ผู้ทดสอบ').trim();
      if (!participantMap.has(name)) {
        participantMap.set(name, { pre: null, post: null });
      }
      const pData = participantMap.get(name);
      const isPost = item.sessionPhase === 'POST' || (item.phaseLabel && item.phaseLabel.toLowerCase().includes('post'));
      if (isPost && !pData.post) {
        pData.post = item;
      } else if (!isPost && !pData.pre) {
        pData.pre = item;
      }
    });

    participantMap.forEach((sessions, pName) => {
      const pre = sessions.pre;
      const post = sessions.post;

      const preC = pre ? (pre.congAvgMs !== undefined ? pre.congAvgMs : calcCongFromResponses(pre.responses)) : '-';
      const preI = pre ? (pre.incongAvgMs !== undefined ? pre.incongAvgMs : calcIncongFromResponses(pre.responses)) : '-';
      const preD = (preC !== '-' && preI !== '-') ? (preI - preC) : '-';
      const preDStr = preD !== '-' ? (preD > 0 ? `+${preD}` : `${preD}`) : '-';

      const postC = post ? (post.congAvgMs !== undefined ? post.congAvgMs : calcCongFromResponses(post.responses)) : '-';
      const postI = post ? (post.incongAvgMs !== undefined ? post.incongAvgMs : calcIncongFromResponses(post.responses)) : '-';
      const postD = (postC !== '-' && postI !== '-') ? (postI - postC) : '-';
      const postDStr = postD !== '-' ? (postD > 0 ? `+${postD}` : `${postD}`) : '-';

      let deltaDStr = '-';
      let changeNote = '<span style="color: var(--text-muted);">-</span>';

      if (preD !== '-' && postD !== '-') {
        const delta = postD - preD;
        deltaDStr = delta > 0 ? `+${delta}` : `${delta}`;
        if (delta < 0) {
          changeNote = `<span class="badge-tag success"><i class="fa-solid fa-arrow-trend-down"></i> ลดลง ${Math.abs(delta)} ms (ดีขึ้น)</span>`;
        } else if (delta > 0) {
          changeNote = `<span class="badge-tag danger"><i class="fa-solid fa-arrow-trend-up"></i> เพิ่มขึ้น ${delta} ms</span>`;
        } else {
          changeNote = `<span class="badge-tag warning">เท่าเดิม (0 ms)</span>`;
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${pName}</strong></td>
        <td class="num-font">${preC !== '-' ? `${preC} ms` : '-'}</td>
        <td class="num-font">${preI !== '-' ? `${preI} ms` : '-'}</td>
        <td class="num-font highlight" style="color: #60a5fa; font-weight: 700;">${preDStr !== '-' ? `${preDStr} ms` : '-'}</td>
        <td class="num-font">${postC !== '-' ? `${postC} ms` : '-'}</td>
        <td class="num-font">${postI !== '-' ? `${postI} ms` : '-'}</td>
        <td class="num-font highlight" style="color: #34d399; font-weight: 700;">${postDStr !== '-' ? `${postDStr} ms` : '-'}</td>
        <td class="num-font" style="font-weight: 800; font-size: 0.95rem; color: ${deltaDStr.startsWith('-') ? '#34d399' : (deltaDStr.startsWith('+') ? '#f87171' : 'inherit')}">
          ${deltaDStr !== '-' ? `${deltaDStr} ms` : '-'}
        </td>
        <td>${changeNote}</td>
      `;
      masterResearchTableBody.appendChild(tr);
    });
  }

  // --- TAB 2: RENDER INDIVIDUAL SESSIONS LOG (8 Columns) ---
  function renderHistoryTable() {
    const history = getHistory();
    historyTableBody.innerHTML = '';

    if (history.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
            ยังไม่มีประวัติการทดสอบในระบบ
          </td>
        </tr>
      `;
      return;
    }

    history.forEach(item => {
      const tr = document.createElement('tr');
      const isPost = item.sessionPhase === 'POST' || (item.phaseLabel && item.phaseLabel.toLowerCase().includes('post'));
      const phaseBadge = isPost 
        ? '<span class="badge-tag session-post">🟢 Post-test</span>'
        : '<span class="badge-tag session-pre">🔵 Pre-test</span>';

      const cMs = item.congAvgMs !== undefined ? item.congAvgMs : calcCongFromResponses(item.responses);
      const iMs = item.incongAvgMs !== undefined ? item.incongAvgMs : calcIncongFromResponses(item.responses);
      const diffD = (cMs !== '-' && iMs !== '-') ? (iMs - cMs) : (item.diffD !== undefined ? item.diffD : '-');
      const diffDStr = diffD !== '-' ? (diffD > 0 ? `+${diffD}` : `${diffD}`) : '-';

      tr.innerHTML = `
        <td><small>${item.dateTimeStr}</small></td>
        <td><strong>${item.participantName}</strong></td>
        <td>${phaseBadge}</td>
        <td class="num-font">${cMs !== '-' ? `${cMs} ms` : '-'}</td>
        <td class="num-font">${iMs !== '-' ? `${iMs} ms` : '-'}</td>
        <td class="num-font highlight" style="color: #facc15; font-weight: 700;">${diffDStr !== '-' ? `${diffDStr} ms` : '-'}</td>
        <td><span class="badge-tag success">${item.accuracyPct}%</span></td>
        <td>
          <div class="action-btn-group">
            <button class="glass-btn secondary sm btn-view-session" title="ดูผลลัพธ์ผู้ทดสอบนี้">
              <i class="fa-solid fa-eye"></i> ดูผล
            </button>
            <button class="glass-btn secondary sm btn-csv-session" title="ดาวน์โหลด Sheet สรุปผู้ทดสอบนี้">
              <i class="fa-solid fa-file-excel"></i> Sheet
            </button>
            <button class="icon-btn sm btn-delete-item" title="ลบรายการนี้">
              <i class="fa-solid fa-trash-can" style="color: var(--accent-red); font-size: 0.85rem;"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-view-session').addEventListener('click', () => loadParticipantSession(item));
      tr.querySelector('.btn-csv-session').addEventListener('click', () => exportSingleSessionResearchCSV(item));
      tr.querySelector('.btn-delete-item').addEventListener('click', () => deleteHistoryItem(item.id));
      historyTableBody.appendChild(tr);
    });
  }

  function loadParticipantSession(sessionData) {
    currentParticipantName = sessionData.participantName;
    userResponses = sessionData.responses || [];
    selectedConditionMode = sessionData.modeName;
    currentSessionPhase = sessionData.sessionPhase || 'PRE';
    currentSessionData = sessionData;

    resParticipantName.textContent = sessionData.participantName;
    resDateTime.textContent = sessionData.dateTimeStr;
    resModeName.textContent = sessionData.modeName;

    const isPost = currentSessionPhase === 'POST' || (sessionData.phaseLabel && sessionData.phaseLabel.toLowerCase().includes('post'));
    if (resSessionBadge) {
      resSessionBadge.className = isPost ? 'badge-tag session-post' : 'badge-tag session-pre';
      resSessionBadge.innerHTML = isPost 
        ? '<i class="fa-solid fa-circle-check"></i> Post-test (หลังการทดลอง)' 
        : '<i class="fa-solid fa-circle-play"></i> Pre-test (ก่อนการทดลอง)';
    }
    if (resSessionName) {
      resSessionName.textContent = isPost ? 'Post-test (หลังการทดลอง)' : 'Pre-test (ก่อนการทดลอง)';
    }

    resAccuracyPct.textContent = `${sessionData.accuracyPct}%`;
    resAccuracyCount.textContent = `ตอบถูก ${sessionData.correctCount} จาก ${sessionData.totalCount} ข้อ`;

    resAvgCorrectRtSec.textContent = `${sessionData.avgRtSec || sessionData.avgCorrectRtSec || '0.000'} s`;
    resAvgCorrectRtMs.textContent = `(${sessionData.avgRtMs || sessionData.avgCorrectRtMs || 0} ms)`;

    const cMs = sessionData.congAvgMs !== undefined ? sessionData.congAvgMs : calcCongFromResponses(sessionData.responses);
    const iMs = sessionData.incongAvgMs !== undefined ? sessionData.incongAvgMs : calcIncongFromResponses(sessionData.responses);
    const diffD = (cMs !== '-' && iMs !== '-') ? (iMs - cMs) : (sessionData.diffD !== undefined ? sessionData.diffD : 0);

    resStroopEffect.textContent = `${diffD > 0 ? '+' : ''}${(diffD / 1000).toFixed(3)} s`;
    resStroopDetail.textContent = `(ส่วนต่างเวลาสับสนสี D = I - C: ${diffD > 0 ? '+' : ''}${diffD} ms)`;

    populate4ConditionsTable();
    populateTrialTable();

    modalHistory.classList.remove('active');
    switchScreen(screenResults);
  }

  function deleteHistoryItem(id) {
    let history = getHistory();
    history = history.filter(h => h.id !== id);
    localStorage.setItem('stroop_pro_history', JSON.stringify(history));
    renderHistoryTable();
    renderMasterResearchTable();
    updateHistoryCount();
  }

  function clearAllHistory() {
    if (confirm('คุณต้องการลบประวัติการทดสอบทั้งหมดใช่หรือไม่?')) {
      localStorage.removeItem('stroop_pro_history');
      renderHistoryTable();
      renderMasterResearchTable();
      updateHistoryCount();
    }
  }

  // --- RESEARCH SUMMARY EXPORT & COPY FUNCTIONS (สำหรับ Google Sheets / Excel) ---
  function exportSingleSessionResearchCSV(sessionData) {
    const data = sessionData || currentSessionData;
    if (!data) return;

    const cMs = data.congAvgMs !== undefined ? data.congAvgMs : calcCongFromResponses(data.responses);
    const iMs = data.incongAvgMs !== undefined ? data.incongAvgMs : calcIncongFromResponses(data.responses);
    const diffD = (cMs !== '-' && iMs !== '-') ? (iMs - cMs) : (data.diffD !== undefined ? data.diffD : 0);
    const dStr = diffD > 0 ? `+${diffD}` : `${diffD}`;
    const phaseLabel = data.phaseLabel || (data.sessionPhase === 'POST' ? 'Post-test' : 'Pre-test');

    let csvContent = '\uFEFF';
    csvContent += 'ผู้เข้าร่วม,รอบการทดสอบ,Congruent (ms),Incongruent (ms),ผลต่าง D = I - C (ms),ความถูกต้อง (%),เวลาเฉลี่ยรวม (ms),ตอบถูก/ทั้งหมด,วันที่ทดสอบ\n';
    csvContent += `"${data.participantName}","${phaseLabel}",${cMs},${iMs},${dStr},"${data.accuracyPct}%",${data.avgRtMs || 0},"${data.correctCount}/${data.totalCount}","${data.dateTimeStr}"\n`;

    downloadFile(csvContent, `Stroop_Summary_${data.participantName}_${phaseLabel}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function copyCurrentSessionResearchTable() {
    if (!currentSessionData) return;
    const cMs = currentSessionData.congAvgMs !== undefined ? currentSessionData.congAvgMs : calcCongFromResponses(currentSessionData.responses);
    const iMs = currentSessionData.incongAvgMs !== undefined ? currentSessionData.incongAvgMs : calcIncongFromResponses(currentSessionData.responses);
    const diffD = (cMs !== '-' && iMs !== '-') ? (iMs - cMs) : (currentSessionData.diffD !== undefined ? currentSessionData.diffD : 0);
    const dStr = diffD > 0 ? `+${diffD}` : `${diffD}`;
    const phaseLabel = currentSessionData.phaseLabel || (currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test');

    const tsvContent = `ผู้เข้าร่วม\tรอบการทดสอบ\tCongruent (ms)\tIncongruent (ms)\tผลต่าง D = I - C\tความถูกต้อง\n` +
      `${currentSessionData.participantName}\t${phaseLabel}\t${cMs}\t${iMs}\t${dStr}\t${currentSessionData.accuracyPct}%`;

    navigator.clipboard.writeText(tsvContent).then(() => {
      if (btnCopyResearchTable) {
        const origHtml = btnCopyResearchTable.innerHTML;
        btnCopyResearchTable.innerHTML = '<i class="fa-solid fa-check"></i> คัดลอกลง Sheet แล้ว!';
        setTimeout(() => { btnCopyResearchTable.innerHTML = origHtml; }, 2000);
      }
    }).catch(err => {
      console.warn('Clipboard copy failed', err);
    });
  }

  function exportMasterSummaryCSV() {
    const history = getHistory();
    if (history.length === 0) {
      alert('ยังไม่มีข้อมูลประวัติผู้ทดสอบในระบบ');
      return;
    }

    const participantMap = new Map();
    history.forEach(item => {
      const name = (item.participantName || 'ผู้ทดสอบ').trim();
      if (!participantMap.has(name)) participantMap.set(name, { pre: null, post: null });
      const pData = participantMap.get(name);
      const isPost = item.sessionPhase === 'POST' || (item.phaseLabel && item.phaseLabel.toLowerCase().includes('post'));
      if (isPost && !pData.post) pData.post = item;
      else if (!isPost && !pData.pre) pData.pre = item;
    });

    let csvContent = '\uFEFF';
    csvContent += 'ตารางสรุปผลวิจัย STROOP EFFECT: เปรียบเทียบ PRE-TEST vs POST-TEST\n';
    csvContent += `วันที่ส่งออก,${new Date().toLocaleString('th-TH')}\n`;
    csvContent += `จำนวนผู้เข้าร่วมทั้งหมด,${participantMap.size}\n\n`;

    csvContent += 'ผู้เข้าร่วม,Pre Congruent (ms),Pre Incongruent (ms),Pre ผลต่าง D (ms),Post Congruent (ms),Post Incongruent (ms),Post ผลต่าง D (ms),ผลต่าง Delta D (Post - Pre),การเปลี่ยนแปลง,Pre ความถูกต้อง,Post ความถูกต้อง\n';

    participantMap.forEach((sessions, pName) => {
      const pre = sessions.pre;
      const post = sessions.post;

      const preC = pre ? (pre.congAvgMs !== undefined ? pre.congAvgMs : calcCongFromResponses(pre.responses)) : '';
      const preI = pre ? (pre.incongAvgMs !== undefined ? pre.incongAvgMs : calcIncongFromResponses(pre.responses)) : '';
      const preD = (preC !== '' && preI !== '') ? (preI - preC) : '';
      const preDStr = preD !== '' ? (preD > 0 ? `+${preD}` : `${preD}`) : '';

      const postC = post ? (post.congAvgMs !== undefined ? post.congAvgMs : calcCongFromResponses(post.responses)) : '';
      const postI = post ? (post.incongAvgMs !== undefined ? post.incongAvgMs : calcIncongFromResponses(post.responses)) : '';
      const postD = (postC !== '' && postI !== '') ? (postI - postC) : '';
      const postDStr = postD !== '' ? (postD > 0 ? `+${postD}` : `${postD}`) : '';

      let deltaDStr = '';
      let changeText = '-';

      if (preD !== '' && postD !== '') {
        const delta = postD - preD;
        deltaDStr = delta > 0 ? `+${delta}` : `${delta}`;
        if (delta < 0) changeText = `ลดลง ${Math.abs(delta)} ms (ดีขึ้น)`;
        else if (delta > 0) changeText = `เพิ่มขึ้น ${delta} ms`;
        else changeText = 'เท่าเดิม';
      }

      const preAcc = pre ? `${pre.accuracyPct}%` : '';
      const postAcc = post ? `${post.accuracyPct}%` : '';

      csvContent += `"${pName}",${preC},${preI},${preDStr},${postC},${postI},${postDStr},${deltaDStr},"${changeText}","${preAcc}","${postAcc}"\n`;
    });

    downloadFile(csvContent, `Stroop_Master_PrePost_Research_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function copyMasterResearchTable() {
    const history = getHistory();
    if (history.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับคัดลอก');
      return;
    }

    const participantMap = new Map();
    history.forEach(item => {
      const name = (item.participantName || 'ผู้ทดสอบ').trim();
      if (!participantMap.has(name)) participantMap.set(name, { pre: null, post: null });
      const pData = participantMap.get(name);
      const isPost = item.sessionPhase === 'POST' || (item.phaseLabel && item.phaseLabel.toLowerCase().includes('post'));
      if (isPost && !pData.post) pData.post = item;
      else if (!isPost && !pData.pre) pData.pre = item;
    });

    let tsvContent = 'ผู้เข้าร่วม\tPre Congruent (ms)\tPre Incongruent (ms)\tPre ผลต่าง D\tPost Congruent (ms)\tPost Incongruent (ms)\tPost ผลต่าง D\tDelta D (Post - Pre)\tการเปลี่ยนแปลง\n';

    participantMap.forEach((sessions, pName) => {
      const pre = sessions.pre;
      const post = sessions.post;

      const preC = pre ? (pre.congAvgMs !== undefined ? pre.congAvgMs : calcCongFromResponses(pre.responses)) : '';
      const preI = pre ? (pre.incongAvgMs !== undefined ? pre.incongAvgMs : calcIncongFromResponses(pre.responses)) : '';
      const preD = (preC !== '' && preI !== '') ? (preI - preC) : '';
      const preDStr = preD !== '' ? (preD > 0 ? `+${preD}` : `${preD}`) : '';

      const postC = post ? (post.congAvgMs !== undefined ? post.congAvgMs : calcCongFromResponses(post.responses)) : '';
      const postI = post ? (post.incongAvgMs !== undefined ? post.incongAvgMs : calcIncongFromResponses(post.responses)) : '';
      const postD = (postC !== '' && postI !== '') ? (postI - postC) : '';
      const postDStr = postD !== '' ? (postD > 0 ? `+${postD}` : `${postD}`) : '';

      let deltaDStr = '';
      let changeText = '-';

      if (preD !== '' && postD !== '') {
        const delta = postD - preD;
        deltaDStr = delta > 0 ? `+${delta}` : `${delta}`;
        if (delta < 0) changeText = `ลดลง ${Math.abs(delta)} ms (ดีขึ้น)`;
        else if (delta > 0) changeText = `เพิ่มขึ้น ${delta} ms`;
        else changeText = 'เท่าเดิม';
      }

      tsvContent += `${pName}\t${preC}\t${preI}\t${preDStr}\t${postC}\t${postI}\t${postDStr}\t${deltaDStr}\t${changeText}\n`;
    });

    navigator.clipboard.writeText(tsvContent).then(() => {
      if (btnCopyMasterTable) {
        const origHtml = btnCopyMasterTable.innerHTML;
        btnCopyMasterTable.innerHTML = '<i class="fa-solid fa-check"></i> คัดลอกตาราง Master ลง Sheet แล้ว!';
        setTimeout(() => { btnCopyMasterTable.innerHTML = origHtml; }, 2000);
      }
    }).catch(err => {
      console.warn('Clipboard copy failed', err);
    });
  }

  // --- RAW TRIALS EXPORTS ---
  function exportToCSV() {
    if (userResponses.length === 0) return;
    const phaseLabel = currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test';

    let csvContent = '\uFEFF';
    csvContent += `Participant Name,${currentParticipantName}\n`;
    csvContent += `Test Phase,${phaseLabel}\n`;
    csvContent += `Date,${new Date().toLocaleString('th-TH')}\n`;
    csvContent += `Mode,${selectedConditionMode}\n`;
    csvContent += `Total Trials,${userResponses.length}\n\n`;

    csvContent += 'Trial,Phase,Condition,Prompt Text,Ink Color,User Answer,Correct Answer,Status,Reaction Time (s),Reaction Time (ms),Is Congruent\n';

    userResponses.forEach(r => {
      const statusStr = r.isCorrect ? 'Correct' : (r.isTimeout ? 'Timeout' : 'Incorrect');
      csvContent += `${r.trialNo},${phaseLabel},${r.condCode},${r.promptText},${r.inkColorKey},${r.userAnswerText},${r.correctAnswerText},${statusStr},${r.reactionTimeSec},${Math.round(r.reactionTimeMs)},${r.isCongruent ? 'Yes' : 'No'}\n`;
    });

    downloadFile(csvContent, `Stroop_${currentParticipantName}_${phaseLabel}_Raw_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportToJSON() {
    if (userResponses.length === 0) return;
    const phaseLabel = currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test';

    const dataObj = {
      participantName: currentParticipantName,
      sessionPhase: currentSessionPhase,
      phaseLabel: phaseLabel,
      mode: selectedConditionMode,
      timestamp: new Date().toISOString(),
      totalCount: userResponses.length,
      correctCount: userResponses.filter(r => r.isCorrect).length,
      responses: userResponses
    };

    downloadFile(JSON.stringify(dataObj, null, 2), `Stroop_${currentParticipantName}_${phaseLabel}_${Date.now()}.json`, 'application/json');
  }

  function exportSingleSessionCSV(sessionData) {
    let csvContent = '\uFEFF';
    const phase = sessionData.phaseLabel || (sessionData.sessionPhase === 'POST' ? 'Post-test' : 'Pre-test');
    csvContent += `Participant Name,${sessionData.participantName}\n`;
    csvContent += `Test Phase,${phase}\n`;
    csvContent += `Date,${sessionData.dateTimeStr}\n`;
    csvContent += `Mode,${sessionData.modeName}\n`;
    csvContent += `Accuracy,${sessionData.accuracyPct}%\n`;
    csvContent += `Average Reaction Time (s),${sessionData.avgRtSec || sessionData.avgCorrectRtSec}\n\n`;

    csvContent += 'Trial,Phase,Condition,Prompt Text,Ink Color,User Answer,Correct Answer,Status,Reaction Time (s),Reaction Time (ms),Is Congruent\n';

    (sessionData.responses || []).forEach(r => {
      const statusStr = r.isCorrect ? 'Correct' : (r.isTimeout ? 'Timeout' : 'Incorrect');
      csvContent += `${r.trialNo},${phase},${r.condCode},${r.promptText},${r.inkColorKey},${r.userAnswerText},${r.correctAnswerText},${statusStr},${r.reactionTimeSec},${Math.round(r.reactionTimeMs)},${r.isCongruent ? 'Yes' : 'No'}\n`;
    });

    downloadFile(csvContent, `Stroop_${sessionData.participantName}_${phase}_Raw_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportSingleSessionJSON(sessionData) {
    downloadFile(JSON.stringify(sessionData, null, 2), `Stroop_${sessionData.participantName}_${sessionData.phaseLabel || 'Session'}_${Date.now()}.json`, 'application/json');
  }

  // --- MASTER BULK EXPORT (ข้อมูลดิบทุกคนรวมเป็นไฟล์เดียว) ---
  function exportAllToCSV() {
    const history = getHistory();
    if (history.length === 0) {
      alert('ยังไม่มีข้อมูลประวัติผู้ทดสอบในระบบ');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'MASTER STROOP TEST DATASET (ALL PARTICIPANTS INCLUDED)\n';
    csvContent += `Generated Date,${new Date().toLocaleString('th-TH')}\n`;
    csvContent += `Total Participants / Sessions,${history.length}\n\n`;

    csvContent += 'Participant Name,Phase,Session Date,Mode,Trial No,Condition Code,Prompt Text,Ink Color,User Answer,Correct Answer,Status,Reaction Time (s),Reaction Time (ms),Is Congruent\n';

    history.forEach(session => {
      const phase = session.phaseLabel || (session.sessionPhase === 'POST' ? 'Post-test' : 'Pre-test');
      (session.responses || []).forEach(r => {
        const statusStr = r.isCorrect ? 'Correct' : (r.isTimeout ? 'Timeout' : 'Incorrect');
        csvContent += `"${session.participantName}","${phase}","${session.dateTimeStr}","${session.modeName}",${r.trialNo},${r.condCode},"${r.promptText}",${r.inkColorKey},"${r.userAnswerText}","${r.correctAnswerText}",${statusStr},${r.reactionTimeSec},${Math.round(r.reactionTimeMs)},${r.isCongruent ? 'Yes' : 'No'}\n`;
      });
    });

    downloadFile(csvContent, `Stroop_Master_All_Trials_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportAllToJSON() {
    const history = getHistory();
    if (history.length === 0) {
      alert('ยังไม่มีข้อมูลประวัติผู้ทดสอบในระบบ');
      return;
    }

    const masterData = {
      exportTitle: 'Master Stroop Test Dataset (All Participants)',
      exportedAt: new Date().toISOString(),
      totalSessions: history.length,
      participantsData: history
    };

    downloadFile(JSON.stringify(masterData, null, 2), `Stroop_Master_All_Participants_${Date.now()}.json`, 'application/json');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- WEB AUDIO API SYNTHESIZER ---
  function playSound(isCorrect) {
    if (!soundEnabled) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isCorrect) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

});
