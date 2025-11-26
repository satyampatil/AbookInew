// Logic for the funny ad page

document.addEventListener('DOMContentLoaded', () => {
    const watchButtons = document.querySelectorAll('.watch-ad-btn');
    const moneyCounter = document.getElementById('money-counter');
    const modal = document.getElementById('ad-modal');
    const timerEl = document.getElementById('ad-timer');
    
    let totalMoney = 0.00;

    // Load previous money from local storage (persistent joke)
    const savedMoney = localStorage.getItem('fakeAdMoney');
    if (savedMoney) {
        totalMoney = parseFloat(savedMoney);
        updateDisplay();
    }

    watchButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const reward = parseFloat(btn.dataset.reward);
            playAd(reward);
        });
    });

    function playAd(reward) {
        // Show Modal
        modal.style.display = 'flex';
        let timeLeft = 3;
        
        timerEl.textContent = `Watching intense advertisement... ${timeLeft}s`;

        const interval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                timerEl.textContent = `Watching intense advertisement... ${timeLeft}s`;
            } else {
                clearInterval(interval);
                finishAd(reward);
            }
        }, 1000);
    }

    function finishAd(reward) {
        modal.style.display = 'none';
        totalMoney += reward;
        localStorage.setItem('fakeAdMoney', totalMoney.toFixed(2));
        updateDisplay();
        
        // Confetti or simple alert
        alert(`Thanks! You generated $${reward} (fake dollars) for us!`);
    }

    function updateDisplay() {
        moneyCounter.textContent = `$${totalMoney.toFixed(2)}`;
        
        // Fun easter egg if they watch too many
        if (totalMoney > 1.00 && totalMoney < 1.10) {
            alert("Wow, you really like ads? Go read a book!");
        }
    }
});