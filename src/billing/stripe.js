/**
 * Stripe Payment Integration
 * Handles: subscriptions, usage billing, webhooks, customer portal
 */

import Stripe from 'stripe';
import { Router } from 'express';
import { User, PlanLimits, UsageLog } from '../db/index.js';
import { authMiddleware } from '../auth/middleware.js';
import { createLogger } from '../v2/logger.js';

const router = Router();
const log = createLogger('billing-stripe');

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Price IDs from Stripe Dashboard
const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
  team_yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly'
};

// Plan mapping
const PRICE_TO_PLAN = {
  [PRICE_IDS.pro_monthly]: 'pro',
  [PRICE_IDS.pro_yearly]: 'pro',
  [PRICE_IDS.team_monthly]: 'team',
  [PRICE_IDS.team_yearly]: 'team'
};

/**
 * Check if Stripe is configured
 */
function requireStripe(req, res, next) {
  if (!stripe) {
    return res.status(501).json({
      error: 'Payment system not configured',
      code: 'STRIPE_NOT_CONFIGURED',
      message: 'Set STRIPE_SECRET_KEY environment variable'
    });
  }
  next();
}

/**
 * GET /billing/plans - Get available plans
 */
router.get('/plans', (req, res) => {
  const plans = PlanLimits.getAll();
  
  res.json({
    plans: plans.map(p => ({
      id: p.plan,
      name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
      priceMonthly: p.price_monthly_usd ? p.price_monthly_usd / 100 : null,
      priceYearly: p.price_yearly_usd ? p.price_yearly_usd / 100 : null,
      limits: {
        rendersPerMonth: p.renders_per_month === -1 ? 'Unlimited' : p.renders_per_month,
        apiCallsPerMonth: p.api_calls_per_month === -1 ? 'Unlimited' : p.api_calls_per_month,
        storageMb: p.storage_mb === -1 ? 'Unlimited' : p.storage_mb,
        maxVideoDuration: p.max_video_duration_seconds === -1 ? 'Unlimited' : `${p.max_video_duration_seconds}s`,
        maxResolution: p.max_resolution
      },
      features: p.features
    }))
  });
});

/**
 * POST /billing/checkout - Create checkout session
 */
router.post('/checkout', authMiddleware(), requireStripe, async (req, res) => {
  try {
    const { plan, interval = 'monthly' } = req.body;
    
    // Validate plan
    if (!['pro', 'team'].includes(plan)) {
      return res.status(400).json({
        error: 'Invalid plan. Choose pro or team',
        code: 'INVALID_PLAN'
      });
    }
    
    // Get price ID
    const priceId = PRICE_IDS[`${plan}_${interval}`];
    if (!priceId) {
      return res.status(400).json({
        error: 'Invalid billing interval',
        code: 'INVALID_INTERVAL'
      });
    }
    
    // Get or create Stripe customer
    let customerId = req.user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user.id
        }
      });
      customerId = customer.id;
      User.update(req.user.id, { stripeCustomerId: customerId });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/pricing`,
      subscription_data: {
        metadata: {
          userId: req.user.id
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });
    
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (err) {
    log.error('Checkout error', { error: err.message });
    res.status(500).json({
      error: 'Failed to create checkout session',
      code: 'CHECKOUT_ERROR',
      details: err.message
    });
  }
});

/**
 * POST /billing/portal - Create customer portal session
 */
router.post('/portal', authMiddleware(), requireStripe, async (req, res) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        error: 'No billing account found',
        code: 'NO_BILLING_ACCOUNT'
      });
    }
    
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/settings`
    });
    
    res.json({ url: session.url });
  } catch (err) {
    log.error('Portal error', { error: err.message });
    res.status(500).json({
      error: 'Failed to create portal session',
      code: 'PORTAL_ERROR'
    });
  }
});

/**
 * GET /billing/subscription - Get current subscription
 */
router.get('/subscription', authMiddleware(), requireStripe, async (req, res) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.json({
        subscription: null,
        plan: 'free'
      });
    }
    
    const subscriptions = await stripe.subscriptions.list({
      customer: req.user.stripe_customer_id,
      status: 'all',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      return res.json({
        subscription: null,
        plan: 'free'
      });
    }
    
    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0]?.price.id;
    const plan = PRICE_TO_PLAN[priceId] || 'free';
    
    res.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        plan,
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null
      },
      plan
    });
  } catch (err) {
    log.error('Get subscription error', { error: err.message });
    res.status(500).json({
      error: 'Failed to get subscription',
      code: 'SUBSCRIPTION_ERROR'
    });
  }
});

