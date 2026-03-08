// Type definitions for instructor accounts and sign-up form data.

/** An instructor's profile record. */
export interface Instructor {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  // Add other fields as needed
}

/** Form fields collected during instructor sign-up. */
export interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}