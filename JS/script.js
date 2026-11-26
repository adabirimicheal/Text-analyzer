"use strict";

// --------------------------------------------------
// Settings
// --------------------------------------------------
const MAX_CHARS = 10000;
const WORDS_PER_MINUTE = 200;
const STORAGE_TEXT = "apex-text";
const STORAGE_THEME = "apex-theme";

const COMMON_WORDS = [
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at",
  "for", "with", "as", "is", "are", "was", "were", "be", "been", "it",
  "its", "this", "that", "these", "those", "i", "you", "he", "she",
  "we", "they", "them", "his", "her", "our", "your", "my", "from",
  "by", "not", "so", "if"
];

const SAMPLE_TEXT =
  "Writing clearly is a skill that anyone can build. Start with one simple idea, and say it plainly.\n\n" +
  "Short sentences are easy to read. Long, winding sentences with many clauses, qualifications and digressions " +
  "often confuse readers, so use them carefully!\n\n" +
  "Read your work aloud. Where you stumble, your readers will stumble too. Revise, simplify, and read it again.";


// --------------------------------------------------
// Common elements
// --------------------------------------------------
function getElement(id) {
  return document.getElementById(id);
}

const editor = getElement("editor");
const searchInput = getElement("searchInput");


// --------------------------------------------------
// App memory
// --------------------------------------------------
let history = [""];
let historyIndex = 0;
let activeQuery = "";
let searchHistory = [];
let latestResult = null;
let toastTimer = null;


// --------------------------------------------------
// Simple storage helpers
// --------------------------------------------------
function saveItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // The app will continue to work if browser storage is blocked.
  }
}

function loadItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // The app will continue to work if browser storage is blocked.
  }
}


// --------------------------------------------------
// Text helper functions
// --------------------------------------------------
function getWords(text) {
  const matches = text.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)*|\p{L}[\p{L}\p{M}\p{N}]*/gu);
  return matches ? matches : [];
}

function cleanSearchWord(query) {
  const words = getWords(query);
  return words.length > 0 ? words[0] : "";
}

function countSentences(text) {
  let sentenceCount = 0;
  const parts = text.split(/[.!?]+/);

  for (const part of parts) {
    if (part.trim()) {
      sentenceCount++;
    }
  }

  return sentenceCount;
}

function countParagraphs(text) {
  let count = 0;
  const paragraphs = text.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if (paragraph.trim()) {
      count++;
    }
  }

  return count;
}

function countSyllables(word) {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");

  if (!cleanWord) {
    return 1;
  }

  const withoutFinalE = cleanWord.replace(/e$/, "");
  const vowelGroups = withoutFinalE.match(/[aeiouy]+/g);

  if (!vowelGroups) {
    return 1;
  }

  return Math.max(1, vowelGroups.length);
}

function countWordFrequency(words, ignoreCommonWords) {
  const frequency = {};

  for (const word of words) {
    if (ignoreCommonWords && COMMON_WORDS.indexOf(word) !== -1) {
      continue;
    }

    if (frequency[word]) {
      frequency[word]++;
    } else {
      frequency[word] = 1;
    }
  }

  const results = [];

  for (const word in frequency) {
    results.push([word, frequency[word]]);
  }

  results.sort(function (first, second) {
    if (second[1] !== first[1]) {
      return second[1] - first[1];
    }
    return first[0].localeCompare(second[0]);
  });

  return results;
}

function calculateReadability(words, sentences) {
  if (words.length === 0 || sentences === 0) {
    return {
      level: "-",
      score: 0,
      note: "Add some text to see an estimate."
    };
  }

  let syllableCount = 0;

  for (const word of words) {
    syllableCount += countSyllables(word);
  }

  const score =
    206.835 -
    1.015 * (words.length / sentences) -
    84.6 * (syllableCount / words.length);

  let level = "Difficult";
  if (score >= 60) {
    level = "Easy";
  } else if (score >= 30) {
    level = "Moderate";
  }

  const roundedScore = Math.round(score);

  return {
    level: level,
    score: roundedScore,
    note: "Estimated score " + roundedScore +
      " (based on sentence length and word complexity)"
  };
}

