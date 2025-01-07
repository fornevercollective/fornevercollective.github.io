document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Form validation
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', function(e) {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        if (name === '' || email === '') {
            e.preventDefault();
            alert('Please fill in all fields.');
        }
    });

    // Animation on scroll
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const options = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    animatedElements.forEach(element => {
        observer.observe(element);
    });
});