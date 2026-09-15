const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const glow = document.querySelector('.cursor-glow');
if (glow) {
  document.addEventListener('pointermove', (event) => {
    glow.style.transform = `translate(${event.clientX - 180}px, ${event.clientY - 180}px)`;
  });
}

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav nav');
if (menuToggle && navigation) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('mobile-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Închide meniul' : 'Deschide meniul');
  });
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    navigation.classList.remove('mobile-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Deschide meniul');
  }));
}

document.querySelectorAll('[data-email-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = `Solicitare AQUA NOVA — ${data.get('serviciu')}`;
    const body = [
      `Nume / companie: ${data.get('nume')}`,
      `Telefon: ${data.get('telefon')}`,
      `Localitate: ${data.get('localitate')}`,
      `Serviciu: ${data.get('serviciu')}`,
      '',
      'Detalii:',
      data.get('mesaj')
    ].join('\n');
    window.location.href = `mailto:contact@aquanova.ro?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});
