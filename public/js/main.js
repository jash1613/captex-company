/* =============================================
   STARTUPWALA CLONE - MAIN JAVASCRIPT
   ============================================= */

/* ---- MOBILE NAV DRAWER ---- */
const hamburger = document.getElementById('hamburger-container');
const drawer = document.getElementById('mobile-nav-drawer');
const overlay = document.getElementById('content-behind-mobile-navigation-drawer');
const body = document.body;

if (hamburger) {
  hamburger.addEventListener('click', function (e) {
    drawer.classList.toggle('open_mobile');
    const isOpen = drawer.classList.contains('open_mobile');
    overlay.style.display = isOpen ? 'block' : 'none';
    body.style.overflowY = isOpen ? 'hidden' : '';
    e.stopPropagation();
  });
}

if (overlay) {
  overlay.addEventListener('click', function () {
    drawer.classList.remove('open_mobile');
    overlay.style.display = 'none';
    body.style.overflowY = '';
  });
}

/* ---- MOBILE SUB-MENU TOGGLE ---- */
function showOrHideSubMenus(selectedId) {
  const subMenuIds = [
    'start-business-submenus',
    'protect-business-submenus',
    'manage-business-submenus',
    'grow-business-submenus'
  ];

  subMenuIds.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === selectedId) {
      el.style.display = el.style.display === 'block' ? 'none' : 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

/* ---- DISCLAIMER MODAL ---- */
document.addEventListener('DOMContentLoaded', function () {
  const tncLinks = document.querySelectorAll('.js-tnc-link');
  const tncOverlay = document.getElementById('tncOverlay');
  const tncCloseBtn = document.getElementById('tncCloseBtn');

  if (!tncOverlay || !tncCloseBtn) return;

  tncLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      tncOverlay.style.display = 'flex';
      body.style.overflow = 'hidden';
    });
  });

  tncCloseBtn.addEventListener('click', closeTnc);

  tncOverlay.addEventListener('click', function (e) {
    if (e.target === tncOverlay) closeTnc();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeTnc();
  });

  function closeTnc() {
    tncOverlay.style.display = 'none';
    body.style.overflow = '';
  }
});

/* ---- SERVICE TABS ---- */
const serviceGroups = {
  'company-registration': document.getElementById('company-registration')?.closest('.service-details-outside-container'),
  'trademark-registration': document.getElementById('trademark-registration-outer'),
  'roc-registration': document.getElementById('roc-registration-outer'),
  'gst-registration': document.getElementById('gst-registration-outer'),
  'iso-registration': document.getElementById('iso-registration-outer'),
};

function showService(id) {
  // Hide all service containers
  Object.keys(serviceGroups).forEach(function (key) {
    const container = serviceGroups[key];
    if (container) container.style.display = 'none';
  });

  // Show selected
  const selected = serviceGroups[id];
  if (selected) selected.style.display = 'block';

  // Update tab active states
  document.querySelectorAll('.service-tab').forEach(function (tab) {
    tab.classList.remove('active');
  });
  const activeTab = document.getElementById(id + '-header');
  if (activeTab) activeTab.classList.add('active');
}

// Initialize: show company-registration by default
document.addEventListener('DOMContentLoaded', function () {
  // Hide all except first
  const keys = Object.keys(serviceGroups);
  keys.forEach(function (key, index) {
    const container = serviceGroups[key];
    if (!container) return;
    if (index === 0) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  });
});

/* ---- TESTIMONIALS SCROLL ---- */
let testimonialIndex = 0;

function scrollTestimonials(direction) {
  const container = document.getElementById('startup-trust-us-scroll-container');
  if (!container) return;
  const cards = container.querySelectorAll('.testimonial-card');
  const total = cards.length;
  testimonialIndex = (testimonialIndex + direction + total) % total;
  const cardWidth = cards[0].offsetWidth;
  container.scrollTo({ left: testimonialIndex * cardWidth, behavior: 'smooth' });
}

// Auto-scroll testimonials every 5 seconds
let autoScrollInterval = setInterval(function () {
  scrollTestimonials(1);
}, 5000);

