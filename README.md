# Apex Text Analyzer

A simple web app that analyzes your text. Type or paste text and instantly see how many words, characters, sentences and paragraphs it has. Built with plain HTML, CSS and JavaScript (no libraries, no installs).

## How to run

1. Unzip the project folder.
2. Double-click `index.html` to open it in your browser (Chrome, Edge, Firefox).
3. That's it. It works offline.

## Project structure

```
apex-text-analyzer/
├── index.html      The page structure (loading screen, navigation, sections)
├── CSS/
│   └── style.css   All the styling (black and gold theme, layout, animations)
├── JS/
│   └── script.js   All the logic (counting, searching, buttons, saving)
└── README.md       This file
```

## Features

**Loading screen**
- Animated APEX TECH logo, progress bar and "LOADING..." text.

**Text Workspace**
- Text editor with a 10,000 character limit and a progress meter.
- Live character and word counter.
- Undo and Redo buttons (also Ctrl+Z and Ctrl+Y).
- Buttons: Use sample text, Clear text, Clear saved text, Reset all.
- Quick tools: UPPERCASE, lowercase, Title Case, Remove extra spaces.
- Word search beside the editor: counts matches, highlights them in the text, and remembers recent searches.

**Quick Stats**
- Words, characters, characters without spaces, sentences, paragraphs and reading time.

**Deep Analysis**
- Top 5 longest words.
- Most frequent words, with an option to ignore common words like "the" and "and".
- Word frequency bar chart (choose to show 5, 8, 10 or 15 words).
- Readability score (an estimate), average sentence length, average word length and unique words.
- Copy the analysis, download it as TXT, or download it as CSV.

**Extras**
- Dark and light theme button (your choice is remembered).
- Your text is saved automatically in your browser, so it is still there when you come back.
- Works on phones, tablets and computers.

## Keyboard shortcuts

| Shortcut | What it does |
|----------|--------------|
| Ctrl + Z | Undo |
| Ctrl + Y | Redo |
| Enter (in the search box) | Search |

## How the JavaScript is organized

`script.js` is split into labeled sections:

1. **Settings**: values you can change, like `MAX_CHARS` (the character limit) and `WORDS_PER_MINUTE` (used for reading time).
2. **Text analysis**: small functions that count words, sentences and paragraphs.
3. **Rendering**: functions that show the results on the page.
4. **Search and highlight**: finds a word and marks it in the text without changing your original text.
5. **Undo and redo**: keeps a list of earlier versions of your text.
6. **Reports**: builds the text and CSV files for download.
7. **Events**: connects the buttons to the functions.

## Where your data goes

Nothing is sent anywhere. Your text and theme choice are stored only in your own browser (using `localStorage`). Use **Clear saved text** or **Reset all** to remove it.

## Credits

Made by APEX TECH.
