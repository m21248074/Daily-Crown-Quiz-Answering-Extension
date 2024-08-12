let table = document.getElementById("theGrid2");
let trs = table.getElementsByTagName("tr");
let i = 0;
let hint = document.querySelector("#kiAccounts > div > div.kiaccountsbox1 > div.middleleft.kiAccountsBoxMain > div > table > tbody > tr > td:nth-child(2) > div > div.middleleft > div > table > tbody > tr > td:nth-child(1)");
let last;
for (let tr of trs) {
  if (tr.classList.length) {
    let td = tr.getElementsByTagName("td")[0];
    let diff = Date.now() - Date.parse(`${td.innerText} GMT`)
    let hours = diff / 1000 / 60 / 60;
    if (hours < 24) {
      tr.style.backgroundColor = "orange";
      last = new Date(Date.parse(`${td.innerText} GMT`));
      td.innerText = `${i + 1}. ${td.innerText}`;
      i++;
    }
  }
}
last.setDate(last.getDate() + 1);
let hintElement = document.createElement('span');
hintElement.innerText = `下次更新時間約為 ${last.toLocaleString()}`;
hintElement.style.color = 'red';
hint.append(hintElement);