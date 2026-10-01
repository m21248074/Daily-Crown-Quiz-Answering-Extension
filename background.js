let satisfy;
let satisfyRate;
let timeToWait;
let timeToWait429;
let totalCrowns;
let currentQuiz;
let openThisQuiz;
let time;
let interval;

const quizDict = {
	"Adventuring": "https://www.wizard101.com/quiz/trivia/game/wizard101-adventuring-trivia",
	"Conjuring": "https://www.wizard101.com/quiz/trivia/game/wizard101-conjuring-trivia",
	"Magical": "https://www.wizard101.com/quiz/trivia/game/wizard101-magical-trivia",
	"Marleybone": "https://www.wizard101.com/quiz/trivia/game/wizard101-marleybone-trivia",
	"Mystical": "https://www.wizard101.com/quiz/trivia/game/wizard101-mystical-trivia",
	"Spellbinding": "https://www.wizard101.com/quiz/trivia/game/wizard101-spellbinding-trivia",
	"Spells": "https://www.wizard101.com/quiz/trivia/game/wizard101-spells-trivia",
	"Valencia": "https://www.wizard101.com/quiz/trivia/game/pirate101-valencia-trivia",
	"Wizard City": "https://www.wizard101.com/quiz/trivia/game/wizard101-wizard-city-trivia",
	"Zafaria": "https://www.wizard101.com/quiz/trivia/game/wizard101-zafaria-trivia"
}
const quizList = Object.keys(quizDict);
const startUrl = "https://www.wizard101.com/quiz/trivia/game/wizard101-trivia";
const historyUrl = "https://www.wizard101.com/user/kiaccounts/crownshistory/game";

//Create a user when they first install the extension, use default values
function createUser() {
	return new Promise(function (resolve) {
		chrome.storage.sync.set({
			playSound: true,
			soundFile: "windows.wav",
			automaticSelection: true,
			color: "#00b300",
			timeToWaitQuestion: 2,
			satisfy: true,
			satisfyRate: 3,
			timeToWait: 30,
			timeToWait429: 60,
			totalCrowns: 0,
			account: "",
			password: "",
			scheduledStart: false,
			showNotification: true,
			focusOnCaptcha: true
		});
		resolve();
	});
}

function onUpdate() {
	chrome.storage.sync.set({
		automaticSelection: true
	});
	//Fill in options added after the user installed the extension
	chrome.storage.sync.get(['scheduledStart', 'showNotification', 'focusOnCaptcha'], function (items) {
		if (items.scheduledStart === undefined)
			chrome.storage.sync.set({ scheduledStart: false });
		if (items.showNotification === undefined)
			chrome.storage.sync.set({ showNotification: true });
		if (items.focusOnCaptcha === undefined)
			chrome.storage.sync.set({ focusOnCaptcha: true });
	});
}

function getOptions() {
	chrome.storage.sync.get(['satisfy', 'satisfyRate', 'timeToWait', 'timeToWait429', 'totalCrowns'], function (items) {
		satisfy = items.satisfy;
		satisfyRate = items.satisfyRate;
		timeToWait = items.timeToWait;
		timeToWait429 = items.timeToWait429;
		totalCrowns = items.totalCrowns;
	});
}

//Remember which tab runs the quizzes, so navigation never touches other tabs
function setQuizTab(tabId) {
	return chrome.storage.session.set({ quizTabId: tabId });
}

async function getQuizTabId() {
	const { quizTabId } = await chrome.storage.session.get('quizTabId');
	return quizTabId;
}

//Progress of the current run. Kept in local storage so the badge and popup survive service worker restarts.
//state: idle | running | captcha | done
async function updateProgress(changes) {
	const { progress } = await chrome.storage.local.get('progress');
	const updated = { ...progress, ...changes };
	await chrome.storage.local.set({ progress: updated });
	showBadge(updated);
	return updated;
}

function startProgress() {
	return updateProgress({ state: "running", done: 0, earned: 0, startedAt: Date.now(), summaryShown: false });
}

//Called when a quiz is left behind, either answered (earned) or already done today
async function finishQuiz(message, state) {
	const { progress } = await chrome.storage.local.get('progress');
	return updateProgress({
		state: state,
		done: quizList.indexOf(message.quizName) + 1,
		earned: (progress?.earned || 0) + (message.earned ? 1 : 0)
	});
}

//Sent once per run, from the crowns history page so the next scheduled start is known
async function showSummary(nextStart) {
	const { progress } = await chrome.storage.local.get('progress');
	if (!progress || progress.state != "done" || progress.summaryShown)
		return;
	await updateProgress({ summaryShown: true });
	const { showNotification } = await chrome.storage.sync.get('showNotification');
	if (!showNotification)
		return;
	const skipped = progress.done - progress.earned;
	let text = `本次獲得 ${progress.earned * 10} 皇冠幣 (作答 ${progress.earned} 份`;
	text += skipped ? `，${skipped} 份今日已完成)` : ")";
	text += nextStart ? `\n下次自動開始: ${new Date(nextStart).toLocaleString()}` : "";
	chrome.notifications.create('summary', {
		type: "basic",
		iconUrl: "icons/icon_128.png",
		title: "今日測驗完成",
		message: text
	});
}

function showBadge(progress) {
	const [text, color] = {
		running: [`${progress.done}/${quizList.length}`, "#1a73e8"],
		captcha: ["!", "#d93025"],
		done: ["✓", "#00b300"]
	}[progress.state] || ["", "#00b300"];
	chrome.action.setBadgeText({ text: text });
	chrome.action.setBadgeBackgroundColor({ color: color });
}

//A run cannot survive a browser restart, so don't show a stale running state
chrome.runtime.onStartup.addListener(async () => {
	const { progress } = await chrome.storage.local.get('progress');
	if (progress && (progress.state == "running" || progress.state == "captcha"))
		updateProgress({ state: "idle" });
	else if (progress)
		showBadge(progress);
});