// Pause on hover
const testimonialContainer = document.getElementById('startup-trust-us-scroll-container');
if (testimonialContainer) {
  testimonialContainer.addEventListener('mouseenter', function () {
    clearInterval(autoScrollInterval);
  });
  testimonialContainer.addEventListener('mouseleave', function () {
    autoScrollInterval = setInterval(function () {
      scrollTestimonials(1);
    }, 5000);
  });
}

/* ---- FORM SUBMISSION (connects to backend API) ---- */
function handleFormSubmit(e) {
  e.preventDefault();

  const salutation = document.getElementById('salutation').value;
  const name       = document.getElementById('first_name').value.trim();
  const email      = document.getElementById('email').value.trim();
  const phone      = document.getElementById('phone').value.trim();
  const city       = document.getElementById('city').value.trim();
  const enquiry    = document.getElementById('enquiry').value;
  const whatsapp   = document.getElementById('switch').checked;

  if (!name)    { showFormError('Please enter your full name.');       return; }
  if (!email)   { showFormError('Please enter your email address.');   return; }
  if (!phone)   { showFormError('Please enter your mobile number.');   return; }
  if (!enquiry) { showFormError('Please select what you are looking for.'); return; }

  const btn       = document.getElementById('main-form-button');
  const getstarted= document.getElementById('getstarted');
  const loader    = document.getElementById('loaderbutton');
  btn.disabled    = true;
  if (getstarted) getstarted.style.display = 'none';
  if (loader)     loader.style.display = 'inline';

  const payload = {
    salutation,
    first_name:      name,
    email,
    phone,
    city,
    enquiry,
    Whatsapp_Consent: whatsapp,
    html_page_name:  'home_page'
  };

  fetch('/api/enquiries', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    btn.disabled = false;
    if (getstarted) getstarted.style.display = 'inline';
    if (loader)     loader.style.display = 'none';

    if (res.success) {
      showFormSuccess('Thank you, ' + name + '! Our expert will call you shortly.');
      document.getElementById('ObjForm').reset();
    } else {
      const msg = res.errors ? res.errors[0].msg : (res.error || 'Something went wrong. Please try again.');
      showFormError(msg);
    }
  })
  .catch(function() {
    btn.disabled = false;
    if (getstarted) getstarted.style.display = 'inline';
    if (loader)     loader.style.display = 'none';
    showFormError('Network error. Please try again.');
  });
}

function showFormError(msg) {
  removeFormMessages();
  const el = document.createElement('p');
  el.id = 'form-message';
  el.style.cssText = 'color:#e53935;font-size:12px;text-align:center;margin-top:8px;font-weight:600';
  el.textContent = '⚠ ' + msg;
  document.getElementById('form-button-container').appendChild(el);
}

function showFormSuccess(msg) {
  removeFormMessages();
  const el = document.createElement('p');
  el.id = 'form-message';
  el.style.cssText = 'color:#00C253;font-size:13px;text-align:center;margin-top:8px;font-weight:700';
  el.textContent = '✅ ' + msg;
  document.getElementById('form-button-container').appendChild(el);
  setTimeout(removeFormMessages, 6000);
}

function removeFormMessages() {
  const existing = document.getElementById('form-message');
  if (existing) existing.remove();
}

/* ---- SMOOTH SCROLL FOR NAV LINKS ---- */
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ---- SCROLL REVEAL ANIMATION ---- */
function revealOnScroll() {
  const revealEls = document.querySelectorAll('.service-detail, .why-item, .testimonial-card, .client-card');
  revealEls.forEach(function (el) {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 60) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }
  });
}

// Set initial state for animation
document.addEventListener('DOMContentLoaded', function () {
  const animEls = document.querySelectorAll('.service-detail, .why-item, .client-card');
  animEls.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.25s, transform 0.25s';
  });
  revealOnScroll();
});

window.addEventListener('scroll', revealOnScroll);

/* ---- NAVBAR SCROLL SHADOW ---- */
const navbar = document.getElementById('desktop-nav-bar-container');
window.addEventListener('scroll', function () {
  if (navbar) {
    if (window.scrollY > 10) {
      navbar.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    } else {
      navbar.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
    }
  }
});