function analyzeText(text) {
  const words = getWords(text);
  const sentences = countSentences(text);
  const uniqueWords = [];

  for (const word of words) {
    if (uniqueWords.indexOf(word) === -1) {
      uniqueWords.push(word);
    }
  }

  const longestWords = uniqueWords.slice();
  longestWords.sort(function (first, second) {
    if (second.length !== first.length) {
      return second.length - first.length;
    }
    return first.localeCompare(second);
  });

  let wordTextLength = 0;
  for (const word of words) {
    wordTextLength += word.length;
  }

  let averageSentence = 0;
  if (sentences > 0) {
    averageSentence = words.length / sentences;
  }

  let averageWord = 0;
  if (words.length > 0) {
    averageWord = wordTextLength / words.length;
  }

  return {
    text: text,
    words: words,
    wordCount: words.length,
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, "").length,
    sentences: sentences,
    paragraphs: countParagraphs(text),
    readingMinutes: Math.ceil(words.length / WORDS_PER_MINUTE),
    uniqueCount: uniqueWords.length,
    longest: longestWords.slice(0, 5),
    readability: calculateReadability(words, sentences),
    avgSentence: averageSentence.toFixed(1),
    avgWord: averageWord.toFixed(1)
  };
}


// --------------------------------------------------
// Display helpers
// --------------------------------------------------
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function (character) {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === '"') return "&quot;";
    return "&#39;";
  });
}

