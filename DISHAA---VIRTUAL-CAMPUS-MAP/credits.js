// Get elements
const memberImages = document.querySelectorAll('.member-image');
const overlay = document.getElementById('overlay');
const overlayImage = document.getElementById('overlay-image');
const closeButton = document.getElementById('close-button');

// Add click event to each member image
memberImages.forEach(image => {
    image.addEventListener('click', () => {
        const overlayImagePath = image.getAttribute('data-overlay'); // Get the overlay image path
        overlayImage.src = overlayImagePath; // Set overlay image to the corresponding info image
        overlay.style.display = 'flex'; // Show overlay
    });
});

// Add click event to close button
closeButton.addEventListener('click', () => {
    overlay.style.display = 'none'; // Hide overlay
});

// Optional: Close overlay when clicking outside the image
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        overlay.style.display = 'none'; // Hide overlay
    }
});
document.querySelector('.back-button').addEventListener('click', function() {
    window.location.href = '/index.html';
});