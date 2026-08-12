
// Define hotspots with ID, title, and position (percentages)
const hotspots = [
    { id: '401', title: 'Dr. VIJAY BHATKAR seminar hall', top: 82, left: 29, photos: ['B-401.jpg'] },
    { id: '428', title: 'Controller System &  Sensor Transducer Lab', top: 85, left: 81, photos: ['B-428.jpg'] },
    { id: '420', title: 'Teachers Staff Room', top: 15, left: 67, photos: ['B-420.jpg'] },
    { id: '429', title: 'ClassRoom 429', top: 70, left: 81 , photos: ['B-429.jpg']},
    { id: '423', title: 'Switchgear & Protection lab', top: 12.5, left: 95 },
    { id: '424', title: 'Electrical Workshop & Hardware Lab', top: 29, left: 95, photos: ['B-424.jpg'] },
    { id: '425', title: 'Electrical Department', top: 50, left: 95 , photos: ['B-425.jpg']},
    { id: '426', title: 'BEE Lab', top: 69, left: 95, photos: ['B-426.jpg'] },
    { id: '427', title: 'Power Electronic & Network Theory Lab', top: 85, left: 95 , photos: ['B-427.jpg']},
    { id: '422', title: 'ClassRoom 422', top: 12.5, left: 81, photos: ['B-422.jpg'] },
    { id: '421', title: 'ClassRoom 421', top: 30, left: 81, photos: ['B-421.jpg'] },
    { id: '418', title: 'Music Room', top: 15, left: 52 },
    { id: '417', title: 'Department of CSE & ELE DIPLOMA', top: 29, left: 43 , photos: ['B-416(a).jpg','B-416(b).jpg']},
  //  { id: '417', title: 'ClassRoom 417', top: 25, left: 46 },
    { id: '410', title: 'ClassRoom 410', top: 12.5, left: 19, photos: ['B-410.jpg'] },
    { id: '411', title: 'Project Lab', top: 25, left: 19,url:'https://docs.google.com/presentation/d/1iy2ilD5WidPMAWUezHiLy0VuMaTzT0w_/edit#slide=id.p1', photos: ['B-411(a).jpg','B-411(b).jpg'] },
    { id: '402', title: 'Wireless Communication and Computing Lab', top: 74, left: 20, url: 'https://docs.google.com/presentation/d/1c08Nje5z6v5p79Cxb8hmx6SKCdnIDvKD/edit#slide=id.p1', photos: ['B-402.jpg'] },
    { id: '403', title: 'Smart Room', top: 85, left: 20 , photos: ['B-403(a).jpg','B-403(b).jpg']},
    { id: '409A', title: 'ClassRoom 409', top: 11, left: 5, photos: ['B-409(a).jpg'] },
    { id: '408', title: 'DMS Lab', top: 25, left: 5, url: 'https://docs.google.com/presentation/d/1V2pqfRFH32hMRLutHY0YaAL25mrSxJQ7/edit#slide=id.p1', photos: ['B-408.jpg'] },
    { id: '407', title: 'Department of CSE & IT', top: 42, left: 5 },
    { id: '406', title: 'Digital and Microcontroller Lab', top: 55, left: 5, photos: ['B-406.jpg'] },
    { id: '405', title: 'Operating System Lab', top: 70, left: 5, url: 'https://docs.google.com/presentation/d/140Wyf2-jA1U_VrnGVdVVtqMszctoXG-k/edit#slide=id.p1', photos: ['B-405.jpg']},
    { id: '404', title: 'ClassRoom 404', top: 85, left: 5, photos: ['B-404.jpg'] },
    { id: '413', title: 'Computer Network Lab', top: 12.5, left: 25, url: 'https://docs.google.com/presentation/d/13--3G2k2H-KxYdbu_q4LA4U6YmtzmjHr/edit#slide=id.p1', photos: ['B-413.jpg'] },
    { id: '412', title: 'Web Technology & DSA Lab', top: 25, left: 25, url: 'https://docs.google.com/presentation/d/126b8cYX1Zm2AdSA2NONEHwiEH-m6lDCH/edit#slide=id.p1', photos: ['B-412.jpg'] },
    { id: '409B', title: 'Staff', top: 9, left: 12.5, photos: ['B-409(b).jpg'] },

    // Add more hotspots as needed
    { id: 'c1', title: 'c1', top: 16, left: 12 },
    { id: 'c2', title: 'c2', top: 30, left: 12 },
    { id: 'c3', title: 'c3', top: 39, left: 12 },
    { id: 'c4', title: 'c4', top: 54, left: 12 },
    { id: 'c5', title: 'c5', top: 60, left: 12 },
    { id: 'c6', title: 'c6', top: 75, left: 12 },
    { id: 'c7', title: 'c7', top: 84, left: 12 },

    { id: 'c8', title: 'c8', top: 40, left: 17 },
    { id: 'c9', title: 'c9', top: 60, left: 21 },
    { id: 'c10', title: 'c10', top: 60, left: 26 },

    { id: 'c11', title: 'c11', top: 16, left: 32 },
    { id: 'c12', title: 'c12', top: 30, left: 32 },
    { id: 'c13', title: 'c13', top: 40, left: 32 },
    { id: 'c14', title: 'c14', top: 60, left: 32 },

    { id: 'c15', title: 'c15', top: 40, left: 39 },
    { id: 'c16', title: 'c16', top: 40, left: 46 },
    { id: 'c17', title: 'c17', top: 40, left: 52 },
    { id: 'c18', title: 'c18', top: 40, left: 68 },

    { id: 'c19', title: 'c19', top: 50, left: 68 },
    { id: 'c20', title: 'c20', top: 61, left: 68 },

    { id: 'c21', title: 'c21', top: 18, left: 88 },
    { id: 'c22', title: 'c22', top: 37, left: 88 },
    { id: 'c23', title: 'c23', top: 50, left: 88 },
    { id: 'c24', title: 'c24', top: 62, left: 88 },
    { id: 'c25', title: 'c25', top: 80, left: 88 },


];

