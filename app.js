/******************************************************************************
 * Stroop Test Pro - Core Application Logic
 * Supports:
 * 1. Single-click Flow: Pre-test ➔ Break / Rest ➔ Post-test
 * 2. Participant Privacy: No test scores shown on completion screen
 * 3. Research Data: Congruent (ms), Incongruent (ms), Difference D = I - C
 * 4. Researcher Admin Portal: Protected dashboard with tables matching research format
 * 5. Google Sheets Integration: 1-Click Clipboard TSV & Auto-sync Webhook
 ******************************************************************************/

document.addEventListener('DOMContentLoaded', () => {

  // --- COLOR DEFINITIONS ---
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

  // --- PRACTICE TRIALS DATA ---
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
      isCongruent: true
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
      isCongruent: false
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
      isCongruent: true
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
      isCongruent: false
    }
  ];

  // --- STATE VARIABLES ---
  let currentParticipantName = 'P01';
  let currentCampName = '';
  let isAutoPrePostMode = true;
  let currentSessionPhase = 'PRE'; // 'PRE' or 'POST'
  let preSessionResponses = [];
  let preSessionStats = null;
  let totalTrialCount = 15;
  let selectedConditionMode = 'ALL_MIXED';
  let trialTimeLimitSec = 4;
  let timeLimitTimer = null;
  let stimulusHideTimer = null;
  let currentTrialIndex = 0;
  let trialList = [];
  let userResponses = [];
  let trialStartTime = 0;
  let soundEnabled = true;
  let isTrialActive = false;
  let audioCtx = null;

  // Break Timer
  let breakTimerInterval = null;
  let breakElapsedSec = 0;

  // Admin Auth State
  let isAdminUnlocked = false;

  // Practice Mode
  let isPracticeMode = false;
  let practiceTrialIndex = 0;

  // Current session data for detailed admin results view
  let currentSessionData = null;

  // --- DOM ELEMENTS ---
  // Screens
  const screenStart = document.getElementById('screen-start');
  const screenTest = document.getElementById('screen-test');
  const screenBreak = document.getElementById('screen-break');
  const screenParticipantDone = document.getElementById('screen-participant-done');
  const screenResults = document.getElementById('screen-results');

  // Start Form
  const formStartTest = document.getElementById('form-start-test');
  const participantNameInput = document.getElementById('participant-name');
  const campNameInput = document.getElementById('camp-name');
  const testSessionSelect = document.getElementById('test-session-select');
  const trialCountSelect = document.getElementById('trial-count-select');
  const conditionModeSelect = document.getElementById('condition-mode-select');
  const timeLimitSelect = document.getElementById('time-limit-select');
  const stimulusDurationSelect = document.getElementById('stimulus-duration-select');

  // Test Arena
  const testPhaseBadge = document.getElementById('test-phase-badge');
  const testTrialCurrent = document.getElementById('test-trial-current');
  const testTrialTotal = document.getElementById('test-trial-total');
  const stimulusDisplay = document.getElementById('stimulus-display');
  const feedbackIndicator = document.getElementById('feedback-indicator');
  const answerButtonsGrid = document.getElementById('answer-buttons-grid');
  const practiceHudBanner = document.getElementById('practice-hud-banner');
  const practiceTrialNum = document.getElementById('practice-trial-num');

  // 3-Second Countdown Elements
  const testCountdownOverlay = document.getElementById('test-countdown-overlay');
  const countdownPhaseBadge = document.getElementById('countdown-phase-badge');
  const countdownNumber = document.getElementById('countdown-number');
  const countdownCircle = document.querySelector('.countdown-circle-outer');
  let countdownTimer = null;

  // Break Screen Elements
  const breakTimerDisplay = document.getElementById('break-timer-display');
  const btnStartPostRound = document.getElementById('btn-start-post-round');

  // Participant Done Screen Elements
  const doneParticipantId = document.getElementById('done-participant-id');
  const doneModeLabel = document.getElementById('done-mode-label');
  const doneDatetime = document.getElementById('done-datetime');
  const doneCloudStatus = document.getElementById('done-cloud-status');
  const btnDoneNextParticipant = document.getElementById('btn-done-next-participant');
  const btnDoneAdminView = document.getElementById('btn-done-admin-view');
  const btnDoneDownloadCsv = document.getElementById('btn-done-download-csv');
  const autoDownloadCsvCheckbox = document.getElementById('auto-download-csv-checkbox');

  // Header Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeMenu = document.getElementById('theme-menu');
  const themeOpts = document.querySelectorAll('.theme-opt');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const btnAdminPortal = document.getElementById('btn-admin-portal');
  const adminBadgeCount = document.getElementById('admin-badge-count');

  // Admin Auth Modal
  const modalAdminAuth = document.getElementById('modal-admin-auth');
  const formAdminAuth = document.getElementById('form-admin-auth');
  const adminPinInput = document.getElementById('admin-pin-input');
  const btnCancelAdminAuth = document.getElementById('btn-cancel-admin-auth');

  // Admin Dashboard Modal
  const modalAdmin = document.getElementById('modal-admin');
  const btnCloseAdminModal = document.getElementById('btn-close-admin-modal');
  const btnCloseAdminFooter = document.getElementById('btn-close-admin-footer');
  const adminSessionCount = document.getElementById('admin-session-count');
  const adminTabBtns = document.querySelectorAll('.admin-tabs .tab-btn');
  const adminTabPanes = document.querySelectorAll('.admin-tab-pane');

  // Admin Tables (Pre & Post as in User's Image)
  const preResearchTableBody = document.getElementById('pre-research-table-body');
  const preResearchTableFoot = document.getElementById('pre-research-table-foot');
  const postResearchTableBody = document.getElementById('post-research-table-body');
  const postResearchTableFoot = document.getElementById('post-research-table-foot');
  const btnCopyPreTable = document.getElementById('btn-copy-pre-table');
  const btnCopyPostTable = document.getElementById('btn-copy-post-table');
  const btnCopyBothTables = document.getElementById('btn-copy-both-tables');

  // Master Comparison Table
  const masterResearchTableBody = document.getElementById('master-research-table-body');
  const btnCopyMasterTable = document.getElementById('btn-copy-master-table');
  const btnExportMasterSummaryCsv = document.getElementById('btn-export-master-summary-csv');

  // Google Sheets Integration Elements
  const googleSheetsUrlInput = document.getElementById('google-sheets-url-input');
  const btnSaveSheetsUrl = document.getElementById('btn-save-sheets-url');
  const webhookStatusBadge = document.getElementById('webhook-status-badge');
  const btnSyncAllSheets = document.getElementById('btn-sync-all-sheets');
  const btnTestSheetsConnection = document.getElementById('btn-test-sheets-connection');
  const btnCopyAppsScriptCode = document.getElementById('btn-copy-apps-script-code');

  // Exports & Session Management
  const btnDownloadMasterCsv = document.getElementById('btn-download-master-csv');
  const btnExportAllCsv = document.getElementById('btn-export-all-csv');
  const btnExportAllJson = document.getElementById('btn-export-all-json');
  const historyTableBody = document.getElementById('history-table-body');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnLoadSampleData = document.getElementById('btn-load-sample-data');

  // Raw Trials Tab Elements
  const rawTrialsTableBody = document.getElementById('raw-trials-table-body');
  const rawTrialParticipantFilter = document.getElementById('raw-trial-participant-filter');
  const rawTrialPhaseFilter = document.getElementById('raw-trial-phase-filter');
  const btnCopyRawTrials = document.getElementById('btn-copy-raw-trials');
  const btnDownloadRawTrialsCsv = document.getElementById('btn-download-raw-trials-csv');
  const rawTrialsSummaryBar = document.getElementById('raw-trials-summary-bar');

  // Results Dashboard Elements (Detailed Admin View)
  const resParticipantName = document.getElementById('res-participant-name');
  const resCampInfo = document.getElementById('res-camp-info');
  const resCampName = document.getElementById('res-camp-name');
  const resSessionBadge = document.getElementById('res-session-badge');
  const resSessionName = document.getElementById('res-session-name');
  const resDateTime = document.getElementById('res-date-time');
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
  const btnNextParticipant = document.getElementById('btn-next-participant');
  const btnExportResearchCsv = document.getElementById('btn-export-research-csv');
  const btnCopyResearchTable = document.getElementById('btn-copy-research-table');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnRestart = document.getElementById('btn-restart');

  // Practice Mode Elements
  const btnStartPractice = document.getElementById('btn-start-practice');
  const modalPracticeComplete = document.getElementById('modal-practice-complete');
  const btnStartRealFromPractice = document.getElementById('btn-start-real-from-practice');
  const btnRestartPractice = document.getElementById('btn-restart-practice');

  // --- INITIALIZE APP ---
  initApp();

  function initApp() {
    initTheme();
    loadSheetsWebhookUrl();
    updateRecordCounts();
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
      opt.classList.toggle('active', opt.dataset.theme === themeName);
    });
  }

  function loadSheetsWebhookUrl() {
    const savedUrl = localStorage.getItem('stroop_sheets_webhook_url') || '';
    if (googleSheetsUrlInput) googleSheetsUrlInput.value = savedUrl;
    updateWebhookBadge(savedUrl);
  }

  function updateWebhookBadge(url) {
    if (!webhookStatusBadge) return;
    if (url && url.startsWith('http')) {
      webhookStatusBadge.className = 'badge-tag success';
      webhookStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> พร้อมเชื่อมต่อ Google Sheets';
    } else {
      webhookStatusBadge.className = 'badge-tag warning';
      webhookStatusBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ยังไม่ได้เชื่อมต่อ URL';
    }
  }

  // --- EVENT LISTENERS ---
  function attachEventListeners() {
    // Form Start Test
    if (formStartTest) formStartTest.addEventListener('submit', handleStartTest);

    // Practice Mode
    if (btnStartPractice) btnStartPractice.addEventListener('click', startPracticeMode);
    if (btnStartRealFromPractice) btnStartRealFromPractice.addEventListener('click', startRealFromPractice);
    if (btnRestartPractice) btnRestartPractice.addEventListener('click', startPracticeMode);

    // Break Phase Button
    if (btnStartPostRound) btnStartPostRound.addEventListener('click', startPostRound);

    // Participant Done Screen Buttons
    if (btnDoneDownloadCsv) btnDoneDownloadCsv.addEventListener('click', downloadCurrentParticipantCSV);
    if (btnDoneNextParticipant) btnDoneNextParticipant.addEventListener('click', handleNextParticipant);
    if (btnDoneAdminView) btnDoneAdminView.addEventListener('click', openAdminPortal);

    // Header Actions
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        btnSoundToggle.innerHTML = soundEnabled 
          ? '<i class="fa-solid fa-volume-high"></i>' 
          : '<i class="fa-solid fa-volume-xmark"></i>';
      });
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

    // Admin Portal Openers
    if (btnAdminPortal) btnAdminPortal.addEventListener('click', openAdminPortal);

    // Admin Auth Form
    if (formAdminAuth) formAdminAuth.addEventListener('submit', handleAdminAuthSubmit);
    if (btnCancelAdminAuth) btnCancelAdminAuth.addEventListener('click', () => modalAdminAuth.classList.remove('active'));

    // Admin Dashboard Tabs & Close
    if (btnCloseAdminModal) btnCloseAdminModal.addEventListener('click', () => modalAdmin.classList.remove('active'));
    if (btnCloseAdminFooter) btnCloseAdminFooter.addEventListener('click', () => modalAdmin.classList.remove('active'));

    adminTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        adminTabBtns.forEach(b => b.classList.remove('active'));
        adminTabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.dataset.tab;
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Admin Table Clipboard Copy Buttons (TSV format for Google Sheets Ctrl+V)
    if (btnCopyPreTable) btnCopyPreTable.addEventListener('click', copyPreTableToClipboard);
    if (btnCopyPostTable) btnCopyPostTable.addEventListener('click', copyPostTableToClipboard);
    if (btnCopyBothTables) btnCopyBothTables.addEventListener('click', copyBothTablesToClipboard);
    if (btnCopyMasterTable) btnCopyMasterTable.addEventListener('click', copyMasterTableToClipboard);

    // Google Sheets Webhook Handlers
    if (btnSaveSheetsUrl) btnSaveSheetsUrl.addEventListener('click', handleSaveSheetsUrl);
    if (btnSyncAllSheets) btnSyncAllSheets.addEventListener('click', handleSyncAllToSheets);
    if (btnTestSheetsConnection) btnTestSheetsConnection.addEventListener('click', handleTestSheetsConnection);
    if (btnCopyAppsScriptCode) btnCopyAppsScriptCode.addEventListener('click', copyAppsScriptCode);

    // File Downloads
    if (btnDownloadMasterCsv) btnDownloadMasterCsv.addEventListener('click', exportMasterSummaryCSV);
    if (btnExportMasterSummaryCsv) btnExportMasterSummaryCsv.addEventListener('click', exportMasterSummaryCSV);
    if (btnExportAllCsv) btnExportAllCsv.addEventListener('click', exportAllRawTrialsCSV);
    if (btnExportAllJson) btnExportAllJson.addEventListener('click', exportAllRawTrialsJSON);

    // History Clear
    if (btnClearHistory) btnClearHistory.addEventListener('click', clearAllHistory);

    // Sample Data Loader
    if (btnLoadSampleData) btnLoadSampleData.addEventListener('click', loadSampleData);

    // Raw Trials Tab
    if (btnCopyRawTrials) btnCopyRawTrials.addEventListener('click', copyRawTrialsTSV);
    if (btnDownloadRawTrialsCsv) btnDownloadRawTrialsCsv.addEventListener('click', downloadRawTrialsCSV);
    if (rawTrialParticipantFilter) rawTrialParticipantFilter.addEventListener('change', renderRawTrialsTable);
    if (rawTrialPhaseFilter) rawTrialPhaseFilter.addEventListener('change', renderRawTrialsTable);

    // Results Dashboard Buttons
    if (btnRestart) btnRestart.addEventListener('click', () => switchScreen(screenStart));
    if (btnNextParticipant) btnNextParticipant.addEventListener('click', handleNextParticipant);
    if (btnExportResearchCsv) btnExportResearchCsv.addEventListener('click', () => exportSingleSessionResearchCSV(currentSessionData));
    if (btnCopyResearchTable) btnCopyResearchTable.addEventListener('click', copyCurrentSessionResearchTable);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportToCSV);

    // Keyboard Shortcuts (Z, X, C, V + 1-4 on English & Thai keyboard layouts)
    const KEY_MAP = {
      // Primary: Z, X, C, V (English + Thai Kedmanee + Thai Pattachote)
      'KeyZ': 0, 'z': 0, 'Z': 0, 'ผ': 0, 'ึ': 0,
      'KeyX': 1, 'x': 1, 'X': 1, 'ป': 1, 'ค': 1,
      'KeyC': 2, 'c': 2, 'C': 2, 'แ': 2, 'ต': 2,
      'KeyV': 3, 'v': 3, 'V': 3, 'อ': 3, 'จ': 3,

      // Secondary: 1, 2, 3, 4 (English & Thai keyboard layouts)
      'Digit1': 0, '1': 0, 'ๅ': 0, 'Numpad1': 0,
      'Digit2': 1, '2': 1, '/': 1, 'Numpad2': 1,
      'Digit3': 2, '3': 2, '-': 2, 'Numpad3': 2,
      'Digit4': 3, '4': 3, 'ภ': 3, 'Numpad4': 3
    };

    document.addEventListener('keydown', (e) => {
      if (!isTrialActive || !screenTest || !screenTest.classList.contains('active')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      let btnIndex = undefined;
      if (e.code && e.code in KEY_MAP) {
        btnIndex = KEY_MAP[e.code];
      } else if (e.key) {
        if (e.key in KEY_MAP) {
          btnIndex = KEY_MAP[e.key];
        } else if (e.key.toLowerCase() in KEY_MAP) {
          btnIndex = KEY_MAP[e.key.toLowerCase()];
        }
      }

      if (btnIndex !== undefined) {
        e.preventDefault();
        const buttons = answerButtonsGrid.querySelectorAll('.color-btn');
        if (buttons[btnIndex]) {
          buttons[btnIndex].classList.add('active-key-press');
          setTimeout(() => buttons[btnIndex].classList.remove('active-key-press'), 150);
          buttons[btnIndex].click();
        }
      }
    });
  }

  // --- SCREEN SWITCHER ---
  function switchScreen(targetScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    targetScreen.classList.add('active');

    if (targetScreen === screenTest) {
      document.body.classList.add('in-test-mode');
    } else {
      document.body.classList.remove('in-test-mode');
    }
  }

  // --- TRIAL GENERATION ---
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

  // --- HANDLE START TEST (ONE PLAY CLICK FLOW) ---
  function handleStartTest(e) {
    if (e) e.preventDefault();
    isPracticeMode = false;
    currentParticipantName = participantNameInput.value.trim() || 'P01';
    currentCampName = campNameInput ? campNameInput.value.trim() : '';
    
    const chosenFlow = testSessionSelect ? testSessionSelect.value : 'AUTO_PRE_POST';
    if (chosenFlow === 'AUTO_PRE_POST') {
      isAutoPrePostMode = true;
      currentSessionPhase = 'PRE';
    } else {
      isAutoPrePostMode = false;
      currentSessionPhase = chosenFlow;
    }

    preSessionResponses = [];
    preSessionStats = null;
    totalTrialCount = parseInt(trialCountSelect.value, 10) || 15;
    selectedConditionMode = conditionModeSelect.value;
    trialTimeLimitSec = parseFloat(timeLimitSelect ? timeLimitSelect.value : '4');

    trialList = generateTrials(totalTrialCount, selectedConditionMode);
    currentTrialIndex = 0;
    userResponses = [];

    switchScreen(screenTest);
    runCountdown(currentSessionPhase, () => {
      startTrial();
    });
  }

  function startPracticeMode() {
    isPracticeMode = true;
    practiceTrialIndex = 0;
    currentParticipantName = participantNameInput.value.trim() || 'ผู้ทดสอบ (ซ้อมทำ)';
    trialTimeLimitSec = parseFloat(timeLimitSelect ? timeLimitSelect.value : '4');

    switchScreen(screenTest);
    runCountdown('PRACTICE', () => {
      startTrial();
    });
  }

  function startRealFromPractice() {
    if (modalPracticeComplete) modalPracticeComplete.classList.remove('active');
    handleStartTest(null);
  }

  // --- 3-SECOND COUNTDOWN CONTROLLER (PRE-TEST & POST-TEST) ---
  function runCountdown(phase, onFinish) {
    if (!testCountdownOverlay || !countdownNumber) {
      if (onFinish) onFinish();
      return;
    }

    clearInterval(countdownTimer);

    // Setup Badge by Phase
    if (countdownPhaseBadge) {
      if (phase === 'POST') {
        countdownPhaseBadge.className = 'badge-tag session-post';
        countdownPhaseBadge.innerHTML = '<i class="fa-solid fa-forward"></i> เตรียมพร้อม: รอบที่ 2 (Post-test)';
      } else if (phase === 'PRE') {
        countdownPhaseBadge.className = 'badge-tag session-pre';
        countdownPhaseBadge.innerHTML = '<i class="fa-solid fa-play"></i> เตรียมพร้อม: รอบที่ 1 (Pre-test)';
      } else {
        countdownPhaseBadge.className = 'badge-tag warning';
        countdownPhaseBadge.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> เตรียมพร้อม: ซ้อมทำ (Practice)';
      }
    }

    // Reset Visuals
    if (countdownCircle) countdownCircle.classList.remove('go-active');
    countdownNumber.className = 'countdown-big-num';

    // Neutralize stimulus and answer buttons while counting down
    if (stimulusDisplay) {
      stimulusDisplay.textContent = '+';
      stimulusDisplay.style.color = '#94a3b8';
      stimulusDisplay.style.visibility = 'visible';
      stimulusDisplay.style.opacity = '0.35';
    }
    if (answerButtonsGrid) {
      answerButtonsGrid.style.visibility = 'hidden';
      answerButtonsGrid.style.opacity = '0';
      answerButtonsGrid.style.pointerEvents = 'none';
    }

    testCountdownOverlay.style.display = 'flex';

    let count = 3;

    function renderStep(val, isGo) {
      countdownNumber.classList.remove('count-pop', 'go-pop');
      void countdownNumber.offsetWidth; // Force CSS animation restart
      countdownNumber.textContent = val;

      if (isGo) {
        countdownNumber.classList.add('go-pop');
        if (countdownCircle) countdownCircle.classList.add('go-active');
        playCountdownSound(true);
      } else {
        countdownNumber.classList.add('count-pop');
        if (countdownCircle) countdownCircle.classList.remove('go-active');
        playCountdownSound(false);
      }
    }

    // Show initial '3'
    renderStep(count, false);

    countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        renderStep(count, false);
      } else if (count === 0) {
        renderStep('เริ่ม!', true);
      } else {
        clearInterval(countdownTimer);
        testCountdownOverlay.style.display = 'none';
        if (onFinish) onFinish();
      }
    }, 1000);
  }

  // --- START TRIAL ---
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
      if (testPhaseBadge) {
        testPhaseBadge.className = 'badge-tag warning';
        testPhaseBadge.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> ข้อสอบซ้อมทำ';
      }
    } else {
      if (practiceHudBanner) practiceHudBanner.style.display = 'none';
      if (currentTrialIndex >= trialList.length) {
        finishCurrentPhase();
        return;
      }

      // Update Phase HUD & Trial Counter
      const isPost = currentSessionPhase === 'POST';
      if (testPhaseBadge) {
        testPhaseBadge.className = isPost ? 'badge-tag session-post' : 'badge-tag session-pre';
        testPhaseBadge.innerHTML = isPost 
          ? '<i class="fa-solid fa-forward"></i> ช่วงที่ 2: Post-test' 
          : '<i class="fa-solid fa-play"></i> ช่วงที่ 1: Pre-test';
      }
      if (testTrialCurrent) testTrialCurrent.textContent = currentTrialIndex + 1;
      if (testTrialTotal) testTrialTotal.textContent = trialList.length;
    }

    isTrialActive = true;
    const currentTrial = isPracticeMode ? PRACTICE_TRIALS[practiceTrialIndex] : trialList[currentTrialIndex];

    // Reset Feedback
    feedbackIndicator.className = 'feedback-indicator';
    feedbackIndicator.textContent = '';

    // Render Stimulus Word (Prompts remain fully visible during response)
    stimulusDisplay.textContent = currentTrial.promptText;
    stimulusDisplay.style.color = currentTrial.inkColorHex;
    stimulusDisplay.style.visibility = 'visible';
    stimulusDisplay.style.opacity = '1';

    // Render Answer Buttons
    renderAnswerButtons(currentTrial.answerLang);

    // Sequence delay: Prompt visible first, buttons appear after delay
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
          answerButtonsGrid.style.visibility = 'visible';
          answerButtonsGrid.style.opacity = '1';
          answerButtonsGrid.style.pointerEvents = 'auto';
        }
      }, delaySec * 1000);
    }

    trialStartTime = performance.now();

    if (trialTimeLimitSec > 0) {
      timeLimitTimer = setTimeout(() => {
        if (isTrialActive) {
          handleTimeout();
        }
      }, trialTimeLimitSec * 1000);
    }
  }

  function renderAnswerButtons(lang) {
    const KEY_HINTS = ['Z', 'X', 'C', 'V'];
    answerButtonsGrid.innerHTML = '';
    COLOR_PALETTE.forEach((colorObj, idx) => {
      const btnText = lang === 'ENG' ? colorObj.english : colorObj.thai;
      const keyHint = KEY_HINTS[idx] || (idx + 1);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-btn';
      btn.dataset.color = colorObj.key;
      btn.innerHTML = `<span class="key-hint">${keyHint}</span><span class="btn-text">${btnText}</span>`;
      btn.addEventListener('click', () => handleUserAnswer(btnText));
      answerButtonsGrid.appendChild(btn);
    });
  }

  function handleTimeout() {
    handleUserAnswer('ไม่ได้ตอบ (Timeout)');
  }

  // --- HANDLE USER ANSWER ---
  function handleUserAnswer(selectedAnswer) {
    if (!isTrialActive) return;
    isTrialActive = false;
    clearTimeout(timeLimitTimer);
    clearTimeout(stimulusHideTimer);

    const endTime = performance.now();
    const currentTrial = isPracticeMode ? PRACTICE_TRIALS[practiceTrialIndex] : trialList[currentTrialIndex];
    const isTimeout = selectedAnswer === 'ไม่ได้ตอบ (Timeout)';
    const reactionTimeMs = isTimeout ? (trialTimeLimitSec * 1000) : (endTime - trialStartTime);
    const reactionTimeSec = (reactionTimeMs / 1000).toFixed(3);
    const isCorrect = !isTimeout && (selectedAnswer === currentTrial.correctAnswerText);

    playSound(isCorrect);

    if (isPracticeMode) {
      practiceTrialIndex++;
      setTimeout(() => startTrial(), 400);
      return;
    }

    userResponses.push({
      trialNo: currentTrial.trialNo,
      phase: currentSessionPhase,
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
    setTimeout(() => startTrial(), 400);
  }

  function finishPractice() {
    if (modalPracticeComplete) modalPracticeComplete.classList.add('active');
  }

  // --- FINISH CURRENT PHASE (PRE OR POST) ---
  function finishCurrentPhase() {
    clearTimeout(timeLimitTimer);
    clearTimeout(stimulusHideTimer);
    isTrialActive = false;

    // IF IN AUTO 2-PHASE FLOW AND JUST FINISHED PRE-TEST:
    if (isAutoPrePostMode && currentSessionPhase === 'PRE') {
      preSessionResponses = [...userResponses];
      preSessionStats = calculatePhaseStats(preSessionResponses);

      // Save Pre-test single session for backup log
      saveIndividualSession({
        id: Date.now(),
        participantName: currentParticipantName,
        campName: currentCampName,
        sessionPhase: 'PRE',
        phaseLabel: 'Pre-test',
        modeName: selectedConditionMode,
        dateTimeStr: getFormattedDate(),
        ...preSessionStats,
        responses: preSessionResponses
      });

      // Switch to Break Screen!
      startBreakScreen();
      return;
    }

    // IF FINISHED POST-TEST (OR SINGLE RUN COMPLETED):
    const postSessionResponses = [...userResponses];
    const postSessionStats = calculatePhaseStats(postSessionResponses);

    const nowStr = getFormattedDate();

    // If completed both Pre and Post in one session:
    if (isAutoPrePostMode && preSessionStats) {
      const deltaD = postSessionStats.diffD - preSessionStats.diffD;

      const masterRecord = {
        id: Date.now(),
        participantName: currentParticipantName,
        campName: currentCampName,
        dateTimeStr: nowStr,
        modeName: selectedConditionMode,
        // Pre-test Metrics
        preCongMs: preSessionStats.congAvgMs,
        preIncongMs: preSessionStats.incongAvgMs,
        preDiffD: preSessionStats.diffD,
        preAccuracy: preSessionStats.accuracyPct,
        preResponses: preSessionResponses,
        // Post-test Metrics
        postCongMs: postSessionStats.congAvgMs,
        postIncongMs: postSessionStats.incongAvgMs,
        postDiffD: postSessionStats.diffD,
        postAccuracy: postSessionStats.accuracyPct,
        postResponses: postSessionResponses,
        // Delta D
        deltaD: deltaD
      };

      // Save combined record into localStorage
      saveResearchRecord(masterRecord);

      // Save individual Post session for logs
      saveIndividualSession({
        id: Date.now() + 1,
        participantName: currentParticipantName,
        campName: currentCampName,
        sessionPhase: 'POST',
        phaseLabel: 'Post-test',
        modeName: selectedConditionMode,
        dateTimeStr: nowStr,
        ...postSessionStats,
        responses: postSessionResponses
      });

      // Automatically Send to Google Sheets if Webhook URL is set
      sendRecordToGoogleSheets(masterRecord);

    } else {
      // Single phase run (PRE or POST manually chosen)
      const singleRecord = {
        id: Date.now(),
        participantName: currentParticipantName,
        campName: currentCampName,
        sessionPhase: currentSessionPhase,
        phaseLabel: currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test',
        modeName: selectedConditionMode,
        dateTimeStr: nowStr,
        ...postSessionStats,
        responses: postSessionResponses
      };
      saveIndividualSession(singleRecord);

      // Also create a research record row
      const isPost = currentSessionPhase === 'POST';
      saveResearchRecord({
        id: Date.now(),
        participantName: currentParticipantName,
        campName: currentCampName,
        dateTimeStr: nowStr,
        modeName: selectedConditionMode,
        preCongMs: !isPost ? postSessionStats.congAvgMs : '-',
        preIncongMs: !isPost ? postSessionStats.incongAvgMs : '-',
        preDiffD: !isPost ? postSessionStats.diffD : '-',
        preAccuracy: !isPost ? postSessionStats.accuracyPct : '-',
        preResponses: !isPost ? postSessionResponses : [],
        postCongMs: isPost ? postSessionStats.congAvgMs : '-',
        postIncongMs: isPost ? postSessionStats.incongAvgMs : '-',
        postDiffD: isPost ? postSessionStats.diffD : '-',
        postAccuracy: isPost ? postSessionStats.accuracyPct : '-',
        postResponses: isPost ? postSessionResponses : [],
        deltaD: '-'
      });
    }

    updateRecordCounts();

    // Prepare currentSessionData in case Researcher views Results screen
    currentSessionData = {
      id: Date.now(),
      participantName: currentParticipantName,
      sessionPhase: currentSessionPhase,
      phaseLabel: currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test',
      modeName: selectedConditionMode,
      dateTimeStr: nowStr,
      ...postSessionStats,
      responses: postSessionResponses
    };

    // --- SWITCH TO PARTICIPANT DONE SCREEN (NO TEST SCORES SHOWN) ---
    showParticipantDoneScreen(nowStr);
  }

  // --- BREAK / REST SCREEN LOGIC ---
  function startBreakScreen() {
    switchScreen(screenBreak);
    breakElapsedSec = 0;
    if (breakTimerDisplay) breakTimerDisplay.textContent = '00:00';

    clearInterval(breakTimerInterval);
    breakTimerInterval = setInterval(() => {
      breakElapsedSec++;
      const mins = String(Math.floor(breakElapsedSec / 60)).padStart(2, '0');
      const secs = String(breakElapsedSec % 60).padStart(2, '0');
      if (breakTimerDisplay) breakTimerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function startPostRound() {
    clearInterval(breakTimerInterval);
    currentSessionPhase = 'POST';
    totalTrialCount = parseInt(trialCountSelect.value, 10) || 15;
    trialList = generateTrials(totalTrialCount, selectedConditionMode);
    currentTrialIndex = 0;
    userResponses = [];

    switchScreen(screenTest);
    runCountdown('POST', () => {
      startTrial();
    });
  }

  // --- PARTICIPANT DONE SCREEN (NO SCORES / BIAS) ---
  function showParticipantDoneScreen(timestampStr) {
    if (doneParticipantId) doneParticipantId.textContent = currentParticipantName;
    if (doneDatetime) doneDatetime.textContent = timestampStr;
    if (doneModeLabel) {
      doneModeLabel.textContent = isAutoPrePostMode 
        ? 'ครบ 2 ช่วง (Pre-test ➔ Post-test)' 
        : (currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test');
    }

    const hasWebhook = localStorage.getItem('stroop_sheets_webhook_url');
    if (doneCloudStatus) {
      if (hasWebhook) {
        doneCloudStatus.className = 'done-cloud-status success';
        doneCloudStatus.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> บันทึกข้อมูลและส่งเข้า Google Sheets เรียบร้อยแล้ว';
      } else {
        doneCloudStatus.className = 'done-cloud-status success';
        doneCloudStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> บันทึกข้อมูลการทดสอบเข้าสู่ระบบเรียบร้อยแล้ว';
      }
    }

    switchScreen(screenParticipantDone);

    if (autoDownloadCsvCheckbox && autoDownloadCsvCheckbox.checked) {
      setTimeout(() => {
        downloadCurrentParticipantCSV();
      }, 700);
    }
  }

  function handleNextParticipant() {
    const nextId = getNextParticipantId(currentParticipantName);
    currentParticipantName = nextId;
    if (participantNameInput) participantNameInput.value = nextId;

    preSessionResponses = [];
    preSessionStats = null;
    userResponses = [];
    currentTrialIndex = 0;

    switchScreen(screenStart);
  }

  function getNextParticipantId(currentId) {
    if (!currentId) return 'P01';
    const match = currentId.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = parseInt(numStr, 10) + 1;
      const padded = String(nextNum).padStart(numStr.length, '0');
      return `${prefix}${padded}`;
    }
    return currentId + '_2';
  }

  // --- STATS CALCULATION HELPER (CORRECT TRIALS ONLY FOR RESEARCH) ---
  function calculatePhaseStats(responses) {
    const totalCount = responses.length;
    const correctResponses = responses.filter(r => r.isCorrect);
    const correctCount = correctResponses.length;
    const accuracyPct = totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(1) : '0.0';

    let avgRtMs = 0;
    let avgRtSec = '0.000';
    let fastestRtSec = '0.000';
    let slowestRtSec = '0.000';

    if (totalCount > 0) {
      const totalMs = responses.reduce((acc, r) => acc + r.reactionTimeMs, 0);
      avgRtMs = Math.round(totalMs / totalCount);
      avgRtSec = (avgRtMs / 1000).toFixed(3);

      const timesSec = responses.map(r => r.reactionTimeSec);
      fastestRtSec = Math.min(...timesSec).toFixed(3);
      slowestRtSec = Math.max(...timesSec).toFixed(3);
    }

    const congResponses = responses.filter(r => r.isCongruent);
    const incongResponses = responses.filter(r => !r.isCongruent);

    const congCorrect = congResponses.filter(r => r.isCorrect);
    const incongCorrect = incongResponses.filter(r => r.isCorrect);

    // Standard Stroop Research Protocol: Calculate RT for Correct Trials Only
    const congAvgMs = congCorrect.length > 0
      ? Math.round(congCorrect.reduce((a, r) => a + r.reactionTimeMs, 0) / congCorrect.length)
      : (congResponses.length > 0 ? Math.round(congResponses.reduce((a, r) => a + r.reactionTimeMs, 0) / congResponses.length) : 0);

    const incongAvgMs = incongCorrect.length > 0
      ? Math.round(incongCorrect.reduce((a, r) => a + r.reactionTimeMs, 0) / incongCorrect.length)
      : (incongResponses.length > 0 ? Math.round(incongResponses.reduce((a, r) => a + r.reactionTimeMs, 0) / incongResponses.length) : 0);

    const stroopInterferenceMs = incongAvgMs - congAvgMs;

    return {
      totalCount: totalCount,
      correctCount: correctCount,
      accuracyPct: accuracyPct,
      congAvgMs: congAvgMs,
      incongAvgMs: incongAvgMs,
      diffD: stroopInterferenceMs,
      avgRtMs: avgRtMs,
      avgRtSec: avgRtSec,
      fastestRtSec: fastestRtSec,
      slowestRtSec: slowestRtSec
    };
  }

  function getFormattedDate() {
    const now = new Date();
    return `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // --- LOCALSTORAGE DATA MANAGEMENT ---
  function getResearchRecords() {
    try {
      const data = localStorage.getItem('stroop_research_records');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveResearchRecord(record) {
    const records = getResearchRecords();
    // Update existing participant record or prepend new
    const existingIndex = records.findIndex(r => r.participantName === record.participantName);
    if (existingIndex >= 0) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      records.push(record);
    }
    try {
      localStorage.setItem('stroop_research_records', JSON.stringify(records));
    } catch (e) {
      console.warn('Could not save research record', e);
    }
  }

  function getIndividualSessions() {
    try {
      const data = localStorage.getItem('stroop_pro_history');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveIndividualSession(sessionData) {
    const history = getIndividualSessions();
    history.unshift(sessionData);
    try {
      localStorage.setItem('stroop_pro_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save session history', e);
    }
  }

  function updateRecordCounts() {
    const records = getResearchRecords();
    const sessions = getIndividualSessions();
    if (adminBadgeCount) adminBadgeCount.textContent = records.length;
    if (adminSessionCount) adminSessionCount.textContent = sessions.length;
  }

  // --- ADMIN PORTAL LOGIC ---
  function openAdminPortal() {
    if (!isAdminUnlocked) {
      if (adminPinInput) adminPinInput.value = '';
      if (modalAdminAuth) modalAdminAuth.classList.add('active');
    } else {
      showAdminModal();
    }
  }

  function handleAdminAuthSubmit(e) {
    if (e) e.preventDefault();
    const pin = (adminPinInput ? adminPinInput.value.trim() : '');
    // Default PIN: 'admin' (or empty / '1234')
    if (pin === 'admin' || pin === '1234' || pin === '') {
      isAdminUnlocked = true;
      if (modalAdminAuth) modalAdminAuth.classList.remove('active');
      showAdminModal();
    } else {
      alert('รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้นคือ admin)');
    }
  }

  function showAdminModal() {
    try { renderAdminResearchTables(); } catch (e) { console.error('Error rendering research tables:', e); }
    try { renderMasterComparisonTable(); } catch (e) { console.error('Error rendering master table:', e); }
    try { renderIndividualSessionsTable(); } catch (e) { console.error('Error rendering individual sessions:', e); }
    try { renderRawTrialsTable(); } catch (e) { console.error('Error rendering raw trials table:', e); }
    try { loadSheetsWebhookUrl(); } catch (e) { console.error('Error loading sheets url:', e); }
    if (modalAdmin) modalAdmin.classList.add('active');
  }

  // --- TAB 1: RENDER PRE & POST RESEARCH TABLES (EXACTLY AS IN USER'S IMAGE) ---
  function renderAdminResearchTables() {
    const records = getResearchRecords();

    // 1. Render Pre-test Table
    if (preResearchTableBody && preResearchTableFoot) {
      preResearchTableBody.innerHTML = '';
      preResearchTableFoot.innerHTML = '';

      if (records.length === 0) {
        preResearchTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="color: var(--text-muted); padding: 2rem;">
              ยังไม่มีข้อมูลการทดสอบในระบบ
            </td>
          </tr>
        `;
      } else {
        let sumC = 0, sumI = 0, sumD = 0, countPre = 0;

        records.forEach(r => {
          const c = r.preCongMs;
          const i = r.preIncongMs;
          const d = (c !== '-' && i !== '-') ? (i - c) : '-';
          const dStr = d !== '-' ? (d > 0 ? `+${d}` : `${d}`) : '-';

          if (typeof c === 'number' && typeof i === 'number') {
            sumC += c;
            sumI += i;
            sumD += (i - c);
            countPre++;
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="participant-col"><strong>${r.participantName}</strong></td>
            <td>${c !== '-' ? c : '-'}</td>
            <td>${i !== '-' ? i : '-'}</td>
            <td class="diff-col">${dStr}</td>
          `;
          preResearchTableBody.appendChild(tr);
        });

        if (countPre > 0) {
          const meanC = Math.round(sumC / countPre);
          const meanI = Math.round(sumI / countPre);
          const meanD = Math.round(sumD / countPre);
          const meanDStr = meanD > 0 ? `+${meanD}` : `${meanD}`;

          preResearchTableFoot.innerHTML = `
            <tr>
              <td><strong>ค่าเฉลี่ย (Mean)</strong></td>
              <td>${meanC}</td>
              <td>${meanI}</td>
              <td class="diff-col">${meanDStr}</td>
            </tr>
          `;
        }
      }
    }

    // 2. Render Post-test Table
    if (postResearchTableBody && postResearchTableFoot) {
      postResearchTableBody.innerHTML = '';
      postResearchTableFoot.innerHTML = '';

      if (records.length === 0) {
        postResearchTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="color: var(--text-muted); padding: 2rem;">
              ยังไม่มีข้อมูลการทดสอบในระบบ
            </td>
          </tr>
        `;
      } else {
        let sumC = 0, sumI = 0, sumD = 0, countPost = 0;

        records.forEach(r => {
          const c = r.postCongMs;
          const i = r.postIncongMs;
          const d = (c !== '-' && i !== '-') ? (i - c) : '-';
          const dStr = d !== '-' ? (d > 0 ? `+${d}` : `${d}`) : '-';

          if (typeof c === 'number' && typeof i === 'number') {
            sumC += c;
            sumI += i;
            sumD += (i - c);
            countPost++;
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="participant-col"><strong>${r.participantName}</strong></td>
            <td>${c !== '-' ? c : '-'}</td>
            <td>${i !== '-' ? i : '-'}</td>
            <td class="diff-col">${dStr}</td>
          `;
          postResearchTableBody.appendChild(tr);
        });

        if (countPost > 0) {
          const meanC = Math.round(sumC / countPost);
          const meanI = Math.round(sumI / countPost);
          const meanD = Math.round(sumD / countPost);
          const meanDStr = meanD > 0 ? `+${meanD}` : `${meanD}`;

          postResearchTableFoot.innerHTML = `
            <tr>
              <td><strong>ค่าเฉลี่ย (Mean)</strong></td>
              <td>${meanC}</td>
              <td>${meanI}</td>
              <td class="diff-col">${meanDStr}</td>
            </tr>
          `;
        }
      }
    }
  }

  // --- CLIPBOARD COPY HELPERS FOR GOOGLE SHEETS (1-CLICK TSV) ---
  function copyPreTableToClipboard() {
    const records = getResearchRecords();
    if (records.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับคัดลอก');
      return;
    }

    let tsv = 'ผู้เข้าร่วม\tCongruent (ms)\tIncongruent (ms)\tผลต่าง D = I - C\n';
    let sumC = 0, sumI = 0, sumD = 0, count = 0;

    records.forEach(r => {
      const c = r.preCongMs !== '-' ? r.preCongMs : '';
      const i = r.preIncongMs !== '-' ? r.preIncongMs : '';
      const d = (c !== '' && i !== '') ? (i - c) : '';
      const dStr = d !== '' ? (d > 0 ? `+${d}` : `${d}`) : '';

      if (typeof c === 'number' && typeof i === 'number') {
        sumC += c; sumI += i; sumD += (i - c); count++;
      }

      tsv += `${r.participantName}\t${c}\t${i}\t${dStr}\n`;
    });

    if (count > 0) {
      const meanC = Math.round(sumC / count);
      const meanI = Math.round(sumI / count);
      const meanD = Math.round(sumD / count);
      tsv += `ค่าเฉลี่ย (Mean)\t${meanC}\t${meanI}\t${meanD > 0 ? '+' : ''}${meanD}\n`;
    }

    copyTextToClipboard(tsv, btnCopyPreTable, 'คัดลอกตาราง Pre ลง Sheet แล้ว!');
  }

  function copyPostTableToClipboard() {
    const records = getResearchRecords();
    if (records.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับคัดลอก');
      return;
    }

    let tsv = 'ผู้เข้าร่วม\tCongruent (ms)\tIncongruent (ms)\tผลต่าง D = I - C\n';
    let sumC = 0, sumI = 0, sumD = 0, count = 0;

    records.forEach(r => {
      const c = r.postCongMs !== '-' ? r.postCongMs : '';
      const i = r.postIncongMs !== '-' ? r.postIncongMs : '';
      const d = (c !== '' && i !== '') ? (i - c) : '';
      const dStr = d !== '' ? (d > 0 ? `+${d}` : `${d}`) : '';

      if (typeof c === 'number' && typeof i === 'number') {
        sumC += c; sumI += i; sumD += (i - c); count++;
      }

      tsv += `${r.participantName}\t${c}\t${i}\t${dStr}\n`;
    });

    if (count > 0) {
      const meanC = Math.round(sumC / count);
      const meanI = Math.round(sumI / count);
      const meanD = Math.round(sumD / count);
      tsv += `ค่าเฉลี่ย (Mean)\t${meanC}\t${meanI}\t${meanD > 0 ? '+' : ''}${meanD}\n`;
    }

    copyTextToClipboard(tsv, btnCopyPostTable, 'คัดลอกตาราง Post ลง Sheet แล้ว!');
  }

  function copyBothTablesToClipboard() {
    const records = getResearchRecords();
    if (records.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับคัดลอก');
      return;
    }

    let tsv = '=== ตารางที่ 1: Pre-test (ก่อนการทดลอง) ===\n';
    tsv += 'ผู้เข้าร่วม\tCongruent (ms)\tIncongruent (ms)\tผลต่าง D = I - C\n';
    records.forEach(r => {
      const c = r.preCongMs !== '-' ? r.preCongMs : '';
      const i = r.preIncongMs !== '-' ? r.preIncongMs : '';
      const d = (c !== '' && i !== '') ? (i - c) : '';
      tsv += `${r.participantName}\t${c}\t${i}\t${d !== '' ? (d > 0 ? `+${d}` : d) : ''}\n`;
    });

    tsv += '\n=== ตารางที่ 2: Post-test (หลังการทดลอง) ===\n';
    tsv += 'ผู้เข้าร่วม\tCongruent (ms)\tIncongruent (ms)\tผลต่าง D = I - C\n';
    records.forEach(r => {
      const c = r.postCongMs !== '-' ? r.postCongMs : '';
      const i = r.postIncongMs !== '-' ? r.postIncongMs : '';
      const d = (c !== '' && i !== '') ? (i - c) : '';
      tsv += `${r.participantName}\t${c}\t${i}\t${d !== '' ? (d > 0 ? `+${d}` : d) : ''}\n`;
    });

    copyTextToClipboard(tsv, btnCopyBothTables, 'คัดลอกข้อมูลทั้ง 2 ตารางแล้ว! วางใน Sheet ได้เลย');
  }

  function copyMasterTableToClipboard() {
    const records = getResearchRecords();
    if (records.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับคัดลอก');
      return;
    }

    let tsv = 'ผู้เข้าร่วม\tPre Congruent (ms)\tPre Incongruent (ms)\tPre ผลต่าง D (ms)\tPost Congruent (ms)\tPost Incongruent (ms)\tPost ผลต่าง D (ms)\tDelta D (Post - Pre)\tการเปลี่ยนแปลง\n';

    records.forEach(r => {
      const preC = r.preCongMs !== '-' ? r.preCongMs : '';
      const preI = r.preIncongMs !== '-' ? r.preIncongMs : '';
      const preD = (preC !== '' && preI !== '') ? (preI - preC) : '';
      const preDStr = preD !== '' ? (preD > 0 ? `+${preD}` : `${preD}`) : '';

      const postC = r.postCongMs !== '-' ? r.postCongMs : '';
      const postI = r.postIncongMs !== '-' ? r.postIncongMs : '';
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

      tsv += `${r.participantName}\t${preC}\t${preI}\t${preDStr}\t${postC}\t${postI}\t${postDStr}\t${deltaDStr}\t${changeText}\n`;
    });

    copyTextToClipboard(tsv, btnCopyMasterTable, 'คัดลอกตาราง Master ลง Sheet แล้ว!');
  }

  function copyTextToClipboard(text, btnElement, successMsg) {
    const doSuccess = () => {
      if (btnElement) {
        const orig = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> ${successMsg}`;
        btnElement.style.outline = '2px solid #34d399';
        setTimeout(() => {
          btnElement.innerHTML = orig;
          btnElement.style.outline = '';
        }, 2500);
      }
    };

    // Fallback for file:// protocol (execCommand)
    const doFallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) doSuccess();
        else console.warn('execCommand copy returned false');
      } catch (err) {
        document.body.removeChild(ta);
        console.warn('Fallback clipboard copy failed', err);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(doSuccess)
        .catch(() => doFallback()); // file:// -> fallback
    } else {
      doFallback();
    }
  }

  // --- TAB 2: MASTER PRE VS POST COMPARISON TABLE ---
  function renderMasterComparisonTable() {
    if (!masterResearchTableBody) return;
    const records = getResearchRecords();
    masterResearchTableBody.innerHTML = '';

    if (records.length === 0) {
      masterResearchTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="color: var(--text-muted); padding: 2.5rem; text-align: center;">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
            ยังไม่มีข้อมูลประวัติผู้ทดสอบในระบบ
          </td>
        </tr>
      `;
      return;
    }

    records.forEach(r => {
      const preC = r.preCongMs;
      const preI = r.preIncongMs;
      const preD = (preC !== '-' && preI !== '-') ? (preI - preC) : '-';
      const preDStr = preD !== '-' ? (preD > 0 ? `+${preD}` : `${preD}`) : '-';

      const postC = r.postCongMs;
      const postI = r.postIncongMs;
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
        <td><strong>${r.participantName}</strong></td>
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

  // --- TAB 3: GOOGLE SHEETS WEBHOOK INTEGRATION (NO DATABASE NEEDED) ---
  function handleSaveSheetsUrl() {
    const url = googleSheetsUrlInput.value.trim();
    if (!url) {
      localStorage.removeItem('stroop_sheets_webhook_url');
      updateWebhookBadge('');
      alert('ลบการเชื่อมต่อ Google Sheets แล้ว');
      return;
    }
    if (!url.startsWith('https://script.google.com/macros/s/')) {
      alert('URL ต้องขึ้นต้นด้วย https://script.google.com/macros/s/...');
      return;
    }
    localStorage.setItem('stroop_sheets_webhook_url', url);
    updateWebhookBadge(url);
    alert('บันทึก Google Apps Script Web App URL เรียบร้อยแล้ว!');
  }

  async function sendRecordToGoogleSheets(record) {
    const url = localStorage.getItem('stroop_sheets_webhook_url');
    if (!url || !url.startsWith('http')) return false;

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_record',
          record: record
        })
      });
      return true;
    } catch (err) {
      console.warn('Google Sheets auto-sync error', err);
      return false;
    }
  }

  async function handleSyncAllToSheets() {
    const url = localStorage.getItem('stroop_sheets_webhook_url');
    if (!url || !url.startsWith('http')) {
      alert('กรุณากรอกและบันทึก Google Apps Script Web App URL ก่อนกดซิงค์');
      return;
    }

    const records = getResearchRecords();
    if (records.length === 0) {
      alert('ยังไม่มีข้อมูลผู้เข้าร่วมในระบบสำหรับส่ง');
      return;
    }

    try {
      if (btnSyncAllSheets) {
        btnSyncAllSheets.disabled = true;
        btnSyncAllSheets.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งข้อมูล...';
      }

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          records: records
        })
      });

      alert(`ส่งข้อมูลผู้เข้าร่วมทั้งหมด (${records.length} คน) ไปยัง Google Sheet เรียบร้อยแล้ว!`);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    } finally {
      if (btnSyncAllSheets) {
        btnSyncAllSheets.disabled = false;
        btnSyncAllSheets.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> ส่งข้อมูลผู้เข้าร่วมทั้งหมดเข้า Google Sheet ทันที (Sync All)';
      }
    }
  }

  async function handleTestSheetsConnection() {
    const url = localStorage.getItem('stroop_sheets_webhook_url');
    if (!url || !url.startsWith('http')) {
      alert('กรุณากรอกและบันทึก URL ก่อนทดสอบ');
      return;
    }

    const sample = {
      participantName: 'P_TEST',
      dateTimeStr: getFormattedDate(),
      preCongMs: 500,
      preIncongMs: 650,
      preDiffD: 150,
      postCongMs: 480,
      postIncongMs: 580,
      postDiffD: 100,
      deltaD: -50,
      preAccuracy: '100.0',
      postAccuracy: '100.0'
    };

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_record',
          record: sample
        })
      });
      alert('ส่งข้อมูลทดสอบ P_TEST เรียบร้อยแล้ว! กรุณาเปิดดูใน Google Sheet ของคุณว่ามีแถวใหม่เพิ่มขึ้นมาหรือไม่');
    } catch (err) {
      alert('ทดสอบล้มเหลว: ' + err.message);
    }
  }

  function copyAppsScriptCode() {
    const codeEl = document.getElementById('apps-script-code-block');
    if (!codeEl) return;
    navigator.clipboard.writeText(codeEl.textContent).then(() => {
      if (btnCopyAppsScriptCode) {
        const orig = btnCopyAppsScriptCode.innerHTML;
        btnCopyAppsScriptCode.innerHTML = '<i class="fa-solid fa-check"></i> คัดลอกโค้ดแล้ว!';
        setTimeout(() => { btnCopyAppsScriptCode.innerHTML = orig; }, 2500);
      }
    });
  }

  // --- TAB 5: INDIVIDUAL SESSIONS TABLE ---
  function renderIndividualSessionsTable() {
    if (!historyTableBody) return;
    const history = getIndividualSessions();
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

      const cMs = item.congAvgMs !== undefined ? item.congAvgMs : '-';
      const iMs = item.incongAvgMs !== undefined ? item.incongAvgMs : '-';
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
            <button class="glass-btn secondary sm btn-view-session" title="ดูผลลัพธ์ละเอียด">
              <i class="fa-solid fa-eye"></i> ดูผล
            </button>
            <button class="icon-btn sm btn-delete-item" title="ลบรายการนี้">
              <i class="fa-solid fa-trash-can" style="color: var(--accent-red); font-size: 0.85rem;"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-view-session').addEventListener('click', () => loadDetailedResultView(item));
      tr.querySelector('.btn-delete-item').addEventListener('click', () => deleteHistoryItem(item.id));
      historyTableBody.appendChild(tr);
    });
  }

  function loadDetailedResultView(sessionData) {
    currentParticipantName = sessionData.participantName;
    userResponses = sessionData.responses || [];
    selectedConditionMode = sessionData.modeName;
    currentSessionPhase = sessionData.sessionPhase || 'PRE';
    currentSessionData = sessionData;

    resParticipantName.textContent = sessionData.participantName;
    resDateTime.textContent = sessionData.dateTimeStr;
    if (resCampName && resCampInfo) {
      if (sessionData.campName) {
        resCampName.textContent = sessionData.campName;
        resCampInfo.style.display = 'inline';
      } else {
        resCampInfo.style.display = 'none';
      }
    }

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

    resAvgCorrectRtSec.textContent = `${sessionData.avgRtSec || '0.000'} s`;
    resAvgCorrectRtMs.textContent = `(${sessionData.avgRtMs || 0} ms)`;

    resFastestRt.textContent = `เร็วสุด: ${sessionData.fastestRtSec || '0.000'} s`;
    resSlowestRt.textContent = `ช้าสุด: ${sessionData.slowestRtSec || '0.000'} s`;

    const diffD = sessionData.diffD !== undefined ? sessionData.diffD : 0;
    resStroopEffect.textContent = `${diffD > 0 ? '+' : ''}${(diffD / 1000).toFixed(3)} s`;
    resStroopDetail.textContent = `(ส่วนต่างเวลาสับสนสี D = I - C: ${diffD > 0 ? '+' : ''}${diffD} ms)`;

    populate4ConditionsTable();
    populateTrialTable();

    if (modalAdmin) modalAdmin.classList.remove('active');
    switchScreen(screenResults);
  }

  function populate4ConditionsTable() {
    if (!condTableBody) return;
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
    if (!trialsTableBody) return;
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
        <td><span class="chip ${r.inkColorKey}"><i class="fa-solid fa-circle"></i> ${colorMap[r.inkColorKey] || r.inkColorKey}</span></td>
        <td>${r.userAnswerText}</td>
        <td>${statusBadge}</td>
        <td class="num-font highlight">${r.reactionTimeSec.toFixed(3)} s</td>
        <td class="num-font">${Math.round(r.reactionTimeMs)} ms</td>
      `;
      trialsTableBody.appendChild(tr);
    });
  }

  function deleteHistoryItem(id) {
    let history = getIndividualSessions();
    history = history.filter(h => h.id !== id);
    localStorage.setItem('stroop_pro_history', JSON.stringify(history));
    renderIndividualSessionsTable();
    updateRecordCounts();
  }

  function clearAllHistory() {
    if (confirm('คุณต้องการลบข้อมูลผลการทดสอบทั้งหมดใช่หรือไม่?')) {
      localStorage.removeItem('stroop_pro_history');
      localStorage.removeItem('stroop_research_records');
      renderAdminResearchTables();
      renderMasterComparisonTable();
      renderIndividualSessionsTable();
      updateRecordCounts();
      alert('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
    }
  }

  // --- LOAD SAMPLE DATA (P01–P05 จากรูปแบบ CSV เดิม) ---
  function loadSampleData() {
    const existingRecords = getResearchRecords();
    if (existingRecords.length > 0) {
      if (!confirm(`ระบบมีข้อมูลอยู่แล้ว ${existingRecords.length} คน ต้องการเพิ่มข้อมูลตัวอย่าง P01–P05 เพิ่มเติมหรือไม่?\n(ข้อมูลเดิมจะไม่ถูกลบ)`)) {
        return;
      }
    }

    // ข้อมูลตัวอย่าง P01–P05 ตรงตามรูปแบบ CSV Stroop_PrePost_Research_Summary.csv
    const SAMPLE_DATA = [
      { participantName: 'P01', preCongMs: 500, preIncongMs: 650, postCongMs: 480, postIncongMs: 580 },
      { participantName: 'P02', preCongMs: 550, preIncongMs: 700, postCongMs: 520, postIncongMs: 630 },
      { participantName: 'P03', preCongMs: 480, preIncongMs: 600, postCongMs: 460, postIncongMs: 550 },
      { participantName: 'P04', preCongMs: 520, preIncongMs: 680, postCongMs: 500, postIncongMs: 610 },
      { participantName: 'P05', preCongMs: 510, preIncongMs: 660, postCongMs: 490, postIncongMs: 590 }
    ];

    const nowStr = getFormattedDate();
    let addedCount = 0;

    SAMPLE_DATA.forEach(item => {
      // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
      const records = getResearchRecords();
      const alreadyExists = records.some(r => r.participantName === item.participantName);
      if (alreadyExists) return;

      const preDiffD = item.preIncongMs - item.preCongMs;
      const postDiffD = item.postIncongMs - item.postCongMs;
      const deltaD = postDiffD - preDiffD;

      const record = {
        id: Date.now() + addedCount,
        participantName: item.participantName,
        campName: 'ข้อมูลตัวอย่าง (Demo)',
        dateTimeStr: nowStr,
        modeName: 'ALL_MIXED',
        // Pre-test Metrics
        preCongMs: item.preCongMs,
        preIncongMs: item.preIncongMs,
        preDiffD: preDiffD,
        preAccuracy: '100.0',
        preResponses: [],
        // Post-test Metrics
        postCongMs: item.postCongMs,
        postIncongMs: item.postIncongMs,
        postDiffD: postDiffD,
        postAccuracy: '100.0',
        postResponses: [],
        // Delta D
        deltaD: deltaD
      };

      saveResearchRecord(record);
      addedCount++;
    });

    if (addedCount === 0) {
      alert('ข้อมูลตัวอย่าง P01–P05 มีอยู่ในระบบแล้วทั้งหมด ไม่มีรายการที่ต้องเพิ่ม');
      return;
    }

    // อัพเดตทุกตาราง
    renderAdminResearchTables();
    renderMasterComparisonTable();
    renderIndividualSessionsTable();
    updateRecordCounts();

    if (btnLoadSampleData) {
      const orig = btnLoadSampleData.innerHTML;
      btnLoadSampleData.innerHTML = '<i class="fa-solid fa-check"></i> โหลดข้อมูลตัวอย่างสำเร็จ!';
      btnLoadSampleData.style.background = 'rgba(52,211,153,0.2)';
      setTimeout(() => {
        btnLoadSampleData.innerHTML = orig;
        btnLoadSampleData.style.background = '';
      }, 3000);
    }

    console.info(`โหลดข้อมูลตัวอย่างสำเร็จ: เพิ่ม ${addedCount} รายการ (P01–P05)`);
  }

  // --- EXPORT MASTER RESEARCH CSV ---
  function exportMasterSummaryCSV() {
    const records = getResearchRecords();
    if (records.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'ตารางสรุปผลการวิจัย Stroop Effect (สำหรับ Google Sheets / Excel)\n';
    csvContent += `วันที่ส่งออก,${new Date().toLocaleString('th-TH')}\n`;
    csvContent += `จำนวนผู้เข้าร่วมทั้งหมด,${records.length}\n\n`;

    csvContent += '=== ตารางที่ 1: Pre-test (ก่อนการทดลอง) ===\n';
    csvContent += 'ผู้เข้าร่วม,Congruent (ms),Incongruent (ms),ผลต่าง D = I - C\n';
    records.forEach(r => {
      const c = r.preCongMs !== '-' ? r.preCongMs : '';
      const i = r.preIncongMs !== '-' ? r.preIncongMs : '';
      const d = (c !== '' && i !== '') ? (i - c) : '';
      const dStr = d !== '' ? (d > 0 ? `+${d}` : `${d}`) : '';
      csvContent += `"${r.participantName}",${c},${i},${dStr}\n`;
    });

    csvContent += '\n=== ตารางที่ 2: Post-test (หลังการทดลอง) ===\n';
    csvContent += 'ผู้เข้าร่วม,Congruent (ms),Incongruent (ms),ผลต่าง D = I - C\n';
    records.forEach(r => {
      const c = r.postCongMs !== '-' ? r.postCongMs : '';
      const i = r.postIncongMs !== '-' ? r.postIncongMs : '';
      const d = (c !== '' && i !== '') ? (i - c) : '';
      const dStr = d !== '' ? (d > 0 ? `+${d}` : `${d}`) : '';
      csvContent += `"${r.participantName}",${c},${i},${dStr}\n`;
    });

    csvContent += '\n=== ตารางที่ 3: สรุปเปรียบเทียบ Pre vs Post ===\n';
    csvContent += 'ผู้เข้าร่วม,Pre Congruent,Pre Incongruent,Pre ผลต่าง D,Post Congruent,Post Incongruent,Post ผลต่าง D,Delta D (Post - Pre),การเปลี่ยนแปลง\n';
    records.forEach(r => {
      const preC = r.preCongMs !== '-' ? r.preCongMs : '';
      const preI = r.preIncongMs !== '-' ? r.preIncongMs : '';
      const preD = (preC !== '' && preI !== '') ? (preI - preC) : '';
      const preDStr = preD !== '' ? (preD > 0 ? `+${preD}` : `${preD}`) : '';

      const postC = r.postCongMs !== '-' ? r.postCongMs : '';
      const postI = r.postIncongMs !== '-' ? r.postIncongMs : '';
      const postD = (postC !== '' && postI !== '') ? (postI - postC) : '';
      const postDStr = postD !== '' ? (postD > 0 ? `+${postD}` : `${postD}`) : '';

      let deltaDStr = '';
      let changeText = '-';
      if (preD !== '' && postD !== '') {
        const delta = postD - preD;
        deltaDStr = delta > 0 ? `+${delta}` : `${delta}`;
        changeText = delta < 0 ? `ลดลง ${Math.abs(delta)} ms` : (delta > 0 ? `เพิ่มขึ้น ${delta} ms` : 'เท่าเดิม');
      }

      csvContent += `"${r.participantName}",${preC},${preI},${preDStr},${postC},${postI},${postDStr},${deltaDStr},"${changeText}"\n`;
    });

    downloadFile(csvContent, `Stroop_PrePost_Research_Summary_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportAllRawTrialsCSV() {
    const history = getIndividualSessions();
    if (history.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'Trial,Participant,Phase,Session Date,Condition,Prompt Text,Ink Color,User Answer,Correct Answer,Status,Reaction Time (s),Reaction Time (ms),Is Congruent\n';

    history.forEach(session => {
      const phase = session.phaseLabel || (session.sessionPhase === 'POST' ? 'Post-test' : 'Pre-test');
      (session.responses || []).forEach(r => {
        const statusStr = r.isCorrect ? 'Correct' : (r.isTimeout ? 'Timeout' : 'Incorrect');
        csvContent += `${r.trialNo},"${session.participantName}","${phase}","${session.dateTimeStr}","${r.condCode}","${r.promptText}",${r.inkColorKey},"${r.userAnswerText}","${r.correctAnswerText}",${statusStr},${r.reactionTimeSec},${Math.round(r.reactionTimeMs)},${r.isCongruent ? 'Yes' : 'No'}\n`;
      });
    });

    downloadFile(csvContent, `Stroop_Master_Raw_Trials_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportAllRawTrialsJSON() {
    const history = getIndividualSessions();
    if (history.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับส่งออก');
      return;
    }
    downloadFile(JSON.stringify(history, null, 2), `Stroop_Master_All_Trials_${Date.now()}.json`, 'application/json');
  }


  // --- DOWNLOAD CURRENT PARTICIPANT CSV (SUMMARY + RAW TRIALS) ---
  function downloadCurrentParticipantCSV() {
    const pName = currentParticipantName || 'Participant';
    const camp = currentCampName || '-';
    const nowStr = getFormattedDate();
    const mode = selectedConditionMode || 'ALL_MIXED';

    let allTrials = [];
    if (preSessionResponses && preSessionResponses.length > 0) {
      preSessionResponses.forEach(r => {
        allTrials.push({ ...r, phaseLabel: 'Pre-test' });
      });
    }
    if (postSessionResponses && postSessionResponses.length > 0) {
      postSessionResponses.forEach(r => {
        allTrials.push({ ...r, phaseLabel: isAutoPrePostMode ? 'Post-test' : (currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test') });
      });
    }
    if (allTrials.length === 0 && userResponses && userResponses.length > 0) {
      userResponses.forEach(r => {
        allTrials.push({ ...r, phaseLabel: currentSessionPhase === 'POST' ? 'Post-test' : 'Pre-test' });
      });
    }

    if (allTrials.length === 0) {
      // Fallback: Check if we have individual sessions in storage
      const sessions = getIndividualSessions();
      const mySessions = sessions.filter(s => s.participantName === pName);
      if (mySessions.length > 0) {
        mySessions.forEach(s => {
          (s.responses || []).forEach(r => {
            allTrials.push({ ...r, phaseLabel: s.phaseLabel || (s.sessionPhase === 'POST' ? 'Post-test' : 'Pre-test') });
          });
        });
      }
    }

    if (allTrials.length === 0) {
      alert('ยังไม่มีข้อมูลการทดสอบสำหรับดาวน์โหลด');
      return;
    }

    let csvContent = '\uFEFF';
    // 1. Participant & Test Info Header
    csvContent += `รหัสผู้ทดสอบ (Participant),${pName}\n`;
    csvContent += `กลุ่ม/ค่าย (Camp),${camp}\n`;
    csvContent += `รูปแบบ (Mode),${mode}\n`;
    csvContent += `วันที่และเวลา (Date/Time),${nowStr}\n\n`;

    // 2. Summary of Pre / Post (if available)
    if (preSessionStats || postSessionStats) {
      csvContent += '=== สรุปผลภาพรวม (Summary) ===\n';
      csvContent += 'รอบ (Phase),Congruent (ms),Incongruent (ms),ผลต่าง D = I - C (ms),ความถูกต้อง (%),จำนวนข้อที่ถูก\n';
      if (preSessionStats) {
        csvContent += `Pre-test,${preSessionStats.congAvgMs},${preSessionStats.incongAvgMs},${preSessionStats.diffD},${preSessionStats.accuracyPct}%,${preSessionStats.correctCount}/${preSessionStats.totalCount}\n`;
      }
      if (postSessionStats) {
        csvContent += `Post-test,${postSessionStats.congAvgMs},${postSessionStats.incongAvgMs},${postSessionStats.diffD},${postSessionStats.accuracyPct}%,${postSessionStats.correctCount}/${postSessionStats.totalCount}\n`;
      }
      if (preSessionStats && postSessionStats) {
        const delta = postSessionStats.diffD - preSessionStats.diffD;
        csvContent += `การเปลี่ยนแปลง (Delta D),,,,${delta > 0 ? '+' : ''}${delta} ms,\n`;
      }
      csvContent += '\n';
    }

    // 3. Raw Trial-by-Trial Data
    csvContent += '=== ข้อมูลรายข้อ (Raw Trials) ===\n';
    csvContent += 'Trial,Participant,Phase,Condition,Prompt Text,Ink Color,User Answer,Correct Answer,Status,Reaction Time (s),Reaction Time (ms),Is Congruent\n';

    allTrials.forEach((t, idx) => {
      const statusStr = t.isTimeout ? 'Timeout' : (t.isCorrect ? 'Correct' : 'Incorrect');
      const rtSec = t.reactionTimeSec !== undefined ? Number(t.reactionTimeSec).toFixed(3) : (t.rtSec !== undefined ? Number(t.rtSec).toFixed(3) : '');
      const rtMs = t.reactionTimeMs !== undefined ? Math.round(t.reactionTimeMs) : (t.rtMs !== undefined ? t.rtMs : '');
      const congStr = t.isCongruent ? 'Yes' : 'No';

      csvContent += [
        idx + 1,
        `"${pName}"`,
        `"${t.phaseLabel || ''}"`,
        `"${t.condCode || ''}"`,
        `"${t.promptText || ''}"`,
        `"${t.inkColorKey || t.inkColor || ''}"`,
        `"${(t.userAnswerText || t.userAnswer || '').replace(/"/g, '""')}"`,
        `"${(t.correctAnswerText || t.correctAnswer || '').replace(/"/g, '""')}"`,
        statusStr,
        rtSec,
        rtMs,
        congStr
      ].join(',') + '\n';
    });

    const safeDate = new Date().toISOString().slice(0, 10);
    const fileName = `Stroop_${pName}_${safeDate}_Results.csv`;
    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
    showToast('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว!');
  }

  function exportSingleSessionResearchCSV(data) {
    if (!data) return;
    let csvContent = '\uFEFF';
    csvContent += 'ผู้เข้าร่วม,รอบการทดสอบ,Congruent (ms),Incongruent (ms),ผลต่าง D = I - C (ms),ความถูกต้อง (%),วันที่\n';
    csvContent += `"${data.participantName}","${data.phaseLabel}",${data.congAvgMs},${data.incongAvgMs},${data.diffD},"${data.accuracyPct}%","${data.dateTimeStr}"\n`;
    downloadFile(csvContent, `Stroop_Summary_${data.participantName}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function copyCurrentSessionResearchTable() {
    if (!currentSessionData) return;
    const tsv = `ผู้เข้าร่วม\tรอบการทดสอบ\tCongruent (ms)\tIncongruent (ms)\tผลต่าง D\tความถูกต้อง\n` +
      `${currentSessionData.participantName}\t${currentSessionData.phaseLabel}\t${currentSessionData.congAvgMs}\t${currentSessionData.incongAvgMs}\t${currentSessionData.diffD}\t${currentSessionData.accuracyPct}%`;
    copyTextToClipboard(tsv, btnCopyResearchTable, 'คัดลอกลง Sheet แล้ว!');
  }

  function exportToCSV() {
    if (userResponses.length === 0) return;
    let csvContent = '\uFEFF';
    csvContent += `Participant Name,${currentParticipantName}\n`;
    csvContent += `Phase,${currentSessionPhase}\n`;
    csvContent += `Date,${getFormattedDate()}\n\n`;
    csvContent += 'Trial,Condition,Prompt Text,Ink Color,User Answer,Correct Answer,Status,Reaction Time (s),Reaction Time (ms),Is Congruent\n';

    userResponses.forEach(r => {
      const statusStr = r.isCorrect ? 'Correct' : (r.isTimeout ? 'Timeout' : 'Incorrect');
      csvContent += `${r.trialNo},${r.condCode},"${r.promptText}",${r.inkColorKey},"${r.userAnswerText}","${r.correctAnswerText}",${statusStr},${r.reactionTimeSec},${Math.round(r.reactionTimeMs)},${r.isCongruent ? 'Yes' : 'No'}\n`;
    });

    downloadFile(csvContent, `Stroop_${currentParticipantName}_${currentSessionPhase}_Raw_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
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
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isCorrect) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  function playCountdownSound(isFinal) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (!isFinal) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.09);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1150, audioCtx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      }
    } catch (e) {
      console.warn('Audio countdown play error', e);
    }
  }

  // --- TAB 6: RAW TRIALS FUNCTIONS ---
  function getAllSessions() {
    return getIndividualSessions();
  }

  function getFilteredRawTrials() {
    const allSessions = getIndividualSessions();
    const pFilter = rawTrialParticipantFilter ? rawTrialParticipantFilter.value : 'ALL';
    const phaseFilter = rawTrialPhaseFilter ? rawTrialPhaseFilter.value : 'ALL';

    let allTrials = [];
    allSessions.forEach(session => {
      const pId = session.participantName || session.participant || 'Unknown';
      const phase = session.sessionPhase || session.phase || 'PRE';
      if (pFilter !== 'ALL' && pId !== pFilter) return;
      if (phaseFilter !== 'ALL' && phase !== phaseFilter) return;

      const responses = session.responses || session.trials || [];
      if (Array.isArray(responses)) {
        responses.forEach(t => {
          allTrials.push({
            ...t,
            participant: pId,
            phase: phase,
            inkColor: t.inkColor || t.inkColorKey || '',
            promptText: t.promptText || '',
            userAnswer: t.userAnswerText || t.userAnswer || '',
            correctAnswer: t.correctAnswerText || t.correctAnswer || '',
            status: t.status || (t.isTimeout ? 'TIMEOUT' : (t.isCorrect ? 'CORRECT' : 'INCORRECT')),
            rtSec: t.rtSec !== undefined ? t.rtSec : (t.reactionTimeSec !== undefined ? t.reactionTimeSec : ''),
            rtMs: t.rtMs !== undefined ? t.rtMs : (t.reactionTimeMs !== undefined ? t.reactionTimeMs : '')
          });
        });
      }
    });
    return allTrials;
  }

  function renderRawTrialsTable() {
    if (!rawTrialsTableBody) return;
    updateRawTrialParticipantFilter();

    const trials = getFilteredRawTrials();
    rawTrialsTableBody.innerHTML = '';

    if (rawTrialsSummaryBar) {
      const total = trials.length;
      const correct = trials.filter(t => t.status === 'CORRECT').length;
      const acc = total > 0 ? ((correct / total) * 100).toFixed(1) : '0';
      rawTrialsSummaryBar.innerHTML = `<span>รวมทั้งหมด: <strong>${total}</strong> ข้อ</span> | <span>ถูกต้อง: <strong>${correct}</strong> ข้อ (${acc}%)</span>`;
    }

    if (trials.length === 0) {
      rawTrialsTableBody.innerHTML = '<tr><td colspan="12" class="text-center" style="padding: 2rem; color: #94a3b8;">ยังไม่มีข้อมูลข้อสอบดิบ</td></tr>';
      return;
    }

    trials.forEach((t, idx) => {
      const tr = document.createElement('tr');
      const isCorrect = t.status === 'CORRECT';
      const statusBadge = isCorrect
        ? '<span class="badge-tag green">CORRECT</span>'
        : (t.status === 'TIMEOUT' ? '<span class="badge-tag yellow">TIMEOUT</span>' : '<span class="badge-tag red">INCORRECT</span>');
      const phaseBadge = t.phase === 'PRE' ? '<span class="badge-tag session-pre">Pre</span>' : '<span class="badge-tag session-post">Post</span>';
      const congText = t.isCongruent ? '<span class="text-green">TRUE</span>' : '<span class="text-yellow">FALSE</span>';

      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td><strong>${t.participant || '-'}</strong></td>
        <td class="text-center">${phaseBadge}</td>
        <td class="text-center">${t.condCode || '-'}</td>
        <td class="text-center"><strong>${t.promptText || '-'}</strong></td>
        <td class="text-center" style="color: ${t.inkColorHex || '#fff'}; font-weight: 700;">${t.inkColor || '-'}</td>
        <td class="text-center">${t.userAnswer || '-'}</td>
        <td class="text-center">${t.correctAnswer || '-'}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-right">${t.rtSec !== undefined ? Number(t.rtSec).toFixed(3) : '-'}</td>
        <td class="text-right">${t.rtMs !== undefined ? t.rtMs : '-'}</td>
        <td class="text-center">${congText}</td>
      `;
      rawTrialsTableBody.appendChild(tr);
    });
  }

  function updateRawTrialParticipantFilter() {
    if (!rawTrialParticipantFilter) return;
    const currentVal = rawTrialParticipantFilter.value;
    const allSessions = getIndividualSessions();
    const participants = Array.from(new Set(allSessions.map(s => s.participantName || s.participant || 'Unknown'))).filter(Boolean);

    let html = '<option value="ALL">ผู้ทดสอบทุกคน (All Participants)</option>';
    participants.forEach(p => {
      const selected = p === currentVal ? 'selected' : '';
      html += `<option value="${p}" ${selected}>${p}</option>`;
    });
    rawTrialParticipantFilter.innerHTML = html;
  }

  function buildRawTrialsTSV() {
    const trials = getFilteredRawTrials();
    const headers = ['Trial', 'Participant', 'Phase', 'Condition', 'Prompt Text', 'Ink Color', 'User Answer', 'Correct Answer', 'Status', 'Reaction Time (s)', 'Reaction Time (ms)', 'Is Congruent'];
    const rows = [headers.join('\t')];

    trials.forEach((t, idx) => {
      rows.push([
        idx + 1,
        t.participant || '',
        t.phase || '',
        t.condCode || '',
        t.promptText || '',
        t.inkColor || '',
        t.userAnswer || '',
        t.correctAnswer || '',
        t.status || '',
        t.rtSec !== undefined ? Number(t.rtSec).toFixed(3) : '',
        t.rtMs !== undefined ? t.rtMs : '',
        t.isCongruent ? 'TRUE' : 'FALSE'
      ].join('\t'));
    });
    return rows.join('\n');
  }

  function copyRawTrialsTSV() {
    const tsv = buildRawTrialsTSV();
    copyTextToClipboard(tsv, 'คัดลอกตารางข้อสอบดิบ (TSV) ไปยังคลิปบอร์ดแล้ว!');
  }

  function downloadRawTrialsCSV() {
    const trials = getFilteredRawTrials();
    const headers = ['Trial', 'Participant', 'Phase', 'Condition', 'Prompt Text', 'Ink Color', 'User Answer', 'Correct Answer', 'Status', 'Reaction Time (s)', 'Reaction Time (ms)', 'Is Congruent'];
    const rows = [headers.join(',')];

    trials.forEach((t, idx) => {
      rows.push([
        idx + 1,
        `"${(t.participant || '').replace(/"/g, '""')}"`,
        `"${(t.phase || '').replace(/"/g, '""')}"`,
        `"${(t.condCode || '').replace(/"/g, '""')}"`,
        `"${(t.promptText || '').replace(/"/g, '""')}"`,
        `"${(t.inkColor || '').replace(/"/g, '""')}"`,
        `"${(t.userAnswer || '').replace(/"/g, '""')}"`,
        `"${(t.correctAnswer || '').replace(/"/g, '""')}"`,
        `"${(t.status || '').replace(/"/g, '""')}"`,
        t.rtSec !== undefined ? Number(t.rtSec).toFixed(3) : '',
        t.rtMs !== undefined ? t.rtMs : '',
        t.isCongruent ? 'TRUE' : 'FALSE'
      ].join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stroop_Raw_Trials_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ CSV ข้อสอบดิบสำเร็จ!');
  }

});

