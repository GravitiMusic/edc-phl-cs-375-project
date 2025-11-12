import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { python } from "https://esm.sh/@codemirror/lang-python";

// Create the editor
const editor = new EditorView({
  state: EditorState.create({
    doc: 'print("Hello World!")\nx=1\nprint(x)',
    extensions: [basicSetup, python()],
  }),
  parent: document.getElementById("editor"),
});

const runButton = document.getElementById("runButton");
const outputEl = document.getElementById("output");

runButton.addEventListener("click", async () => {
  const code = editor.state.doc.toString();
  outputEl.textContent = "⏳ Your code is being run...";

  try {
    
    const response = await window.csrfProtection.protectedFetch("/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: 71, // code for python
      }),
    });

    // Check if user is authenticated
    if (response.status === 401) {
      outputEl.textContent = "🔒 You must be logged in to run code. Redirecting...";
      setTimeout(() => {
        window.location.href = "/pages/login.html";
      }, 2000);
      return;
    }

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