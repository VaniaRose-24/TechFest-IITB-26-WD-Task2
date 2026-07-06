// Procedural Web Audio Synthesizer for Eco-Campus 3D Scene

let audioCtx = null;
let ambientSource = null;
let ambientGain = null;
let filterNode = null;
let lfoNode = null;
let isMuted = false;

// Initialize Audio Context and start Ambient Synthesis
export function initAudio() {
  if (audioCtx) return; // Already initialized
  
  // Create audio context supporting cross-browser compatibility
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
  
  // Create master ambient gain node
  ambientGain = audioCtx.createGain();
  ambientGain.gain.setValueAtTime(0.12, audioCtx.currentTime); // Low volume background hum
  ambientGain.connect(audioCtx.destination);
  
  // 1. Synthesize Procedural Wind/Eco Ambient Hum
  // Generate white noise buffer
  const sampleRate = audioCtx.sampleRate;
  const bufferSize = sampleRate * 3; // 3 seconds loop
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }
  
  // Create noise source
  ambientSource = audioCtx.createBufferSource();
  ambientSource.buffer = buffer;
  ambientSource.loop = true;
  
  // Create bandpass filter to shape noise into wind gusts
  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.Q.setValueAtTime(3.0, audioCtx.currentTime); // Resonance
  filterNode.frequency.setValueAtTime(400, audioCtx.currentTime); // Base frequency
  
  // Create LFO (Low-Frequency Oscillator) to modulate wind speed/frequency
  lfoNode = audioCtx.createOscillator();
  lfoNode.type = 'sine';
  lfoNode.frequency.setValueAtTime(0.08, audioCtx.currentTime); // Slow sweep: 12 seconds per cycle
  
  // Gain to scale LFO output (modulate frequency between 200Hz and 700Hz)
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(250, audioCtx.currentTime);
  
  // Connect LFO modulation chain
  lfoNode.connect(lfoGain);
  lfoGain.connect(filterNode.frequency); // Modulates BiquadFilter frequency
  
  // Connect main audio path
  ambientSource.connect(filterNode);
  filterNode.connect(ambientGain);
  
  // Start nodes
  lfoNode.start();
  ambientSource.start();
  
  // Gentle base warm oscillator to add a harmonic drone
  createDroneOscillator();
}

// Low frequency harmonic drone oscillator for rich background depth
function createDroneOscillator() {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(73.42, audioCtx.currentTime); // D2 note, warm green resonance
  
  oscGain.gain.setValueAtTime(0.02, audioCtx.currentTime); // Extremely quiet
  
  osc.connect(oscGain);
  oscGain.connect(ambientGain);
  osc.start();
}

// Synthesize Procedural UI Click Sound (Double Chime)
export function playClick() {
  if (!audioCtx || isMuted) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const now = audioCtx.currentTime;
  
  // High chime
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // Sweep to G5
  
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.13);
  
  // Sub-note delay chime
  setTimeout(() => {
    if (isMuted) return;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    const now2 = audioCtx.currentTime;
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now2); // C6
    
    gain2.gain.setValueAtTime(0.08, now2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.15);
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now2);
    osc2.stop(now2 + 0.16);
  }, 40);
}

// Synthesize Procedural UI Hover Sound (Tiny high blip)
export function playHover() {
  if (!audioCtx || isMuted) return;
  
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1320, now); // E6, tiny and clean
  
  gainNode.gain.setValueAtTime(0.015, now); // Very soft
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.05);
}

// Toggle mute state
export function toggleMute() {
  if (!audioCtx) return true;
  
  isMuted = !isMuted;
  const targetVolume = isMuted ? 0 : 0.12;
  
  // Ramp volume smoothly to avoid pops
  ambientGain.gain.setValueAtTime(ambientGain.gain.value, audioCtx.currentTime);
  ambientGain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 0.3);
  
  return isMuted;
}
