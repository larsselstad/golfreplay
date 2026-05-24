import { cfg, state } from './state.js';
import { hideError, showError } from './ui.js';

const previewVid = document.getElementById('preview');

export async function startCamera() {
  if (state.stream)
    state.stream.getTracks().forEach((t) => {
      t.stop();
    });
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: cfg.camera },
      audio: false,
    });
    previewVid.srcObject = state.stream;
    hideError();
  } catch {
    showError(
      'Camera access denied.\nPlease allow camera access and reload the page.',
    );
  }
}
