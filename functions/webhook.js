const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET   // ← get this from Stripe Dashboard → Webhooks
    );
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return { statusCode: 400, body: 'Webhook Error' };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    console.log(`Payment succeeded for ${session.customer_details.email} — Tier: ${session.metadata.tier}`);
    // Here: save to Airtable, send email, grant access, etc.
  }

  return { statusCode: 200, body: 'OK' };
}; 
async function checkPaymentStatus() {
  // 1. Check URL for fresh success
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  if (sessionId) {
    localStorage.setItem('session_id', sessionId);
    history.replaceState({}, "", "/");
  }

  const storedSessionId = localStorage.getItem('session_id');
  if (!storedSessionId) {
    showPricing();
    return false;
  }

  // 2. SERVER-SIDE VERIFICATION (this is the real security)
  const res = await fetch(`/.netlify/functions/verify-payment?session_id=${storedSessionId}`);
  const data = await res.json();

  if (data.paid) {
    document.getElementById('pricing').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Optional: show tier
    const tier = data.tier === 'reaper' ? 'Cosmic Reaper' : 'Shadow Walker';
    document.querySelector('#dashboard p')?.insertAdjacentHTML('beforeend', 
      `<br><strong>Active Plan:</strong> ${tier} ⚡️`);
    
    return true;
  } else {
    localStorage.removeItem('session_id');
    showPricing();
    return false;
  }
}

function showPricing() {
  document.getElementById('pricing').classList.remove('hidden');
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('success-message')?.classList.add('hidden');
}

// Run on every load
checkPaymentStatus();