function showToast(message) {
  const toast = getElement("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2000);
}

function makeEmptyItem(message) {
  return '<li class="empty">' + message + "</li>";
}

function setText(text) {
  editor.value = text.slice(0, MAX_CHARS);
  saveItem(STORAGE_TEXT, editor.value);
  render();
  addToHistory();
}


// --------------------------------------------------
// Main rendering
// --------------------------------------------------
function render() {
  latestResult = analyzeText(editor.value);
  const result = latestResult;

  getElement("statWords").textContent = result.wordCount;
  getElement("statChars").textContent = result.chars;
  getElement("statNoSpace").textContent = result.charsNoSpace;
  getElement("statSentences").textContent = result.sentences;
  getElement("statParagraphs").textContent = result.paragraphs;
  getElement("statTime").textContent = result.readingMinutes + " min";

  getElement("liveChars").textContent = result.chars;
  getElement("liveWords").textContent = result.wordCount;
  getElement("remaining").textContent =
    (MAX_CHARS - result.chars) + " remaining";

  const meterFill = getElement("meterFill");
  meterFill.style.width = (result.chars / MAX_CHARS * 100) + "%";
  meterFill.parentElement.classList.toggle(
    "warn",
    result.chars > MAX_CHARS * 0.95
  );

  getElement("undoBtn").disabled = historyIndex === 0;
  getElement("redoBtn").disabled =
    historyIndex >= history.length - 1;

  renderDeepAnalysis(result);
  runSearch(activeQuery, false);
}

function renderDeepAnalysis(result) {
  const longestList = getElement("longestList");

  if (result.longest.length === 0) {
    longestList.innerHTML =
      makeEmptyItem("Type some text to find your longest words.");
  } else {
    let html = "";

    for (const word of result.longest) {
      html +=
        "<li><span>" +
        escapeHtml(word) +
        "</span><b>" +
        word.length +
        " letters</b></li>";
    }

    longestList.innerHTML = html;
  }

  const ignoreCommon = getElement("ignoreCommon").checked;
  const frequency = countWordFrequency(result.words, ignoreCommon);
  const frequentList = getElement("frequentList");

  if (frequency.length === 0) {
    frequentList.innerHTML =
      makeEmptyItem("No words to count yet.");
  } else {
    let html = "";

    for (const item of frequency.slice(0, 5)) {
      html +=
        "<li><span>" +
        escapeHtml(item[0]) +
        "</span><b>" +
        item[1] +
        "x</b></li>";
    }

    frequentList.innerHTML = html;
  }

  const chartSize = Number(getElement("chartSize").value);
  const chartWords = frequency.slice(0, chartSize);
  const chart = getElement("chart");

  if (chartWords.length === 0) {
    chart.innerHTML =
      '<p class="empty">The chart appears when you add text.</p>';
  } else {
    let highestCount = chartWords[0][1];
    let html = "";

    for (const item of chartWords) {
      const percentage = item[1] / highestCount * 100;
      html +=
        '<div class="bar-row">' +
        '<span title="' + escapeHtml(item[0]) + '">' +
        escapeHtml(item[0]) +
        '</span><span class="bar-track">' +
        '<span class="bar-fill" style="width:' +
        percentage +
        '%"></span></span><b>' +
        item[1] +
        "</b></div>";
    }

    chart.innerHTML = html;
  }

  getElement("readLevel").textContent = result.readability.level;
  getElement("readScore").textContent = result.readability.note;
  getElement("avgSentence").textContent =
    result.avgSentence + " words";
  getElement("avgWord").textContent =
    result.avgWord + " letters";
  getElement("uniqueWords").textContent = result.uniqueCount;
}


// --------------------------------------------------
// Search
// --------------------------------------------------
function runSearch(query, announce) {
  const text = editor.value;
  const word = cleanSearchWord(query);
  const preview = getElement("preview");
  const status = getElement("searchStatus");

  if (!text.trim()) {
    getElement("occurrences").textContent = "0";
    preview.innerHTML =
      '<span class="empty">Your text will appear here. ' +
      "Type or paste something in the editor.</span>";
    status.textContent =
      "The editor is empty. Add text first.";

    if (announce) {
      showToast("Add some text first");
    }
    return;
  }

  if (!word) {
    getElement("occurrences").textContent = "0";
    preview.textContent = text;
    status.textContent = "Enter a word to search.";

    if (announce) {
      showToast("Enter a word to search");
    }
    return;
  }

  let count = 0;
  let html = "";
  let lastPosition = 0;
  const pattern = /[a-z0-9]+(?:['-][a-z0-9]+)*|\p{L}[\p{L}\p{M}\p{N}]*/giu;
  let match = pattern.exec(text);

  while (match) {
    if (match[0].toLowerCase() === word) {
      html +=
        escapeHtml(text.slice(lastPosition, match.index)) +
        "<mark>" +
        escapeHtml(match[0]) +
        "</mark>";
      lastPosition = match.index + match[0].length;
      count++;
    }

    match = pattern.exec(text);
  }

  html += escapeHtml(text.slice(lastPosition));
  preview.innerHTML = html;
  getElement("occurrences").textContent = count;

  if (count === 0) {
    status.textContent =
      'No matches for "' + word + '". Try another word.';
  } else if (count === 1) {
    status.textContent = 'Found "' + word + '" 1 time.';
  } else {
    status.textContent =
      'Found "' + word + '" ' + count + " times.";
  }

  if (announce) {
    if (count === 0) {
      showToast("No matches found");
    } else if (count === 1) {
      showToast("1 match found");
    } else {
      showToast(count + " matches found");
    }
  }
}

function submitSearch() {
  const word = cleanSearchWord(searchInput.value);
  activeQuery = word ? searchInput.value : "";
  runSearch(searchInput.value, true);

  if (word && editor.value.trim()) {
    searchHistory = searchHistory.filter(function (item) {
      return item !== word;
    });
    searchHistory.unshift(word);

    if (searchHistory.length > 8) {
      searchHistory.pop();
    }

    renderSearchHistory();
  }
}

function renderSearchHistory() {
  const historyElement = getElement("history");

  if (searchHistory.length === 0) {
    historyElement.innerHTML =
      '<span class="status">No searches yet.</span>';
    return;
  }

  let html = "";

  for (const word of searchHistory) {
    html +=
      '<button class="chip" data-word="' +
      escapeHtml(word) +
      '">' +
      escapeHtml(word) +
      "</button>";
  }

  historyElement.innerHTML = html;
}


// --------------------------------------------------
// Undo and redo
// --------------------------------------------------
function addToHistory() {
  if (history[historyIndex] === editor.value) {
    return;
  }

  history = history.slice(0, historyIndex + 1);
  history.push(editor.value);

  if (history.length > 100) {
    history.shift();
  }

  historyIndex = history.length - 1;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    editor.value = history[historyIndex];
    saveItem(STORAGE_TEXT, editor.value);
    render();
  }
}
 
function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    editor.value = history[historyIndex];
    saveItem(STORAGE_TEXT, editor.value);
    render();
  }
}


