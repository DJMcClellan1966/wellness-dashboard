// ScreenBalance - Digital Wellness Dashboard
// All data stays on your device

class ScreenBalance {
    constructor() {
        this.currentSession = null;
        this.sessionInterval = null;
        this.distractionCount = 0;
        
        // Constants
        this.MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
        this.BREAK_REMINDER_MINUTES = 45;
        this.DATA_RETENTION_DAYS = 7;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateDashboard();
        this.checkBreakReminder();
        this.generateInsights();
        this.renderChart();
        
        // Check break reminder every minute
        setInterval(() => this.checkBreakReminder(), 60000);
        
        // Update insights every 30 minutes
        setInterval(() => this.generateInsights(), 1800000);
    }

    loadData() {
        // Load from localStorage
        this.data = JSON.parse(localStorage.getItem('screenBalanceData')) || {
            scores: [],
            sessions: [],
            breaks: [],
            insights: [],
            lastBreak: null,
            activeTime: 0
        };
        
        // Clean old data (keep last 7 days)
        const sevenDaysAgo = Date.now() - (this.DATA_RETENTION_DAYS * this.MILLISECONDS_PER_DAY);
        this.data.scores = this.data.scores.filter(s => s.timestamp > sevenDaysAgo);
        this.data.sessions = this.data.sessions.filter(s => s.timestamp > sevenDaysAgo);
        this.data.breaks = this.data.breaks.filter(b => b.timestamp > sevenDaysAgo);
    }

    saveData() {
        localStorage.setItem('screenBalanceData', JSON.stringify(this.data));
    }

