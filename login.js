let account, password;

function getUser() {
    return new Promise(resolve => {
        chrome.storage.sync.get(['account', 'password'], items => {
            account = items.account;
            password = items.password;
            resolve();
        })
    });
}

if (document.getElementById('userNameOverflow').textContent.trim() != "Login")
    chrome.runtime.sendMessage({ greeting: 'startQuiz' });
else {
    getUser().then(()=>{
        document.getElementById('loginUserName').value=account;
        document.getElementById('loginPassword').value=password;
        let loginBtn=document.getElementById('wizardLoginButton');
        loginBtn=loginBtn.getElementsByTagName('input')[0];
        loginBtn.click();
        console.log(loginBtn);
    })

}