/**
 * POST /billing/cancel - Cancel subscription
 */
router.post('/cancel', authMiddleware(), requireStripe, async (req, res) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        error: 'No active subscription',
        code: 'NO_SUBSCRIPTION'
      });
    }
    
    const subscriptions = await stripe.subscriptions.list({
      customer: req.user.stripe_customer_id,
      status: 'active',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      return res.status(400).json({
        error: 'No active subscription',
        code: 'NO_SUBSCRIPTION'
      });
    }
    
    // Cancel at period end (user keeps access until then)
    const sub = await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true
    });
    
    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: new Date(sub.current_period_end * 1000).toISOString()
    });
  } catch (err) {
    log.error('Cancel subscription error', { error: err.message });
    res.status(500).json({
      error: 'Failed to cancel subscription',
      code: 'CANCEL_ERROR'
    });
  }
});

/**
 * POST /billing/webhook - Stripe webhook handler
 */
router.post('/webhook', async (req, res) => {
  if (!stripe) {
    return res.status(501).send('Stripe not configured');
  }
  
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } else {
      // For testing without webhook signature
      event = req.body;
    }
  } catch (err) {
    log.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        log.info('Checkout completed', { sessionId: session.id });
        // Subscription is handled by subscription events
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          const priceId = subscription.items.data[0]?.price.id;
          const plan = PRICE_TO_PLAN[priceId] || 'free';
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          
          User.update(userId, {
            plan,
            planStatus: subscription.status,
            planPeriodEnd: periodEnd
          });
          
          log.info('Updated user plan', { userId, plan, status: subscription.status });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          User.update(userId, {
            plan: 'free',
            planStatus: 'canceled',
            planPeriodEnd: null
          });
          
          log.info('User subscription canceled', { userId });
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        log.info('Payment succeeded', { invoiceId: invoice.id });
        // Could log to invoices table
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user and update status
        const user = User.findByEmail(invoice.customer_email);
        if (user) {
          User.update(user.id, { planStatus: 'past_due' });
          log.warn('User payment failed', { userId: user.id, status: 'past_due' });
        }
        break;
      }
      
      default:
        log.debug('Unhandled webhook event', { type: event.type });
    }
  } catch (err) {
    log.error('Webhook handler error', { error: err.message });
    // Don't return error to Stripe - it will retry
  }
  
  res.json({ received: true });
});

/**
 * GET /billing/usage - Get usage breakdown
 */
router.get('/usage', authMiddleware(), (req, res) => {
  const usage = UsageLog.getMonthlyUsage(req.user.id);
  const daily = UsageLog.getDailyUsage(req.user.id, 30);
  const limits = PlanLimits.get(req.user.plan || 'free');
  
  // Aggregate by action
  const byAction = {};
  for (const row of usage) {
    byAction[row.action] = {
      count: row.count,
      tokens: row.total_tokens,
      characters: row.total_characters,
      cost: row.total_cost
    };
  }
  
  res.json({
    currentPeriod: {
      start: new Date(new Date().setDate(1)).toISOString(),
      end: new Date(new Date(new Date().setMonth(new Date().getMonth() + 1)).setDate(0)).toISOString()
    },
    usage: {
      renders: {
        used: req.user.monthly_renders,
        limit: limits?.renders_per_month || 3,
        unlimited: limits?.renders_per_month === -1
      },
      apiCalls: {
        used: req.user.monthly_api_calls,
        limit: limits?.api_calls_per_month || 100,
        unlimited: limits?.api_calls_per_month === -1
      },
      storage: {
        usedMb: req.user.monthly_storage_mb,
        limitMb: limits?.storage_mb || 500,
        unlimited: limits?.storage_mb === -1
      }
    },
    breakdown: byAction,
    dailyUsage: daily,
    estimatedCost: usage.reduce((sum, r) => sum + (r.total_cost || 0), 0)
  });
});

export default router;