// --------------------------------------------------
// Quick text tools
// --------------------------------------------------
function changeTextCase(mode) {
  let text = editor.value;

  if (mode === "upper") {
    text = text.toUpperCase();
  } else if (mode === "lower") {
    text = text.toLowerCase();
  } else if (mode === "title") {
    text = text.toLowerCase().replace(
      /(^|[\s\-(])(\p{L})/gu,
      function (match, firstCharacter, letter) {
        return firstCharacter + letter.toUpperCase();
      }
    );
  } else if (mode === "spaces") {
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/ ?\n ?/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();
  }

  setText(text);
  showToast("Text updated");
}


// --------------------------------------------------
// Reports
// --------------------------------------------------
function buildReport() {
  const result = latestResult;
  const frequency = countWordFrequency(result.words, false).slice(0, 10);
  const lines = [
    "APEX TEXT ANALYZER - REPORT",
    "===========================",
    "Words: " + result.wordCount,
    "Characters (with spaces): " + result.chars,
    "Characters (no spaces): " + result.charsNoSpace,
    "Sentences: " + result.sentences,
    "Paragraphs: " + result.paragraphs,
    "Reading time: " + result.readingMinutes + " min",
    "Unique words: " + result.uniqueCount,
    "Readability (estimate): " + result.readability.level,
    "",
    "Top 5 longest words:"
  ];

  for (let index = 0; index < result.longest.length; index++) {
    const word = result.longest[index];
    lines.push("  " + (index + 1) + ". " + word +
      " (" + word.length + ")");
  }

  lines.push("");
  lines.push("Most frequent words:");

  for (const item of frequency) {
    lines.push("  " + item[0] + ": " + item[1]);
  }

  return lines.join("\n");
}

function buildCsv() {
  const result = latestResult;
  const rows = [
    ["Metric", "Value"],
    ["Words", result.wordCount],
    ["Characters", result.chars],
    ["Characters without spaces", result.charsNoSpace],
    ["Sentences", result.sentences],
    ["Paragraphs", result.paragraphs],
    ["Reading time (min)", result.readingMinutes],
    ["Readability (estimate)", result.readability.level]
  ];

  rows.push([]);
  rows.push(["Longest word", "Length"]);

  for (const word of result.longest) {
    rows.push([word, word.length]);
  }

  rows.push([]);
  rows.push(["Frequent word", "Count"]);

  const frequency = countWordFrequency(result.words, false).slice(0, 10);
  for (const item of frequency) {
    rows.push([item[0], item[1]]);
  }

  const lines = [];

  for (const row of rows) {
    const cells = [];

    for (const value of row) {
      const safeValue = String(value).replace(/"/g, '""');
      cells.push('"' + safeValue + '"');
    }

    lines.push(cells.join(","));
  }

  return lines.join("\n");
}

function downloadFile(filename, content, type) {
  const link = document.createElement("a");
  const file = new Blob([content], { type: type });

  link.href = URL.createObjectURL(file);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
  showToast("Report downloaded");
}

function textIsAvailable() {
  if (editor.value.trim()) {
    return true;
  }

  showToast("Add some text first");
  return false;
}


// --------------------------------------------------
// Reset
// --------------------------------------------------
function resetAll() {
  editor.value = "";
  searchInput.value = "";
  activeQuery = "";
  searchHistory = [];
  history = [""];
  historyIndex = 0;

  removeItem(STORAGE_TEXT);
  renderSearchHistory();
  render();
  showToast("Everything cleared");
}


// --------------------------------------------------
// Button and input events
// --------------------------------------------------
editor.addEventListener("input", function () {
  saveItem(STORAGE_TEXT, editor.value);
  addToHistory();
  render();
});

editor.addEventListener("keydown", function (event) {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
  } else if (key === "y" || (key === "z" && event.shiftKey)) {
    event.preventDefault();
    redo();
  }
});

getElement("undoBtn").addEventListener("click", undo);
getElement("redoBtn").addEventListener("click", redo);

getElement("sampleBtn").addEventListener("click", function () {
  setText(SAMPLE_TEXT);
  showToast("Sample text added");
});

getElement("clearBtn").addEventListener("click", function () {
  if (editor.value) {
    setText("");
    showToast("Text cleared");
  }
});

getElement("clearSavedBtn").addEventListener("click", function () {
  removeItem(STORAGE_TEXT);
  showToast("Saved text removed");
});

getElement("resetBtn").addEventListener("click", resetAll);

const toolButtons = document.querySelectorAll("[data-tool]");

for (const button of toolButtons) {
  button.addEventListener("click", function () {
    if (textIsAvailable()) {
      changeTextCase(button.dataset.tool);
    }
  });
}

getElement("searchBtn").addEventListener("click", submitSearch);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    submitSearch();
  }
});