const corridorHotspots = [
    { id: 'c1', title: 'c1', top: 16, left: 12 },
    { id: 'c2', title: 'c2', top: 30, left: 12 },
    { id: 'c3', title: 'c3', top: 39, left: 12 },
    { id: 'c4', title: 'c4', top: 54, left: 12 },
    { id: 'c5', title: 'c5', top: 60, left: 12 },
    { id: 'c6', title: 'c6', top: 75, left: 12 },
    { id: 'c7', title: 'c7', top: 84, left: 12 },

    { id: 'c8', title: 'c8', top: 40, left: 17 },
    { id: 'c9', title: 'c9', top: 60, left: 21 },
    { id: 'c10', title: 'c10', top: 60, left: 26 },

    { id: 'c11', title: 'c11', top: 16, left: 32 },
    { id: 'c12', title: 'c12', top: 30, left: 32 },
    { id: 'c13', title: 'c13', top: 40, left: 32 },
    { id: 'c14', title: 'c14', top: 60, left: 32 },

    { id: 'c15', title: 'c15', top: 40, left: 39 },
    { id: 'c16', title: 'c16', top: 40, left: 46 },
    { id: 'c17', title: 'c17', top: 40, left: 52 },
    { id: 'c18', title: 'c18', top: 40, left: 68 },

    { id: 'c19', title: 'c19', top: 50, left: 68 },
    { id: 'c20', title: 'c20', top: 61, left: 68 },

    { id: 'c21', title: 'c21', top: 18, left: 88 },
    { id: 'c22', title: 'c22', top: 37, left: 88 },
    { id: 'c23', title: 'c23', top: 50, left: 88 },
    { id: 'c24', title: 'c24', top: 62, left: 88 },
    { id: 'c25', title: 'c25', top: 80, left: 88 },

];

const container = document.querySelector('.floor-plan-container');
const overlay = document.getElementById('overlay');
const notAvailableOverlay = document.getElementById('not-available-overlay');
const overlayText = document.getElementById('overlay-text');
let startRoomId; // Declare the variable



const roomCorridorMapping = {
    '401': ['c10'], '421': ['c22'],
    '402': ['c9'], '422': ['c21'],
    '403': ['c7'], '423': ['c21'],
    '404': ['c7'], '424': ['c22'],
    '405': ['c6'], '425': ['c23'],
    '406': ['c4'], '426': ['c24'],
    '407': ['c3'], '427': ['c25'],
    '408': ['c2'], '428': ['c25'],
    '409A': ['c1'], '429': ['c24'],
    '410': ['c1'], '409B': ['c1'],
    '411': ['c8'],
    '412': ['c12'],
    '413': ['c11'],
    '416': ['c15'],
    '417': ['c16'],
    '418': ['c17'],
    '420': ['c18'],
    // Add more mappings as needed
    'c1': ['409A', '409B', '410', 'c2'], 'c6': ['405', 'c5', 'c7'],
    'c2': ['408', 'c1', 'c3'], 'c7': ['404', 'c6', '403'],
    'c3': ['407', 'c2', 'c8', 'c4'], 'c8': ['c3', '411', 'c13'],
    'c4': ['406', 'c3', 'c5'], 'c9': ['c5', '402', 'c10'],
    'c5': ['c4', 'c6', 'c9'], 'c10': ['c9', '401', 'c14'],

    'c11': ['413', 'c12'], 'c16': ['c15', '417', 'c17'],
    'c12': ['412', 'c11', 'c13'], 'c17': ['c16', '418', 'c18'],
    'c13': ['c8', 'c12', 'c15', 'c14'], 'c18': ['c17', '420', 'c19'],
    'c14': ['c10', 'c13', 'c20'], 'c19': ['c18', 'c23', 'c20'],
    'c15': ['c13', '416', 'c16'], 'c20': ['c14', 'c19'],

    'c21': ['422', '423', 'c22'],
    'c22': ['421', 'c21', '424', 'c23'],
    'c23': ['c19', 'c22', '425', 'c24'],
    'c24': ['429', 'c23', '426', 'c25'],
    'c25': ['428', 'c24', 'c27',],
};

