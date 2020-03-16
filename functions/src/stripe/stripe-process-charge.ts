import * as functions from 'firebase-functions';
import { getOrCreateCustomer } from "./customers";
import { stripe } from './config';
import { attachSource } from './sources';
import { assertUID, generateRoundedNumber } from '../config/global-helpers';
import { StripeChargeData } from '../../../shared-models/billing/stripe-charge-data.model';
import { StripeError } from '../../../shared-models/billing/stripe-error.model';
import { Product } from '../../../shared-models/products/product.model';
import { Stripe as StripeDefs} from 'stripe';
import { StripeChargeMetadata } from '../../../shared-models/billing/stripe-object-metadata.model';
import { DiscountCouponChild, DiscountCouponValidationData } from '../../../shared-models/billing/discount-coupon.model';
import { validateProductOnAdmin } from './validate-product-data';
import { validateCouponOnAdmin } from './validate-discount-coupon';
import { PubSub } from '@google-cloud/pubsub';
import { PublicTopicNames } from '../../../shared-models/routes-and-paths/fb-function-names';
import { publicProjectId } from '../config/environments-config';

const pubSub = new PubSub();

const submitDiscountCouponUpdateRequest = async (validationData: DiscountCouponValidationData) => {

  const topicName = PublicTopicNames.UPDATE_DISCOUNT_COUPON_DATA;
  const projectId = publicProjectId;
  const topic = pubSub.topic(`projects/${projectId}/topics/${topicName}`);
  const pubsubMsg: DiscountCouponValidationData = validationData;

  const topicPublishRes = await topic.publishJSON(pubsubMsg)
    .catch(err => {console.log(`Failed to publish to topic "${topicName}" on project "${projectId}":`, err); return err;});
  console.log(`Publish to topic "${topicName}" on project "${projectId}" succeeded:`, topicPublishRes);

  return topicPublishRes;
}

