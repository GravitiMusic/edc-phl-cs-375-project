// app/public/codeMirror.js
import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { python } from "https://esm.sh/@codemirror/lang-python";

const editor = new EditorView({
  state: EditorState.create({
    doc: 'console.log("Hello from CodeMirror via CDN!");\n',
    extensions: [basicSetup, python()],
  }),
  parent: document.getElementById("editor"),
});

document.getElementById("runButton").addEventListener("click", () => {
  const code = editor.state.doc.toString();
  document.getElementById("output").textContent = code;
});