// Create and position hotspots
function createHotspots() {
    hotspots.forEach(hotspot => {
        const hotspotDiv = document.createElement('div');
        hotspotDiv.className = hotspot.id.startsWith('c') ? 'invisible-hotspot' : 'hotspot'; // Use invisible class for corridors
        hotspotDiv.style.top = `${hotspot.top}%`;
        hotspotDiv.style.left = `${hotspot.left}%`;

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerText = `Room ${hotspot.id}: ${hotspot.title}`;
        document.body.appendChild(tooltip); // Append tooltip to the body

        // Show tooltip on mouse enter
        hotspotDiv.addEventListener('mouseenter', (event) => {
            tooltip.style.display = 'block'; // Show tooltip
            tooltip.style.left = `${event.pageX + 10}px`; // Position tooltip to the right of the cursor
            tooltip.style.top = `${event.pageY + 10}px`; // Position tooltip below the cursor
        });

        // Hide tooltip on mouse leave
        hotspotDiv.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none'; // Hide tooltip
        });

        // Add click event listener to each hotspot
        hotspotDiv.addEventListener('click', () => {
            overlayText.innerText = `Information about : ${hotspot.id}`;
            document.getElementById('room-name').innerText = `Room Name: ${hotspot.title}`;
            overlay.classList.add('active');

            const infoButton = document.querySelector('#options button:nth-child(1)'); // Select the Info button
            infoButton.setAttribute('onclick', `showInfo('${hotspot.id}')`);

            // Set up the Faculty button
            const facultyButton = document.querySelector('#options button:nth-child(2)'); // Select the Faculty button
            facultyButton.setAttribute('onclick', `showFaculty('${hotspot.id}')`); // Correctly set the onclick

            // Set up the Directions button
            const directionsButton = document.querySelector('#options button:nth-child(4)'); // Select the Directions button
            directionsButton.setAttribute('onclick', `showDirections('${hotspot.id}')`); // Correctly set the onclick

            // Set up the Photos button
    const photosButton = document.querySelector('#options button:nth-child(3)'); // Select the Photos button
    photosButton.setAttribute('onclick', `showPhotos('${hotspot.id}')`); // Correctly set the onclick
        });
        container.appendChild(hotspotDiv);
    });
}


// Close overlay function
function closeOverlay() {
    overlay.classList.remove('active');
}

// Close not available overlay function
function closeNotAvailableOverlay() {
    notAvailableOverlay.classList.remove('active');
}

// Call createHotspots function
createHotspots();
// Functions for options
function showInfo(roomId) {
    const room = hotspots.find(hotspot => hotspot.id === roomId);
    if (room && room.url) {
        window.open(room.url, '_blank'); // Open the URL in a new tab
    } else {
        notAvailableOverlay.classList.add('active'); // Show not available if no URL is found
    }
}
// Function to show faculty information
function showFaculty(roomId) {
    const facultyContainer = document.getElementById('faculty-info-container');
    const facultyList = facultyInfo[roomId];

    // Clear previous content
    facultyContainer.innerHTML = '';

    // Check if faculty information exists for the room
    if (facultyList && facultyList.length > 0) {
        // Create a table element
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '10px';

        // Create table headers
        const headerRow = document.createElement('tr');
        const headers = ['Sr. No', 'Name', 'Dept', 'Contact'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.border = '1px solid white';
            th.style.padding = '8px';
            th.style.backgroundColor = '#333';
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Populate table rows with faculty data
        facultyList.forEach((faculty, index) => {
            const row = document.createElement('tr');
            const cells = [
                index + 1, // Sr. No
                faculty.name || 'N/A', // Name
                faculty.dept || 'N/A', // Dept
                faculty.contact || 'N/A' // Contact
            ];
            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                td.style.border = '1px solid white';
                td.style.padding = '8px';
                row.appendChild(td);
            });
            table.appendChild(row);
        });

        // Append the table to the container
        facultyContainer.appendChild(table);
    } else {
        facultyContainer.innerHTML = 'Not available 🤐'; // Default message if no info
    }

    document.getElementById('faculty-overlay').classList.add('active'); // Show the faculty overlay
}

// Function to close the faculty overlay
function closeFacultyOverlay() {
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide the overlay
}