//When the extension is installed, check if user already has saved data, create a new user
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason == "install")
		createUser().then(() => chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') }));
	else if (details.reason == "update")
		onUpdate();
});

//If the options are changed, load them here
chrome.storage.onChanged.addListener(function (changes) {
	for (const key in changes) {
		let storageChange = changes[key];
		switch (key) {
			case "satisfy":
				satisfy = storageChange.newValue;
				break;
			case "satisfyRate":
				satisfyRate = storageChange.newValue;
				break;
			case "timeToWait":
				timeToWait = storageChange.newValue;
				break;
			case "timeToWait429":
				timeToWait429 = storageChange.newValue;
				break;
			case "totalCrowns":
				totalCrowns = storageChange.newValue;
				break;
			case "scheduledStart":
				if (!storageChange.newValue)
					chrome.alarms.clear('dailyStart');
		}
	}
});

//Scheduled start: open a new tab when the quizzes reset, login.js takes it from there
chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name != 'dailyStart')
		return;
	chrome.storage.sync.get(['scheduledStart'], function (items) {
		if (items.scheduledStart)
			startRun();
	});
});

//Bring the quiz tab to the front when the captcha notification is clicked
chrome.notifications.onClicked.addListener(async notificationId => {
	if (notificationId != 'captcha')
		return;
	chrome.notifications.clear('captcha');
	const tabId = await getQuizTabId();
	if (tabId !== undefined)
		focusTab(tabId);
});

//Open the quiz start page in a new tab, login.js takes it from there
function startRun() {
	chrome.tabs.create({ url: startUrl });
}

async function focusTab(tabId) {
	const tab = await chrome.tabs.update(tabId, { active: true });
	chrome.windows.update(tab.windowId, { focused: true });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	switch (message.greeting) {
		case 'startQuiz':
			setQuizTab(sender.tab.id);
			startProgress();
			openThisQuiz = quizList[0];
			openQuiz(sender.tab.id);
			break;
		case 'startRun':
			startRun();
			break;
		case 'focusQuiz':
			getQuizTabId().then(tabId => {
				if (tabId !== undefined)
					focusTab(tabId);
			});
			break;
		case 'setCurrentQuiz':
			currentQuiz = message.currentQuiz;
			break;
		case 'getCurrentQuiz':
			sendResponse({ quizName: currentQuiz });
			break;
		case 'nextQuiz':
			chrome.notifications.clear('captcha');
			finishQuiz(message, "running");
			getOptions();
			quizIndex = quizList.indexOf(currentQuiz) + 1;
			openThisQuiz = quizList[quizIndex];
			openQuiz(sender.tab.id);
			// if (!satisfy || message.when || quizIndex % satisfyRate != 0) {
			// 	openQuiz();
			// }
			// else {
			// 	window.open("https://www.crowns.krolpowered.com/too-many-requests-satisfaction/#anchor");
			// 	countDown(timeToWait);
			// }
			break;
		case "error429":
			window.open("https://www.crowns.krolpowered.com/too-many-requests/#anchor");
			openThisQuiz = currentQuiz;
			countDown(timeToWait429);
			break;
		case "cancelTimer":
			stopCounter();
			break;
		case "captchaReady":
			setQuizTab(sender.tab.id);
			updateProgress({ state: "captcha" });
			chrome.storage.sync.get(['showNotification', 'focusOnCaptcha'], function (items) {
				if (items.focusOnCaptcha)
					focusTab(sender.tab.id);
				if (!items.showNotification)
					return;
				chrome.notifications.create('captcha', {
					type: "basic",
					iconUrl: "icons/icon_128.png",
					title: "需要完成驗證",
					message: `${message.quizName} 測驗已作答完畢，點此切換到測驗分頁完成 CAPTCHA。`,
					requireInteraction: true
				});
			});
			break;
		case "refreshSchedule":
			//Read the next reset time from the crowns history page in a background tab
			chrome.tabs.create({ url: historyUrl, active: false }).then(tab =>
				chrome.storage.session.set({ scheduleTabId: tab.id }));
			break;
		case "scheduleNext":
			chrome.storage.sync.get(['scheduledStart'], async function (items) {
				const scheduled = Boolean(items.scheduledStart && message.when > Date.now());
				if (scheduled)
					await chrome.alarms.create('dailyStart', { when: message.when });
				chrome.runtime.sendMessage({ greeting: 'scheduleUpdated', scheduled: scheduled }).catch(() => { });
				showSummary(scheduled ? message.when : undefined);
				const { scheduleTabId } = await chrome.storage.session.get('scheduleTabId');
				if (scheduleTabId === sender.tab.id) {
					chrome.storage.session.remove('scheduleTabId');
					chrome.tabs.remove(sender.tab.id);
				}
			});
			break;
		case "endQuiz":
			chrome.notifications.clear('captcha');
			finishQuiz(message, "done");
			chrome.tabs.update(sender.tab.id, {
				url: historyUrl
			});
			break;
	}
});

function countDown(timeWaiting) {
	console.log("Counting Down" + timeWaiting);
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { greeting: "refresh" });
	});
	time = timeWaiting;
	interval = setInterval(() => {
		time -= 1;
		if (time == 0) {
			clearInterval(interval);
			getQuizTabId().then(openQuiz);
		}
	}, 1000);
}

function stopCounter() {
	console.log("Stopping counter");
	clearInterval(interval);
	time = 0;
	getQuizTabId().then(openQuiz);
}

function openQuiz(tabId) {
	console.log("Starting next quiz");
	chrome.tabs.update(tabId, { url: quizDict[openThisQuiz] });
}

getOptions();