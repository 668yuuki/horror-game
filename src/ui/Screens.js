// タイトル / ゲームオーバー / クリア画面の制御
export class Screens {
  constructor() {
    this.title    = document.getElementById('title');
    this.gameover = document.getElementById('gameover');
    this.clear    = document.getElementById('clear');
    this.startBtn = document.getElementById('start-btn');
    this.retryBtn = document.getElementById('retry-btn');
    this.clearBtn = document.getElementById('clear-btn');

    this.onStart = null;
    this.onRetry = null;
    this.onBackToTitle = null;

    this.startBtn.addEventListener('click', () => this.onStart && this.onStart());
    this.retryBtn.addEventListener('click', () => this.onRetry && this.onRetry());
    this.clearBtn.addEventListener('click', () => this.onBackToTitle && this.onBackToTitle());
  }

  showTitle() {
    this.title.classList.remove('hidden');
    this.gameover.classList.add('hidden');
    this.clear.classList.add('hidden');
  }
  hideAll() {
    this.title.classList.add('hidden');
    this.gameover.classList.add('hidden');
    this.clear.classList.add('hidden');
  }
  showGameOver() {
    this.gameover.classList.remove('hidden');
  }
  showClear() {
    this.clear.classList.remove('hidden');
  }
}
