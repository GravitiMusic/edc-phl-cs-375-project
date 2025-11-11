import { EditorState, Compartment } from "https://esm.sh/@codemirror/state";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { python } from "https://esm.sh/@codemirror/lang-python";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark";

// Compartment so we can swap themes at runtime
const themeCompartment = new Compartment();

// Create the editor
const editor = new EditorView({
  state: EditorState.create({
    doc: 'print("Hello World!")\nx=1\nprint(x)',
    extensions: [
      basicSetup,
      python(),
      // start in light mode (default theme)
      themeCompartment.of([])
    ],
  }),
  parent: document.getElementById("editor"),
});

const runButton = document.getElementById("runButton");
const outputEl = document.getElementById("output");

runButton.addEventListener("click", async () => {
  const code = editor.state.doc.toString();
  outputEl.textContent = "⏳ Your code is being run...";

  try {
    const response = await fetch("/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: 71, // code for python
      }),
    });

    const result = await response.json();

    if (result.stdout) {
      outputEl.textContent = "✅ Output:\n" + result.stdout;
    } else if (result.stderr) {
      outputEl.textContent = "⚠️ Error:\n" + result.stderr;
    } else if (result.compile_output) {
      outputEl.textContent = "💥 Compile error:\n" + result.compile_output;
    } else {
      outputEl.textContent = "❓ No output received.";
    }
  } catch (err) {
    outputEl.textContent = "❌ Request failed:\n" + err;
  }
});

// ===== Light / Dark mode (editor only) =====
const themeToggle = document.getElementById("themeToggle");
let isDark = false;

function applyTheme() {
  // Swap CodeMirror theme
  editor.dispatch({
    effects: themeCompartment.reconfigure(isDark ? oneDark : [])
  });

  // Only darken the editor surface, not the whole page
  const editorSurface = document.querySelector(".editor-surface");
  if (editorSurface) {
    editorSurface.classList.toggle("dark", isDark);
  }

  if (themeToggle) {
    themeToggle.textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    isDark = !isDark;
    applyTheme();
  });
}

// Initial state = light mode
applyTheme();
