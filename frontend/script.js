let selectedColorCode = null;

document.querySelectorAll(".color-box").forEach((box) => {
  box.addEventListener("click", () => {
    document
      .querySelectorAll(".color-box")
      .forEach((b) => b.classList.remove("selected"));

    box.classList.add("selected");
    selectedColorCode = box.getAttribute("data-code");
  });
});

document.querySelectorAll(".cell").forEach((cell) => {
  if (cell.classList.contains("center")) return;

  cell.addEventListener("click", () => {
    if (!selectedColorCode) {
      alert("Спочатку виберіть колір із палітри");
      return;
    }

    switch (selectedColorCode) {
      case "R":
        cell.style.backgroundColor = "red";
        break;
      case "G":
        cell.style.backgroundColor = "green";
        break;
      case "B":
        cell.style.backgroundColor = "blue";
        break;
      case "O":
        cell.style.backgroundColor = "orange";
        break;
      case "W":
        cell.style.backgroundColor = "white";
        cell.style.border = "1px solid #ccc";
        break;
      case "Y":
        cell.style.backgroundColor = "yellow";
        break;
    }
    cell.setAttribute("data-color", selectedColorCode);
  });
});

function collectColors() {
  let corners = "";
  for (let i = 1; i <= 24; i++) {
    const el = document.querySelector(`.corner.c${i}`);
    corners += el ? el.getAttribute("data-color") || "X" : "X";
  }
  let edges = "";
  for (let i = 1; i <= 24; i++) {
    const el = document.querySelector(`.edge.e${i}`);
    edges += el ? el.getAttribute("data-color") || "X" : "X";
  }
  return { corners, edges };
}

document.getElementById("clearColors").onclick = () => {
  document.querySelectorAll(".cell.corner, .cell.edge").forEach((cell) => {
    cell.style.backgroundColor = "white";
    cell.removeAttribute("data-color");
    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.style.display = "none";
  });
};
function checkColorConflicts(cornerColors, edgeColors) {
  const opposites = [
    ["W", "Y"],
    ["G", "B"],
    ["R", "O"],
  ];

  const cornerMap = {};
  const edgeMap = {};

  for (let i = 0; i < 8; i++) {
    const colors = [
      cornerColors[i * 3],
      cornerColors[i * 3 + 1],
      cornerColors[i * 3 + 2],
    ];
    cornerMap[`cor${i + 1}`] = colors;
  }

  for (let i = 0; i < 12; i++) {
    const colors = [edgeColors[i * 2], edgeColors[i * 2 + 1]];
    edgeMap[`ed${i + 1}`] = colors;
  }

  const hasOpposite = (colors) => {
    for (const [a, b] of opposites) {
      if (colors.includes(a) && colors.includes(b)) return `${a}-${b}`;
    }
    return null;
  };

  for (const key in cornerMap) {
    const colors = cornerMap[key];
    const opp = hasOpposite(colors);
    if (opp) {
      alert(`На елементі є протилежні кольори: $`);
      return false;
    }
    const unique = new Set(colors);
    if (unique.size !== colors.length) {
      alert(`На елементі  є однакові кольори:`);
      return false;
    }
  }

  for (const key in edgeMap) {
    const colors = edgeMap[key];
    const opp = hasOpposite(colors);
    if (opp) {
      alert(`На елементі є протилежні кольори: $`);
      return false;
    }
    const unique = new Set(colors);
    if (unique.size !== colors.length) {
      alert(`На елементі  є однакові кольори: `);
      return false;
    }
  }

  return true;
}

