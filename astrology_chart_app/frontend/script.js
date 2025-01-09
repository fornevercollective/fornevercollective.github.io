document.addEventListener('DOMContentLoaded', function() {
    fetch('/calculate?date=2023-10-01&time=12:00:00&latitude=40.7128&longitude=-74.0060')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('chart').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        label: 'Planetary Positions',
                        data: Object.values(data).map(planet => planet.lon),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            beginAtZero: true
                        }
                    }
                }
            });
        });
});
