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
            password: ""
        });
        resolve();
    });
}

function onUpdate() {
    chrome.storage.sync.set({
        automaticSelection: true
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

async function getCurrentTab() {
    const queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

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
        }
    }
});

//Browser icon clicked, open freekigames
chrome.action.onClicked.addListener(tab => {
    chrome.tabs.update(tab.id, { url: "https://www.wizard101.com/quiz/trivia/game/wizard101-trivia" });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.greeting) {
        case 'startQuiz':
            openThisQuiz = quizList[0];
            openQuiz();
            break;
        case 'setCurrentQuiz':
            currentQuiz = message.currentQuiz;
            break;
        case 'getCurrentQuiz':
            sendResponse({ quizName: currentQuiz });
            break;
        case 'nextQuiz':
            getOptions();
            quizIndex = quizList.indexOf(currentQuiz) + 1;
            openThisQuiz = quizList[quizIndex];
            if (!satisfy || message.when || quizIndex % satisfyRate != 0) {
                openQuiz();
            }
            else {
                window.open("https://www.crowns.krolpowered.com/too-many-requests-satisfaction/#anchor");
                countDown(timeToWait);
            }
            break;
        case "error429":
            window.open("https://www.crowns.krolpowered.com/too-many-requests/#anchor");
            openThisQuiz = currentQuiz;
            countDown(timeToWait429);
            break;
        case "cancelTimer":
            stopCounter();
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
            openQuiz();
        }
    }, 1000);
}

function stopCounter() {
    console.log("Stopping counter");
    clearInterval(interval);
    time = 0;
    openQuiz();
}

async function openQuiz() {
    console.log("Starting next quiz");
    let tab = getCurrentTab();
    chrome.tabs.update(tab.id, { url: quizDict[openThisQuiz] });
}

getOptions();