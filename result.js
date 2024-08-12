let table = document.getElementById("theGrid2");
let trs = table.getElementsByTagName("tr");
let i = 0;
for (let tr of trs) {
  if (tr.classList.length) {
    let td = tr.getElementsByTagName("td")[0];
    let diff = Date.now() - Date.parse(`${td.innerText} GMT`)
    let hours = diff / 1000 / 60 / 60;
    if (hours < 24) {
      tr.style.backgroundColor = "pink";
      td.innerText = `${i+1}. ${td.innerText}`;
      i++;
    }
  }
}