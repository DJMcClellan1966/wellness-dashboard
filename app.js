// Wellness Dashboard Application
class WellnessDashboard {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.wellnessTips = [
            "💧 Staying hydrated improves focus and energy levels throughout the day.",
            "🚶 Walking 10,000 steps daily can reduce the risk of chronic diseases.",
            "😴 Quality sleep is essential for mental health and physical recovery.",
            "🧘 Take 5-minute breaks every hour to stretch and relax your mind.",
            "🥗 Eating colorful fruits and vegetables provides essential nutrients.",
            "☀️ Getting morning sunlight helps regulate your sleep-wake cycle.",
            "🏃 Regular exercise releases endorphins, boosting your mood naturally.",
            "📱 Limit screen time before bed for better sleep quality.",
            "🧠 Practice mindfulness or meditation to reduce stress and anxiety.",
            "👥 Social connections are vital for emotional wellbeing.",
            "🍎 Meal planning helps maintain consistent, healthy eating habits.",
            "💪 Strength training twice a week helps maintain bone density.",
            "🌿 Spending time in nature reduces stress and improves mental clarity.",
            "📝 Journaling can help process emotions and track personal growth.",
            "🎵 Music can enhance mood and improve exercise performance.",
            "🧊 Cold showers may boost circulation and mental alertness.",
            "🫖 Green tea contains antioxidants that support overall health.",
            "🤸 Flexibility exercises prevent injuries and improve mobility.",
            "😊 Smiling, even when you don't feel like it, can improve your mood.",
            "🎯 Setting small, achievable goals builds confidence and momentum."
        ];
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateProgressBars();
        this.updateWeeklyStats();
        this.displayRandomTip();
        this.loadHistory();
        this.checkGoals();
    }

    setupEventListeners() {
        // Save metrics button
        document.getElementById('save-metrics').addEventListener('click', () => {
            this.saveMetrics();
        });

        // Metric inputs - update progress bars in real-time
        ['steps', 'water', 'sleep', 'exercise'].forEach(metric => {
            document.getElementById(metric).addEventListener('input', () => {
                this.updateProgressBars();
            });
        });

        // Mood buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMood(e.currentTarget);
            });
        });

        // New tip button
        document.getElementById('new-tip').addEventListener('click', () => {
            this.displayRandomTip();
        });

        // Clear data button
        document.getElementById('clear-data').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all your wellness data? This cannot be undone.')) {
                this.clearAllData();
            }
        });

        // Goal checkboxes
        document.querySelectorAll('.goal-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.saveGoals();
            });
        });
    }

    loadData() {
        const todayData = this.getTodayData();
        if (todayData) {
            document.getElementById('steps').value = todayData.steps || '';
            document.getElementById('water').value = todayData.water || '';
            document.getElementById('sleep').value = todayData.sleep || '';
            document.getElementById('exercise').value = todayData.exercise || '';
            
            if (todayData.mood) {
                const moodBtn = document.querySelector(`[data-mood="${todayData.mood}"]`);
                if (moodBtn) {
                    this.selectMood(moodBtn, false);
                }
            }
        }
    }

    getTodayData() {
        const allData = JSON.parse(localStorage.getItem('wellnessData') || '{}');
        return allData[this.currentDate];
    }

    saveMetrics() {
        const steps = parseInt(document.getElementById('steps').value) || 0;
        const water = parseInt(document.getElementById('water').value) || 0;
        const sleep = parseFloat(document.getElementById('sleep').value) || 0;
        const exercise = parseInt(document.getElementById('exercise').value) || 0;

        const allData = JSON.parse(localStorage.getItem('wellnessData') || '{}');
        
        if (!allData[this.currentDate]) {
            allData[this.currentDate] = {};
        }

        allData[this.currentDate] = {
            ...allData[this.currentDate],
            steps,
            water,
            sleep,
            exercise,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('wellnessData', JSON.stringify(allData));
        
        this.showToast('✅ Metrics saved successfully!');
        this.updateWeeklyStats();
        this.loadHistory();
        this.checkGoals();
    }

    selectMood(button, save = true) {
        // Remove selected class from all buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Add selected class to clicked button
        button.classList.add('selected');

        const mood = button.dataset.mood;
        const feedbackMessages = {
            excellent: "That's wonderful! Keep up the positive energy! 🌟",
            good: "Great to hear! Stay on track with your wellness goals! 💪",
            okay: "Take some time for self-care today. You've got this! 🌱",
            bad: "Sorry you're feeling down. Try a short walk or reach out to someone. 💙",
            terrible: "Take it one step at a time. Consider talking to someone you trust. 🤗"
        };

        document.getElementById('mood-feedback').textContent = feedbackMessages[mood];

        if (save) {
            const allData = JSON.parse(localStorage.getItem('wellnessData') || '{}');
            if (!allData[this.currentDate]) {
                allData[this.currentDate] = {};
            }
            allData[this.currentDate].mood = mood;
            localStorage.setItem('wellnessData', JSON.stringify(allData));
            this.showToast('😊 Mood saved!');
        }
    }

    updateProgressBars() {
        const goals = {
            steps: 10000,
            water: 8,
            sleep: 8,
            exercise: 30
        };

        Object.keys(goals).forEach(metric => {
            const value = parseFloat(document.getElementById(metric).value) || 0;
            const goal = goals[metric];
            const percentage = Math.min((value / goal) * 100, 100);
            document.getElementById(`${metric}-progress`).style.width = `${percentage}%`;
        });
    }

    updateWeeklyStats() {
        const allData = JSON.parse(localStorage.getItem('wellnessData') || '{}');
        const dates = Object.keys(allData).sort().reverse();
        const last7Days = dates.slice(0, 7);

        if (last7Days.length === 0) {
            document.getElementById('avg-steps').textContent = '0';
            document.getElementById('avg-water').textContent = '0';
            document.getElementById('avg-sleep').textContent = '0';
            document.getElementById('streak').textContent = '0';
            return;
        }

        let totalSteps = 0, totalWater = 0, totalSleep = 0;
        let streak = 0;

        last7Days.forEach((date, index) => {
            const data = allData[date];
            totalSteps += data.steps || 0;
            totalWater += data.water || 0;
            totalSleep += data.sleep || 0;

            // Calculate streak (consecutive days with data)
            if (data.steps || data.water || data.sleep || data.exercise) {
                if (index === streak) {
                    streak++;
                }
            }
        });

        const avgSteps = Math.round(totalSteps / last7Days.length);
        const avgWater = (totalWater / last7Days.length).toFixed(1);
        const avgSleep = (totalSleep / last7Days.length).toFixed(1);

        document.getElementById('avg-steps').textContent = avgSteps.toLocaleString();
        document.getElementById('avg-water').textContent = avgWater;
        document.getElementById('avg-sleep').textContent = avgSleep + 'h';
        document.getElementById('streak').textContent = streak;
    }

    displayRandomTip() {
        const randomIndex = Math.floor(Math.random() * this.wellnessTips.length);
        const tip = this.wellnessTips[randomIndex];
        document.querySelector('.tip-text').textContent = tip;
    }

    loadHistory() {
        const allData = JSON.parse(localStorage.getItem('wellnessData') || '{}');
        const dates = Object.keys(allData).sort().reverse();
        const historyContainer = document.getElementById('history-list');

        if (dates.length === 0) {
            historyContainer.innerHTML = '<p class="empty-state">No data yet. Start tracking your wellness!</p>';
            return;
        }

        let html = '';
        dates.slice(0, 10).forEach(date => {
            const data = allData[date];
            const moodEmoji = {
                excellent: '😄',
                good: '🙂',
                okay: '😐',
                bad: '☹️',
                terrible: '😢'
            };

            const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            html += `
                <div class="history-item">
                    <div class="history-date">${displayDate} ${data.mood ? moodEmoji[data.mood] : ''}</div>
                    <div class="history-metrics">
                        <div>🚶 Steps: ${data.steps || 0}</div>
                        <div>💧 Water: ${data.water || 0} glasses</div>
                        <div>😴 Sleep: ${data.sleep || 0} hours</div>
                        <div>🏃 Exercise: ${data.exercise || 0} min</div>
                    </div>
                </div>
            `;
        });

        historyContainer.innerHTML = html;
    }

    checkGoals() {
        const todayData = this.getTodayData();
        const goals = JSON.parse(localStorage.getItem('goals') || '{}');
        
        if (!todayData) return;

        // Auto-check goals based on metrics
        document.getElementById('goal-hydration').checked = 
            goals['goal-hydration'] || (todayData.water >= 8);
        document.getElementById('goal-steps').checked = 
            goals['goal-steps'] || (todayData.steps >= 10000);
        document.getElementById('goal-sleep').checked = 
            goals['goal-sleep'] || (todayData.sleep >= 8);
        document.getElementById('goal-exercise').checked = 
            goals['goal-exercise'] || (todayData.exercise >= 30);
    }

    saveGoals() {
        const goals = {};
        document.querySelectorAll('.goal-item input[type="checkbox"]').forEach(checkbox => {
            goals[checkbox.id] = checkbox.checked;
        });
        localStorage.setItem('goals', JSON.stringify(goals));
    }

    clearAllData() {
        localStorage.removeItem('wellnessData');
        localStorage.removeItem('goals');
        
        // Reset form
        document.getElementById('steps').value = '';
        document.getElementById('water').value = '';
        document.getElementById('sleep').value = '';
        document.getElementById('exercise').value = '';
        
        // Reset mood
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('mood-feedback').textContent = '';
        
        // Reset goals
        document.querySelectorAll('.goal-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateProgressBars();
        this.updateWeeklyStats();
        this.loadHistory();
        
        this.showToast('🗑️ All data cleared!');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WellnessDashboard();
});