const handleStripeChargeResponse = (err: any) => {
  const stripeError: StripeError = {
    stripeErrorType: 'UnknownError',
    message: 'Error not recognized',
    chargeId: ''
  }

  switch (err.type) {
    case 'StripeCardError':
      // A declined card error
      console.log('StripeCardError', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
    case 'RateLimitError':
      // Too many requests made to the API too quickly
      console.log('RateLimitError', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
    case 'StripeInvalidRequestError':
      // Invalid parameters were supplied to Stripe's API
      console.log('StripeInvalidRequestError', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
    case 'StripeAPIError':
      // An error occurred internally with Stripe's API
      console.log('StripeAPIError', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
    case 'StripeConnectionError':
      // Some kind of error occurred during the HTTPS communication
      console.log('StripeConnectionError', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
    case 'StripeAuthenticationError':
      // You probably used an incorrect API key
      console.log('StripeAuthenticationError', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
    default:
      // Handle any other types of unexpected errors
      console.log('Unknown charge error', err);
      stripeError.stripeErrorType = err.type;
      stripeError.message = err.message;
      stripeError.chargeId = err.raw.charge ? err.raw.charge : null
      break;
  }

  return stripeError;
}

/**
 * Get a specific charge
 */
export const getSingleCharge = (chargeId: string) => {
  return stripe.charges.retrieve(chargeId, {
    expand: ['customer']
  }).catch(err => {console.log(`Error fetching stripe charge:`, err); return err;});
}

/**
 * Convert a dollar amount to cents, apply the discount, round to a clean number, and return the cents value
 * @param product The product being purchased
 * @param quantity Quantity of product being purchased
 * @param discountCoupon Discount coupon, if it exists
 */
const calculateChargeAmount = (product: Product, quantity: number, discountCoupon: DiscountCouponChild | null) => {

  const baseAmountinDollars = product.price * quantity;
  const baseAmountInCents = baseAmountinDollars * 100;
  let discountPercentage = 0;
  if (discountCoupon) {
    discountPercentage = discountCoupon.discountPercentage
  }

  const discountedAmount = baseAmountInCents * (1 - discountPercentage);
  const finalRoundedValueInCents = generateRoundedNumber(discountedAmount, 0); // Gets a clean number rounded to zero digits (sometimes multiplication and division cause wild integers)

  console.log(`Charge amount calculated as $${finalRoundedValueInCents / 100} after a base price of $${baseAmountinDollars} and a discount of ${discountPercentage * 100}%`);

  return finalRoundedValueInCents;
}

/**
 * Creates a charge for a specific amount
 * 
 * @amount in pennies (e.g. $20 === 2000)
 * @idempotency_key ensures charge will only be executed once
 */
export const createCharge = async(userId: string, source: StripeDefs.Source, product: Product, quantity: number, discountCoupon: DiscountCouponChild | null): Promise<StripeDefs.Charge | void> => {
  
  const customer: StripeDefs.Customer = await getOrCreateCustomer(userId)
    .catch(err => {console.log(`Error getting or creating customer:`, err); throw err;});
  const amount: number = calculateChargeAmount(product, quantity, discountCoupon); // Produce a clean number in cents, factoring in discount

  await attachSource(userId, source)
    .catch(err => {console.log(`Error attaching source:`, err); throw err;});

  const chargeData: StripeDefs.ChargeCreateParams = {
    amount,
    customer: customer.id,
    source: source.id,
    currency: 'usd',
    metadata: {
      [StripeChargeMetadata.PRODUCT_ID]: product.id, // Add product id to charge record
      [StripeChargeMetadata.PUBLIC_USER_ID]: userId, // Add public UID to charge record
      [StripeChargeMetadata.DISCOUNT_COUPON_CODE]: discountCoupon ? discountCoupon.couponCode : null,
      [StripeChargeMetadata.LIST_PRICE]: product.price
    },
    description: product.name // Shows up on receipt billing line item
  }

  return stripe.charges.create(chargeData)
    .catch(err => {console.log(`Error creating charge:`, err); throw err;});
}

const updateDiscountCoupon = async(source: StripeDefs.Source, discountCoupon: DiscountCouponChild, userId: string, product: Product) => {
  const userEmail = (source.owner as StripeDefs.Source.Owner).email as string;
    const validationData: DiscountCouponValidationData = {
      couponCode: discountCoupon.couponCode,
      userEmail,
      userId,
      product,
      isStripeCharge: true
    };
    
  await submitDiscountCouponUpdateRequest(validationData)
    .catch(err => {console.log(`Error submitting discount coupon update:`, err);});
}



// Perform a server-side validation of product data and coupon data on admin
const validateChargeData = async (product: Product, source: StripeDefs.Source, discountCoupon: DiscountCouponChild | null, userId: string): Promise<{validCharge: boolean, stripeError?: StripeError}>  => {
  const validProductData: boolean = await validateProductOnAdmin(product)
    .catch(err => {console.log(`Error validating product on admin:`, err); return err;});
  
  // If product is not valid, return an error indicating as much
  if (!validProductData) {
    const failedProductCheckStripeError: StripeError = {
      stripeErrorType: 'FailedProductDataCheck',
      message: 'Client product data does not match admin data',
    }
    console.log('Product failed validation during charge processing', failedProductCheckStripeError);
    return {validCharge: false, stripeError: failedProductCheckStripeError};
  }

  // If coupon exists, validate it on admin
  if (discountCoupon) {
    const userEmail = (source.owner as StripeDefs.Source.Owner).email as string;
    const validationData: DiscountCouponValidationData = {
      couponCode: discountCoupon.couponCode,
      userEmail,
      userId,
      product,
      isStripeCharge: true
    };

    const validDiscountCoupon: DiscountCouponChild = await validateCouponOnAdmin(validationData);
    if (!validDiscountCoupon) {
      const failedCouponCheckStripeError: StripeError = {
        stripeErrorType: 'FailedCouponCheck',
        message: 'Coupon failed validation check during charge processing.',
      }
      console.log('Product failed validation during charge processing', failedCouponCheckStripeError);
      return {validCharge: false, stripeError: failedCouponCheckStripeError};
    }
  }

  return {validCharge: true};
}

/////// DEPLOYABLE FUNCTIONS ///////

export const stripeProcessCharge = functions.https.onCall( async (data: StripeChargeData, context) => {
  console.log('Create charge request received with this data', data);
  const userId: string = assertUID(context);
  const source: StripeDefs.Source = data.source;
  const product: Product = data.product;
  const quantity: number = data.quantity;
  const discountCoupon: DiscountCouponChild | null = data.discountCoupon ? data.discountCoupon : null; // Coupon validity pre-check performed on client

  const {validCharge, stripeError} = await validateChargeData(product, source, discountCoupon, userId)
    .catch(err => {console.log(`Error validating charge data:`, err); return err;});
  
  // If invalid charge data, exit function with stripe error
  if (!validCharge) {
    console.log('Invalid charge data, aborting charge processing');
    return stripeError;
  }

  let chargeSucceeded = true;
  const chargeResponse: StripeDefs.Charge | StripeError | void = await createCharge(userId, source, product, quantity, discountCoupon)
    .catch(err => {
      chargeSucceeded = false; // Prevents discount coupon from being updated if charge fails
      return handleStripeChargeResponse(err);
    });

  if (chargeSucceeded && discountCoupon) {
    await updateDiscountCoupon(source, discountCoupon, userId, product);
  }

  return chargeResponse;
});