function showPhotos(roomId) {
    const photosContainer = document.getElementById('photos-container');
    const noPhotosMessage = document.getElementById('no-photos-message');
    const room = hotspots.find(hotspot => hotspot.id === roomId); // Find the room by ID

    // Clear previous photos and messages
    photosContainer.innerHTML = '';
    noPhotosMessage.style.display = 'none'; // Hide default message

    if (room && room.photos && room.photos.length > 0) {
        // If photos exist, display them
        room.photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo; // Set the image source
            img.alt = 'Room Photo'; // Alt text for accessibility
           // img.className = 'photo'; // Add class for styling
            photosContainer.appendChild(img); // Append image to the container
        });








    } else {
        // If no photos, show the default message
        noPhotosMessage.innerText = 'Not available 🤐'; // Set the default message
        noPhotosMessage.style.display = 'block'; // Show the message
    }

    // Show the overlay
    document.getElementById('photos-overlay').classList.add('active');
 
}

function closePhotosOverlay() {
    document.getElementById('photos-overlay').classList.remove('active'); // Hide the overlay
}




function showDirections(roomId) {
    const room = hotspots.find(hotspot => hotspot.id === roomId);
    if (room) {
        startRoomId = room.id; // Set the start room ID
        document.getElementById('start-location').innerText = room.title; // Set start location
        populateEndLocationDropdown(); // Populate dropdown with room options
        document.getElementById('directions-overlay').classList.add('active'); // Show directions overlay
        console.log(`Start Room ID set to: ${startRoomId}`); // Debugging
    }
}
// Function to populate the end location dropdown
function populateEndLocationDropdown() {
    const dropdown = document.getElementById('end-location');
    dropdown.innerHTML = '<option value="">Select a room</option>'; // Clear existing options

    // Sort hotspots by ID in ascending order
    const sortedHotspots = hotspots.filter(hotspot => !hotspot.id.startsWith('c')) // Filter out corridor hotspots
        .sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID

    // Populate dropdown with only room hotspots
    sortedHotspots.forEach(hotspot => {
        const option = document.createElement('option');
        option.value = hotspot.id;
        option.innerText = `Room ${hotspot.id}`; // Display room number
        dropdown.appendChild(option);
    });
}

// Function to close the directions overlay
function closeDirectionsOverlay() {
    document.getElementById('directions-overlay').classList.remove('active');
}

// Function to get directions (placeholder for actual implementation)
function getDirections() {
    const endLocationDropdown = document.getElementById('end-location');
    const selectedEndLocation = endLocationDropdown.value; // Get the selected value from the dropdown

    if (selectedEndLocation) {
        // Check if start and end locations are the same
        if (startRoomId === selectedEndLocation) {
            alert("Start and end location must not be the same.");
            return; // Exit the function if they are the same
        }

        // Close overlays
        closeOverlay();
        closeNotAvailableOverlay();
        closeDirectionsOverlay();

        // Get the route from start to end
        const route = getRoute(startRoomId, selectedEndLocation);
        console.log('Route:', route); // Debugging: Log the route

        // Draw lines for each segment in the route
        for (let i = 0; i < route.length; i++) {
            if (i === 0) {
                // Draw line from start room to the first corridor
                drawLineBetweenHotspotAndCorridor(startRoomId, route[i]);
            } else {
                // Draw line from the previous corridor to the current corridor
                drawLineBetweenHotspotAndCorridor(route[i - 1], route[i]);
            }
        }
        // Finally, draw line to the end room
        drawLineBetweenHotspotAndCorridor(route[route.length - 1], selectedEndLocation);

        // Show the close directions button
        document.getElementById('close-directions-btn').style.display = 'block';
        console.log("Close Directions button is now visible."); // Debugging log

    } else {
        alert("Please select the end location.");
    }
}


// Function to get the corridor hotspots that lie on the route
function getRouteCorridors(startRoomId, endRoomId) {
    const routeCorridors = [];
    const startRoomCorridorMapping = roomCorridorMapping[startRoomId];
    const endRoomCorridorMapping = roomCorridorMapping[endRoomId];

    if (startRoomCorridorMapping) {
        startRoomCorridorMapping.forEach(corridorId => {
            routeCorridors.push(corridorId);
        });
    }

    if (endRoomCorridorMapping) {
        endRoomCorridorMapping.forEach(corridorId => {
            routeCorridors.push(corridorId);
        });
    }

    return routeCorridors;
}