function validateCubeInput(corners, edges) {
  const colors = ["R", "G", "B", "O", "W", "Y"];

  if (corners.includes("X") || edges.includes("X")) {
    alert("Всі клітинки кути і ребра повинні бути заповнені кольорами.");
    return false;
  }

  if (corners.length !== 24 || edges.length !== 24) {
    alert("Некоректна довжина рядків кутів або ребер.");
    return false;
  }

  const countColors = (str) => {
    const counts = {};
    for (const c of colors) counts[c] = 0;
    for (const ch of str) {
      if (counts.hasOwnProperty(ch)) {
        counts[ch]++;
      } else {
        alert("Знайдено недопустимий колір: " + ch);
        return null;
      }
    }
    return counts;
  };

  const cornerCounts = countColors(corners);
  if (!cornerCounts) return false;

  const edgeCounts = countColors(edges);
  if (!edgeCounts) return false;

  for (const c of colors) {
    if (cornerCounts[c] !== 4) {
      alert(
        `Колір ${c} зустрічається у кутах не 4 рази, а ${cornerCounts[c]}.`
      );
      return false;
    }
    if (edgeCounts[c] !== 4) {
      alert(`Колір ${c} зустрічається у ребрах не 4 рази, а ${edgeCounts[c]}.`);
      return false;
    }
  }

  return true;
}

document.getElementById("sendColors").onclick = () => {
  const { corners, edges } = collectColors();

  if (!validateCubeInput(corners, edges)) {
    return;
  }

  fetch("http://127.0.0.1:8000/api/solve/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ corners, edges }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Непраильно введений кубик");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        alert("Непраильно введений кубик");
        return;
      }
      console.log("Рішення:", data);
      const resultsContainer = document.getElementById("resultsContainer");
      resultsContainer.innerHTML = "";
      resultsContainer.style.display = "block";

      function createTable(title, dataArray) {
        const table = document.createElement("table");
        table.style.borderCollapse = "collapse";
        table.style.marginBottom = "20px";
        table.style.width = "100%";

        const caption = document.createElement("caption");
        caption.textContent = title;
        caption.style.fontWeight = "bold";
        caption.style.marginBottom = "5px";
        table.appendChild(caption);

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        const th1 = document.createElement("th");
        th1.textContent = "Значення";
        th1.style.border = "1px solid black";
        th1.style.padding = "5px";
        const th2 = document.createElement("th");
        th2.textContent = "Алгоритм";
        th2.style.border = "1px solid black";
        th2.style.padding = "5px";

        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        dataArray.forEach(([letter, alg]) => {
          const row = document.createElement("tr");
          const td1 = document.createElement("td");
          td1.textContent = letter;
          td1.style.border = "1px solid black";
          td1.style.padding = "5px";
          td1.style.width = "20%";
          const td2 = document.createElement("td");
          td2.textContent = alg;
          td2.style.border = "1px solid black";
          td2.style.padding = "5px";

          row.appendChild(td1);
          row.appendChild(td2);
          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        resultsContainer.appendChild(table);
      }
      function addCommasEveryTwoLetters(str) {
        return str.match(/.{1,2}/g).join(", ");
      }
      const cornerWithCommas = addCommasEveryTwoLetters(data.corner_letter_seq);
      const edgeWithCommas = addCommasEveryTwoLetters(data.edge_letter_seq);
      const seqInfo = document.createElement("div");
      seqInfo.innerHTML = `
  <p><strong>Кутові літери:</strong> ${cornerWithCommas}</p>
  <p><strong>Реберні літери:</strong> ${edgeWithCommas}</p>
`;
      resultsContainer.appendChild(seqInfo);

      if (data.corner_solution) {
        const cornerData = data.corner_solution.map((item) => [
          item[0],
          item[1],
        ]);
        createTable("Рішення кутів", cornerData);
      }

      if (data.parity) {
        const parityDiv = document.createElement("div");

        const parityData = [["Parity", data.parity]];
        createTable("Parity", parityData);
      }

      if (data.edge_solution) {
        const edgeData = data.edge_solution.map((item) => [item[0], item[1]]);
        createTable("Рішення ребер", edgeData);
      }
    })

    .catch((error) => {
      alert("Сталася помилка: " + error.message);
    });
};
