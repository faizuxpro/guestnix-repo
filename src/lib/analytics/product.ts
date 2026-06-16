import type { AnalyticsProperties } from "./privacy";

export const productEvents = {
  signupStarted: "signup_started",
  signupCompleted: "signup_completed",
  onboardingStarted: "onboarding_started",
  onboardingCompleted: "onboarding_completed",
  trialStarted: "trial_started",
  planSelected: "plan_selected",
  propertyCreated: "property_created",
  guidebookCreated: "guidebook_created",
  guidebookSaved: "guidebook_saved",
  guidebookPublished: "guidebook_published",
  quickVariablesSaved: "quick_variables_saved",
  quickVariableCustomCreated: "quick_variable_custom_created",
  quickVariableInserted: "quick_variable_inserted",
  mediaUploaded: "media_uploaded",
  customDomainAdded: "custom_domain_added",
  chatEnabled: "chat_enabled",
  aiSettingsChanged: "ai_settings_changed",
  storefrontUpdated: "storefront_updated",
  storeEnabled: "store_enabled",
  storeItemCreated: "store_item_created",
  storeItemUpdated: "store_item_updated",
  storeItemDeleted: "store_item_deleted",
  storeItemImageUploaded: "store_item_image_uploaded",
  storeRequestCreated: "store_request_created",
  storeRequestUpdated: "store_request_updated",
  storeMessageSent: "store_message_sent",
  storePaymentSettingsUpdated: "store_payment_settings_updated",
  storePaymentProofSubmitted: "store_payment_proof_submitted",
  pricingViewed: "pricing_viewed",
  checkoutStarted: "checkout_started",
  couponValidationFailed: "coupon_validation_failed",
  subscriptionUpdated: "subscription_updated",
} as const;

export type ProductEventName =
  (typeof productEvents)[keyof typeof productEvents];

export type ProductAnalyticsInput = {
  distinctId: string;
  event: ProductEventName;
  properties?: AnalyticsProperties;
};
