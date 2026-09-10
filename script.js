(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const topbar = document.querySelector('.topbar');
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const sections = [...document.querySelectorAll('[data-section]')];
  const revealItems = [...document.querySelectorAll('[data-reveal]')];

  const setupCustomCursor = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursor = document.querySelector('.custom-cursor');
    const dot = cursor?.querySelector('.custom-cursor-dot');
    const ring = cursor?.querySelector('.custom-cursor-ring');
    if (!cursor || !dot || !ring) return;

    document.body.classList.add('has-custom-cursor');
    let pointerX = -100;
    let pointerY = -100;
    let ringX = pointerX;
    let ringY = pointerY;

    const render = () => {
      ringX += (pointerX - ringX) * 0.18;
      ringY += (pointerY - ringY) * 0.18;
      dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      requestAnimationFrame(render);
    };

    const moveCursor = (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (prefersReducedMotion) {
        ringX = pointerX;
        ringY = pointerY;
        dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      cursor.classList.add('is-visible');
    };

    window.addEventListener('pointermove', moveCursor, { passive: true });
    window.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

    document.querySelectorAll('a, button, [data-tilt]').forEach((element) => {
      element.addEventListener('pointerenter', () => {
        cursor.classList.add('is-active');
      });
      element.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
    });

    if (!prefersReducedMotion) render();
  };

  setupCustomCursor();

  const updateScrollState = () => {
    topbar?.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      history.pushState(null, '', link.getAttribute('href'));
    });
  });

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', isCurrent);
          if (isCurrent) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-28% 0px -58% 0px', threshold: 0 });

    sections.forEach((section) => sectionObserver.observe(section));

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 70, 210)}ms`;
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  if (!prefersReducedMotion) {
    const parallaxItems = [...document.querySelectorAll('[data-parallax]')];
    const hero = document.querySelector('.hero');
    hero?.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      parallaxItems.forEach((item) => {
        const amount = Number(item.dataset.parallax) || 0;
        item.style.transform = `translate3d(${x * amount * 24}px, ${y * amount * 24}px, 0)`;
      });
    });
    hero?.addEventListener('pointerleave', () => {
      parallaxItems.forEach((item) => { item.style.transform = ''; });
    });

    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    document.querySelectorAll('.btn').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const bounds = button.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        button.style.transform = `translate(${x * 5}px, ${y * 4 - 3}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });

  }

  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = 'Please check the highlighted fields and try again.';
      status.className = 'form-status is-error';
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending...';
    status.textContent = 'Sending your message...';
    status.className = 'form-status';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('The contact service returned an error.');
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'The message could not be sent.');
      form.reset();
      status.textContent = 'Thanks, your message has been sent.';
      status.className = 'form-status is-success';
    } catch (error) {
      status.textContent = 'Your message could not be sent right now. Please try again or email me directly.';
      status.className = 'form-status is-error';
    } finally {
      button.disabled = false;
      button.textContent = 'Send message';
    }
  });
})();
