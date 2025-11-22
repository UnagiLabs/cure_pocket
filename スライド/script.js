// Slide Navigation
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;

function showSlide(n) {
  // Remove active class from all slides
  slides.forEach(slide => slide.classList.remove('active'));

  // Wrap around
  if (n >= totalSlides) {
    currentSlide = 0;
  } else if (n < 0) {
    currentSlide = totalSlides - 1;
  } else {
    currentSlide = n;
  }

  // Show current slide
  slides[currentSlide].classList.add('active');

  // Update slide number
  updateSlideNumber();

  // Update URL hash
  window.location.hash = currentSlide + 1;
}

function updateSlideNumber() {
  const slideNumbers = document.querySelectorAll('.slide-number');
  slideNumbers.forEach(num => {
    num.textContent = `${currentSlide + 1} / ${totalSlides}`;
  });
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function prevSlide() {
  showSlide(currentSlide - 1);
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
    e.preventDefault();
    nextSlide();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    prevSlide();
  } else if (e.key === 'Home') {
    e.preventDefault();
    showSlide(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    showSlide(totalSlides - 1);
  }
});

// Touch/Click navigation
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  if (touchEndX < touchStartX - 50) {
    nextSlide();
  }
  if (touchEndX > touchStartX + 50) {
    prevSlide();
  }
}

// Click navigation (left/right halves)
document.addEventListener('click', (e) => {
  const windowWidth = window.innerWidth;
  if (e.clientX > windowWidth / 2) {
    nextSlide();
  } else {
    prevSlide();
  }
});

// Initialize slide numbers
slides.forEach((slide, index) => {
  const slideNumber = document.createElement('div');
  slideNumber.className = 'slide-number';
  slide.appendChild(slideNumber);
});

// Load slide from URL hash
window.addEventListener('load', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && !isNaN(hash)) {
    showSlide(parseInt(hash) - 1);
  } else {
    showSlide(0);
  }
});

// Handle browser back/forward
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && !isNaN(hash)) {
    showSlide(parseInt(hash) - 1);
  }
});

// Prevent accidental page reload
window.addEventListener('beforeunload', (e) => {
  if (currentSlide > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});
