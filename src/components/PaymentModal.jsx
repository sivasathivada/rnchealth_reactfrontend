
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI, callSessionsAPI } from '../services/api';
import './PaymentModal.css';
import { CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';

// Stripe Imports
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
// Replace 'Pk_test' with your actual publishable key

const PaymentModalContent = ({ appointmentId, consultantId, scheduledDate, scheduledTime, amount, consultantName, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Initiate Payment with Backend
      const response = await paymentsAPI.initiate({
        appointment_id: appointmentId,
        Payment_method: 'card',
      });

      const clientSecret = response.data.client_secret;
      const paymentId = response.data.payment_id || response.data.id;

      if (!clientSecret) {
        throw new Error("Backend did not return client_secret.");
      }

      // 2. Stripe Confirmation (This fixed the "null" error)
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement), // This looks for the <CardElement /> below
          billing_details: { name: cardholderName },
        },
      });

      if (result.error) {
        setErrorMsg(result.error.message);
        setLoading(false);
        return;
      }

      // 3. Finalize with Backend
      if (result.paymentIntent.status === 'succeeded') {
        await paymentsAPI.confirm({
          payment_id: paymentId,
          stripe_payment_intent_id: result.paymentIntent.id
        });



        setSuccess(true);
        setTimeout(() => {
          onClose();
          navigate('/patient/appointments');
        }, 2000);
      }
    } catch (err) {
      console.error('Process Error:', err);
      setErrorMsg(err.response?.data?.detail || "An error occurred during payment.");
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-content">
        {!success ? (
          <>
            {/* ── Header ── */}
            <div className="payment-header">
              <h2>Secure Checkout</h2>
              <button className="close-btn" onClick={onClose} disabled={loading}>
                <XCircle size={24} />
              </button>
            </div>

            {/* ── Summary ── */}
            <div className="payment-summary">
              <p>Consultation with <strong>Dr. {consultantName}</strong></p>
              <div className="amount-display">
                <span className="currency">₹</span>
                <span className="amount">{parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>

            {/* ── Error ── */}
            {errorMsg && (
              <div className="payment-error">
                <XCircle size={15} style={{ flexShrink: 0 }} />
                {errorMsg}
              </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleProcessPayment} className="custom-card-form">
              <div className="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={e => setCardholderName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Card Details</label>
                {/* White bg required — Stripe iframe renders on light background */}
                <div>
                  <CardElement
                    options={{
                      hidePostalCode: true,
                      style: {
                        base: {
                          fontSize: '15px',
                          color: '#1a1a2e',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          '::placeholder': { color: '#9ca3af' },
                          lineHeight: '1.6',
                        },
                        invalid: { color: '#dc2626' },
                      },
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  Test card: 4242 4242 4242 4242 · Any future date · Any CVC
                </p>
              </div>

              <button type="submit" className="btn-pay" disabled={loading || !stripe}>
                {loading
                  ? <><Loader2 size={18} className="spin" /> Processing…</>
                  : <><CreditCard size={18} /> Pay ₹{parseFloat(amount).toFixed(2)}</>
                }
              </button>
            </form>
          </>
        ) : (
          <div className="payment-success-screen">
            <CheckCircle size={72} className="success-icon" color="#06d6a0" />
            <h2>Payment Successful!</h2>
            <p>
              Your payment of <strong>₹{parseFloat(amount).toFixed(2)}</strong> was received.
              The appointment is now pending consultant confirmation.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
              Redirecting to your appointments…
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentModal = (props) => (
  <Elements stripe={stripePromise}>
    <PaymentModalContent {...props} />
  </Elements>
);

export default PaymentModal;