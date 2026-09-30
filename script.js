
document.addEventListener('DOMContentLoaded', () => {
    const starNameInput = document.getElementById('starName');
    const azimuthInput = document.getElementById('azimuth');
    const altitudeInput = document.getElementById('altitude');
    const constellationInput = document.getElementById('constellation');
    const connectionsInput = document.getElementById('connections');
    const addStarBtn = document.getElementById('addStarBtn');
    const starTableBody = document.getElementById('starTable').getElementsByTagName('tbody')[0];
    
    // Canvas setup
    const skyChartCanvas = document.getElementById('skyChart');
    const ctx = skyChartCanvas.getContext('2d');
    const canvasWidth = skyChartCanvas.width;
    const canvasHeight = skyChartCanvas.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maxCanvasRadius = Math.min(centerX, centerY) * 0.9; // Max radius for the plot

    let stars = initialStarsData || []; // Initialize with data from Python

    // Function to convert (azimuth, altitude) to canvas (x, y) coordinates
    function getCanvasCoords(az, alt) {
        // Convert azimuth to radians (0-360 to 0-2PI, North=0, clockwise)
        const theta = (az * Math.PI / 180); // Azimuth is already clockwise from North
        // Convert altitude to a radial distance (0-90 alt to 90-0 r)
        // r=0 (zenith) at center, r=90 (horizon) at edge
        const r_polar = 90 - alt;
        // Scale polar r to canvas radius
        const canvas_r = (r_polar / 90) * maxCanvasRadius;

        // Convert polar to Cartesian coordinates for canvas
        // x = center_x + r * sin(theta)
        // y = center_y - r * cos(theta) (y-axis is inverted on canvas)
        const x = centerX + canvas_r * Math.sin(theta);
        const y = centerY - canvas_r * Math.cos(theta);
        return { x, y };
    }

    // Function to draw the sky chart on canvas
    function drawSkyChart() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear canvas
        ctx.fillStyle = '#1a0933'; // Set background color to match Python plot
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw grid lines (simplified for brevity, can be enhanced)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        // Draw circles for altitude
        for (let r_val = 30; r_val <= 90; r_val += 30) {
            const canvas_r = (r_val / 90) * maxCanvasRadius;
            ctx.beginPath();
            ctx.arc(centerX, centerY, canvas_r, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // Draw radial lines for azimuth
        for (let az_val = 0; az_val < 360; az_val += 45) {
            const { x, y } = getCanvasCoords(az_val, 0); // Plot at horizon
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Draw constellation lines first (similar to Python logic)
        const drawnConnections = new Set();
        ctx.strokeStyle = '#add8e6'; // Light blue lines
        ctx.lineWidth = 1.5;
        stars.forEach(star => {
            const { x: startX, y: startY } = getCanvasCoords(star.azimuth, star.altitude);
            star.connections.forEach(targetName => {
                const targetStar = stars.find(s => s.name === targetName);
                if (targetStar) {
                    const { x: endX, y: endY } = getCanvasCoords(targetStar.azimuth, targetStar.altitude);
                    const connectionId = [star.name, targetName].sort().join('-');
                    if (!drawnConnections.has(connectionId)) {
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        drawnConnections.add(connectionId);
                    }
                }
            });
        });

        // Draw stars (yellow 'X' markers)
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1.5;
        stars.forEach(star => {
            const { x, y } = getCanvasCoords(star.azimuth, star.altitude);
            // Draw a cross (X) marker
            const markerSize = 8;
            ctx.beginPath();
            ctx.moveTo(x - markerSize / 2, y - markerSize / 2);
            ctx.lineTo(x + markerSize / 2, y + markerSize / 2);
            ctx.moveTo(x + markerSize / 2, y - markerSize / 2);
            ctx.lineTo(x - markerSize / 2, y + markerSize / 2);
            ctx.stroke();
        });

        // Draw constellation names (simplified, without complex barycenter logic for now)
        const constellationsMap = {};
        stars.forEach(star => {
            if (star.constellation) {
                if (!constellationsMap[star.constellation]) {
                    constellationsMap[star.constellation] = { sumX: 0, sumY: 0, count: 0, stars: [] };
                }
                const { x, y } = getCanvasCoords(star.azimuth, star.altitude);
                constellationsMap[star.constellation].sumX += x;
                constellationsMap[star.constellation].sumY += y;
                constellationsMap[star.constellation].count++;
                constellationsMap[star.constellation].stars.push(star);
            }
        });

        ctx.fillStyle = 'white'; // White text for constellation names
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const constName in constellationsMap) {
            const constData = constellationsMap[constName];
            // Simple centroid for now
            const avgX = constData.sumX / constData.count;
            const avgY = constData.sumY / constData.count;

            // Find outermost star for label placement to push it slightly outward
            let maxRadialDistance = 0;
            constData.stars.forEach(star => {
                const { x, y } = getCanvasCoords(star.azimuth, star.altitude);
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxRadialDistance) {
                    maxRadialDistance = dist;
                }
            });

            // Place label slightly beyond the outermost star of the constellation
            const currentAngle = Math.atan2(avgY - centerY, avgX - centerX);
            const labelRadius = Math.min(maxRadialDistance + 20, maxCanvasRadius - 10); // Clamp to prevent going off canvas
            const labelX = centerX + labelRadius * Math.cos(currentAngle);
            const labelY = centerY + labelRadius * Math.sin(currentAngle);

            ctx.fillText(constName.toUpperCase(), labelX, labelY);
        }
    }

    // Function to render the table
    function renderTable() {
        starTableBody.innerHTML = ''; // Clear existing rows
        stars.forEach((star, index) => {
            const row = starTableBody.insertRow();
            row.insertCell().textContent = star.name;
            row.insertCell().textContent = star.azimuth;
            row.insertCell().textContent = star.altitude;
            row.insertCell().textContent = star.constellation;
            row.insertCell().textContent = star.connections.join(', ');

            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('action-btn', 'edit-btn');
            editBtn.addEventListener('click', () => editStar(index));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('action-btn');
            deleteBtn.addEventListener('click', () => deleteStar(index));

            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
        drawSkyChart(); // Redraw canvas after table update
    }

    // Function to add a new star
    addStarBtn.addEventListener('click', () => {
        const name = starNameInput.value.trim();
        const azimuth = parseInt(azimuthInput.value, 10);
        const altitude = parseInt(altitudeInput.value, 10);
        const constellation = constellationInput.value.trim();
        const connections = connectionsInput.value.split(',').map(c => c.trim()).filter(c => c !== '');

        if (name && !isNaN(azimuth) && !isNaN(altitude) && azimuth >= 0 && azimuth <= 360 && altitude >= 0 && altitude <= 90) {
            stars.push({
                name: name,
                azimuth: azimuth,
                altitude: altitude,
                constellation: constellation,
                connections: connections
            });
            renderTable();
            // Clear form
            starNameInput.value = '';
            azimuthInput.value = '';
            altitudeInput.value = '';
            constellationInput.value = '';
            connectionsInput.value = '';
        } else {
            alert('Please fill in Name, Azimuth (0-360), and Altitude (0-90) correctly.');
        }
    });

    // Function to edit a star (basic implementation: populate form for re-submission)
    function editStar(index) {
        const star = stars[index];
        starNameInput.value = star.name;
        azimuthInput.value = star.azimuth;
        altitudeInput.value = star.altitude;
        constellationInput.value = star.constellation;
        connectionsInput.value = star.connections.join(', ');

        // Remove the star from the array so it can be re-added/updated
        stars.splice(index, 1);
        renderTable();
        alert('Star data loaded into form for editing. Click "Add Star" to update.');
    }

    // Function to delete a star
    function deleteStar(index) {
        if (confirm(`Are you sure you want to delete ${stars[index].name}?`)) {
            stars.splice(index, 1);
            renderTable();
        }
    }

    // Initial render of table and canvas
    renderTable();
    drawSkyChart();
});
