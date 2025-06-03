-- Add user_instructions and configuration_details columns to country_payment_methods table

ALTER TABLE country_payment_methods
ADD COLUMN user_instructions TEXT NULL,
ADD COLUMN configuration_details JSONB NULL;

COMMENT ON COLUMN country_payment_methods.user_instructions IS 'Instructions for the user on how to complete the payment using this method, if manual steps are required.';
COMMENT ON COLUMN country_payment_methods.configuration_details IS 'JSONB blob to store specific configuration for this payment method, like API keys or specific URLs for internal processing.';