    setupEventListeners() {
        // Quick Actions
        document.getElementById('startFocusBtn').addEventListener('click', () => {
            this.showFocusSelector();
        });
        
        document.getElementById('takeBreakBtn').addEventListener('click', () => {
            this.takeBreak();
        });
        
        document.getElementById('viewInsightsBtn').addEventListener('click', () => {
            document.getElementById('insightsSection').scrollIntoView({ behavior: 'smooth' });
        });
        
        // Focus Session
        document.getElementById('cancelFocusBtn').addEventListener('click', () => {
            this.hideFocusSelector();
        });
        
        document.getElementById('endSessionBtn').addEventListener('click', () => {
            this.endSession(false);
        });
        
        // Session Type Selection
        document.querySelectorAll('.session-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const duration = parseInt(btn.dataset.duration);
                const icon = btn.dataset.icon;
                this.startSession(type, duration, icon);
            });
        });
        
        // Track user activity for distraction counting
        let activityTimeout;
        document.addEventListener('visibilitychange', () => {
            if (this.currentSession && document.hidden) {
                this.distractionCount++;
                this.updateSessionDisplay();
            }
        });
    }

    showFocusSelector() {
        document.getElementById('focusSelector').style.display = 'block';
        document.getElementById('focusSelector').scrollIntoView({ behavior: 'smooth' });
    }

    hideFocusSelector() {
        document.getElementById('focusSelector').style.display = 'none';
    }

    startSession(type, duration, icon) {
        this.hideFocusSelector();
        
        this.currentSession = {
            type,
            duration,
            icon,
            startTime: Date.now(),
            goalMinutes: duration,
            elapsed: 0
        };
        
        this.distractionCount = 0;
        
        // Show active session
        document.getElementById('activeSessionSection').style.display = 'block';
        document.getElementById('sessionIcon').textContent = icon;
        document.getElementById('sessionType').textContent = this.formatSessionType(type);
        document.getElementById('sessionGoal').textContent = `${duration} min`;
        document.getElementById('distractionCount').textContent = '0';
        
        // Start timer
        this.sessionInterval = setInterval(() => {
            this.updateSession();
        }, 1000);
        
        // Scroll to session
        document.getElementById('activeSessionSection').scrollIntoView({ behavior: 'smooth' });
    }

    updateSession() {
        if (!this.currentSession) return;
        
        const elapsed = Math.floor((Date.now() - this.currentSession.startTime) / 1000);
        const totalSeconds = this.currentSession.goalMinutes * 60;
        const remaining = Math.max(0, totalSeconds - elapsed);
        
        // Update timer display
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        document.getElementById('sessionTimer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Update progress bar
        const progress = (elapsed / totalSeconds) * 100;
        document.getElementById('progressFill').style.width = `${Math.min(100, progress)}%`;
        
        // Check if session complete
        if (remaining === 0) {
            this.endSession(true);
        }
    }

    updateSessionDisplay() {
        if (!this.currentSession) return;
        document.getElementById('distractionCount').textContent = this.distractionCount;
    }

    endSession(completed) {
        if (!this.currentSession) return;
        
        clearInterval(this.sessionInterval);
        
        const elapsed = Math.floor((Date.now() - this.currentSession.startTime) / 60000);
        const sessionData = {
            ...this.currentSession,
            endTime: Date.now(),
            timestamp: Date.now(),
            completed,
            actualMinutes: elapsed,
            distractions: this.distractionCount,
            success: completed && this.distractionCount < 5
        };
        
        this.data.sessions.push(sessionData);
        this.data.activeTime += elapsed;
        
        // Show completion message
        if (completed) {
            this.showNotification('🎯 Focus Session Complete!', 
                `You successfully completed a ${elapsed}-minute ${this.formatSessionType(this.currentSession.type)} session.`);
        }
        
        this.currentSession = null;
        this.distractionCount = 0;
        
        document.getElementById('activeSessionSection').style.display = 'none';
        
        this.saveData();
        this.updateDashboard();
        this.generateInsights();
    }

    takeBreak() {
        const breakData = {
            timestamp: Date.now(),
            duration: 5 // Default 5 minute break
        };
        
        this.data.breaks.push(breakData);
        this.data.lastBreak = Date.now();
        
        this.showNotification('🚶 Break Time!', 
            'Great job taking a break! Rest your eyes and recharge. Suggested: 5-minute walk or stretch.');
        
        this.saveData();
        this.updateDashboard();
        this.generateInsights();
    }

    checkBreakReminder() {
        if (!this.data.lastBreak) {
            this.data.lastBreak = Date.now();
            return;
        }
        
        const timeSinceBreak = Date.now() - this.data.lastBreak;
        const minutesSinceBreak = Math.floor(timeSinceBreak / 60000);
        
        // Remind after configured minutes
        if (minutesSinceBreak >= this.BREAK_REMINDER_MINUTES && !this.currentSession) {
            this.showNotification('⏰ Break Reminder', 
                `You haven't taken a break in ${minutesSinceBreak} minutes. Time to rest your eyes! 👀`);
        }
    }

    calculateEnergyScore() {
        let score = 100;
        
        // Get today's data
        const today = this.getTodayData();
        
        // Screen time penalty (based on active time)
        const activeHours = today.activeTime / 60;
        if (activeHours > 6) score -= 30;
        else if (activeHours > 4) score -= 15;
        
        // Break frequency check
        const timeSinceLastBreak = this.data.lastBreak ? 
            (Date.now() - this.data.lastBreak) / 60000 : 0;
        if (timeSinceLastBreak > 60) score -= 20;
        else if (timeSinceLastBreak > 45) score -= 10;
        
        // Focus session bonus
        const focusBonus = Math.min(15, today.sessions.length * 5);
        score += focusBonus;
        
        // Distraction penalty
        const totalDistractions = today.sessions.reduce((sum, s) => sum + (s.distractions || 0), 0);
        if (totalDistractions > 10) score -= 15;
        else if (totalDistractions > 5) score -= 8;
        
        // Time of day consideration
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 6) {
            score -= 10; // Late night usage penalty
        }
        
        return Math.max(0, Math.min(100, score));
    }

    getScoreCategory(score) {
        if (score >= 80) return { emoji: '🌟', status: 'Optimal wellness', color: 'optimal' };
        if (score >= 60) return { emoji: '😊', status: 'Good balance', color: 'good' };
        if (score >= 40) return { emoji: '😐', status: 'Moderate concern', color: 'moderate' };
        if (score >= 20) return { emoji: '😕', status: 'Low wellness', color: 'low' };
        return { emoji: '🔴', status: 'Critical attention needed', color: 'critical' };
    }

    getTodayData() {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        return {
            sessions: this.data.sessions.filter(s => s.timestamp >= todayStart),
            breaks: this.data.breaks.filter(b => b.timestamp >= todayStart),
            activeTime: this.data.sessions
                .filter(s => s.timestamp >= todayStart)
                .reduce((sum, s) => sum + (s.actualMinutes || 0), 0)
        };
    }

    updateDashboard() {
        // Update energy score
        const score = this.calculateEnergyScore();
        const category = this.getScoreCategory(score);
        
        document.getElementById('scoreValue').textContent = score;
        document.getElementById('scoreEmoji').textContent = category.emoji;
        document.getElementById('scoreStatus').textContent = category.status;
        
        const scoreCircle = document.getElementById('scoreCircle');
        scoreCircle.className = `score-circle score-${category.color}`;
        
        // Update recommendation
        const recommendation = this.getSmartRecommendation(score);
        document.getElementById('recommendationText').textContent = recommendation;
        
        // Update today's stats
        const today = this.getTodayData();
        document.getElementById('focusSessionsToday').textContent = today.sessions.length;
        document.getElementById('breaksToday').textContent = today.breaks.length;
        document.getElementById('activeTimeToday').textContent = `${today.activeTime}m`;
        
        const avgScore = this.data.scores.length > 0 ?
            Math.round(this.data.scores.reduce((sum, s) => sum + s.score, 0) / this.data.scores.length) : score;
        document.getElementById('avgScoreToday').textContent = avgScore;
        
        // Save score
        this.data.scores.push({
            timestamp: Date.now(),
            score
        });
        
        this.saveData();
    }

    getSmartRecommendation(score) {
        const hour = new Date().getHours();
        const today = this.getTodayData();
        
        // Time-based recommendations
        if (hour >= 6 && hour < 10) {
            if (today.sessions.length === 0) {
                return "Good morning! Start your day with a focused session to build momentum.";
            }
            return "Morning energy is high! Perfect time for deep work. ☀️";
        }
        
        if (hour >= 14 && hour < 16) {
            if (today.breaks.length < 2) {
                return "Afternoon slump? Take a quick break and recharge with a walk or stretch.";
            }
        }
        
        if (hour >= 20) {
            return "Evening wind-down time. Consider reducing screen time for better sleep. 🌙";
        }
        
        // Score-based recommendations
        if (score >= 80) {
            return "You're doing great! Keep maintaining that healthy balance. 🌟";
        }
        
        if (score >= 60) {
            return "Good progress! Try taking regular breaks to maintain your wellness.";
        }
        
        if (score >= 40) {
            return "Time to rebalance. Start a focus session or take a break to improve your score.";
        }
        
        if (today.sessions.length === 0) {
            return "Start a focus session to boost your productivity and wellness score!";
        }
        
        const timeSinceBreak = this.data.lastBreak ? (Date.now() - this.data.lastBreak) / 60000 : 999;
        if (timeSinceBreak > 45) {
            return "You haven't taken a break in a while. Rest your eyes and recharge! 👀";
        }
        
        return "Stay mindful of your screen time. Regular breaks and focus sessions help! 💚";
    }

    generateInsights() {
        const insights = [];
        const today = this.getTodayData();
        const hour = new Date().getHours();
        const score = this.calculateEnergyScore();
        
        // Pattern-based insights
        if (today.activeTime > 360) {
            insights.push({
                icon: '⚠️',
                title: 'High Screen Time Detected',
                message: 'You\'ve been active for over 6 hours today. Take an extended break to prevent digital fatigue.',
                priority: 'high'
            });
        }
        
        const totalDistractions = today.sessions.reduce((sum, s) => sum + (s.distractions || 0), 0);
        if (totalDistractions > 10) {
            insights.push({
                icon: '🎯',
                title: 'High Distraction Level',
                message: `You've been distracted ${totalDistractions} times today. Try turning on Do Not Disturb mode for your next focus session.`,
                priority: 'medium'
            });
        }
        
        const timeSinceBreak = this.data.lastBreak ? (Date.now() - this.data.lastBreak) / 60000 : 999;
        if (timeSinceBreak > 120) {
            insights.push({
                icon: '🚶',
                title: 'Break Needed',
                message: 'You haven\'t taken a break in over 2 hours. Stand up, stretch, and give your eyes a rest.',
                priority: 'high'
            });
        }
        
        if (hour >= 22 || hour < 6) {
            insights.push({
                icon: '🌙',
                title: 'Late Night Usage',
                message: 'Late-night screen time can affect sleep quality. Consider winding down for the day.',
                priority: 'medium'
            });
        }
        
        // Positive reinforcement
        if (today.sessions.length >= 3) {
            insights.push({
                icon: '🎉',
                title: 'Great Productivity!',
                message: `You've completed ${today.sessions.length} focus sessions today. Excellent work!`,
                priority: 'low'
            });
        }
        
        if (today.breaks.length >= 3) {
            insights.push({
                icon: '👏',
                title: 'Healthy Break Habits',
                message: `You've taken ${today.breaks.length} breaks today. Great job maintaining balance!`,
                priority: 'low'
            });
        }
        
        if (score >= 80 && today.sessions.length > 0) {
            insights.push({
                icon: '✨',
                title: 'Optimal Wellness',
                message: 'You\'re in the optimal wellness zone! Keep up these healthy digital habits.',
                priority: 'low'
            });
        }
        
        // Default welcome insight
        if (insights.length === 0) {
            insights.push({
                icon: '💡',
                title: 'Welcome to ScreenBalance',
                message: 'Start tracking your digital wellness with focus sessions and breaks. Your journey to better balance begins now!',
                priority: 'low'
            });
        }
        
        this.displayInsights(insights);
    }

    displayInsights(insights) {
        const container = document.getElementById('insightsList');
        container.innerHTML = '';
        
        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        insights.forEach(insight => {
            const card = document.createElement('div');
            card.className = 'insight-card';
            card.innerHTML = `
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <strong>${insight.title}</strong>
                    <p>${insight.message}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderChart() {
        const canvas = document.getElementById('wellnessChart');
        const ctx = canvas.getContext('2d');
        
        // Get last 7 days of data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const scores = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const dayScores = this.data.scores.filter(s => {
                const scoreDate = new Date(s.timestamp);
                scoreDate.setHours(0, 0, 0, 0);
                return scoreDate.getTime() === date.getTime();
            });
            
            if (dayScores.length > 0) {
                const avg = dayScores.reduce((sum, s) => sum + s.score, 0) / dayScores.length;
                scores.push(Math.round(avg));
            } else {
                scores.push(null);
            }
        }
        
        // Simple chart rendering
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = (height - 40) * (i / 4) + 20;
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
            
            // Y-axis labels
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((100 - i * 25).toString(), 35, y + 4);
        }
        
        // Draw line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const xStep = (width - 60) / 6;
        let lastPoint = null;
        
        scores.forEach((score, i) => {
            if (score !== null) {
                const x = 40 + i * xStep;
                const y = height - 40 - ((score / 100) * (height - 60));
                
                if (lastPoint) {
                    ctx.beginPath();
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                
                // Draw point
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                lastPoint = { x, y };
            }
            
            // X-axis labels
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            const labelX = 40 + i * xStep;
            const dayIndex = (new Date().getDay() - 6 + i + 7) % 7;
            ctx.fillText(days[dayIndex], labelX, height - 15);
        });
    }

    showNotification(title, message) {
        // Simple notification using alert for now
        // In production, use a proper notification system
        const notification = {
            title,
            message,
            timestamp: Date.now()
        };
        
        console.log('Notification:', notification);
        
        // You could implement a toast notification here
        alert(`${title}\n\n${message}`);
    }

    formatSessionType(type) {
        const types = {
            work: 'Work Session',
            study: 'Study Session',
            creative: 'Creative Session',
            deep: 'Deep Focus',
            reading: 'Reading Session',
            meditation: 'Meditation'
        };
        return types[type] || 'Focus Session';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.screenBalance = new ScreenBalance();
});