function drawLineBetweenHotspotAndCorridor(startRoomId, endRoomId) {
    const linesContainer = document.getElementById('lines-container');
    const startHotspot = hotspots.find(hotspot => (hotspot.id) === startRoomId);
    const endHotspot = hotspots.find(hotspot => (hotspot.id) === endRoomId);

    // Debugging logs
    console.log(`Start Hotspot: ${startHotspot ? startHotspot.title : 'Not Found'}`);
    console.log(`End Hotspot: ${endHotspot ? endHotspot.title : 'Not Found'}`);

    // Only draw the line if both hotspots are found
    if (startHotspot && endHotspot) {
        // Get the container dimensions
        const containerWidth = linesContainer.clientWidth;
        const containerHeight = linesContainer.clientHeight;

        // Calculate center positions
        const startX = (startHotspot.left / 100) * containerWidth;
        const startY = (startHotspot.top / 100) * containerHeight;
        const endX = (endHotspot.left / 100) * containerWidth;
        const endY = (endHotspot.top / 100) * containerHeight;

        // Create a line element
        const line = document.createElement('div');
        line.className = 'line';

        // Calculate the length and angle of the line
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

        // Set the line's properties
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.position = 'absolute';
        line.style.left = `${startX}px`;
        line.style.top = `${startY}px`;

        // Append the line to the container
        linesContainer.appendChild(line);
    } else {
        console.log('Start or end hotspot not found.'); // Debugging
    }
}
// Function to close the main overlay
function closeOverlay() {
    overlay.classList.remove('active');
}

// Function to close the Not Available overlay
function closeNotAvailableOverlay() {
    notAvailableOverlay.classList.remove('active');
}
function createInvisibleHotspots() {
    corridorHotspots.forEach(hotspot => {
        const hotspotDiv = document.createElement('div');
        hotspotDiv.className = 'invisible-hotspot';
        hotspotDiv.style.top = `${hotspot.top}%`;
        hotspotDiv.style.left = `${hotspot.left}%`;

        // Add click event listener for directions
        hotspotDiv.addEventListener('click', () => {
            // Logic to get directions
            alert(`Getting directions through ${hotspot.title}`);
        });

        container.appendChild(hotspotDiv);
    });
}
createInvisibleHotspots();

function findNearestInvisibleHotspot(startHotspot, endHotspot) {
    const invisibleHotspots = [
        { id: 'c1', title: 'c1', top: 16, left: 12 },
        { id: 'c2', title: 'c2', top: 30, left: 12 },
        { id: 'c3', title: 'c3', top: 39, left: 12 },
        { id: 'c4', title: 'c4', top: 54, left: 12 },
        { id: 'c5', title: 'c5', top: 60, left: 12 },
        { id: 'c6', title: 'c6', top: 75, left: 12 },
        { id: 'c7', title: 'c7', top: 84, left: 12 },

        { id: 'c8', title: 'c8', top: 40, left: 17 },
        { id: 'c9', title: 'c9', top: 60, left: 21 },
        { id: 'c10', title: 'c10', top: 60, left: 26 },

        { id: 'c11', title: 'c11', top: 16, left: 32 },
        { id: 'c12', title: 'c12', top: 30, left: 32 },
        { id: 'c13', title: 'c13', top: 40, left: 32 },
        { id: 'c14', title: 'c14', top: 60, left: 32 },

        { id: 'c15', title: 'c15', top: 40, left: 39 },
        { id: 'c16', title: 'c16', top: 40, left: 46 },
        { id: 'c17', title: 'c17', top: 40, left: 52 },
        { id: 'c18', title: 'c18', top: 40, left: 68 },

        { id: 'c19', title: 'c19', top: 50, left: 68 },
        { id: 'c20', title: 'c20', top: 61, left: 68 },

        { id: 'c21', title: 'c21', top: 18, left: 88 },
        { id: 'c22', title: 'c22', top: 37, left: 88 },
        { id: 'c23', title: 'c23', top: 50, left: 88 },
        { id: 'c24', title: 'c24', top: 62, left: 88 },
        { id: 'c25', title: 'c25', top: 80, left: 88 },

    ];

}
function getRoute(startRoomId, endRoomId) {
    const route = [];
    const queue = [[startRoomId]]; // Initialize the queue with the start room
    const visited = new Set(); // To keep track of visited rooms

    while (queue.length > 0) {
        const currentPath = queue.shift(); // Get the first path in the queue
        const currentRoom = currentPath[currentPath.length - 1]; // Get the last room in the current path

        // Check if we reached the end room
        if (currentRoom === endRoomId) {
            return currentPath; // Return the path if we reached the end room
        }

        // Get the corridors connected to the current room
        const corridors = roomCorridorMapping[currentRoom];
        if (corridors) {
            for (const corridor of corridors) {
                if (!visited.has(corridor)) {
                    visited.add(corridor); // Mark the corridor as visited
                    queue.push([...currentPath, corridor]); // Add the new path to the queue
                }
            }
        }
    }

    return []; // Return an empty array if no path is found
}


function closeDirections() {
    console.log("Close Directions button clicked"); // Debugging log
    closeDirectionsOverlay(); // Close the overlay
    const linesContainer = document.getElementById('lines-container');
    linesContainer.innerHTML = ''; // Clear the lines
    document.getElementById('close-directions-btn').style.display = 'none'; // Hide the close directions button
}

