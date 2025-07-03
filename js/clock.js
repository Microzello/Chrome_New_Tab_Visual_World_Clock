class Clock {
    constructor(city, onDelete) {
        this.city = city;
        this.onDelete = onDelete;
        this.element = this.createClockElement();
        this.updateClock();
        this.interval = setInterval(() => this.updateClock(), 1000);
    }

    createClockElement() {
        const widget = document.createElement('div');
        widget.className = 'clock-widget';
        
        const clockFace = document.createElement('div');
        clockFace.className = 'clock-face';
        
        // Add clock hands
        const hourHand = document.createElement('div');
        hourHand.className = 'clock-hand hour-hand';
        
        const minuteHand = document.createElement('div');
        minuteHand.className = 'clock-hand minute-hand';
        
        const secondHand = document.createElement('div');
        secondHand.className = 'clock-hand second-hand';
        
        clockFace.appendChild(hourHand);
        clockFace.appendChild(minuteHand);
        clockFace.appendChild(secondHand);
        
        // Add city name and time text
        const cityName = document.createElement('div');
        cityName.className = 'city-name';
        cityName.textContent = this.city.name;
        
        const timeText = document.createElement('div');
        timeText.className = 'time-text';
        
        const dateText = document.createElement('div');
        dateText.className = 'date-text';
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-city-btn';
        deleteBtn.title = 'Remove city';
        deleteBtn.textContent = '\u00D7'; // Unicode multiplication sign
        deleteBtn.onclick = () => {
            if (this.onDelete) this.onDelete(this.city.name);
        };
        widget.appendChild(deleteBtn);

        widget.appendChild(clockFace);
        widget.appendChild(cityName);
        widget.appendChild(timeText);
        widget.appendChild(dateText);
        
        return widget;
    }

    updateClock() {
        const now = new Date();
        const cityTime = new Date(now.toLocaleString('en-US', { timeZone: this.city.timezone }));
        
        const hours = cityTime.getHours();
        const minutes = cityTime.getMinutes();
        const seconds = cityTime.getSeconds();
        
        // Update analog clock hands
        const hourDeg = (hours % 12 + minutes / 60) * 30;
        const minuteDeg = minutes * 6;
        const secondDeg = seconds * 6;
        
        const hourHand = this.element.querySelector('.hour-hand');
        const minuteHand = this.element.querySelector('.minute-hand');
        const secondHand = this.element.querySelector('.second-hand');
        
        hourHand.style.transform = `rotate(${hourDeg}deg)`;
        minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
        secondHand.style.transform = `rotate(${secondDeg}deg)`;
        
        // Update digital time
        const timeText = this.element.querySelector('.time-text');
        timeText.textContent = cityTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        // Update date
        const dateText = this.element.querySelector('.date-text');
        dateText.textContent = cityTime.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }

    destroy() {
        clearInterval(this.interval);
        this.element.remove();
    }
}
