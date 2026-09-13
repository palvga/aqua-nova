const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const glow = document.querySelector('.cursor-glow');
document.addEventListener('pointermove', (event) => {
  glow.style.transform = `translate(${event.clientX - 180}px, ${event.clientY - 180}px)`;
});

document.querySelector('.menu-toggle').addEventListener('click', () => {
  document.querySelector('.nav nav').classList.toggle('mobile-open');
});
