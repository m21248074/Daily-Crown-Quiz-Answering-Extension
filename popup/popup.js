const quizCount = 10;

function showProgress(progress) {
  const state = progress ? progress.state : "idle";
  const stateText = {
    running: `進行中 (${progress?.done}/${quizCount})`,
    captcha: "等待驗證",
    done: "今日已完成"
  }[state] || "閒置";
  document.getElementById('state').innerText = stateText;
  document.getElementById('earned').innerText = progress && state != "idle" ? `${progress.earned * 10} 皇冠幣` : "-";
  document.getElementById('captcha').style.display = state == "captcha" ? "" : "none";
  document.getElementById('start').innerText = state == "running" || state == "captcha" ? "重新開始" : "開始";
}

function showNextStart() {
  chrome.storage.sync.get(['scheduledStart'], function (items) {
    if (!items.scheduledStart) {
      document.getElementById('nextStart').innerText = "未開啟";
      return;
    }
    chrome.alarms.get('dailyStart', function (alarm) {
      document.getElementById('nextStart').innerText = alarm ? new Date(alarm.scheduledTime).toLocaleString() : "尚未排程";
    });
  });
}

function showTotalCrowns() {
  chrome.storage.sync.get(['totalCrowns'], function (items) {
    document.getElementById('totalCrowns').innerText = items.totalCrowns ?? 0;
  });
}

//Keep the popup live while a run is in progress
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.progress)
    showProgress(changes.progress.newValue);
  if (changes.totalCrowns)
    showTotalCrowns();
  if (changes.scheduledStart)
    showNextStart();
});

window.onload = function () {
  chrome.storage.local.get(['progress'], items => showProgress(items.progress));
  showNextStart();
  showTotalCrowns();
  document.getElementById('start').addEventListener('click', function () {
    chrome.runtime.sendMessage({ greeting: 'startRun' });
    window.close();
  });
  document.getElementById('captcha').addEventListener('click', function () {
    chrome.runtime.sendMessage({ greeting: 'focusQuiz' });
    window.close();
  });
  document.getElementById('options').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}