getElement("history").addEventListener("click", function (event) {
  const chip = event.target.closest(".chip");

  if (chip) {
    searchInput.value = chip.dataset.word;
    submitSearch();
  }
});

getElement("ignoreCommon").addEventListener("change", function () {
  if (latestResult) {
    renderDeepAnalysis(latestResult);
  }
});

getElement("chartSize").addEventListener("change", function () {
  if (latestResult) {
    renderDeepAnalysis(latestResult);
  }
});

getElement("copyBtn").addEventListener("click", async function () {
  if (!textIsAvailable()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(buildReport());
    showToast("Analysis copied");
  } catch (error) {
    showToast("Copy failed. Check browser permissions");
  }
});

getElement("txtBtn").addEventListener("click", function () {
  if (textIsAvailable()) {
    downloadFile(
      "apex-analysis.txt",
      buildReport(),
      "text/plain"
    );
  }
});

getElement("csvBtn").addEventListener("click", function () {
  if (textIsAvailable()) {
    downloadFile(
      "apex-analysis.csv",
      buildCsv(),
      "text/csv"
    );
  }
});


// --------------------------------------------------
// Theme
// --------------------------------------------------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

getElement("themeBtn").addEventListener("click", function () {
  const currentTheme = document.documentElement.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  applyTheme(nextTheme);
  saveItem(STORAGE_THEME, nextTheme);
});


// --------------------------------------------------
// Navigation
// --------------------------------------------------
getElement("menuBtn").addEventListener("click", function () {
  const isOpen = getElement("navLinks").classList.toggle("open");
  getElement("menuBtn").setAttribute("aria-expanded", isOpen);
});

getElement("navLinks").addEventListener("click", function () {
  getElement("navLinks").classList.remove("open");
});

const sectionLinks = [];
const linkElements = document.querySelectorAll(".nav-links a");

for (const link of linkElements) {
  sectionLinks.push(link);
}

const sectionObserver = new IntersectionObserver(function (entries) {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      for (const link of sectionLinks) {
        const isActive = link.hash === "#" + entry.target.id;
        link.classList.toggle("active", isActive);
      }
    }
  }
}, {
  rootMargin: "-40% 0px -55% 0px"
});

const sections = document.querySelectorAll("main section");
for (const section of sections) {
  sectionObserver.observe(section);
}


// --------------------------------------------------
// Start the app
// --------------------------------------------------
applyTheme(loadItem(STORAGE_THEME) || "dark");

const savedText = loadItem(STORAGE_TEXT);
if (savedText) {
  editor.value = savedText.slice(0, MAX_CHARS);
  history = [editor.value];
  historyIndex = 0;
}

renderSearchHistory();
render();

window.addEventListener("load", function () {
  setTimeout(function () {
    getElement("loader").classList.add("done");
  }, 4200);
});
