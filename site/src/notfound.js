import './style.css';
import { wrapPage, plateHead } from './shared.js';

document.getElementById('app').innerHTML = wrapPage('', `
<main class="inner">
  ${plateHead('404', 'This page<br>was never sealed.', 'The address you followed does not exist. Your results are safe — they live in this browser.')}
  <div class="btn-row">
    <a class="press press-ink" href="/app.html">Go to the overview</a>
    <a class="press" href="/">Product site</a>
  </div>
</main>
`);