// Example faculty information for rooms
const facultyInfo = {
    '402': [
        { name: 'Antara Bhattacharya', dept: 'CSE', contact: 'antara.bhattacharya@raisoni.net' },
        { name: 'Hemalata Dakhore', dept: 'CSE', contact: 'hemlatad.akhore@raisoni.net' },
        { name: 'Vijaya Kamble', dept: 'CSE', contact: 'vijaya.kamble@raisoni.net' }
    ],
    '405': [
        { name: 'Priyanka Gonnade', dept: 'CSE', contact: 'priyanka.gonnade@raisoni.net' },
        { name: 'Minakshee Chandankhede', dept: 'CSE', contact: 'minakshee.chandankhede@raisoni.net' },
        { name: 'Pranali Sardare', dept: 'CSE', contact: 'pranali.sardare@raisoni.net' }
    ],
    '406': [
        { name: 'Shraddha Giradkar', dept: 'CSE', contact: 'shraddha.giradkar@raisoni.net' }
    ],
    '407': [
        { name: 'Dr. Sonali Ridhordar', dept: 'CSE', contact: 'sonali.ridhorkar@raisoni.net' }
    ],
    '408': [
        { name: 'Amreen Khan', dept: 'CSE', contact: 'amreenm.khan@raisoni.net' },
        { name: 'Nitin Barsagde', dept: 'CSE', contact: 'nitin.barsagde@raisoni.net' }
    ],
    '409B': [
        { name: 'Vrushali Moon', dept: 'CSE', contact: 'vrushali.moon@raisoni.net' },
        { name: 'Pallavi Hiwarka', dept: 'CSE', contact: 'pallavi.hiwarika@raisoni.net' },
        { name: 'Anita Puri', dept: 'CSE', contact: 'anita.puri@raisoni.net' }
    ],
    '411': [
        { name: 'Vikas Singh', dept: 'CSE', contact: 'vikas.singh@raisoni.net' },
        { name: 'Ranjana Shende', dept: 'CSE', contact: 'ranjana.shende@raisoni.net' }
    ],
    '412': [
        { name: 'Dr. Pragati Fatinge', dept: 'CSE', contact: 'pragati.fatinge@raisoni.net' },
        { name: 'Ravindra Kale', dept: 'CSE', contact: 'ravindra.kale@raisoni.net' },
        { name: 'Hemalata Kosare', dept: 'CSE', contact: 'hemalata.kosare@raisoni.net' }
    ],
    '413': [
        { name: 'Pushpa Chutel', dept: 'CSE', contact: 'pushpa.chutel@raisoni.net' }
    ],
    '417': [
        { name: 'Dr. Anmol Ganer', dept: 'CSE - DIPLOMA', contact: 'anmol.ganer@raisoni.net' }
    ],
    '420': [
        { name: 'Dr. Bhushan Manjare', dept: 'IT', contact: 'bhushan.manjre@raisoni.net' },
        { name: 'Mr. Nitesh Hatwar', dept: 'IT', contact: 'nitesh.hatwar@raisoni.net' },
        { name: 'Mr. Ashish Kakne', dept: 'IT', contact: 'ashish.kakne@raisoni.net' },
        { name: 'Ms. Ashwini Watekar', dept: 'IT', contact: 'ashwini.watekar@raisoni.net' },
        { name: 'Pooja Bhandekar', dept: 'FY', contact: 'pooja.bhandekar@raisoni.net' },
        { name: 'Pankaj Kawadkar', dept: 'FY', contact: 'pankaj.kawadkar@raisoni.net' },
        { name: 'Shruti Waikar', dept: 'FY', contact: 'shruti.waikar@raisoni.net' },
        { name: 'Shubham Kewte', dept: 'FY', contact: 'shubham.kewte@raisoni.net' },
        { name: 'Roshni Wawge', dept: 'FY', contact: 'roshni.wawge@raisoni.net' },
        { name: 'Saimeen Kureshi', dept: 'FY', contact: 'saimeen.kureshi@raisoni.net' },
        { name: 'Rakesh Kumar', dept: '-', contact: 'rakesh.kumar@raisoni.net' }
    ]
};



function openSearchOverlay() {
    document.getElementById('search-overlay').classList.add('active'); // Show the search overlay
}

function closeSearchOverlay() {
    document.getElementById('search-overlay').classList.remove('active'); // Hide the search overlay
}

// Functions to handle search options
function showFacultySearch() {
    document.getElementById('faculty-search-section').style.display = 'block'; // Show faculty search section
    document.getElementById('room-search-section').style.display = 'none'; // Hide room search section
    document.getElementById('room-number-search-section').style.display = 'none'; // Hide room number search section
    document.getElementById('room-name-search-section').style.display = 'none'; // Hide room name search section
}

