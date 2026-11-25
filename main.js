const stage = document.querySelector('#robot-stage');
const canvas = document.querySelector('#robot-canvas');
const showcase = document.querySelector('.hero-showcase');
let layoutFrame;
let anchor;

function queueBackgroundLayout() {
  if (!layoutFrame) layoutFrame = requestAnimationFrame(updateBackground);
}

function measureBackground() {
  const rect = showcase.getBoundingClientRect();
  anchor = {left: rect.left, top: rect.top + scrollY, width: rect.width, height: rect.height};
  stage.style.setProperty('--robot-width', anchor.width + 'px');
  stage.style.setProperty('--robot-height', anchor.height + 'px');
  queueBackgroundLayout();
}

function updateBackground() {
  layoutFrame = 0;
  const viewport = document.documentElement;
  const compact = viewport.clientWidth <= 760;
  const distance = Math.max(1, viewport.scrollHeight - viewport.clientHeight);
  const progress = Math.min(1, Math.max(0, scrollY / distance));
  const fade = Math.min(1, Math.max(0, scrollY / (anchor.top + anchor.height * .68)));
  const travel = Math.min(1, progress * distance / (anchor.top + anchor.height * .62));
  const residentY = viewport.clientHeight * (compact ? .24 : .14);
  const wave = Math.sin(progress * Math.PI * 1.25);
  const driftX = compact ? wave * anchor.width * .15 : -wave * anchor.width * .35;
  const finish = Math.max(0, (progress - .8) / .2) ** 2;
  const x = anchor.left + driftX + (compact ? finish * anchor.width * .27 : 0);
  const y = anchor.top + (residentY - anchor.top) * travel
    + wave * viewport.clientHeight * .14
    + finish * viewport.clientHeight * (compact ? .27 : .16);
  stage.style.setProperty('--robot-x', x + 'px');
  stage.style.setProperty('--robot-y', y + 'px');
  stage.style.setProperty('--robot-scale', 1 - travel * (compact ? .20 : .17));
  stage.style.setProperty('--robot-fade', fade);
  stage.style.setProperty('--robot-glow', .23 - fade * .12);
}

measureBackground();
new ResizeObserver(measureBackground).observe(showcase);
window.addEventListener('resize', measureBackground);
window.addEventListener('scroll', queueBackgroundLayout, {passive: true});
import('./robot.js')
  .then(({ mountRobot }) => mountRobot(stage, canvas))
  .catch(error => console.error('The robot could not be initialized.', error));

const emailTrigger = document.querySelector('#email-trigger');
const emailDialog = document.querySelector('#email-dialog');
const emailAddress = document.querySelector('#email-address');
const copyButton = document.querySelector('#copy-email');
const copyStatus = document.querySelector('#copy-status');

emailTrigger.addEventListener('click', event => {
  if (typeof emailDialog.showModal !== 'function') return;
  event.preventDefault();
  copyStatus.textContent = '';
  emailDialog.showModal();
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(emailAddress.value);
    copyStatus.textContent = 'Email address copied.';
  } catch {
    emailAddress.focus();
    emailAddress.select();
    copyStatus.textContent = 'Address selected. Use your device’s Copy command.';
  }
});