function showRoomByNumber() {
    document.getElementById('room-number-search-section').style.display = 'block';
    document.getElementById('room-name-search-section').style.display = 'none'; // Hide room name search section
    document.getElementById('faculty-info-container').innerHTML = ''; // Clear faculty info
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide faculty overlay
    document.getElementById('faculty-search-section').style.display = 'none'; // Hide faculty search section
    document.getElementById('faculty-info-container').innerHTML = ''; // Clear faculty info
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide faculty overlay
    document.getElementById('search-message').innerHTML = ''; // Clear search message
    clearFacultyInfo();
}
function showRoomByName() {
    document.getElementById('room-name-search-section').style.display = 'block'; // Show room name search section
    document.getElementById('room-number-search-section').style.display = 'none'; // Hide room number search section
    document.getElementById('faculty-info-container').innerHTML = ''; // Clear faculty info
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide faculty overlay

    document.getElementById('faculty-search-section').style.display = 'none'; // Hide faculty search section
    document.getElementById('faculty-info-container').innerHTML = ''; // Clear faculty info
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide faculty overlay
    document.getElementById('search-message').innerHTML = ''; // Clear search message
    clearFacultyInfo();
}
function clearFacultyInfo() {
    document.getElementById('faculty-info-container').innerHTML = ''; // Clear faculty info
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide faculty overlay
    document.getElementById('faculty-search-section').style.display = 'none'; // Hide faculty search section
    document.getElementById('faculty-info-container').innerHTML = ''; // Clear faculty info
    document.getElementById('faculty-overlay').classList.remove('active'); // Hide faculty overlay
    document.getElementById('search-message').innerHTML = ''; // Clear search message
}


function filterFacultySuggestions() {
    const input = document.getElementById('faculty-search-box').value.toLowerCase();
    const suggestions = document.getElementById('faculty-suggestions');
    suggestions.innerHTML = ''; // Clear previous suggestions

    // Flatten the facultyInfo object into a list of faculty members
    const facultyList = Object.keys(facultyInfo).flatMap(roomId =>
        facultyInfo[roomId].map(faculty => ({ ...faculty, roomId }))
    );

    console.log("Faculty List:", facultyList); // Debugging: Check the faculty list

    // Filter faculty members whose name matches the input
    const filteredFaculty = facultyList.filter(faculty => {
        if (!faculty.name) {
            console.warn("Faculty member missing 'name' property:", faculty); // Debugging: Log missing name
            return false; // Skip this faculty member
        }
        return faculty.name.toLowerCase().includes(input);
    });

    console.log("Filtered Faculty:", filteredFaculty); // Debugging: Check filtered results

    // Display suggestions
    filteredFaculty.forEach(faculty => {
        const li = document.createElement('li');
        li.textContent = faculty.name;
        li.onclick = () => selectFaculty(faculty.name, faculty.roomId);
        suggestions.appendChild(li);
    });
}

function selectFaculty(name, roomId) {
    document.getElementById('faculty-search-box').value = name; // Set the input value
    document.getElementById('faculty-suggestions').innerHTML = ''; // Clear suggestions
}
function searchFaculty() {
    const facultyName = document.getElementById('faculty-search-box').value;
    const facultyList = Object.keys(facultyInfo).flatMap(roomId =>
        facultyInfo[roomId].map(faculty => ({ ...faculty, roomId }))
    );

    // Find the faculty member by name
    const found = facultyList.find(faculty => faculty.name === facultyName);
    const messageArea = document.getElementById('search-message'); // Get the message area

    if (found) {
        // Display the faculty member's details
        messageArea.innerHTML = `
    <span style="color: green;">
        <strong>Faculty:</strong> ${found.name}<br>
        <strong>Department:</strong> ${found.dept || 'N/A'}<br>
        <strong>Contact:</strong> ${found.contact || 'N/A'}<br>
        <strong>Available in Room:</strong> B - ${found.roomId}
    </span>
`;
    } else {
        messageArea.innerText = 'Faculty not found.'; // Display not found message
    }
}


function filterRoomNumberSuggestions() {
    const input = document.getElementById('room-number-search-box').value.toLowerCase();
    const suggestions = document.getElementById('room-number-suggestions');
    suggestions.innerHTML = ''; // Clear previous suggestions

    const roomIds = hotspots.filter(room => room.id.toLowerCase().includes(input)&& !room.id.startsWith('c'));

    roomIds.forEach(room => {
        const li = document.createElement('li');
        li.textContent = room.id;
        li.onclick = () => selectRoomByNumber(room.id);
        suggestions.appendChild(li);
    });
}

function selectRoomByNumber(roomId) {
    document.getElementById('room-number-search-box').value = roomId; // Set the input value
    document.getElementById('room-number-suggestions').innerHTML = ''; // Clear suggestions
}

function searchRoomByNumber() {
    const roomId = document.getElementById('room-number-search-box').value;
    const roomFound = hotspots.find(room => room.id === roomId); // Search by ID
    const messageArea = document.getElementById('search-message'); // Get the message area

    if (roomFound) {
        hideAllOverlays();
        zoomToHotspot(roomFound); // Function to zoom into the hotspot
        messageArea.innerText = ''; // Clear message on successful search
    } else {
        messageArea.innerText = 'Room not found.'; // Display not found message
    }
}
// Function to filter room name suggestions
function filterRoomNameSuggestions() {
    const input = document.getElementById('room-name-search-box').value.toLowerCase();
    const suggestions = document.getElementById('room-name-suggestions');
    suggestions.innerHTML = ''; // Clear previous suggestions

    // Filter hotspots based on the title property
    const roomNames = hotspots.filter(room => room.title.toLowerCase().includes(input)&& !room.id.startsWith('c'));

    roomNames.forEach(room => {
        const li = document.createElement('li');
        li.textContent = room.title; // Display the room title
        li.onclick = () => selectRoomByName(room.title); // Set the onclick to select the room
        suggestions.appendChild(li);
    });
}
// Function to select a room by name
function selectRoomByName(roomTitle) {
    document.getElementById('room-name-search-box').value = roomTitle; // Set the input value to the selected room title
    document.getElementById('room-name-suggestions').innerHTML = ''; // Clear suggestions
}

// Function to search for a room by name
function searchRoomByName() {
    const roomTitle = document.getElementById('room-name-search-box').value;
    const roomFound = hotspots.find(room => room.title === roomTitle); // Search by title
    const messageArea = document.getElementById('search-message'); // Get the message area

    if (roomFound) {
        hideAllOverlays();
        zoomToHotspot(roomFound); // Function to zoom into the hotspot
        messageArea.innerText = ''; // Clear message on successful search
    } else {
        messageArea.innerText = 'Room not found.'; // Display not found message
    }
}
function hideAllOverlays() {
    document.getElementById('search-overlay').classList.remove('active');
    document.getElementById('faculty-search-section').style.display = 'none';
    document.getElementById('room-search-section').style.display = 'none';
    document.getElementById('room-number-search-section').style.display = 'none';
    document.getElementById('room-name-search-section').style.display = 'none';
}
function zoomToHotspot(hotspot) {
    const container = document.querySelector('.floor-plan-container');
    const image = document.querySelector('.floor-plan-image');
    const allHotspots = document.querySelectorAll('.hotspot'); // Select all hotspots

    // Hide all hotspots
    allHotspots.forEach(h => {
        h.style.display = 'none'; // Hide all hotspots
    });

    // Show the target hotspot
    const targetHotspot = document.getElementById(hotspot.id);
    if (targetHotspot) {
        targetHotspot.style.display = 'block'; // Show the target hotspot
    }

    // Calculate the position of the hotspot
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const hotspotX = (hotspot.left / 100) * containerWidth; // Convert percentage to pixel
    const hotspotY = (hotspot.top / 100) * containerHeight; // Convert percentage to pixel

    // Center the image on the hotspot
    const offsetX = hotspotX - (containerWidth / 2);
    const offsetY = hotspotY - (containerHeight / 2);

    // Apply CSS transform to the image to "zoom" into the hotspot
    image.style.transform = `translate(${-offsetX}px, ${-offsetY}px) scale(2)`; // Adjust scale as needed

    // Optional: Add a transition for smooth zooming
    image.style.transition = 'transform 0.5s ease';

    // Show the close button
    document.getElementById('close-zoom-btn').style.display = 'block'; // Show close button
}
function resetZoom() {
    const image = document.querySelector('.floor-plan-image');
    image.style.transform = 'translate(0, 0) scale(1)'; // Reset to original scale

    // Show all hotspots again
    const allHotspots = document.querySelectorAll('.hotspot');
    allHotspots.forEach(h => {
        h.style.display = 'block'; // Show all hotspots
    });

    // Hide the close button
    document.getElementById('close-zoom-btn').style.display = 'none'; // Hide close button
}




function openImageOverlay(imageSrc) {
    console.log("Image Source:",imageSrc); // Debugging: Check the image path
    const imageOverlay = document.getElementById('image-overlay');
    const displayedImage = document.getElementById('displayed-image');
    
    displayedImage.src = imageSrc; // Set the image source
    imageOverlay.classList.add('active'); // Show the overlay
}

function openImageOverlay(imageSrc) {
    console.log("Opening Image Overlay"); // Debugging: Check if the function is called
    const imageOverlay = document.getElementById('image-overlay');
    const displayedImage = document.getElementById('displayed-image');
    
    displayedImage.src = imageSrc; // Set the image source
    imageOverlay.classList.add('active'); // Show the overlay
}
function closeImageOverlay() {
    console.log("Close button clicked"); // Debugging: Confirm the function is called
    const imageOverlay = document.getElementById('image-overlay');
    imageOverlay.classList.remove('active'); // Remove the 'active' class
    console.log("Overlay class after removal:", imageOverlay.classList); // Debugging: Check the class list

    imageOverlay.classList.remove('active'); // Hide the overlay
    initialNote.style.display = 'none'; // Hide the note
}
document.getElementById('image-overlay').classList.add('active');